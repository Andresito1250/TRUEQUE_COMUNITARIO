import { Module } from '@nestjs/common';
import { CategoriasController } from './categorias.controller.js';

@Module({ controllers: [CategoriasController] })
export class CategoriasModule {}
