import { describe, expect, it } from 'vitest';
import { CENTRO_LOCALIDAD, dentroDeBogota, distanciaMetros, ofuscarUbicacion } from './geo.js';
import { crearPublicacionSchema } from './publicaciones.js';

const base = {
  titulo: 'Bicicleta de niño',
  descripcion: 'Rin 16, con rueditas, poco uso.',
  tipo: 'BIEN',
  categoriaId: 5,
  estadoConservacion: 'BUENO',
} as const;

describe('crearPublicacionSchema (RF-06)', () => {
  it('acepta un objeto válido', () => {
    expect(crearPublicacionSchema.parse(base)).toMatchObject({ titulo: 'Bicicleta de niño' });
  });

  it('exige el estado de conservación para objetos', () => {
    const r = crearPublicacionSchema.safeParse({ ...base, estadoConservacion: 'NO_APLICA' });
    expect(r.success).toBe(false);
  });

  it('guarda NO_APLICA en los servicios aunque envíen otro estado', () => {
    const r = crearPublicacionSchema.parse({
      ...base,
      tipo: 'SERVICIO',
      estadoConservacion: 'NUEVO',
    });
    expect(r.estadoConservacion).toBe('NO_APLICA');
  });

  it('valida longitudes con mensajes en español', () => {
    const r = crearPublicacionSchema.safeParse({ ...base, titulo: 'ab', descripcion: 'corta' });
    expect(r.error?.issues.map((i) => i.message)).toEqual([
      'El título debe tener al menos 3 caracteres',
      'Cuéntale a la comunidad un poco más (mínimo 10 caracteres)',
    ]);
  });
});

describe('geo (RF-12, D9)', () => {
  it('los centros de las localidades piloto están en Bogotá', () => {
    for (const c of Object.values(CENTRO_LOCALIDAD))
      expect(dentroDeBogota(c.lat, c.lng)).toBe(true);
    expect(dentroDeBogota(6.2442, -75.5812)).toBe(false); // Medellín
  });

  it('la ofuscación nunca supera la distancia máxima', () => {
    const origen = CENTRO_LOCALIDAD.SUBA;
    for (let i = 0; i < 500; i++) {
      const p = ofuscarUbicacion(origen.lat, origen.lng, 300);
      expect(distanciaMetros(origen, p)).toBeLessThanOrEqual(301);
    }
  });

  it('la ofuscación sí mueve el punto', () => {
    const p = ofuscarUbicacion(4.7, -74.1, 300, () => 1);
    expect(distanciaMetros({ lat: 4.7, lng: -74.1 }, p)).toBeCloseTo(300, -1);
  });

  it('calcula distancias conocidas', () => {
    // Suba ↔ Kennedy ≈ 14,5 km
    const d = distanciaMetros(CENTRO_LOCALIDAD.SUBA, CENTRO_LOCALIDAD.KENNEDY) / 1000;
    expect(d).toBeGreaterThan(13);
    expect(d).toBeLessThan(16);
  });
});
