import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  actualizarPerfilSchema,
  type ActualizarPerfilDto,
  confirmarContrasenaSchema,
  type ConfirmarContrasenaDto,
  type PerfilPrivado,
  type PerfilPublico,
} from '@trueque/shared';
import { z } from 'zod';
import { UsuarioActual, type UsuarioSesion } from '../comun/decoradores.js';
import { UsuariosService } from './usuarios.service.js';

@ApiTags('usuarios')
@ApiBearerAuth()
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get('me')
  @ApiOperation({ summary: 'RF-05: consultar mi perfil' })
  yo(@UsuarioActual() u: UsuarioSesion): Promise<PerfilPrivado> {
    return this.usuarios.perfilPrivado(u.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'RF-05: editar mi perfil' })
  actualizar(
    @UsuarioActual() u: UsuarioSesion,
    @Body({ schema: actualizarPerfilSchema }) dto: ActualizarPerfilDto,
  ): Promise<PerfilPrivado> {
    return this.usuarios.actualizar(u.id, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'RNF11: eliminar mi cuenta (Ley 1581 de 2012)' })
  async eliminar(
    @UsuarioActual() u: UsuarioSesion,
    @Body({ schema: confirmarContrasenaSchema }) dto: ConfirmarContrasenaDto,
  ): Promise<void> {
    await this.usuarios.eliminarCuenta(u.id, dto.contrasena);
  }

  @Get(':id')
  @ApiOperation({ summary: 'RF-23: perfil público de otro usuario' })
  publico(
    @Param('id', { schema: z.uuid('Usuario no válido') }) id: string,
  ): Promise<PerfilPublico> {
    return this.usuarios.perfilPublico(id);
  }
}
