import Ionicons from '@expo/vector-icons/Ionicons';
import { EVENTOS, type MensajeChat } from '@trueque/shared';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Aviso } from '@/components/ui/aviso';
import { Texto } from '@/components/ui/texto';
import { FontSize, MIN_TOUCH, Radius, Spacing } from '@/constants/theme';
import { useChat, useEnviarMensaje, useMarcarLeidos } from '@/hooks/use-chat';
import { useTheme } from '@/hooks/use-theme';
import { usePropuesta } from '@/hooks/use-trueques';
import { mensajeDeError } from '@/lib/api';
import { emitir, socketActual } from '@/lib/tiempo-real';
import { useAvisos } from '@/store/avisos';
import { useSesion } from '@/store/sesion';

/** Altura aproximada del encabezado de navegación (para que el teclado no tape la caja). */
const ALTO_ENCABEZADO = Platform.OS === 'ios' ? 44 : 56;

const hora = new Intl.DateTimeFormat('es-CO', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/Bogota',
});

/** RF-20: chat en tiempo real entre las dos partes de un trueque. */
export default function ChatScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const yo = useSesion((s) => s.usuario?.id);
  const { data: propuesta } = usePropuesta(id);
  const chat = useChat(id);
  const enviar = useEnviarMensaje(id);
  const marcarLeidos = useMarcarLeidos(id);
  const [texto, setTexto] = useState('');
  const [escribiendo, setEscribiendo] = useState(false);
  const ultimoAvisoEscribiendo = useRef(0);

  const mensajes = useMemo(() => chat.data?.pages.flatMap((p) => p.mensajes) ?? [], [chat.data]);
  const abierto = chat.data?.pages[0]?.abierto ?? true;
  const otro = propuesta?.contraparte.nombre.split(' ')[0] ?? '';

  // Entra a la sala, marca como leído y avisa cuando la otra persona escribe.
  useEffect(() => {
    useAvisos.getState().abrirChat(id);
    const s = socketActual();
    const unirse = () => emitir(EVENTOS.UNIRSE, { propuestaId: id });
    unirse();
    s?.on('connect', unirse);
    marcarLeidos.mutate();

    let t: ReturnType<typeof setTimeout> | undefined;
    const alEscribir = (d: { propuestaId: string }) => {
      if (d.propuestaId !== id) return;
      setEscribiendo(true);
      clearTimeout(t);
      t = setTimeout(() => setEscribiendo(false), 3000);
    };
    const alNuevo = (m: MensajeChat) => {
      if (m.propuestaId !== id || m.emisorId === yo) return;
      setEscribiendo(false);
      emitir(EVENTOS.LEIDO, { propuestaId: id });
    };
    s?.on(EVENTOS.ESCRIBIENDO, alEscribir);
    s?.on(EVENTOS.NUEVO, alNuevo);
    return () => {
      clearTimeout(t);
      s?.off('connect', unirse);
      s?.off(EVENTOS.ESCRIBIENDO, alEscribir);
      s?.off(EVENTOS.NUEVO, alNuevo);
      emitir(EVENTOS.SALIR, { propuestaId: id });
      useAvisos.getState().abrirChat(null);
    };
    // marcarLeidos es estable en la práctica; solo se ejecuta al abrir el chat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, yo]);

  const alCambiarTexto = (t: string) => {
    setTexto(t);
    const ahora = Date.now();
    if (t && ahora - ultimoAvisoEscribiendo.current > 2000) {
      ultimoAvisoEscribiendo.current = ahora;
      emitir(EVENTOS.ESCRIBIENDO, { propuestaId: id });
    }
  };

  const mandar = () => {
    const contenido = texto.trim();
    if (!contenido || enviar.isPending) return;
    enviar.mutate(contenido, { onSuccess: () => setTexto('') });
  };

  // El último mensaje mío que la otra persona ya vio.
  const ultimoVisto = mensajes.find((m) => m.emisorId === yo)?.estado === 'LEIDO';

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + ALTO_ENCABEZADO}
    >
      <Stack.Screen options={{ title: propuesta?.contraparte.nombre ?? 'Chat' }} />
      <FlatList
        inverted
        style={styles.flex}
        contentContainerStyle={styles.lista}
        data={mensajes}
        keyExtractor={(m) => m.id}
        keyboardDismissMode="interactive"
        onEndReached={() => {
          if (chat.hasNextPage && !chat.isFetchingNextPage) void chat.fetchNextPage();
        }}
        renderItem={({ item: m, index }) => (
          <Burbuja
            m={m}
            mia={m.emisorId === yo}
            visto={index === 0 && m.emisorId === yo && ultimoVisto}
          />
        )}
        ListHeaderComponent={
          escribiendo ? (
            <Texto variante="pequeno" color="textSecondary" style={styles.escribiendo}>
              {otro} está escribiendo…
            </Texto>
          ) : undefined
        }
        ListFooterComponent={
          <View style={styles.pie}>
            {chat.isFetchingNextPage ? <ActivityIndicator color={theme.primary} /> : null}
            <Aviso
              tipo="info"
              mensaje="Por tu seguridad, no compartas datos bancarios ni envíes dinero. Acuerden el trueque en un lugar público."
            />
          </View>
        }
        ListEmptyComponent={
          chat.isLoading ? (
            <ActivityIndicator color={theme.primary} style={styles.cargando} />
          ) : (
            <Texto color="textSecondary" style={styles.vacio}>
              Escríbele a {otro} para ponerse de acuerdo.
            </Texto>
          )
        }
      />

      {abierto ? (
        <View
          style={[
            styles.barra,
            {
              backgroundColor: theme.surface,
              borderTopColor: theme.border,
              paddingBottom: Math.max(insets.bottom, Spacing.sm),
            },
          ]}
        >
          <TextInput
            value={texto}
            onChangeText={alCambiarTexto}
            placeholder="Escribe un mensaje"
            placeholderTextColor={theme.textSecondary}
            multiline
            maxLength={1000}
            style={[styles.entrada, { color: theme.text, backgroundColor: theme.surfaceAlt }]}
            accessibilityLabel="Mensaje"
          />
          <Pressable
            onPress={mandar}
            disabled={!texto.trim() || enviar.isPending}
            accessibilityRole="button"
            accessibilityLabel="Enviar mensaje"
            style={[
              styles.enviar,
              { backgroundColor: texto.trim() ? theme.primary : theme.surfaceAlt },
            ]}
          >
            {enviar.isPending ? (
              <ActivityIndicator color={theme.onPrimary} />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={texto.trim() ? theme.onPrimary : theme.textSecondary}
              />
            )}
          </Pressable>
        </View>
      ) : (
        <View style={[styles.cerrado, { paddingBottom: Math.max(insets.bottom, Spacing.sm) }]}>
          <Aviso
            tipo="info"
            mensaje="Este trueque terminó: la conversación queda solo para leer."
          />
        </View>
      )}
      {enviar.error ? (
        <View style={styles.error}>
          <Aviso mensaje={mensajeDeError(enviar.error)} />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

function Burbuja({ m, mia, visto }: { m: MensajeChat; mia: boolean; visto: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.fila, mia ? styles.derecha : styles.izquierda]}>
      <View
        style={[
          styles.burbuja,
          mia
            ? { backgroundColor: theme.primary, borderBottomRightRadius: 4 }
            : {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                borderWidth: 1,
                borderBottomLeftRadius: 4,
              },
        ]}
        accessible
        accessibilityLabel={`${mia ? 'Tú' : 'Mensaje'}: ${m.contenido}. ${hora.format(new Date(m.fechaHora))}`}
      >
        <Texto color={mia ? 'onPrimary' : 'text'}>{m.contenido}</Texto>
        <Texto variante="pequeno" color={mia ? 'onPrimary' : 'textSecondary'} style={styles.hora}>
          {hora.format(new Date(m.fechaHora))}
        </Texto>
      </View>
      {visto ? (
        <Texto variante="pequeno" color="textSecondary">
          Visto
        </Texto>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  lista: { padding: Spacing.md, gap: Spacing.sm, flexGrow: 1 },
  fila: { maxWidth: '82%', gap: 2 },
  derecha: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  izquierda: { alignSelf: 'flex-start' },
  burbuja: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    gap: 2,
  },
  hora: { alignSelf: 'flex-end', opacity: 0.85 },
  escribiendo: { marginBottom: Spacing.xs },
  pie: { gap: Spacing.sm, marginBottom: Spacing.sm },
  vacio: { textAlign: 'center', marginVertical: Spacing.xl, transform: [{ scaleY: -1 }] },
  cargando: { marginVertical: Spacing.xl },
  barra: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  entrada: {
    flex: 1,
    minHeight: MIN_TOUCH,
    maxHeight: 120,
    paddingHorizontal: Spacing.md,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: Radius.lg,
    fontSize: FontSize.body,
  },
  enviar: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: MIN_TOUCH / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cerrado: { paddingHorizontal: Spacing.md },
  error: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
});
