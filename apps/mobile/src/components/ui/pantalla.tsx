import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PantallaProps = {
  children: ReactNode;
  /** false para pantallas con listas propias (FlatList) que ya hacen scroll. */
  scroll?: boolean;
  /** false cuando la pantalla tiene encabezado de navegación (ya respeta el área superior). */
  bordeSuperior?: boolean;
};

/** Contenedor base: respeta áreas seguras, sube con el teclado y usa el fondo del tema. */
export function Pantalla({ children, scroll = true, bordeSuperior = true }: PantallaProps) {
  const theme = useTheme();
  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.background }]}
      edges={bordeSuperior ? ['top'] : []}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, styles.contenido]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  contenido: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xl },
});
