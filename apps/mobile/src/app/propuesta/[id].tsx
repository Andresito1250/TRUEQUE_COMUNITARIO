import Ionicons from '@expo/vector-icons/Ionicons';
import {
  CONSEJOS_SEGURIDAD,
  ESTADOS_CERRADOS,
  ESTADOS_EN_CURSO,
  ESTADOS_REALIZADOS,
  type PropuestaDetalle,
  type PublicacionResumen,
  TIPO_PUNTO_NOMBRE,
} from '@trueque/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ElegirEstrellas, Estrellas } from '@/components/estrellas';
import { TarjetaPublicacion } from '@/components/publicacion/tarjeta-publicacion';
import { InsigniaPropuesta } from '@/components/trueque/tarjeta-propuesta';
import { Aviso } from '@/components/ui/aviso';
import { Boton } from '@/components/ui/boton';
import { CampoTexto } from '@/components/ui/campo-texto';
import { EstadoVacio } from '@/components/ui/estado-vacio';
import { Pantalla } from '@/components/ui/pantalla';
import { Texto } from '@/components/ui/texto';
import { Radius, Spacing } from '@/constants/theme';
import { useCalificar } from '@/hooks/use-confianza';
import { useTheme } from '@/hooks/use-theme';
import { useAccionPropuesta, usePropuesta } from '@/hooks/use-trueques';
import { mensajeDeError, urlArchivo } from '@/lib/api';
import { fechaHora } from '@/lib/fechas';

/** RF-15 a RF-19: detalle del trueque con las acciones que el usuario puede hacer ahora. */
export default function PropuestaScreen() {
  const theme = useTheme();
  const { id, nueva } = useLocalSearchParams<{ id: string; nueva?: string }>();
  const { data: p, isLoading, error, refetch, isRefetching } = usePropuesta(id);

  if (isLoading) {
    return (
      <Pantalla bordeSuperior={false}>
        <ActivityIndicator color={theme.primary} />
      </Pantalla>
    );
  }
  if (!p) {
    return (
      <Pantalla bordeSuperior={false}>
        <EstadoVacio
          icono="alert-circle-outline"
          titulo="No pudimos abrir este trueque"
          descripcion={mensajeDeError(error)}
          accion={{ titulo: 'Reintentar', onPress: () => void refetch() }}
        />
      </Pantalla>
    );
  }

  // Desde mi punto de vista.
  const recibo = p.soyProponente ? p.solicitadas : p.ofrecidas;
  const doy = p.soyProponente ? p.ofrecidas : p.solicitadas;

  return (
    <Pantalla
      bordeSuperior={false}
      refrescar={{ activo: isRefetching, onRefrescar: () => void refetch() }}
    >
      {nueva ? (
        <Aviso tipo="exito" mensaje="¡Propuesta enviada! Te avisaremos cuando te respondan." />
      ) : null}
      <View style={styles.fila}>
        <InsigniaPropuesta estado={p.estado} bloqueada={p.bloqueada} />
      </View>
      <Texto>{explicacion(p)}</Texto>

      <Pressable
        onPress={() => router.push({ pathname: '/usuario/[id]', params: { id: p.contraparte.id } })}
        accessibilityRole="button"
        accessibilityLabel={`Ver el perfil de ${p.contraparte.nombre}`}
        style={[styles.persona, { backgroundColor: theme.surfaceAlt }]}
      >
        <Avatar
          nombre={p.contraparte.nombre}
          fotoUrl={urlArchivo(p.contraparte.fotoUrl)}
          tamano={44}
        />
        <View style={styles.flex}>
          <Texto negrita>{p.contraparte.nombre}</Texto>
          <Texto variante="pequeno" color="textSecondary">
            {p.contraparte.verificado ? 'Cuenta verificada' : 'Cuenta sin verificar'} · Ver perfil
          </Texto>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
      </Pressable>

      <Lado titulo="Recibes" publicaciones={recibo} />
      <Lado titulo="Das" publicaciones={doy} />

      {p.mensaje ? (
        <Seccion titulo={`Mensaje de ${p.proponente.nombre.split(' ')[0]}`}>
          <Texto>«{p.mensaje}»</Texto>
        </Seccion>
      ) : null}

      {/* RF-20: el chat queda disponible para leer aunque el trueque termine. */}
      <Boton
        titulo={
          p.acciones.includes('chatear')
            ? `Escribir a ${p.contraparte.nombre.split(' ')[0]}`
            : 'Ver la conversación'
        }
        variante="secundario"
        onPress={() => router.push({ pathname: '/chat/[id]', params: { id: p.id } })}
      />

      {p.encuentro ? <Encuentro p={p} /> : null}

      {p.contrapropuestaId ? (
        <Boton
          titulo="Ver la contrapropuesta"
          variante="secundario"
          onPress={() =>
            router.replace({ pathname: '/propuesta/[id]', params: { id: p.contrapropuestaId! } })
          }
        />
      ) : null}

      <Calificar p={p} />
      <Acciones p={p} />
    </Pantalla>
  );
}

function explicacion(p: PropuestaDetalle): string {
  const otro = p.contraparte.nombre.split(' ')[0];
  if (p.estado === 'PENDIENTE_RESPUESTA') {
    if (p.bloqueada) {
      return p.soyProponente
        ? `Uno de los artículos está en otro trueque en curso. Tu propuesta queda en pausa; si ese trueque se cancela, ${otro} podrá aceptarla.`
        : 'Ya aceptaste otro trueque con uno de estos artículos. Si ese trueque se cancela, podrás aceptar esta propuesta.';
    }
    return p.soyProponente
      ? `Esperando que ${otro} responda.`
      : `${otro} te propone este trueque. Puedes aceptarlo, rechazarlo o proponer otro trato.`;
  }
  if (p.estado === 'ACEPTADA') {
    return '¡Trueque aceptado! Los artículos quedaron reservados. Ahora acuerden dónde y cuándo encontrarse.';
  }
  if (ESTADOS_EN_CURSO.includes(p.estado)) {
    return 'Cuando hagan el intercambio, cualquiera de los dos puede marcarlo como hecho.';
  }
  if (ESTADOS_REALIZADOS.includes(p.estado) && p.confirmacion) {
    const quien = p.confirmacion.porMi ? 'Lo marcaste' : `${p.confirmacion.porNombre} lo marcó`;
    return `¡Trueque hecho! ${quien} como hecho el ${fechaHora(p.confirmacion.fecha)}. Ya aparece en el historial de los dos.`;
  }
  if (p.estado === 'CONTRAPROPUESTA') return 'Esta propuesta se reemplazó por una contrapropuesta.';
  if (ESTADOS_CERRADOS.includes(p.estado)) {
    const base =
      p.estado === 'RECHAZADA' ? 'Esta propuesta fue rechazada.' : 'Este trueque se canceló.';
    return p.motivoCierre ? `${base} Motivo: ${p.motivoCierre}` : base;
  }
  return '';
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={styles.seccion}>
      <Texto variante="subtitulo">{titulo}</Texto>
      {children}
    </View>
  );
}

function Lado({ titulo, publicaciones }: { titulo: string; publicaciones: PublicacionResumen[] }) {
  return (
    <Seccion titulo={titulo}>
      {publicaciones.map((x) => (
        <TarjetaPublicacion key={x.id} publicacion={x} />
      ))}
    </Seccion>
  );
}

function Encuentro({ p }: { p: PropuestaDetalle }) {
  const theme = useTheme();
  const e = p.encuentro!;
  return (
    <Seccion titulo="Encuentro">
      <View style={[styles.caja, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.fila}>
          <Ionicons name="location" size={20} color={theme.primary} />
          <Texto negrita style={styles.flex}>
            {e.lugar}
          </Texto>
        </View>
        {e.punto ? (
          <Texto variante="pequeno" color="textSecondary">
            {TIPO_PUNTO_NOMBRE[e.punto.tipo]}
            {e.punto.direccion ? ` · ${e.punto.direccion}` : ''}
          </Texto>
        ) : null}
        <View style={styles.fila}>
          <Ionicons name="calendar" size={20} color={theme.primary} />
          <Texto>{fechaHora(e.fechaHora)}</Texto>
        </View>
      </View>
      {ESTADOS_EN_CURSO.includes(p.estado) ? (
        <View
          style={[styles.caja, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
        >
          <View style={styles.fila}>
            <Ionicons name="shield-checkmark" size={20} color={theme.primary} />
            <Texto negrita>Consejos para un trueque seguro</Texto>
          </View>
          {CONSEJOS_SEGURIDAD.map((c) => (
            <Texto key={c} variante="pequeno">
              • {c}
            </Texto>
          ))}
        </View>
      ) : null}
    </Seccion>
  );
}

/** RF-22: calificar a la otra persona durante los 7 días siguientes al trueque. */
function Calificar({ p }: { p: PropuestaDetalle }) {
  const theme = useTheme();
  const calificar = useCalificar(p.id);
  const [estrellas, setEstrellas] = useState(0);
  const [comentario, setComentario] = useState('');
  const c = p.calificacion;
  if (!c) return null;
  const otro = p.contraparte.nombre.split(' ')[0];

  if (c.mia) {
    return (
      <Seccion titulo="Tu calificación">
        <Estrellas valor={c.mia.puntuacion} tamano={24} />
        {c.mia.comentario ? <Texto>«{c.mia.comentario}»</Texto> : null}
      </Seccion>
    );
  }
  if (!p.acciones.includes('calificar')) return null;

  return (
    <View style={[styles.caja, { backgroundColor: theme.surfaceAlt, borderColor: theme.primary }]}>
      <Texto variante="subtitulo">¿Cómo te fue con {otro}?</Texto>
      <Texto variante="pequeno" color="textSecondary">
        Tu calificación ayuda a que la comunidad confíe. Puedes calificar hasta el{' '}
        {fechaHora(c.limite)}.
      </Texto>
      <ElegirEstrellas valor={estrellas} onChange={setEstrellas} />
      <CampoTexto
        etiqueta="Comentario (opcional)"
        value={comentario}
        onChangeText={setComentario}
        maxLength={300}
        multiline
        placeholder="Fue puntual y el artículo estaba como lo describió"
      />
      <Aviso mensaje={calificar.error ? mensajeDeError(calificar.error) : null} />
      <Boton
        titulo="Enviar calificación"
        disabled={!estrellas}
        cargando={calificar.isPending}
        onPress={() => calificar.mutate({ puntuacion: estrellas, comentario })}
      />
    </View>
  );
}

function Acciones({ p }: { p: PropuestaDetalle }) {
  const accion = useAccionPropuesta(p.id);
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const puede = (a: (typeof p.acciones)[number]) => p.acciones.includes(a);
  const otro = p.contraparte.nombre.split(' ')[0];

  if (!p.acciones.some((a) => a !== 'chatear')) {
    return <Aviso mensaje={accion.error ? mensajeDeError(accion.error) : null} />;
  }

  const confirmarHecho = () =>
    Alert.alert(
      '¿Ya hicieron el trueque?',
      `Se marcará como hecho para ti y para ${otro}, y los artículos pasarán a intercambiados.`,
      [
        { text: 'Todavía no', style: 'cancel' },
        { text: 'Sí, ya lo hicimos', onPress: () => accion.mutate({ accion: 'confirmar' }) },
      ],
    );

  const rechazar = () =>
    Alert.alert('¿Rechazar la propuesta?', `Le avisaremos a ${otro}.`, [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Rechazar',
        style: 'destructive',
        onPress: () => accion.mutate({ accion: 'rechazar' }),
      },
    ]);

  return (
    <View style={styles.seccion}>
      <Aviso mensaje={accion.error ? mensajeDeError(accion.error) : null} />
      {puede('aceptar') ? (
        <Boton
          titulo="Aceptar trueque"
          onPress={() => accion.mutate({ accion: 'aceptar' })}
          cargando={accion.isPending}
        />
      ) : null}
      {puede('acordarEncuentro') ? (
        <Boton
          titulo={p.encuentro ? 'Cambiar lugar u hora' : 'Acordar el encuentro'}
          variante={p.encuentro ? 'secundario' : 'primario'}
          onPress={() =>
            router.push({ pathname: '/propuesta/encuentro/[id]', params: { id: p.id } })
          }
        />
      ) : null}
      {puede('confirmar') ? (
        <Boton titulo="Marcar como hecho" onPress={confirmarHecho} cargando={accion.isPending} />
      ) : null}
      {puede('contraproponer') ? (
        <Boton
          titulo="Proponer otro trato"
          variante="secundario"
          onPress={() =>
            router.push({ pathname: '/propuesta/contrapropuesta/[id]', params: { id: p.id } })
          }
        />
      ) : null}
      {puede('rechazar') ? <Boton titulo="Rechazar" variante="texto" onPress={rechazar} /> : null}
      {puede('cancelar') && !cancelando ? (
        <Boton
          titulo={ESTADOS_EN_CURSO.includes(p.estado) ? 'Cancelar trueque' : 'Retirar propuesta'}
          variante="texto"
          onPress={() => setCancelando(true)}
        />
      ) : null}
      {cancelando ? (
        <View style={styles.seccion}>
          <CampoTexto
            etiqueta="¿Por qué cancelas? (opcional)"
            value={motivo}
            onChangeText={setMotivo}
            maxLength={200}
            placeholder={`${otro} verá este motivo`}
          />
          <Boton
            titulo="Sí, cancelar"
            onPress={() => accion.mutate({ accion: 'cancelar', cuerpo: { motivo } })}
            cargando={accion.isPending}
          />
          <Boton titulo="No cancelar" variante="texto" onPress={() => setCancelando(false)} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  seccion: { gap: Spacing.sm },
  persona: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  caja: { gap: Spacing.xs, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1 },
});
