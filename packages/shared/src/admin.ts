import { z } from 'zod';
import type { Rol } from './enums.js';
import { EstadoReporte, type EstadoUsuario, type Localidad, type MotivoReporte } from './enums.js';

/** Módulo 7: administración (RF-25 a RF-28, RNF10). Solo para el rol ADMIN. */

export const DecisionReporte = {
  /** No infringe: se descarta el reporte y, si estaba oculta, la publicación vuelve. */
  APROBAR: 'APROBAR',
  OCULTAR: 'OCULTAR',
  ELIMINAR: 'ELIMINAR',
  SUSPENDER_USUARIO: 'SUSPENDER_USUARIO',
} as const;
export type DecisionReporte = (typeof DecisionReporte)[keyof typeof DecisionReporte];

export const DECISION_NOMBRE: Record<DecisionReporte, string> = {
  APROBAR: 'No infringe: descartar',
  OCULTAR: 'Ocultar la publicación',
  ELIMINAR: 'Eliminar la publicación',
  SUSPENDER_USUARIO: 'Suspender a la persona',
};

export const filtroReportesSchema = z.object({
  estado: z.enum(EstadoReporte).default('PENDIENTE'),
});

export const resolverReporteSchema = z.object({
  decision: z.enum(DecisionReporte, 'Elige una decisión'),
  nota: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((n) => n || undefined),
});
export type ResolverReporteDto = z.input<typeof resolverReporteSchema>;

export const filtroUsuariosSchema = z.object({
  q: z.preprocess((v) => v || undefined, z.string().trim().max(80).optional()),
  estado: z.preprocess((v) => v || undefined, z.enum(['ACTIVO', 'SUSPENDIDO']).optional()),
});

export const cambiarEstadoUsuarioSchema = z.object({
  estado: z.enum(['ACTIVO', 'SUSPENDIDO'], 'Estado no válido'),
  motivo: z.string().trim().min(5, 'Escribe el motivo (mínimo 5 caracteres)').max(300),
});
export type CambiarEstadoUsuarioDto = z.input<typeof cambiarEstadoUsuarioSchema>;

const nombreCategoria = z
  .string()
  .trim()
  .min(3, 'El nombre debe tener al menos 3 caracteres')
  .max(60, 'El nombre puede tener máximo 60 caracteres');
const iconoCategoria = z
  .string()
  .trim()
  .regex(/^[a-z0-9-]{2,40}$/, 'Usa un nombre de icono de Ionicons, p. ej. "bicycle-outline"');

export const crearCategoriaSchema = z.object({ nombre: nombreCategoria, icono: iconoCategoria });
export type CrearCategoriaDto = z.input<typeof crearCategoriaSchema>;

export const actualizarCategoriaSchema = z
  .object({ nombre: nombreCategoria, icono: iconoCategoria, activa: z.boolean() })
  .partial();
export type ActualizarCategoriaDto = z.input<typeof actualizarCategoriaSchema>;

export const paginaSchema = z.object({
  pagina: z.preprocess((v) => v || undefined, z.coerce.number().int().min(1).default(1)),
});

// ───────────── Respuestas ─────────────

export type ReporteAdmin = {
  id: string;
  motivo: MotivoReporte;
  detalle: string | null;
  estado: EstadoReporte;
  decision: DecisionReporte | null;
  creadoEn: string;
  reportante: string;
  publicacion: { id: string; titulo: string; estado: string; miniaturaUrl: string | null } | null;
  usuario: { id: string; nombre: string; estado: EstadoUsuario } | null;
  /** Reportes pendientes sobre el mismo objetivo. */
  similares: number;
};

export type UsuarioAdmin = {
  id: string;
  nombre: string;
  correo: string;
  localidad: Localidad;
  rol: Rol;
  estado: EstadoUsuario;
  creadoEn: string;
  publicaciones: number;
  reportesRecibidos: number;
};

export type CategoriaAdmin = {
  id: number;
  nombre: string;
  icono: string | null;
  activa: boolean;
  publicaciones: number;
};

export type RegistroAuditoriaDto = {
  id: string;
  accion: string;
  entidad: string;
  entidadId: string;
  actor: string | null;
  detalle: unknown;
  fecha: string;
};

/** RF-27: indicadores para evaluar el piloto. */
export type Indicadores = {
  generadoEn: string;
  usuarios: {
    total: number;
    activos: number;
    suspendidos: number;
    porLocalidad: Record<Localidad, number>;
  };
  publicaciones: {
    total: number;
    disponibles: number;
    intercambiadas: number;
    ocultas: number;
    porCategoria: { nombre: string; total: number }[];
  };
  trueques: {
    propuestas: number;
    aceptadas: number;
    realizados: number;
    cancelados: number;
    /** Realizados sobre propuestas cerradas o realizadas (0 a 1). */
    tasaExito: number | null;
    porSemana: { semana: string; realizados: number }[];
  };
  reputacion: { promedio: number | null; calificaciones: number };
  reportes: { pendientes: number; resueltos: number };
};
