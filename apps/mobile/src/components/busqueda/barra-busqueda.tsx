import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { FontSize, MIN_TOUCH, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type BarraBusquedaProps = {
  valor: string;
  /** Se llama 400 ms después de que el usuario deja de escribir, o al pulsar "Buscar". */
  onBuscar: (texto: string) => void;
  /** Si se pasa, la barra no es editable y funciona como botón (Inicio → Buscar). */
  onPress?: () => void;
  autoFocus?: boolean;
};

/** RF-10: caja de búsqueda por palabra clave. */
export function BarraBusqueda({ valor, onBuscar, onPress, autoFocus }: BarraBusquedaProps) {
  const theme = useTheme();
  const [texto, setTexto] = useState(valor);
  const [anterior, setAnterior] = useState(valor);

  // Si el filtro cambia desde afuera (p. ej. "Limpiar"), se refleja en la caja. Se compara sin
  // espacios para no borrar el espacio que el usuario acaba de escribir.
  if (valor !== anterior) {
    setAnterior(valor);
    if (valor !== texto.trim()) setTexto(valor);
  }

  useEffect(() => {
    if (texto.trim() === valor.trim()) return;
    const t = setTimeout(() => onBuscar(texto), 400);
    return () => clearTimeout(t);
  }, [texto, valor, onBuscar]);

  const contenido = (
    <View
      style={[styles.caja, { backgroundColor: theme.surface, borderColor: theme.border }]}
      pointerEvents={onPress ? 'none' : 'auto'}
    >
      <Ionicons name="search" size={22} color={theme.textSecondary} />
      <TextInput
        value={texto}
        onChangeText={setTexto}
        onSubmitEditing={() => onBuscar(texto)}
        placeholder="¿Qué estás buscando?"
        placeholderTextColor={theme.textSecondary}
        returnKeyType="search"
        autoCorrect={false}
        autoFocus={autoFocus}
        editable={!onPress}
        maxLength={60}
        style={[styles.entrada, { color: theme.text }]}
        accessibilityLabel="Buscar publicaciones"
      />
      {texto && !onPress ? (
        <Pressable
          onPress={() => {
            setTexto('');
            onBuscar('');
          }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Borrar búsqueda"
        >
          <Ionicons name="close-circle" size={22} color={theme.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );

  return onPress ? (
    <Pressable
      onPress={onPress}
      accessibilityRole="search"
      accessibilityLabel="Buscar publicaciones"
    >
      {contenido}
    </Pressable>
  ) : (
    contenido
  );
}

const styles = StyleSheet.create({
  caja: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: MIN_TOUCH,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  entrada: { flex: 1, fontSize: FontSize.body, paddingVertical: Spacing.sm },
});
