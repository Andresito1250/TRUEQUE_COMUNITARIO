import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Texto } from './texto';

type AvisoProps = { tipo?: 'error' | 'exito' | 'info'; mensaje: string | null | undefined };

/** Mensaje destacado (error de servidor, confirmación o consejo), anunciado por lectores de pantalla. */
export function Aviso({ tipo = 'error', mensaje }: AvisoProps) {
  const theme = useTheme();
  if (!mensaje) return null;
  const color =
    tipo === 'error' ? theme.danger : tipo === 'exito' ? theme.success : theme.secondary;
  const icono =
    tipo === 'error'
      ? 'alert-circle'
      : tipo === 'exito'
        ? 'checkmark-circle'
        : 'information-circle';
  return (
    <View
      style={[styles.caja, { borderColor: color, backgroundColor: theme.surfaceAlt }]}
      accessibilityLiveRegion="assertive"
      accessibilityRole={tipo === 'error' ? 'alert' : undefined}
    >
      <Ionicons name={icono} size={22} color={color} />
      <Texto style={styles.texto}>{mensaje}</Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    alignItems: 'flex-start',
  },
  texto: { flex: 1 },
});
