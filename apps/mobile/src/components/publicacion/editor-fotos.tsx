import Ionicons from '@expo/vector-icons/Ionicons';
import { LIMITES } from '@trueque/shared';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/ui/texto';
import { MIN_TOUCH, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { elegirFotos, preguntarOrigen } from '@/lib/fotos';

/** Una foto puede estar ya en el servidor (al editar) o solo en el celular (recién elegida). */
export type Foto = { tipo: 'remota'; id: string; url: string } | { tipo: 'local'; uri: string };

type EditorFotosProps = {
  fotos: Foto[];
  onAgregar: (uris: string[]) => void;
  onQuitar: (foto: Foto) => void;
  ocupado?: boolean;
};

/** Selector de hasta 5 fotos con vista previa (RF-06). */
export function EditorFotos({ fotos, onAgregar, onQuitar, ocupado }: EditorFotosProps) {
  const theme = useTheme();
  const [procesando, setProcesando] = useState(false);
  const disponibles = LIMITES.MAX_IMAGENES - fotos.length;

  const agregar = () =>
    preguntarOrigen(async (origen) => {
      setProcesando(true);
      try {
        const uris = await elegirFotos(origen, disponibles);
        if (uris.length) onAgregar(uris);
      } finally {
        setProcesando(false);
      }
    });

  return (
    <View style={styles.contenedor}>
      <Texto negrita>
        Fotos ({fotos.length} de {LIMITES.MAX_IMAGENES})
      </Texto>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.fila}
      >
        {fotos.map((f, i) => (
          <View key={f.tipo === 'local' ? f.uri : f.id}>
            <Image
              source={f.tipo === 'local' ? f.uri : f.url}
              style={styles.foto}
              contentFit="cover"
              accessibilityLabel={`Foto ${i + 1}${i === 0 ? ', portada' : ''}`}
            />
            {i === 0 ? (
              <View style={[styles.portada, { backgroundColor: theme.primary }]}>
                <Texto variante="pequeno" color="onPrimary" negrita>
                  Portada
                </Texto>
              </View>
            ) : null}
            <Pressable
              onPress={() => onQuitar(f)}
              disabled={ocupado}
              accessibilityRole="button"
              accessibilityLabel={`Quitar foto ${i + 1}`}
              hitSlop={6}
              style={[styles.quitar, { backgroundColor: theme.surface }]}
            >
              <Ionicons name="close" size={20} color={theme.danger} />
            </Pressable>
          </View>
        ))}
        {disponibles > 0 ? (
          <Pressable
            onPress={agregar}
            disabled={procesando || ocupado}
            accessibilityRole="button"
            accessibilityLabel="Agregar fotos"
            style={[
              styles.foto,
              styles.agregar,
              { borderColor: theme.primary, backgroundColor: theme.surfaceAlt },
            ]}
          >
            {procesando ? (
              <ActivityIndicator color={theme.primary} />
            ) : (
              <>
                <Ionicons name="camera-outline" size={32} color={theme.primary} />
                <Texto variante="pequeno" color="primary" negrita>
                  Agregar
                </Texto>
              </>
            )}
          </Pressable>
        ) : null}
      </ScrollView>
      <Texto variante="pequeno" color="textSecondary">
        La primera foto es la portada. Las fotos claras ayudan a que te propongan más trueques.
      </Texto>
    </View>
  );
}

const TAMANO = 104;
const styles = StyleSheet.create({
  contenedor: { gap: Spacing.sm },
  fila: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  foto: { width: TAMANO, height: TAMANO, borderRadius: Radius.md },
  agregar: {
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  portada: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    paddingHorizontal: 6,
    borderRadius: Radius.sm,
  },
  quitar: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: MIN_TOUCH / 1.6,
    height: MIN_TOUCH / 1.6,
    borderRadius: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
});
