import type { RespuestaLogin } from '@trueque/shared';
import { router } from 'expo-router';

import { useSesion } from '@/store/sesion';

/**
 * Procesa la respuesta de login/verificación: guarda la sesión (y el guard de rutas lleva a la app)
 * o abre el paso de verificación en dos pasos.
 */
export function useIniciarSesion() {
  const iniciar = useSesion((s) => s.iniciar);
  return async (r: RespuestaLogin) => {
    if (r.requiere2fa) {
      router.push({ pathname: '/login-2fa', params: { token: r.tokenTemporal } });
      return;
    }
    await iniciar(r);
  };
}
