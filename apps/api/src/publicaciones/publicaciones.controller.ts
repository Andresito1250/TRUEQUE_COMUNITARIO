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
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  actualizarPublicacionSchema,
  type Busqueda,
  busquedaSchema,
  type ActualizarPublicacionDto,
  cambiarEstadoPublicacionSchema,
  type CambiarEstadoPublicacionDto,
  crearPublicacionSchema,
  type CrearPublicacionDto,
  filtroMisPublicacionesSchema,
  LIMITES,
  origenDetalleSchema,
  origenValido,
  type PublicacionDetalle,
  type PublicacionResumen,
  type ResultadoBusqueda,
} from '@trueque/shared';
import { z } from 'zod';
import { type ArchivoSubido, MAX_BYTES_IMAGEN } from '../almacenamiento/imagenes.service.js';
import { UsuarioActual, type UsuarioSesion } from '../comun/decoradores.js';
import { BusquedaService } from './busqueda.service.js';
import { PublicacionesService } from './publicaciones.service.js';

const idSchema = z.uuid('Publicación no válida');

@ApiTags('publicaciones')
@ApiBearerAuth()
@Controller()
export class PublicacionesController {
  constructor(
    private readonly publicaciones: PublicacionesService,
    private readonly busqueda: BusquedaService,
  ) {}

  @Post('publicaciones')
  @ApiOperation({ summary: 'RF-06: publicar un bien o servicio' })
  crear(
    @UsuarioActual() u: UsuarioSesion,
    @Body({ schema: crearPublicacionSchema }) dto: CrearPublicacionDto,
  ): Promise<PublicacionDetalle> {
    return this.publicaciones.crear(u.id, dto);
  }

  @Get('publicaciones')
  @ApiOperation({
    summary: 'RF-10 a RF-12: buscar publicaciones por palabra, filtros y cercanía',
    description:
      'Sin `radioKm` busca en toda la ciudad. Sin `lat`/`lng` mide desde el centro de la localidad del usuario.',
  })
  buscar(
    @UsuarioActual() u: UsuarioSesion,
    @Query({ schema: busquedaSchema }) b: Busqueda,
  ): Promise<ResultadoBusqueda> {
    return this.busqueda.buscar(u.id, b);
  }

  @Get('usuarios/me/publicaciones')
  @ApiOperation({ summary: 'RF-09: mis publicaciones activas (o históricas con ?historico=true)' })
  mias(
    @UsuarioActual() u: UsuarioSesion,
    @Query({ schema: filtroMisPublicacionesSchema }) filtro: { historico: boolean },
  ): Promise<PublicacionResumen[]> {
    return this.publicaciones.mias(u.id, filtro.historico);
  }

  @Get('usuarios/:id/publicaciones')
  @ApiOperation({ summary: 'Publicaciones disponibles de otra persona (contrapropuesta, RF-15)' })
  deUsuario(
    @Param('id', { schema: z.uuid('Usuario no válido') }) id: string,
  ): Promise<PublicacionResumen[]> {
    return this.publicaciones.disponiblesDe(id);
  }

  @Get('publicaciones/:id')
  @ApiOperation({ summary: 'RF-13: detalle de una publicación' })
  detalle(
    @UsuarioActual() u: UsuarioSesion,
    @Param('id', { schema: idSchema }) id: string,
    @Query({ schema: origenDetalleSchema }) q: { lat?: number; lng?: number },
  ): Promise<PublicacionDetalle> {
    return this.publicaciones.detalle(id, u.id, origenValido(q.lat, q.lng) ?? undefined);
  }

  @Patch('publicaciones/:id')
  @ApiOperation({ summary: 'RF-07: editar una publicación propia' })
  actualizar(
    @UsuarioActual() u: UsuarioSesion,
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: actualizarPublicacionSchema }) dto: ActualizarPublicacionDto,
  ): Promise<PublicacionDetalle> {
    return this.publicaciones.actualizar(id, u.id, dto);
  }

  @Patch('publicaciones/:id/estado')
  @ApiOperation({ summary: 'RF-08: marcar como disponible, reservada o intercambiada' })
  cambiarEstado(
    @UsuarioActual() u: UsuarioSesion,
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: cambiarEstadoPublicacionSchema }) dto: CambiarEstadoPublicacionDto,
  ): Promise<PublicacionDetalle> {
    return this.publicaciones.cambiarEstado(id, u.id, dto);
  }

  @Delete('publicaciones/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'RF-07: eliminar una publicación propia' })
  async eliminar(
    @UsuarioActual() u: UsuarioSesion,
    @Param('id', { schema: idSchema }) id: string,
  ): Promise<void> {
    await this.publicaciones.eliminar(id, u.id);
  }

  @Post('publicaciones/:id/imagenes')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'RF-06: subir fotos (campo "imagenes", máximo 5 por publicación)' })
  @UseInterceptors(
    FilesInterceptor('imagenes', LIMITES.MAX_IMAGENES, { limits: { fileSize: MAX_BYTES_IMAGEN } }),
  )
  agregarImagenes(
    @UsuarioActual() u: UsuarioSesion,
    @Param('id', { schema: idSchema }) id: string,
    @UploadedFiles() archivos: ArchivoSubido[],
  ): Promise<PublicacionDetalle> {
    return this.publicaciones.agregarImagenes(id, u.id, archivos);
  }

  @Delete('publicaciones/:id/imagenes/:imagenId')
  @ApiOperation({ summary: 'RF-07: quitar una foto' })
  eliminarImagen(
    @UsuarioActual() u: UsuarioSesion,
    @Param('id', { schema: idSchema }) id: string,
    @Param('imagenId', { schema: z.uuid('Foto no válida') }) imagenId: string,
  ): Promise<PublicacionDetalle> {
    return this.publicaciones.eliminarImagen(id, imagenId, u.id);
  }
}
