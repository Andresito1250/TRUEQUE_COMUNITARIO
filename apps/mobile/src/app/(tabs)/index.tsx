import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Boton } from '@/components/ui/boton';
import { EstadoVacio } from '@/components/ui/estado-vacio';
import { Pantalla } from '@/components/ui/pantalla';
import { Texto } from '@/components/ui/texto';
import { Radius, Spacing } from '@/constants/theme';
import { useSalud } from '@/hooks/use-salud';
import { useTheme } from '@/hooks/use-theme';
import { API_URL, mensajeDeError } from '@/lib/api';

/** Inicio — "Cerca de mí". En el Sprint 3 mostrará las publicaciones cercanas (RF-12). */
export default function InicioScreen() {
  return (
    <Pantalla>
      <Texto variante="titulo">Cerca de ti</Texto>
      <EstadoConexion />
      <EstadoVacio
        icono="leaf-outline"
        titulo="Aquí verás lo que tus vecinos quieren cambiar"
        descripcion="Muy pronto podrás ver publicaciones de Suba, Kennedy y Teusaquillo a pocos kilómetros de ti."
      />
    </Pantalla>
  );
}

/** Tarjeta de diagnóstico del Sprint 0: confirma que la app llega al API (GET /health). */
function EstadoConexion() {
  const theme = useTheme();
  const { data, isLoading, error, refetch, isRefetching } = useSalud();
  const ok = data?.estado === 'ok';

  return (
    <View
      style={[styles.tarjeta, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.fila}>
        <Ionicons
          name={isLoading ? 'time-outline' : ok ? 'checkmark-circle' : 'alert-circle'}
          size={24}
          color={ok ? theme.success : isLoading ? theme.textSecondary : theme.danger}
        />
        <Texto negrita>
          {isLoading
            ? 'Conectando con el servidor…'
            : ok
              ? 'Conectado al servidor'
              : 'Sin conexión al servidor'}
        </Texto>
      </View>
      {error ? <Texto color="textSecondary">{mensajeDeError(error)}</Texto> : null}
      <Texto variante="pequeno" color="textSecondary">
        {API_URL}
      </Texto>
      {!isLoading && !ok ? (
        <Boton
          titulo="Reintentar"
          variante="secundario"
          onPress={() => refetch()}
          cargando={isRefetching}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.sm },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});
