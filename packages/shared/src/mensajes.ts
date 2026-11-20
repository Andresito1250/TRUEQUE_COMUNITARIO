import { z } from 'zod';
import type { Notificacion } from './notificaciones.js';

/** Módulo 5: mensajería interna (RF-20) y avisos en tiempo real (RF-21, D2). */

export const enviarMensajeSchema = z.object({
  contenido: z
    .string({ error: 'Escribe un mensaje' })
    .trim()
    .min(1, 'Escribe un mensaje')
    .max(1000, 'El mensaje puede tener máximo 1000 caracteres'),
});
export type EnviarMensajeDto = z.input<typeof enviarMensajeSchema>;

export const historialMensajesSchema = z.object({
  /** Cursor: trae los mensajes anteriores a esta fecha (ISO). */
  antes: z.preprocess((v) => v || undefined, z.iso.datetime().optional()),
});

export type MensajeChat = {
  id: string;
  propuestaId: string;
  emisorId: string;
  contenido: string;
  estado: 'ENVIADO' | 'LEIDO';
  fechaHora: string;
};

export type PaginaMensajes = {
  /** Del más reciente al más antiguo. */
  mensajes: MensajeChat[];
  /** Cursor para pedir los anteriores; null si no hay más. */
  anteriores: string | null;
  /** false si el trueque ya terminó: el chat queda solo para leer. */
  abierto: boolean;
};

/** Eventos del socket `/tiempo-real` (un solo socket para chat y notificaciones). */
export const EVENTOS = {
  /** Cliente → servidor: entrar o salir de la sala de una propuesta. */
  UNIRSE: 'chat:unirse',
  SALIR: 'chat:salir',
  /** Cliente → servidor (con respuesta): enviar un mensaje. */
  ENVIAR: 'mensaje:enviar',
  /** Servidor → cliente: mensaje nuevo en una propuesta. */
  NUEVO: 'mensaje:nuevo',
  /** Ambos sentidos: la otra persona leyó los mensajes. */
  LEIDO: 'mensaje:leido',
  /** Ambos sentidos: la otra persona está escribiendo. */
  ESCRIBIENDO: 'chat:escribiendo',
  /** Servidor → cliente: notificación nueva en la bandeja. */
  NOTIFICACION: 'notificacion:nueva',
} as const;

export type EventosServidor = {
  [EVENTOS.NUEVO]: (m: MensajeChat) => void;
  [EVENTOS.LEIDO]: (d: { propuestaId: string; lectorId: string }) => void;
  [EVENTOS.ESCRIBIENDO]: (d: { propuestaId: string; usuarioId: string }) => void;
  [EVENTOS.NOTIFICACION]: (n: Notificacion) => void;
};

export type RespuestaSocket<T> = { ok: true; datos: T } | { ok: false; error: string };
