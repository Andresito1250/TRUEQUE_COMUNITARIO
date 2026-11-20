import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  actualizarCategoriaSchema,
  type ActualizarCategoriaDto,
  cambiarEstadoUsuarioSchema,
  type CambiarEstadoUsuarioDto,
  type CategoriaAdmin,
  crearCategoriaSchema,
  type CrearCategoriaDto,
  type EstadoReporte,
  filtroReportesSchema,
  filtroUsuariosSchema,
  type Indicadores,
  paginaSchema,
  type RegistroAuditoriaDto,
  type ReporteAdmin,
  resolverReporteSchema,
  type ResolverReporteDto,
  type UsuarioAdmin,
} from '@trueque/shared';
import { z } from 'zod';
import { Roles, UsuarioActual, type UsuarioSesion } from '../comun/decoradores.js';
import { AdminService } from './admin.service.js';

/** Todas las rutas exigen el rol ADMIN (control de acceso por rol, RNF09). */
@ApiTags('admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('reportes')
  @ApiOperation({ summary: 'RF-25: reportes por estado (pendientes primero)' })
  reportes(
    @Query({ schema: filtroReportesSchema }) q: { estado: EstadoReporte },
  ): Promise<ReporteAdmin[]> {
    return this.admin.reportes(q.estado);
  }

  @Patch('reportes/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'RF-25: resolver un reporte (aprobar, ocultar, eliminar o suspender)' })
  resolver(
    @UsuarioActual() u: UsuarioSesion,
    @Param('id', { schema: z.uuid('Reporte no válido') }) id: string,
    @Body({ schema: resolverReporteSchema }) dto: ResolverReporteDto,
  ): Promise<void> {
    return this.admin.resolverReporte(u.id, id, dto);
  }

  @Get('usuarios')
  @ApiOperation({ summary: 'RF-26: buscar usuarios por nombre o correo' })
  usuarios(
    @Query({ schema: filtroUsuariosSchema }) q: { q?: string; estado?: 'ACTIVO' | 'SUSPENDIDO' },
  ): Promise<UsuarioAdmin[]> {
    return this.admin.usuarios(q.q, q.estado);
  }

  @Patch('usuarios/:id/estado')
  @ApiOperation({ summary: 'RF-26: suspender o reactivar una cuenta' })
  estadoUsuario(
    @UsuarioActual() u: UsuarioSesion,
    @Param('id', { schema: z.uuid('Usuario no válido') }) id: string,
    @Body({ schema: cambiarEstadoUsuarioSchema }) dto: CambiarEstadoUsuarioDto,
  ): Promise<UsuarioAdmin> {
    return this.admin.cambiarEstadoUsuario(u.id, id, dto);
  }

  @Get('indicadores')
  @ApiOperation({ summary: 'RF-27: indicadores del piloto' })
  indicadores(): Promise<Indicadores> {
    return this.admin.indicadores();
  }

  @Get('indicadores/export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="indicadores-trueque.csv"')
  @ApiOperation({ summary: 'RF-27: exportar los indicadores en CSV' })
  csv(): Promise<string> {
    return this.admin.indicadoresCsv();
  }

  @Get('categorias')
  @ApiOperation({ summary: 'RF-28: todas las categorías, activas e inactivas' })
  categorias(): Promise<CategoriaAdmin[]> {
    return this.admin.categorias();
  }

  @Post('categorias')
  @ApiOperation({ summary: 'RF-28: crear una categoría' })
  crearCategoria(
    @UsuarioActual() u: UsuarioSesion,
    @Body({ schema: crearCategoriaSchema }) dto: CrearCategoriaDto,
  ): Promise<CategoriaAdmin> {
    return this.admin.crearCategoria(u.id, dto);
  }

  @Patch('categorias/:id')
  @ApiOperation({ summary: 'RF-28: renombrar, cambiar el icono o activar/desactivar' })
  actualizarCategoria(
    @UsuarioActual() u: UsuarioSesion,
    @Param('id', { schema: z.coerce.number().int().positive() }) id: number,
    @Body({ schema: actualizarCategoriaSchema }) dto: ActualizarCategoriaDto,
  ): Promise<CategoriaAdmin> {
    return this.admin.actualizarCategoria(u.id, id, dto);
  }

  @Get('auditoria')
  @ApiOperation({ summary: 'RNF10: registro de auditoría (50 por página)' })
  auditoria(
    @Query({ schema: paginaSchema }) q: { pagina: number },
  ): Promise<{ registros: RegistroAuditoriaDto[]; hayMas: boolean }> {
    return this.admin.auditoriaRegistros(q.pagina);
  }
}
