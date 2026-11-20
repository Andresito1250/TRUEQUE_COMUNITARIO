import { Global, Module } from '@nestjs/common';
import { AlmacenamientoService } from './almacenamiento.service.js';
import { ArchivosController } from './archivos.controller.js';
import { ImagenesService } from './imagenes.service.js';

@Global()
@Module({
  controllers: [ArchivosController],
  providers: [AlmacenamientoService, ImagenesService],
  exports: [AlmacenamientoService, ImagenesService],
})
export class AlmacenamientoModule {}
