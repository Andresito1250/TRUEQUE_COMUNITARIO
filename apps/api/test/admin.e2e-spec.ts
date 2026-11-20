import type { INestApplication } from '@nestjs/common';
import type {
  CategoriaAdmin,
  Indicadores,
  Notificacion,
  RegistroAuditoriaDto,
  ReporteAdmin,
  UsuarioAdmin,
} from '@trueque/shared';
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

/** Módulo 7 de punta a punta: RF-25 a RF-28 y RNF10. */
describe('Módulo 7 · Administración (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let buzon: BuzonFalso;
  let admin: Cuenta;
  let ana: Cuenta;
  let beto: Cuenta;
  let dani: Cuenta;
  let categoriaId: number;
  const api = () => request(app.getHttpServer());
  const nombreCategoria = `Deportes e2e ${Date.now()}`;

  function publicar(quien: Cuenta, titulo: string, cat = categoriaId) {
    return api()
      .post('/api/v1/publicaciones')
      .set(quien.auth)
      .send({
        titulo,
        descripcion: `${titulo} para trueque, buen estado.`,
        tipo: 'BIEN',
        estadoConservacion: 'BUENO',
        categoriaId: cat,
      });
  }
  const idDe = async (quien: Cuenta, titulo: string) =>
    (await publicar(quien, titulo).expect(201)).body.id as string;

  const reportar = (c: Cuenta, cuerpo: object) =>
    api().post('/api/v1/reportes').set(c.auth).send(cuerpo).expect(201);

  const pendientes = async () =>
    (await api().get('/api/v1/admin/reportes').set(admin.auth).expect(200)).body as ReporteAdmin[];

  const estadoPub = async (id: string) =>
    (await prisma.publicacion.findUniqueOrThrow({ where: { id } })).estado;

  beforeAll(async () => {
    ({ app, prisma, buzon } = await crearApp());
    await limpiarUsuariosDePrueba(prisma);
    admin = await cuentaDePrueba(app, buzon, 'admin.adm@e2e.test', 'TEUSAQUILLO');
    await prisma.usuario.update({ where: { id: admin.id }, data: { rol: 'ADMIN' } });
    ana = await cuentaDePrueba(app, buzon, 'ana.adm@e2e.test', 'SUBA');
    beto = await cuentaDePrueba(app, buzon, 'beto.adm@e2e.test', 'KENNEDY');
    dani = await cuentaDePrueba(app, buzon, 'dani.adm@e2e.test', 'SUBA');
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
    await prisma.categoria.deleteMany({ where: { nombre: { startsWith: 'Deportes e2e' } } });
    await app.close();
  });

  it('solo el administrador entra a /admin', async () => {
    await api().get('/api/v1/admin/reportes').set(ana.auth).expect(403);
    await api().get('/api/v1/admin/indicadores').expect(401);
  });

  describe('RF-25 · moderar publicaciones reportadas', () => {
    it('ocultar resuelve todos los reportes, cancela el trueque en curso y avisa al dueño', async () => {
      const celular = await idDe(dani, 'Celular sospechoso');
      // Beto propone y Dani acepta: el trueque queda en curso.
      const p = await api()
        .post('/api/v1/propuestas')
        .set(beto.auth)
        .send({ publicacionId: celular, ofrecidas: [await idDe(beto, 'Libro de Beto')] })
        .expect(201);
      await api().post(`/api/v1/propuestas/${p.body.id}/aceptar`).set(dani.auth).expect(200);

      await reportar(ana, { publicacionId: celular, motivo: 'FRAUDE' });
      await reportar(beto, {
        publicacionId: celular,
        motivo: 'FRAUDE',
        detalle: 'Pide plata antes',
      });
      const lista = await pendientes();
      const r = lista.find((x) => x.publicacion?.id === celular)!;
      expect(r.similares).toBe(2);
      expect(r.usuario?.id).toBe(dani.id);

      await api()
        .patch(`/api/v1/admin/reportes/${r.id}`)
        .set(admin.auth)
        .send({ decision: 'OCULTAR', nota: 'Pide dinero por adelantado' })
        .expect(204);
      expect(await estadoPub(celular)).toBe('OCULTA');
      expect((await pendientes()).some((x) => x.publicacion?.id === celular)).toBe(false);

      const trueque = await prisma.propuestaTrueque.findUniqueOrThrow({ where: { id: p.body.id } });
      expect(trueque.estado).toBe('CANCELADA');
      const libro = p.body.ofrecidas[0].id as string;
      expect(await estadoPub(libro)).toBe('DISPONIBLE');

      const avisosDani = (await api().get('/api/v1/notificaciones').set(dani.auth))
        .body as Notificacion[];
      expect(avisosDani[0]).toMatchObject({ tipo: 'MODERACION' });
      expect(avisosDani[0].mensaje).toContain('Pide dinero por adelantado');
      const avisosBeto = (await api().get('/api/v1/notificaciones').set(beto.auth))
        .body as Notificacion[];
      expect(avisosBeto[0].tipo).toBe('TRUEQUE_CANCELADO');

      await api()
        .patch(`/api/v1/admin/reportes/${r.id}`)
        .set(admin.auth)
        .send({ decision: 'ELIMINAR' })
        .expect(409);
    });

    it('si no infringe, la publicación oculta por reportes vuelve a estar disponible', async () => {
      const bici = await idDe(ana, 'Bicicleta normal');
      await reportar(beto, { publicacionId: bici, motivo: 'SPAM' });
      await prisma.publicacion.update({ where: { id: bici }, data: { estado: 'OCULTA' } });
      const r = (await pendientes()).find((x) => x.publicacion?.id === bici)!;
      await api()
        .patch(`/api/v1/admin/reportes/${r.id}`)
        .set(admin.auth)
        .send({ decision: 'APROBAR' })
        .expect(204);
      expect(await estadoPub(bici)).toBe('DISPONIBLE');
    });
  });

  describe('RF-26 · gestionar usuarios', () => {
    it('busca por nombre o correo', async () => {
      const lista = (
        await api()
          .get('/api/v1/admin/usuarios')
          .query({ q: 'dani.adm' })
          .set(admin.auth)
          .expect(200)
      ).body as UsuarioAdmin[];
      expect(lista.map((u) => u.id)).toEqual([dani.id]);
      expect(lista[0].reportesRecibidos).toBeGreaterThan(0);
    });

    it('suspender por un reporte bloquea la cuenta y cancela sus trueques', async () => {
      const gorra = await idDe(ana, 'Gorra de Ana');
      const p = await api()
        .post('/api/v1/propuestas')
        .set(dani.auth)
        .send({ publicacionId: gorra, ofrecidas: [await idDe(dani, 'Taza de Dani')] })
        .expect(201);
      await reportar(ana, {
        usuarioId: dani.id,
        motivo: 'ACOSO',
        detalle: 'Me insultó en el chat',
      });
      const r = (await pendientes()).find((x) => !x.publicacion && x.usuario?.id === dani.id)!;
      await api()
        .patch(`/api/v1/admin/reportes/${r.id}`)
        .set(admin.auth)
        .send({ decision: 'SUSPENDER_USUARIO', nota: 'Acoso' })
        .expect(204);

      const res = await api().get('/api/v1/usuarios/me').set(dani.auth).expect(403);
      expect(res.body.codigo).toBe('CUENTA_SUSPENDIDA');
      const propuesta = await prisma.propuestaTrueque.findUniqueOrThrow({
        where: { id: p.body.id },
      });
      expect(propuesta.estado).toBe('CANCELADA');
      // Sus publicaciones ya no salen en la búsqueda.
      const busqueda = (await api().get('/api/v1/publicaciones').query({ q: 'taza' }).set(ana.auth))
        .body;
      expect(busqueda.items).toHaveLength(0);
    });

    it('se puede reactivar con un motivo, pero no suspender a un administrador', async () => {
      const u = (
        await api()
          .patch(`/api/v1/admin/usuarios/${dani.id}/estado`)
          .set(admin.auth)
          .send({ estado: 'ACTIVO', motivo: 'Apelación aceptada' })
          .expect(200)
      ).body as UsuarioAdmin;
      expect(u.estado).toBe('ACTIVO');
      await api()
        .patch(`/api/v1/admin/usuarios/${admin.id}/estado`)
        .set(admin.auth)
        .send({ estado: 'SUSPENDIDO', motivo: 'Prueba' })
        .expect(403);
      await api()
        .patch(`/api/v1/admin/usuarios/${dani.id}/estado`)
        .set(admin.auth)
        .send({ estado: 'SUSPENDIDO', motivo: 'no' })
        .expect(400);
    });
  });

  describe('RF-27 · indicadores', () => {
    it('resume usuarios, publicaciones, trueques y reportes', async () => {
      const i = (await api().get('/api/v1/admin/indicadores').set(admin.auth).expect(200))
        .body as Indicadores;
      expect(i.usuarios.total).toBeGreaterThanOrEqual(3);
      expect(i.usuarios.porLocalidad.SUBA).toBeGreaterThanOrEqual(2);
      expect(i.publicaciones.ocultas).toBeGreaterThanOrEqual(1);
      expect(i.trueques.propuestas).toBeGreaterThanOrEqual(2);
      expect(i.trueques.cancelados).toBeGreaterThanOrEqual(2);
      expect(i.reportes.resueltos).toBeGreaterThanOrEqual(4);
    });

    it('exporta un CSV que abre en Excel', async () => {
      const res = await api()
        .get('/api/v1/admin/indicadores/export.csv')
        .set(admin.auth)
        .expect(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('indicadores-trueque.csv');
      expect(res.text.startsWith('﻿Sección;Indicador;Valor')).toBe(true);
      expect(res.text).toContain('Trueques;Cancelados;');
    });
  });

  describe('RF-28 · categorías', () => {
    it('crea, evita duplicados y desactiva', async () => {
      const c = (
        await api()
          .post('/api/v1/admin/categorias')
          .set(admin.auth)
          .send({ nombre: nombreCategoria, icono: 'football-outline' })
          .expect(201)
      ).body as CategoriaAdmin;
      await api()
        .post('/api/v1/admin/categorias')
        .set(admin.auth)
        .send({ nombre: nombreCategoria.toUpperCase(), icono: 'football-outline' })
        .expect(409);
      await api()
        .post('/api/v1/admin/categorias')
        .set(admin.auth)
        .send({ nombre: 'Mal icono', icono: 'Fútbol!' })
        .expect(400);
      await publicar(ana, 'Balón de fútbol', c.id).expect(201);

      await api()
        .patch(`/api/v1/admin/categorias/${c.id}`)
        .set(admin.auth)
        .send({ activa: false })
        .expect(200);
      const publicas = (await api().get('/api/v1/categorias').expect(200)).body as { id: number }[];
      expect(publicas.some((x) => x.id === c.id)).toBe(false);
      await publicar(ana, 'Raqueta de tenis', c.id).expect(400);
      const todas = (await api().get('/api/v1/admin/categorias').set(admin.auth))
        .body as CategoriaAdmin[];
      expect(todas.find((x) => x.id === c.id)).toMatchObject({ activa: false, publicaciones: 1 });
    });
  });

  it('RNF10: la auditoría registra la moderación', async () => {
    const { registros } = (await api().get('/api/v1/admin/auditoria').set(admin.auth).expect(200))
      .body as { registros: RegistroAuditoriaDto[] };
    const acciones = registros.map((r) => r.accion);
    expect(acciones).toContain('REPORTE_RESUELTO');
    expect(acciones).toContain('USUARIO_SUSPENDIDO');
    expect(acciones).toContain('CATEGORIA_CREADA');
  });
});
