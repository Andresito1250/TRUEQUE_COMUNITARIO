import Constants from 'expo-constants';

/**
 * URL base del API.
 * - Si existe EXPO_PUBLIC_API_URL, se usa (despliegue o túnel).
 * - En desarrollo con Expo Go se deduce la IP del PC desde el servidor de Metro,
 *   así el celular en la misma Wi-Fi llega a http://<ip-del-pc>:3000.
 */
export function resolverUrlApi(
  urlExplicita: string | undefined = process.env.EXPO_PUBLIC_API_URL,
  hostUri: string | undefined = Constants.expoConfig?.hostUri,
): string {
  if (urlExplicita) return urlExplicita.replace(/\/+$/, '');
  const host = hostUri?.split(':')[0];
  return `http://${host || 'localhost'}:3000`;
}

export const API_URL = resolverUrlApi();

export class ErrorApi extends Error {
  constructor(
    readonly estado: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

/** Mensaje comprensible para el usuario a partir de cualquier error (RNF07). */
export function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorApi) return error.message;
  return 'No pudimos conectarnos. Revisa tu conexión a internet e inténtalo de nuevo.';
}

export async function pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${ruta}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new ErrorApi(0, mensajeDeError(null));
  }
  const cuerpo = await res.json().catch(() => null);
  if (!res.ok) {
    const mensaje = cuerpo?.message ?? 'Ocurrió un error inesperado. Inténtalo de nuevo.';
    throw new ErrorApi(res.status, Array.isArray(mensaje) ? mensaje.join('\n') : String(mensaje));
  }
  return cuerpo as T;
}
