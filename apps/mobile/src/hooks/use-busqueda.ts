import { useInfiniteQuery } from '@tanstack/react-query';
import type { Coordenadas, FiltrosBusqueda, ResultadoBusqueda } from '@trueque/shared';

import { pedir } from '@/lib/api';

/** Arma la parte "?a=1&b=2" omitiendo los valores vacíos. */
export function consulta(params: Record<string, string | number | undefined | null>): string {
  const partes = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return partes.length ? `?${partes.join('&')}` : '';
}

/** El origen se redondea (~100 m) para no repetir la búsqueda por cada pequeño movimiento. */
const redondear = (o: Coordenadas | null) =>
  o ? { lat: Math.round(o.lat * 1000) / 1000, lng: Math.round(o.lng * 1000) / 1000 } : null;

/** RF-10 a RF-12: resultados paginados (20 por página) con desplazamiento infinito. */
export function useBusqueda(filtros: FiltrosBusqueda, origen: Coordenadas | null) {
  const o = redondear(origen);
  return useInfiniteQuery({
    queryKey: ['busqueda', filtros, o],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      pedir<ResultadoBusqueda>(
        `/api/v1/publicaciones${consulta({ ...filtros, lat: o?.lat, lng: o?.lng, pagina: pageParam })}`,
      ),
    getNextPageParam: (ultima) => ultima.siguientePagina,
  });
}
