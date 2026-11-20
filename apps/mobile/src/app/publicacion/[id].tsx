import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ESTADO_CONSERVACION_NOMBRE,
  ESTADO_PUBLICACION_NOMBRE,
  type EstadoPublicacion,
  formatearDistancia,
  LOCALIDAD_NOMBRE,
  type PublicacionDetalle,
  TIPO_NOMBRE,
} from '@trueque/shared';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Carrusel } from '@/components/publicacion/carrusel';
import { InsigniaEstado } from '@/components/publicacion/insignia-estado';
import { Aviso } from '@/components/ui/aviso';
import { Boton } from '@/components/ui/boton';
import { EstadoVacio } from '@/components/ui/estado-vacio';
import { Texto } from '@/components/ui/texto';
import { Radius, Spacing } from '@/constants/theme';
import {
  useCambiarEstadoPublicacion,
  useEliminarPublicacion,
  usePublicacion,
} from '@/hooks/use-publicaciones';
import { useTheme } from '@/hooks/use-theme';
import { mensajeDeError, urlArchivo } from '@/lib/api';

/** RF-13: detalle de la publicación con el perfil y la reputación del oferente. */
export default function DetallePublicacionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { data: p, isLoading, error, refetch } = usePublicacion(id);

  if (isLoading) {
    return (
      <View style={[styles.centro, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }
  if (!p) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.background, padding: Spacing.md }]}>
        <EstadoVacio
          icono="alert-circle-outline"
          titulo="No pudimos abrir esta publicación"
          descripcion={mensajeDeError(error)}
          accion={{ titulo: 'Reintentar', onPress: () => void refetch() }}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.pie}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Stack.Screen options={{ title: TIPO_NOMBRE[p.tipo] }} />
      <Carrusel imagenes={p.imagenes} titulo={p.titulo} />
      <View style={styles.contenido}>
        <InsigniaEstado estado={p.estado} />
        <Texto variante="titulo" accessibilityRole="header">
          {p.titulo}
        </Texto>
        <View style={styles.datos}>
          <Dato icono="pricetag-outline" texto={p.categoria.nombre} />
          {p.tipo === 'BIEN' ? (
            <Dato
              icono="sparkles-outline"
              texto={ESTADO_CONSERVACION_NOMBRE[p.estadoConservacion]}
            />
          ) : null}
          <Dato
            icono="location-outline"
            texto={
              p.distanciaM === null
                ? LOCALIDAD_NOMBRE[p.localidad]
                : `${LOCALIDAD_NOMBRE[p.localidad]}, ${formatearDistancia(p.distanciaM)}`
            }
          />
        </View>
        <Texto>{p.descripcion}</Texto>

        <Oferente p={p} />

        {p.esMia ? <AccionesDueno p={p} /> : <AccionesVisitante p={p} />}
      </View>
    </ScrollView>
  );
}

function Dato({
  icono,
  texto,
}: {
  icono: 'pricetag-outline' | 'sparkles-outline' | 'location-outline';
  texto: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.dato}>
      <Ionicons name={icono} size={18} color={theme.primary} />
      <Texto color="textSecondary">{texto}</Texto>
    </View>
  );
}

function Oferente({ p }: { p: PublicacionDetalle }) {
  const theme = useTheme();
  const { oferente: o } = p;
  return (
    <View
      style={[styles.oferente, { backgroundColor: theme.surfaceAlt }]}
      accessible
      accessibilityLabel={`Publicado por ${o.nombre}. ${o.verificado ? 'Cuenta verificada. ' : ''}${
        o.reputacion.promedio === null
          ? 'Sin calificaciones'
          : `Calificación ${o.reputacion.promedio} de 5`
      }. ${o.reputacion.intercambios} trueques hechos.`}
    >
      <Avatar nombre={o.nombre} fotoUrl={urlArchivo(o.fotoUrl)} tamano={52} />
      <View style={styles.flex}>
        <View style={styles.fila}>
          <Texto negrita>{o.nombre}</Texto>
          {o.verificado ? (
            <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
          ) : null}
        </View>
        <Texto variante="pequeno" color="textSecondary">
          {o.reputacion.promedio === null ? 'Aún sin calificaciones' : `★ ${o.reputacion.promedio}`}{' '}
          · {o.reputacion.intercambios} {o.reputacion.intercambios === 1 ? 'trueque' : 'trueques'}
        </Texto>
      </View>
    </View>
  );
}

function AccionesVisitante({ p }: { p: PublicacionDetalle }) {
  return (
    <View style={styles.acciones}>
      {p.estado === 'DISPONIBLE' ? (
        // RF-14 se implementa en el Sprint 4.
        <Boton titulo="Proponer trueque (muy pronto)" disabled />
      ) : (
        <Aviso
          tipo="info"
          mensaje={`Esta publicación está ${ESTADO_PUBLICACION_NOMBRE[p.estado].toLowerCase()}.`}
        />
      )}
    </View>
  );
}

const ESTADOS_MANUALES: EstadoPublicacion[] = ['DISPONIBLE', 'RESERVADA', 'INTERCAMBIADA'];

/** RF-07 y RF-08: editar, cambiar estado y eliminar. */
function AccionesDueno({ p }: { p: PublicacionDetalle }) {
  const cambiarEstado = useCambiarEstadoPublicacion(p.id);
  const eliminar = useEliminarPublicacion(p.id);
  const error = cambiarEstado.error ?? eliminar.error;

  const elegirEstado = () =>
    Alert.alert('Cambiar estado', 'Elige el nuevo estado de tu publicación', [
      ...ESTADOS_MANUALES.filter((e) => e !== p.estado).map((estado) => ({
        text: ESTADO_PUBLICACION_NOMBRE[estado],
        onPress: () =>
          cambiarEstado.mutate({ estado: estado as 'DISPONIBLE' | 'RESERVADA' | 'INTERCAMBIADA' }),
      })),
      { text: 'Cancelar', style: 'cancel' as const },
    ]);

  const confirmarEliminar = () =>
    Alert.alert(
      '¿Eliminar publicación?',
      'Dejará de verse en la app. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => eliminar.mutate(undefined, { onSuccess: () => router.back() }),
        },
      ],
    );

  if (p.estado === 'OCULTA') {
    return (
      <Aviso mensaje="Ocultamos esta publicación porque recibió reportes y no cumple los términos de uso. Solo tú puedes verla." />
    );
  }

  return (
    <View style={styles.acciones}>
      <Aviso mensaje={error ? mensajeDeError(error) : null} />
      {p.estado === 'DISPONIBLE' ? (
        <Boton
          titulo="Editar"
          onPress={() =>
            router.push({ pathname: '/publicacion/editar/[id]', params: { id: p.id } })
          }
        />
      ) : null}
      <Boton
        titulo="Cambiar estado"
        variante="secundario"
        cargando={cambiarEstado.isPending}
        onPress={elegirEstado}
      />
      <Boton
        titulo="Eliminar"
        variante="texto"
        cargando={eliminar.isPending}
        onPress={confirmarEliminar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pie: { paddingBottom: Spacing.xl },
  contenido: { padding: Spacing.md, gap: Spacing.md },
  datos: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  dato: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  oferente: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  acciones: { gap: Spacing.sm },
});
