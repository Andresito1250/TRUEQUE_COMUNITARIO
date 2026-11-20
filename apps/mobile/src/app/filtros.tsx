import {
  ESTADO_CONSERVACION_NOMBRE,
  EstadoConservacion,
  type FiltrosBusqueda,
  Localidad,
  LOCALIDAD_NOMBRE,
  ORDEN_NOMBRE,
  OrdenBusqueda,
  RADIOS_KM,
  TIPO_NOMBRE,
  TipoPublicacion,
} from '@trueque/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Boton } from '@/components/ui/boton';
import { Pantalla } from '@/components/ui/pantalla';
import { Selector } from '@/components/ui/selector';
import { Spacing } from '@/constants/theme';
import { useCategorias } from '@/hooks/use-perfil';
import { useFiltros } from '@/store/filtros';

/** "Todas" se representa con '' porque el selector necesita un valor por opción. */
const TODAS = '' as const;
const conTodas = <T extends string | number>(
  opciones: { valor: T; etiqueta: string }[],
  etiqueta = 'Todas',
) => [{ valor: TODAS, etiqueta }, ...opciones];
const valorOTodas = <T,>(v: T | undefined) => v ?? TODAS;
const sinTodas = <T,>(v: T | typeof TODAS) => (v === TODAS ? undefined : (v as T));

/** RF-11 y RF-12: filtros de la búsqueda. Se aplican al tocar "Ver resultados". */
export default function FiltrosScreen() {
  const { filtros, aplicar } = useFiltros();
  const { data: categorias = [] } = useCategorias();
  const [f, setF] = useState<Omit<FiltrosBusqueda, 'q'>>(() => {
    const { q: _q, ...resto } = filtros;
    return resto;
  });
  const cambiar = (cambio: Partial<FiltrosBusqueda>) => setF((prev) => ({ ...prev, ...cambio }));

  return (
    <Pantalla bordeSuperior={false}>
      <Selector
        etiqueta="Distancia"
        opciones={[
          { valor: 0, etiqueta: 'Toda Bogotá' },
          ...RADIOS_KM.map((km) => ({ valor: km, etiqueta: `${km} km` })),
        ]}
        valor={f.radioKm ?? 0}
        onChange={(v) => cambiar({ radioKm: v || undefined })}
      />
      <Selector
        etiqueta="Categoría"
        opciones={conTodas(categorias.map((c) => ({ valor: c.id, etiqueta: c.nombre })))}
        valor={valorOTodas(f.categoriaId)}
        onChange={(v) => cambiar({ categoriaId: sinTodas<number>(v) })}
      />
      <Selector
        etiqueta="Tipo"
        opciones={conTodas(
          Object.values(TipoPublicacion).map((t) => ({ valor: t, etiqueta: TIPO_NOMBRE[t] })),
          'Objetos y servicios',
        )}
        valor={valorOTodas(f.tipo)}
        onChange={(v) => {
          const tipo = sinTodas<TipoPublicacion>(v);
          // Los servicios no tienen estado de conservación.
          cambiar({ tipo, ...(tipo === 'SERVICIO' ? { estadoConservacion: undefined } : {}) });
        }}
      />
      {f.tipo !== 'SERVICIO' ? (
        <Selector
          etiqueta="Estado del objeto"
          opciones={conTodas(
            Object.values(EstadoConservacion)
              .filter((e) => e !== 'NO_APLICA')
              .map((e) => ({ valor: e, etiqueta: ESTADO_CONSERVACION_NOMBRE[e] })),
            'Cualquiera',
          )}
          valor={valorOTodas(f.estadoConservacion)}
          onChange={(v) => cambiar({ estadoConservacion: sinTodas<EstadoConservacion>(v) })}
        />
      ) : null}
      <Selector
        etiqueta="Localidad"
        opciones={conTodas(
          Object.values(Localidad).map((l) => ({ valor: l, etiqueta: LOCALIDAD_NOMBRE[l] })),
        )}
        valor={valorOTodas(f.localidad)}
        onChange={(v) => cambiar({ localidad: sinTodas<Localidad>(v) })}
      />
      <Selector
        etiqueta="Ordenar por"
        opciones={conTodas(
          Object.values(OrdenBusqueda).map((o) => ({ valor: o, etiqueta: ORDEN_NOMBRE[o] })),
          'Automático',
        )}
        valor={valorOTodas(f.orden)}
        onChange={(v) => cambiar({ orden: sinTodas<OrdenBusqueda>(v) })}
      />

      <View style={styles.acciones}>
        <Boton
          titulo="Ver resultados"
          onPress={() => {
            aplicar(f);
            router.back();
          }}
        />
        <Boton titulo="Quitar todos los filtros" variante="texto" onPress={() => setF({})} />
      </View>
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  acciones: { gap: Spacing.sm, marginTop: Spacing.sm },
});
