import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Rol, Tokens } from '@trueque/shared';
import { hmac, tokenAleatorio } from '../comun/cripto.js';
import type { Env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type PayloadAccess = { sub: string; rol: Rol; tipo: 'access' };
type Payload2fa = { sub: string; tipo: '2fa' };

const SESION_INVALIDA = 'Tu sesión terminó. Inicia sesión de nuevo.';

/**
 * Emisión y rotación de tokens (RNF09):
 * - access token JWT de vida corta (15 min por defecto);
 * - refresh token opaco, rotativo, guardado como HMAC y revocable. Si se reutiliza uno ya
 *   rotado se asume robo y se cierran todas las sesiones del usuario.
 */
@Injectable()
export class TokensService {
  private readonly accessSecret: string;
  private readonly claveHmac: string;
  private readonly accessMin: number;
  private readonly refreshDias: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService<Env, true>,
  ) {
    this.accessSecret = config.get('JWT_ACCESS_SECRET', { infer: true });
    this.claveHmac = config.get('JWT_REFRESH_SECRET', { infer: true });
    this.accessMin = config.get('JWT_ACCESS_MIN', { infer: true });
    this.refreshDias = config.get('JWT_REFRESH_TTL_DIAS', { infer: true });
  }

  async emitir(usuario: { id: string; rol: Rol }, dispositivo?: string): Promise<Tokens> {
    const payload: PayloadAccess = { sub: usuario.id, rol: usuario.rol, tipo: 'access' };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.accessSecret,
      expiresIn: this.accessMin * 60,
    });
    const refreshToken = tokenAleatorio();
    await this.prisma.refreshToken.create({
      data: {
        usuarioId: usuario.id,
        tokenHash: hmac(refreshToken, this.claveHmac),
        expiraEn: new Date(Date.now() + this.refreshDias * 86_400_000),
        dispositivo: dispositivo?.slice(0, 120),
      },
    });
    return {
      accessToken,
      refreshToken,
      accessExpiraEn: new Date(Date.now() + this.accessMin * 60_000).toISOString(),
    };
  }

  async verificarAccess(token: string): Promise<PayloadAccess> {
    try {
      const p = await this.jwt.verifyAsync<PayloadAccess>(token, { secret: this.accessSecret });
      if (p.tipo !== 'access') throw new Error('tipo');
      return p;
    } catch {
      throw new UnauthorizedException(SESION_INVALIDA);
    }
  }

  /** Cambia un refresh token válido por un par nuevo (rotación). */
  async renovar(refreshToken: string, dispositivo?: string): Promise<Tokens> {
    const guardado = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hmac(refreshToken, this.claveHmac) },
      include: { usuario: { select: { id: true, rol: true, estado: true } } },
    });
    if (!guardado) throw new UnauthorizedException(SESION_INVALIDA);
    if (guardado.revocadoEn) {
      await this.revocarTodos(guardado.usuarioId);
      throw new UnauthorizedException(SESION_INVALIDA);
    }
    if (guardado.expiraEn < new Date() || guardado.usuario.estado !== 'ACTIVO') {
      throw new UnauthorizedException(SESION_INVALIDA);
    }
    await this.prisma.refreshToken.update({
      where: { id: guardado.id },
      data: { revocadoEn: new Date() },
    });
    return this.emitir(guardado.usuario, dispositivo);
  }

  async revocar(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hmac(refreshToken, this.claveHmac), revocadoEn: null },
      data: { revocadoEn: new Date() },
    });
  }

  async revocarTodos(usuarioId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { usuarioId, revocadoEn: null },
      data: { revocadoEn: new Date() },
    });
  }

  /** Token de 5 minutos entre la contraseña y el código 2FA. */
  emitirTemporal2fa(usuarioId: string): Promise<string> {
    const payload: Payload2fa = { sub: usuarioId, tipo: '2fa' };
    return this.jwt.signAsync(payload, { secret: this.claveHmac, expiresIn: 300 });
  }

  async verificarTemporal2fa(token: string): Promise<string> {
    try {
      const p = await this.jwt.verifyAsync<Payload2fa>(token, { secret: this.claveHmac });
      if (p.tipo !== '2fa') throw new Error('tipo');
      return p.sub;
    } catch {
      throw new UnauthorizedException(
        'El tiempo para escribir el código terminó. Inicia sesión de nuevo.',
      );
    }
  }
}
