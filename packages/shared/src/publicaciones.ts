import { z } from 'zod';
import { EstadoConservacion, EstadoPublicacion, type Localidad, TipoPublicacion } from './enums.js';
import type { Categoria, PerfilPublico } from './auth.js';

/** Módulo 2: publicación de bienes y servicios (RF-06 a RF-09). */

export const TIPO_NOMBRE: Record<TipoPublicacion, string> = {
  BIEN: 'Objeto',
  SERVICIO: 'Servicio',
};

export const ESTADO_CONSERVACION_NOMBRE: Record<EstadoConservacion, string> = {
  NUEVO: 'Nuevo',
  COMO_NUEVO: 'Como nuevo',
  BUENO: 'Buen estado',
  ACEPTABLE: 'Con detalles',
  NO_APLICA: 'No aplica',
};

export const ESTADO_PUBLICACION_NOMBRE: Record<EstadoPublicacion, string> = {
  DISPONIBLE: 'Disponible',
  RESERVADA: 'Reservada',
  INTERCAMBIADA: 'Intercambiada',
  OCULTA: 'Oculta por moderación',
  ELIMINADA: 'Eliminada',
};

/** Coordenadas opcionales: si el usuario no comparte su ubicación se usa el centro de su localidad. */
export const coordenadasSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type Coordenadas = z.infer<typeof coordenadasSchema>;

const camposPublicacion = {
  titulo: z
    .string({ error: 'Escribe un título' })
    .trim()
    .min(3, 'El título debe tener al menos 3 caracteres')
    .max(80, 'El título puede tener máximo 80 caracteres'),
  descripcion: z
    .string({ error: 'Escribe una descripción' })
    .trim()
    .min(10, 'Cuéntale a la comunidad un poco más (mínimo 10 caracteres)')
    .max(1000, 'La descripción puede tener máximo 1000 caracteres'),
  tipo: z.enum(TipoPublicacion, 'Elige si es un objeto o un servicio'),
  categoriaId: z.number({ error: 'Elige una categoría' }).int().positive('Elige una categoría'),
  estadoConservacion: z.enum(EstadoConservacion, 'Elige el estado del objeto'),
};

/** Los servicios no tienen estado de conservación: se guarda NO_APLICA. */
function normalizarConservacion<
  T extends { tipo?: TipoPublicacion; estadoConservacion?: EstadoConservacion },
>(d: T): T {
  return d.tipo === 'SERVICIO' ? { ...d, estadoConservacion: 'NO_APLICA' } : d;
}

export const crearPublicacionSchema = z
  .object({ ...camposPublicacion, ubicacion: coordenadasSchema.optional() })
  .refine((d) => d.tipo === 'SERVICIO' || d.estadoConservacion !== 'NO_APLICA', {
    message: 'Elige el estado del objeto',
    path: ['estadoConservacion'],
  })
  .transform(normalizarConservacion);
export type CrearPublicacionDto = z.input<typeof crearPublicacionSchema>;

export const actualizarPublicacionSchema = z
  .object(camposPublicacion)
  .partial()
  .transform(normalizarConservacion);
export type ActualizarPublicacionDto = z.input<typeof actualizarPublicacionSchema>;

/** RF-08: estados que el dueño puede asignar manualmente. */
export const cambiarEstadoPublicacionSchema = z.object({
  estado: z.enum(['DISPONIBLE', 'RESERVADA', 'INTERCAMBIADA'], 'Estado no válido'),
});
export type CambiarEstadoPublicacionDto = z.infer<typeof cambiarEstadoPublicacionSchema>;

export const filtroMisPublicacionesSchema = z.object({
  historico: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

// ───────────── Respuestas ─────────────

export type ImagenPublicacion = { id: string; url: string; miniaturaUrl: string; orden: number };

export type PublicacionResumen = {
  id: string;
  titulo: string;
  tipo: TipoPublicacion;
  estado: EstadoPublicacion;
  estadoConservacion: EstadoConservacion;
  localidad: Localidad;
  categoria: Categoria;
  miniaturaUrl: string | null;
  fechaPublicacion: string;
};

export type PublicacionDetalle = PublicacionResumen & {
  descripcion: string;
  imagenes: ImagenPublicacion[];
  oferente: PerfilPublico;
  /** true si la publicación es del usuario que consulta. */
  esMia: boolean;
};
