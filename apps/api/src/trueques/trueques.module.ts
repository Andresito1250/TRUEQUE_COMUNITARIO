import { Module } from '@nestjs/common';
import { PuntosEncuentroService } from './puntos-encuentro.service.js';
import { TruequesController } from './trueques.controller.js';
import { TruequesService } from './trueques.service.js';

@Module({
  controllers: [TruequesController],
  providers: [TruequesService, PuntosEncuentroService],
  exports: [TruequesService],
})
export class TruequesModule {}
