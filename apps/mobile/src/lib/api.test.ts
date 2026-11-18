import { ErrorApi, mensajeDeError, resolverUrlApi } from './api';

describe('resolverUrlApi', () => {
  it('usa la URL explícita sin barra final', () => {
    expect(resolverUrlApi('https://api.trueque.co/', undefined)).toBe('https://api.trueque.co');
  });

  it('deduce la IP del PC desde Metro para Expo Go', () => {
    expect(resolverUrlApi(undefined, '192.168.1.20:8081')).toBe('http://192.168.1.20:3000');
  });

  it('cae en localhost si no hay datos', () => {
    expect(resolverUrlApi(undefined, undefined)).toBe('http://localhost:3000');
  });
});

describe('mensajeDeError (RNF07)', () => {
  it('muestra el mensaje del servidor', () => {
    expect(mensajeDeError(new ErrorApi(409, 'La propuesta ya fue respondida'))).toBe(
      'La propuesta ya fue respondida',
    );
  });

  it('muestra un mensaje amable ante fallas de red', () => {
    expect(mensajeDeError(new TypeError('Network request failed'))).toMatch(/conexión/);
  });
});
