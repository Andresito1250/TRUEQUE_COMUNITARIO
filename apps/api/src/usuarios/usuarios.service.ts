import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';
import {
  type ActualizarPerfilDto,
  type CalificacionPublica,
  ESTADOS_EN_CURSO,
  ESTADOS_PENDIENTES,
  type PerfilPrivado,
  type PerfilPublico,
} from '@trueque/shared';
import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service.js';
import { type ArchivoSubido, ImagenesService } from '../almacenamiento/imagenes.service.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { tokenAleatorio } from '../comun/cripto.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Estados en los que un trueque cuenta como realizado para la reputación (RF-23). */
const ESTADOS_REALIZADO = [
  'INTERCAMBIO_CONFIRMADO',
  'CALIFICACION_HABILITADA',
  'FINALIZADO',
] as const;

const SELECT_PERFIL = {
  id: true,
  nombre: true,
  correo: true,
  localidad: true,
  fotoUrl: true,
  descripcion: true,
  telefonoContacto: true,
  rol: true,
  estado: true,
  correoVerificado: true,
  totpActivo: true,
  creadoEn: true,
  categoriasInteres: { select: { categoria: { select: { id: true, nombre: true, icono: true } } } },
} as const;

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
    private readonly almacenamiento: AlmacenamientoService,
    private readonly imagenes: ImagenesService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  /** Perfil completo del propio usuario (RF-05). */
  async perfilPrivado(id: string): Promise<PerfilPrivado> {
    const u = await this.prisma.usuario.findUnique({ where: { id }, select: SELECT_PERFIL });
    if (!u || u.estado === 'ELIMINADO') throw new NotFoundException('No encontramos tu cuenta.');
    return {
      ...(await this.armarPublico(u)),
      correo: u.correo,
      telefonoContacto: u.telefonoContacto,
      rol: u.rol,
      totpActivo: u.totpActivo,
      categoriasInteres: u.categoriasInteres.map((c) => c.categoria),
    };
  }

  /** Perfil visible para otros usuarios: sin correo ni teléfono (RF-13, RF-20, RF-23). */
  async perfilPublico(id: string): Promise<PerfilPublico> {
    const u = await this.prisma.usuario.findUnique({ where: { id }, select: SELECT_PERFIL });
    if (!u || u.estado !== 'ACTIVO')
      throw new NotFoundException('Este usuario no está disponible.');
    return this.armarPublico(u);
  }

  /** RF-23: últimas calificaciones recibidas, con el primer nombre de quien calificó. */
  async calificaciones(id: string): Promise<CalificacionPublica[]> {
    await this.perfilPublico(id);
    const lista = await this.prisma.calificacion.findMany({
      where: { calificadoId: id },
      orderBy: { fecha: 'desc' },
      take: 50,
      include: { calificador: { select: { nombre: true } } },
    });
    return lista.map((c) => ({
      id: c.id,
      puntuacion: c.puntuacion,
      comentario: c.comentario,
      fecha: c.fecha.toISOString(),
      autor: c.calificador.nombre.split(' ')[0] ?? 'Alguien',
    }));
  }

  async actualizar(id: string, dto: ActualizarPerfilDto): Promise<PerfilPrivado> {
    const { categoriasInteres, ...datos } = dto;
    await this.prisma.$transaction(async (tx) => {
      await tx.usuario.update({ where: { id }, data: datos });
      if (categoriasInteres) {
        const unicas = [...new Set(categoriasInteres)];
        const validas = await tx.categoria.count({ where: { id: { in: unicas }, activa: true } });
        if (validas !== unicas.length) {
          throw new BadRequestException('Alguna de las categorías elegidas no existe.');
        }
        await tx.usuarioCategoriaInteres.deleteMany({ where: { usuarioId: id } });
        await tx.usuarioCategoriaInteres.createMany({
          data: unicas.map((categoriaId) => ({ usuarioId: id, categoriaId })),
        });
      }
    });
    return this.perfilPrivado(id);
  }

  /**
   * Eliminación de cuenta (RNF11, Ley 1581 de 2012): borra o anonimiza los datos personales,
   * cierra todas las sesiones y retira las publicaciones. Los intercambios y calificaciones
   * se conservan anonimizados para las estadísticas de la investigación (decisión D10).
   */
  async eliminarCuenta(id: string, contrasena: string): Promise<void> {
    const u = await this.prisma.usuario.findUnique({ where: { id } });
    if (!u || u.estado === 'ELIMINADO') throw new NotFoundException('No encontramos tu cuenta.');
    if (!(await verify(u.contrasenaHash, contrasena))) {
      throw new UnauthorizedException('La contraseña no es correcta.');
    }

    const fotoAnterior = u.fotoUrl;
    const avisos = await this.prisma.$transaction(async (tx) => {
      // Los trueques abiertos se cancelan y se liberan los artículos de la otra persona.
      const abiertas = await tx.propuestaTrueque.findMany({
        where: {
          estado: { in: [...ESTADOS_PENDIENTES, ...ESTADOS_EN_CURSO] },
          OR: [{ proponenteId: id }, { receptorId: id }],
        },
        select: {
          id: true,
          estado: true,
          proponenteId: true,
          receptorId: true,
          articulos: { select: { publicacionId: true } },
        },
      });
      await tx.propuestaTrueque.updateMany({
        where: { id: { in: abiertas.map((a) => a.id) } },
        data: { estado: 'CANCELADA', motivoCierre: 'La otra persona eliminó su cuenta.' },
      });
      await tx.publicacion.updateMany({
        where: {
          id: {
            in: abiertas
              .filter((a) => ESTADOS_EN_CURSO.includes(a.estado))
              .flatMap((a) => a.articulos.map((x) => x.publicacionId)),
          },
          estado: 'RESERVADA',
        },
        data: { estado: 'DISPONIBLE' },
      });

      await tx.usuario.update({
        where: { id },
        data: {
          nombre: 'Usuario eliminado',
          correo: `eliminado-${id}@trueque.invalid`,
          contrasenaHash: await hash(tokenAleatorio()),
          fotoUrl: null,
          descripcion: null,
          telefonoContacto: null,
          totpSecret: null,
          totpActivo: false,
          estado: 'ELIMINADO',
          eliminadoEn: new Date(),
        },
      });
      await tx.$executeRaw`UPDATE "Usuario" SET ubicacion = NULL WHERE id = ${id}::uuid`;
      await tx.refreshToken.deleteMany({ where: { usuarioId: id } });
      await tx.codigoVerificacion.deleteMany({ where: { usuarioId: id } });
      await tx.usuarioCategoriaInteres.deleteMany({ where: { usuarioId: id } });
      await tx.dispositivoPush.deleteMany({ where: { usuarioId: id } });
      await tx.notificacion.deleteMany({ where: { usuarioId: id } });
      await tx.publicacion.updateMany({
        where: { usuarioId: id, estado: { in: ['DISPONIBLE', 'OCULTA'] } },
        data: { estado: 'ELIMINADA' },
      });
      await this.auditoria.registrar(
        { accion: 'CUENTA_ELIMINADA', actorId: id, entidad: 'Usuario', entidadId: id },
        tx,
      );
      return this.notificaciones.crear(
        abiertas.map((a) => ({
          usuarioId: a.proponenteId === id ? a.receptorId : a.proponenteId,
          tipo: 'TRUEQUE_CANCELADO' as const,
          titulo: 'Un trueque fue cancelado',
          mensaje:
            'La otra persona eliminó su cuenta. Tus publicaciones vuelven a estar disponibles.',
          ruta: `/propuesta/${a.id}`,
        })),
        tx,
      );
    });
    this.notificaciones.emitir(avisos);
    await this.almacenamiento.eliminar([fotoAnterior]);
  }

  /** RF-05: cambia la foto de perfil (se recorta cuadrada de 512 px). */
  async cambiarFoto(id: string, archivo: ArchivoSubido | undefined): Promise<PerfilPrivado> {
    if (!archivo) throw new BadRequestException('Selecciona una foto.');
    const anterior = await this.prisma.usuario.findUniqueOrThrow({
      where: { id },
      select: { fotoUrl: true },
    });
    const clave = await this.imagenes.guardarFotoPerfil(id, archivo);
    await this.prisma.usuario.update({ where: { id }, data: { fotoUrl: clave } });
    await this.almacenamiento.eliminar([anterior.fotoUrl]);
    return this.perfilPrivado(id);
  }

  async quitarFoto(id: string): Promise<PerfilPrivado> {
    const anterior = await this.prisma.usuario.findUniqueOrThrow({
      where: { id },
      select: { fotoUrl: true },
    });
    await this.prisma.usuario.update({ where: { id }, data: { fotoUrl: null } });
    await this.almacenamiento.eliminar([anterior.fotoUrl]);
    return this.perfilPrivado(id);
  }

  private async armarPublico(u: {
    id: string;
    nombre: string;
    localidad: PerfilPublico['localidad'];
    fotoUrl: string | null;
    descripcion: string | null;
    correoVerificado: boolean;
    creadoEn: Date;
  }): Promise<PerfilPublico> {
    const [calif, intercambios] = await Promise.all([
      this.prisma.calificacion.aggregate({
        where: { calificadoId: u.id },
        _avg: { puntuacion: true },
        _count: true,
      }),
      this.prisma.propuestaTrueque.count({
        where: {
          estado: { in: [...ESTADOS_REALIZADO] },
          OR: [{ proponenteId: u.id }, { receptorId: u.id }],
        },
      }),
    ]);
    const promedio = calif._avg.puntuacion;
    return {
      id: u.id,
      nombre: u.nombre,
      localidad: u.localidad,
      // En la base de datos se guarda la clave del archivo; aquí se convierte en URL.
      fotoUrl: this.almacenamiento.url(u.fotoUrl),
      descripcion: u.descripcion,
      verificado: u.correoVerificado,
      miembroDesde: u.creadoEn.toISOString(),
      reputacion: {
        promedio: promedio === null ? null : Math.round(promedio * 10) / 10,
        calificaciones: calif._count,
        intercambios,
      },
    };
  }
}
