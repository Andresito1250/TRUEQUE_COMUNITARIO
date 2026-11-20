import Ionicons from '@expo/vector-icons/Ionicons';
import type { ImagenPublicacion } from '@trueque/shared';
import { Image } from 'expo-image';
import { useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Texto } from '@/components/ui/texto';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { urlArchivo } from '@/lib/api';

/** Fotos de la publicación deslizables, con indicador de posición. */
export function Carrusel({ imagenes, titulo }: { imagenes: ImagenPublicacion[]; titulo: string }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [actual, setActual] = useState(0);
  const alto = Math.round(width * 0.75);

  if (imagenes.length === 0) {
    return (
      <View style={[styles.vacio, { height: alto / 1.6, backgroundColor: theme.surfaceAlt }]}>
        <Ionicons name="image-outline" size={48} color={theme.textSecondary} />
        <Texto color="textSecondary">Sin fotos</Texto>
      </View>
    );
  }

  return (
    <View>
      <FlatList
        data={imagenes}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(i) => i.id}
        onMomentumScrollEnd={(e) => setActual(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index }) => (
          <Image
            source={urlArchivo(item.url)}
            placeholder={urlArchivo(item.miniaturaUrl)}
            style={{ width, height: alto }}
            contentFit="cover"
            transition={200}
            accessibilityLabel={`${titulo}, foto ${index + 1} de ${imagenes.length}`}
          />
        )}
      />
      {imagenes.length > 1 ? (
        <View style={[styles.contador, { backgroundColor: theme.surface }]}>
          <Texto variante="pequeno" negrita>
            {actual + 1} / {imagenes.length}
          </Texto>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  vacio: { alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  contador: {
    position: 'absolute',
    right: Spacing.md,
    bottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
});
