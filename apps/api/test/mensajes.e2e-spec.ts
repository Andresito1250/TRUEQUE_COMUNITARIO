import type { INestApplication } from '@nestjs/common';
import {
  EVENTOS,
  type MensajeChat,
  type Notificacion,
  type PaginaMensajes,
  type ResumenActividad,
  type RespuestaSocket,
} from '@trueque/shared';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { io, type Socket } from 'socket.io-client';
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

/** Espera un evento del socket (falla a los 3 s). */
function esperar<T>(s: Socket, evento: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`No llegó ${evento}`)), 3000);
    s.once(evento, (d: T) => {
      clearTimeout(t);
      resolve(d);
    });
  });
}

/** Módulo 5 de punta a punta: chat (RF-20) y avisos en tiempo real (RF-21). */
describe('Módulo 5 · Comunicación (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let buzon: BuzonFalso;
  let ana: Cuenta;
  let beto: Cuenta;
  let dani: Cuenta;
  let propuestaId: string;
  let url: string;
  const sockets: Socket[] = [];
  const api = () => request(app.getHttpServer());

  const token = (c: Cuenta) => c.auth.Authorization.replace('Bearer ', '');

  async function conectar(c: Cuenta | null): Promise<Socket> {
    const s = io(`${url}/tiempo-real`, {
      transports: ['websocket'],
      auth: c ? { token: token(c) } : {},
      reconnection: false,
    });
    sockets.push(s);
    return s;
  }

  async function publicar(quien: Cuenta, titulo: string) {
    const res = await api()
      .post('/api/v1/publicaciones')
      .set(quien.auth)
      .send({
        titulo,
        descripcion: `${titulo} para trueque, buen estado.`,
        tipo: 'BIEN',
        estadoConservacion: 'BUENO',
        categoriaId: (await prisma.categoria.findFirstOrThrow()).id,
      })
      .expect(201);
    return res.body.id as string;
  }

  async function nuevaPropuesta() {
    const res = await api()
      .post('/api/v1/propuestas')
      .set(beto.auth)
      .send({
        publicacionId: await publicar(ana, 'Bicicleta chat'),
        ofrecidas: [await publicar(beto, 'Libro chat')],
      })
      .expect(201);
    return res.body.id as string;
  }

  const actividad = async (c: Cuenta) =>
    (await api().get('/api/v1/actividad').set(c.auth).expect(200)).body as ResumenActividad;

  beforeAll(async () => {
    ({ app, prisma, buzon } = await crearApp());
    await app.listen(0);
    url = `http://127.0.0.1:${((app.getHttpServer() as unknown as Server).address() as AddressInfo).port}`;
    await limpiarUsuariosDePrueba(prisma);
    await prisma.categoria.upsert({
      where: { nombre: 'Juguetes' },
      update: {},
      create: { nombre: 'Juguetes' },
    });
    ana = await cuentaDePrueba(app, buzon, 'ana.chat@e2e.test', 'SUBA');
    beto = await cuentaDePrueba(app, buzon, 'beto.chat@e2e.test', 'KENNEDY');
    dani = await cuentaDePrueba(app, buzon, 'dani.chat@e2e.test', 'SUBA');
    propuestaId = await nuevaPropuesta();
  });

  afterAll(async () => {
    for (const s of sockets) s.disconnect();
    await limpiarUsuariosDePrueba(prisma);
    await app.close();
  });

  describe('RF-20 · chat por REST', () => {
    it('las dos partes conversan y solo se avisa una vez mientras no se lea', async () => {
      for (const contenido of ['Hola Ana, ¿cuándo puedes?', '¿El sábado te sirve?']) {
        await api()
          .post(`/api/v1/propuestas/${propuestaId}/mensajes`)
          .set(beto.auth)
          .send({ contenido })
          .expect(201);
      }
      const h = (
        await api().get(`/api/v1/propuestas/${propuestaId}/mensajes`).set(ana.auth).expect(200)
      ).body as PaginaMensajes;
      expect(h.abierto).toBe(true);
      expect(h.mensajes.map((m) => m.contenido)).toEqual([
        '¿El sábado te sirve?',
        'Hola Ana, ¿cuándo puedes?',
      ]);
      const avisos = (await api().get('/api/v1/notificaciones').set(ana.auth))
        .body as Notificacion[];
      expect(avisos.filter((n) => n.tipo === 'MENSAJE_NUEVO')).toHaveLength(1);
      expect((await actividad(ana)).mensajesSinLeer).toBe(2);
    });

    it('al leer se marcan los mensajes y el aviso', async () => {
      await api()
        .post(`/api/v1/propuestas/${propuestaId}/mensajes/leidos`)
        .set(ana.auth)
        .expect(204);
      const h = (await api().get(`/api/v1/propuestas/${propuestaId}/mensajes`).set(beto.auth))
        .body as PaginaMensajes;
      expect(h.mensajes.every((m) => m.estado === 'LEIDO')).toBe(true);
      const a = await actividad(ana);
      expect(a.mensajesSinLeer).toBe(0);
      expect(a.recibidas).toBe(1);
    });

    it('nadie más puede leer ni escribir la conversación', async () => {
      await api().get(`/api/v1/propuestas/${propuestaId}/mensajes`).set(dani.auth).expect(404);
      await api()
        .post(`/api/v1/propuestas/${propuestaId}/mensajes`)
        .set(dani.auth)
        .send({ contenido: 'hola' })
        .expect(404);
    });

    it('valida el mensaje', async () => {
      await api()
        .post(`/api/v1/propuestas/${propuestaId}/mensajes`)
        .set(beto.auth)
        .send({ contenido: '   ' })
        .expect(400);
    });
  });

  describe('RF-20 y RF-21 · tiempo real', () => {
    it('rechaza conexiones sin un token válido', async () => {
      const s = await conectar(null);
      await esperar(s, 'disconnect');
      expect(s.connected).toBe(false);
    });

    it('el mensaje, el "escribiendo" y el "leído" llegan al instante', async () => {
      const sAna = await conectar(ana);
      const sBeto = await conectar(beto);
      await Promise.all([esperar(sAna, 'connect'), esperar(sBeto, 'connect')]);
      for (const s of [sAna, sBeto]) {
        const r = (await s.emitWithAck(EVENTOS.UNIRSE, { propuestaId })) as RespuestaSocket<null>;
        expect(r.ok).toBe(true);
      }

      const escribiendo = esperar<{ usuarioId: string }>(sAna, EVENTOS.ESCRIBIENDO);
      sBeto.emit(EVENTOS.ESCRIBIENDO, { propuestaId });
      expect((await escribiendo).usuarioId).toBe(beto.id);

      const llega = esperar<MensajeChat>(sAna, EVENTOS.NUEVO);
      const aviso = esperar<Notificacion>(sAna, EVENTOS.NOTIFICACION);
      const r = (await sBeto.emitWithAck(EVENTOS.ENVIAR, {
        propuestaId,
        contenido: 'Te escribo por el socket',
      })) as RespuestaSocket<MensajeChat>;
      expect(r.ok).toBe(true);
      expect((await llega).contenido).toBe('Te escribo por el socket');
      expect((await aviso).tipo).toBe('MENSAJE_NUEVO');

      const leido = esperar<{ lectorId: string }>(sBeto, EVENTOS.LEIDO);
      sAna.emit(EVENTOS.LEIDO, { propuestaId });
      expect((await leido).lectorId).toBe(ana.id);
    });

    it('una persona ajena no puede unirse a la sala', async () => {
      const s = await conectar(dani);
      await esperar(s, 'connect');
      const r = (await s.emitWithAck(EVENTOS.UNIRSE, { propuestaId })) as RespuestaSocket<null>;
      expect(r).toEqual({ ok: false, error: 'No encontramos esta conversación.' });
    });

    it('las notificaciones del trueque también llegan al instante', async () => {
      const sBeto = await conectar(beto);
      await esperar(sBeto, 'connect');
      const aviso = esperar<Notificacion>(sBeto, EVENTOS.NOTIFICACION);
      await api().post(`/api/v1/propuestas/${propuestaId}/aceptar`).set(ana.auth).expect(200);
      expect((await aviso).titulo).toBe('¡Aceptaron tu propuesta!');
    });
  });

  it('cuando el trueque termina el chat queda solo para leer', async () => {
    const otra = await nuevaPropuesta();
    await api().post(`/api/v1/propuestas/${otra}/rechazar`).set(ana.auth).expect(200);
    await api()
      .post(`/api/v1/propuestas/${otra}/mensajes`)
      .set(beto.auth)
      .send({ contenido: '¿Por qué?' })
      .expect(409);
    const h = (await api().get(`/api/v1/propuestas/${otra}/mensajes`).set(beto.auth))
      .body as PaginaMensajes;
    expect(h.abierto).toBe(false);
  });
});
