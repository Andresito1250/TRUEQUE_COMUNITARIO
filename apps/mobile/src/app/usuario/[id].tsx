import Ionicons from '@expo/vector-icons/Ionicons';
import { LOCALIDAD_NOMBRE } from '@trueque/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Estrellas } from '@/components/estrellas';
import { TarjetaPublicacion } from '@/components/publicacion/tarjeta-publicacion';
import { Boton } from '@/components/ui/boton';
import { EstadoVacio } from '@/components/ui/estado-vacio';
import { Pantalla } from '@/components/ui/pantalla';
import { Texto } from '@/components/ui/texto';
import { Radius, Spacing } from '@/constants/theme';
import { useCalificacionesDe, usePerfilPublico } from '@/hooks/use-confianza';
import { useTheme } from '@/hooks/use-theme';
import { useDisponiblesDe } from '@/hooks/use-trueques';
import { mensajeDeError, urlArchivo } from '@/lib/api';
import { fecha } from '@/lib/fechas';
import { useSesion } from '@/store/sesion';

/** RF-23: perfil público con insignia de verificación, reputación y publicaciones. */
export default function PerfilPublicoScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const yo = useSesion((s) => s.usuario?.id);
  const { data: u, isLoading, error, refetch } = usePerfilPublico(id);
  const { data: calificaciones = [] } = useCalificacionesDe(id);
  const { data: publicaciones = [] } = useDisponiblesDe(id);

  if (isLoading) {
    return (
      <Pantalla bordeSuperior={false}>
        <ActivityIndicator color={theme.primary} />
      </Pantalla>
    );
  }
  if (!u) {
    return (
      <Pantalla bordeSuperior={false}>
        <EstadoVacio
          icono="person-outline"
          titulo="Este perfil no está disponible"
          descripcion={mensajeDeError(error)}
          accion={{ titulo: 'Reintentar', onPress: () => void refetch() }}
        />
      </Pantalla>
    );
  }
  const r = u.reputacion;

  return (
    <Pantalla bordeSuperior={false}>
      <View style={styles.cabecera}>
        <Avatar nombre={u.nombre} fotoUrl={urlArchivo(u.fotoUrl)} tamano={96} />
        <View style={styles.fila}>
          <Texto variante="titulo">{u.nombre}</Texto>
          {u.verificado ? (
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={theme.primary}
              accessibilityLabel="Cuenta verificada"
            />
          ) : null}
        </View>
        <Texto color="textSecondary">
          {LOCALIDAD_NOMBRE[u.localidad]} · En la comunidad desde {fecha(u.miembroDesde)}
        </Texto>
      </View>

      <View style={[styles.resumen, { backgroundColor: theme.surfaceAlt }]}>
        <View style={styles.dato}>
          <Texto variante="titulo">
            {r.promedio === null ? '—' : r.promedio.toLocaleString('es-CO')}
          </Texto>
          {r.promedio !== null ? <Estrellas valor={r.promedio} /> : null}
          <Texto variante="pequeno" color="textSecondary">
            {r.calificaciones} {r.calificaciones === 1 ? 'calificación' : 'calificaciones'}
          </Texto>
        </View>
        <View style={styles.dato}>
          <Texto variante="titulo">{r.intercambios}</Texto>
          <Texto variante="pequeno" color="textSecondary">
            {r.intercambios === 1 ? 'trueque hecho' : 'trueques hechos'}
          </Texto>
        </View>
      </View>

      {u.descripcion ? <Texto>{u.descripcion}</Texto> : null}

      <Texto variante="subtitulo">Lo que dicen de {u.nombre.split(' ')[0]}</Texto>
      {calificaciones.length === 0 ? (
        <Texto color="textSecondary">Todavía no tiene calificaciones.</Texto>
      ) : (
        calificaciones.slice(0, 10).map((c) => (
          <View key={c.id} style={[styles.opinion, { borderColor: theme.border }]}>
            <View style={styles.fila}>
              <Estrellas valor={c.puntuacion} tamano={16} />
              <Texto variante="pequeno" color="textSecondary">
                {c.autor} · {fecha(c.fecha)}
              </Texto>
            </View>
            {c.comentario ? <Texto>{c.comentario}</Texto> : null}
          </View>
        ))
      )}

      <Texto variante="subtitulo">Publicaciones disponibles</Texto>
      {publicaciones.length === 0 ? (
        <Texto color="textSecondary">No tiene publicaciones disponibles ahora.</Texto>
      ) : (
        publicaciones.map((p) => <TarjetaPublicacion key={p.id} publicacion={p} />)
      )}

      {yo !== u.id ? (
        <Boton
          titulo="Reportar a esta persona"
          variante="texto"
          onPress={() =>
            router.push({ pathname: '/reportar', params: { usuarioId: u.id, nombre: u.nombre } })
          }
        />
      ) : null}
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  cabecera: { alignItems: 'center', gap: Spacing.xs },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  resumen: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  dato: { alignItems: 'center', gap: 2 },
  opinion: { gap: Spacing.xs, paddingVertical: Spacing.sm, borderBottomWidth: 1 },
});
