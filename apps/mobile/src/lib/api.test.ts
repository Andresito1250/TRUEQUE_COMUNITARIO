import { configurarAuth, ErrorApi, mensajeDeError, pedir, resolverUrlApi } from './api';

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

function respuesta(estado: number, cuerpo: unknown) {
  return Promise.resolve({
    ok: estado >= 200 && estado < 300,
    status: estado,
    json: () => Promise.resolve(cuerpo),
  } as Response);
}

describe('pedir', () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock;
  });

  it('envía el token y, si vence, renueva la sesión y reintenta una vez (RNF09)', async () => {
    let token = 'viejo';
    const renovar = jest.fn(async () => {
      token = 'nuevo';
      return token;
    });
    configurarAuth({ obtenerAccess: () => token, renovar });
    fetchMock
      .mockReturnValueOnce(respuesta(401, { message: 'vencido' }))
      .mockReturnValueOnce(respuesta(200, { ok: 1 }));

    await expect(pedir('/api/v1/usuarios/me')).resolves.toEqual({ ok: 1 });
    expect(renovar).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer viejo');
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer nuevo');
  });

  it('no envía token ni renueva en endpoints de autenticación', async () => {
    const renovar = jest.fn();
    configurarAuth({ obtenerAccess: () => 'algo', renovar });
    fetchMock.mockReturnValueOnce(
      respuesta(401, { message: 'El correo o la contraseña no son correctos.' }),
    );

    await expect(
      pedir('/api/v1/auth/login', { method: 'POST', auth: false, cuerpo: {} }),
    ).rejects.toMatchObject({
      estado: 401,
      message: 'El correo o la contraseña no son correctos.',
    });
    expect(renovar).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('expone el código de negocio y limpia el prefijo de validación', async () => {
    configurarAuth({ obtenerAccess: () => null, renovar: jest.fn() });
    fetchMock.mockReturnValueOnce(
      respuesta(403, {
        codigo: 'CORREO_NO_VERIFICADO',
        message: 'correo: Aún no has verificado tu correo.',
      }),
    );
    await expect(pedir('/x', { auth: false })).rejects.toMatchObject({
      codigo: 'CORREO_NO_VERIFICADO',
      message: 'Aún no has verificado tu correo.',
    });
  });

  it('traduce una falla de red a un mensaje comprensible (RNF07)', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(pedir('/x', { auth: false })).rejects.toMatchObject({ estado: 0 });
  });
});
