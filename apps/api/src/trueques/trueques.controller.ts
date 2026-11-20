import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type Bandeja,
  bandejaSchema,
  cancelarPropuestaSchema,
  type CancelarPropuestaDto,
  contrapropuestaSchema,
  type ContrapropuestaDto,
  crearPropuestaSchema,
  type CrearPropuestaDto,
  encuentroSchema,
  type EncuentroDto,
  type PropuestaDetalle,
  type PropuestaResumen,
  type PuntoEncuentro,
  puntosEncuentroSchema,
} from '@trueque/shared';
import { z } from 'zod';
import { UsuarioActual, type UsuarioSesion } from '../comun/decoradores.js';
import { PuntosEncuentroService } from './puntos-encuentro.service.js';
import { TruequesService } from './trueques.service.js';

const idSchema = z.uuid('Propuesta no válida');

@ApiTags('trueques')
@ApiBearerAuth()
@Controller()
export class TruequesController {
  constructor(
    private readonly trueques: TruequesService,
    private readonly puntos: PuntosEncuentroService,
  ) {}

  @Post('propuestas')
  @ApiOperation({ summary: 'RF-14: proponer un trueque' })
  crear(
    @UsuarioActual() u: UsuarioSesion,
    @Body({ schema: crearPropuestaSchema }) dto: CrearPropuestaDto,
  ): Promise<PropuestaDetalle> {
    return this.trueques.crear(u.id, dto);
  }

  @Get('propuestas')
  @ApiOperation({ summary: 'Bandejas: recibidas, enviadas, activas o historial (RF-19)' })
  listar(
    @UsuarioActual() u: UsuarioSesion,
    @Query({ schema: bandejaSchema }) q: { bandeja: Bandeja },
  ): Promise<PropuestaResumen[]> {
    return this.trueques.listar(u.id, q.bandeja);
  }

  @Get('propuestas/:id')
  @ApiOperation({ summary: 'Detalle de una propuesta y acciones disponibles' })
  detalle(
    @UsuarioActual() u: UsuarioSesion,
    @Param('id', { schema: idSchema }) id: string,
  ): Promise<PropuestaDetalle> {
    return this.trueques.detalle(id, u.id);
  }

  @Post('propuestas/:id/aceptar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'RF-15: aceptar (reserva los artículos, D3)' })
  aceptar(
    @UsuarioActual() u: UsuarioSesion,
    @Param('id', { schema: idSchema }) id: string,
  ): Promise<PropuestaDetalle> {
    return this.trueques.aceptar(id, u.id);
  }

  @Post('propuestas/:id/rechazar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'RF-15: rechazar' })
  rechazar(
    @UsuarioActual() u: UsuarioSesion,
    @Param('id', { schema: idSchema }) id: string,
  ): Promise<PropuestaDetalle> {
    return this.trueques.rechazar(id, u.id);
  }

  @Post('propuestas/:id/contrapropuesta')
  @ApiOperation({ summary: 'RF-15: contrapropuesta (crea una propuesta nueva)' })
  contraproponer(
    @UsuarioActual() u: UsuarioSesion,
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: contrapropuestaSchema }) dto: ContrapropuestaDto,
  ): Promise<PropuestaDetalle> {
    return this.trueques.contraproponer(id, u.id, dto);
  }

  @Post('propuestas/:id/cancelar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'RF-18: cancelar' })
  cancelar(
    @UsuarioActual() u: UsuarioSesion,
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: cancelarPropuestaSchema }) dto: CancelarPropuestaDto,
  ): Promise<PropuestaDetalle> {
    return this.trueques.cancelar(id, u.id, dto);
  }

  @Post('propuestas/:id/encuentro')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'RF-16: acordar (o cambiar) el lugar y la hora del encuentro' })
  encuentro(
    @UsuarioActual() u: UsuarioSesion,
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: encuentroSchema }) dto: EncuentroDto,
  ): Promise<PropuestaDetalle> {
    return this.trueques.acordarEncuentro(id, u.id, dto);
  }

  @Post('propuestas/:id/confirmar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'RF-17: marcar el trueque como hecho (basta una de las partes, D4)' })
  confirmar(
    @UsuarioActual() u: UsuarioSesion,
    @Param('id', { schema: idSchema }) id: string,
  ): Promise<PropuestaDetalle> {
    return this.trueques.confirmar(id, u.id);
  }

  @Get('puntos-encuentro')
  @ApiOperation({ summary: 'RF-16: puntos de encuentro seguros' })
  puntosEncuentro(
    @UsuarioActual() u: UsuarioSesion,
    @Query({ schema: puntosEncuentroSchema }) q: { propuestaId?: string },
  ): Promise<PuntoEncuentro[]> {
    return this.puntos.listar(u.id, q.propuestaId);
  }
}
