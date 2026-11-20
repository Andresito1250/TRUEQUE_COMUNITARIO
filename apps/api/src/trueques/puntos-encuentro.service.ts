import { Injectable, NotFoundException } from '@nestjs/common';
import { type PuntoEncuentro, redondearDistancia } from '@trueque/shared';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

type Fila = Omit<PuntoEncuentro, 'ubicacion' | 'distanciaM'> & {
  lat: number;
  lng: number;
  metros: number | null;
};

const COLUMNAS = Prisma.sql`id, nombre, tipo::text AS tipo, localidad::text AS localidad, direccion,
  ST_Y(ubicacion::geometry) AS lat, ST_X(ubicacion::geometry) AS lng`;

/** RF-16: puntos de encuentro seguros (lugares públicos) de las localidades piloto. */
@Injectable()
export class PuntosEncuentroService {
  constructor(private readonly prisma: PrismaService) {}

  async obtener(id: number): Promise<PuntoEncuentro | null> {
    const [f] = await this.prisma.$queryRaw<Fila[]>`
      SELECT ${COLUMNAS}, NULL::float AS metros FROM "PuntoEncuentro" WHERE id = ${id}`;
    return f ? this.dto(f) : null;
  }

  /**
   * Lista los puntos activos. Si se indica una propuesta, se ordenan por distancia al punto
   * medio entre las publicaciones de las dos partes, para que a ninguno le quede muy lejos.
   */
  async listar(usuarioId: string, propuestaId?: string): Promise<PuntoEncuentro[]> {
    if (propuestaId) {
      const p = await this.prisma.propuestaTrueque.findUnique({
        where: { id: propuestaId },
        select: { proponenteId: true, receptorId: true },
      });
      if (!p || (p.proponenteId !== usuarioId && p.receptorId !== usuarioId)) {
        throw new NotFoundException('No encontramos esta propuesta.');
      }
      const filas = await this.prisma.$queryRaw<Fila[]>`
        WITH centro AS (
          SELECT ST_Centroid(ST_Collect(pub.ubicacion::geometry))::geography AS g
          FROM "PropuestaArticulo" a JOIN "Publicacion" pub ON pub.id = a."publicacionId"
          WHERE a."propuestaId" = ${propuestaId}::uuid AND pub.ubicacion IS NOT NULL
        )
        SELECT ${COLUMNAS}, ST_Distance(ubicacion, (SELECT g FROM centro)) AS metros
        FROM "PuntoEncuentro" WHERE activo
        ORDER BY metros NULLS LAST, nombre`;
      return filas.map((f) => this.dto(f));
    }
    const u = await this.prisma.usuario.findUniqueOrThrow({
      where: { id: usuarioId },
      select: { localidad: true },
    });
    const filas = await this.prisma.$queryRaw<Fila[]>`
      SELECT ${COLUMNAS}, NULL::float AS metros FROM "PuntoEncuentro" WHERE activo
      ORDER BY (localidad::text = ${u.localidad}) DESC, nombre`;
    return filas.map((f) => this.dto(f));
  }

  private dto(f: Fila): PuntoEncuentro {
    return {
      id: f.id,
      nombre: f.nombre,
      tipo: f.tipo,
      localidad: f.localidad,
      direccion: f.direccion,
      ubicacion: { lat: f.lat, lng: f.lng },
      distanciaM: f.metros === null ? null : redondearDistancia(f.metros),
    };
  }
}
