import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  enviarMensajeSchema,
  type EnviarMensajeDto,
  historialMensajesSchema,
  type MensajeChat,
  type PaginaMensajes,
  type ResumenActividad,
} from '@trueque/shared';
import { z } from 'zod';
import { UsuarioActual, type UsuarioSesion } from '../comun/decoradores.js';
import { MensajesService } from './mensajes.service.js';
import { TiempoRealGateway } from './tiempo-real.gateway.js';

const idSchema = z.uuid('Propuesta no válida');

@ApiTags('mensajes')
@ApiBearerAuth()
@Controller()
export class MensajesController {
  constructor(
    private readonly mensajes: MensajesService,
    private readonly tiempoReal: TiempoRealGateway,
  ) {}

  @Get('propuestas/:id/mensajes')
  @ApiOperation({ summary: 'RF-20: historial del chat (50 por página, cursor ?antes=)' })
  historial(
    @UsuarioActual() u: UsuarioSesion,
    @Param('id', { schema: idSchema }) id: string,
    @Query({ schema: historialMensajesSchema }) q: { antes?: string },
  ): Promise<PaginaMensajes> {
    return this.mensajes.historial(id, u.id, q.antes);
  }

  @Post('propuestas/:id/mensajes')
  @ApiOperation({ summary: 'RF-20: enviar un mensaje (alternativa al socket)' })
  async enviar(
    @UsuarioActual() u: UsuarioSesion,
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: enviarMensajeSchema }) dto: EnviarMensajeDto,
  ): Promise<MensajeChat> {
    const { mensaje, destinatarioId } = await this.mensajes.enviar(id, u.id, dto.contenido);
    this.tiempoReal.difundir(mensaje, destinatarioId);
    return mensaje;
  }

  @Post('propuestas/:id/mensajes/leidos')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'RF-20: marcar como leídos los mensajes recibidos' })
  leidos(
    @UsuarioActual() u: UsuarioSesion,
    @Param('id', { schema: idSchema }) id: string,
  ): Promise<void> {
    return this.tiempoReal.avisarLeido(id, u.id);
  }

  @Get('actividad')
  @ApiOperation({ summary: 'Contadores para las insignias: propuestas, avisos y mensajes' })
  actividad(@UsuarioActual() u: UsuarioSesion): Promise<ResumenActividad> {
    return this.mensajes.actividad(u.id);
  }
}
