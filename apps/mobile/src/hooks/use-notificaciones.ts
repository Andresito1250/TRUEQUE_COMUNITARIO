import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Notificacion, ResumenActividad } from '@trueque/shared';

import { pedir } from '@/lib/api';

/** RF-21: bandeja de notificaciones. */
export function useNotificaciones() {
  return useQuery({
    queryKey: ['notificaciones'],
    queryFn: () => pedir<Notificacion[]>('/api/v1/notificaciones'),
  });
}

/** Contadores de las insignias. El socket los refresca al instante; esto es el respaldo. */
export function useActividad(activo = true) {
  return useQuery({
    queryKey: ['actividad'],
    queryFn: () => pedir<ResumenActividad>('/api/v1/actividad'),
    enabled: activo,
    refetchInterval: 60_000,
  });
}

function useRefrescar() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['notificaciones'] });
    void qc.invalidateQueries({ queryKey: ['actividad'] });
  };
}

export function useMarcarLeida() {
  const refrescar = useRefrescar();
  return useMutation({
    mutationFn: (id: string) =>
      pedir<null>(`/api/v1/notificaciones/${id}/leida`, { method: 'PATCH' }),
    onSuccess: refrescar,
  });
}

export function useLeerTodas() {
  const refrescar = useRefrescar();
  return useMutation({
    mutationFn: () => pedir<null>('/api/v1/notificaciones/leer-todas', { method: 'POST' }),
    onSuccess: refrescar,
  });
}
