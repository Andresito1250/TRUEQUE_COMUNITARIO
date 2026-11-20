import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Bandeja,
  CancelarPropuestaDto,
  ContrapropuestaDto,
  CrearPropuestaDto,
  EncuentroDto,
  PropuestaDetalle,
  PropuestaResumen,
  PublicacionResumen,
  PuntoEncuentro,
} from '@trueque/shared';

import { pedir } from '@/lib/api';

export const clavesTrueque = {
  bandeja: (b: Bandeja) => ['propuestas', 'bandeja', b] as const,
  detalle: (id: string) => ['propuestas', 'detalle', id] as const,
};

/** Tras cualquier cambio de un trueque se refrescan bandejas, publicaciones y avisos. */
function useAlCambiar() {
  const qc = useQueryClient();
  return (p: PropuestaDetalle) => {
    qc.setQueryData(clavesTrueque.detalle(p.id), p);
    void qc.invalidateQueries({ queryKey: ['propuestas', 'bandeja'] });
    void qc.invalidateQueries({ queryKey: ['publicaciones'] });
    void qc.invalidateQueries({ queryKey: ['busqueda'] });
    void qc.invalidateQueries({ queryKey: ['actividad'] });
  };
}

export function useBandeja(bandeja: Bandeja) {
  return useQuery({
    queryKey: clavesTrueque.bandeja(bandeja),
    queryFn: () => pedir<PropuestaResumen[]>(`/api/v1/propuestas?bandeja=${bandeja}`),
  });
}

export function usePropuesta(id: string) {
  return useQuery({
    queryKey: clavesTrueque.detalle(id),
    queryFn: () => pedir<PropuestaDetalle>(`/api/v1/propuestas/${id}`),
  });
}

/** RF-14 */
export function useCrearPropuesta() {
  const alCambiar = useAlCambiar();
  return useMutation({
    mutationFn: (dto: CrearPropuestaDto) =>
      pedir<PropuestaDetalle>('/api/v1/propuestas', { method: 'POST', cuerpo: dto }),
    onSuccess: alCambiar,
  });
}

type Accion =
  | { accion: 'aceptar' | 'rechazar' | 'confirmar' }
  | { accion: 'cancelar'; cuerpo: CancelarPropuestaDto }
  | { accion: 'encuentro'; cuerpo: EncuentroDto }
  | { accion: 'contrapropuesta'; cuerpo: ContrapropuestaDto };

/** RF-15 a RF-18: una sola mutación para todas las transiciones. */
export function useAccionPropuesta(id: string) {
  const alCambiar = useAlCambiar();
  return useMutation({
    mutationFn: (a: Accion) =>
      pedir<PropuestaDetalle>(`/api/v1/propuestas/${id}/${a.accion}`, {
        method: 'POST',
        cuerpo: 'cuerpo' in a ? a.cuerpo : {},
      }),
    onSuccess: alCambiar,
  });
}

/** RF-16 */
export function usePuntosEncuentro(propuestaId: string) {
  return useQuery({
    queryKey: ['puntos-encuentro', propuestaId],
    queryFn: () => pedir<PuntoEncuentro[]>(`/api/v1/puntos-encuentro?propuestaId=${propuestaId}`),
    staleTime: 10 * 60_000,
  });
}

/** Publicaciones disponibles de otra persona (para la contrapropuesta). */
export function useDisponiblesDe(usuarioId: string | undefined) {
  return useQuery({
    queryKey: ['publicaciones', 'de', usuarioId],
    queryFn: () => pedir<PublicacionResumen[]>(`/api/v1/usuarios/${usuarioId}/publicaciones`),
    enabled: !!usuarioId,
  });
}
