import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ESTADO_PROPUESTA_NOMBRE,
  ESTADOS_CERRADOS,
  ESTADOS_REALIZADOS,
  type EstadoPropuesta,
  type PropuestaResumen,
} from '@trueque/shared';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Texto } from '@/components/ui/texto';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { urlArchivo } from '@/lib/api';

export function InsigniaPropuesta({
  estado,
  bloqueada = false,
}: {
  estado: EstadoPropuesta;
  bloqueada?: boolean;
}) {
  const theme = useTheme();
  const hecho = ESTADOS_REALIZADOS.includes(estado);
  const cerrado = ESTADOS_CERRADOS.includes(estado);
  const fondo = hecho ? theme.primary : cerrado ? theme.surfaceAlt : theme.secondary;
  const texto = hecho ? theme.onPrimary : cerrado ? theme.textSecondary : theme.onSecondary;
  return (
    <View style={[styles.insignia, { backgroundColor: bloqueada ? theme.surfaceAlt : fondo }]}>
      <Texto variante="pequeno" negrita style={{ color: bloqueada ? theme.textSecondary : texto }}>
        {bloqueada ? 'En pausa' : ESTADO_PROPUESTA_NOMBRE[estado]}
      </Texto>
    </View>
  );
}

/** Fila de una bandeja de Trueques: qué se cambia por qué, con quién y en qué va. */
export function TarjetaPropuesta({ propuesta: p }: { propuesta: PropuestaResumen }) {
  const theme = useTheme();
  // Desde mi punto de vista: lo que doy y lo que recibo.
  const doy = p.soyProponente ? p.ofrecidas : p.solicitadas;
  const recibo = p.soyProponente ? p.solicitadas : p.ofrecidas;
  const portada = urlArchivo(recibo[0]?.miniaturaUrl);
  const nombres = (l: typeof doy) =>
    l.length > 1 ? `${l[0]?.titulo} y ${l.length - 1} más` : (l[0]?.titulo ?? '');

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/propuesta/[id]', params: { id: p.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Trueque con ${p.contraparte.nombre}: recibes ${nombres(recibo)} y das ${nombres(doy)}. ${ESTADO_PROPUESTA_NOMBRE[p.estado]}`}
      style={({ pressed }) => [
        styles.tarjeta,
        { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      {portada ? (
        <Image source={portada} style={styles.foto} contentFit="cover" />
      ) : (
        <View style={[styles.foto, { backgroundColor: theme.surfaceAlt }]} />
      )}
      <View style={styles.textos}>
        <Texto negrita numberOfLines={1}>
          {nombres(recibo)}
        </Texto>
        <View style={styles.fila}>
          <Ionicons name="swap-horizontal" size={16} color={theme.textSecondary} />
          <Texto variante="pequeno" color="textSecondary" numberOfLines={1} style={styles.flex}>
            por {nombres(doy)}
          </Texto>
        </View>
        <View style={styles.fila}>
          <Avatar nombre={p.contraparte.nombre} fotoUrl={p.contraparte.fotoUrl} tamano={22} />
          <Texto variante="pequeno" numberOfLines={1} style={styles.flex}>
            {p.contraparte.nombre}
          </Texto>
          <InsigniaPropuesta estado={p.estado} bloqueada={p.bloqueada} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  foto: { width: 80, height: 80, borderRadius: Radius.sm },
  textos: { flex: 1, gap: Spacing.xs, justifyContent: 'center' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  flex: { flex: 1 },
  insignia: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.sm },
});
