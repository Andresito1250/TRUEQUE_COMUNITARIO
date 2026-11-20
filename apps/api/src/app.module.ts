import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AlmacenamientoModule } from './almacenamiento/almacenamiento.module.js';
import { AuditoriaModule } from './auditoria/auditoria.module.js';
import { AuthModule } from './auth/auth.module.js';
import { LimiteHttpGuard } from './comun/limite-http.guard.js';
import { CategoriasModule } from './categorias/categorias.module.js';
import { envSchema } from './config/env.js';
import { CorreoModule } from './correo/correo.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { PublicacionesModule } from './publicaciones/publicaciones.module.js';
import { MensajesModule } from './mensajes/mensajes.module.js';
import { NotificacionesModule } from './notificaciones/notificaciones.module.js';
import { SaludModule } from './salud/salud.module.js';
import { TruequesModule } from './trueques/trueques.module.js';
import { UsuariosModule } from './usuarios/usuarios.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema }),
    // Límite general por IP; los endpoints de autenticación usan uno más estricto (RNF09).
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 120 }],
      skipIf: () => process.env.NODE_ENV === 'test',
    }),
    PrismaModule,
    AuditoriaModule,
    CorreoModule,
    AlmacenamientoModule,
    SaludModule,
    AuthModule,
    UsuariosModule,
    CategoriasModule,
    PublicacionesModule,
    NotificacionesModule,
    TruequesModule,
    MensajesModule,
  ],
  // El límite de peticiones va primero para frenar abusos antes de validar tokens.
  providers: [{ provide: APP_GUARD, useClass: LimiteHttpGuard }],
})
export class AppModule {}
