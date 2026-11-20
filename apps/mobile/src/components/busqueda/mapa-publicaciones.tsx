import type { Coordenadas, PublicacionCercana } from '@trueque/shared';
import { formatearDistancia, TIPO_NOMBRE } from '@trueque/shared';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';

import { useTheme } from '@/hooks/use-theme';
import { useUbicacion } from '@/store/ubicacion';

/** Grados de latitud por kilómetro (aprox.), para encuadrar el radio. */
const GRADOS_POR_KM = 1 / 111;

/**
 * RF-12: publicaciones en el mapa. En iPhone usa Apple Maps y en Android Google Maps, ambos
 * gratis dentro de Expo Go. Los puntos son aproximados (desplazados hasta 300 m, D9).
 */
export function MapaPublicaciones({
  publicaciones,
  origen,
  radioKm,
}: {
  publicaciones: PublicacionCercana[];
  origen: Coordenadas;
  radioKm?: number;
}) {
  const theme = useTheme();
  // Sin permiso no se muestra el punto azul (y el mapa no pide permiso por su cuenta).
  const conPermiso = useUbicacion((s) => s.permiso === 'concedido');
  const delta = (radioKm ?? 6) * 2.4 * GRADOS_POR_KM;

  return (
    <MapView
      style={StyleSheet.absoluteFill}
      initialRegion={{
        latitude: origen.lat,
        longitude: origen.lng,
        latitudeDelta: delta,
        longitudeDelta: delta,
      }}
      showsUserLocation={conPermiso}
      showsPointsOfInterests={false}
      accessibilityLabel={`Mapa con ${publicaciones.length} publicaciones`}
    >
      {radioKm ? (
        <Circle
          center={{ latitude: origen.lat, longitude: origen.lng }}
          radius={radioKm * 1000}
          strokeColor={theme.primary}
          fillColor="rgba(46, 107, 48, 0.08)"
        />
      ) : null}
      {publicaciones.map((p) => (
        <Marker
          key={p.id}
          coordinate={{ latitude: p.ubicacionAproximada.lat, longitude: p.ubicacionAproximada.lng }}
          title={p.titulo}
          description={`${TIPO_NOMBRE[p.tipo]} · ${formatearDistancia(p.distanciaM)} · Toca para ver`}
          pinColor={p.tipo === 'SERVICIO' ? theme.secondary : theme.primary}
          onCalloutPress={() =>
            router.push({ pathname: '/publicacion/[id]', params: { id: p.id } })
          }
        />
      ))}
    </MapView>
  );
}
