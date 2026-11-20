import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ES_PUBLICO, ROLES, type UsuarioSesion } from '../comun/decoradores.js';
import type { Rol } from '@trueque/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { TokensService } from './tokens.service.js';

/**
 * Guard global: exige un access token válido salvo en endpoints marcados con @Publico().
 * Consulta el estado del usuario en cada petición para que una suspensión (RF-26) aplique de inmediato.
 * También aplica @Roles() (control de acceso por rol para el administrador).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokensService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    // El socket de tiempo real valida el token una sola vez, al conectarse (TiempoRealGateway).
    if (ctx.getType() !== 'http') return true;
    const objetivos = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(ES_PUBLICO, objetivos)) return true;

    const req = ctx.switchToHttp().getRequest<Request & { usuario?: UsuarioSesion }>();
    const [tipo, token] = req.headers.authorization?.split(' ') ?? [];
    if (tipo !== 'Bearer' || !token)
      throw new UnauthorizedException('Inicia sesión para continuar.');

    const payload = await this.tokens.verificarAccess(token);
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      select: { id: true, rol: true, estado: true },
    });
    if (!usuario || usuario.estado === 'ELIMINADO') {
      throw new UnauthorizedException('Tu sesión terminó. Inicia sesión de nuevo.');
    }
    if (usuario.estado === 'SUSPENDIDO') {
      throw new ForbiddenException({
        statusCode: 403,
        codigo: 'CUENTA_SUSPENDIDA',
        message: 'Tu cuenta está suspendida por incumplir los términos de uso.',
      });
    }

    const roles = this.reflector.getAllAndOverride<Rol[] | undefined>(ROLES, objetivos);
    if (roles && !roles.includes(usuario.rol)) {
      throw new ForbiddenException('No tienes permiso para esta acción.');
    }

    req.usuario = { id: usuario.id, rol: usuario.rol };
    return true;
  }
}
