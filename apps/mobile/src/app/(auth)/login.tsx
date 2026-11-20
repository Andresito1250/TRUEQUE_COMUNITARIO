import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { CodigoError, type LoginDto, loginSchema, type RespuestaLogin } from '@trueque/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';

import { Aviso } from '@/components/ui/aviso';
import { Boton } from '@/components/ui/boton';
import { CampoTexto } from '@/components/ui/campo-texto';
import { Pantalla } from '@/components/ui/pantalla';
import { useIniciarSesion } from '@/hooks/use-iniciar-sesion';
import { ErrorApi, mensajeDeError, pedir } from '@/lib/api';

/** RF-03: inicio de sesión. */
export default function LoginScreen() {
  const { aviso } = useLocalSearchParams<{ aviso?: string }>();
  const iniciarSesion = useIniciarSesion();
  const { control, handleSubmit, formState, getValues } = useForm<LoginDto>({
    resolver: zodResolver(loginSchema),
    defaultValues: { correo: '', contrasena: '' },
  });

  const login = useMutation({
    mutationFn: (datos: LoginDto) =>
      pedir<RespuestaLogin>('/api/v1/auth/login', { method: 'POST', auth: false, cuerpo: datos }),
    onSuccess: iniciarSesion,
    onError: (e) => {
      // Cuenta sin verificar: el API ya envió un código nuevo; se lleva a la pantalla de verificación.
      if (e instanceof ErrorApi && e.codigo === CodigoError.CORREO_NO_VERIFICADO) {
        router.push({
          pathname: '/verificar-correo',
          params: { correo: getValues('correo').trim().toLowerCase() },
        });
      }
    },
  });

  return (
    <Pantalla bordeSuperior={false}>
      <Aviso tipo="exito" mensaje={aviso} />
      <Controller
        control={control}
        name="correo"
        render={({ field }) => (
          <CampoTexto
            etiqueta="Correo electrónico"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={formState.errors.correo?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="contrasena"
        render={({ field }) => (
          <CampoTexto
            etiqueta="Contraseña"
            contrasena
            autoComplete="current-password"
            textContentType="password"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            onSubmitEditing={() => void handleSubmit((d) => login.mutate(d))()}
            error={formState.errors.contrasena?.message}
          />
        )}
      />
      <Aviso mensaje={login.error ? mensajeDeError(login.error) : null} />
      <Boton
        titulo="Iniciar sesión"
        cargando={login.isPending}
        onPress={() => void handleSubmit((d) => login.mutate(d))()}
      />
      <Boton
        titulo="Olvidé mi contraseña"
        variante="texto"
        onPress={() => router.push('/recuperar')}
      />
      <Boton
        titulo="Crear una cuenta nueva"
        variante="texto"
        onPress={() => router.replace('/registro')}
      />
    </Pantalla>
  );
}
