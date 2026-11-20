import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ActualizarPublicacionDto,
  CambiarEstadoPublicacionDto,
  CrearPublicacionDto,
  PerfilPrivado,
  PublicacionDetalle,
  PublicacionResumen,
} from '@trueque/shared';

import { consulta } from '@/hooks/use-busqueda';
import { pedir } from '@/lib/api';
import { formularioConFotos } from '@/lib/fotos';
import { useSesion } from '@/store/sesion';
import { useUbicacion } from '@/store/ubicacion';

const claves = {
  mias: (historico: boolean) => ['publicaciones', 'mias', historico] as const,
  detalle: (id: string) => ['publicaciones', 'detalle', id] as const,
};

/** RF-09: mis publicaciones activas o históricas. */
export function useMisPublicaciones(historico: boolean) {
  return useQuery({
    queryKey: claves.mias(historico),
    queryFn: () =>
      pedir<PublicacionResumen[]>(`/api/v1/usuarios/me/publicaciones?historico=${historico}`),
  });
}

/** RF-13: detalle de una publicación. */
export function usePublicacion(id: string) {
  const origen = useUbicacion((s) => s.origen);
  return useQuery({
    queryKey: claves.detalle(id),
    // La distancia se calcula desde la ubicación actual, o desde la localidad si no la hay.
    queryFn: () =>
      pedir<PublicacionDetalle>(`/api/v1/publicaciones/${id}${consulta({ ...origen })}`),
  });
}

/** Tras cualquier cambio, se refrescan los listados y se guarda el detalle actualizado. */
function useAlCambiar() {
  const qc = useQueryClient();
  return (p?: PublicacionDetalle) => {
    if (p) qc.setQueryData(claves.detalle(p.id), p);
    void qc.invalidateQueries({ queryKey: ['publicaciones', 'mias'] });
    void qc.invalidateQueries({ queryKey: ['busqueda'] });
  };
}

export function useCrearPublicacion() {
  const alCambiar = useAlCambiar();
  return useMutation({
    mutationFn: (dto: CrearPublicacionDto) =>
      pedir<PublicacionDetalle>('/api/v1/publicaciones', { method: 'POST', cuerpo: dto }),
    onSuccess: alCambiar,
  });
}

export function useActualizarPublicacion(id: string) {
  const alCambiar = useAlCambiar();
  return useMutation({
    mutationFn: (dto: ActualizarPublicacionDto) =>
      pedir<PublicacionDetalle>(`/api/v1/publicaciones/${id}`, { method: 'PATCH', cuerpo: dto }),
    onSuccess: alCambiar,
  });
}

export function useCambiarEstadoPublicacion(id: string) {
  const alCambiar = useAlCambiar();
  return useMutation({
    mutationFn: (dto: CambiarEstadoPublicacionDto) =>
      pedir<PublicacionDetalle>(`/api/v1/publicaciones/${id}/estado`, {
        method: 'PATCH',
        cuerpo: dto,
      }),
    onSuccess: alCambiar,
  });
}

export function useEliminarPublicacion(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => pedir<null>(`/api/v1/publicaciones/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.removeQueries({ queryKey: claves.detalle(id) });
      void qc.invalidateQueries({ queryKey: ['publicaciones', 'mias'] });
      void qc.invalidateQueries({ queryKey: ['busqueda'] });
    },
  });
}

/** Sube fotos locales a una publicación (RF-06). */
export function useSubirFotos() {
  const alCambiar = useAlCambiar();
  return useMutation({
    mutationFn: ({ id, uris }: { id: string; uris: string[] }) =>
      pedir<PublicacionDetalle>(`/api/v1/publicaciones/${id}/imagenes`, {
        method: 'POST',
        cuerpo: formularioConFotos('imagenes', uris),
      }),
    onSuccess: alCambiar,
  });
}

export function useQuitarFoto() {
  const alCambiar = useAlCambiar();
  return useMutation({
    mutationFn: ({ id, imagenId }: { id: string; imagenId: string }) =>
      pedir<PublicacionDetalle>(`/api/v1/publicaciones/${id}/imagenes/${imagenId}`, {
        method: 'DELETE',
      }),
    onSuccess: alCambiar,
  });
}

/** RF-05: cambiar o quitar la foto de perfil. */
export function useFotoPerfil() {
  const qc = useQueryClient();
  const actualizarUsuario = useSesion((s) => s.actualizarUsuario);
  const alTerminar = async (p: PerfilPrivado) => {
    qc.setQueryData(['perfil'], p);
    await actualizarUsuario(p);
  };
  const cambiar = useMutation({
    mutationFn: (uri: string) =>
      pedir<PerfilPrivado>('/api/v1/usuarios/me/foto', {
        method: 'POST',
        cuerpo: formularioConFotos('foto', [uri]),
      }),
    onSuccess: alTerminar,
  });
  const quitar = useMutation({
    mutationFn: () => pedir<PerfilPrivado>('/api/v1/usuarios/me/foto', { method: 'DELETE' }),
    onSuccess: alTerminar,
  });
  return { cambiar, quitar };
}
