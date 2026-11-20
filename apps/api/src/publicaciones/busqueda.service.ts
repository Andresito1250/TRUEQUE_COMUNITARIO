import { Injectable } from '@nestjs/common';
import {
  type Busqueda,
  LIMITES,
  type OrdenBusqueda,
  type PublicacionCercana,
  redondearDistancia,
  type ResultadoBusqueda,
  textoATsquery,
} from '@trueque/shared';
import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service.js';
import { origenDeConsulta, sqlPunto } from '../comun/ubicacion.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { aResumen, INCLUIR } from './mapeo.js';

type Fila = { id: string; metros: number; lat: number; lng: number };

/** Redondeo del punto que se envía al mapa (≈ 110 m), sobre la ubicación ya desplazada (D9). */
const redondearCoord = (v: number) => Math.round(v * 1000) / 1000;

/**
 * Módulo 3: búsqueda por palabra clave (RF-10), filtros (RF-11) y publicaciones cercanas (RF-12).
 * Una sola consulta SQL usa el índice GIN del texto y el índice GiST de la ubicación.
 */
@Injectable()
export class BusquedaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly almacenamiento: AlmacenamientoService,
  ) {}

  async buscar(usuarioId: string, b: Busqueda): Promise<ResultadoBusqueda> {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: usuarioId },
      select: { localidad: true },
    });
    const origen = origenDeConsulta(b.lat, b.lng, usuario.localidad);
    const punto = sqlPunto(origen);
    const tsquery = textoATsquery(b.q);
    const consulta = tsquery
      ? Prisma.sql`to_tsquery('spanish', public.f_unaccent(${tsquery}))`
      : null;

    // Solo publicaciones disponibles de otras personas con la cuenta activa.
    const condiciones: Prisma.Sql[] = [
      Prisma.sql`p.estado = 'DISPONIBLE'`,
      Prisma.sql`p."usuarioId" <> ${usuarioId}::uuid`,
      Prisma.sql`u.estado = 'ACTIVO'`,
      Prisma.sql`p.ubicacion IS NOT NULL`,
    ];
    if (consulta) {
      condiciones.push(
        Prisma.sql`public.publicacion_documento(p.titulo, p.descripcion) @@ ${consulta}`,
      );
    }
    if (b.categoriaId) condiciones.push(Prisma.sql`p."categoriaId" = ${b.categoriaId}`);
    if (b.tipo) condiciones.push(Prisma.sql`p.tipo = ${b.tipo}::"TipoPublicacion"`);
    if (b.estadoConservacion) {
      condiciones.push(
        Prisma.sql`p."estadoConservacion" = ${b.estadoConservacion}::"EstadoConservacion"`,
      );
    }
    if (b.localidad) condiciones.push(Prisma.sql`p.localidad = ${b.localidad}::"Localidad"`);
    if (b.radioKm) {
      condiciones.push(Prisma.sql`ST_DWithin(p.ubicacion, ${punto}, ${b.radioKm * 1000})`);
    }

    const orden: OrdenBusqueda = b.orden ?? (consulta ? 'relevancia' : 'cercania');
    const ordenSql =
      orden === 'recientes'
        ? Prisma.sql`p."fechaPublicacion" DESC, p.id`
        : orden === 'relevancia' && consulta
          ? Prisma.sql`ts_rank(public.publicacion_documento(p.titulo, p.descripcion), ${consulta}) DESC, metros, p.id`
          : Prisma.sql`metros, p.id`;

    const pagina = b.pagina ?? 1;
    const tamano = LIMITES.TAMANO_PAGINA;
    const filas = await this.prisma.$queryRaw<Fila[]>`
      SELECT p.id,
             ST_Distance(p.ubicacion, ${punto}) AS metros,
             ST_Y(p.ubicacion::geometry) AS lat,
             ST_X(p.ubicacion::geometry) AS lng
      FROM "Publicacion" p
      JOIN "Usuario" u ON u.id = p."usuarioId"
      WHERE ${Prisma.join(condiciones, ' AND ')}
      ORDER BY ${ordenSql}
      LIMIT ${tamano + 1} OFFSET ${(pagina - 1) * tamano}`;

    const hayMas = filas.length > tamano;
    const visibles = filas.slice(0, tamano);
    const publicaciones = await this.prisma.publicacion.findMany({
      where: { id: { in: visibles.map((f) => f.id) } },
      include: INCLUIR,
    });
    const porId = new Map(publicaciones.map((p) => [p.id, p]));

    const items: PublicacionCercana[] = visibles.flatMap((f) => {
      const p = porId.get(f.id);
      if (!p) return [];
      return [
        {
          ...aResumen(p, this.almacenamiento),
          distanciaM: redondearDistancia(f.metros),
          ubicacionAproximada: { lat: redondearCoord(f.lat), lng: redondearCoord(f.lng) },
        },
      ];
    });

    return {
      items,
      siguientePagina: hayMas ? pagina + 1 : null,
      origen: { lat: origen.lat, lng: origen.lng, fuente: origen.fuente },
    };
  }
}
