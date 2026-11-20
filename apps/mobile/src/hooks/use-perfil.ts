import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ActualizarPerfilDto, Categoria, PerfilPrivado } from '@trueque/shared';

import { pedir } from '@/lib/api';
import { useSesion } from '@/store/sesion';

/** Perfil propio (RF-05). Mantiene sincronizada la copia guardada en la sesión. */
export function usePerfil() {
  const guardado = useSesion((s) => s.usuario);
  const actualizarUsuario = useSesion((s) => s.actualizarUsuario);
  return useQuery({
    queryKey: ['perfil'],
    queryFn: async () => {
      const p = await pedir<PerfilPrivado>('/api/v1/usuarios/me');
      await actualizarUsuario(p);
      return p;
    },
    initialData: guardado ?? undefined,
  });
}

export function useActualizarPerfil() {
  const qc = useQueryClient();
  const actualizarUsuario = useSesion((s) => s.actualizarUsuario);
  return useMutation({
    mutationFn: (dto: ActualizarPerfilDto) =>
      pedir<PerfilPrivado>('/api/v1/usuarios/me', { method: 'PATCH', cuerpo: dto }),
    onSuccess: async (p) => {
      qc.setQueryData(['perfil'], p);
      await actualizarUsuario(p);
    },
  });
}

export function useCategorias() {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: () => pedir<Categoria[]>('/api/v1/categorias', { auth: false }),
    staleTime: 60 * 60_000,
  });
}
