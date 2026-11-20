import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { reporteSchema, type ReporteDto } from '@trueque/shared';
import { UsuarioActual, type UsuarioSesion } from '../comun/decoradores.js';
import { ReportesService } from './reportes.service.js';

@ApiTags('reportes')
@ApiBearerAuth()
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportes: ReportesService) {}

  @Post()
  @ApiOperation({ summary: 'RF-24: reportar una publicación o a una persona' })
  crear(
    @UsuarioActual() u: UsuarioSesion,
    @Body({ schema: reporteSchema }) dto: ReporteDto,
  ): Promise<{ id: string; ocultada: boolean }> {
    return this.reportes.crear(u.id, dto);
  }
}
