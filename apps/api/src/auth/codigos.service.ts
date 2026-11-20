import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CodigoError } from '@trueque/shared';
import { generarCodigo, hmac, igualesSeguro } from '../comun/cripto.js';
import type { Env } from '../config/env.js';
import type { TipoCodigo } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export const MINUTOS_VIGENCIA = 15;
export const MAX_INTENTOS = 5;
export const SEGUNDOS_ENTRE_ENVIOS = 60;

/** Códigos de 6 dígitos de un solo uso para verificar el correo y recuperar la contraseña. */
@Injectable()
export class CodigosService {
  private readonly clave: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    this.clave = config.get('JWT_REFRESH_SECRET', { infer: true });
  }

  /**
   * Crea un código nuevo e invalida los anteriores del mismo tipo.
   * @returns el código en texto plano (solo para enviarlo por correo) o null si se pidió hace muy poco.
   */
  async crear(usuarioId: string, tipo: TipoCodigo): Promise<string | null> {
    const reciente = await this.prisma.codigoVerificacion.findFirst({
      where: {
        usuarioId,
        tipo,
        usadoEn: null,
        creadoEn: { gt: new Date(Date.now() - SEGUNDOS_ENTRE_ENVIOS * 1000) },
      },
    });
    if (reciente) return null;

    const codigo = generarCodigo();
    await this.prisma.$transaction([
      this.prisma.codigoVerificacion.updateMany({
        where: { usuarioId, tipo, usadoEn: null },
        data: { usadoEn: new Date() },
      }),
      this.prisma.codigoVerificacion.create({
        data: {
          usuarioId,
          tipo,
          codigoHash: hmac(codigo, this.clave),
          expiraEn: new Date(Date.now() + MINUTOS_VIGENCIA * 60_000),
        },
      }),
    ]);
    return codigo;
  }

  /** Igual que crear(), pero responde 429 si se pidió otro código hace menos de un minuto. */
  async crearOExigirEspera(usuarioId: string, tipo: TipoCodigo): Promise<string> {
    const codigo = await this.crear(usuarioId, tipo);
    if (!codigo) {
      throw new HttpException(
        'Ya te enviamos un código. Espera un minuto antes de pedir otro.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return codigo;
  }

  /** Valida y consume el código. Lanza 400 con un código de error que la app sabe interpretar. */
  async consumir(usuarioId: string, tipo: TipoCodigo, codigo: string): Promise<void> {
    const vigente = await this.prisma.codigoVerificacion.findFirst({
      where: { usuarioId, tipo, usadoEn: null },
      orderBy: { creadoEn: 'desc' },
    });
    if (!vigente)
      throw error(CodigoError.CODIGO_INVALIDO, 'El código no es válido. Pide uno nuevo.');
    if (vigente.expiraEn < new Date() || vigente.intentos >= MAX_INTENTOS) {
      throw error(CodigoError.CODIGO_VENCIDO, 'El código venció. Pide uno nuevo.');
    }
    if (!igualesSeguro(hmac(codigo, this.clave), vigente.codigoHash)) {
      await this.prisma.codigoVerificacion.update({
        where: { id: vigente.id },
        data: { intentos: { increment: 1 } },
      });
      const restantes = MAX_INTENTOS - vigente.intentos - 1;
      throw error(
        CodigoError.CODIGO_INVALIDO,
        restantes > 0
          ? `El código no coincide. Te quedan ${restantes} intentos.`
          : 'El código no coincide. Pide uno nuevo.',
      );
    }
    await this.prisma.codigoVerificacion.update({
      where: { id: vigente.id },
      data: { usadoEn: new Date() },
    });
  }
}

function error(codigo: CodigoError, message: string) {
  return new BadRequestException({ statusCode: 400, codigo, message });
}
