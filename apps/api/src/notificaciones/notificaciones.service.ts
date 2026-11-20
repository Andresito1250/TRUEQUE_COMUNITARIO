import { Injectable, NotFoundException } from '@nestjs/common';
import type { Notificacion, TipoNotificacion } from '@trueque/shared';
import type { Notificacion as NotificacionBd, Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type NuevaNotificacion = {
  usuarioId: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  ruta?: string;
};

/** Quien quiera enterarse de las notificaciones nuevas (el chat en tiempo real, Sprint 5). */
export type OyenteNotificaciones = (usuarioId: string, n: Notificacion) => void;

const recortar = (t: string, max: number) => (t.length > max ? `${t.slice(0, max - 1)}…` : t);

/**
 * RF-21: bandeja interna de notificaciones (D2). Se crean dentro de la misma transacción que la
 * acción que las origina y se avisan en tiempo real después de confirmarla.
 */
@Injectable()
export class NotificacionesService {
  private readonly oyentes = new Set<OyenteNotificaciones>();

  constructor(private readonly prisma: PrismaService) {}

  escuchar(oyente: OyenteNotificaciones): () => void {
    this.oyentes.add(oyente);
    return () => this.oyentes.delete(oyente);
  }

  /** Guarda las notificaciones (en la transacción recibida) y devuelve las creadas. */
  async crear(
    lista: NuevaNotificacion[],
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<NotificacionBd[]> {
    const creadas: NotificacionBd[] = [];
    for (const n of lista) {
      creadas.push(
        await tx.notificacion.create({
          data: {
            usuarioId: n.usuarioId,
            tipo: n.tipo,
            titulo: recortar(n.titulo, 120),
            mensaje: recortar(n.mensaje, 300),
            datos: n.ruta ? { ruta: n.ruta } : undefined,
          },
        }),
      );
    }
    return creadas;
  }

  /** Avisa en tiempo real. Se llama después de confirmar la transacción. */
  emitir(creadas: NotificacionBd[]): void {
    for (const n of creadas) {
      const dto = this.dto(n);
      for (const oyente of this.oyentes) oyente(n.usuarioId, dto);
    }
  }

  /** Atajo para notificaciones sueltas (fuera de una transacción). */
  async enviar(lista: NuevaNotificacion[]): Promise<void> {
    this.emitir(await this.crear(lista));
  }

  async listar(usuarioId: string): Promise<Notificacion[]> {
    const lista = await this.prisma.notificacion.findMany({
      where: { usuarioId },
      orderBy: { fechaHora: 'desc' },
      take: 100,
    });
    return lista.map((n) => this.dto(n));
  }

  contarSinLeer(usuarioId: string): Promise<number> {
    return this.prisma.notificacion.count({ where: { usuarioId, leida: false } });
  }

  async marcarLeida(usuarioId: string, id: string): Promise<void> {
    const r = await this.prisma.notificacion.updateMany({
      where: { id, usuarioId },
      data: { leida: true },
    });
    if (r.count === 0) throw new NotFoundException('Notificación no encontrada.');
  }

  async leerTodas(usuarioId: string): Promise<void> {
    await this.prisma.notificacion.updateMany({
      where: { usuarioId, leida: false },
      data: { leida: true },
    });
  }

  private dto(n: NotificacionBd): Notificacion {
    const datos = n.datos as { ruta?: string } | null;
    return {
      id: n.id,
      tipo: n.tipo,
      titulo: n.titulo,
      mensaje: n.mensaje,
      ruta: datos?.ruta ?? null,
      leida: n.leida,
      fechaHora: n.fechaHora.toISOString(),
    };
  }
}
