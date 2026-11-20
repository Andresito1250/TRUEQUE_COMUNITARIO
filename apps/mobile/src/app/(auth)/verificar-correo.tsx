import { useMutation } from '@tanstack/react-query';
import type { RespuestaLogin } from '@trueque/shared';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { CampoCodigo } from '@/components/campo-codigo';
import { Aviso } from '@/components/ui/aviso';
import { Boton } from '@/components/ui/boton';
import { Pantalla } from '@/components/ui/pantalla';
import { Texto } from '@/components/ui/texto';
import { useCuentaRegresiva } from '@/hooks/use-cuenta-regresiva';
import { useIniciarSesion } from '@/hooks/use-iniciar-sesion';
import { mensajeDeError, pedir } from '@/lib/api';

/** RF-02: verificación del correo con el código enviado. Al verificar, la sesión inicia sola. */
export default function VerificarCorreoScreen() {
  const { correo } = useLocalSearchParams<{ correo: string }>();
  const [codigo, setCodigo] = useState('');
  const espera = useCuentaRegresiva(60);
  const iniciarSesion = useIniciarSesion();

  const verificar = useMutation({
    mutationFn: (c: string) =>
      pedir<RespuestaLogin>('/api/v1/auth/verificar-correo', {
        method: 'POST',
        auth: false,
        cuerpo: { correo, codigo: c },
      }),
    onSuccess: iniciarSesion,
  });

  const reenviar = useMutation({
    mutationFn: () =>
      pedir<{ mensaje: string }>('/api/v1/auth/reenviar-codigo', {
        method: 'POST',
        auth: false,
        cuerpo: { correo },
      }),
    onSuccess: () => espera.reiniciar(60),
  });

  return (
    <Pantalla bordeSuperior={false}>
      <Texto>
        Te enviamos un código de 6 dígitos a <Texto negrita>{correo}</Texto>. Revisa también la
        carpeta de spam.
      </Texto>
      <CampoCodigo valor={codigo} onChange={setCodigo} />
      <Aviso mensaje={verificar.error ? mensajeDeError(verificar.error) : null} />
      <Aviso
        tipo="exito"
        mensaje={reenviar.isSuccess && !reenviar.isPending ? 'Te enviamos un código nuevo.' : null}
      />
      <Aviso mensaje={reenviar.error ? mensajeDeError(reenviar.error) : null} />
      <Boton
        titulo="Verificar"
        cargando={verificar.isPending}
        disabled={codigo.length !== 6}
        onPress={() => verificar.mutate(codigo)}
      />
      <Boton
        titulo={espera.activa ? `Reenviar código en ${espera.segundos} s` : 'Reenviar código'}
        variante="texto"
        disabled={espera.activa}
        cargando={reenviar.isPending}
        onPress={() => reenviar.mutate()}
      />
    </Pantalla>
  );
}
