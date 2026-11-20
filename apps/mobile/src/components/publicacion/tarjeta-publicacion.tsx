import Ionicons from '@expo/vector-icons/Ionicons';
import {
  formatearDistancia,
  LOCALIDAD_NOMBRE,
  type PublicacionResumen,
  TIPO_NOMBRE,
} from '@trueque/shared';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/ui/texto';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { urlArchivo } from '@/lib/api';
import { InsigniaEstado } from './insignia-estado';

/**
 * Fila de un listado de publicaciones con miniatura (usa la imagen de 400 px, RNF04).
 * En los resultados de búsqueda muestra la distancia y la zona (RF-12); en "Mis publicaciones", el estado.
 */
export function TarjetaPublicacion({
  publicacion: p,
}: {
  publicacion: PublicacionResumen & { distanciaM?: number };
}) {
  const theme = useTheme();
  const miniatura = urlArchivo(p.miniaturaUrl);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/publicacion/[id]', params: { id: p.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${p.titulo}. ${TIPO_NOMBRE[p.tipo]} de ${p.categoria.nombre}${
        p.distanciaM === undefined ? '' : `, ${formatearDistancia(p.distanciaM)}`
      }`}
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
        {p.distanciaM === undefined ? (
          <InsigniaEstado estado={p.estado} />
        ) : (
          <View style={styles.distancia}>
            <Ionicons name="location-outline" size={16} color={theme.primary} />
            <Texto variante="pequeno" color="primary" negrita numberOfLines={1}>
              {formatearDistancia(p.distanciaM)} · {LOCALIDAD_NOMBRE[p.localidad]}
            </Texto>
          </View>
        )}
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
  distancia: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
