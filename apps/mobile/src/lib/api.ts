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
    /** Código de negocio enviado por el API (p. ej. CORREO_NO_VERIFICADO). */
    readonly codigo?: string,
  ) {
    super(mensaje);
  }
}

const SIN_CONEXION = 'No pudimos conectarnos. Revisa tu conexión a internet e inténtalo de nuevo.';

/** Mensaje comprensible para el usuario a partir de cualquier error (RNF07). */
export function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorApi) return error.message;
  return SIN_CONEXION;
}

/** Quita el prefijo "campo: " que agrega la validación del API. */
function limpiarMensaje(m: string): string {
  return m.replace(/^[\w.]+: /, '');
}

/** Lo que el store de sesión le presta al cliente HTTP (evita importaciones circulares). */
type ProveedorAuth = {
  obtenerAccess(): string | null;
  /** Intenta renovar la sesión; devuelve el nuevo access token o null. */
  renovar(): Promise<string | null>;
};
let proveedor: ProveedorAuth | null = null;
export function configurarAuth(p: ProveedorAuth) {
  proveedor = p;
}

/** Acceso a la sesión para clientes que no usan pedir() (el socket de tiempo real). */
export const sesionApi = {
  access: () => proveedor?.obtenerAccess() ?? null,
  renovar: () => proveedor?.renovar() ?? Promise.resolve(null),
};

type Opciones = Omit<RequestInit, 'body'> & {
  /** Cuerpo que se envía como JSON, o FormData para subir archivos. */
  cuerpo?: unknown;
  /** false para no enviar el token ni reintentar con refresh (endpoints de autenticación). */
  auth?: boolean;
};

/** Petición al API: agrega el token, renueva la sesión una vez si vence y traduce los errores. */
export async function pedir<T>(
  ruta: string,
  { cuerpo, auth = true, ...init }: Opciones = {},
): Promise<T> {
  const esFormulario = cuerpo instanceof FormData;
  const ejecutar = (token: string | null) =>
    fetch(`${API_URL}${ruta}`, {
      ...init,
      body: cuerpo === undefined ? undefined : esFormulario ? cuerpo : JSON.stringify(cuerpo),
      headers: {
        // Con FormData, fetch pone el Content-Type con el separador de partes.
        ...(esFormulario ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });

  let res: Response;
  try {
    const token = auth ? (proveedor?.obtenerAccess() ?? null) : null;
    res = await ejecutar(token);
    if (res.status === 401 && token && proveedor) {
      const nuevo = await proveedor.renovar();
      if (nuevo) res = await ejecutar(nuevo);
    }
  } catch (e) {
    // En desarrollo se muestra la causa real en la terminal de Metro.
    if (__DEV__) console.warn(`[api] ${init.method ?? 'GET'} ${ruta} falló:`, e);
    throw new ErrorApi(0, SIN_CONEXION);
  }

  const datos = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const crudo = datos?.message ?? 'Ocurrió un error inesperado. Inténtalo de nuevo.';
    const mensaje = Array.isArray(crudo)
      ? crudo.map(limpiarMensaje).join('\n')
      : limpiarMensaje(String(crudo));
    throw new ErrorApi(res.status, mensaje, datos?.codigo);
  }
  return datos as T;
}

/** El API devuelve rutas relativas (/api/v1/archivos/...) cuando sirve las imágenes él mismo. */
export function urlArchivo(url: string): string;
export function urlArchivo(url: string | null | undefined): string | null;
export function urlArchivo(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith('/') ? `${API_URL}${url}` : url;
}
