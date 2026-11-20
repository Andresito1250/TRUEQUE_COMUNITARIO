import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Categoria } from '@trueque/shared';
import { Publico } from '../comun/decoradores.js';
import { PrismaService } from '../prisma/prisma.service.js';

@ApiTags('categorias')
@Controller('categorias')
export class CategoriasController {
  constructor(private readonly prisma: PrismaService) {}

  @Publico()
  @Get()
  @ApiOperation({ summary: 'Categorías activas para publicaciones e intereses' })
  listar(): Promise<Categoria[]> {
    return this.prisma.categoria.findMany({
      where: { activa: true },
      select: { id: true, nombre: true, icono: true },
      orderBy: { nombre: 'asc' },
    });
  }
}
