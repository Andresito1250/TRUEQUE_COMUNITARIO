import Ionicons from '@expo/vector-icons/Ionicons';
import { type Localidad, LOCALIDAD_NOMBRE } from '@trueque/shared';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/ui/texto';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUbicacion } from '@/store/ubicacion';

/**
 * Explica desde dónde se miden las distancias (RF-12) y ofrece usar la ubicación actual.
 * No se muestra si el usuario ya la compartió.
 */
export function AvisoUbicacion({ localidad }: { localidad: Localidad | undefined }) {
  const theme = useTheme();
  const { origen, permiso, pedir } = useUbicacion();
  if (origen || !localidad) return null;

  const denegado = permiso === 'denegado';
  return (
    <Pressable
      onPress={() => (denegado ? void Linking.openSettings() : void pedir())}
      accessibilityRole="button"
      style={[styles.caja, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
    >
      <Ionicons name="navigate-circle-outline" size={26} color={theme.primary} />
      <View style={styles.textos}>
        <Texto variante="pequeno" color="textSecondary">
          Distancias desde el centro de {LOCALIDAD_NOMBRE[localidad]}.
        </Texto>
        <Texto variante="pequeno" color="primary" negrita>
          {denegado ? 'Activa la ubicación en Ajustes' : 'Usar mi ubicación aproximada'}
        </Texto>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  caja: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  textos: { flex: 1, gap: 2 },
});
