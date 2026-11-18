import { describe, expect, it } from 'vitest';
import { EstadoPropuesta, LIMITES, Localidad, LOCALIDAD_NOMBRE } from './index.js';

describe('shared', () => {
  it('tiene nombre visible para cada localidad piloto', () => {
    for (const l of Object.values(Localidad)) expect(LOCALIDAD_NOMBRE[l]).toBeTruthy();
  });

  it('incluye todos los estados de la Figura 2', () => {
    expect(Object.keys(EstadoPropuesta)).toHaveLength(11);
  });

  it('respeta los límites de la Tabla 8', () => {
    expect(LIMITES.MAX_IMAGENES).toBe(5);
    expect(LIMITES.RADIO_MIN_KM).toBe(1);
    expect(LIMITES.RADIO_MAX_KM).toBe(10);
  });
});
