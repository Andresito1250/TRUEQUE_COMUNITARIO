import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configurarApp } from '../src/configurar-app.js';
import { CorreoService } from '../src/correo/correo.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

/** Correos "enviados" durante la prueba, para leer los códigos sin depender de Mailpit. */
export type BuzonFalso = { ultimoCodigo(correo: string): string };

export async function crearApp(): Promise<{
  app: INestApplication<App>;
  prisma: PrismaService;
  buzon: BuzonFalso;
}> {
  const codigos = new Map<string, string>();
  const correoFalso = {
    enviarCodigoVerificacion: (correo: string, _n: string, codigo: string) => {
      codigos.set(correo, codigo);
      return Promise.resolve();
    },
    enviarCodigoRecuperacion: (correo: string, _n: string, codigo: string) => {
      codigos.set(correo, codigo);
      return Promise.resolve();
    },
  };

  const modulo = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(CorreoService)
    .useValue(correoFalso)
    .compile();
  const app = modulo.createNestApplication<INestApplication<App>>();
  configurarApp(app);
  await app.init();

  return {
    app,
    prisma: app.get(PrismaService),
    buzon: {
      ultimoCodigo: (correo) => {
        const c = codigos.get(correo);
        if (!c) throw new Error(`No se envió código a ${correo}`);
        return c;
      },
    },
  };
}

/** Borra los usuarios de prueba (correos @e2e.test) y todo lo que dependa de ellos. */
export async function limpiarUsuariosDePrueba(prisma: PrismaService) {
  await prisma.registroAuditoria.deleteMany({
    where: { actor: { correo: { endsWith: '@e2e.test' } } },
  });
  await prisma.usuario.deleteMany({
    where: {
      OR: [{ correo: { endsWith: '@e2e.test' } }, { correo: { startsWith: 'eliminado-' } }],
    },
  });
}
