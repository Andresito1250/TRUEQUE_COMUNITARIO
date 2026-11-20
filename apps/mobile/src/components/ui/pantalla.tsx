import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PantallaProps = {
  children: ReactNode;
  /** false para pantallas con listas propias (FlatList) que ya hacen scroll. */
  scroll?: boolean;
  /** false cuando la pantalla tiene encabezado de navegación (ya respeta el área superior). */
  bordeSuperior?: boolean;
  /** Si se pasa, permite "jalar para actualizar". */
  refrescar?: { activo: boolean; onRefrescar: () => void };
};

/**
 * Contenedor base: respeta áreas seguras y el encabezado, y deja ver el campo activo cuando
 * aparece el teclado. En iOS esto lo hace el propio ScrollView (`automaticallyAdjustKeyboardInsets`
 * y `contentInsetAdjustmentBehavior`); un KeyboardAvoidingView aquí empujaba el contenido
 * hacia arriba y dejaba los primeros campos fuera de alcance.
 */
export function Pantalla({
  children,
  scroll = true,
  bordeSuperior = true,
  refrescar,
}: PantallaProps) {
  const theme = useTheme();
  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.background }]}
      edges={bordeSuperior ? ['top'] : []}
    >
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.contenido}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
          contentInsetAdjustmentBehavior={bordeSuperior ? 'never' : 'automatic'}
          refreshControl={
            refrescar ? (
              <RefreshControl
                refreshing={refrescar.activo}
                onRefresh={refrescar.onRefrescar}
                tintColor={theme.primary}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, styles.contenido]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contenido: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xl },
});
