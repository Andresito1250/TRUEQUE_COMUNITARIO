import { ESTADO_PUBLICACION_NOMBRE, type EstadoPublicacion } from '@trueque/shared';
import { StyleSheet, View } from 'react-native';

import { Texto } from '@/components/ui/texto';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Etiqueta de color con el estado de la publicación (RF-08). */
export function InsigniaEstado({ estado }: { estado: EstadoPublicacion }) {
  const theme = useTheme();
  const colores: Record<
    EstadoPublicacion,
    { fondo: string; texto: 'onPrimary' | 'onSecondary' | 'text' }
  > = {
    DISPONIBLE: { fondo: theme.primary, texto: 'onPrimary' },
    RESERVADA: { fondo: theme.secondary, texto: 'onSecondary' },
    INTERCAMBIADA: { fondo: theme.surfaceAlt, texto: 'text' },
    OCULTA: { fondo: theme.surfaceAlt, texto: 'text' },
    ELIMINADA: { fondo: theme.surfaceAlt, texto: 'text' },
  };
  const c = colores[estado];
  return (
    <View style={[styles.insignia, { backgroundColor: c.fondo }]}>
      <Texto variante="pequeno" color={c.texto} negrita>
        {ESTADO_PUBLICACION_NOMBRE[estado]}
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  insignia: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
});
