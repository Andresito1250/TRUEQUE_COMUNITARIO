import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MIN_TOUCH, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Texto } from './texto';

type FilaMenuProps = {
  icono: ComponentProps<typeof Ionicons>['name'];
  titulo: string;
  detalle?: string;
  onPress: () => void;
  peligro?: boolean;
};

/** Opción de un menú de ajustes, con área táctil completa. */
export function FilaMenu({ icono, titulo, detalle, onPress, peligro }: FilaMenuProps) {
  const theme = useTheme();
  const color = peligro ? theme.danger : theme.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={detalle ? `${titulo}. ${detalle}` : titulo}
      style={({ pressed }) => [
        styles.fila,
        { borderBottomColor: theme.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons name={icono} size={24} color={peligro ? theme.danger : theme.primary} />
      <View style={styles.textos}>
        <Texto style={{ color }} negrita>
          {titulo}
        </Texto>
        {detalle ? (
          <Texto variante="pequeno" color="textSecondary">
            {detalle}
          </Texto>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: MIN_TOUCH + 8,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  textos: { flex: 1 },
});
