import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { MIN_TOUCH, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Texto } from './texto';

export type BotonProps = Omit<PressableProps, 'children'> & {
  titulo: string;
  variante?: 'primario' | 'secundario' | 'texto';
  cargando?: boolean;
};

/** Botón accesible: altura mínima de 48 dp y etiqueta para lectores de pantalla (RNF03). */
export function Boton({
  titulo,
  variante = 'primario',
  cargando,
  disabled,
  style,
  ...rest
}: BotonProps) {
  const theme = useTheme();
  const inactivo = disabled || cargando;
  const fondo =
    variante === 'primario'
      ? theme.primary
      : variante === 'secundario'
        ? theme.surfaceAlt
        : 'transparent';
  const colorTexto = variante === 'primario' ? 'onPrimary' : 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: !!inactivo, busy: !!cargando }}
      disabled={inactivo}
      style={(estado) => [
        styles.base,
        { backgroundColor: fondo, opacity: inactivo ? 0.6 : estado.pressed ? 0.85 : 1 },
        typeof style === 'function' ? style(estado) : style,
      ]}
      {...rest}
    >
      {cargando ? (
        <ActivityIndicator color={theme[colorTexto]} />
      ) : (
        <Texto color={colorTexto} negrita>
          {titulo}
        </Texto>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
