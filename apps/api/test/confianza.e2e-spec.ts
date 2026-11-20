import type { INestApplication } from '@nestjs/common';
import type { CalificacionPublica, PerfilPublico, PropuestaDetalle } from '@trueque/shared';
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

/** Módulo 6 de punta a punta: RF-22 a RF-24. */
describe('Módulo 6 · Confianza y reputación (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let buzon: BuzonFalso;
  let ana: Cuenta;
  let beto: Cuenta;
  let caro: Cuenta;
  let dani: Cuenta;
  let categoriaId: number;
  const api = () => request(app.getHttpServer());

  async function publicar(quien: Cuenta, titulo: string) {
    const res = await api()
      .post('/api/v1/publicaciones')
      .set(quien.auth)
      .send({
        titulo,
        descripcion: `${titulo} para trueque, buen estado.`,
        tipo: 'BIEN',
        estadoConservacion: 'BUENO',
        categoriaId,
      })
      .expect(201);
    return res.body.id as string;
  }

  /** Crea un trueque entre Beto (propone) y Ana, y lo deja acordado o hecho. */
  async function trueque(hecho = true): Promise<string> {
    const p = await api()
      .post('/api/v1/propuestas')
      .set(beto.auth)
      .send({
        publicacionId: await publicar(ana, 'Objeto de Ana'),
        ofrecidas: [await publicar(beto, 'Objeto de Beto')],
      })
      .expect(201);
    const id = p.body.id as string;
    await api().post(`/api/v1/propuestas/${id}/aceptar`).set(ana.auth).expect(200);
    await api()
      .post(`/api/v1/propuestas/${id}/encuentro`)
      .set(ana.auth)
      .send({
        puntoTexto: 'Biblioteca',
        fechaHora: new Date(Date.now() + 86_400_000).toISOString(),
      })
      .expect(200);
    if (hecho) await api().post(`/api/v1/propuestas/${id}/confirmar`).set(ana.auth).expect(200);
    return id;
  }

  const calificar = (c: Cuenta, id: string, cuerpo: object) =>
    api().post(`/api/v1/propuestas/${id}/calificacion`).set(c.auth).send(cuerpo);

  beforeAll(async () => {
    ({ app, prisma, buzon } = await crearApp());
    await limpiarUsuariosDePrueba(prisma);
    ana = await cuentaDePrueba(app, buzon, 'ana.conf@e2e.test', 'SUBA');
    beto = await cuentaDePrueba(app, buzon, 'beto.conf@e2e.test', 'KENNEDY');
    caro = await cuentaDePrueba(app, buzon, 'caro.conf@e2e.test', 'SUBA');
    dani = await cuentaDePrueba(app, buzon, 'dani.conf@e2e.test', 'SUBA');
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

  describe('RF-22 y RF-23 · calificar y ver la reputación', () => {
    let id: string;

    it('no se puede calificar antes de que el trueque esté hecho', async () => {
      const pendiente = await trueque(false);
      await calificar(ana, pendiente, { puntuacion: 5 }).expect(409);
    });

    it('cada parte califica una vez y se avisa a la calificada', async () => {
      id = await trueque();
      await calificar(ana, id, { puntuacion: 6 }).expect(400);
      const r = (
        await calificar(ana, id, { puntuacion: 5, comentario: '¡Muy puntual!' }).expect(201)
      ).body as PropuestaDetalle;
      expect(r.estado).toBe('CALIFICACION_HABILITADA');
      expect(r.calificacion?.mia).toEqual({ puntuacion: 5, comentario: '¡Muy puntual!' });
      expect(r.acciones).not.toContain('calificar');
      await calificar(ana, id, { puntuacion: 1 }).expect(409);

      const avisos = (await api().get('/api/v1/notificaciones').set(beto.auth)).body;
      expect(avisos[0]).toMatchObject({ tipo: 'CALIFICACION_RECIBIDA' });
      const vistaBeto = (await api().get(`/api/v1/propuestas/${id}`).set(beto.auth)).body;
      expect(vistaBeto.calificacion.recibida).toBe(true);
      expect(vistaBeto.acciones).toEqual(['calificar']);
    });

    it('la reputación muestra promedio, cantidad e intercambios', async () => {
      const perfil = (await api().get(`/api/v1/usuarios/${beto.id}`).set(caro.auth).expect(200))
        .body as PerfilPublico;
      expect(perfil.reputacion).toEqual({ promedio: 5, calificaciones: 1, intercambios: 1 });
      expect(perfil.verificado).toBe(true);
      const lista = (
        await api().get(`/api/v1/usuarios/${beto.id}/calificaciones`).set(caro.auth).expect(200)
      ).body as CalificacionPublica[];
      expect(lista).toHaveLength(1);
      expect(lista[0]).toMatchObject({
        puntuacion: 5,
        comentario: '¡Muy puntual!',
        autor: 'Persona',
      });
    });

    it('cuando califican las dos partes el trueque queda finalizado', async () => {
      const r = (await calificar(beto, id, { puntuacion: 4 }).expect(201)).body as PropuestaDetalle;
      expect(r.estado).toBe('FINALIZADO');
      const perfilAna = (await api().get(`/api/v1/usuarios/${ana.id}`).set(caro.auth)).body;
      expect(perfilAna.reputacion.promedio).toBe(4);
    });

    it('pasados 7 días ya no se puede calificar', async () => {
      const viejo = await trueque();
      await prisma.intercambio.update({
        where: { propuestaId: viejo },
        data: { fechaConfirmacion: new Date(Date.now() - 8 * 86_400_000) },
      });
      await calificar(beto, viejo, { puntuacion: 3 }).expect(409);
      const d = (await api().get(`/api/v1/propuestas/${viejo}`).set(beto.auth)).body;
      expect(d.estado).toBe('FINALIZADO');
    });
  });

  describe('RF-24 · reportar', () => {
    it('valida lo que se reporta', async () => {
      const mia = await publicar(ana, 'Algo de Ana');
      await api()
        .post('/api/v1/reportes')
        .set(ana.auth)
        .send({ publicacionId: mia, motivo: 'SPAM' })
        .expect(409);
      await api()
        .post('/api/v1/reportes')
        .set(ana.auth)
        .send({ usuarioId: ana.id, motivo: 'ACOSO' })
        .expect(409);
      await api()
        .post('/api/v1/reportes')
        .set(beto.auth)
        .send({ usuarioId: ana.id, motivo: 'OTRO' })
        .expect(400);
      await api().post('/api/v1/reportes').set(beto.auth).send({ motivo: 'SPAM' }).expect(400);
    });

    it('reportar a una persona queda pendiente y no se repite', async () => {
      await api()
        .post('/api/v1/reportes')
        .set(beto.auth)
        .send({ usuarioId: dani.id, motivo: 'ACOSO', detalle: 'Me escribió groserías' })
        .expect(201);
      await api()
        .post('/api/v1/reportes')
        .set(beto.auth)
        .send({ usuarioId: dani.id, motivo: 'ACOSO' })
        .expect(409);
      const r = await prisma.reporte.findFirstOrThrow({ where: { usuarioReportadoId: dani.id } });
      expect(r.estado).toBe('PENDIENTE');
    });

    it('D29: con 3 reportes de personas distintas la publicación se oculta mientras se revisa', async () => {
      const sospechosa = await publicar(dani, 'Celular demasiado barato');
      const reportar = (c: Cuenta) =>
        api()
          .post('/api/v1/reportes')
          .set(c.auth)
          .send({ publicacionId: sospechosa, motivo: 'FRAUDE' })
          .expect(201);
      expect((await reportar(ana)).body.ocultada).toBe(false);
      expect((await reportar(beto)).body.ocultada).toBe(false);
      expect((await reportar(caro)).body.ocultada).toBe(true);
      expect(
        (await prisma.publicacion.findUniqueOrThrow({ where: { id: sospechosa } })).estado,
      ).toBe('OCULTA');
      await api().get(`/api/v1/publicaciones/${sospechosa}`).set(ana.auth).expect(404);
      // El dueño todavía la ve, pero no puede cambiarla.
      await api().get(`/api/v1/publicaciones/${sospechosa}`).set(dani.auth).expect(200);
    });
  });
});
