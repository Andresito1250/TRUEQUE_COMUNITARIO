import type { Bandeja } from '@trueque/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TarjetaPropuesta } from '@/components/trueque/tarjeta-propuesta';
import { EstadoVacio } from '@/components/ui/estado-vacio';
import { Texto } from '@/components/ui/texto';
import { MIN_TOUCH, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useBandeja } from '@/hooks/use-trueques';
import { mensajeDeError } from '@/lib/api';

const BANDEJAS: { valor: Bandeja; etiqueta: string }[] = [
  { valor: 'recibidas', etiqueta: 'Recibidas' },
  { valor: 'enviadas', etiqueta: 'Enviadas' },
  { valor: 'activas', etiqueta: 'En curso' },
  { valor: 'historial', etiqueta: 'Historial' },
];

const VACIO: Record<Bandeja, { titulo: string; descripcion: string }> = {
  recibidas: {
    titulo: 'No tienes propuestas por responder',
    descripcion: 'Cuando alguien quiera algo tuyo, la propuesta aparecerá aquí.',
  },
  enviadas: {
    titulo: 'No has enviado propuestas',
    descripcion: 'Busca algo que te guste y toca «Proponer trueque».',
  },
  activas: {
    titulo: 'No tienes trueques en curso',
    descripcion: 'Aquí verás los trueques aceptados hasta que se marquen como hechos.',
  },
  historial: {
    titulo: 'Tu historial está vacío',
    descripcion: 'Los trueques hechos, rechazados o cancelados quedan guardados aquí.',
  },
};

/** Trueques: bandejas de propuestas (RF-14, RF-15) e historial de intercambios (RF-19). */
export default function TruequesScreen() {
  const theme = useTheme();
  const [bandeja, setBandeja] = useState<Bandeja>('recibidas');
  const { data, isLoading, error, refetch, isRefetching } = useBandeja(bandeja);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.cabecera}>
        <Texto variante="titulo">Trueques</Texto>
        <View
          style={[styles.segmentos, { backgroundColor: theme.surfaceAlt }]}
          accessibilityRole="tablist"
        >
          {BANDEJAS.map((b) => {
            const activa = b.valor === bandeja;
            return (
              <Pressable
                key={b.valor}
                onPress={() => setBandeja(b.valor)}
                accessibilityRole="tab"
                accessibilityState={{ selected: activa }}
                style={[styles.segmento, activa && { backgroundColor: theme.surface }]}
              >
                <Texto
                  variante="pequeno"
                  negrita={activa}
                  color={activa ? 'primary' : 'textSecondary'}
                  numberOfLines={1}
                >
                  {b.etiqueta}
                </Texto>
              </Pressable>
            );
          })}
        </View>
      </View>
      <FlatList
        data={isLoading ? [] : (data ?? [])}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <TarjetaPropuesta propuesta={item} />}
        contentContainerStyle={styles.lista}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={theme.primary} style={styles.cargando} />
          ) : error ? (
            <EstadoVacio
              icono="cloud-offline-outline"
              titulo="No pudimos cargar tus trueques"
              descripcion={mensajeDeError(error)}
              accion={{ titulo: 'Reintentar', onPress: () => void refetch() }}
            />
          ) : (
            <EstadoVacio
              icono="swap-horizontal-outline"
              {...VACIO[bandeja]}
              accion={
                bandeja === 'enviadas'
                  ? { titulo: 'Buscar', onPress: () => router.navigate('/buscar') }
                  : undefined
              }
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cabecera: { padding: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
  segmentos: { flexDirection: 'row', borderRadius: Radius.md, padding: 3 },
  segmento: {
    flex: 1,
    minHeight: MIN_TOUCH - 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
  },
  lista: {
    padding: Spacing.md,
    paddingTop: Spacing.xs,
    gap: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  cargando: { marginTop: Spacing.xl },
});
