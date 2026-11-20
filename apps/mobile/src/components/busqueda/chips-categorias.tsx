import Ionicons from '@expo/vector-icons/Ionicons';
import type { Categoria } from '@trueque/shared';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Texto } from '@/components/ui/texto';
import { MIN_TOUCH, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Icono = ComponentProps<typeof Ionicons>['name'];

/** Fila deslizable de categorías (RF-11) para filtrar con un toque. */
export function ChipsCategorias({
  categorias,
  seleccionada,
  onElegir,
}: {
  categorias: Categoria[];
  seleccionada?: number;
  onElegir: (id: number) => void;
}) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.fila}
    >
      {categorias.map((c) => {
        const activa = c.id === seleccionada;
        return (
          <Pressable
            key={c.id}
            onPress={() => onElegir(c.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: activa }}
            accessibilityLabel={`Categoría ${c.nombre}`}
            style={[
              styles.chip,
              {
                backgroundColor: activa ? theme.primary : theme.surface,
                borderColor: activa ? theme.primary : theme.border,
              },
            ]}
          >
            <Ionicons
              name={(c.icono as Icono) ?? 'pricetag-outline'}
              size={18}
              color={activa ? theme.onPrimary : theme.primary}
            />
            <Texto color={activa ? 'onPrimary' : 'text'}>{c.nombre}</Texto>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fila: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: MIN_TOUCH - 4,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
});
