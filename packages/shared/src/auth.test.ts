import { describe, expect, it } from 'vitest';
import { actualizarPerfilSchema, contrasenaSchema, registroSchema } from './auth.js';

const valido = {
  nombre: '  Ana Pérez ',
  correo: ' Ana@Gmail.COM ',
  contrasena: 'trueque123',
  localidad: 'SUBA',
  aceptaPoliticaDatos: true,
  aceptaTerminos: true,
};

describe('registroSchema (RF-01)', () => {
  it('normaliza nombre y correo', () => {
    const r = registroSchema.parse(valido);
    expect(r.nombre).toBe('Ana Pérez');
    expect(r.correo).toBe('ana@gmail.com');
  });

  it('exige aceptar la política de datos (Ley 1581)', () => {
    const r = registroSchema.safeParse({ ...valido, aceptaPoliticaDatos: false });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toMatch(/política de tratamiento de datos/);
  });

  it('exige aceptar los términos de uso (RNF12)', () => {
    expect(registroSchema.safeParse({ ...valido, aceptaTerminos: false }).success).toBe(false);
  });

  it('rechaza localidades fuera del piloto', () => {
    expect(registroSchema.safeParse({ ...valido, localidad: 'USME' }).success).toBe(false);
  });
});

describe('contrasenaSchema', () => {
  it.each([
    ['corta1', /8 caracteres/],
    ['solamenteletras', /número/],
    ['1234567890', /letra/],
  ])('rechaza %s', (clave, mensaje) => {
    const r = contrasenaSchema.safeParse(clave);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toMatch(mensaje);
  });

  it('acepta una contraseña con letras y números', () => {
    expect(contrasenaSchema.safeParse('bogota2026').success).toBe(true);
  });
});

describe('actualizarPerfilSchema (RF-05)', () => {
  it('permite actualizar un solo campo', () => {
    expect(actualizarPerfilSchema.parse({ descripcion: 'Me gusta leer' })).toEqual({
      descripcion: 'Me gusta leer',
    });
  });

  it('valida el teléfono', () => {
    expect(actualizarPerfilSchema.safeParse({ telefonoContacto: '300-abc' }).success).toBe(false);
    expect(actualizarPerfilSchema.safeParse({ telefonoContacto: '3001234567' }).success).toBe(true);
  });
});
