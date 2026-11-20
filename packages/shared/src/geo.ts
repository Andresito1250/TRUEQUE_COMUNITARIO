import type { Localidad } from './enums.js';

/** Centro aproximado de cada localidad piloto. Se usa cuando el usuario no comparte su ubicación. */
export const CENTRO_LOCALIDAD: Record<Localidad, { lat: number; lng: number }> = {
  SUBA: { lat: 4.741, lng: -74.0838 },
  KENNEDY: { lat: 4.6297, lng: -74.151 },
  TEUSAQUILLO: { lat: 4.645, lng: -74.094 },
};

/** Recuadro que contiene el área urbana de Bogotá. */
export const LIMITES_BOGOTA = {
  latMin: 4.45,
  latMax: 4.84,
  lngMin: -74.25,
  lngMax: -73.98,
} as const;

export function dentroDeBogota(lat: number, lng: number): boolean {
  const l = LIMITES_BOGOTA;
  return lat >= l.latMin && lat <= l.latMax && lng >= l.lngMin && lng <= l.lngMax;
}

const METROS_POR_GRADO = 111_320;

/**
 * Desplaza un punto en una dirección y distancia aleatorias de hasta `maxMetros`, distribuidas
 * de forma uniforme en el círculo. Protege la ubicación exacta del usuario (decisión D9).
 */
export function ofuscarUbicacion(
  lat: number,
  lng: number,
  maxMetros: number,
  azar: () => number = Math.random,
): { lat: number; lng: number } {
  const distancia = Math.sqrt(azar()) * maxMetros;
  const angulo = azar() * 2 * Math.PI;
  const dLat = (distancia * Math.cos(angulo)) / METROS_POR_GRADO;
  const dLng =
    (distancia * Math.sin(angulo)) / (METROS_POR_GRADO * Math.cos((lat * Math.PI) / 180));
  return { lat: lat + dLat, lng: lng + dLng };
}

/** Distancia aproximada en metros entre dos puntos (fórmula de haversine). */
export function distanciaMetros(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6_371_000;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
