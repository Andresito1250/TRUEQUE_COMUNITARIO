import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type PantallaProps = {
  children: ReactNode;
  /** false para pantallas con listas propias (FlatList) que ya hacen scroll. */
  scroll?: boolean;
};

/** Contenedor base de cada pantalla: respeta áreas seguras y usa el fondo del tema. */
export function Pantalla({ children, scroll = true }: PantallaProps) {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
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
  contenido: { padding: Spacing.md, gap: Spacing.md },
});
