import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Alert } from 'react-native';

import {
  CamposPublicacion,
  useFormularioPublicacion,
} from '@/components/publicacion/campos-publicacion';
import { EditorFotos, type Foto } from '@/components/publicacion/editor-fotos';
import { Aviso } from '@/components/ui/aviso';
import { Boton } from '@/components/ui/boton';
import { Pantalla } from '@/components/ui/pantalla';
import {
  useActualizarPublicacion,
  usePublicacion,
  useQuitarFoto,
  useSubirFotos,
} from '@/hooks/use-publicaciones';
import { mensajeDeError, urlArchivo } from '@/lib/api';

/** RF-07: editar una publicación propia. Las fotos se suben o quitan al momento. */
export default function EditarPublicacionScreen() {
  const { id, aviso } = useLocalSearchParams<{ id: string; aviso?: string }>();
  const { data: p } = usePublicacion(id);
  const form = useFormularioPublicacion();
  const { control, formState, handleSubmit, reset } = form;
  const actualizar = useActualizarPublicacion(id);
  const subir = useSubirFotos();
  const quitar = useQuitarFoto();

  // Carga los valores actuales una sola vez, cuando llega la publicación.
  const cargada = !!p;
  useEffect(() => {
    if (!p) return;
    reset({
      titulo: p.titulo,
      descripcion: p.descripcion,
      tipo: p.tipo,
      categoriaId: p.categoria.id,
      estadoConservacion: p.estadoConservacion,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargada, reset]);

  if (!p) return null;

  const fotos: Foto[] = p.imagenes.map((i) => ({
    tipo: 'remota',
    id: i.id,
    url: urlArchivo(i.miniaturaUrl),
  }));

  const quitarFoto = (foto: Foto) => {
    if (foto.tipo !== 'remota') return;
    Alert.alert('¿Quitar esta foto?', undefined, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: () => quitar.mutate({ id, imagenId: foto.id }),
      },
    ]);
  };

  const guardar = handleSubmit((v) =>
    actualizar.mutate(
      {
        titulo: v.titulo,
        descripcion: v.descripcion,
        tipo: v.tipo,
        categoriaId: v.categoriaId,
        estadoConservacion: v.estadoConservacion,
      },
      { onSuccess: () => router.back() },
    ),
  );

  const error = actualizar.error ?? subir.error ?? quitar.error;

  return (
    <Pantalla bordeSuperior={false}>
      <Aviso tipo="info" mensaje={aviso} />
      <EditorFotos
        fotos={fotos}
        onAgregar={(uris) => subir.mutate({ id, uris })}
        onQuitar={quitarFoto}
        ocupado={subir.isPending || quitar.isPending}
      />
      {subir.isPending ? <Aviso tipo="info" mensaje="Subiendo fotos…" /> : null}
      <CamposPublicacion control={control} errors={formState.errors} />
      <Aviso mensaje={error ? mensajeDeError(error) : null} />
      <Boton
        titulo="Guardar cambios"
        cargando={actualizar.isPending}
        onPress={() => void guardar()}
      />
    </Pantalla>
  );
}
