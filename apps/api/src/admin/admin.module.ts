import { Module } from '@nestjs/common';
import { MensajesModule } from '../mensajes/mensajes.module.js';
import { TruequesModule } from '../trueques/trueques.module.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

@Module({
  imports: [TruequesModule, MensajesModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
