import type { INestApplication } from '@nestjs/common';
import { CENTRO_LOCALIDAD, type ResultadoBusqueda } from '@trueque/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import {
  type BuzonFalso,
  crearApp,
  cuentaDePrueba,
  limpiarUsuariosDePrueba,
} from './utilidades.js';

type Cuenta = { auth: { Authorization: string }; id: string };

/** Módulo 3 de punta a punta: RF-10 a RF-13. */
describe('Módulo 3 · Búsqueda y publicaciones cercanas (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let buzon: BuzonFalso;
  let caro: Cuenta; // busca, vive en Suba
  let dani: Cuenta; // publica en las tres localidades
  const cat: Record<string, number> = {};
  const ids: Record<string, string> = {};
  const api = () => request(app.getHttpServer());

  async function publicar(quien: Cuenta, datos: Record<string, unknown>) {
    const res = await api()
      .post('/api/v1/publicaciones')
      .set(quien.auth)
      .send({ tipo: 'BIEN', estadoConservacion: 'BUENO', ...datos })
      .expect(201);
    return res.body.id as string;
  }

  async function buscar(params: Record<string, string | number> = {}) {
    const res = await api().get('/api/v1/publicaciones').query(params).set(caro.auth).expect(200);
    return res.body as ResultadoBusqueda;
  }
  const titulos = (r: ResultadoBusqueda) => r.items.map((i) => i.titulo).sort();

  beforeAll(async () => {
    ({ app, prisma, buzon } = await crearApp());
    await limpiarUsuariosDePrueba(prisma);
    caro = await cuentaDePrueba(app, buzon, 'caro.bus@e2e.test', 'SUBA');
    dani = await cuentaDePrueba(app, buzon, 'dani.bus@e2e.test', 'KENNEDY');
    for (const nombre of ['Juguetes', 'Libros', 'Clases y tutorías']) {
      cat[nombre] = (
        await prisma.categoria.upsert({ where: { nombre }, update: {}, create: { nombre } })
      ).id;
    }

    ids.bici = await publicar(dani, {
      titulo: 'Bicicleta de montaña roja',
      descripcion: 'Rin 26, frenos nuevos, la cambio por herramientas.',
      categoriaId: cat.Juguetes,
      ubicacion: CENTRO_LOCALIDAD.SUBA,
    });
    ids.clases = await publicar(dani, {
      titulo: 'Clases de guitarra',
      descripcion: 'Te enseño tu primera canción en cuatro sesiones.',
      tipo: 'SERVICIO',
      categoriaId: cat['Clases y tutorías'],
      ubicacion: CENTRO_LOCALIDAD.KENNEDY,
    });
    ids.libro = await publicar(dani, {
      titulo: 'Libro de cocina colombiana',
      descripcion: 'Recetas tradicionales de todas las regiones.',
      estadoConservacion: 'NUEVO',
      categoriaId: cat.Libros,
      ubicacion: CENTRO_LOCALIDAD.TEUSAQUILLO,
    });
    // No deben aparecer: una publicación propia y una reservada.
    await publicar(caro, {
      titulo: 'Bicicleta vieja de caro',
      descripcion: 'Es mía, no debería verla en mis búsquedas.',
      categoriaId: cat.Juguetes,
    });
    const reservada = await publicar(dani, {
      titulo: 'Bicicleta reservada',
      descripcion: 'Ya la estoy negociando con alguien más.',
      categoriaId: cat.Juguetes,
      ubicacion: CENTRO_LOCALIDAD.SUBA,
    });
    await api()
      .patch(`/api/v1/publicaciones/${reservada}/estado`)
      .set(dani.auth)
      .send({ estado: 'RESERVADA' })
      .expect(200);
  });

  afterAll(async () => {
    await limpiarUsuariosDePrueba(prisma);
    await app.close();
  });

  describe('RF-10 · palabra clave', () => {
    it('encuentra por palabra completa y excluye lo propio y lo reservado', async () => {
      expect(titulos(await buscar({ q: 'bicicleta' }))).toEqual(['Bicicleta de montaña roja']);
    });

    it('acepta el comienzo de la palabra', async () => {
      expect(titulos(await buscar({ q: 'bici' }))).toEqual(['Bicicleta de montaña roja']);
    });

    it('no importan las tildes ni la eñe', async () => {
      expect(titulos(await buscar({ q: 'montana' }))).toEqual(['Bicicleta de montaña roja']);
      expect(titulos(await buscar({ q: 'cancion' }))).toEqual(['Clases de guitarra']);
    });

    it('busca también en la descripción y exige todas las palabras', async () => {
      expect(titulos(await buscar({ q: 'recetas regiones' }))).toEqual([
        'Libro de cocina colombiana',
      ]);
      expect((await buscar({ q: 'recetas guitarra' })).items).toHaveLength(0);
    });

    it('no falla con símbolos raros', async () => {
      expect((await buscar({ q: `')(&|!:*` })).items).toHaveLength(3);
    });
  });

  describe('RF-11 · filtros', () => {
    it('por categoría, tipo, estado y localidad', async () => {
      expect(titulos(await buscar({ categoriaId: cat.Libros }))).toEqual([
        'Libro de cocina colombiana',
      ]);
      expect(titulos(await buscar({ tipo: 'SERVICIO' }))).toEqual(['Clases de guitarra']);
      expect(titulos(await buscar({ estadoConservacion: 'NUEVO' }))).toEqual([
        'Libro de cocina colombiana',
      ]);
      // La zona es la localidad de quien publica (dani vive en Kennedy).
      expect((await buscar({ localidad: 'KENNEDY' })).items).toHaveLength(3);
      expect((await buscar({ localidad: 'SUBA' })).items).toHaveLength(0);
    });

    it('combina filtros con la palabra clave', async () => {
      expect((await buscar({ q: 'bicicleta', tipo: 'SERVICIO' })).items).toHaveLength(0);
    });

    it('rechaza valores fuera de rango', async () => {
      await api().get('/api/v1/publicaciones').query({ radioKm: 20 }).set(caro.auth).expect(400);
      await api().get('/api/v1/publicaciones').query({ lat: 4.7 }).set(caro.auth).expect(400);
    });
  });

  describe('RF-12 · cercanía', () => {
    it('sin ubicación mide desde el centro de la localidad del usuario', async () => {
      const r = await buscar();
      expect(r.origen).toMatchObject({ ...CENTRO_LOCALIDAD.SUBA, fuente: 'localidad' });
      // Suba → Teusaquillo (~11 km) → Kennedy (~14 km)
      expect(r.items.map((i) => i.titulo)).toEqual([
        'Bicicleta de montaña roja',
        'Libro de cocina colombiana',
        'Clases de guitarra',
      ]);
      expect(r.siguientePagina).toBeNull();
    });

    it('filtra por radio desde la ubicación del celular', async () => {
      const { lat, lng } = CENTRO_LOCALIDAD.TEUSAQUILLO;
      const cerca = await buscar({ lat, lng, radioKm: 3 });
      expect(cerca.origen.fuente).toBe('dispositivo');
      expect(titulos(cerca)).toEqual(['Libro de cocina colombiana']);
      expect(titulos(await buscar({ lat, lng, radioKm: 8 }))).toEqual([
        'Clases de guitarra',
        'Libro de cocina colombiana',
      ]);
    });

    it('devuelve distancia redondeada y punto aproximado, nunca el exacto', async () => {
      const { lat, lng } = CENTRO_LOCALIDAD.TEUSAQUILLO;
      const [libro] = (await buscar({ lat, lng, radioKm: 1 })).items;
      expect(libro.distanciaM % 100).toBe(0);
      expect(libro.distanciaM).toBeLessThanOrEqual(400);
      const decimales = String(libro.ubicacionAproximada.lat).split('.')[1] ?? '';
      expect(decimales.length).toBeLessThanOrEqual(3);
    });

    it('ignora una ubicación fuera de Bogotá', async () => {
      const r = await buscar({ lat: 6.2442, lng: -75.5812 });
      expect(r.origen.fuente).toBe('localidad');
    });
  });

  describe('RF-13 · detalle con distancia', () => {
    it('muestra la distancia desde quien consulta', async () => {
      const { lat, lng } = CENTRO_LOCALIDAD.TEUSAQUILLO;
      const res = await api()
        .get(`/api/v1/publicaciones/${ids.libro}`)
        .query({ lat, lng })
        .set(caro.auth)
        .expect(200);
      expect(res.body.distanciaM).toBeLessThanOrEqual(400);
      const sinOrigen = await api()
        .get(`/api/v1/publicaciones/${ids.libro}`)
        .set(caro.auth)
        .expect(200);
      expect(sinOrigen.body.distanciaM).toBeGreaterThan(9000); // desde el centro de Suba
    });

    it('no muestra distancia en las publicaciones propias', async () => {
      const res = await api().get(`/api/v1/publicaciones/${ids.bici}`).set(dani.auth).expect(200);
      expect(res.body.distanciaM).toBeNull();
    });
  });
});
