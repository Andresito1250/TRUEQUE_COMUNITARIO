import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { type SoloCorreoDto, soloCorreoSchema } from '@trueque/shared';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';

import { Aviso } from '@/components/ui/aviso';
import { Boton } from '@/components/ui/boton';
import { CampoTexto } from '@/components/ui/campo-texto';
import { Pantalla } from '@/components/ui/pantalla';
import { Texto } from '@/components/ui/texto';
import { mensajeDeError, pedir } from '@/lib/api';

/** RF-04: pedir un código para cambiar la contraseña. */
export default function RecuperarScreen() {
  const { control, handleSubmit, formState } = useForm<SoloCorreoDto>({
    resolver: zodResolver(soloCorreoSchema),
    defaultValues: { correo: '' },
  });

  const recuperar = useMutation({
    mutationFn: (d: SoloCorreoDto) =>
      pedir<{ mensaje: string }>('/api/v1/auth/recuperar', {
        method: 'POST',
        auth: false,
        cuerpo: d,
      }),
    onSuccess: (_r, d) => router.push({ pathname: '/restablecer', params: { correo: d.correo } }),
  });

  return (
    <Pantalla bordeSuperior={false}>
      <Texto>
        Escribe el correo de tu cuenta y te enviaremos un código para crear una contraseña nueva.
      </Texto>
      <Controller
        control={control}
        name="correo"
        render={({ field }) => (
          <CampoTexto
            etiqueta="Correo electrónico"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={formState.errors.correo?.message}
          />
        )}
      />
      <Aviso mensaje={recuperar.error ? mensajeDeError(recuperar.error) : null} />
      <Boton
        titulo="Enviar código"
        cargando={recuperar.isPending}
        onPress={() => void handleSubmit((d) => recuperar.mutate(d))()}
      />
    </Pantalla>
  );
}
