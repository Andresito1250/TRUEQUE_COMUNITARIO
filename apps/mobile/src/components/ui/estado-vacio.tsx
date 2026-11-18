import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Boton } from './boton';
import { Texto } from './texto';

type EstadoVacioProps = {
  icono: ComponentProps<typeof Ionicons>['name'];
  titulo: string;
  descripcion?: string;
  accion?: { titulo: string; onPress: () => void };
};

/** Estado vacío amable, usado en todas las pantallas sin contenido (§9 del prompt). */
export function EstadoVacio({ icono, titulo, descripcion, accion }: EstadoVacioProps) {
  const theme = useTheme();
  return (
    <View
      style={styles.contenedor}
      accessible
      accessibilityLabel={`${titulo}. ${descripcion ?? ''}`}
    >
      <Ionicons name={icono} size={56} color={theme.primary} importantForAccessibility="no" />
      <Texto variante="subtitulo" style={styles.centro}>
        {titulo}
      </Texto>
      {descripcion ? (
        <Texto color="textSecondary" style={styles.centro}>
          {descripcion}
        </Texto>
      ) : null}
      {accion ? <Boton titulo={accion.titulo} onPress={accion.onPress} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xl,
  },
  centro: { textAlign: 'center' },
});
