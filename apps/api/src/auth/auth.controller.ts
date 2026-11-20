import { Body, Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  codigo2faSchema,
  type Codigo2faDto,
  type Configuracion2fa,
  login2faSchema,
  type Login2faDto,
  loginSchema,
  type LoginDto,
  refreshSchema,
  type RefreshDto,
  registroSchema,
  type RegistroDto,
  type RespuestaLogin,
  restablecerSchema,
  type RestablecerDto,
  soloCorreoSchema,
  type SoloCorreoDto,
  type Tokens,
  verificarCorreoSchema,
  type VerificarCorreoDto,
} from '@trueque/shared';
import { Publico, UsuarioActual, type UsuarioSesion } from '../comun/decoradores.js';
import { AuthService } from './auth.service.js';

/** Límite estricto contra fuerza bruta en los endpoints de autenticación (RNF09). */
const LIMITE_AUTH = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Publico()
  @Throttle(LIMITE_AUTH)
  @Post('registro')
  @ApiOperation({ summary: 'RF-01: crear cuenta y enviar código de verificación' })
  registrar(@Body({ schema: registroSchema }) dto: RegistroDto) {
    return this.auth.registrar(dto);
  }

  @Publico()
  @Throttle(LIMITE_AUTH)
  @Post('verificar-correo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'RF-02: verificar el correo con el código e iniciar sesión' })
  verificar(
    @Body({ schema: verificarCorreoSchema }) dto: VerificarCorreoDto,
    @Headers('user-agent') dispositivo?: string,
  ): Promise<RespuestaLogin> {
    return this.auth.verificarCorreo(dto.correo, dto.codigo, dispositivo);
  }

  @Publico()
  @Throttle(LIMITE_AUTH)
  @Post('reenviar-codigo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'RF-02: reenviar el código de verificación' })
  reenviar(@Body({ schema: soloCorreoSchema }) dto: SoloCorreoDto) {
    return this.auth.reenviarCodigo(dto.correo);
  }

  @Publico()
  @Throttle(LIMITE_AUTH)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'RF-03: iniciar sesión' })
  login(
    @Body({ schema: loginSchema }) dto: LoginDto,
    @Headers('user-agent') dispositivo?: string,
  ): Promise<RespuestaLogin> {
    return this.auth.login(dto, dispositivo);
  }

  @Publico()
  @Throttle(LIMITE_AUTH)
  @Post('login/2fa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'RF-02: segundo paso del login con código TOTP' })
  login2fa(
    @Body({ schema: login2faSchema }) dto: Login2faDto,
    @Headers('user-agent') dispositivo?: string,
  ): Promise<RespuestaLogin> {
    return this.auth.login2fa(dto.tokenTemporal, dto.codigo, dispositivo);
  }

  @Publico()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'RNF09: renovar la sesión (rota el refresh token)' })
  refresh(
    @Body({ schema: refreshSchema }) dto: RefreshDto,
    @Headers('user-agent') dispositivo?: string,
  ): Promise<Tokens> {
    return this.auth.renovar(dto.refreshToken, dispositivo);
  }

  @Publico()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'RF-03: cerrar sesión' })
  async logout(@Body({ schema: refreshSchema }) dto: RefreshDto): Promise<void> {
    await this.auth.logout(dto.refreshToken);
  }

  @Publico()
  @Throttle(LIMITE_AUTH)
  @Post('recuperar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'RF-04: enviar código para cambiar la contraseña' })
  recuperar(@Body({ schema: soloCorreoSchema }) dto: SoloCorreoDto) {
    return this.auth.recuperar(dto.correo);
  }

  @Publico()
  @Throttle(LIMITE_AUTH)
  @Post('restablecer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'RF-04: cambiar la contraseña con el código' })
  restablecer(@Body({ schema: restablecerSchema }) dto: RestablecerDto) {
    return this.auth.restablecer(dto);
  }

  @ApiBearerAuth()
  @Post('2fa/configurar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'RF-02: generar el secreto para la app autenticadora' })
  configurar2fa(@UsuarioActual() u: UsuarioSesion): Promise<Configuracion2fa> {
    return this.auth.configurar2fa(u.id);
  }

  @ApiBearerAuth()
  @Throttle(LIMITE_AUTH)
  @Post('2fa/activar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'RF-02: activar 2FA confirmando un código' })
  activar2fa(
    @UsuarioActual() u: UsuarioSesion,
    @Body({ schema: codigo2faSchema }) dto: Codigo2faDto,
  ) {
    return this.auth.activar2fa(u.id, dto.codigo);
  }

  @ApiBearerAuth()
  @Throttle(LIMITE_AUTH)
  @Post('2fa/desactivar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'RF-02: desactivar 2FA confirmando un código' })
  desactivar2fa(
    @UsuarioActual() u: UsuarioSesion,
    @Body({ schema: codigo2faSchema }) dto: Codigo2faDto,
  ) {
    return this.auth.desactivar2fa(u.id, dto.codigo);
  }
}
