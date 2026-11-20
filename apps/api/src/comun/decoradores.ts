import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Rol } from '@trueque/shared';

/** Usuario autenticado que el JwtAuthGuard adjunta a la petición. */
export type UsuarioSesion = { id: string; rol: Rol };

export const ES_PUBLICO = 'esPublico';
/** Marca un endpoint como accesible sin iniciar sesión. */
export const Publico = () => SetMetadata(ES_PUBLICO, true);

export const ROLES = 'roles';
/** Restringe un endpoint a ciertos roles (p. ej. ADMIN). */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES, roles);

/** Inyecta el usuario autenticado en el handler. */
export const UsuarioActual = createParamDecorator(
  (_dato: unknown, ctx: ExecutionContext): UsuarioSesion =>
    ctx.switchToHttp().getRequest<{ usuario: UsuarioSesion }>().usuario,
);
