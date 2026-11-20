import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { ElegirPublicaciones } from '@/components/trueque/elegir-publicaciones';
import { Aviso } from '@/components/ui/aviso';
import { Boton } from '@/components/ui/boton';
import { CampoTexto } from '@/components/ui/campo-texto';
import { Pantalla } from '@/components/ui/pantalla';
import { Texto } from '@/components/ui/texto';
import { useMisPublicaciones } from '@/hooks/use-publicaciones';
import { useTheme } from '@/hooks/use-theme';
import { useAccionPropuesta, useDisponiblesDe, usePropuesta } from '@/hooks/use-trueques';
import { mensajeDeError } from '@/lib/api';

/**
 * RF-15: contrapropuesta. Quien recibió la propuesta cambia lo que pide y lo que da;
 * la original se cierra y la otra persona recibe la nueva.
 */
export default function ContrapropuestaScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: p } = usePropuesta(id);
  const { data: deLaOtra } = useDisponiblesDe(p?.contraparte.id);
  const { data: mias } = useMisPublicaciones(false);
  const accion = useAccionPropuesta(id);
  // Se parte de la propuesta original: lo que me ofrecen y lo que me piden.
  const [solicitadas, setSolicitadas] = useState<string[]>(
    () => p?.ofrecidas.map((x) => x.id) ?? [],
  );
  const [ofrecidas, setOfrecidas] = useState<string[]>(() => p?.solicitadas.map((x) => x.id) ?? []);
  const [mensaje, setMensaje] = useState('');

  if (!p || !deLaOtra || !mias) {
    return (
      <Pantalla bordeSuperior={false}>
        <ActivityIndicator color={theme.primary} />
      </Pantalla>
    );
  }
  const otro = p.contraparte.nombre.split(' ')[0];
  const misDisponibles = mias.filter((x) => x.estado === 'DISPONIBLE');

  const enviar = () =>
    accion.mutate(
      { accion: 'contrapropuesta', cuerpo: { solicitadas, ofrecidas, mensaje } },
      {
        onSuccess: (nueva) =>
          router.replace({ pathname: '/propuesta/[id]', params: { id: nueva.id } }),
      },
    );

  return (
    <Pantalla bordeSuperior={false}>
      <Texto>
        Cambia lo que quieres de {otro} o lo que le das. {otro} recibirá tu nueva propuesta.
      </Texto>
      <ElegirPublicaciones
        titulo={`Lo que quieres de ${otro}`}
        publicaciones={deLaOtra}
        elegidas={solicitadas}
        onChange={setSolicitadas}
      />
      <ElegirPublicaciones
        titulo="Lo que das a cambio"
        publicaciones={misDisponibles}
        elegidas={ofrecidas}
        onChange={setOfrecidas}
      />
      <CampoTexto
        etiqueta="Mensaje (opcional)"
        value={mensaje}
        onChangeText={setMensaje}
        placeholder="Te propongo esto en cambio…"
        multiline
        maxLength={500}
      />
      <Aviso mensaje={accion.error ? mensajeDeError(accion.error) : null} />
      <Boton
        titulo="Enviar contrapropuesta"
        onPress={enviar}
        disabled={!solicitadas.length || !ofrecidas.length}
        cargando={accion.isPending}
      />
    </Pantalla>
  );
}
