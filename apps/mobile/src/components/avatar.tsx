import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Texto } from '@/components/ui/texto';
import { useTheme } from '@/hooks/use-theme';

/** Foto de perfil o, si no hay, las iniciales del nombre. */
export function Avatar({
  nombre,
  fotoUrl,
  tamano = 72,
}: {
  nombre: string;
  fotoUrl: string | null;
  tamano?: number;
}) {
  const theme = useTheme();
  const iniciales = nombre
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
  const estilo = { width: tamano, height: tamano, borderRadius: tamano / 2 };

  if (fotoUrl) {
    return (
      <Image
        source={fotoUrl}
        style={estilo}
        accessibilityLabel={`Foto de ${nombre}`}
        contentFit="cover"
      />
    );
  }
  return (
    <View
      style={[styles.iniciales, estilo, { backgroundColor: theme.primary }]}
      accessibilityLabel={`Sin foto. Iniciales de ${nombre}`}
    >
      <Texto
        variante="subtitulo"
        color="onPrimary"
        style={{ fontSize: tamano * 0.36, lineHeight: tamano * 0.5 }}
      >
        {iniciales}
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  iniciales: { alignItems: 'center', justifyContent: 'center' },
});
