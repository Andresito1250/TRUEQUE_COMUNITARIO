import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type ActualizarPublicacionDto,
  type CambiarEstadoPublicacionDto,
  type CrearPublicacionDto,
  LIMITES,
  type PublicacionDetalle,
  type PublicacionResumen,
} from '@trueque/shared';
import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service.js';
import { type ArchivoSubido, ImagenesService } from '../almacenamiento/imagenes.service.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { guardarUbicacionPublicacion, puntoParaGuardar } from '../comun/ubicacion.js';
import type { EstadoPublicacion, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsuariosService } from '../usuarios/usuarios.service.js';

const INCLUIR = {
  categoria: { select: { id: true, nombre: true, icono: true } },
  imagenes: { orderBy: { orden: 'asc' } },
} satisfies Prisma.PublicacionInclude;

type PublicacionCompleta = Prisma.PublicacionGetPayload<{ include: typeof INCLUIR }>;

const ACTIVAS: EstadoPublicacion[] = ['DISPONIBLE', 'RESERVADA', 'OCULTA'];
const HISTORICAS: EstadoPublicacion[] = ['INTERCAMBIADA'];

/** Módulo 2: publicación de bienes y servicios (RF-06 a RF-09). */
@Injectable()
export class PublicacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imagenes: ImagenesService,
    private readonly almacenamiento: AlmacenamientoService,
    private readonly usuarios: UsuariosService,
    private readonly auditoria: AuditoriaService,
  ) {}

  /** RF-06: crea la publicación. Las fotos se suben después con agregarImagenes(). */
  async crear(usuarioId: string, dto: CrearPublicacionDto): Promise<PublicacionDetalle> {
    await this.validarCategoria(dto.categoriaId);
    const usuario = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: usuarioId },
      select: { localidad: true },
    });
    const punto = puntoParaGuardar(dto.ubicacion, usuario.localidad);

    const creada = await this.prisma.$transaction(async (tx) => {
      const p = await tx.publicacion.create({
        data: {
          titulo: dto.titulo,
          descripcion: dto.descripcion,
          tipo: dto.tipo,
          estadoConservacion: dto.estadoConservacion,
          categoriaId: dto.categoriaId,
          localidad: usuario.localidad,
          usuarioId,
        },
      });
      await guardarUbicacionPublicacion(tx, p.id, punto);
      await this.auditoria.registrar(
        {
          accion: 'PUBLICACION_CREADA',
          actorId: usuarioId,
          entidad: 'Publicacion',
          entidadId: p.id,
        },
        tx,
      );
      return p;
    });
    return this.detalle(creada.id, usuarioId);
  }

  /** RF-13 (base): detalle con fotos y perfil público del oferente. */
  async detalle(id: string, usuarioId: string): Promise<PublicacionDetalle> {
    const p = await this.prisma.publicacion.findUnique({ where: { id }, include: INCLUIR });
    const esMia = p?.usuarioId === usuarioId;
    if (!p || p.estado === 'ELIMINADA' || (p.estado === 'OCULTA' && !esMia)) {
      throw new NotFoundException('Esta publicación ya no está disponible.');
    }
    return {
      ...this.resumen(p),
      descripcion: p.descripcion,
      imagenes: p.imagenes.map((i) => ({
        id: i.id,
        url: this.almacenamiento.url(i.url),
        miniaturaUrl: this.almacenamiento.url(i.miniaturaUrl),
        orden: i.orden,
      })),
      oferente: await this.usuarios.perfilPublico(p.usuarioId),
      esMia,
    };
  }

  /** RF-09: publicaciones propias, activas o históricas. */
  async mias(usuarioId: string, historico: boolean): Promise<PublicacionResumen[]> {
    const lista = await this.prisma.publicacion.findMany({
      where: { usuarioId, estado: { in: historico ? HISTORICAS : ACTIVAS } },
      include: INCLUIR,
      orderBy: { fechaPublicacion: 'desc' },
    });
    return lista.map((p) => this.resumen(p));
  }

  /** RF-07: editar. Solo mientras está disponible, para no cambiar algo que ya se está negociando. */
  async actualizar(
    id: string,
    usuarioId: string,
    dto: ActualizarPublicacionDto,
  ): Promise<PublicacionDetalle> {
    const p = await this.propia(id, usuarioId);
    this.exigirDisponible(p.estado, 'editarla');
    if (dto.categoriaId) await this.validarCategoria(dto.categoriaId);
    // Si cambia a objeto, debe tener un estado de conservación válido.
    const tipoFinal = dto.tipo ?? p.tipo;
    const conservacionFinal = dto.estadoConservacion ?? p.estadoConservacion;
    if (tipoFinal === 'BIEN' && conservacionFinal === 'NO_APLICA') {
      throw new BadRequestException('Elige el estado del objeto.');
    }
    await this.prisma.publicacion.update({ where: { id }, data: dto });
    return this.detalle(id, usuarioId);
  }

  /** RF-08: el dueño marca la publicación como disponible, reservada o intercambiada. */
  async cambiarEstado(
    id: string,
    usuarioId: string,
    { estado }: CambiarEstadoPublicacionDto,
  ): Promise<PublicacionDetalle> {
    const p = await this.propia(id, usuarioId);
    if (p.estado === 'OCULTA') {
      throw new ConflictException(
        'Esta publicación fue ocultada por moderación y no se puede cambiar.',
      );
    }
    // TODO(Sprint 4): impedir el cambio manual si hay un trueque en curso sobre la publicación.
    await this.prisma.publicacion.update({ where: { id }, data: { estado } });
    await this.auditoria.registrar({
      accion: 'PUBLICACION_ESTADO',
      actorId: usuarioId,
      entidad: 'Publicacion',
      entidadId: id,
      detalle: { de: p.estado, a: estado },
    });
    return this.detalle(id, usuarioId);
  }

  /** RF-07: eliminar (borrado lógico; se conserva para el historial de trueques). */
  async eliminar(id: string, usuarioId: string): Promise<void> {
    const p = await this.propia(id, usuarioId);
    if (p.estado === 'RESERVADA') {
      throw new ConflictException(
        'Tienes un trueque en curso con esta publicación. Cancélalo o márcala como disponible antes de eliminarla.',
      );
    }
    await this.prisma.publicacion.update({ where: { id }, data: { estado: 'ELIMINADA' } });
    await this.auditoria.registrar({
      accion: 'PUBLICACION_ELIMINADA',
      actorId: usuarioId,
      entidad: 'Publicacion',
      entidadId: id,
    });
  }

  /** RF-06: agrega fotos respetando el máximo de 5 por publicación. */
  async agregarImagenes(
    id: string,
    usuarioId: string,
    archivos: ArchivoSubido[],
  ): Promise<PublicacionDetalle> {
    if (!archivos?.length) throw new BadRequestException('Selecciona al menos una foto.');
    const p = await this.propia(id, usuarioId);
    this.exigirDisponible(p.estado, 'cambiar sus fotos');
    const actuales = await this.prisma.imagenPublicacion.count({ where: { publicacionId: id } });
    if (actuales + archivos.length > LIMITES.MAX_IMAGENES) {
      throw new BadRequestException(
        `Cada publicación puede tener máximo ${LIMITES.MAX_IMAGENES} fotos. Ya tiene ${actuales}.`,
      );
    }
    archivos.forEach((a) => this.imagenes.validar(a));

    for (const [i, archivo] of archivos.entries()) {
      const { clave, claveMiniatura } = await this.imagenes.guardarFotoPublicacion(id, archivo);
      await this.prisma.imagenPublicacion.create({
        data: { publicacionId: id, url: clave, miniaturaUrl: claveMiniatura, orden: actuales + i },
      });
    }
    return this.detalle(id, usuarioId);
  }

  async eliminarImagen(
    id: string,
    imagenId: string,
    usuarioId: string,
  ): Promise<PublicacionDetalle> {
    const p = await this.propia(id, usuarioId);
    this.exigirDisponible(p.estado, 'cambiar sus fotos');
    const imagen = await this.prisma.imagenPublicacion.findFirst({
      where: { id: imagenId, publicacionId: id },
    });
    if (!imagen) throw new NotFoundException('La foto no existe.');

    await this.prisma.$transaction(async (tx) => {
      await tx.imagenPublicacion.delete({ where: { id: imagenId } });
      // Se corre el orden de las siguientes una por una para no chocar con el índice único.
      const siguientes = await tx.imagenPublicacion.findMany({
        where: { publicacionId: id, orden: { gt: imagen.orden } },
        orderBy: { orden: 'asc' },
      });
      for (const s of siguientes) {
        await tx.imagenPublicacion.update({ where: { id: s.id }, data: { orden: s.orden - 1 } });
      }
    });
    await this.almacenamiento.eliminar([imagen.url, imagen.miniaturaUrl]);
    return this.detalle(id, usuarioId);
  }

  private resumen(p: PublicacionCompleta): PublicacionResumen {
    return {
      id: p.id,
      titulo: p.titulo,
      tipo: p.tipo,
      estado: p.estado,
      estadoConservacion: p.estadoConservacion,
      localidad: p.localidad,
      categoria: p.categoria,
      miniaturaUrl: this.almacenamiento.url(p.imagenes[0]?.miniaturaUrl ?? null),
      fechaPublicacion: p.fechaPublicacion.toISOString(),
    };
  }

  private async propia(id: string, usuarioId: string) {
    const p = await this.prisma.publicacion.findUnique({ where: { id } });
    if (!p || p.estado === 'ELIMINADA')
      throw new NotFoundException('Esta publicación ya no está disponible.');
    if (p.usuarioId !== usuarioId) {
      throw new ForbiddenException('Solo puedes modificar tus propias publicaciones.');
    }
    return p;
  }

  private exigirDisponible(estado: EstadoPublicacion, accion: string) {
    if (estado !== 'DISPONIBLE') {
      throw new ConflictException(`La publicación debe estar disponible para ${accion}.`);
    }
  }

  private async validarCategoria(categoriaId: number) {
    const c = await this.prisma.categoria.findFirst({ where: { id: categoriaId, activa: true } });
    if (!c) throw new BadRequestException('La categoría elegida no existe.');
  }
}
