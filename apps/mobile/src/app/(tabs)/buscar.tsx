import { EstadoVacio } from '@/components/ui/estado-vacio';
import { Pantalla } from '@/components/ui/pantalla';
import { Texto } from '@/components/ui/texto';

/** Buscar — RF-10 y RF-11 (Sprint 3). */
export default function BuscarScreen() {
  return (
    <Pantalla>
      <Texto variante="titulo">Buscar</Texto>
      <EstadoVacio
        icono="search-outline"
        titulo="Busca lo que necesitas"
        descripcion="Podrás buscar por palabra, categoría, tipo y distancia."
      />
    </Pantalla>
  );
}
