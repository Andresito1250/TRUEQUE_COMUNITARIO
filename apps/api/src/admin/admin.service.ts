import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type ActualizarCategoriaDto,
  type CambiarEstadoUsuarioDto,
  type CategoriaAdmin,
  type CrearCategoriaDto,
  ESTADOS_CERRADOS,
  ESTADOS_REALIZADOS,
  type EstadoReporte,
  type Indicadores,
  Localidad,
  type RegistroAuditoriaDto,
  type ReporteAdmin,
  type ResolverReporteDto,
  type UsuarioAdmin,
} from '@trueque/shared';
import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import type { Notificacion, Prisma } from '../generated/prisma/client.js';
import { TiempoRealGateway } from '../mensajes/tiempo-real.gateway.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TruequesService } from '../trueques/trueques.service.js';

const POR_PAGINA = 50;

/** Módulo 7: moderación, usuarios, indicadores y categorías (RF-25 a RF-28, RNF10). */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
    private readonly notificaciones: NotificacionesService,
    private readonly trueques: TruequesService,
    private readonly almacenamiento: AlmacenamientoService,
    private readonly tiempoReal: TiempoRealGateway,
  ) {}

  // ───────────── RF-25: moderar reportes ─────────────

  async reportes(estado: EstadoReporte): Promise<ReporteAdmin[]> {
    const lista = await this.prisma.reporte.findMany({
      where: { estado },
      orderBy: { creadoEn: estado === 'PENDIENTE' ? 'asc' : 'desc' },
      take: 100,
      include: {
        reportante: { select: { nombre: true } },
        publicacion: {
          select: {
            id: true,
            titulo: true,
            estado: true,
            imagenes: { orderBy: { orden: 'asc' }, take: 1 },
          },
        },
        usuarioReportado: { select: { id: true, nombre: true, estado: true } },
      },
    });
    const pendientes = await this.prisma.reporte.groupBy({
      by: ['publicacionId', 'usuarioReportadoId'],
      where: { estado: 'PENDIENTE' },
      _count: true,
    });
    const similares = (r: (typeof lista)[number]) =>
      pendientes
        .filter((g) =>
          r.publicacionId
            ? g.publicacionId === r.publicacionId
            : !g.publicacionId && g.usuarioReportadoId === r.usuarioReportadoId,
        )
        .reduce((t, g) => t + g._count, 0);

    return lista.map((r) => ({
      id: r.id,
      motivo: r.motivo,
      detalle: r.detalle,
      estado: r.estado,
      decision: r.decision,
      creadoEn: r.creadoEn.toISOString(),
      reportante: r.reportante.nombre,
      publicacion: r.publicacion
        ? {
            id: r.publicacion.id,
            titulo: r.publicacion.titulo,
            estado: r.publicacion.estado,
            miniaturaUrl: this.almacenamiento.url(r.publicacion.imagenes[0]?.miniaturaUrl ?? null),
          }
        : null,
      usuario: r.usuarioReportado,
      similares: similares(r),
    }));
  }

  /**
   * Aplica la decisión y resuelve todos los reportes pendientes sobre el mismo objetivo.
   * Avisa al dueño de la publicación (o a la persona suspendida) y queda en la auditoría.
   */
  async resolverReporte(adminId: string, id: string, dto: ResolverReporteDto): Promise<void> {
    const r = await this.prisma.reporte.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('No encontramos este reporte.');
    if (r.estado !== 'PENDIENTE') throw new ConflictException('Este reporte ya fue resuelto.');
    if (dto.decision !== 'APROBAR' && dto.decision !== 'SUSPENDER_USUARIO' && !r.publicacionId) {
      throw new ConflictException('Esta decisión solo aplica a reportes de publicaciones.');
    }
    if (dto.decision === 'SUSPENDER_USUARIO' && !r.usuarioReportadoId) {
      throw new ConflictException('Este reporte no tiene una persona asociada.');
    }

    let suspendido: string | null = null;
    const avisos = await this.prisma.$transaction(async (tx) => {
      const creadas: Notificacion[] = [];
      const pub = r.publicacionId
        ? await tx.publicacion.findUniqueOrThrow({ where: { id: r.publicacionId } })
        : null;

      if (pub && (dto.decision === 'OCULTAR' || dto.decision === 'ELIMINAR')) {
        const motivo = 'Una de las publicaciones fue retirada por moderación.';
        creadas.push(
          ...(await this.trueques.cancelarAbiertas(
            tx,
            { articulos: { some: { publicacionId: pub.id } } },
            motivo,
            (p) => [p.proponenteId, p.receptorId].filter((u) => u !== pub.usuarioId),
          )),
        );
        await tx.publicacion.update({
          where: { id: pub.id },
          data: { estado: dto.decision === 'OCULTAR' ? 'OCULTA' : 'ELIMINADA' },
        });
        creadas.push(
          ...(await this.notificaciones.crear(
            [
              {
                usuarioId: pub.usuarioId,
                tipo: 'MODERACION',
                titulo: 'Retiramos una de tus publicaciones',
                mensaje: `«${pub.titulo}» no cumple los términos de uso${dto.nota ? `: ${dto.nota}` : '.'}`,
              },
            ],
            tx,
          )),
        );
      }
      if (pub && dto.decision === 'APROBAR' && pub.estado === 'OCULTA') {
        // Estaba oculta por reportes (D29) y no infringe: vuelve a estar disponible.
        await tx.publicacion.update({ where: { id: pub.id }, data: { estado: 'DISPONIBLE' } });
      }
      if (dto.decision === 'SUSPENDER_USUARIO' && r.usuarioReportadoId) {
        creadas.push(
          ...(await this.suspender(tx, adminId, r.usuarioReportadoId, dto.nota ?? 'Reporte')),
        );
        suspendido = r.usuarioReportadoId;
      }

      const mismoObjetivo: Prisma.ReporteWhereInput = r.publicacionId
        ? { publicacionId: r.publicacionId }
        : { usuarioReportadoId: r.usuarioReportadoId, publicacionId: null };
      const resueltos = await tx.reporte.updateMany({
        where: { estado: 'PENDIENTE', ...mismoObjetivo },
        data: { estado: 'RESUELTO', decision: dto.decision, adminId, resueltoEn: new Date() },
      });
      await this.auditoria.registrar(
        {
          accion: 'REPORTE_RESUELTO',
          actorId: adminId,
          entidad: 'Reporte',
          entidadId: r.id,
          detalle: { decision: dto.decision, nota: dto.nota ?? null, reportes: resueltos.count },
        },
        tx,
      );
      return creadas;
    });
    this.notificaciones.emitir(avisos);
    if (suspendido) this.tiempoReal.desconectarUsuario(suspendido);
  }

  // ───────────── RF-26: gestionar usuarios ─────────────

  async usuarios(q?: string, estado?: 'ACTIVO' | 'SUSPENDIDO'): Promise<UsuarioAdmin[]> {
    const lista = await this.prisma.usuario.findMany({
      where: {
        estado: estado ?? { in: ['ACTIVO', 'SUSPENDIDO'] },
        ...(q
          ? {
              OR: [
                { nombre: { contains: q, mode: 'insensitive' } },
                { correo: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { creadoEn: 'desc' },
      take: 100,
      include: {
        _count: {
          select: {
            publicaciones: { where: { estado: { not: 'ELIMINADA' } } },
            reportesRecibidos: true,
          },
        },
      },
    });
    return lista.map((u) => ({
      id: u.id,
      nombre: u.nombre,
      correo: u.correo,
      localidad: u.localidad,
      rol: u.rol,
      estado: u.estado,
      creadoEn: u.creadoEn.toISOString(),
      publicaciones: u._count.publicaciones,
      reportesRecibidos: u._count.reportesRecibidos,
    }));
  }

  async cambiarEstadoUsuario(
    adminId: string,
    id: string,
    dto: CambiarEstadoUsuarioDto,
  ): Promise<UsuarioAdmin> {
    if (id === adminId) throw new ForbiddenException('No puedes cambiar el estado de tu cuenta.');
    const u = await this.prisma.usuario.findUnique({ where: { id } });
    if (!u || u.estado === 'ELIMINADO') throw new NotFoundException('Este usuario no existe.');
    if (u.rol === 'ADMIN')
      throw new ForbiddenException('No se puede suspender a un administrador.');
    if (u.estado === dto.estado) {
      throw new ConflictException(
        dto.estado === 'ACTIVO' ? 'La cuenta ya está activa.' : 'La cuenta ya está suspendida.',
      );
    }
    const avisos = await this.prisma.$transaction(async (tx) => {
      if (dto.estado === 'SUSPENDIDO') return this.suspender(tx, adminId, id, dto.motivo);
      await tx.usuario.update({ where: { id }, data: { estado: 'ACTIVO' } });
      await this.auditoria.registrar(
        {
          accion: 'USUARIO_REACTIVADO',
          actorId: adminId,
          entidad: 'Usuario',
          entidadId: id,
          detalle: { motivo: dto.motivo },
        },
        tx,
      );
      return [];
    });
    this.notificaciones.emitir(avisos);
    if (dto.estado === 'SUSPENDIDO') this.tiempoReal.desconectarUsuario(id);
    const [r] = (await this.usuarios(u.correo)).filter((x) => x.id === id);
    return r!;
  }

  /** Suspende: cierra sesiones, cancela sus trueques abiertos y avisa a las otras partes. */
  private async suspender(
    tx: Prisma.TransactionClient,
    adminId: string,
    id: string,
    motivo: string,
  ) {
    await tx.usuario.update({ where: { id }, data: { estado: 'SUSPENDIDO' } });
    await tx.refreshToken.deleteMany({ where: { usuarioId: id } });
    await this.auditoria.registrar(
      {
        accion: 'USUARIO_SUSPENDIDO',
        actorId: adminId,
        entidad: 'Usuario',
        entidadId: id,
        detalle: { motivo },
      },
      tx,
    );
    return this.trueques.cancelarAbiertas(
      tx,
      { OR: [{ proponenteId: id }, { receptorId: id }] },
      'La otra persona ya no está disponible en la comunidad.',
      (p) => [p.proponenteId, p.receptorId].filter((u) => u !== id),
    );
  }

  // ───────────── RF-27: indicadores ─────────────

  async indicadores(): Promise<Indicadores> {
    const p = this.prisma;
    const [
      usuariosPorEstado,
      porLocalidad,
      pubPorEstado,
      porCategoria,
      propPorEstado,
      calif,
      repPorEstado,
    ] = await Promise.all([
      p.usuario.groupBy({ by: ['estado'], where: { rol: 'CIUDADANO' }, _count: true }),
      p.usuario.groupBy({
        by: ['localidad'],
        where: { rol: 'CIUDADANO', estado: { not: 'ELIMINADO' } },
        _count: true,
      }),
      p.publicacion.groupBy({ by: ['estado'], _count: true }),
      p.publicacion.groupBy({
        by: ['categoriaId'],
        where: { estado: { not: 'ELIMINADA' } },
        _count: true,
      }),
      p.propuestaTrueque.groupBy({ by: ['estado'], _count: true }),
      p.calificacion.aggregate({ _avg: { puntuacion: true }, _count: true }),
      p.reporte.groupBy({ by: ['estado'], _count: true }),
    ]);
    const categorias = await p.categoria.findMany({ select: { id: true, nombre: true } });
    const semanas = await p.$queryRaw<{ semana: Date; realizados: number }[]>`
      SELECT date_trunc('week', "fechaConfirmacion") AS semana, count(*)::int AS realizados
      FROM "Intercambio"
      WHERE "fechaConfirmacion" >= now() - interval '8 weeks'
      GROUP BY 1 ORDER BY 1`;

    const sumar = (g: { estado: string; _count: number }[], estados: readonly string[]) =>
      g.filter((x) => estados.includes(x.estado)).reduce((t, x) => t + x._count, 0);
    const usu = (e: string) => sumar(usuariosPorEstado, [e]);
    const pub = (e: string) => sumar(pubPorEstado, [e]);
    const prop = (estados: readonly string[]) => sumar(propPorEstado, estados);

    const realizados = prop(ESTADOS_REALIZADOS);
    const cerrados = prop(ESTADOS_CERRADOS);
    const promedio = calif._avg.puntuacion;
    return {
      generadoEn: new Date().toISOString(),
      usuarios: {
        total: usu('ACTIVO') + usu('SUSPENDIDO'),
        activos: usu('ACTIVO'),
        suspendidos: usu('SUSPENDIDO'),
        porLocalidad: Object.fromEntries(
          Object.values(Localidad).map((l) => [
            l,
            porLocalidad.find((x) => x.localidad === l)?._count ?? 0,
          ]),
        ) as Indicadores['usuarios']['porLocalidad'],
      },
      publicaciones: {
        total: pubPorEstado
          .filter((x) => x.estado !== 'ELIMINADA')
          .reduce((t, x) => t + x._count, 0),
        disponibles: pub('DISPONIBLE'),
        intercambiadas: pub('INTERCAMBIADA'),
        ocultas: pub('OCULTA'),
        porCategoria: porCategoria
          .map((g) => ({
            nombre: categorias.find((c) => c.id === g.categoriaId)?.nombre ?? '—',
            total: g._count,
          }))
          .sort((a, b) => b.total - a.total),
      },
      trueques: {
        // Las contrapropuestas cerradas no cuentan como propuestas aparte.
        propuestas: propPorEstado
          .filter((x) => x.estado !== 'CONTRAPROPUESTA')
          .reduce((t, x) => t + x._count, 0),
        aceptadas: prop(['ACEPTADA', 'ENCUENTRO_ACORDADO', 'ESPERANDO_CONFIRMACION']) + realizados,
        realizados,
        cancelados: prop(['CANCELADA']),
        tasaExito:
          realizados + cerrados
            ? Math.round((realizados / (realizados + cerrados)) * 100) / 100
            : null,
        porSemana: semanas.map((s) => ({
          semana: s.semana.toISOString().slice(0, 10),
          realizados: s.realizados,
        })),
      },
      reputacion: {
        promedio: promedio === null ? null : Math.round(promedio * 10) / 10,
        calificaciones: calif._count,
      },
      reportes: {
        pendientes: repPorEstado.find((x) => x.estado === 'PENDIENTE')?._count ?? 0,
        resueltos: repPorEstado.find((x) => x.estado === 'RESUELTO')?._count ?? 0,
      },
    };
  }

  /** CSV con ";" y BOM para que Excel en español lo abra bien. */
  async indicadoresCsv(): Promise<string> {
    const i = await this.indicadores();
    const filas: [string, string, string | number][] = [
      ['General', 'Generado en', i.generadoEn],
      ['Usuarios', 'Total', i.usuarios.total],
      ['Usuarios', 'Activos', i.usuarios.activos],
      ['Usuarios', 'Suspendidos', i.usuarios.suspendidos],
      ...Object.entries(i.usuarios.porLocalidad).map(
        ([l, n]) => ['Usuarios por localidad', l, n] as [string, string, number],
      ),
      ['Publicaciones', 'Total', i.publicaciones.total],
      ['Publicaciones', 'Disponibles', i.publicaciones.disponibles],
      ['Publicaciones', 'Intercambiadas', i.publicaciones.intercambiadas],
      ['Publicaciones', 'Ocultas', i.publicaciones.ocultas],
      ...i.publicaciones.porCategoria.map(
        (c) => ['Publicaciones por categoría', c.nombre, c.total] as [string, string, number],
      ),
      ['Trueques', 'Propuestas', i.trueques.propuestas],
      ['Trueques', 'Aceptadas', i.trueques.aceptadas],
      ['Trueques', 'Realizados', i.trueques.realizados],
      ['Trueques', 'Cancelados', i.trueques.cancelados],
      [
        'Trueques',
        'Tasa de éxito',
        i.trueques.tasaExito === null ? '' : String(i.trueques.tasaExito).replace('.', ','),
      ],
      ...i.trueques.porSemana.map(
        (s) =>
          ['Trueques realizados por semana', s.semana, s.realizados] as [string, string, number],
      ),
      [
        'Reputación',
        'Promedio',
        i.reputacion.promedio === null ? '' : String(i.reputacion.promedio).replace('.', ','),
      ],
      ['Reputación', 'Calificaciones', i.reputacion.calificaciones],
      ['Reportes', 'Pendientes', i.reportes.pendientes],
      ['Reportes', 'Resueltos', i.reportes.resueltos],
    ];
    const celda = (v: string | number) => {
      const t = String(v);
      return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    return `﻿Sección;Indicador;Valor\n${filas.map((f) => f.map(celda).join(';')).join('\n')}\n`;
  }

  // ───────────── RF-28: categorías ─────────────

  async categorias(): Promise<CategoriaAdmin[]> {
    const lista = await this.prisma.categoria.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        _count: { select: { publicaciones: { where: { estado: { not: 'ELIMINADA' } } } } },
      },
    });
    return lista.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      icono: c.icono,
      activa: c.activa,
      publicaciones: c._count.publicaciones,
    }));
  }

  async crearCategoria(adminId: string, dto: CrearCategoriaDto): Promise<CategoriaAdmin> {
    await this.nombreLibre(dto.nombre);
    const c = await this.prisma.categoria.create({ data: dto });
    await this.auditoria.registrar({
      accion: 'CATEGORIA_CREADA',
      actorId: adminId,
      entidad: 'Categoria',
      entidadId: String(c.id),
      detalle: dto,
    });
    return { ...c, publicaciones: 0 };
  }

  /** Desactivar una categoría la oculta para nuevas publicaciones; las existentes se conservan. */
  async actualizarCategoria(
    adminId: string,
    id: number,
    dto: ActualizarCategoriaDto,
  ): Promise<CategoriaAdmin> {
    const c = await this.prisma.categoria.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('No encontramos esta categoría.');
    if (dto.nombre && dto.nombre.toLowerCase() !== c.nombre.toLowerCase()) {
      await this.nombreLibre(dto.nombre);
    }
    await this.prisma.categoria.update({ where: { id }, data: dto });
    await this.auditoria.registrar({
      accion: 'CATEGORIA_ACTUALIZADA',
      actorId: adminId,
      entidad: 'Categoria',
      entidadId: String(id),
      detalle: dto,
    });
    return (await this.categorias()).find((x) => x.id === id)!;
  }

  private async nombreLibre(nombre: string) {
    const existe = await this.prisma.categoria.findFirst({
      where: { nombre: { equals: nombre, mode: 'insensitive' } },
    });
    if (existe) throw new ConflictException('Ya existe una categoría con ese nombre.');
  }

  // ───────────── RNF10: auditoría ─────────────

  async auditoriaRegistros(
    pagina: number,
  ): Promise<{ registros: RegistroAuditoriaDto[]; hayMas: boolean }> {
    const lista = await this.prisma.registroAuditoria.findMany({
      orderBy: { fecha: 'desc' },
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA + 1,
      include: { actor: { select: { nombre: true } } },
    });
    return {
      hayMas: lista.length > POR_PAGINA,
      registros: lista.slice(0, POR_PAGINA).map((r) => ({
        id: r.id,
        accion: r.accion,
        entidad: r.entidad,
        entidadId: r.entidadId,
        actor: r.actor?.nombre ?? null,
        detalle: r.detalle,
        fecha: r.fecha.toISOString(),
      })),
    };
  }
}
