import Ionicons from '@expo/vector-icons/Ionicons';
import type { Notificacion, TipoNotificacion } from '@trueque/shared';
import { type Href, router, Stack } from 'expo-router';
import type { ComponentProps } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { EstadoVacio } from '@/components/ui/estado-vacio';
import { Texto } from '@/components/ui/texto';
import { Radius, Spacing } from '@/constants/theme';
import { useLeerTodas, useMarcarLeida, useNotificaciones } from '@/hooks/use-notificaciones';
import { useTheme } from '@/hooks/use-theme';
import { mensajeDeError } from '@/lib/api';
import { haceCuanto } from '@/lib/fechas';

type Icono = ComponentProps<typeof Ionicons>['name'];
const ICONO: Record<TipoNotificacion, Icono> = {
  PROPUESTA_NUEVA: 'gift-outline',
  PROPUESTA_RESPONDIDA: 'chatbox-ellipses-outline',
  CONTRAPROPUESTA: 'repeat-outline',
  ENCUENTRO_ACORDADO: 'calendar-outline',
  TRUEQUE_CANCELADO: 'close-circle-outline',
  TRUEQUE_REALIZADO: 'checkmark-done-circle-outline',
  MENSAJE_NUEVO: 'chatbubble-outline',
  CALIFICACION_RECIBIDA: 'star-outline',
  MODERACION: 'shield-outline',
};

/** RF-21: bandeja de notificaciones dentro de la app (D2). */
export default function NotificacionesScreen() {
  const theme = useTheme();
  const { data, isLoading, error, refetch, isRefetching } = useNotificaciones();
  const marcar = useMarcarLeida();
  const leerTodas = useLeerTodas();
  const hayNoLeidas = (data ?? []).some((n) => !n.leida);

  const abrir = (n: Notificacion) => {
    if (!n.leida) marcar.mutate(n.id);
    if (n.ruta) router.push(n.ruta as Href);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () =>
            hayNoLeidas ? (
              <Pressable
                onPress={() => leerTodas.mutate()}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Marcar todas como leídas"
              >
                <Ionicons name="checkmark-done" size={26} color={theme.primary} />
              </Pressable>
            ) : null,
        }}
      />
      <FlatList
        style={{ backgroundColor: theme.background }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.lista}
        data={data ?? []}
        keyExtractor={(n) => n.id}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        renderItem={({ item: n }) => (
          <Pressable
            onPress={() => abrir(n)}
            accessibilityRole="button"
            accessibilityLabel={`${n.leida ? '' : 'Nueva. '}${n.titulo}. ${n.mensaje}. ${haceCuanto(n.fechaHora)}`}
            style={[
              styles.fila,
              {
                backgroundColor: n.leida ? theme.surface : theme.surfaceAlt,
                borderColor: n.leida ? theme.border : theme.primary,
              },
            ]}
          >
            <Ionicons name={ICONO[n.tipo]} size={26} color={theme.primary} />
            <View style={styles.textos}>
              <Texto negrita={!n.leida}>{n.titulo}</Texto>
              <Texto variante="pequeno" color="textSecondary" numberOfLines={3}>
                {n.mensaje}
              </Texto>
              <Texto variante="pequeno" color="textSecondary">
                {haceCuanto(n.fechaHora)}
              </Texto>
            </View>
            {!n.leida ? <View style={[styles.punto, { backgroundColor: theme.primary }]} /> : null}
          </Pressable>
        )}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={theme.primary} style={styles.cargando} />
          ) : error ? (
            <EstadoVacio
              icono="cloud-offline-outline"
              titulo="No pudimos cargar tus avisos"
              descripcion={mensajeDeError(error)}
              accion={{ titulo: 'Reintentar', onPress: () => void refetch() }}
            />
          ) : (
            <EstadoVacio
              icono="notifications-outline"
              titulo="No tienes avisos"
              descripcion="Aquí te contaremos cuando te propongan un trueque, te respondan o te escriban."
            />
          )
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  lista: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xl },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  textos: { flex: 1, gap: 2 },
  punto: { width: 10, height: 10, borderRadius: 5 },
  cargando: { marginTop: Spacing.xl },
});
