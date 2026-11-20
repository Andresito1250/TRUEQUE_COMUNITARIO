import { BadRequestException } from '@nestjs/common';
import {
  CENTRO_LOCALIDAD,
  type Coordenadas,
  dentroDeBogota,
  LIMITES,
  type Localidad,
  ofuscarUbicacion,
  origenValido,
} from '@trueque/shared';
import { Prisma } from '../generated/prisma/client.js';

/**
 * Punto a guardar para una publicación: la ubicación del dispositivo (si la compartió) o el centro
 * de su localidad, siempre desplazado hasta 300 m para no revelar dónde vive (RF-12, D9).
 */
export function puntoParaGuardar(
  coordenadas: Coordenadas | undefined,
  localidad: Localidad,
): Coordenadas {
  if (coordenadas && !dentroDeBogota(coordenadas.lat, coordenadas.lng)) {
    throw new BadRequestException('Por ahora la app solo funciona dentro de Bogotá.');
  }
  const origen = coordenadas ?? CENTRO_LOCALIDAD[localidad];
  return ofuscarUbicacion(origen.lat, origen.lng, LIMITES.OFUSCACION_UBICACION_M);
}

/** Guarda la ubicación en la columna PostGIS (Prisma no maneja este tipo directamente). */
export async function guardarUbicacionPublicacion(
  tx: Prisma.TransactionClient,
  publicacionId: string,
  punto: Coordenadas,
): Promise<void> {
  await tx.$executeRaw`
    UPDATE "Publicacion"
    SET ubicacion = ST_SetSRID(ST_MakePoint(${punto.lng}, ${punto.lat}), 4326)::geography
    WHERE id = ${publicacionId}::uuid`;
}

/**
 * Desde dónde se miden las distancias (RF-12, RF-13): la ubicación que envía el celular si está
 * en Bogotá, o el centro de la localidad del usuario. Esa ubicación nunca se guarda.
 */
export function origenDeConsulta(
  lat: number | undefined,
  lng: number | undefined,
  localidad: Localidad,
): Coordenadas & { fuente: 'dispositivo' | 'localidad' } {
  const propio = origenValido(lat, lng);
  return propio
    ? { ...propio, fuente: 'dispositivo' }
    : { ...CENTRO_LOCALIDAD[localidad], fuente: 'localidad' };
}

/** Punto PostGIS para usar en consultas. */
export function sqlPunto(c: Coordenadas): Prisma.Sql {
  return Prisma.sql`ST_SetSRID(ST_MakePoint(${c.lng}, ${c.lat}), 4326)::geography`;
}
