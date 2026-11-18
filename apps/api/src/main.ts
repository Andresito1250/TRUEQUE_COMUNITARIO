import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configurarApp } from './configurar-app.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configurarApp(app);
  const puerto = Number(process.env.PORT ?? 3000);
  // 0.0.0.0 para que un celular en la misma red Wi-Fi pueda conectarse (Expo Go).
  await app.listen(puerto, '0.0.0.0');
  Logger.log(`API en http://localhost:${puerto}/api/v1 · Swagger en /docs`, 'Bootstrap');
}
await bootstrap();
