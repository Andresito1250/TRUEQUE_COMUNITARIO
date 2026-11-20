import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { Publico } from '../comun/decoradores.js';
import { AlmacenamientoService, PREFIJOS_PUBLICOS } from './almacenamiento.service.js';

/**
 * Sirve las imágenes guardadas en S3 a través del API. Así la app solo necesita llegar al API
 * (útil con Expo Go en la red local). Los nombres son UUID, por eso se cachean un año.
 */
@ApiExcludeController()
@Publico()
@SkipThrottle()
@Controller('archivos')
export class ArchivosController {
  constructor(private readonly almacenamiento: AlmacenamientoService) {}

  @Get('*ruta')
  async obtener(@Param('ruta') ruta: string | string[], @Res() res: Response): Promise<void> {
    const clave = Array.isArray(ruta) ? ruta.join('/') : ruta;
    const permitida =
      PREFIJOS_PUBLICOS.some((p) => clave.startsWith(p)) &&
      !clave.includes('..') &&
      /^[\w./-]+$/.test(clave);
    if (!permitida) throw new NotFoundException('Archivo no encontrado.');

    const archivo = await this.almacenamiento.obtener(clave);
    res.setHeader('Content-Type', archivo.tipo);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    if (archivo.tamano) res.setHeader('Content-Length', archivo.tamano);
    archivo.cuerpo.pipe(res);
  }
}
