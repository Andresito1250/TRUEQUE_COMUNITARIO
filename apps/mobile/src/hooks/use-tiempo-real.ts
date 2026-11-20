import { useQueryClient } from '@tanstack/react-query';
import { EVENTOS } from '@trueque/shared';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { agregarMensaje, marcarVistos } from '@/hooks/use-chat';
import { conectarTiempoReal, desconectarTiempoReal } from '@/lib/tiempo-real';
import { useAvisos } from '@/store/avisos';

/**
 * Mantiene el socket abierto mientras hay sesión y aplica lo que llega: avisos (RF-21) y
 * mensajes (RF-20) se reflejan al instante en las pantallas abiertas y en las insignias.
 */
export function useTiempoReal(conSesion: boolean) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!conSesion) return;
    const s = conectarTiempoReal();
    const refrescarActividad = () => void qc.invalidateQueries({ queryKey: ['actividad'] });

    s.on(EVENTOS.NOTIFICACION, (n) => {
      useAvisos.getState().mostrar(n);
      void qc.invalidateQueries({ queryKey: ['notificaciones'] });
      refrescarActividad();
      if (n.ruta?.startsWith('/propuesta/')) {
        // Cambió un trueque: se refrescan su detalle, las bandejas y las publicaciones.
        void qc.invalidateQueries({ queryKey: ['propuestas'] });
        void qc.invalidateQueries({ queryKey: ['publicaciones'] });
      }
    });
    s.on(EVENTOS.NUEVO, (m) => {
      agregarMensaje(qc, m);
      refrescarActividad();
    });
    s.on(EVENTOS.LEIDO, ({ propuestaId, lectorId }) => marcarVistos(qc, propuestaId, lectorId));
    // Al reconectar pudo haberse perdido algo: se vuelve a consultar.
    s.on('connect', () => {
      refrescarActividad();
      void qc.invalidateQueries({ queryKey: ['chat'] });
    });

    // Al volver a la app desde el fondo se refrescan los contadores.
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') {
        refrescarActividad();
        if (!s.connected) s.connect();
      }
    });
    return () => {
      sub.remove();
      desconectarTiempoReal();
    };
  }, [conSesion, qc]);
}
