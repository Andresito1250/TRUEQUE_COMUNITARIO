import { Pressable, StyleSheet, View } from 'react-native';

import { MIN_TOUCH, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Texto } from './texto';

type Opcion<T> = { valor: T; etiqueta: string };

type SelectorProps<T> = {
  etiqueta: string;
  opciones: Opcion<T>[];
  error?: string;
} & (
  | { multiple?: false; valor: T | undefined; onChange: (v: T) => void }
  | { multiple: true; valor: T[]; onChange: (v: T[]) => void }
);

/** Opciones como fichas táctiles grandes; sirve para una o varias selecciones. */
export function Selector<T extends string | number>(props: SelectorProps<T>) {
  const theme = useTheme();
  const { etiqueta, opciones, error } = props;
  const seleccionado = (v: T) => (props.multiple ? props.valor.includes(v) : props.valor === v);

  const alternar = (v: T) => {
    if (props.multiple) {
      props.onChange(seleccionado(v) ? props.valor.filter((x) => x !== v) : [...props.valor, v]);
    } else {
      props.onChange(v);
    }
  };

  return (
    <View style={styles.contenedor} accessibilityRole={props.multiple ? undefined : 'radiogroup'}>
      <Texto negrita>{etiqueta}</Texto>
      <View style={styles.fichas}>
        {opciones.map((o) => {
          const activo = seleccionado(o.valor);
          return (
            <Pressable
              key={String(o.valor)}
              onPress={() => alternar(o.valor)}
              accessibilityRole={props.multiple ? 'checkbox' : 'radio'}
              accessibilityState={props.multiple ? { checked: activo } : { selected: activo }}
              accessibilityLabel={o.etiqueta}
              style={[
                styles.ficha,
                {
                  backgroundColor: activo ? theme.primary : theme.surface,
                  borderColor: activo ? theme.primary : theme.border,
                },
              ]}
            >
              <Texto color={activo ? 'onPrimary' : 'text'} negrita={activo}>
                {o.etiqueta}
              </Texto>
            </Pressable>
          );
        })}
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
  contenedor: { gap: Spacing.sm },
  fichas: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  ficha: {
    minHeight: MIN_TOUCH,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
});
