import type { PerfilPrivado, Tokens } from '@trueque/shared';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { configurarAuth, ErrorApi, pedir } from '@/lib/api';
import { queryClient } from '@/lib/query-client';

const CLAVE_REFRESH = 'trueque.refresh';
const CLAVE_ACCESS = 'trueque.access';
const CLAVE_USUARIO = 'trueque.usuario';

type EstadoSesion = {
  /** false mientras se lee la sesión guardada al abrir la app. */
  listo: boolean;
  usuario: PerfilPrivado | null;
  accessToken: string | null;
  refreshToken: string | null;
  iniciar(datos: Tokens & { usuario: PerfilPrivado }): Promise<void>;
  actualizarUsuario(usuario: PerfilPrivado): Promise<void>;
  /** Cierra la sesión local; con avisarAlServidor revoca también el refresh token (RF-03). */
  cerrar(opciones?: { avisarAlServidor?: boolean }): Promise<void>;
  restaurar(): Promise<void>;
};

/**
 * Sesión del usuario. Los tokens se guardan cifrados con SecureStore (RNF08).
 * Se guarda una copia del perfil para abrir la app sin conexión (RNF07).
 */
export const useSesion = create<EstadoSesion>((set, get) => ({
  listo: false,
  usuario: null,
  accessToken: null,
  refreshToken: null,

  async iniciar({ accessToken, refreshToken, usuario }) {
    set({ accessToken, refreshToken, usuario });
    await Promise.all([
      SecureStore.setItemAsync(CLAVE_ACCESS, accessToken),
      SecureStore.setItemAsync(CLAVE_REFRESH, refreshToken),
      SecureStore.setItemAsync(CLAVE_USUARIO, JSON.stringify(usuario)),
    ]);
  },

  async actualizarUsuario(usuario) {
    set({ usuario });
    await SecureStore.setItemAsync(CLAVE_USUARIO, JSON.stringify(usuario));
  },

  async cerrar({ avisarAlServidor = false } = {}) {
    const { refreshToken } = get();
    set({ accessToken: null, refreshToken: null, usuario: null });
    queryClient.clear();
    await Promise.all([
      SecureStore.deleteItemAsync(CLAVE_ACCESS),
      SecureStore.deleteItemAsync(CLAVE_REFRESH),
      SecureStore.deleteItemAsync(CLAVE_USUARIO),
    ]);
    if (avisarAlServidor && refreshToken) {
      await pedir('/api/v1/auth/logout', {
        method: 'POST',
        auth: false,
        cuerpo: { refreshToken },
      }).catch(() => undefined);
    }
  },

  async restaurar() {
    const [refreshToken, accessToken, usuarioGuardado] = await Promise.all([
      SecureStore.getItemAsync(CLAVE_REFRESH),
      SecureStore.getItemAsync(CLAVE_ACCESS),
      SecureStore.getItemAsync(CLAVE_USUARIO),
    ]);
    if (!refreshToken || !usuarioGuardado) {
      set({ listo: true });
      return;
    }
    // Se entra de inmediato con los datos guardados y se actualizan en segundo plano.
    set({
      refreshToken,
      accessToken,
      usuario: JSON.parse(usuarioGuardado) as PerfilPrivado,
      listo: true,
    });
    try {
      const usuario = await pedir<PerfilPrivado>('/api/v1/usuarios/me');
      await get().actualizarUsuario(usuario);
    } catch {
      // Sin conexión: se sigue con la copia local. Si la sesión venció, renovar() ya la cerró.
    }
  },
}));

let renovando: Promise<string | null> | null = null;

/** Renueva el access token una sola vez aunque varias peticiones fallen a la vez. */
function renovar(): Promise<string | null> {
  const { refreshToken } = useSesion.getState();
  if (!refreshToken) return Promise.resolve(null);
  renovando ??= (async () => {
    try {
      const t = await pedir<Tokens>('/api/v1/auth/refresh', {
        method: 'POST',
        auth: false,
        cuerpo: { refreshToken },
      });
      useSesion.setState({ accessToken: t.accessToken, refreshToken: t.refreshToken });
      await Promise.all([
        SecureStore.setItemAsync(CLAVE_ACCESS, t.accessToken),
        SecureStore.setItemAsync(CLAVE_REFRESH, t.refreshToken),
      ]);
      return t.accessToken;
    } catch (e) {
      // Solo se cierra la sesión si el servidor la rechazó, no por falta de conexión.
      if (e instanceof ErrorApi && e.estado === 401) await useSesion.getState().cerrar();
      return null;
    } finally {
      renovando = null;
    }
  })();
  return renovando;
}

configurarAuth({ obtenerAccess: () => useSesion.getState().accessToken, renovar });
