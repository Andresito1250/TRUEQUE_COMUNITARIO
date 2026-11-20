import { describe, expect, it } from 'vitest';
import {
  busquedaSchema,
  contarFiltros,
  formatearDistancia,
  origenValido,
  redondearDistancia,
  textoATsquery,
} from './busqueda.js';

describe('textoATsquery (RF-10)', () => {
  it('busca cada palabra como prefijo y exige todas', () => {
    expect(textoATsquery('Bici roja')).toBe('bici:* & roja:*');
  });

  it('conserva tildes y eñes (el API las quita con unaccent)', () => {
    expect(textoATsquery('Muñeca canción')).toBe('muñeca:* & canción:*');
  });

  it('descarta símbolos que romperían la consulta', () => {
    expect(textoATsquery("libro's & (cocina) | !")).toBe('libro:* & cocina:*');
  });

  it('devuelve null si no hay palabras útiles', () => {
    expect(textoATsquery('  ! a ')).toBeNull();
    expect(textoATsquery(undefined)).toBeNull();
  });
});

describe('busquedaSchema (RF-11, RF-12)', () => {
  it('convierte los parámetros de la URL e ignora los vacíos', () => {
    const r = busquedaSchema.parse({ q: '', categoriaId: '3', radioKm: '5', tipo: 'BIEN' });
    expect(r).toEqual({ categoriaId: 3, radioKm: 5, tipo: 'BIEN' });
  });

  it('limita el radio entre 1 y 10 km', () => {
    expect(busquedaSchema.safeParse({ radioKm: '0' }).success).toBe(false);
    expect(busquedaSchema.safeParse({ radioKm: '11' }).success).toBe(false);
  });

  it('exige latitud y longitud juntas', () => {
    expect(busquedaSchema.safeParse({ lat: '4.7' }).success).toBe(false);
    expect(busquedaSchema.safeParse({ lat: '4.7', lng: '-74.1' }).success).toBe(true);
  });

  it('cuenta los filtros activos', () => {
    expect(contarFiltros({ q: 'x', categoriaId: 1, radioKm: 3 })).toBe(2);
  });
});

describe('distancias (RF-12, RF-13)', () => {
  it('ignora orígenes fuera de Bogotá', () => {
    expect(origenValido(6.24, -75.58)).toBeNull();
    expect(origenValido(4.7, -74.1)).toEqual({ lat: 4.7, lng: -74.1 });
  });

  it('redondea a 100 m', () => {
    expect(redondearDistancia(1249)).toBe(1200);
    expect(redondearDistancia(12)).toBe(100);
  });

  it('formatea en español sin dar más precisión de la real', () => {
    expect(formatearDistancia(300)).toBe('a menos de 500 m');
    expect(formatearDistancia(800)).toBe('a 800 m');
    expect(formatearDistancia(1200)).toBe('a 1,2 km');
    expect(formatearDistancia(3000)).toBe('a 3 km');
    expect(formatearDistancia(12_400)).toBe('a 12 km');
  });
});
