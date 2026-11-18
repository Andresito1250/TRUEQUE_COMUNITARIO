import { EstadoVacio } from '@/components/ui/estado-vacio';
import { Pantalla } from '@/components/ui/pantalla';
import { Texto } from '@/components/ui/texto';

/** Trueques — propuestas, chats e historial, RF-14 a RF-20 (Sprints 4 y 5). */
export default function TruequesScreen() {
  return (
    <Pantalla>
      <Texto variante="titulo">Mis trueques</Texto>
      <EstadoVacio
        icono="swap-horizontal-outline"
        titulo="Todavía no tienes trueques"
        descripcion="Aquí verás las propuestas que envíes y recibas, tus chats y tu historial."
      />
    </Pantalla>
  );
}
