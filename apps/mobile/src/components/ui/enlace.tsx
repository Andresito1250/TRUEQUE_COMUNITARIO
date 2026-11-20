import { type Href, Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { FontSize } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Enlace de texto subrayado dentro de un párrafo. */
export function Enlace({ href, children }: { href: Href; children: string }) {
  const theme = useTheme();
  return (
    <Link href={href} style={[styles.enlace, { color: theme.primary }]} accessibilityRole="link">
      {children}
    </Link>
  );
}

const styles = StyleSheet.create({
  enlace: { fontSize: FontSize.body, fontWeight: '700', textDecorationLine: 'underline' },
});
