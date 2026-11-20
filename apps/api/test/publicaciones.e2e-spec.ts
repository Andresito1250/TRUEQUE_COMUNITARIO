import type { INestApplication } from '@nestjs/common';
import sharp from 'sharp';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import {
  type BuzonFalso,
  crearApp,
  cuentaDePrueba,
  limpiarUsuariosDePrueba,
} from './utilidades.js';

/** Foto JPG de prueba generada en memoria. */
function foto(color = '#2E6B30', ancho = 1600, alto = 1200) {
  return sharp({ create: { width: ancho, height: alto, channels: 3, background: color } })
    .jpeg()
    .toBuffer();
}

/** Módulo 2 de punta a punta: RF-06 a RF-09 y la foto de perfil de RF-05. */
describe('Módulo 2 · Publicación de bienes y servicios (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let buzon: BuzonFalso;
  let ana: { auth: { Authorization: string }; id: string };
  let beto: { auth: { Authorization: string }; id: string };
  let categoriaId: number;
  const api = () => request(app.getHttpServer());

  const bicicleta = {
    titulo: 'Bicicleta de niño',
    descripcion: 'Rin 16, con rueditas, poco uso. La cambio por libros.',
    tipo: 'BIEN',
    estadoConservacion: 'BUENO',
  };

  beforeAll(async () => {
    ({ app, prisma, buzon } = await crearApp());
    await limpiarUsuariosDePrueba(prisma);
    ana = await cuentaDePrueba(app, buzon, 'ana.pub@e2e.test', 'SUBA');
    beto = await cuentaDePrueba(app, buzon, 'beto.pub@e2e.test', 'KENNEDY');
    categoriaId = (
      await prisma.categoria.upsert({
        where: { nombre: 'Juguetes' },
        update: {},
        create: { nombre: 'Juguetes' },
      })
    ).id;
  });

  afterAll(async () => {
    await limpiarUsuariosDePrueba(prisma);
    await app.close();
  });

  async function publicar(datos: Record<string, unknown> = {}) {
    const res = await api()
      .post('/api/v1/publicaciones')
      .set(ana.auth)
      .send({ ...bicicleta, categoriaId, ...datos })
      .expect(201);
    return res.body as { id: string };
  }

  describe('RF-06 registrar publicación', () => {
    it('crea la publicación disponible, en la localidad del usuario y con ubicación ofuscada', async () => {
      const { id } = await publicar({ ubicacion: { lat: 4.75, lng: -74.09 } });
      const detalle = await api().get(`/api/v1/publicaciones/${id}`).set(ana.auth).expect(200);
      expect(detalle.body).toMatchObject({
        titulo: 'Bicicleta de niño',
        estado: 'DISPONIBLE',
        localidad: 'SUBA',
        esMia: true,
        categoria: { nombre: 'Juguetes' },
        oferente: { id: ana.id },
      });
      expect(detalle.body.oferente).not.toHaveProperty('correo');

      const [fila] = await prisma.$queryRaw<{ metros: number }[]>`
        SELECT ST_Distance(ubicacion, ST_SetSRID(ST_MakePoint(-74.09, 4.75), 4326)::geography) AS metros
        FROM "Publicacion" WHERE id = ${id}::uuid`;
      expect(fila.metros).toBeLessThanOrEqual(301);
    });

    it('usa el centro de la localidad si no se comparte la ubicación', async () => {
      const { id } = await publicar();
      const [fila] = await prisma.$queryRaw<{ con: boolean }[]>`
        SELECT ubicacion IS NOT NULL AS con FROM "Publicacion" WHERE id = ${id}::uuid`;
      expect(fila.con).toBe(true);
    });

    it('rechaza ubicaciones fuera de Bogotá y datos inválidos', async () => {
      await api()
        .post('/api/v1/publicaciones')
        .set(ana.auth)
        .send({ ...bicicleta, categoriaId, ubicacion: { lat: 6.24, lng: -75.58 } })
        .expect(400);
      await api()
        .post('/api/v1/publicaciones')
        .set(ana.auth)
        .send({ ...bicicleta, categoriaId: 99999 })
        .expect(400);
      await api().post('/api/v1/publicaciones').set(ana.auth).send({ titulo: 'x' }).expect(400);
    });

    it('un servicio queda con estado de conservación "no aplica"', async () => {
      const res = await api()
        .post('/api/v1/publicaciones')
        .set(ana.auth)
        .send({
          titulo: 'Clases de guitarra',
          descripcion: 'Clases para principiantes los sábados.',
          tipo: 'SERVICIO',
          estadoConservacion: 'NUEVO',
          categoriaId,
        })
        .expect(201);
      expect(res.body.estadoConservacion).toBe('NO_APLICA');
    });

    it('sube fotos, genera miniaturas y las sirve; máximo 5', async () => {
      const { id } = await publicar();
      const res = await api()
        .post(`/api/v1/publicaciones/${id}/imagenes`)
        .set(ana.auth)
        .attach('imagenes', await foto('#2E6B30'), 'a.jpg')
        .attach('imagenes', await foto('#7A5A44'), 'b.jpg')
        .expect(201);
      expect(res.body.imagenes).toHaveLength(2);
      expect(res.body.imagenes.map((i: { orden: number }) => i.orden)).toEqual([0, 1]);
      expect(res.body.miniaturaUrl).toBe(res.body.imagenes[0].miniaturaUrl);

      const grande = await api().get(res.body.imagenes[0].url).expect(200);
      expect(grande.headers['content-type']).toBe('image/jpeg');
      const meta = await sharp(grande.body as Buffer).metadata();
      expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBe(1280);
      const mini = await sharp(
        (await api().get(res.body.imagenes[0].miniaturaUrl).expect(200)).body as Buffer,
      ).metadata();
      expect(Math.max(mini.width ?? 0, mini.height ?? 0)).toBe(400);

      let pedido = api().post(`/api/v1/publicaciones/${id}/imagenes`).set(ana.auth);
      for (let i = 0; i < 4; i++) pedido = pedido.attach('imagenes', await foto(), `${i}.jpg`);
      const exceso = await pedido.expect(400);
      expect(exceso.body.message).toMatch(/máximo 5 fotos/);
    });

    it('rechaza archivos que no son imágenes', async () => {
      const { id } = await publicar();
      await api()
        .post(`/api/v1/publicaciones/${id}/imagenes`)
        .set(ana.auth)
        .attach('imagenes', Buffer.from('no soy una foto'), {
          filename: 'x.txt',
          contentType: 'text/plain',
        })
        .expect(400);
    });

    it('quita una foto y reordena las demás', async () => {
      const { id } = await publicar();
      const subida = await api()
        .post(`/api/v1/publicaciones/${id}/imagenes`)
        .set(ana.auth)
        .attach('imagenes', await foto('#111111'), '1.jpg')
        .attach('imagenes', await foto('#222222'), '2.jpg')
        .attach('imagenes', await foto('#333333'), '3.jpg')
        .expect(201);
      const [primera, segunda] = subida.body.imagenes;
      const res = await api()
        .delete(`/api/v1/publicaciones/${id}/imagenes/${primera.id}`)
        .set(ana.auth)
        .expect(200);
      expect(res.body.imagenes).toHaveLength(2);
      expect(res.body.imagenes[0]).toMatchObject({ id: segunda.id, orden: 0 });
      await api().get(primera.url).expect(404);
    });

    it('el endpoint de archivos no expone rutas fuera de las permitidas', async () => {
      await api().get('/api/v1/archivos/otra-carpeta/x.jpg').expect(404);
      await api().get('/api/v1/archivos/publicaciones/../../secreto').expect(404);
    });
  });

  describe('RF-07 y RF-08 editar, cambiar estado y eliminar', () => {
    it('solo el dueño puede modificar', async () => {
      const { id } = await publicar();
      await api()
        .patch(`/api/v1/publicaciones/${id}`)
        .set(beto.auth)
        .send({ titulo: 'Mía' })
        .expect(403);
      await api().delete(`/api/v1/publicaciones/${id}`).set(beto.auth).expect(403);
      const ajena = await api().get(`/api/v1/publicaciones/${id}`).set(beto.auth).expect(200);
      expect(ajena.body.esMia).toBe(false);
    });

    it('edita mientras está disponible y bloquea la edición si está reservada', async () => {
      const { id } = await publicar();
      const editada = await api()
        .patch(`/api/v1/publicaciones/${id}`)
        .set(ana.auth)
        .send({ titulo: 'Bicicleta rin 16' })
        .expect(200);
      expect(editada.body.titulo).toBe('Bicicleta rin 16');

      await api()
        .patch(`/api/v1/publicaciones/${id}/estado`)
        .set(ana.auth)
        .send({ estado: 'RESERVADA' })
        .expect(200);
      await api()
        .patch(`/api/v1/publicaciones/${id}`)
        .set(ana.auth)
        .send({ titulo: 'Otra' })
        .expect(409);
      await api().delete(`/api/v1/publicaciones/${id}`).set(ana.auth).expect(409);

      await api()
        .patch(`/api/v1/publicaciones/${id}/estado`)
        .set(ana.auth)
        .send({ estado: 'ELIMINADA' })
        .expect(400);
    });

    it('al eliminarla deja de verse', async () => {
      const { id } = await publicar();
      await api().delete(`/api/v1/publicaciones/${id}`).set(ana.auth).expect(204);
      await api().get(`/api/v1/publicaciones/${id}`).set(ana.auth).expect(404);
      expect(
        await prisma.registroAuditoria.count({
          where: { accion: 'PUBLICACION_ELIMINADA', entidadId: id },
        }),
      ).toBe(1);
    });
  });

  describe('RF-09 mis publicaciones', () => {
    it('separa activas e históricas', async () => {
      const { id } = await publicar({ titulo: 'Para el historial' });
      await api()
        .patch(`/api/v1/publicaciones/${id}/estado`)
        .set(ana.auth)
        .send({ estado: 'INTERCAMBIADA' })
        .expect(200);

      const activas = await api()
        .get('/api/v1/usuarios/me/publicaciones')
        .set(ana.auth)
        .expect(200);
      const historicas = await api()
        .get('/api/v1/usuarios/me/publicaciones?historico=true')
        .set(ana.auth)
        .expect(200);
      const ids = (l: { id: string }[]) => l.map((p) => p.id);
      expect(ids(activas.body)).not.toContain(id);
      expect(ids(historicas.body)).toEqual([id]);
      expect(activas.body.every((p: { estado: string }) => p.estado !== 'ELIMINADA')).toBe(true);

      const deBeto = await api()
        .get('/api/v1/usuarios/me/publicaciones')
        .set(beto.auth)
        .expect(200);
      expect(deBeto.body).toEqual([]);
    });
  });

  describe('RF-05 foto de perfil', () => {
    it('sube la foto recortada a 512×512, la reemplaza y la quita', async () => {
      const res = await api()
        .post('/api/v1/usuarios/me/foto')
        .set(beto.auth)
        .attach('foto', await foto('#AA3300', 900, 600), 'yo.jpg')
        .expect(201);
      expect(res.body.fotoUrl).toMatch(/^\/api\/v1\/archivos\/perfiles\//);
      const meta = await sharp(
        (await api().get(res.body.fotoUrl).expect(200)).body as Buffer,
      ).metadata();
      expect([meta.width, meta.height]).toEqual([512, 512]);

      const otra = await api()
        .post('/api/v1/usuarios/me/foto')
        .set(beto.auth)
        .attach('foto', await foto('#0033AA'), 'yo2.jpg')
        .expect(201);
      await api().get(res.body.fotoUrl).expect(404);

      const sin = await api().delete('/api/v1/usuarios/me/foto').set(beto.auth).expect(200);
      expect(sin.body.fotoUrl).toBeNull();
      await api().get(otra.body.fotoUrl).expect(404);
    });
  });
});
