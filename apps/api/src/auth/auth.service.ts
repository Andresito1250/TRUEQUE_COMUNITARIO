import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';
import {
  CodigoError,
  type Configuracion2fa,
  type LoginDto,
  type RegistroDto,
  type RespuestaLogin,
  type RestablecerDto,
  VERSION_POLITICA_DATOS,
  VERSION_TERMINOS,
} from '@trueque/shared';
import { generateSecret, generateURI, verify as verificarTotp } from 'otplib';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { tokenAleatorio } from '../comun/cripto.js';
import { CorreoService } from '../correo/correo.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';
import { CodigosService } from './codigos.service.js';
import { TokensService } from './tokens.service.js';

const CREDENCIALES_INVALIDAS = 'El correo o la contraseña no son correctos.';
const MENSAJE_SI_EXISTE =
  'Si el correo está registrado, te enviamos un código. Revisa también la carpeta de spam.';

/** Módulo 1: registro, verificación, sesión, recuperación y 2FA (RF-01 a RF-04, RNF09). */
@Injectable()
export class AuthService {
  /** Hash real de un valor aleatorio, para igualar tiempos cuando el correo no existe. */
  private readonly hashFicticio = hash(tokenAleatorio());

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    private readonly codigos: CodigosService,
    private readonly correo: CorreoService,
    private readonly usuarios: UsuariosService,
    private readonly auditoria: AuditoriaService,
  ) {}

  /** RF-01: crea la cuenta (sin verificar) y envía el código al correo. */
  async registrar(dto: RegistroDto): Promise<{ mensaje: string; correo: string }> {
    const existente = await this.prisma.usuario.findUnique({ where: { correo: dto.correo } });
    if (existente?.correoVerificado) {
      throw new ConflictException('Ya existe una cuenta con este correo. Inicia sesión.');
    }

    const ahora = new Date();
    const datos = {
      nombre: dto.nombre,
      contrasenaHash: await hash(dto.contrasena),
      localidad: dto.localidad,
      politicaDatosVersion: VERSION_POLITICA_DATOS,
      politicaDatosFecha: ahora,
      terminosVersion: VERSION_TERMINOS,
      terminosFecha: ahora,
    };
    // Si se registró antes pero nunca verificó, se actualizan sus datos en lugar de bloquearlo.
    const usuario = existente
      ? await this.prisma.usuario.update({ where: { id: existente.id }, data: datos })
      : await this.prisma.usuario.create({ data: { ...datos, correo: dto.correo } });

    if (!existente) {
      await this.auditoria.registrar({
        accion: 'USUARIO_REGISTRADO',
        actorId: usuario.id,
        entidad: 'Usuario',
        entidadId: usuario.id,
        detalle: { politicaDatos: VERSION_POLITICA_DATOS, terminos: VERSION_TERMINOS },
      });
    }

    const codigo = await this.codigos.crear(usuario.id, 'VERIFICAR_CORREO');
    if (codigo) await this.correo.enviarCodigoVerificacion(usuario.correo, usuario.nombre, codigo);
    return { mensaje: `Te enviamos un código a ${usuario.correo}.`, correo: usuario.correo };
  }

  /** RF-02: valida el código, activa la cuenta e inicia sesión de una vez (menos pasos, RNF01). */
  async verificarCorreo(
    correo: string,
    codigo: string,
    dispositivo?: string,
  ): Promise<RespuestaLogin> {
    const usuario = await this.prisma.usuario.findUnique({ where: { correo } });
    if (!usuario || usuario.estado === 'ELIMINADO') {
      throw new BadRequestException({
        statusCode: 400,
        codigo: CodigoError.CODIGO_INVALIDO,
        message: 'El código no es válido. Pide uno nuevo.',
      });
    }
    if (!usuario.correoVerificado) {
      await this.codigos.consumir(usuario.id, 'VERIFICAR_CORREO', codigo);
      await this.prisma.usuario.update({
        where: { id: usuario.id },
        data: { correoVerificado: true },
      });
      await this.auditoria.registrar({
        accion: 'CORREO_VERIFICADO',
        actorId: usuario.id,
        entidad: 'Usuario',
        entidadId: usuario.id,
      });
    }
    return this.iniciarSesion(usuario, dispositivo);
  }

  /** RF-02: reenvía el código de verificación (respuesta neutra para no revelar cuentas). */
  async reenviarCodigo(correo: string): Promise<{ mensaje: string }> {
    const usuario = await this.prisma.usuario.findUnique({ where: { correo } });
    if (usuario && !usuario.correoVerificado && usuario.estado === 'ACTIVO') {
      const codigo = await this.codigos.crearOExigirEspera(usuario.id, 'VERIFICAR_CORREO');
      await this.correo.enviarCodigoVerificacion(usuario.correo, usuario.nombre, codigo);
    }
    return { mensaje: MENSAJE_SI_EXISTE };
  }

  /** RF-03: inicio de sesión con correo y contraseña. */
  async login(dto: LoginDto, dispositivo?: string): Promise<RespuestaLogin> {
    const usuario = await this.prisma.usuario.findUnique({ where: { correo: dto.correo } });
    // Se verifica un hash aunque el usuario no exista para que el tiempo de respuesta no lo delate.
    const hashAComparar = usuario?.contrasenaHash ?? (await this.hashFicticio);
    const coincide = await verify(hashAComparar, dto.contrasena).catch(() => false);
    if (!usuario || usuario.estado === 'ELIMINADO' || !coincide) {
      throw new UnauthorizedException(CREDENCIALES_INVALIDAS);
    }
    if (!usuario.correoVerificado) {
      const codigo = await this.codigos.crear(usuario.id, 'VERIFICAR_CORREO');
      if (codigo)
        await this.correo.enviarCodigoVerificacion(usuario.correo, usuario.nombre, codigo);
      throw new ForbiddenException({
        statusCode: 403,
        codigo: CodigoError.CORREO_NO_VERIFICADO,
        message: 'Aún no has verificado tu correo. Te enviamos un código.',
      });
    }
    return this.iniciarSesion(usuario, dispositivo);
  }

  /** RF-02: segundo paso del login cuando la cuenta tiene 2FA activo. */
  async login2fa(
    tokenTemporal: string,
    codigo: string,
    dispositivo?: string,
  ): Promise<RespuestaLogin> {
    const id = await this.tokens.verificarTemporal2fa(tokenTemporal);
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario?.totpActivo || !usuario.totpSecret) {
      throw new UnauthorizedException('Inicia sesión de nuevo.');
    }
    await this.validarTotp(usuario.totpSecret, codigo);
    return this.iniciarSesion(usuario, dispositivo, true);
  }

  renovar(refreshToken: string, dispositivo?: string) {
    return this.tokens.renovar(refreshToken, dispositivo);
  }

  /** RF-03: cierre de sesión (revoca el refresh token del dispositivo). */
  async logout(refreshToken: string): Promise<void> {
    await this.tokens.revocar(refreshToken);
  }

  /** RF-04: envía un código para restablecer la contraseña (respuesta neutra). */
  async recuperar(correo: string): Promise<{ mensaje: string }> {
    const usuario = await this.prisma.usuario.findUnique({ where: { correo } });
    if (usuario?.correoVerificado && usuario.estado === 'ACTIVO') {
      const codigo = await this.codigos.crear(usuario.id, 'RECUPERAR_CONTRASENA');
      if (codigo)
        await this.correo.enviarCodigoRecuperacion(usuario.correo, usuario.nombre, codigo);
    }
    return { mensaje: MENSAJE_SI_EXISTE };
  }

  /** RF-04: cambia la contraseña con el código y cierra todas las sesiones abiertas. */
  async restablecer(dto: RestablecerDto): Promise<{ mensaje: string }> {
    const usuario = await this.prisma.usuario.findUnique({ where: { correo: dto.correo } });
    if (!usuario || usuario.estado !== 'ACTIVO') {
      throw new BadRequestException({
        statusCode: 400,
        codigo: CodigoError.CODIGO_INVALIDO,
        message: 'El código no es válido. Pide uno nuevo.',
      });
    }
    await this.codigos.consumir(usuario.id, 'RECUPERAR_CONTRASENA', dto.codigo);
    await this.prisma.usuario.update({
      where: { id: usuario.id },
      data: { contrasenaHash: await hash(dto.contrasenaNueva) },
    });
    await this.tokens.revocarTodos(usuario.id);
    await this.auditoria.registrar({
      accion: 'CONTRASENA_RESTABLECIDA',
      actorId: usuario.id,
      entidad: 'Usuario',
      entidadId: usuario.id,
    });
    return { mensaje: 'Listo, ya puedes iniciar sesión con tu nueva contraseña.' };
  }

  /** RF-02: genera el secreto TOTP. Queda inactivo hasta confirmar un código. */
  async configurar2fa(usuarioId: string): Promise<Configuracion2fa> {
    const usuario = await this.obtener(usuarioId);
    if (usuario.totpActivo)
      throw new ConflictException('La verificación en dos pasos ya está activa.');
    const secreto = generateSecret();
    await this.prisma.usuario.update({ where: { id: usuarioId }, data: { totpSecret: secreto } });
    const uri = generateURI({
      issuer: 'Trueque Comunitario',
      label: usuario.correo,
      secret: secreto,
    });
    return { secreto, uri };
  }

  async activar2fa(usuarioId: string, codigo: string): Promise<{ mensaje: string }> {
    const usuario = await this.obtener(usuarioId);
    if (usuario.totpActivo)
      throw new ConflictException('La verificación en dos pasos ya está activa.');
    if (!usuario.totpSecret)
      throw new BadRequestException('Primero configura la verificación en dos pasos.');
    await this.validarTotp(usuario.totpSecret, codigo);
    await this.prisma.usuario.update({ where: { id: usuarioId }, data: { totpActivo: true } });
    await this.auditoria.registrar({
      accion: '2FA_ACTIVADO',
      actorId: usuarioId,
      entidad: 'Usuario',
      entidadId: usuarioId,
    });
    return { mensaje: 'Verificación en dos pasos activada.' };
  }

  async desactivar2fa(usuarioId: string, codigo: string): Promise<{ mensaje: string }> {
    const usuario = await this.obtener(usuarioId);
    if (!usuario.totpActivo || !usuario.totpSecret) {
      throw new ConflictException('La verificación en dos pasos no está activa.');
    }
    await this.validarTotp(usuario.totpSecret, codigo);
    await this.prisma.usuario.update({
      where: { id: usuarioId },
      data: { totpActivo: false, totpSecret: null },
    });
    await this.auditoria.registrar({
      accion: '2FA_DESACTIVADO',
      actorId: usuarioId,
      entidad: 'Usuario',
      entidadId: usuarioId,
    });
    return { mensaje: 'Verificación en dos pasos desactivada.' };
  }

  private async iniciarSesion(
    usuario: { id: string; rol: 'CIUDADANO' | 'ADMIN'; estado: string; totpActivo: boolean },
    dispositivo?: string,
    segundoFactorSuperado = false,
  ): Promise<RespuestaLogin> {
    if (usuario.estado === 'SUSPENDIDO') {
      throw new ForbiddenException({
        statusCode: 403,
        codigo: CodigoError.CUENTA_SUSPENDIDA,
        message: 'Tu cuenta está suspendida por incumplir los términos de uso.',
      });
    }
    if (usuario.totpActivo && !segundoFactorSuperado) {
      return { requiere2fa: true, tokenTemporal: await this.tokens.emitirTemporal2fa(usuario.id) };
    }
    const tokens = await this.tokens.emitir(usuario, dispositivo);
    return {
      requiere2fa: false,
      ...tokens,
      usuario: await this.usuarios.perfilPrivado(usuario.id),
    };
  }

  private async validarTotp(secreto: string, codigo: string): Promise<void> {
    const resultado = await verificarTotp({ secret: secreto, token: codigo, epochTolerance: 30 });
    if (!resultado.valid) {
      throw new BadRequestException({
        statusCode: 400,
        codigo: CodigoError.CODIGO_INVALIDO,
        message:
          'El código de tu app autenticadora no coincide. Revisa la hora del celular e inténtalo de nuevo.',
      });
    }
  }

  private async obtener(id: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException('No encontramos tu cuenta.');
    return usuario;
  }
}
