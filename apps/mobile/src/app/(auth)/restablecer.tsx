import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { type RestablecerDto, restablecerSchema } from '@trueque/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';

import { CampoCodigo } from '@/components/campo-codigo';
import { Aviso } from '@/components/ui/aviso';
import { Boton } from '@/components/ui/boton';
import { CampoTexto } from '@/components/ui/campo-texto';
import { Pantalla } from '@/components/ui/pantalla';
import { Texto } from '@/components/ui/texto';
import { mensajeDeError, pedir } from '@/lib/api';

/** RF-04: crear una contraseña nueva con el código recibido. */
export default function RestablecerScreen() {
  const { correo } = useLocalSearchParams<{ correo: string }>();
  const { control, handleSubmit, formState } = useForm<RestablecerDto>({
    resolver: zodResolver(restablecerSchema),
    defaultValues: { correo: correo ?? '', codigo: '', contrasenaNueva: '' },
  });

  const restablecer = useMutation({
    mutationFn: (d: RestablecerDto) =>
      pedir<{ mensaje: string }>('/api/v1/auth/restablecer', {
        method: 'POST',
        auth: false,
        cuerpo: d,
      }),
    onSuccess: (r) => router.dismissTo({ pathname: '/login', params: { aviso: r.mensaje } }),
  });

  return (
    <Pantalla bordeSuperior={false}>
      <Texto>
        Si <Texto negrita>{correo}</Texto> tiene una cuenta, te llegó un código. Escríbelo junto con
        tu nueva contraseña.
      </Texto>
      <Controller
        control={control}
        name="codigo"
        render={({ field }) => (
          <CampoCodigo
            valor={field.value}
            onChange={field.onChange}
            error={formState.errors.codigo?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="contrasenaNueva"
        render={({ field }) => (
          <CampoTexto
            etiqueta="Contraseña nueva"
            contrasena
            autoComplete="new-password"
            textContentType="newPassword"
            ayuda="Mínimo 8 caracteres, con letras y números."
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={formState.errors.contrasenaNueva?.message}
          />
        )}
      />
      <Aviso mensaje={restablecer.error ? mensajeDeError(restablecer.error) : null} />
      <Boton
        titulo="Cambiar contraseña"
        cargando={restablecer.isPending}
        onPress={() => void handleSubmit((d) => restablecer.mutate(d))()}
      />
    </Pantalla>
  );
}
