import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { Boton } from '@/components/ui/boton';
import { Texto } from '@/components/ui/texto';
import { Radius, Spacing } from '@/constants/theme';
import { useAuditoria } from '@/hooks/use-admin';
import { useTheme } from '@/hooks/use-theme';
import { fechaHora } from '@/lib/fechas';

/** Nombres legibles de las acciones más comunes. */
const ACCION: Record<string, string> = {
  USUARIO_REGISTRADO: 'Se registró una cuenta',
  CONTRASENA_RESTABLECIDA: 'Restableció su contraseña',
  '2FA_ACTIVADO': 'Activó la verificación en dos pasos',
  '2FA_DESACTIVADO': 'Desactivó la verificación en dos pasos',
  CORREO_VERIFICADO: 'Verificó su correo',
  CUENTA_ELIMINADA: 'Eliminó su cuenta',
  PUBLICACION_CREADA: 'Creó una publicación',
  PUBLICACION_ESTADO: 'Cambió el estado de una publicación',
  PUBLICACION_ELIMINADA: 'Eliminó una publicación',
  PUBLICACION_OCULTA_AUTOMATICA: 'Publicación ocultada por reportes',
  PROPUESTA_CREADA: 'Propuso un trueque',
  CONTRAPROPUESTA_CREADA: 'Hizo una contrapropuesta',
  ENCUENTRO_ACORDADO: 'Acordó un encuentro',
  INTERCAMBIO_CONFIRMADO: 'Marcó un trueque como hecho',
  PROPUESTA_ACEPTAR: 'Aceptó una propuesta',
  PROPUESTA_RECHAZAR: 'Rechazó una propuesta',
  PROPUESTA_CANCELAR: 'Canceló un trueque',
  PROPUESTA_CALIFICAR: 'Calificó un trueque',
  REPORTE_CREADO: 'Reportó contenido',
  REPORTE_RESUELTO: 'Resolvió un reporte',
  USUARIO_SUSPENDIDO: 'Suspendió una cuenta',
  USUARIO_REACTIVADO: 'Reactivó una cuenta',
  CATEGORIA_CREADA: 'Creó una categoría',
  CATEGORIA_ACTUALIZADA: 'Actualizó una categoría',
};

/** RNF10: consulta del registro de auditoría. */
export default function AuditoriaScreen() {
  const theme = useTheme();
  const [pagina, setPagina] = useState(1);
  const { data, isLoading, refetch, isRefetching } = useAuditoria(pagina);

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.lista}
      data={data?.registros ?? []}
      keyExtractor={(r) => r.id}
      refreshing={isRefetching}
      onRefresh={() => void refetch()}
      renderItem={({ item: r }) => (
        <View style={[styles.fila, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Texto negrita>{ACCION[r.accion] ?? r.accion}</Texto>
          <Texto variante="pequeno" color="textSecondary">
            {r.actor ?? 'Sistema'} · {fechaHora(r.fecha)}
          </Texto>
          <Texto variante="pequeno" color="textSecondary" numberOfLines={2}>
            {r.entidad} {r.entidadId.slice(0, 8)}
            {r.detalle ? ` · ${JSON.stringify(r.detalle)}` : ''}
          </Texto>
        </View>
      )}
      ListEmptyComponent={isLoading ? <ActivityIndicator color={theme.primary} /> : undefined}
      ListFooterComponent={
        <View style={styles.paginas}>
          {pagina > 1 ? (
            <Boton titulo="Más recientes" variante="texto" onPress={() => setPagina(pagina - 1)} />
          ) : null}
          {data?.hayMas ? (
            <Boton
              titulo="Anteriores"
              variante="secundario"
              onPress={() => setPagina(pagina + 1)}
            />
          ) : null}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  lista: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xl },
  fila: { gap: 2, padding: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1 },
  paginas: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm },
});
