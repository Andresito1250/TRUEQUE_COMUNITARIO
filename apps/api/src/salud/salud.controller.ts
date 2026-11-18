import { Controller, Get, HttpCode, HttpStatus, Res, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { Salud } from '@trueque/shared';
import { PrismaService } from '../prisma/prisma.service.js';

const VERSION = process.env.npm_package_version ?? '0.1.0';

/** RNF06: endpoint de disponibilidad para monitorear el servicio durante las pruebas. */
@ApiTags('salud')
@SkipThrottle()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class SaludController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Estado del servicio y de la base de datos' })
  async verificar(@Res({ passthrough: true }) res: Response): Promise<Salud> {
    let baseDeDatos: Salud['baseDeDatos'] = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      baseDeDatos = 'error';
    }
    const estado: Salud['estado'] = baseDeDatos === 'ok' ? 'ok' : 'error';
    if (estado === 'error') res.status(HttpStatus.SERVICE_UNAVAILABLE);
    return {
      estado,
      version: VERSION,
      baseDeDatos,
      fecha: new Date().toISOString(),
    };
  }
}
