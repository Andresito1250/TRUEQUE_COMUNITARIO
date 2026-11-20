import Ionicons from '@expo/vector-icons/Ionicons';
import { LOCALIDAD_NOMBRE } from '@trueque/shared';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { FilaMenu } from '@/components/ui/fila-menu';
import { Pantalla } from '@/components/ui/pantalla';
import { Texto } from '@/components/ui/texto';
import { Radius, Spacing } from '@/constants/theme';
import { usePerfil } from '@/hooks/use-perfil';
import { useFotoPerfil } from '@/hooks/use-publicaciones';
import { useTheme } from '@/hooks/use-theme';
import { mensajeDeError, urlArchivo } from '@/lib/api';
import { elegirFotos, preguntarOrigen } from '@/lib/fotos';
import { useSesion } from '@/store/sesion';
import { Aviso } from '@/components/ui/aviso';

/** Perfil propio con reputación (RF-05, RF-23) y menú de cuenta. El cierre de sesión está aquí (RF-03). */
export default function PerfilScreen() {
  const theme = useTheme();
  const { data: perfil } = usePerfil();
  const cerrar = useSesion((s) => s.cerrar);
  const foto = useFotoPerfil();

  if (!perfil) return null;
  const { reputacion } = perfil;

  /** RF-05: foto de perfil desde la cámara o la galería. */
  const cambiarFoto = () =>
    preguntarOrigen(
      async (origen) => {
        const [uri] = await elegirFotos(origen, 1);
        if (uri) foto.cambiar.mutate(uri);
      },
      perfil.fotoUrl ? { texto: 'Quitar foto', accion: () => foto.quitar.mutate() } : undefined,
    );

  const confirmarCierre = () =>
    Alert.alert('Cerrar sesión', '¿Quieres cerrar tu sesión en este celular?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: () => void cerrar({ avisarAlServidor: true }),
      },
    ]);

  return (
    <Pantalla>
      <View style={styles.cabecera}>
        <Pressable
          onPress={cambiarFoto}
          accessibilityRole="button"
          accessibilityLabel={perfil.fotoUrl ? 'Cambiar foto de perfil' : 'Agregar foto de perfil'}
          disabled={foto.cambiar.isPending || foto.quitar.isPending}
        >
          <Avatar nombre={perfil.nombre} fotoUrl={urlArchivo(perfil.fotoUrl)} />
          <View style={[styles.camara, { backgroundColor: theme.primary }]}>
            {foto.cambiar.isPending || foto.quitar.isPending ? (
              <ActivityIndicator size="small" color={theme.onPrimary} />
            ) : (
              <Ionicons name="camera" size={16} color={theme.onPrimary} />
            )}
          </View>
        </Pressable>
        <View style={styles.flex}>
          <Texto variante="subtitulo" accessibilityRole="header">
            {perfil.nombre}
          </Texto>
          <Texto color="textSecondary">{LOCALIDAD_NOMBRE[perfil.localidad]}</Texto>
          {perfil.verificado ? (
            <View style={styles.insignia} accessibilityLabel="Cuenta verificada">
              <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
              <Texto variante="pequeno" color="primary" negrita>
                Cuenta verificada
              </Texto>
            </View>
          ) : null}
        </View>
      </View>

      {perfil.descripcion ? <Texto>{perfil.descripcion}</Texto> : null}

      <View style={[styles.reputacion, { backgroundColor: theme.surfaceAlt }]}>
        <Dato
          valor={reputacion.promedio === null ? '—' : `${reputacion.promedio} ★`}
          etiqueta="Calificación"
        />
        <Dato valor={String(reputacion.intercambios)} etiqueta="Trueques hechos" />
        <Dato valor={String(reputacion.calificaciones)} etiqueta="Opiniones" />
      </View>

      <Aviso
        mensaje={
          foto.cambiar.error || foto.quitar.error
            ? mensajeDeError(foto.cambiar.error ?? foto.quitar.error)
            : null
        }
      />

      <View>
        <FilaMenu
          icono="albums-outline"
          titulo="Mis publicaciones"
          detalle="Activas e intercambiadas"
          onPress={() => router.push('/mis-publicaciones')}
        />
        <FilaMenu
          icono="person-outline"
          titulo="Editar perfil"
          detalle="Nombre, descripción, localidad e intereses"
          onPress={() => router.push('/ajustes/perfil')}
        />
        <FilaMenu
          icono="lock-closed-outline"
          titulo="Seguridad"
          detalle={
            perfil.totpActivo ? 'Verificación en dos pasos activa' : 'Verificación en dos pasos'
          }
          onPress={() => router.push('/ajustes/seguridad')}
        />
        <FilaMenu
          icono="shield-outline"
          titulo="Privacidad y datos"
          detalle="Política de datos, términos y eliminar cuenta"
          onPress={() => router.push('/ajustes/privacidad')}
        />
        <FilaMenu
          icono="log-out-outline"
          titulo="Cerrar sesión"
          onPress={confirmarCierre}
          peligro
        />
      </View>
    </Pantalla>
  );
}

function Dato({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <View style={styles.dato} accessible accessibilityLabel={`${etiqueta}: ${valor}`}>
      <Texto variante="subtitulo">{valor}</Texto>
      <Texto variante="pequeno" color="textSecondary">
        {etiqueta}
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cabecera: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  camara: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insignia: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.xs },
  reputacion: { flexDirection: 'row', borderRadius: Radius.md, padding: Spacing.md },
  dato: { flex: 1, alignItems: 'center' },
});
