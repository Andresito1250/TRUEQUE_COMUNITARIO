import {
  type INestApplication,
  RequestMethod,
  StandardSchemaValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { Env } from './config/env.js';

/**
 * Configuración común de la aplicación, usada por main.ts y por las pruebas e2e
 * para que ambos ejecuten exactamente la misma API.
 */
export function configurarApp(app: INestApplication) {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.use(helmet());
  const origenes = config.get('CORS_ORIGINS', { infer: true });
  app.enableCors({
    origin: origenes === '*' ? true : origenes.split(',').map((o) => o.trim()),
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  });

  // Rutas: /api/v1/... ; /health queda fuera del prefijo para monitoreo simple.
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.useGlobalPipes(new StandardSchemaValidationPipe());
  app.enableShutdownHooks();

  const documento = new DocumentBuilder()
    .setTitle('Trueque Comunitario API')
    .setDescription('API del prototipo de trueque comunitario para Bogotá (trabajo de grado UMB).')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, documento));
}
