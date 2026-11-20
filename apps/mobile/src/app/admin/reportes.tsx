import {
  DECISION_NOMBRE,
  type DecisionReporte,
  type EstadoReporte,
  MOTIVO_REPORTE_NOMBRE,
  type ReporteAdmin,
} from '@trueque/shared';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, View } from 'react-native';

import { Aviso } from '@/components/ui/aviso';
import { Boton } from '@/components/ui/boton';
import { EstadoVacio } from '@/components/ui/estado-vacio';
import { Selector } from '@/components/ui/selector';
import { Texto } from '@/components/ui/texto';
import { Radius, Spacing } from '@/constants/theme';
import { useReportesAdmin, useResolverReporte } from '@/hooks/use-admin';
import { useTheme } from '@/hooks/use-theme';
import { mensajeDeError, urlArchivo } from '@/lib/api';
import { haceCuanto } from '@/lib/fechas';

/** RF-25: revisar y resolver reportes. */
export default function ReportesAdminScreen() {
  const theme = useTheme();
  const [estado, setEstado] = useState<EstadoReporte>('PENDIENTE');
  const { data, isLoading, error, refetch, isRefetching } = useReportesAdmin(estado);
  const resolver = useResolverReporte();

  const decidir = (r: ReporteAdmin) => {
    const opciones: DecisionReporte[] = r.publicacion
      ? ['APROBAR', 'OCULTAR', 'ELIMINAR', 'SUSPENDER_USUARIO']
      : ['APROBAR', 'SUSPENDER_USUARIO'];
    Alert.alert('¿Qué decides?', 'Se resolverán todos los reportes sobre lo mismo.', [
      ...opciones.map((d) => ({
        text: DECISION_NOMBRE[d],
        style: d === 'APROBAR' ? ('default' as const) : ('destructive' as const),
        onPress: () => resolver.mutate({ id: r.id, decision: d }),
      })),
      { text: 'Cancelar', style: 'cancel' as const },
    ]);
  };

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.lista}
      data={isLoading ? [] : (data ?? [])}
      keyExtractor={(r) => r.id}
      refreshing={isRefetching}
      onRefresh={() => void refetch()}
      ListHeaderComponent={
        <View style={styles.cabecera}>
          <Selector
            etiqueta="Mostrar"
            opciones={[
              { valor: 'PENDIENTE' as const, etiqueta: 'Por revisar' },
              { valor: 'RESUELTO' as const, etiqueta: 'Resueltos' },
            ]}
            valor={estado}
            onChange={setEstado}
          />
          <Aviso mensaje={resolver.error ? mensajeDeError(resolver.error) : null} />
        </View>
      }
      renderItem={({ item: r }) => {
        const foto = urlArchivo(r.publicacion?.miniaturaUrl);
        return (
          <View
            style={[styles.tarjeta, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <View style={styles.fila}>
              {foto ? <Image source={foto} style={styles.foto} contentFit="cover" /> : null}
              <View style={styles.flex}>
                <Texto negrita>
                  {r.publicacion
                    ? `Publicación: ${r.publicacion.titulo}`
                    : `Persona: ${r.usuario?.nombre}`}
                </Texto>
                <Texto variante="pequeno" color="danger" negrita>
                  {MOTIVO_REPORTE_NOMBRE[r.motivo]}
                  {r.similares > 1 ? ` · ${r.similares} reportes` : ''}
                </Texto>
                <Texto variante="pequeno" color="textSecondary">
                  Reportó {r.reportante} · {haceCuanto(r.creadoEn)}
                </Texto>
              </View>
            </View>
            {r.detalle ? <Texto>«{r.detalle}»</Texto> : null}
            {r.publicacion ? (
              <Texto variante="pequeno" color="textSecondary">
                Dueño: {r.usuario?.nombre} · Estado: {r.publicacion.estado.toLowerCase()}
              </Texto>
            ) : null}
            {r.estado === 'PENDIENTE' ? (
              <View style={styles.acciones}>
                {r.usuario ? (
                  <Boton
                    titulo="Ver perfil"
                    variante="texto"
                    onPress={() =>
                      router.push({ pathname: '/usuario/[id]', params: { id: r.usuario!.id } })
                    }
                  />
                ) : null}
                <Boton titulo="Decidir" onPress={() => decidir(r)} cargando={resolver.isPending} />
              </View>
            ) : (
              <Texto variante="pequeno" negrita>
                Decisión: {r.decision ? DECISION_NOMBRE[r.decision] : '—'}
              </Texto>
            )}
          </View>
        );
      }}
      ListEmptyComponent={
        isLoading ? (
          <ActivityIndicator color={theme.primary} />
        ) : error ? (
          <EstadoVacio
            icono="cloud-offline-outline"
            titulo="No pudimos cargar los reportes"
            descripcion={mensajeDeError(error)}
            accion={{ titulo: 'Reintentar', onPress: () => void refetch() }}
          />
        ) : (
          <EstadoVacio
            icono="checkmark-done-outline"
            titulo={
              estado === 'PENDIENTE'
                ? 'No hay reportes por revisar'
                : 'Aún no hay reportes resueltos'
            }
          />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  lista: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xl },
  cabecera: { gap: Spacing.sm, marginBottom: Spacing.sm },
  tarjeta: { gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1 },
  fila: { flexDirection: 'row', gap: Spacing.sm },
  foto: { width: 56, height: 56, borderRadius: Radius.sm },
  acciones: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm },
});
