import { useMutation } from '@tanstack/react-query';
import type { RespuestaLogin } from '@trueque/shared';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { CampoCodigo } from '@/components/campo-codigo';
import { Aviso } from '@/components/ui/aviso';
import { Boton } from '@/components/ui/boton';
import { Pantalla } from '@/components/ui/pantalla';
import { Texto } from '@/components/ui/texto';
import { useIniciarSesion } from '@/hooks/use-iniciar-sesion';
import { mensajeDeError, pedir } from '@/lib/api';

/** RF-02: segundo paso del inicio de sesión con el código de la app autenticadora. */
export default function Login2faScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [codigo, setCodigo] = useState('');
  const iniciarSesion = useIniciarSesion();

  const verificar = useMutation({
    mutationFn: () =>
      pedir<RespuestaLogin>('/api/v1/auth/login/2fa', {
        method: 'POST',
        auth: false,
        cuerpo: { tokenTemporal: token, codigo },
      }),
    onSuccess: iniciarSesion,
  });

  return (
    <Pantalla bordeSuperior={false}>
      <Texto>
        Abre tu app autenticadora (por ejemplo Google Authenticator) y escribe el código de Trueque
        Comunitario.
      </Texto>
      <CampoCodigo valor={codigo} onChange={setCodigo} />
      <Aviso mensaje={verificar.error ? mensajeDeError(verificar.error) : null} />
      <Boton
        titulo="Continuar"
        disabled={codigo.length !== 6}
        cargando={verificar.isPending}
        onPress={() => verificar.mutate()}
      />
    </Pantalla>
  );
}
