import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { FilaMenu } from '@/components/ui/fila-menu';
import { Pantalla } from '@/components/ui/pantalla';
import { Texto } from '@/components/ui/texto';
import { Radius, Spacing } from '@/constants/theme';
import { useIndicadores } from '@/hooks/use-admin';
import { useTheme } from '@/hooks/use-theme';

/** Módulo 7: menú del administrador. */
export default function AdminScreen() {
  const theme = useTheme();
  const { data: i, refetch, isRefetching } = useIndicadores();

  return (
    <Pantalla
      bordeSuperior={false}
      refrescar={{ activo: isRefetching, onRefrescar: () => void refetch() }}
    >
      {i ? (
        <View style={styles.cifras}>
          {[
            { valor: i.reportes.pendientes, etiqueta: 'Reportes por revisar' },
            { valor: i.usuarios.activos, etiqueta: 'Usuarios activos' },
            { valor: i.trueques.realizados, etiqueta: 'Trueques hechos' },
          ].map((c) => (
            <View key={c.etiqueta} style={[styles.cifra, { backgroundColor: theme.surfaceAlt }]}>
              <Texto variante="titulo">{c.valor}</Texto>
              <Texto variante="pequeno" color="textSecondary" style={styles.centro}>
                {c.etiqueta}
              </Texto>
            </View>
          ))}
        </View>
      ) : null}
      <View>
        <FilaMenu
          icono="flag-outline"
          titulo="Reportes"
          detalle="Moderar publicaciones y personas reportadas (RF-25)"
          onPress={() => router.push('/admin/reportes')}
        />
        <FilaMenu
          icono="people-outline"
          titulo="Usuarios"
          detalle="Buscar, suspender o reactivar cuentas (RF-26)"
          onPress={() => router.push('/admin/usuarios')}
        />
        <FilaMenu
          icono="stats-chart-outline"
          titulo="Indicadores"
          detalle="Uso del piloto y exportación a Excel (RF-27)"
          onPress={() => router.push('/admin/indicadores')}
        />
        <FilaMenu
          icono="pricetags-outline"
          titulo="Categorías"
          detalle="Crear, renombrar o desactivar (RF-28)"
          onPress={() => router.push('/admin/categorias')}
        />
        <FilaMenu
          icono="document-text-outline"
          titulo="Auditoría"
          detalle="Registro de acciones importantes (RNF10)"
          onPress={() => router.push('/admin/auditoria')}
        />
      </View>
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  cifras: { flexDirection: 'row', gap: Spacing.sm },
  cifra: { flex: 1, alignItems: 'center', padding: Spacing.md, borderRadius: Radius.md, gap: 2 },
  centro: { textAlign: 'center' },
});
