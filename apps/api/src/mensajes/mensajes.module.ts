import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MensajesController } from './mensajes.controller.js';
import { MensajesService } from './mensajes.service.js';
import { TiempoRealGateway } from './tiempo-real.gateway.js';

@Module({
  imports: [AuthModule],
  controllers: [MensajesController],
  providers: [MensajesService, TiempoRealGateway],
})
export class MensajesModule {}
