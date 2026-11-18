import { StyleSheet, Text, type TextProps } from 'react-native';

import { FontSize, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextoProps = TextProps & {
  variante?: 'cuerpo' | 'pequeno' | 'subtitulo' | 'titulo';
  color?: ThemeColor;
  negrita?: boolean;
};

/** Texto con el tema aplicado. Respeta el tamaño de letra del sistema (allowFontScaling). */
export function Texto({
  variante = 'cuerpo',
  color = 'text',
  negrita,
  style,
  ...rest
}: TextoProps) {
  const theme = useTheme();
  return (
    <Text
      style={[{ color: theme[color] }, styles[variante], negrita && styles.negrita, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  cuerpo: { fontSize: FontSize.body, lineHeight: 24 },
  pequeno: { fontSize: FontSize.small, lineHeight: 20 },
  subtitulo: { fontSize: FontSize.subtitle, lineHeight: 28, fontWeight: '600' },
  titulo: { fontSize: FontSize.title, lineHeight: 34, fontWeight: '700' },
  negrita: { fontWeight: '700' },
});
