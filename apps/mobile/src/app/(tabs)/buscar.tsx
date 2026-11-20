import Ionicons from '@expo/vector-icons/Ionicons';
import {
  contarFiltros,
  CENTRO_LOCALIDAD,
  LOCALIDAD_NOMBRE,
  ORDEN_NOMBRE,
  type PublicacionCercana,
} from '@trueque/shared';
import { router } from 'expo-router';
import { type ComponentProps, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvisoUbicacion } from '@/components/busqueda/aviso-ubicacion';
import { BarraBusqueda } from '@/components/busqueda/barra-busqueda';
import { MapaPublicaciones } from '@/components/busqueda/mapa-publicaciones';
import { TarjetaPublicacion } from '@/components/publicacion/tarjeta-publicacion';
import { EstadoVacio } from '@/components/ui/estado-vacio';
import { Texto } from '@/components/ui/texto';
import { MIN_TOUCH, Radius, Spacing } from '@/constants/theme';
import { useBusqueda } from '@/hooks/use-busqueda';
import { useTheme } from '@/hooks/use-theme';
import { mensajeDeError } from '@/lib/api';
import { useFiltros } from '@/store/filtros';
import { useSesion } from '@/store/sesion';
import { useUbicacion } from '@/store/ubicacion';

type Vista = 'lista' | 'mapa';

/** Buscar: palabra clave (RF-10), filtros (RF-11) y cercanía en lista o mapa (RF-12). */
export default function BuscarScreen() {
  const theme = useTheme();
  const localidad = useSesion((s) => s.usuario?.localidad);
  const { filtros, buscarTexto, limpiar } = useFiltros();
  const { origen, revisar } = useUbicacion();
  const [vista, setVista] = useState<Vista>('lista');
  const consulta = useBusqueda(filtros, origen);
  const { data, isLoading, error, refetch, isRefetching, fetchNextPage, hasNextPage } = consulta;

  useEffect(() => {
    void revisar();
  }, [revisar]);

  const items = useMemo<PublicacionCercana[]>(
    () => data?.pages.flatMap((p) => p.items) ?? [],
    [data],
  );
  const origenMapa = data?.pages[0]?.origen ?? (localidad ? CENTRO_LOCALIDAD[localidad] : null);
  const nFiltros = contarFiltros(filtros);
  const alBuscar = useCallback((t: string) => buscarTexto(t), [buscarTexto]);

  const resumen = [
    filtros.radioKm ? `A ${filtros.radioKm} km o menos` : 'Toda Bogotá',
    filtros.localidad ? LOCALIDAD_NOMBRE[filtros.localidad] : null,
    filtros.orden ? ORDEN_NOMBRE[filtros.orden] : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const vacio = isLoading ? (
    <ActivityIndicator color={theme.primary} style={styles.cargando} />
  ) : error ? (
    <EstadoVacio
      icono="cloud-offline-outline"
      titulo="No pudimos buscar"
      descripcion={mensajeDeError(error)}
      accion={{ titulo: 'Reintentar', onPress: () => void refetch() }}
    />
  ) : (
    <EstadoVacio
      icono="search-outline"
      titulo="No encontramos publicaciones"
      descripcion={
        nFiltros || filtros.q
          ? 'Prueba con otra palabra, quita algunos filtros o amplía la distancia.'
          : 'Todavía no hay publicaciones de otros vecinos.'
      }
      accion={nFiltros ? { titulo: 'Quitar filtros', onPress: limpiar } : undefined}
    />
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.cabecera}>
        <Texto variante="titulo">Buscar</Texto>
        <BarraBusqueda valor={filtros.q ?? ''} onBuscar={alBuscar} />
        <View style={styles.fila}>
          <BotonChico
            icono="options-outline"
            texto={nFiltros ? `Filtros (${nFiltros})` : 'Filtros'}
            activo={nFiltros > 0}
            onPress={() => router.push('/filtros')}
          />
          {nFiltros ? <BotonChico icono="close" texto="Limpiar" onPress={limpiar} /> : null}
          <View style={styles.flex} />
          <BotonChico
            icono={vista === 'lista' ? 'map-outline' : 'list-outline'}
            texto={vista === 'lista' ? 'Mapa' : 'Lista'}
            onPress={() => setVista(vista === 'lista' ? 'mapa' : 'lista')}
          />
        </View>
        <Texto variante="pequeno" color="textSecondary">
          {resumen}
        </Texto>
      </View>

      {vista === 'mapa' && origenMapa ? (
        <View style={styles.flex}>
          <MapaPublicaciones
            // Se vuelve a centrar si cambia el origen o el radio.
            key={`${origenMapa.lat},${origenMapa.lng},${filtros.radioKm ?? 0}`}
            publicaciones={items}
            origen={origenMapa}
            radioKm={filtros.radioKm}
          />
          <View style={styles.flotante} pointerEvents="box-none">
            <AvisoUbicacion localidad={localidad} />
            {hasNextPage ? (
              <Texto
                variante="pequeno"
                color="textSecondary"
                style={[styles.nota, { backgroundColor: theme.surface }]}
              >
                El mapa muestra las {items.length} más cercanas. Filtra para ver otras.
              </Texto>
            ) : null}
          </View>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <TarjetaPublicacion publicacion={item} />}
          contentContainerStyle={styles.lista}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={<AvisoUbicacion localidad={localidad} />}
          ListEmptyComponent={vacio}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (hasNextPage && !consulta.isFetchingNextPage) void fetchNextPage();
          }}
          ListFooterComponent={
            consulta.isFetchingNextPage ? <ActivityIndicator color={theme.primary} /> : undefined
          }
          refreshing={isRefetching && !consulta.isFetchingNextPage}
          onRefresh={() => void refetch()}
        />
      )}
    </SafeAreaView>
  );
}

function BotonChico({
  icono,
  texto,
  activo = false,
  onPress,
}: {
  icono: ComponentProps<typeof Ionicons>['name'];
  texto: string;
  activo?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={texto}
      style={[
        styles.chico,
        {
          backgroundColor: activo ? theme.primary : theme.surface,
          borderColor: activo ? theme.primary : theme.border,
        },
      ]}
    >
      <Ionicons name={icono} size={20} color={activo ? theme.onPrimary : theme.primary} />
      <Texto color={activo ? 'onPrimary' : 'primary'} negrita>
        {texto}
      </Texto>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cabecera: { padding: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  chico: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: MIN_TOUCH - 4,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  lista: { padding: Spacing.md, paddingTop: 0, gap: Spacing.sm, paddingBottom: Spacing.xl },
  cargando: { marginTop: Spacing.xl },
  flotante: { position: 'absolute', top: Spacing.sm, left: Spacing.md, right: Spacing.md, gap: 4 },
  nota: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
});
