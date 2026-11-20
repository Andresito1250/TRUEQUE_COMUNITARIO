import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Boton } from '@/components/ui/boton';
import { Texto } from '@/components/ui/texto';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Diapositiva = {
  icono: ComponentProps<typeof Ionicons>['name'];
  titulo: string;
  texto: string;
};

/** Onboarding de máximo 3 pantallas (RNF01). */
const DIAPOSITIVAS: Diapositiva[] = [
  {
    icono: 'swap-horizontal',
    titulo: 'Cambia sin plata',
    texto:
      'Intercambia lo que ya no usas por lo que necesitas, con vecinos de Suba, Kennedy y Teusaquillo.',
  },
  {
    icono: 'shield-checkmark',
    titulo: 'Con confianza',
    texto:
      'Cuentas verificadas, calificaciones y chat interno sin mostrar tu teléfono ni tu correo.',
  },
  {
    icono: 'leaf',
    titulo: 'Bueno para el barrio',
    texto: 'Cada trueque le da otra vida a las cosas y fortalece a tu comunidad.',
  },
];

export default function BienvenidaScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [pagina, setPagina] = useState(0);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
      <Texto variante="subtitulo" color="primary" style={styles.marca} accessibilityRole="header">
        Trueque Comunitario
      </Texto>
      <FlatList
        data={DIAPOSITIVAS}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(d) => d.titulo}
        onMomentumScrollEnd={(e) => setPagina(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={[styles.diapositiva, { width }]}>
            <View style={[styles.circulo, { backgroundColor: theme.surfaceAlt }]}>
              <Ionicons name={item.icono} size={72} color={theme.primary} />
            </View>
            <Texto variante="titulo" style={styles.centro}>
              {item.titulo}
            </Texto>
            <Texto color="textSecondary" style={styles.centro}>
              {item.texto}
            </Texto>
          </View>
        )}
      />
      <View
        style={styles.puntos}
        accessibilityLabel={`Pantalla ${pagina + 1} de ${DIAPOSITIVAS.length}`}
      >
        {DIAPOSITIVAS.map((d, i) => (
          <View
            key={d.titulo}
            style={[styles.punto, { backgroundColor: i === pagina ? theme.primary : theme.border }]}
          />
        ))}
      </View>
      <View style={styles.acciones}>
        <Boton titulo="Crear cuenta" onPress={() => router.push('/registro')} />
        <Boton
          titulo="Ya tengo cuenta"
          variante="secundario"
          onPress={() => router.push('/login')}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  marca: { textAlign: 'center', marginTop: Spacing.md },
  diapositiva: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
  },
  circulo: {
    width: 148,
    height: 148,
    borderRadius: Radius.lg * 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centro: { textAlign: 'center' },
  puntos: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  punto: { width: 10, height: 10, borderRadius: 5 },
  acciones: { padding: Spacing.md, gap: Spacing.sm },
});
