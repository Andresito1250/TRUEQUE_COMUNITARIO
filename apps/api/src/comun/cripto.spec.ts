import { generarCodigo, hmac, igualesSeguro, tokenAleatorio } from './cripto.js';

describe('cripto', () => {
  it('genera códigos de exactamente 6 dígitos', () => {
    for (let i = 0; i < 200; i++) expect(generarCodigo()).toMatch(/^\d{6}$/);
  });

  it('genera tokens distintos y largos', () => {
    const a = tokenAleatorio();
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect(a).not.toBe(tokenAleatorio());
  });

  it('el hmac depende de la clave y se compara de forma segura', () => {
    expect(hmac('123456', 'k1')).not.toBe(hmac('123456', 'k2'));
    expect(igualesSeguro(hmac('x', 'k'), hmac('x', 'k'))).toBe(true);
    expect(igualesSeguro(hmac('x', 'k'), hmac('y', 'k'))).toBe(false);
    expect(igualesSeguro('abc', 'abcd')).toBe(false);
  });
});
