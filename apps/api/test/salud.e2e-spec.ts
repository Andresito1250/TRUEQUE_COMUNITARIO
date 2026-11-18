import 'dotenv/config';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configurarApp } from '../src/configurar-app.js';

// Requiere la base de datos de docker-compose en ejecución (npm run infra:up).
describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = modulo.createNestApplication();
    configurarApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health responde ok con la base de datos', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toMatchObject({ estado: 'ok', baseDeDatos: 'ok' });
  });

  it('GET /docs-json publica la especificación OpenAPI', async () => {
    const res = await request(app.getHttpServer()).get('/docs-json').expect(200);
    expect(res.body.info.title).toBe('Trueque Comunitario API');
  });

  it('las rutas inexistentes responden 404 bajo /api/v1', async () => {
    await request(app.getHttpServer()).get('/api/v1/no-existe').expect(404);
  });
});
