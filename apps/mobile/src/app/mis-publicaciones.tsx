import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet } from 'react-native';

import { TarjetaPublicacion } from '@/components/publicacion/tarjeta-publicacion';
import { EstadoVacio } from '@/components/ui/estado-vacio';
import { Selector } from '@/components/ui/selector';
import { Spacing } from '@/constants/theme';
import { useMisPublicaciones } from '@/hooks/use-publicaciones';
import { useTheme } from '@/hooks/use-theme';
import { mensajeDeError } from '@/lib/api';

/** RF-09: listado de mis publicaciones activas e históricas. */
export default function MisPublicacionesScreen() {
  const theme = useTheme();
  const [historico, setHistorico] = useState(false);
  const { data, isLoading, error, refetch, isRefetching } = useMisPublicaciones(historico);

  return (
    // El filtro va dentro de la lista: se desplaza con ella y nunca queda bajo el encabezado.
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentInsetAdjustmentBehavior="automatic"
      data={isLoading ? [] : (data ?? [])}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <TarjetaPublicacion publicacion={item} />}
      contentContainerStyle={styles.lista}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
          tintColor={theme.primary}
        />
      }
      ListHeaderComponent={
        <Selector
          etiqueta="Mostrar"
          opciones={[
            { valor: 'activas', etiqueta: 'Activas' },
            { valor: 'historial', etiqueta: 'Intercambiadas' },
          ]}
          valor={historico ? 'historial' : 'activas'}
          onChange={(v) => setHistorico(v === 'historial')}
        />
      }
      ListEmptyComponent={
        isLoading ? (
          <ActivityIndicator color={theme.primary} style={styles.cargando} />
        ) : error ? (
          <EstadoVacio
            icono="cloud-offline-outline"
            titulo="No pudimos cargar tus publicaciones"
            descripcion={mensajeDeError(error)}
            accion={{ titulo: 'Reintentar', onPress: () => void refetch() }}
          />
        ) : historico ? (
          <EstadoVacio
            icono="time-outline"
            titulo="Aún no has intercambiado nada"
            descripcion="Aquí verás lo que ya cambiaste con otras personas."
          />
        ) : (
          <EstadoVacio
            icono="add-circle-outline"
            titulo="No tienes publicaciones activas"
            descripcion="Publica algo que ya no uses o un servicio que puedas ofrecer."
            accion={{ titulo: 'Publicar', onPress: () => router.push('/publicar') }}
          />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  cargando: { marginTop: Spacing.xl },
  lista: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xl },
});
