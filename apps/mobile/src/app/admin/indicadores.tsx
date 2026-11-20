import { LOCALIDAD_NOMBRE, type Localidad } from '@trueque/shared';
import { File, Paths } from 'expo-file-system';
import { useState } from 'react';
import { ActivityIndicator, Platform, Share, StyleSheet, View } from 'react-native';

import { Aviso } from '@/components/ui/aviso';
import { Boton } from '@/components/ui/boton';
import { Pantalla } from '@/components/ui/pantalla';
import { Texto } from '@/components/ui/texto';
import { Radius, Spacing } from '@/constants/theme';
import { descargarCsvIndicadores, useIndicadores } from '@/hooks/use-admin';
import { useTheme } from '@/hooks/use-theme';
import { mensajeDeError } from '@/lib/api';
import { fechaHora } from '@/lib/fechas';

/** Barra horizontal simple (sin librerías de gráficos, funciona en Expo Go). */
function Barra({ etiqueta, valor, maximo }: { etiqueta: string; valor: number; maximo: number }) {
  const theme = useTheme();
  const ancho = maximo ? Math.max(4, (valor / maximo) * 100) : 0;
  return (
    <View style={styles.barraFila} accessible accessibilityLabel={`${etiqueta}: ${valor}`}>
      <Texto variante="pequeno" style={styles.barraEtiqueta} numberOfLines={1}>
        {etiqueta}
      </Texto>
      <View style={[styles.barraFondo, { backgroundColor: theme.surfaceAlt }]}>
        <View style={[styles.barra, { width: `${ancho}%`, backgroundColor: theme.primary }]} />
      </View>
      <Texto variante="pequeno" negrita style={styles.barraValor}>
        {valor}
      </Texto>
    </View>
  );
}

function Cifra({ valor, etiqueta }: { valor: string | number; etiqueta: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.cifra, { backgroundColor: theme.surfaceAlt }]}>
      <Texto variante="subtitulo" negrita>
        {valor}
      </Texto>
      <Texto variante="pequeno" color="textSecondary" style={styles.centro}>
        {etiqueta}
      </Texto>
    </View>
  );
}

/** RF-27: panel de indicadores del piloto con exportación a CSV. */
export default function IndicadoresScreen() {
  const theme = useTheme();
  const { data: i, isLoading, error, refetch, isRefetching } = useIndicadores();
  const [exportando, setExportando] = useState(false);
  const [errorCsv, setErrorCsv] = useState<string | null>(null);

  const exportar = async () => {
    setExportando(true);
    setErrorCsv(null);
    try {
      const csv = await descargarCsvIndicadores();
      const archivo = new File(Paths.cache, 'indicadores-trueque.csv');
      if (archivo.exists) archivo.delete();
      archivo.create();
      archivo.write(csv);
      // iOS comparte el archivo; Android comparte el texto (se puede pegar en una hoja de cálculo).
      await Share.share(
        Platform.OS === 'ios'
          ? { url: archivo.uri, title: 'Indicadores Trueque Comunitario' }
          : { message: csv, title: 'Indicadores Trueque Comunitario' },
      );
    } catch (e) {
      setErrorCsv(mensajeDeError(e));
    } finally {
      setExportando(false);
    }
  };

  if (isLoading || !i) {
    return (
      <Pantalla bordeSuperior={false}>
        {error ? (
          <Aviso mensaje={mensajeDeError(error)} />
        ) : (
          <ActivityIndicator color={theme.primary} />
        )}
      </Pantalla>
    );
  }
  const maxLocalidad = Math.max(...Object.values(i.usuarios.porLocalidad));
  const maxCategoria = Math.max(0, ...i.publicaciones.porCategoria.map((c) => c.total));
  const maxSemana = Math.max(0, ...i.trueques.porSemana.map((s) => s.realizados));

  return (
    <Pantalla
      bordeSuperior={false}
      refrescar={{ activo: isRefetching, onRefrescar: () => void refetch() }}
    >
      <Texto variante="pequeno" color="textSecondary">
        Actualizado: {fechaHora(i.generadoEn)}
      </Texto>

      <Texto variante="subtitulo">Trueques</Texto>
      <View style={styles.cifras}>
        <Cifra valor={i.trueques.propuestas} etiqueta="Propuestas" />
        <Cifra valor={i.trueques.realizados} etiqueta="Hechos" />
        <Cifra
          valor={
            i.trueques.tasaExito === null ? '—' : `${Math.round(i.trueques.tasaExito * 100)} %`
          }
          etiqueta="Tasa de éxito"
        />
      </View>
      {i.trueques.porSemana.length ? (
        <View style={styles.grupo}>
          <Texto negrita>Trueques hechos por semana</Texto>
          {i.trueques.porSemana.map((s) => (
            <Barra
              key={s.semana}
              etiqueta={`Semana del ${s.semana.slice(5)}`}
              valor={s.realizados}
              maximo={maxSemana}
            />
          ))}
        </View>
      ) : null}

      <Texto variante="subtitulo">Comunidad</Texto>
      <View style={styles.cifras}>
        <Cifra valor={i.usuarios.activos} etiqueta="Usuarios activos" />
        <Cifra valor={i.reputacion.promedio ?? '—'} etiqueta="Calificación promedio" />
        <Cifra valor={i.reportes.pendientes} etiqueta="Reportes por revisar" />
      </View>
      <View style={styles.grupo}>
        <Texto negrita>Usuarios por localidad</Texto>
        {(Object.entries(i.usuarios.porLocalidad) as [Localidad, number][]).map(([l, n]) => (
          <Barra key={l} etiqueta={LOCALIDAD_NOMBRE[l]} valor={n} maximo={maxLocalidad} />
        ))}
      </View>

      <Texto variante="subtitulo">Publicaciones</Texto>
      <View style={styles.cifras}>
        <Cifra valor={i.publicaciones.disponibles} etiqueta="Disponibles" />
        <Cifra valor={i.publicaciones.intercambiadas} etiqueta="Intercambiadas" />
        <Cifra valor={i.publicaciones.ocultas} etiqueta="Ocultas" />
      </View>
      <View style={styles.grupo}>
        <Texto negrita>Por categoría</Texto>
        {i.publicaciones.porCategoria.map((c) => (
          <Barra key={c.nombre} etiqueta={c.nombre} valor={c.total} maximo={maxCategoria} />
        ))}
      </View>

      <Aviso mensaje={errorCsv} />
      <Boton
        titulo="Exportar a Excel (CSV)"
        onPress={() => void exportar()}
        cargando={exportando}
      />
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  cifras: { flexDirection: 'row', gap: Spacing.sm },
  cifra: { flex: 1, alignItems: 'center', padding: Spacing.sm, borderRadius: Radius.md, gap: 2 },
  centro: { textAlign: 'center' },
  grupo: { gap: Spacing.xs },
  barraFila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  barraEtiqueta: { width: 110 },
  barraFondo: { flex: 1, height: 14, borderRadius: 7, overflow: 'hidden' },
  barra: { height: 14, borderRadius: 7 },
  barraValor: { width: 32, textAlign: 'right' },
});
