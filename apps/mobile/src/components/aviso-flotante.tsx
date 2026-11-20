import Ionicons from '@expo/vector-icons/Ionicons';
import type { Href } from 'expo-router';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Texto } from '@/components/ui/texto';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAvisos } from '@/store/avisos';

/** RF-21: aviso que aparece arriba unos segundos cuando llega una notificación. */
export function AvisoFlotante() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { actual, cerrar } = useAvisos();

  useEffect(() => {
    if (!actual) return;
    const t = setTimeout(cerrar, 5000);
    return () => clearTimeout(t);
  }, [actual, cerrar]);

  if (!actual) return null;
  const abrir = () => {
    cerrar();
    if (actual.ruta) router.push(actual.ruta as Href);
  };

  return (
    <View style={[styles.contenedor, { top: insets.top + Spacing.sm }]} pointerEvents="box-none">
      <Pressable
        onPress={abrir}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${actual.titulo}. ${actual.mensaje}. Toca para abrir.`}
        style={[styles.aviso, { backgroundColor: theme.surface, borderColor: theme.primary }]}
      >
        <Ionicons name="notifications" size={24} color={theme.primary} />
        <View style={styles.textos}>
          <Texto negrita numberOfLines={1}>
            {actual.titulo}
          </Texto>
          <Texto variante="pequeno" color="textSecondary" numberOfLines={2}>
            {actual.mensaje}
          </Texto>
        </View>
        <Pressable onPress={cerrar} hitSlop={12} accessibilityLabel="Cerrar aviso">
          <Ionicons name="close" size={20} color={theme.textSecondary} />
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { position: 'absolute', left: Spacing.md, right: Spacing.md, zIndex: 100 },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  textos: { flex: 1, gap: 2 },
});
