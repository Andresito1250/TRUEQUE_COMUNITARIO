import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ESTADOS_EN_CURSO,
  ESTADOS_PENDIENTES,
  type MensajeChat,
  type PaginaMensajes,
  puede,
  type ResumenActividad,
} from '@trueque/shared';
import type { Mensaje } from '../generated/prisma/client.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const POR_PAGINA = 50;

/**
 * RF-20: mensajería interna entre las dos partes de una propuesta. Solo se escribe mientras el
 * trueque está abierto; después el chat queda para leer. El teléfono nunca se comparte.
 */
@Injectable()
export class MensajesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  /** Devuelve la propuesta si el usuario es una de las dos partes; si no, 404. */
  async partes(propuestaId: string, usuarioId: string) {
    const p = await this.prisma.propuestaTrueque.findUnique({
      where: { id: propuestaId },
      select: { id: true, estado: true, proponenteId: true, receptorId: true },
    });
    if (!p || (p.proponenteId !== usuarioId && p.receptorId !== usuarioId)) {
      throw new NotFoundException('No encontramos esta conversación.');
    }
    const rol = p.proponenteId === usuarioId ? ('proponente' as const) : ('receptor' as const);
    const otroId = rol === 'proponente' ? p.receptorId : p.proponenteId;
    return { ...p, rol, otroId, abierto: puede('chatear', p.estado, rol) };
  }

  async historial(propuestaId: string, usuarioId: string, antes?: string): Promise<PaginaMensajes> {
    const p = await this.partes(propuestaId, usuarioId);
    const lista = await this.prisma.mensaje.findMany({
      where: { propuestaId, ...(antes ? { fechaHora: { lt: new Date(antes) } } : {}) },
      orderBy: { fechaHora: 'desc' },
      take: POR_PAGINA + 1,
    });
    const hayMas = lista.length > POR_PAGINA;
    const mensajes = lista.slice(0, POR_PAGINA).map(dto);
    return {
      mensajes,
      anteriores: hayMas ? (mensajes.at(-1)?.fechaHora ?? null) : null,
      abierto: p.abierto,
    };
  }

  async enviar(
    propuestaId: string,
    usuarioId: string,
    contenido: string,
  ): Promise<{ mensaje: MensajeChat; destinatarioId: string }> {
    const p = await this.partes(propuestaId, usuarioId);
    if (!p.abierto) {
      throw new ConflictException('Este trueque ya terminó: el chat quedó solo para leer.');
    }
    const m = await this.prisma.mensaje.create({
      data: { propuestaId, emisorId: usuarioId, contenido },
      include: { emisor: { select: { nombre: true } } },
    });
    // Para no llenar la bandeja, se avisa solo si no hay ya un aviso sin leer de este chat.
    const ruta = `/chat/${propuestaId}`;
    const pendiente = await this.prisma.notificacion.findFirst({
      where: {
        usuarioId: p.otroId,
        tipo: 'MENSAJE_NUEVO',
        leida: false,
        datos: { equals: { ruta } },
      },
      select: { id: true },
    });
    if (!pendiente) {
      await this.notificaciones.enviar([
        {
          usuarioId: p.otroId,
          tipo: 'MENSAJE_NUEVO',
          titulo: `Mensaje de ${m.emisor.nombre.split(' ')[0]}`,
          mensaje: contenido,
          ruta,
        },
      ]);
    }
    return { mensaje: dto(m), destinatarioId: p.otroId };
  }

  /** Marca como leídos los mensajes que la otra persona envió. Devuelve a quién avisar. */
  async marcarLeidos(propuestaId: string, usuarioId: string): Promise<string | null> {
    const p = await this.partes(propuestaId, usuarioId);
    const r = await this.prisma.mensaje.updateMany({
      where: { propuestaId, emisorId: p.otroId, estado: 'ENVIADO' },
      data: { estado: 'LEIDO' },
    });
    await this.prisma.notificacion.updateMany({
      where: {
        usuarioId,
        tipo: 'MENSAJE_NUEVO',
        leida: false,
        datos: { equals: { ruta: `/chat/${propuestaId}` } },
      },
      data: { leida: true },
    });
    return r.count > 0 ? p.otroId : null;
  }

  /** Contadores para las insignias de la app. */
  async actividad(usuarioId: string): Promise<ResumenActividad> {
    const [recibidas, enCurso, notificacionesSinLeer, mensajesSinLeer] = await Promise.all([
      this.prisma.propuestaTrueque.count({
        where: { receptorId: usuarioId, estado: { in: [...ESTADOS_PENDIENTES] } },
      }),
      this.prisma.propuestaTrueque.count({
        where: {
          estado: { in: [...ESTADOS_EN_CURSO] },
          OR: [{ proponenteId: usuarioId }, { receptorId: usuarioId }],
        },
      }),
      this.notificaciones.contarSinLeer(usuarioId),
      this.prisma.mensaje.count({
        where: {
          estado: 'ENVIADO',
          emisorId: { not: usuarioId },
          propuesta: { OR: [{ proponenteId: usuarioId }, { receptorId: usuarioId }] },
        },
      }),
    ]);
    return { recibidas, enCurso, notificacionesSinLeer, mensajesSinLeer };
  }
}

function dto(m: Mensaje): MensajeChat {
  return {
    id: m.id,
    propuestaId: m.propuestaId,
    emisorId: m.emisorId,
    contenido: m.contenido,
    estado: m.estado,
    fechaHora: m.fechaHora.toISOString(),
  };
}
