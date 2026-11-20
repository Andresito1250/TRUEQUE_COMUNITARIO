/**
 * Puntos de encuentro seguros sugeridos para los trueques (RF-16): lugares públicos, concurridos
 * y con vigilancia en las localidades piloto. Las coordenadas son aproximadas (D23); verifícalas
 * antes del piloto con usuarios reales.
 */
import type { Localidad } from '@trueque/shared';
import type { PrismaClient } from '../src/generated/prisma/client.js';

type Punto = {
  nombre: string;
  tipo: 'CENTRO_COMERCIAL' | 'BIBLIOTECA' | 'ESTACION' | 'PARQUE';
  localidad: Localidad;
  direccion: string;
  lat: number;
  lng: number;
};

export const PUNTOS: Punto[] = [
  // Suba
  {
    nombre: 'Centro Comercial Plaza Imperial',
    tipo: 'CENTRO_COMERCIAL',
    localidad: 'SUBA',
    direccion: 'Av. Ciudad de Cali con calle 148',
    lat: 4.7465,
    lng: -74.0946,
  },
  {
    nombre: 'Biblioteca Pública Julio Mario Santo Domingo',
    tipo: 'BIBLIOTECA',
    localidad: 'SUBA',
    direccion: 'Calle 170 # 67-51',
    lat: 4.7536,
    lng: -74.0636,
  },
  {
    nombre: 'Portal Suba (TransMilenio)',
    tipo: 'ESTACION',
    localidad: 'SUBA',
    direccion: 'Av. Ciudad de Cali con Av. Suba',
    lat: 4.7476,
    lng: -74.0959,
  },
  {
    nombre: 'Centro Comercial Centro Suba',
    tipo: 'CENTRO_COMERCIAL',
    localidad: 'SUBA',
    direccion: 'Calle 145 # 91-19',
    lat: 4.7408,
    lng: -74.0838,
  },
  // Kennedy
  {
    nombre: 'Centro Comercial Plaza de las Américas',
    tipo: 'CENTRO_COMERCIAL',
    localidad: 'KENNEDY',
    direccion: 'Carrera 71D # 6-94 Sur',
    lat: 4.6182,
    lng: -74.1355,
  },
  {
    nombre: 'Biblioteca Pública El Tintal Manuel Zapata Olivella',
    tipo: 'BIBLIOTECA',
    localidad: 'KENNEDY',
    direccion: 'Av. Ciudad de Cali # 6C-09',
    lat: 4.6417,
    lng: -74.1535,
  },
  {
    nombre: 'Portal de las Américas (TransMilenio)',
    tipo: 'ESTACION',
    localidad: 'KENNEDY',
    direccion: 'Av. Ciudad de Villavicencio con Av. Américas',
    lat: 4.629,
    lng: -74.2047,
  },
  {
    nombre: 'Parque Cayetano Cañizares',
    tipo: 'PARQUE',
    localidad: 'KENNEDY',
    direccion: 'Carrera 78K con calle 41 Sur',
    lat: 4.6283,
    lng: -74.1497,
  },
  // Teusaquillo
  {
    nombre: 'Biblioteca Pública Virgilio Barco',
    tipo: 'BIBLIOTECA',
    localidad: 'TEUSAQUILLO',
    direccion: 'Av. Carrera 60 # 57-60',
    lat: 4.6589,
    lng: -74.0835,
  },
  {
    nombre: 'Centro Comercial Galerías',
    tipo: 'CENTRO_COMERCIAL',
    localidad: 'TEUSAQUILLO',
    direccion: 'Calle 53 # 24-60',
    lat: 4.6425,
    lng: -74.076,
  },
  {
    nombre: 'Parque Park Way',
    tipo: 'PARQUE',
    localidad: 'TEUSAQUILLO',
    direccion: 'Carrera 24 entre calles 39 y 45',
    lat: 4.6305,
    lng: -74.076,
  },
  {
    nombre: 'Estación Universidad Nacional (TransMilenio)',
    tipo: 'ESTACION',
    localidad: 'TEUSAQUILLO',
    direccion: 'Av. NQS con calle 45',
    lat: 4.6352,
    lng: -74.0834,
  },
];

/** Idempotente: solo agrega los puntos que aún no existen (por nombre). */
export async function sembrarPuntos(prisma: PrismaClient): Promise<void> {
  let nuevos = 0;
  for (const p of PUNTOS) {
    const existe = await prisma.puntoEncuentro.findFirst({ where: { nombre: p.nombre } });
    if (existe) continue;
    await prisma.$executeRaw`
      INSERT INTO "PuntoEncuentro" (nombre, tipo, localidad, direccion, ubicacion)
      VALUES (${p.nombre}, ${p.tipo}::"TipoPuntoEncuentro", ${p.localidad}::"Localidad",
              ${p.direccion}, ST_SetSRID(ST_MakePoint(${p.lng}, ${p.lat}), 4326)::geography)`;
    nuevos++;
  }
  console.log(`✔ ${PUNTOS.length} puntos de encuentro seguros (${nuevos} nuevos)`);
}
