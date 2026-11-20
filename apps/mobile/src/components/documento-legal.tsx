import { View } from 'react-native';

import { Pantalla } from '@/components/ui/pantalla';
import { Texto } from '@/components/ui/texto';
import { Spacing } from '@/constants/theme';
import type { DocumentoLegal as Documento } from '@/contenido/legal';

export function DocumentoLegal({ documento }: { documento: Documento }) {
  return (
    <Pantalla bordeSuperior={false}>
      <Texto variante="pequeno" color="textSecondary">
        Versión {documento.version}
      </Texto>
      {documento.secciones.map((s) => (
        <View key={s.titulo} style={{ gap: Spacing.sm }}>
          <Texto variante="subtitulo" accessibilityRole="header">
            {s.titulo}
          </Texto>
          {s.parrafos.map((p) => (
            <Texto key={p.slice(0, 40)}>{p}</Texto>
          ))}
        </View>
      ))}
    </Pantalla>
  );
}
