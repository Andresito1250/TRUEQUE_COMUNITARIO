import { DocumentoLegal } from '@/components/documento-legal';
import { POLITICA_DATOS } from '@/contenido/legal';

/** Aviso de privacidad y política de tratamiento de datos (RNF11). */
export default function PoliticaScreen() {
  return <DocumentoLegal documento={POLITICA_DATOS} />;
}
