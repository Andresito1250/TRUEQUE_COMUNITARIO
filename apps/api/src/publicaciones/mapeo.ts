import type { PublicacionResumen } from '@trueque/shared';
import type { AlmacenamientoService } from '../almacenamiento/almacenamiento.service.js';
import type { Prisma } from '../generated/prisma/client.js';

/** Relaciones que necesita cualquier listado o detalle de publicaciones. */
export const INCLUIR = {
  categoria: { select: { id: true, nombre: true, icono: true } },
  imagenes: { orderBy: { orden: 'asc' } },
} satisfies Prisma.PublicacionInclude;

export type PublicacionCompleta = Prisma.PublicacionGetPayload<{ include: typeof INCLUIR }>;

export function aResumen(
  p: PublicacionCompleta,
  almacenamiento: AlmacenamientoService,
): PublicacionResumen {
  return {
    id: p.id,
    titulo: p.titulo,
    tipo: p.tipo,
    estado: p.estado,
    estadoConservacion: p.estadoConservacion,
    localidad: p.localidad,
    categoria: p.categoria,
    miniaturaUrl: almacenamiento.url(p.imagenes[0]?.miniaturaUrl ?? null),
    fechaPublicacion: p.fechaPublicacion.toISOString(),
  };
}
