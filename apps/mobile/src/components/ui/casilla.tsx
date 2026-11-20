import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MIN_TOUCH, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Texto } from './texto';

type CasillaProps = {
  marcada: boolean;
  onChange: (v: boolean) => void;
  /** Texto accesible de la casilla. */
  etiqueta: string;
  /** Contenido visible (puede incluir enlaces). Si no se da, se muestra la etiqueta. */
  children?: ReactNode;
  error?: string;
};

/** Casilla de verificación accesible (aceptación de política y términos, RF-01). */
export function Casilla({ marcada, onChange, etiqueta, children, error }: CasillaProps) {
  const theme = useTheme();
  return (
    <View style={styles.contenedor}>
      <View style={styles.fila}>
        <Pressable
          onPress={() => onChange(!marcada)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: marcada }}
          accessibilityLabel={etiqueta}
          hitSlop={8}
          style={styles.toque}
        >
          <Ionicons
            name={marcada ? 'checkbox' : 'square-outline'}
            size={28}
            color={error ? theme.danger : theme.primary}
          />
        </Pressable>
        <View style={styles.texto}>{children ?? <Texto>{etiqueta}</Texto>}</View>
      </View>
      {error ? (
        <Texto variante="pequeno" color="danger" accessibilityLiveRegion="polite">
          {error}
        </Texto>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: Spacing.xs },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  toque: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: { flex: 1 },
});
