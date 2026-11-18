import { HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { saludSchema } from '@trueque/shared';
import type { PrismaService } from '../prisma/prisma.service.js';
import { SaludController } from './salud.controller.js';

function crear(queryRaw: () => Promise<unknown>) {
  const prisma = { $queryRaw: vi.fn(queryRaw) } as unknown as PrismaService;
  const status = vi.fn();
  const res = { status } as unknown as Response;
  return { controller: new SaludController(prisma), res, status };
}

describe('SaludController (RNF06)', () => {
  it('responde ok cuando la base de datos contesta', async () => {
    const { controller, res, status } = crear(() => Promise.resolve([{ '?column?': 1 }]));
    const salud = await controller.verificar(res);
    expect(saludSchema.parse(salud)).toMatchObject({
      estado: 'ok',
      baseDeDatos: 'ok',
    });
    expect(status).not.toHaveBeenCalled();
  });

  it('responde 503 cuando la base de datos falla', async () => {
    const { controller, res, status } = crear(() => Promise.reject(new Error('sin conexión')));
    const salud = await controller.verificar(res);
    expect(salud).toMatchObject({ estado: 'error', baseDeDatos: 'error' });
    expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
  });
});
