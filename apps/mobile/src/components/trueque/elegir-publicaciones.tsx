import Ionicons from '@expo/vector-icons/Ionicons';
import { MAX_ARTICULOS_POR_LADO, type PublicacionResumen, TIPO_NOMBRE } from '@trueque/shared';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/ui/texto';
import { MIN_TOUCH, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { urlArchivo } from '@/lib/api';

/** Lista para marcar una o varias publicaciones (RF-14, RF-15). */
export function ElegirPublicaciones({
  titulo,
  publicaciones,
  elegidas,
  onChange,
}: {
  titulo: string;
  publicaciones: PublicacionResumen[];
  elegidas: string[];
  onChange: (ids: string[]) => void;
}) {
  const theme = useTheme();
  const lleno = elegidas.length >= MAX_ARTICULOS_POR_LADO;

  return (
    <View style={styles.contenedor}>
      <Texto negrita>{titulo}</Texto>
      {publicaciones.map((p) => {
        const marcada = elegidas.includes(p.id);
        const deshabilitada = !marcada && lleno;
        const miniatura = urlArchivo(p.miniaturaUrl);
        return (
          <Pressable
            key={p.id}
            disabled={deshabilitada}
            onPress={() =>
              onChange(marcada ? elegidas.filter((x) => x !== p.id) : [...elegidas, p.id])
            }
            accessibilityRole="checkbox"
            accessibilityState={{ checked: marcada, disabled: deshabilitada }}
            accessibilityLabel={`${p.titulo}, ${TIPO_NOMBRE[p.tipo]}`}
            style={[
              styles.fila,
              {
                backgroundColor: marcada ? theme.surfaceAlt : theme.surface,
                borderColor: marcada ? theme.primary : theme.border,
                opacity: deshabilitada ? 0.5 : 1,
              },
            ]}
          >
            {miniatura ? (
              <Image source={miniatura} style={styles.foto} contentFit="cover" />
            ) : (
              <View style={[styles.foto, { backgroundColor: theme.surfaceAlt }]} />
            )}
            <View style={styles.textos}>
              <Texto numberOfLines={2}>{p.titulo}</Texto>
              <Texto variante="pequeno" color="textSecondary">
                {TIPO_NOMBRE[p.tipo]} · {p.categoria.nombre}
              </Texto>
            </View>
            <Ionicons
              name={marcada ? 'checkmark-circle' : 'ellipse-outline'}
              size={28}
              color={marcada ? theme.primary : theme.textSecondary}
            />
          </Pressable>
        );
      })}
      {lleno ? (
        <Texto variante="pequeno" color="textSecondary">
          Puedes elegir máximo {MAX_ARTICULOS_POR_LADO}.
        </Texto>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: Spacing.sm },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: MIN_TOUCH,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  foto: { width: 56, height: 56, borderRadius: Radius.sm },
  textos: { flex: 1, gap: 2 },
});
