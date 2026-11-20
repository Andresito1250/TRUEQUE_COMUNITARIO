import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AvisoUbicacion } from '@/components/busqueda/aviso-ubicacion';
import { BarraBusqueda } from '@/components/busqueda/barra-busqueda';
import { ChipsCategorias } from '@/components/busqueda/chips-categorias';
import { TarjetaPublicacion } from '@/components/publicacion/tarjeta-publicacion';
import { Boton } from '@/components/ui/boton';
import { EstadoVacio } from '@/components/ui/estado-vacio';
import { Pantalla } from '@/components/ui/pantalla';
import { Texto } from '@/components/ui/texto';
import { Spacing } from '@/constants/theme';
import { useBusqueda } from '@/hooks/use-busqueda';
import { useCategorias } from '@/hooks/use-perfil';
import { useTheme } from '@/hooks/use-theme';
import { mensajeDeError } from '@/lib/api';
import { useFiltros } from '@/store/filtros';
import { useSesion } from '@/store/sesion';
import { useUbicacion } from '@/store/ubicacion';

const CERCANAS = 8;
const FILTROS_INICIO = { orden: 'cercania' } as const;

/** Inicio: lo que hay cerca (RF-12), acceso rápido a buscar (RF-10) y a categorías (RF-11). */
export default function InicioScreen() {
  const theme = useTheme();
  const usuario = useSesion((s) => s.usuario);
  const { origen, revisar } = useUbicacion();
  const { data: categorias = [] } = useCategorias();
  const verCategoria = useFiltros((s) => s.verCategoria);
  const { data, isLoading, error, refetch, isRefetching } = useBusqueda(FILTROS_INICIO, origen);

  useEffect(() => {
    void revisar();
  }, [revisar]);

  const cercanas = data?.pages[0]?.items.slice(0, CERCANAS) ?? [];
  const irABuscar = () => router.navigate('/buscar');

  return (
    <Pantalla refrescar={{ activo: isRefetching, onRefrescar: () => void refetch() }}>
      <Texto variante="titulo">
        {usuario ? `¡Hola, ${usuario.nombre.split(' ')[0]}!` : 'Cerca de ti'}
      </Texto>
      <BarraBusqueda valor="" onBuscar={() => undefined} onPress={irABuscar} />

      {categorias.length ? (
        <View style={styles.seccion}>
          <Texto variante="subtitulo">Categorías</Texto>
          <ChipsCategorias
            categorias={categorias}
            onElegir={(id) => {
              verCategoria(id);
              irABuscar();
            }}
          />
        </View>
      ) : null}

      <View style={styles.seccion}>
        <Texto variante="subtitulo">Cerca de ti</Texto>
        <AvisoUbicacion localidad={usuario?.localidad} />
        {isLoading ? (
          <ActivityIndicator color={theme.primary} style={styles.cargando} />
        ) : error ? (
          <EstadoVacio
            icono="cloud-offline-outline"
            titulo="No pudimos cargar las publicaciones"
            descripcion={mensajeDeError(error)}
            accion={{ titulo: 'Reintentar', onPress: () => void refetch() }}
          />
        ) : cercanas.length === 0 ? (
          <EstadoVacio
            icono="leaf-outline"
            titulo="Todavía no hay publicaciones cerca"
            descripcion="Sé el primero: publica algo que ya no uses o un servicio que puedas ofrecer."
            accion={{ titulo: 'Publicar', onPress: () => router.navigate('/publicar') }}
          />
        ) : (
          <>
            {cercanas.map((p) => (
              <TarjetaPublicacion key={p.id} publicacion={p} />
            ))}
            <Boton titulo="Ver todas en Buscar" variante="secundario" onPress={irABuscar} />
          </>
        )}
      </View>
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  seccion: { gap: Spacing.sm },
  cargando: { marginVertical: Spacing.xl },
});
