import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CalificacionDto,
  CalificacionPublica,
  PerfilPublico,
  PropuestaDetalle,
  ReporteDto,
} from '@trueque/shared';

import { clavesTrueque } from '@/hooks/use-trueques';
import { pedir } from '@/lib/api';

/** RF-23: perfil público con reputación. */
export function usePerfilPublico(id: string) {
  return useQuery({
    queryKey: ['usuarios', id],
    queryFn: () => pedir<PerfilPublico>(`/api/v1/usuarios/${id}`),
  });
}

export function useCalificacionesDe(id: string) {
  return useQuery({
    queryKey: ['usuarios', id, 'calificaciones'],
    queryFn: () => pedir<CalificacionPublica[]>(`/api/v1/usuarios/${id}/calificaciones`),
  });
}

/** RF-22 */
export function useCalificar(propuestaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CalificacionDto) =>
      pedir<PropuestaDetalle>(`/api/v1/propuestas/${propuestaId}/calificacion`, {
        method: 'POST',
        cuerpo: dto,
      }),
    onSuccess: (p) => {
      qc.setQueryData(clavesTrueque.detalle(p.id), p);
      void qc.invalidateQueries({ queryKey: ['propuestas', 'bandeja'] });
      void qc.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });
}

/** RF-24 */
export function useReportar() {
  return useMutation({
    mutationFn: (dto: ReporteDto) =>
      pedir<{ id: string; ocultada: boolean }>('/api/v1/reportes', { method: 'POST', cuerpo: dto }),
  });
}
