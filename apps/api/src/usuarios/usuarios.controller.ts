import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  actualizarPerfilSchema,
  type ActualizarPerfilDto,
  confirmarContrasenaSchema,
  type ConfirmarContrasenaDto,
  type PerfilPrivado,
  type PerfilPublico,
  type CalificacionPublica,
} from '@trueque/shared';
import { z } from 'zod';
import { type ArchivoSubido, MAX_BYTES_IMAGEN } from '../almacenamiento/imagenes.service.js';
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

  @Post('me/foto')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'RF-05: cambiar mi foto de perfil (campo "foto")' })
  @UseInterceptors(FileInterceptor('foto', { limits: { fileSize: MAX_BYTES_IMAGEN } }))
  cambiarFoto(
    @UsuarioActual() u: UsuarioSesion,
    @UploadedFile() archivo: ArchivoSubido | undefined,
  ): Promise<PerfilPrivado> {
    return this.usuarios.cambiarFoto(u.id, archivo);
  }

  @Delete('me/foto')
  @ApiOperation({ summary: 'RF-05: quitar mi foto de perfil' })
  quitarFoto(@UsuarioActual() u: UsuarioSesion): Promise<PerfilPrivado> {
    return this.usuarios.quitarFoto(u.id);
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

  @Get(':id/calificaciones')
  @ApiOperation({ summary: 'RF-23: calificaciones que recibió un usuario' })
  calificaciones(
    @Param('id', { schema: z.uuid('Usuario no válido') }) id: string,
  ): Promise<CalificacionPublica[]> {
    return this.usuarios.calificaciones(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'RF-23: perfil público de otro usuario' })
  publico(
    @Param('id', { schema: z.uuid('Usuario no válido') }) id: string,
  ): Promise<PerfilPublico> {
    return this.usuarios.perfilPublico(id);
  }
}
