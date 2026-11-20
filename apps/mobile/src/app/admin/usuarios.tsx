import { LOCALIDAD_NOMBRE, type UsuarioAdmin } from '@trueque/shared';
import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { BarraBusqueda } from '@/components/busqueda/barra-busqueda';
import { Aviso } from '@/components/ui/aviso';
import { Boton } from '@/components/ui/boton';
import { CampoTexto } from '@/components/ui/campo-texto';
import { EstadoVacio } from '@/components/ui/estado-vacio';
import { Selector } from '@/components/ui/selector';
import { Texto } from '@/components/ui/texto';
import { Radius, Spacing } from '@/constants/theme';
import { useEstadoUsuario, useUsuariosAdmin } from '@/hooks/use-admin';
import { useTheme } from '@/hooks/use-theme';
import { mensajeDeError } from '@/lib/api';
import { fecha } from '@/lib/fechas';

type Filtro = '' | 'ACTIVO' | 'SUSPENDIDO';

/** RF-26: buscar usuarios y suspender o reactivar cuentas. */
export default function UsuariosAdminScreen() {
  const theme = useTheme();
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('');
  const { data, isLoading, refetch, isRefetching } = useUsuariosAdmin(q, filtro || undefined);

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.lista}
      keyboardShouldPersistTaps="handled"
      data={isLoading ? [] : (data ?? [])}
      keyExtractor={(u) => u.id}
      refreshing={isRefetching}
      onRefresh={() => void refetch()}
      ListHeaderComponent={
        <View style={styles.cabecera}>
          <BarraBusqueda valor={q} onBuscar={setQ} />
          <Selector
            etiqueta="Estado"
            opciones={[
              { valor: '' as Filtro, etiqueta: 'Todos' },
              { valor: 'ACTIVO' as Filtro, etiqueta: 'Activos' },
              { valor: 'SUSPENDIDO' as Filtro, etiqueta: 'Suspendidos' },
            ]}
            valor={filtro}
            onChange={setFiltro}
          />
        </View>
      }
      renderItem={({ item }) => <FilaUsuario u={item} />}
      ListEmptyComponent={
        isLoading ? (
          <ActivityIndicator color={theme.primary} />
        ) : (
          <EstadoVacio icono="people-outline" titulo="No encontramos usuarios" />
        )
      }
    />
  );
}

function FilaUsuario({ u }: { u: UsuarioAdmin }) {
  const theme = useTheme();
  const cambiar = useEstadoUsuario();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const suspendido = u.estado === 'SUSPENDIDO';

  return (
    <View style={[styles.tarjeta, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.fila}>
        <View style={styles.flex}>
          <Texto negrita>
            {u.nombre}
            {u.rol === 'ADMIN' ? ' (administrador)' : ''}
          </Texto>
          <Texto variante="pequeno" color="textSecondary">
            {u.correo}
          </Texto>
          <Texto variante="pequeno" color="textSecondary">
            {LOCALIDAD_NOMBRE[u.localidad]} · desde {fecha(u.creadoEn)} · {u.publicaciones}{' '}
            publicaciones · {u.reportesRecibidos} reportes
          </Texto>
        </View>
        <Texto variante="pequeno" negrita color={suspendido ? 'danger' : 'primary'}>
          {suspendido ? 'Suspendido' : 'Activo'}
        </Texto>
      </View>
      {u.rol !== 'ADMIN' && !abierto ? (
        <Boton
          titulo={suspendido ? 'Reactivar cuenta' : 'Suspender cuenta'}
          variante={suspendido ? 'secundario' : 'texto'}
          onPress={() => setAbierto(true)}
        />
      ) : null}
      {abierto ? (
        <View style={styles.cabecera}>
          <CampoTexto
            etiqueta="Motivo (queda en la auditoría)"
            value={motivo}
            onChangeText={setMotivo}
            maxLength={300}
          />
          <Aviso mensaje={cambiar.error ? mensajeDeError(cambiar.error) : null} />
          <Boton
            titulo={suspendido ? 'Reactivar' : 'Suspender'}
            disabled={motivo.trim().length < 5}
            cargando={cambiar.isPending}
            onPress={() =>
              cambiar.mutate(
                { id: u.id, estado: suspendido ? 'ACTIVO' : 'SUSPENDIDO', motivo },
                { onSuccess: () => setAbierto(false) },
              )
            }
          />
          <Boton titulo="Cancelar" variante="texto" onPress={() => setAbierto(false)} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  lista: { padding: Spacing.md, gap: Spacing.sm, paddingBottom: Spacing.xl },
  cabecera: { gap: Spacing.sm },
  tarjeta: { gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1 },
  fila: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
});
