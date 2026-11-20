import type { FiltrosBusqueda } from '@trueque/shared';
import { create } from 'zustand';

type EstadoFiltros = {
  filtros: FiltrosBusqueda;
  /** Reemplaza los filtros de RF-11/RF-12 y conserva la palabra buscada. */
  aplicar(f: Omit<FiltrosBusqueda, 'q'>): void;
  buscarTexto(q: string): void;
  /** Desde Inicio: abre Buscar con una categoría elegida. */
  verCategoria(categoriaId: number): void;
  limpiar(): void;
};

/** Filtros de la pestaña Buscar, compartidos con Inicio y la pantalla de filtros. */
export const useFiltros = create<EstadoFiltros>((set) => ({
  filtros: {},
  aplicar: (f) => set((s) => ({ filtros: { q: s.filtros.q, ...f } })),
  buscarTexto: (q) => set((s) => ({ filtros: { ...s.filtros, q: q.trim() || undefined } })),
  verCategoria: (categoriaId) => set({ filtros: { categoriaId } }),
  limpiar: () => set((s) => ({ filtros: { q: s.filtros.q } })),
}));
