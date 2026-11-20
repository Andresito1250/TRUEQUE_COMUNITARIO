import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { ElegirPublicaciones } from '@/components/trueque/elegir-publicaciones';
import { Aviso } from '@/components/ui/aviso';
import { Boton } from '@/components/ui/boton';
import { CampoTexto } from '@/components/ui/campo-texto';
import { EstadoVacio } from '@/components/ui/estado-vacio';
import { Pantalla } from '@/components/ui/pantalla';
import { Texto } from '@/components/ui/texto';
import { useMisPublicaciones, usePublicacion } from '@/hooks/use-publicaciones';
import { useTheme } from '@/hooks/use-theme';
import { useCrearPropuesta } from '@/hooks/use-trueques';
import { mensajeDeError } from '@/lib/api';

/** RF-14: elegir qué ofrecer a cambio de una publicación. */
export default function NuevaPropuestaScreen() {
  const theme = useTheme();
  const { publicacionId } = useLocalSearchParams<{ publicacionId: string }>();
  const { data: objetivo } = usePublicacion(publicacionId);
  const { data: mias, isLoading } = useMisPublicaciones(false);
  const crear = useCrearPropuesta();
  const [elegidas, setElegidas] = useState<string[]>([]);
  const [mensaje, setMensaje] = useState('');
  const disponibles = (mias ?? []).filter((p) => p.estado === 'DISPONIBLE');

  if (isLoading || !objetivo) {
    return (
      <Pantalla bordeSuperior={false}>
        <ActivityIndicator color={theme.primary} />
      </Pantalla>
    );
  }

  if (disponibles.length === 0) {
    return (
      <Pantalla bordeSuperior={false}>
        <EstadoVacio
          icono="add-circle-outline"
          titulo="Primero publica algo para ofrecer"
          descripcion="Para proponer un trueque necesitas al menos una publicación disponible: un objeto o un servicio."
          accion={{ titulo: 'Publicar', onPress: () => router.navigate('/publicar') }}
        />
      </Pantalla>
    );
  }

  const enviar = () =>
    crear.mutate(
      { publicacionId, ofrecidas: elegidas, mensaje },
      {
        onSuccess: (p) =>
          router.replace({ pathname: '/propuesta/[id]', params: { id: p.id, nueva: '1' } }),
      },
    );

  return (
    <Pantalla bordeSuperior={false}>
      <Texto>
        Quieres <Texto negrita>«{objetivo.titulo}»</Texto> de {objetivo.oferente.nombre}. ¿Qué le
        ofreces a cambio?
      </Texto>
      <ElegirPublicaciones
        titulo="Tus publicaciones disponibles"
        publicaciones={disponibles}
        elegidas={elegidas}
        onChange={setElegidas}
      />
      <CampoTexto
        etiqueta="Mensaje (opcional)"
        value={mensaje}
        onChangeText={setMensaje}
        placeholder="Hola, me interesa. ¿Te sirve lo que te ofrezco?"
        multiline
        maxLength={500}
      />
      <Aviso mensaje={crear.error ? mensajeDeError(crear.error) : null} />
      <Boton
        titulo={elegidas.length ? 'Enviar propuesta' : 'Elige qué ofrecer'}
        onPress={enviar}
        disabled={!elegidas.length}
        cargando={crear.isPending}
      />
    </Pantalla>
  );
}
