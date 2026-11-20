import Ionicons from '@expo/vector-icons/Ionicons';
import { formatearDistancia, LOCALIDAD_NOMBRE, TIPO_PUNTO_NOMBRE } from '@trueque/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Aviso } from '@/components/ui/aviso';
import { Boton } from '@/components/ui/boton';
import { CampoTexto } from '@/components/ui/campo-texto';
import { Pantalla } from '@/components/ui/pantalla';
import { Selector } from '@/components/ui/selector';
import { Texto } from '@/components/ui/texto';
import { MIN_TOUCH, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAccionPropuesta, usePuntosEncuentro } from '@/hooks/use-trueques';
import { mensajeDeError } from '@/lib/api';

const OTRO = -1;
const HORAS = Array.from({ length: 12 }, (_, i) => 8 + i); // 8:00 a 19:00, de día (seguridad)
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Próximos 7 días con un nombre fácil de leer. */
function proximosDias(hoy = new Date()) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i);
    const etiqueta = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : `${DIAS[d.getDay()]} ${d.getDate()}`;
    return { valor: i, etiqueta: etiqueta[0]!.toUpperCase() + etiqueta.slice(1), fecha: d };
  });
}

const horaTexto = (h: number) =>
  h < 12 ? `${h}:00 a. m.` : h === 12 ? '12:00 m.' : `${h - 12}:00 p. m.`;

/** RF-16: elegir un punto de encuentro seguro, el día y la hora. */
export default function EncuentroScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: puntos, isLoading } = usePuntosEncuentro(id);
  const accion = useAccionPropuesta(id);
  const [punto, setPunto] = useState<number | undefined>();
  const [otroLugar, setOtroLugar] = useState('');
  const [dia, setDia] = useState(1);
  const [hora, setHora] = useState<number | undefined>(10);
  const dias = useMemo(() => proximosDias(), []);
  const ahora = new Date();
  // Hoy solo se ofrecen horas que todavía no pasaron.
  const horas = HORAS.filter((h) => dia !== 0 || h > ahora.getHours());

  const fecha = dias[dia]?.fecha;
  const listo =
    fecha &&
    hora !== undefined &&
    horas.includes(hora) &&
    punto !== undefined &&
    (punto !== OTRO || otroLugar.trim().length >= 3);

  const guardar = () => {
    if (!listo || !fecha || hora === undefined) return;
    const cuando = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), hora);
    accion.mutate(
      {
        accion: 'encuentro',
        cuerpo: {
          fechaHora: cuando.toISOString(),
          ...(punto === OTRO ? { puntoTexto: otroLugar } : { puntoEncuentroId: punto }),
        },
      },
      { onSuccess: () => router.back() },
    );
  };

  return (
    <Pantalla bordeSuperior={false}>
      <Texto>
        Elige un lugar público y concurrido. Los primeros son los que les quedan más cerca a los
        dos.
      </Texto>
      <Texto negrita>Lugar</Texto>
      {isLoading ? <ActivityIndicator color={theme.primary} /> : null}
      {(puntos ?? []).map((p) => {
        const activo = punto === p.id;
        return (
          <Pressable
            key={p.id}
            onPress={() => setPunto(p.id)}
            accessibilityRole="radio"
            accessibilityState={{ selected: activo }}
            accessibilityLabel={`${p.nombre}, ${TIPO_PUNTO_NOMBRE[p.tipo]} en ${LOCALIDAD_NOMBRE[p.localidad]}`}
            style={[
              styles.punto,
              {
                backgroundColor: activo ? theme.surfaceAlt : theme.surface,
                borderColor: activo ? theme.primary : theme.border,
              },
            ]}
          >
            <Ionicons
              name={activo ? 'radio-button-on' : 'radio-button-off'}
              size={24}
              color={activo ? theme.primary : theme.textSecondary}
            />
            <View style={styles.flex}>
              <Texto negrita={activo}>{p.nombre}</Texto>
              <Texto variante="pequeno" color="textSecondary">
                {TIPO_PUNTO_NOMBRE[p.tipo]} · {LOCALIDAD_NOMBRE[p.localidad]}
                {p.distanciaM !== null
                  ? ` · ${formatearDistancia(p.distanciaM).replace('a ', 'a unos ')} de ambos`
                  : ''}
              </Texto>
            </View>
          </Pressable>
        );
      })}
      <Pressable
        onPress={() => setPunto(OTRO)}
        accessibilityRole="radio"
        accessibilityState={{ selected: punto === OTRO }}
        style={[
          styles.punto,
          {
            backgroundColor: punto === OTRO ? theme.surfaceAlt : theme.surface,
            borderColor: punto === OTRO ? theme.primary : theme.border,
          },
        ]}
      >
        <Ionicons
          name={punto === OTRO ? 'radio-button-on' : 'radio-button-off'}
          size={24}
          color={punto === OTRO ? theme.primary : theme.textSecondary}
        />
        <Texto>Otro lugar público</Texto>
      </Pressable>
      {punto === OTRO ? (
        <CampoTexto
          etiqueta="¿Dónde?"
          value={otroLugar}
          onChangeText={setOtroLugar}
          placeholder="Ej.: entrada principal del parque de mi barrio"
          maxLength={160}
        />
      ) : null}

      <Selector etiqueta="Día" opciones={dias} valor={dia} onChange={setDia} />
      <Selector
        etiqueta="Hora"
        opciones={horas.map((h) => ({ valor: h, etiqueta: horaTexto(h) }))}
        valor={hora}
        onChange={setHora}
      />
      {horas.length === 0 ? (
        <Texto color="textSecondary">Ya es tarde para hoy: elige otro día.</Texto>
      ) : null}

      <Aviso mensaje={accion.error ? mensajeDeError(accion.error) : null} />
      <Boton
        titulo="Guardar encuentro"
        onPress={guardar}
        disabled={!listo}
        cargando={accion.isPending}
      />
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  punto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: MIN_TOUCH,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
});
