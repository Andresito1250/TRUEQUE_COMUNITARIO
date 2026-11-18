import { EstadoVacio } from '@/components/ui/estado-vacio';
import { Pantalla } from '@/components/ui/pantalla';
import { Texto } from '@/components/ui/texto';

/** Publicar — RF-06 (Sprint 2). */
export default function PublicarScreen() {
  return (
    <Pantalla>
      <Texto variante="titulo">Publicar</Texto>
      <EstadoVacio
        icono="camera-outline"
        titulo="Ofrece algo para cambiar"
        descripcion="Sube hasta 5 fotos de un objeto o describe un servicio que puedas ofrecer."
      />
    </Pantalla>
  );
}
