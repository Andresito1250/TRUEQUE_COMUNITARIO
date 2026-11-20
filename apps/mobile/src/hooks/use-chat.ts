import {
  type InfiniteData,
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type { MensajeChat, PaginaMensajes } from '@trueque/shared';

import { ErrorApi, pedir } from '@/lib/api';
import { enviarPorSocket } from '@/lib/tiempo-real';

type DatosChat = InfiniteData<PaginaMensajes, string | null>;
export const claveChat = (propuestaId: string) => ['chat', propuestaId] as const;

/** RF-20: historial del chat, del más reciente al más antiguo (para una lista invertida). */
export function useChat(propuestaId: string) {
  return useInfiniteQuery({
    queryKey: claveChat(propuestaId),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      pedir<PaginaMensajes>(
        `/api/v1/propuestas/${propuestaId}/mensajes${pageParam ? `?antes=${encodeURIComponent(pageParam)}` : ''}`,
      ),
    getNextPageParam: (ultima) => ultima.anteriores,
  });
}

/** Agrega un mensaje al principio del historial guardado (sin duplicar). */
export function agregarMensaje(qc: QueryClient, m: MensajeChat) {
  qc.setQueryData<DatosChat>(claveChat(m.propuestaId), (datos) => {
    if (!datos?.pages[0]) return datos;
    if (datos.pages.some((p) => p.mensajes.some((x) => x.id === m.id))) return datos;
    const [primera, ...resto] = datos.pages;
    return { ...datos, pages: [{ ...primera, mensajes: [m, ...primera.mensajes] }, ...resto] };
  });
}

/** La otra persona leyó: mis mensajes pasan a "Visto". */
export function marcarVistos(qc: QueryClient, propuestaId: string, lectorId: string) {
  qc.setQueryData<DatosChat>(claveChat(propuestaId), (datos) =>
    datos
      ? {
          ...datos,
          pages: datos.pages.map((p) => ({
            ...p,
            mensajes: p.mensajes.map((m) =>
              m.emisorId !== lectorId ? { ...m, estado: 'LEIDO' as const } : m,
            ),
          })),
        }
      : datos,
  );
}

/** Envía por el socket y, si no hay conexión, por REST. */
export function useEnviarMensaje(propuestaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contenido: string) => {
      const r = await enviarPorSocket(propuestaId, contenido);
      if (r?.ok) return r.datos;
      if (r && !r.ok) throw new ErrorApi(400, r.error);
      return pedir<MensajeChat>(`/api/v1/propuestas/${propuestaId}/mensajes`, {
        method: 'POST',
        cuerpo: { contenido },
      });
    },
    onSuccess: (m) => agregarMensaje(qc, m),
  });
}

export function useMarcarLeidos(propuestaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      pedir<null>(`/api/v1/propuestas/${propuestaId}/mensajes/leidos`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['actividad'] }),
  });
}
