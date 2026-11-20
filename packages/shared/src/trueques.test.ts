import { describe, expect, it } from 'vitest';
import { EstadoPropuesta } from './enums.js';
import {
  accionesPermitidas,
  contrapropuestaSchema,
  crearPropuestaSchema,
  encuentroSchema,
  puede,
  REGLAS,
} from './trueques.js';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const TODOS = Object.values(EstadoPropuesta);

describe('máquina de estados del trueque (plan §3)', () => {
  it('pendiente: el receptor responde y el proponente solo puede cancelar', () => {
    expect(accionesPermitidas('PENDIENTE_RESPUESTA', 'receptor').sort()).toEqual(
      ['aceptar', 'chatear', 'contraproponer', 'rechazar'].sort(),
    );
    expect(accionesPermitidas('PENDIENTE_RESPUESTA', 'proponente').sort()).toEqual(
      ['cancelar', 'chatear'].sort(),
    );
  });

  it('el proponente no puede aceptar ni rechazar su propia propuesta', () => {
    expect(puede('aceptar', 'PENDIENTE_RESPUESTA', 'proponente')).toBe(false);
    expect(puede('rechazar', 'PENDIENTE_RESPUESTA', 'proponente')).toBe(false);
  });

  it('aceptada: cualquiera acuerda el encuentro o cancela, pero aún no se marca hecho', () => {
    for (const rol of ['proponente', 'receptor'] as const) {
      expect(accionesPermitidas('ACEPTADA', rol).sort()).toEqual(
        ['acordarEncuentro', 'cancelar', 'chatear'].sort(),
      );
    }
  });

  it('D4: con el encuentro acordado, cualquiera de las dos partes marca hecho', () => {
    expect(puede('confirmar', 'ESPERANDO_CONFIRMACION', 'proponente')).toBe(true);
    expect(puede('confirmar', 'ESPERANDO_CONFIRMACION', 'receptor')).toBe(true);
    expect(puede('acordarEncuentro', 'ESPERANDO_CONFIRMACION', 'receptor')).toBe(true);
  });

  it('después del trueque solo se puede calificar', () => {
    expect(accionesPermitidas('CALIFICACION_HABILITADA', 'receptor')).toEqual(['calificar']);
  });

  it('los estados finales no permiten ninguna acción', () => {
    for (const estado of ['RECHAZADA', 'CANCELADA', 'CONTRAPROPUESTA', 'FINALIZADO'] as const) {
      expect(accionesPermitidas(estado, 'proponente')).toEqual([]);
      expect(accionesPermitidas(estado, 'receptor')).toEqual([]);
    }
  });

  it('confirmar solo es posible desde "esperando confirmación"', () => {
    const desde = TODOS.filter((e) => puede('confirmar', e, 'receptor'));
    expect(desde).toEqual(['ESPERANDO_CONFIRMACION']);
  });

  it('todas las reglas usan estados existentes', () => {
    for (const r of REGLAS) for (const e of r.desde) expect(TODOS).toContain(e);
  });
});

describe('validación de propuestas (RF-14 a RF-16)', () => {
  it('exige ofrecer al menos una publicación y sin repetir', () => {
    expect(crearPropuestaSchema.safeParse({ publicacionId: uuid(1), ofrecidas: [] }).success).toBe(
      false,
    );
    expect(
      crearPropuestaSchema.safeParse({ publicacionId: uuid(1), ofrecidas: [uuid(2), uuid(2)] })
        .success,
    ).toBe(false);
    expect(
      crearPropuestaSchema.parse({ publicacionId: uuid(1), ofrecidas: [uuid(2)], mensaje: '  ' }),
    ).toEqual({ publicacionId: uuid(1), ofrecidas: [uuid(2)] });
  });

  it('limita a 5 publicaciones por lado', () => {
    const seis = [1, 2, 3, 4, 5, 6].map(uuid);
    expect(
      contrapropuestaSchema.safeParse({ solicitadas: seis, ofrecidas: [uuid(9)] }).success,
    ).toBe(false);
  });

  it('el encuentro necesita un lugar y una fecha futura', () => {
    const manana = new Date(Date.now() + 86_400_000).toISOString();
    expect(encuentroSchema.safeParse({ fechaHora: manana }).success).toBe(false);
    expect(encuentroSchema.safeParse({ puntoEncuentroId: 1, fechaHora: manana }).success).toBe(
      true,
    );
    expect(
      encuentroSchema.safeParse({ puntoEncuentroId: 1, fechaHora: '2020-01-01T10:00:00.000Z' })
        .success,
    ).toBe(false);
  });
});
