import Ionicons from '@expo/vector-icons/Ionicons';
import { type PublicacionResumen, TIPO_NOMBRE } from '@trueque/shared';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/ui/texto';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { urlArchivo } from '@/lib/api';
import { InsigniaEstado } from './insignia-estado';

/** Fila de un listado de publicaciones con miniatura (usa la imagen de 400 px, RNF04). */
export function TarjetaPublicacion({ publicacion: p }: { publicacion: PublicacionResumen }) {
  const theme = useTheme();
  const miniatura = urlArchivo(p.miniaturaUrl);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/publicacion/[id]', params: { id: p.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${p.titulo}. ${TIPO_NOMBRE[p.tipo]} de ${p.categoria.nombre}`}
      style={({ pressed }) => [
        styles.tarjeta,
        { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      {miniatura ? (
        <Image source={miniatura} style={styles.foto} contentFit="cover" transition={150} />
      ) : (
        <View style={[styles.foto, styles.sinFoto, { backgroundColor: theme.surfaceAlt }]}>
          <Ionicons
            name={(p.categoria.icono as ComponentProps<typeof Ionicons>['name']) ?? 'cube-outline'}
            size={32}
            color={theme.primary}
          />
        </View>
      )}
      <View style={styles.textos}>
        <Texto negrita numberOfLines={2}>
          {p.titulo}
        </Texto>
        <Texto variante="pequeno" color="textSecondary" numberOfLines={1}>
          {TIPO_NOMBRE[p.tipo]} · {p.categoria.nombre}
        </Texto>
        <InsigniaEstado estado={p.estado} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  foto: { width: 88, height: 88, borderRadius: Radius.sm },
  sinFoto: { alignItems: 'center', justifyContent: 'center' },
  textos: { flex: 1, gap: Spacing.xs, justifyContent: 'center' },
});
