import Ionicons from '@expo/vector-icons/Ionicons';
import { ESTRELLAS_NOMBRE } from '@trueque/shared';
import { Pressable, StyleSheet, View } from 'react-native';

import { MIN_TOUCH } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const AMARILLO = '#B7791F'; // contraste AA sobre fondos claros

/** Estrellas de solo lectura (RF-23). */
export function Estrellas({ valor, tamano = 18 }: { valor: number; tamano?: number }) {
  return (
    <View
      style={styles.fila}
      accessible
      accessibilityLabel={`${valor.toLocaleString('es-CO')} de 5 estrellas`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={valor >= i ? 'star' : valor >= i - 0.5 ? 'star-half' : 'star-outline'}
          size={tamano}
          color={AMARILLO}
        />
      ))}
    </View>
  );
}

/** Elegir de 1 a 5 estrellas con áreas táctiles grandes (RF-22, RNF03). */
export function ElegirEstrellas({
  valor,
  onChange,
}: {
  valor: number;
  onChange: (v: number) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.fila} accessibilityRole="radiogroup">
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable
          key={i}
          onPress={() => onChange(i)}
          accessibilityRole="radio"
          accessibilityState={{ selected: valor === i }}
          accessibilityLabel={`${i} ${i === 1 ? 'estrella' : 'estrellas'}: ${ESTRELLAS_NOMBRE[i]}`}
          style={styles.boton}
        >
          <Ionicons
            name={valor >= i ? 'star' : 'star-outline'}
            size={36}
            color={valor >= i ? AMARILLO : theme.textSecondary}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  boton: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
});
