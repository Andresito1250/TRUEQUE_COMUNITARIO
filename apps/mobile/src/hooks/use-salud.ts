import { useQuery } from '@tanstack/react-query';
import type { Salud } from '@trueque/shared';

import { pedir } from '@/lib/api';

/** Consulta GET /health para mostrar si la app se conecta al servidor. */
export function useSalud() {
  return useQuery({
    queryKey: ['salud'],
    queryFn: () => pedir<Salud>('/health'),
    retry: 0,
  });
}
