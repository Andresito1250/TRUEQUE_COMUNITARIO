import { Module } from '@nestjs/common';
import { UsuariosModule } from '../usuarios/usuarios.module.js';
import { BusquedaService } from './busqueda.service.js';
import { PublicacionesController } from './publicaciones.controller.js';
import { PublicacionesService } from './publicaciones.service.js';

@Module({
  imports: [UsuariosModule],
  controllers: [PublicacionesController],
  providers: [PublicacionesService, BusquedaService],
  exports: [PublicacionesService],
})
export class PublicacionesModule {}
