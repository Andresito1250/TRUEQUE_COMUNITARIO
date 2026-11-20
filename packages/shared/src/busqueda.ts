import { z } from 'zod';
import { LIMITES } from './constantes.js';
import { EstadoConservacion, Localidad, TipoPublicacion } from './enums.js';
import { dentroDeBogota } from './geo.js';
import type { Coordenadas, PublicacionResumen } from './publicaciones.js';

/** Módulo 3: búsqueda, filtros y publicaciones cercanas (RF-10 a RF-13). */

export const OrdenBusqueda = {
  RELEVANCIA: 'relevancia',
  CERCANIA: 'cercania',
  RECIENTES: 'recientes',
} as const;
export type OrdenBusqueda = (typeof OrdenBusqueda)[keyof typeof OrdenBusqueda];

export const ORDEN_NOMBRE: Record<OrdenBusqueda, string> = {
  relevancia: 'Más relevantes',
  cercania: 'Más cercanas',
  recientes: 'Más recientes',
};

/** Radios que ofrece la app (RF-12: configurable entre 1 y 10 km). */
export const RADIOS_KM = [1, 3, 5, 10] as const;

/** Los parámetros llegan como texto en la URL: los vacíos se tratan como ausentes. */
const opcional = <T extends z.ZodType>(s: T) =>
  z.preprocess((v) => (v === '' || v === null ? undefined : v), s.optional());

/** Origen de la búsqueda: si el celular no comparte ubicación, se usa el centro de la localidad. */
const origenSchema = {
  lat: opcional(z.coerce.number().min(-90).max(90)),
  lng: opcional(z.coerce.number().min(-180).max(180)),
};

const conOrigenCompleto = (d: { lat?: number; lng?: number }) =>
  (d.lat === undefined) === (d.lng === undefined);

export const busquedaSchema = z
  .object({
    /** RF-10: palabra clave; se busca en título y descripción, sin importar tildes. */
    q: opcional(z.string().trim().max(60, 'La búsqueda puede tener máximo 60 caracteres')),
    /** RF-11: filtros. */
    categoriaId: opcional(z.coerce.number().int().positive()),
    tipo: opcional(z.enum(TipoPublicacion)),
    estadoConservacion: opcional(z.enum(EstadoConservacion)),
    localidad: opcional(z.enum(Localidad)),
    /** RF-12: sin radio se busca en toda la ciudad, ordenado por cercanía. */
    radioKm: opcional(
      z.coerce
        .number()
        .int()
        .min(LIMITES.RADIO_MIN_KM, `El radio mínimo es ${LIMITES.RADIO_MIN_KM} km`)
        .max(LIMITES.RADIO_MAX_KM, `El radio máximo es ${LIMITES.RADIO_MAX_KM} km`),
    ),
    ...origenSchema,
    orden: opcional(z.enum(OrdenBusqueda)),
    pagina: opcional(z.coerce.number().int().min(1).max(500)),
  })
  .refine(conOrigenCompleto, { message: 'Envía latitud y longitud juntas', path: ['lat'] });
export type BusquedaDto = z.input<typeof busquedaSchema>;
export type Busqueda = z.output<typeof busquedaSchema>;

/** RF-13: el detalle acepta el origen para calcular la distancia. */
export const origenDetalleSchema = z
  .object(origenSchema)
  .refine(conOrigenCompleto, { message: 'Envía latitud y longitud juntas', path: ['lat'] });

/** Filtros que el usuario puede cambiar en la app (sin el origen ni la paginación). */
export type FiltrosBusqueda = Pick<
  Busqueda,
  'q' | 'categoriaId' | 'tipo' | 'estadoConservacion' | 'localidad' | 'radioKm' | 'orden'
>;

/** Cuántos filtros de RF-11/RF-12 están activos (para mostrar "Filtros (2)"). */
export function contarFiltros(f: FiltrosBusqueda): number {
  return [f.categoriaId, f.tipo, f.estadoConservacion, f.localidad, f.radioKm].filter(
    (v) => v !== undefined,
  ).length;
}

/**
 * Convierte el texto del usuario en una consulta de PostgreSQL (`to_tsquery`): cada palabra
 * se busca como prefijo ("bici" encuentra "bicicleta") y todas deben aparecer.
 * Devuelve null si no queda ninguna palabra útil.
 */
export function textoATsquery(texto: string | undefined): string | null {
  if (!texto) return null;
  const palabras = texto
    .toLowerCase()
    .normalize('NFC')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((p) => p.length >= 2)
    .slice(0, 6);
  return palabras.length ? palabras.map((p) => `${p}:*`).join(' & ') : null;
}

/** Valida un origen enviado por el celular: fuera de Bogotá se ignora. */
export function origenValido(lat?: number, lng?: number): Coordenadas | null {
  if (lat === undefined || lng === undefined) return null;
  return dentroDeBogota(lat, lng) ? { lat, lng } : null;
}

/**
 * Redondea la distancia a 100 m. Como las ubicaciones se desplazan hasta 300 m (D9),
 * más precisión sería falsa.
 */
export function redondearDistancia(metros: number): number {
  return Math.max(100, Math.round(metros / 100) * 100);
}

/** "a menos de 500 m", "a 800 m", "a 1,2 km", "a 12 km". */
export function formatearDistancia(metros: number): string {
  if (metros < 500) return 'a menos de 500 m';
  if (metros < 1000) return `a ${Math.round(metros / 100) * 100} m`;
  const km = metros / 1000;
  const texto =
    km < 10 ? km.toFixed(1).replace('.', ',').replace(',0', '') : String(Math.round(km));
  return `a ${texto} km`;
}

// ───────────── Respuestas ─────────────

export type PublicacionCercana = PublicacionResumen & {
  /** Distancia redondeada a 100 m desde el origen de la búsqueda. */
  distanciaM: number;
  /** Punto ya desplazado (D9) y redondeado, solo para dibujar el mapa. */
  ubicacionAproximada: Coordenadas;
};

export type ResultadoBusqueda = {
  items: PublicacionCercana[];
  siguientePagina: number | null;
  /** Desde dónde se midieron las distancias. */
  origen: Coordenadas & { fuente: 'dispositivo' | 'localidad' };
};
