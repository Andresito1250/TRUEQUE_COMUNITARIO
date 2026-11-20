import type { INestApplication } from '@nestjs/common';
import { generate } from 'otplib';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type { PrismaService } from '../src/prisma/prisma.service.js';
import { type BuzonFalso, crearApp, limpiarUsuariosDePrueba } from './utilidades.js';

/** Módulo 1 de punta a punta: RF-01 a RF-05, RNF09 y RNF11. */
describe('Módulo 1 · Registro, autenticación y perfil (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let buzon: BuzonFalso;
  const api = () => request(app.getHttpServer());

  const correo = 'ana@e2e.test';
  const registro = {
    nombre: 'Ana Pérez',
    correo,
    contrasena: 'bogota2026',
    localidad: 'SUBA',
    aceptaPoliticaDatos: true,
    aceptaTerminos: true,
  };

  /** Registra y verifica una cuenta nueva; devuelve los tokens. */
  async function cuentaVerificada(c: string) {
    await api()
      .post('/api/v1/auth/registro')
      .send({ ...registro, correo: c })
      .expect(201);
    const res = await api()
      .post('/api/v1/auth/verificar-correo')
      .send({ correo: c, codigo: buzon.ultimoCodigo(c) })
      .expect(200);
    return res.body as { accessToken: string; refreshToken: string };
  }

  beforeAll(async () => {
    ({ app, prisma, buzon } = await crearApp());
    await limpiarUsuariosDePrueba(prisma);
  });

  afterAll(async () => {
    await limpiarUsuariosDePrueba(prisma);
    await app.close();
  });

  describe('RF-01 registro', () => {
    it('rechaza el registro sin aceptar la política de datos', async () => {
      const res = await api()
        .post('/api/v1/auth/registro')
        .send({ ...registro, aceptaPoliticaDatos: false })
        .expect(400);
      expect(JSON.stringify(res.body)).toMatch(/política de tratamiento de datos/);
    });

    it('crea la cuenta sin verificar, guarda el consentimiento y la contraseña con hash', async () => {
      const res = await api().post('/api/v1/auth/registro').send(registro).expect(201);
      expect(res.body.correo).toBe(correo);
      const u = await prisma.usuario.findUniqueOrThrow({ where: { correo } });
      expect(u.correoVerificado).toBe(false);
      expect(u.politicaDatosVersion).toBeTruthy();
      expect(u.terminosVersion).toBeTruthy();
      expect(u.contrasenaHash).toMatch(/^\$argon2id\$/);
    });

    it('no deja iniciar sesión sin verificar el correo', async () => {
      const res = await api()
        .post('/api/v1/auth/login')
        .send({ correo, contrasena: registro.contrasena })
        .expect(403);
      expect(res.body.codigo).toBe('CORREO_NO_VERIFICADO');
    });
  });

  describe('RF-02 verificación', () => {
    it('rechaza un código incorrecto e informa los intentos restantes', async () => {
      const malo = buzon.ultimoCodigo(correo) === '000000' ? '111111' : '000000';
      const res = await api()
        .post('/api/v1/auth/verificar-correo')
        .send({ correo, codigo: malo })
        .expect(400);
      expect(res.body.codigo).toBe('CODIGO_INVALIDO');
      expect(res.body.message).toMatch(/intentos/);
    });

    it('verifica con el código correcto e inicia sesión', async () => {
      const res = await api()
        .post('/api/v1/auth/verificar-correo')
        .send({ correo, codigo: buzon.ultimoCodigo(correo) })
        .expect(200);
      expect(res.body.requiere2fa).toBe(false);
      expect(res.body.accessToken).toBeTruthy();
      expect(res.body.usuario).toMatchObject({ correo, verificado: true, localidad: 'SUBA' });
    });

    it('no permite registrar de nuevo un correo ya verificado', async () => {
      await api().post('/api/v1/auth/registro').send(registro).expect(409);
    });
  });

  describe('RF-03 sesión y RNF09', () => {
    it('rechaza credenciales incorrectas con un mensaje genérico', async () => {
      const res = await api()
        .post('/api/v1/auth/login')
        .send({ correo, contrasena: 'otra-clave-1' })
        .expect(401);
      expect(res.body.message).toBe('El correo o la contraseña no son correctos.');
      await api()
        .post('/api/v1/auth/login')
        .send({ correo: 'nadie@e2e.test', contrasena: 'otra-clave-1' })
        .expect(401);
    });

    it('exige sesión en rutas privadas', async () => {
      await api().get('/api/v1/usuarios/me').expect(401);
      await api().get('/api/v1/usuarios/me').set('Authorization', 'Bearer basura').expect(401);
    });

    it('rota el refresh token y detecta su reutilización', async () => {
      const login = await api()
        .post('/api/v1/auth/login')
        .send({ correo, contrasena: registro.contrasena })
        .expect(200);
      const viejo = login.body.refreshToken as string;

      const renovado = await api()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: viejo })
        .expect(200);
      expect(renovado.body.refreshToken).not.toBe(viejo);

      // Reusar el token viejo invalida también el nuevo (posible robo).
      await api().post('/api/v1/auth/refresh').send({ refreshToken: viejo }).expect(401);
      await api()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: renovado.body.refreshToken })
        .expect(401);
    });

    it('el cierre de sesión revoca el refresh token', async () => {
      const login = await api()
        .post('/api/v1/auth/login')
        .send({ correo, contrasena: registro.contrasena })
        .expect(200);
      await api()
        .post('/api/v1/auth/logout')
        .send({ refreshToken: login.body.refreshToken })
        .expect(204);
      await api()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: login.body.refreshToken })
        .expect(401);
    });
  });

  describe('RF-04 recuperación de contraseña', () => {
    it('responde igual exista o no el correo', async () => {
      const a = await api().post('/api/v1/auth/recuperar').send({ correo }).expect(200);
      const b = await api()
        .post('/api/v1/auth/recuperar')
        .send({ correo: 'nadie@e2e.test' })
        .expect(200);
      expect(a.body.mensaje).toBe(b.body.mensaje);
    });

    it('cambia la contraseña con el código y cierra las sesiones abiertas', async () => {
      const antes = await api()
        .post('/api/v1/auth/login')
        .send({ correo, contrasena: registro.contrasena })
        .expect(200);

      await api()
        .post('/api/v1/auth/restablecer')
        .send({ correo, codigo: buzon.ultimoCodigo(correo), contrasenaNueva: 'nueva2026clave' })
        .expect(200);

      await api()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: antes.body.refreshToken })
        .expect(401);
      await api()
        .post('/api/v1/auth/login')
        .send({ correo, contrasena: registro.contrasena })
        .expect(401);
      await api()
        .post('/api/v1/auth/login')
        .send({ correo, contrasena: 'nueva2026clave' })
        .expect(200);
    });
  });

  describe('RF-05 perfil', () => {
    it('edita el perfil y las categorías de interés; el perfil público no expone datos de contacto', async () => {
      const { accessToken } = await cuentaVerificada('perfil@e2e.test');
      const auth = { Authorization: `Bearer ${accessToken}` };
      const categoria = await prisma.categoria.upsert({
        where: { nombre: 'Libros' },
        update: {},
        create: { nombre: 'Libros' },
      });

      const res = await api()
        .patch('/api/v1/usuarios/me')
        .set(auth)
        .send({
          descripcion: 'Me gusta leer',
          localidad: 'KENNEDY',
          telefonoContacto: '3001234567',
          categoriasInteres: [categoria.id],
        })
        .expect(200);
      expect(res.body).toMatchObject({ descripcion: 'Me gusta leer', localidad: 'KENNEDY' });
      expect(res.body.categoriasInteres).toEqual([expect.objectContaining({ nombre: 'Libros' })]);

      const publico = await api().get(`/api/v1/usuarios/${res.body.id}`).set(auth).expect(200);
      expect(publico.body).not.toHaveProperty('correo');
      expect(publico.body).not.toHaveProperty('telefonoContacto');
      expect(publico.body.reputacion).toEqual({
        promedio: null,
        calificaciones: 0,
        intercambios: 0,
      });
    });
  });

  describe('RF-02 verificación en dos pasos (TOTP)', () => {
    it('activa 2FA y luego exige el código al iniciar sesión', async () => {
      const c = 'dosfactores@e2e.test';
      const { accessToken } = await cuentaVerificada(c);
      const auth = { Authorization: `Bearer ${accessToken}` };

      const conf = await api().post('/api/v1/auth/2fa/configurar').set(auth).expect(200);
      expect(conf.body.uri).toMatch(/^otpauth:\/\/totp\//);
      const secreto = conf.body.secreto as string;

      await api()
        .post('/api/v1/auth/2fa/activar')
        .set(auth)
        .send({ codigo: await generate({ secret: secreto }) })
        .expect(200);

      const paso1 = await api()
        .post('/api/v1/auth/login')
        .send({ correo: c, contrasena: registro.contrasena })
        .expect(200);
      expect(paso1.body).toEqual({ requiere2fa: true, tokenTemporal: expect.any(String) });

      await api()
        .post('/api/v1/auth/login/2fa')
        .send({ tokenTemporal: paso1.body.tokenTemporal, codigo: '000000' })
        .expect(400);

      const paso2 = await api()
        .post('/api/v1/auth/login/2fa')
        .send({
          tokenTemporal: paso1.body.tokenTemporal,
          codigo: await generate({ secret: secreto }),
        })
        .expect(200);
      expect(paso2.body.usuario.totpActivo).toBe(true);
    });
  });

  describe('RNF11 eliminación de cuenta', () => {
    it('pide la contraseña, anonimiza los datos y cierra las sesiones', async () => {
      const c = 'eliminar@e2e.test';
      const { accessToken, refreshToken } = await cuentaVerificada(c);
      const auth = { Authorization: `Bearer ${accessToken}` };
      const { id } = (await api().get('/api/v1/usuarios/me').set(auth).expect(200)).body;

      await api()
        .delete('/api/v1/usuarios/me')
        .set(auth)
        .send({ contrasena: 'equivocada1' })
        .expect(401);
      await api()
        .delete('/api/v1/usuarios/me')
        .set(auth)
        .send({ contrasena: registro.contrasena })
        .expect(204);

      const u = await prisma.usuario.findUniqueOrThrow({ where: { id } });
      expect(u).toMatchObject({
        estado: 'ELIMINADO',
        nombre: 'Usuario eliminado',
        telefonoContacto: null,
      });
      expect(u.correo).not.toBe(c);
      await api().get('/api/v1/usuarios/me').set(auth).expect(401);
      await api().post('/api/v1/auth/refresh').send({ refreshToken }).expect(401);
      await api()
        .post('/api/v1/auth/login')
        .send({ correo: c, contrasena: registro.contrasena })
        .expect(401);
      expect(
        await prisma.registroAuditoria.count({
          where: { accion: 'CUENTA_ELIMINADA', entidadId: id },
        }),
      ).toBe(1);
    });
  });
});
