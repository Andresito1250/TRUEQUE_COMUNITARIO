import { Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Notificacion } from '@trueque/shared';
import { z } from 'zod';
import { UsuarioActual, type UsuarioSesion } from '../comun/decoradores.js';
import { NotificacionesService } from './notificaciones.service.js';

const idSchema = z.uuid('Notificación no válida');

@ApiTags('notificaciones')
@ApiBearerAuth()
@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly notificaciones: NotificacionesService) {}

  @Get()
  @ApiOperation({ summary: 'RF-21: bandeja de notificaciones (las 100 más recientes)' })
  listar(@UsuarioActual() u: UsuarioSesion): Promise<Notificacion[]> {
    return this.notificaciones.listar(u.id);
  }

  @Patch(':id/leida')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'RF-21: marcar una notificación como leída' })
  marcarLeida(
    @UsuarioActual() u: UsuarioSesion,
    @Param('id', { schema: idSchema }) id: string,
  ): Promise<void> {
    return this.notificaciones.marcarLeida(u.id, id);
  }

  @Post('leer-todas')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'RF-21: marcar todas como leídas' })
  leerTodas(@UsuarioActual() u: UsuarioSesion): Promise<void> {
    return this.notificaciones.leerTodas(u.id);
  }
}
