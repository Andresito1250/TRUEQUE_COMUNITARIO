import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { FontSize, MIN_TOUCH, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Texto } from './texto';

export type CampoTextoProps = TextInputProps & {
  etiqueta: string;
  error?: string;
  ayuda?: string;
  /** Muestra el botón para ver u ocultar la contraseña. */
  contrasena?: boolean;
};

/** Campo de texto con etiqueta visible, error anunciado por lector de pantalla y 48 dp de alto (RNF03). */
export function CampoTexto({
  etiqueta,
  error,
  ayuda,
  contrasena,
  style,
  multiline,
  ...rest
}: CampoTextoProps) {
  const theme = useTheme();
  const [oculto, setOculto] = useState(true);

  return (
    <View style={styles.contenedor}>
      <Texto negrita>{etiqueta}</Texto>
      <View
        style={[
          styles.caja,
          {
            backgroundColor: theme.surface,
            borderColor: error ? theme.danger : theme.border,
            minHeight: multiline ? 96 : MIN_TOUCH,
          },
        ]}
      >
        <TextInput
          accessibilityLabel={etiqueta}
          accessibilityHint={error ?? ayuda}
          placeholderTextColor={theme.textSecondary}
          secureTextEntry={contrasena && oculto}
          multiline={multiline}
          style={[
            styles.input,
            { color: theme.text, textAlignVertical: multiline ? 'top' : 'center' },
            style,
          ]}
          {...rest}
        />
        {contrasena ? (
          <Pressable
            onPress={() => setOculto((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={oculto ? 'Mostrar contraseña' : 'Ocultar contraseña'}
            hitSlop={8}
            style={styles.ojo}
          >
            <Ionicons
              name={oculto ? 'eye-outline' : 'eye-off-outline'}
              size={22}
              color={theme.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Texto variante="pequeno" color="danger" accessibilityLiveRegion="polite">
          {error}
        </Texto>
      ) : ayuda ? (
        <Texto variante="pequeno" color="textSecondary">
          {ayuda}
        </Texto>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: { gap: Spacing.xs },
  caja: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
  },
  input: { flex: 1, fontSize: FontSize.body, paddingVertical: Spacing.sm },
  ojo: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
