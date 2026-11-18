import { EstadoVacio } from '@/components/ui/estado-vacio';
import { Pantalla } from '@/components/ui/pantalla';
import { Texto } from '@/components/ui/texto';

/** Perfil — RF-05 y RF-23 (Sprints 1 y 6). */
export default function PerfilScreen() {
  return (
    <Pantalla>
      <Texto variante="titulo">Mi perfil</Texto>
      <EstadoVacio
        icono="person-circle-outline"
        titulo="Crea tu cuenta"
        descripcion="Registrarte toma menos de 5 minutos. Tus datos están protegidos según la Ley 1581 de 2012."
      />
    </Pantalla>
  );
}
