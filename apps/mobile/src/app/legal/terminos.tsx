import { DocumentoLegal } from '@/components/documento-legal';
import { TERMINOS } from '@/contenido/legal';

/** Términos de uso con la lista de bienes y servicios prohibidos (RNF12). */
export default function TerminosScreen() {
  return <DocumentoLegal documento={TERMINOS} />;
}
