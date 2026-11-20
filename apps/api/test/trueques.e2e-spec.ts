import type { INestApplication } from '@nestjs/common';
import type { Notificacion, PropuestaDetalle, PropuestaResumen } from '@trueque/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { sembrarPuntos } from '../prisma/puntos-encuentro.js';
import type { PrismaClient } from '../src/generated/prisma/client.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import {
  type BuzonFalso,
  crearApp,
  cuentaDePrueba,
  limpiarUsuariosDePrueba,
} from './utilidades.js';

type Cuenta = { auth: { Authorization: string }; id: string };

/** Módulo 4 de punta a punta: RF-14 a RF-19 y la máquina de estados (plan §3, D3, D4). */
describe('Módulo 4 · Gestión del trueque (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let buzon: BuzonFalso;
  let ana: Cuenta;
  let beto: Cuenta;
  let caro: Cuenta;
  let dani: Cuenta;
  let categoriaId: number;
  let puntoId: number;
  const api = () => request(app.getHttpServer());

  async function publicar(quien: Cuenta, titulo: string) {
    const res = await api()
      .post('/api/v1/publicaciones')
      .set(quien.auth)
      .send({
        titulo,
        descripcion: `${titulo} en buen estado, para trueque.`,
        tipo: 'BIEN',
        estadoConservacion: 'BUENO',
        categoriaId,
      })
      .expect(201);
    return res.body.id as string;
  }

  const estadoPub = async (id: string) =>
    (await prisma.publicacion.findUniqueOrThrow({ where: { id } })).estado;

  async function proponer(quien: Cuenta, publicacionId: string, ofrecidas: string[]) {
    const res = await api()
      .post('/api/v1/propuestas')
      .set(quien.auth)
      .send({ publicacionId, ofrecidas, mensaje: '¿Te interesa?' })
      .expect(201);
    return res.body as PropuestaDetalle;
  }

  const accion = (quien: Cuenta, id: string, nombre: string, cuerpo: object = {}) =>
    api().post(`/api/v1/propuestas/${id}/${nombre}`).set(quien.auth).send(cuerpo);

  const detalle = async (quien: Cuenta, id: string) =>
    (await api().get(`/api/v1/propuestas/${id}`).set(quien.auth).expect(200))
      .body as PropuestaDetalle;

  const bandeja = async (quien: Cuenta, b: string) =>
    (await api().get('/api/v1/propuestas').query({ bandeja: b }).set(quien.auth).expect(200))
      .body as PropuestaResumen[];

  const notificaciones = async (quien: Cuenta) =>
    (await api().get('/api/v1/notificaciones').set(quien.auth).expect(200)).body as Notificacion[];

  const manana = () => new Date(Date.now() + 86_400_000).toISOString();

  beforeAll(async () => {
    ({ app, prisma, buzon } = await crearApp());
    await limpiarUsuariosDePrueba(prisma);
    await sembrarPuntos(prisma as unknown as PrismaClient);
    puntoId = (await prisma.puntoEncuentro.findFirstOrThrow()).id;
    ana = await cuentaDePrueba(app, buzon, 'ana.tq@e2e.test', 'SUBA');
    beto = await cuentaDePrueba(app, buzon, 'beto.tq@e2e.test', 'KENNEDY');
    caro = await cuentaDePrueba(app, buzon, 'caro.tq@e2e.test', 'TEUSAQUILLO');
    dani = await cuentaDePrueba(app, buzon, 'dani.tq@e2e.test', 'SUBA');
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

  describe('flujo completo con varias propuestas (D3) y "hecho" de una sola parte (D4)', () => {
    let bici: string;
    let libro: string;
    let juego: string;
    let deBeto: PropuestaDetalle;
    let deCaro: PropuestaDetalle;

    beforeAll(async () => {
      bici = await publicar(ana, 'Bicicleta de Ana');
      libro = await publicar(beto, 'Libro de Beto');
      juego = await publicar(caro, 'Juego de Caro');
    });

    it('RF-14: Beto propone su libro por la bicicleta y Ana recibe el aviso', async () => {
      deBeto = await proponer(beto, bici, [libro]);
      expect(deBeto.estado).toBe('PENDIENTE_RESPUESTA');
      expect(deBeto.solicitadas.map((p) => p.id)).toEqual([bici]);
      expect(deBeto.ofrecidas.map((p) => p.id)).toEqual([libro]);
      expect(deBeto.acciones.sort()).toEqual(['cancelar', 'chatear']);
      const avisos = await notificaciones(ana);
      expect(avisos[0]).toMatchObject({ tipo: 'PROPUESTA_NUEVA', ruta: `/propuesta/${deBeto.id}` });
      expect((await bandeja(ana, 'recibidas')).map((p) => p.id)).toContain(deBeto.id);
      expect((await bandeja(beto, 'enviadas')).map((p) => p.id)).toContain(deBeto.id);
    });

    it('valida la propuesta', async () => {
      // Repetida, por algo propio u ofreciendo algo ajeno.
      await api()
        .post('/api/v1/propuestas')
        .set(beto.auth)
        .send({ publicacionId: bici, ofrecidas: [libro] })
        .expect(409);
      await api()
        .post('/api/v1/propuestas')
        .set(ana.auth)
        .send({ publicacionId: bici, ofrecidas: [bici] })
        .expect(409);
      await api()
        .post('/api/v1/propuestas')
        .set(caro.auth)
        .send({ publicacionId: bici, ofrecidas: [libro] })
        .expect(409);
    });

    it('D3: la bicicleta puede recibir otra propuesta a la vez', async () => {
      deCaro = await proponer(caro, bici, [juego]);
      expect((await bandeja(ana, 'recibidas')).length).toBe(2);
    });

    it('solo el receptor responde', async () => {
      await accion(beto, deBeto.id, 'aceptar').expect(403);
      await accion(ana, deBeto.id, 'cancelar').expect(403);
      await accion(dani, deBeto.id, 'aceptar').expect(404);
    });

    it('RF-15: Ana acepta la de Beto; los artículos quedan reservados y la de Caro bloqueada', async () => {
      const aceptada = (await accion(ana, deBeto.id, 'aceptar').expect(200)).body;
      expect(aceptada.estado).toBe('ACEPTADA');
      expect(await estadoPub(bici)).toBe('RESERVADA');
      expect(await estadoPub(libro)).toBe('RESERVADA');

      const bloqueada = await detalle(ana, deCaro.id);
      expect(bloqueada.bloqueada).toBe(true);
      expect(bloqueada.acciones).not.toContain('aceptar');
      await accion(ana, deCaro.id, 'aceptar').expect(409);
      expect((await notificaciones(beto))[0].titulo).toBe('¡Aceptaron tu propuesta!');
    });

    it('no se puede cambiar a mano el estado de algo en un trueque en curso', async () => {
      await api()
        .patch(`/api/v1/publicaciones/${bici}/estado`)
        .set(ana.auth)
        .send({ estado: 'DISPONIBLE' })
        .expect(409);
    });

    it('no se puede marcar hecho sin acordar el encuentro', async () => {
      await accion(beto, deBeto.id, 'confirmar').expect(409);
    });

    it('RF-16: los puntos seguros se ordenan por cercanía a las dos partes', async () => {
      const res = await api()
        .get('/api/v1/puntos-encuentro')
        .query({ propuestaId: deBeto.id })
        .set(beto.auth)
        .expect(200);
      expect(res.body.length).toBeGreaterThan(5);
      const distancias = res.body.map((p: { distanciaM: number }) => p.distanciaM);
      expect(distancias).toEqual([...distancias].sort((a, b) => a - b));
    });

    it('RF-16: acuerdan el encuentro y lo pueden cambiar', async () => {
      const r = (
        await accion(beto, deBeto.id, 'encuentro', {
          puntoEncuentroId: puntoId,
          fechaHora: manana(),
        }).expect(200)
      ).body as PropuestaDetalle;
      expect(r.estado).toBe('ESPERANDO_CONFIRMACION');
      expect(r.encuentro?.punto?.id).toBe(puntoId);
      expect(r.acciones).toContain('confirmar');
      const cambio = (
        await accion(ana, deBeto.id, 'encuentro', {
          puntoTexto: 'Portería de mi conjunto',
          fechaHora: manana(),
        }).expect(200)
      ).body as PropuestaDetalle;
      expect(cambio.encuentro?.lugar).toBe('Portería de mi conjunto');
      expect((await notificaciones(beto))[0].titulo).toBe('Cambió el encuentro');
      await accion(ana, deBeto.id, 'encuentro', {
        puntoEncuentroId: puntoId,
        fechaHora: '2020-01-01T10:00:00.000Z',
      }).expect(400);
    });

    it('RF-17 / D4: Beto marca hecho y queda hecho para los dos', async () => {
      const r = (await accion(beto, deBeto.id, 'confirmar').expect(200)).body as PropuestaDetalle;
      expect(r.estado).toBe('CALIFICACION_HABILITADA');
      expect(r.confirmacion?.porMi).toBe(true);

      const vistaAna = await detalle(ana, deBeto.id);
      expect(vistaAna.estado).toBe('CALIFICACION_HABILITADA');
      expect(vistaAna.confirmacion).toMatchObject({ porMi: false, porNombre: 'Persona de prueba' });
      expect(vistaAna.acciones).toEqual(['calificar']);
      expect((await notificaciones(ana))[0].tipo).toBe('TRUEQUE_REALIZADO');

      expect(await estadoPub(bici)).toBe('INTERCAMBIADA');
      expect(await estadoPub(libro)).toBe('INTERCAMBIADA');
      // Marcar hecho dos veces no hace nada.
      await accion(ana, deBeto.id, 'confirmar').expect(409);
    });

    it('la otra propuesta se cierra sola y se avisa a su autora', async () => {
      const cerrada = await detalle(caro, deCaro.id);
      expect(cerrada.estado).toBe('RECHAZADA');
      expect(cerrada.motivoCierre).toBe('El artículo ya fue intercambiado.');
      expect((await notificaciones(caro))[0].mensaje).toBe('El artículo ya fue intercambiado.');
      expect(await estadoPub(juego)).toBe('DISPONIBLE');
    });

    it('RF-19: aparece en el historial de los dos con la contraparte', async () => {
      const deAna = (await bandeja(ana, 'historial')).find((p) => p.id === deBeto.id);
      const deBetoH = (await bandeja(beto, 'historial')).find((p) => p.id === deBeto.id);
      expect(deAna?.contraparte.id).toBe(beto.id);
      expect(deBetoH?.contraparte.id).toBe(ana.id);
      expect(await bandeja(ana, 'activas')).toHaveLength(0);
    });
  });

  describe('contrapropuesta y cancelación (RF-15, RF-18)', () => {
    it('la contrapropuesta invierte los papeles y cancelar libera los artículos', async () => {
      const casco = await publicar(beto, 'Casco de Beto');
      const pelota = await publicar(caro, 'Pelota de Caro');
      const patines = await publicar(caro, 'Patines de Caro');
      const original = await proponer(caro, casco, [pelota]);

      // Beto prefiere los patines.
      const contra = (
        await accion(beto, original.id, 'contrapropuesta', {
          solicitadas: [patines],
          ofrecidas: [casco],
          mensaje: 'Mejor los patines',
        }).expect(201)
      ).body as PropuestaDetalle;
      expect(contra.estado).toBe('PENDIENTE_RESPUESTA');
      expect(contra.proponente.id).toBe(beto.id);
      expect(contra.receptor.id).toBe(caro.id);
      expect(contra.propuestaPadreId).toBe(original.id);
      expect((await detalle(caro, original.id)).estado).toBe('CONTRAPROPUESTA');
      expect((await detalle(caro, original.id)).contrapropuestaId).toBe(contra.id);
      expect((await notificaciones(caro))[0].tipo).toBe('CONTRAPROPUESTA');

      // No se puede pedir algo de uno mismo en la contrapropuesta.
      await accion(caro, contra.id, 'contrapropuesta', {
        solicitadas: [pelota],
        ofrecidas: [patines],
      }).expect(409);

      await accion(caro, contra.id, 'aceptar').expect(200);
      expect(await estadoPub(patines)).toBe('RESERVADA');
      expect(await estadoPub(pelota)).toBe('DISPONIBLE');

      const cancelada = (
        await accion(caro, contra.id, 'cancelar', { motivo: 'Se me dañaron los patines' }).expect(
          200,
        )
      ).body as PropuestaDetalle;
      expect(cancelada.estado).toBe('CANCELADA');
      expect(cancelada.motivoCierre).toBe('Se me dañaron los patines');
      expect(await estadoPub(patines)).toBe('DISPONIBLE');
      expect(await estadoPub(casco)).toBe('DISPONIBLE');
      expect((await notificaciones(beto))[0].mensaje).toContain('Se me dañaron los patines');
      await accion(beto, contra.id, 'aceptar').expect(409);
    });

    it('el proponente cancela mientras espera respuesta', async () => {
      const gorra = await publicar(dani, 'Gorra de Dani');
      const regla = await publicar(ana, 'Regla de Ana');
      const p = await proponer(ana, gorra, [regla]);
      expect((await accion(ana, p.id, 'cancelar').expect(200)).body.estado).toBe('CANCELADA');
    });

    it('eliminar una publicación cierra las propuestas que esperaban respuesta', async () => {
      const lampara = await publicar(dani, 'Lámpara de Dani');
      const cuaderno = await publicar(ana, 'Cuaderno de Ana');
      const p = await proponer(ana, lampara, [cuaderno]);
      await api().delete(`/api/v1/publicaciones/${lampara}`).set(dani.auth).expect(204);
      const cerrada = await detalle(ana, p.id);
      expect(cerrada.estado).toBe('CANCELADA');
      expect(cerrada.motivoCierre).toBe('Una de las publicaciones fue eliminada.');
    });
  });

  describe('concurrencia', () => {
    it('si se aceptan dos propuestas a la vez sobre lo mismo, solo una gana', async () => {
      const radio = await publicar(dani, 'Radio de Dani');
      const p1 = await proponer(ana, radio, [await publicar(ana, 'Taza de Ana')]);
      const p2 = await proponer(caro, radio, [await publicar(caro, 'Vaso de Caro')]);
      const [r1, r2] = await Promise.all([
        accion(dani, p1.id, 'aceptar'),
        accion(dani, p2.id, 'aceptar'),
      ]);
      expect([r1.status, r2.status].sort((a, b) => a - b)).toEqual([200, 409]);
      expect(await estadoPub(radio)).toBe('RESERVADA');
    });

    it('un doble toque en "aceptar" no hace nada dos veces', async () => {
      const silla = await publicar(dani, 'Silla de Dani');
      const p = await proponer(beto, silla, [await publicar(beto, 'Mesa de Beto')]);
      const [r1, r2] = await Promise.all([
        accion(dani, p.id, 'aceptar'),
        accion(dani, p.id, 'aceptar'),
      ]);
      expect([r1.status, r2.status].sort((a, b) => a - b)).toEqual([200, 409]);
    });
  });

  it('RF-15: lista las publicaciones disponibles de otra persona', async () => {
    const res = await api().get(`/api/v1/usuarios/${caro.id}/publicaciones`).set(ana.auth);
    expect(res.status).toBe(200);
    expect(res.body.every((p: { estado: string }) => p.estado === 'DISPONIBLE')).toBe(true);
  });
});
