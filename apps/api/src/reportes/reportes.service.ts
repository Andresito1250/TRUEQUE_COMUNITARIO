import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { REPORTES_PARA_OCULTAR, type ReporteDto } from '@trueque/shared';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * RF-24: reportar una publicación o a una persona. Los reportes llegan a la moderación (RF-25).
 * Si una publicación acumula reportes de varias personas, se oculta mientras se revisa (D29).
 */
@Injectable()
export class ReportesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async crear(reportanteId: string, dto: ReporteDto): Promise<{ id: string; ocultada: boolean }> {
    let duenoId: string | null = null;
    if (dto.publicacionId) {
      const p = await this.prisma.publicacion.findUnique({
        where: { id: dto.publicacionId },
        select: { usuarioId: true, estado: true },
      });
      if (!p || p.estado === 'ELIMINADA') {
        throw new NotFoundException('Esta publicación ya no está disponible.');
      }
      if (p.usuarioId === reportanteId) {
        throw new ConflictException('No puedes reportar tu propia publicación.');
      }
      duenoId = p.usuarioId;
    } else if (dto.usuarioId) {
      if (dto.usuarioId === reportanteId) {
        throw new ConflictException('No puedes reportarte a ti mismo.');
      }
      const u = await this.prisma.usuario.findUnique({
        where: { id: dto.usuarioId },
        select: { estado: true },
      });
      if (!u || u.estado === 'ELIMINADO') throw new NotFoundException('Este usuario no existe.');
    }

    const objetivo = dto.publicacionId
      ? { publicacionId: dto.publicacionId }
      : { usuarioReportadoId: dto.usuarioId };
    const repetido = await this.prisma.reporte.findFirst({
      where: { reportanteId, estado: 'PENDIENTE', ...objetivo },
      select: { id: true },
    });
    if (repetido) {
      throw new ConflictException('Ya reportaste esto. El equipo de moderación lo está revisando.');
    }

    return this.prisma.$transaction(async (tx) => {
      const r = await tx.reporte.create({
        data: {
          reportanteId,
          motivo: dto.motivo,
          detalle: dto.detalle,
          ...objetivo,
          // Al reportar una publicación también queda registrado su dueño.
          ...(duenoId ? { usuarioReportadoId: duenoId } : {}),
        },
      });
      await this.auditoria.registrar(
        {
          accion: 'REPORTE_CREADO',
          actorId: reportanteId,
          entidad: 'Reporte',
          entidadId: r.id,
          detalle: { motivo: dto.motivo, ...objetivo },
        },
        tx,
      );

      let ocultada = false;
      if (dto.publicacionId) {
        const distintos = await tx.reporte.groupBy({
          by: ['reportanteId'],
          where: { publicacionId: dto.publicacionId, estado: 'PENDIENTE' },
        });
        if (distintos.length >= REPORTES_PARA_OCULTAR) {
          const res = await tx.publicacion.updateMany({
            where: { id: dto.publicacionId, estado: 'DISPONIBLE' },
            data: { estado: 'OCULTA' },
          });
          ocultada = res.count > 0;
          if (ocultada) {
            await this.auditoria.registrar(
              {
                accion: 'PUBLICACION_OCULTA_AUTOMATICA',
                entidad: 'Publicacion',
                entidadId: dto.publicacionId,
                detalle: { reportes: distintos.length },
              },
              tx,
            );
          }
        }
      }
      return { id: r.id, ocultada };
    });
  }
}
