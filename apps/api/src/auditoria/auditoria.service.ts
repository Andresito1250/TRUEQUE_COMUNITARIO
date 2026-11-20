import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

type Registro = {
  accion: string;
  actorId?: string | null;
  entidad: string;
  entidadId: string;
  detalle?: Prisma.InputJsonValue;
};

/** Trazabilidad de acciones relevantes: cuentas, intercambios, reportes y moderación (RNF10). */
@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Registra la acción. Nunca interrumpe la operación principal si la auditoría falla. */
  async registrar(r: Registro, tx: Prisma.TransactionClient = this.prisma): Promise<void> {
    try {
      await tx.registroAuditoria.create({
        data: {
          accion: r.accion,
          actorId: r.actorId ?? null,
          entidad: r.entidad,
          entidadId: r.entidadId,
          detalle: r.detalle,
        },
      });
    } catch (error) {
      this.logger.error(`No se pudo registrar la auditoría ${r.accion}`, error as Error);
    }
  }
}
