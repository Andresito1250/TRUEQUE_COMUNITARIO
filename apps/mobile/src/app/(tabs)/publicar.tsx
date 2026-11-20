import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useWatch } from 'react-hook-form';

import {
  CamposPublicacion,
  useFormularioPublicacion,
  VALORES_VACIOS,
  type ValoresPublicacion,
} from '@/components/publicacion/campos-publicacion';
import { EditorFotos, type Foto } from '@/components/publicacion/editor-fotos';
import { Aviso } from '@/components/ui/aviso';
import { Boton } from '@/components/ui/boton';
import { Casilla } from '@/components/ui/casilla';
import { Pantalla } from '@/components/ui/pantalla';
import { Texto } from '@/components/ui/texto';
import { useCrearPublicacion, useSubirFotos } from '@/hooks/use-publicaciones';
import { mensajeDeError } from '@/lib/api';
import { borrarBorrador, guardarBorrador, leerBorrador } from '@/lib/borrador';
import { ubicacionAproximada } from '@/lib/ubicacion';

const CLAVE_BORRADOR = 'trueque.borrador.publicacion';
type Borrador = { valores: ValoresPublicacion; fotos: string[] };

/** RF-06: publicar un bien o servicio con hasta 5 fotos. Guarda un borrador mientras escribes (RNF07). */
export default function PublicarScreen() {
  const form = useFormularioPublicacion();
  const { control, formState, handleSubmit, reset } = form;
  const valores = useWatch({ control }) as ValoresPublicacion;
  const [fotos, setFotos] = useState<string[]>([]);
  const [usarUbicacion, setUsarUbicacion] = useState(true);
  const [borradorRecuperado, setBorradorRecuperado] = useState(false);
  const [paso, setPaso] = useState<string | null>(null);
  const cargado = useRef(false);

  const crear = useCrearPublicacion();
  const subir = useSubirFotos();

  // Recupera el borrador al abrir la pantalla.
  useEffect(() => {
    void leerBorrador<Borrador>(CLAVE_BORRADOR).then((b) => {
      if (b && (b.valores.titulo || b.valores.descripcion || b.fotos.length)) {
        reset(b.valores);
        setFotos(b.fotos);
        setBorradorRecuperado(true);
      }
      cargado.current = true;
    });
  }, [reset]);

  // Guarda el borrador medio segundo después del último cambio.
  useEffect(() => {
    if (!cargado.current) return;
    const t = setTimeout(
      () => void guardarBorrador<Borrador>(CLAVE_BORRADOR, { valores, fotos }),
      500,
    );
    return () => clearTimeout(t);
  }, [valores, fotos]);

  const descartar = async () => {
    await borrarBorrador(CLAVE_BORRADOR);
    reset(VALORES_VACIOS);
    setFotos([]);
    setBorradorRecuperado(false);
  };

  const publicar = handleSubmit(async (v) => {
    try {
      setPaso('Ubicando tu publicación…');
      const ubicacion = usarUbicacion ? await ubicacionAproximada() : null;
      setPaso('Publicando…');
      const creada = await crear.mutateAsync({
        titulo: v.titulo,
        descripcion: v.descripcion,
        tipo: v.tipo,
        categoriaId: v.categoriaId as number,
        estadoConservacion: v.estadoConservacion ?? 'NO_APLICA',
        ...(ubicacion ? { ubicacion } : {}),
      });
      await borrarBorrador(CLAVE_BORRADOR);
      reset(VALORES_VACIOS);
      setFotos([]);
      setBorradorRecuperado(false);

      if (fotos.length) {
        setPaso(`Subiendo ${fotos.length === 1 ? 'la foto' : `${fotos.length} fotos`}…`);
        try {
          await subir.mutateAsync({ id: creada.id, uris: fotos });
        } catch (e) {
          // La publicación ya existe: se lleva a editarla para reintentar las fotos.
          router.push({
            pathname: '/publicacion/editar/[id]',
            params: {
              id: creada.id,
              aviso: `Tu publicación se creó, pero las fotos no subieron: ${mensajeDeError(e)}`,
            },
          });
          return;
        }
      }
      router.push({ pathname: '/publicacion/[id]', params: { id: creada.id } });
    } catch {
      // El error de crear se muestra en pantalla.
    } finally {
      setPaso(null);
    }
  });

  const fotosEditor: Foto[] = fotos.map((uri) => ({ tipo: 'local', uri }));

  return (
    <Pantalla>
      <Texto variante="titulo" accessibilityRole="header">
        Publicar
      </Texto>
      {borradorRecuperado ? (
        <>
          <Aviso tipo="info" mensaje="Recuperamos lo que estabas escribiendo." />
          <Boton titulo="Empezar de cero" variante="texto" onPress={() => void descartar()} />
        </>
      ) : null}

      <EditorFotos
        fotos={fotosEditor}
        onAgregar={(uris) => setFotos((f) => [...f, ...uris])}
        onQuitar={(foto) =>
          foto.tipo === 'local' && setFotos((f) => f.filter((u) => u !== foto.uri))
        }
        ocupado={!!paso}
      />
      <CamposPublicacion control={control} errors={formState.errors} />
      <Casilla
        marcada={usarUbicacion}
        onChange={setUsarUbicacion}
        etiqueta="Usar mi ubicación aproximada para que te encuentren vecinos cercanos"
      />
      <Texto variante="pequeno" color="textSecondary">
        Nunca mostramos tu ubicación exacta. Si no la compartes, usamos el centro de tu localidad.
      </Texto>

      <Aviso mensaje={crear.error ? mensajeDeError(crear.error) : null} />
      {paso ? <Aviso tipo="info" mensaje={paso} /> : null}
      <Boton titulo="Publicar" cargando={!!paso} onPress={() => void publicar()} />
    </Pantalla>
  );
}
