import { z } from 'zod';
import { LIMITES } from './constantes.js';
import { MotivoReporte } from './enums.js';

/** Módulo 6: confianza y reputación (RF-22 a RF-24). */

/** RF-22: calificación de 1 a 5 estrellas con comentario opcional. */
export const calificacionSchema = z.object({
  puntuacion: z
    .number({ error: 'Elige de 1 a 5 estrellas' })
    .int()
    .min(LIMITES.CALIFICACION_MIN, 'Elige de 1 a 5 estrellas')
    .max(LIMITES.CALIFICACION_MAX, 'Elige de 1 a 5 estrellas'),
  comentario: z
    .string()
    .trim()
    .max(300, 'El comentario puede tener máximo 300 caracteres')
    .optional()
    .transform((c) => c || undefined),
});
export type CalificacionDto = z.input<typeof calificacionSchema>;

export const ESTRELLAS_NOMBRE: Record<number, string> = {
  1: 'Muy mala',
  2: 'Mala',
  3: 'Regular',
  4: 'Buena',
  5: 'Excelente',
};

export type CalificacionPublica = {
  id: string;
  puntuacion: number;
  comentario: string | null;
  fecha: string;
  /** Nombre de quien calificó (solo el primer nombre). */
  autor: string;
};

/** RF-24: reportar una publicación o a una persona. */
export const MOTIVO_REPORTE_NOMBRE: Record<MotivoReporte, string> = {
  PROHIBIDO: 'Es un artículo prohibido',
  FRAUDE: 'Parece una estafa',
  OFENSIVO: 'Contenido ofensivo',
  SPAM: 'Publicidad o spam',
  ACOSO: 'Acoso o mal trato',
  OTRO: 'Otro motivo',
};

export const reporteSchema = z
  .object({
    publicacionId: z.uuid().optional(),
    usuarioId: z.uuid().optional(),
    motivo: z.enum(MotivoReporte, 'Elige un motivo'),
    detalle: z
      .string()
      .trim()
      .max(500, 'El detalle puede tener máximo 500 caracteres')
      .optional()
      .transform((d) => d || undefined),
  })
  .refine((d) => (d.publicacionId === undefined) !== (d.usuarioId === undefined), {
    message: 'Indica qué publicación o qué persona reportas',
    path: ['publicacionId'],
  })
  .refine((d) => d.motivo !== 'OTRO' || (d.detalle?.length ?? 0) >= 10, {
    message: 'Cuéntanos qué pasó (mínimo 10 caracteres)',
    path: ['detalle'],
  });
export type ReporteDto = z.input<typeof reporteSchema>;

/** Reportes pendientes de personas distintas para ocultar una publicación mientras se revisa (D29). */
export const REPORTES_PARA_OCULTAR = 3;
