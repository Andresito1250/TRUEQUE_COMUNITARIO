import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ActualizarCategoriaDto,
  CambiarEstadoUsuarioDto,
  CategoriaAdmin,
  CrearCategoriaDto,
  EstadoReporte,
  Indicadores,
  RegistroAuditoriaDto,
  ReporteAdmin,
  ResolverReporteDto,
  UsuarioAdmin,
} from '@trueque/shared';

import { consulta } from '@/hooks/use-busqueda';
import { API_URL, ErrorApi, pedir, sesionApi } from '@/lib/api';

/** Módulo 7: hooks del administrador (RF-25 a RF-28, RNF10). */

export function useReportesAdmin(estado: EstadoReporte) {
  return useQuery({
    queryKey: ['admin', 'reportes', estado],
    queryFn: () => pedir<ReporteAdmin[]>(`/api/v1/admin/reportes?estado=${estado}`),
  });
}

export function useResolverReporte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: ResolverReporteDto & { id: string }) =>
      pedir<null>(`/api/v1/admin/reportes/${id}`, { method: 'PATCH', cuerpo: dto }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export function useUsuariosAdmin(q: string, estado?: 'ACTIVO' | 'SUSPENDIDO') {
  return useQuery({
    queryKey: ['admin', 'usuarios', q, estado],
    queryFn: () => pedir<UsuarioAdmin[]>(`/api/v1/admin/usuarios${consulta({ q, estado })}`),
  });
}

export function useEstadoUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: CambiarEstadoUsuarioDto & { id: string }) =>
      pedir<UsuarioAdmin>(`/api/v1/admin/usuarios/${id}/estado`, { method: 'PATCH', cuerpo: dto }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin'] }),
  });
}

export function useIndicadores() {
  return useQuery({
    queryKey: ['admin', 'indicadores'],
    queryFn: () => pedir<Indicadores>('/api/v1/admin/indicadores'),
  });
}

/** RF-27: el CSV llega como texto (no JSON). */
export async function descargarCsvIndicadores(): Promise<string> {
  const token = sesionApi.access();
  const res = await fetch(`${API_URL}/api/v1/admin/indicadores/export.csv`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).catch(() => null);
  if (!res?.ok) throw new ErrorApi(res?.status ?? 0, 'No pudimos generar el archivo.');
  return res.text();
}

export function useCategoriasAdmin() {
  return useQuery({
    queryKey: ['admin', 'categorias'],
    queryFn: () => pedir<CategoriaAdmin[]>('/api/v1/admin/categorias'),
  });
}

export function useGuardarCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: { id?: number } & (CrearCategoriaDto | ActualizarCategoriaDto)) => {
      const { id, ...dto } = d;
      return id
        ? pedir<CategoriaAdmin>(`/api/v1/admin/categorias/${id}`, { method: 'PATCH', cuerpo: dto })
        : pedir<CategoriaAdmin>('/api/v1/admin/categorias', { method: 'POST', cuerpo: dto });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'categorias'] });
      void qc.invalidateQueries({ queryKey: ['categorias'] });
    },
  });
}

export function useAuditoria(pagina: number) {
  return useQuery({
    queryKey: ['admin', 'auditoria', pagina],
    queryFn: () =>
      pedir<{ registros: RegistroAuditoriaDto[]; hayMas: boolean }>(
        `/api/v1/admin/auditoria?pagina=${pagina}`,
      ),
  });
}
