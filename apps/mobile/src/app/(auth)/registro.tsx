import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { LOCALIDAD_NOMBRE, Localidad, type RegistroDto, registroSchema } from '@trueque/shared';
import { router } from 'expo-router';
import { Controller, type Resolver, useForm } from 'react-hook-form';

import { Aviso } from '@/components/ui/aviso';
import { Boton } from '@/components/ui/boton';
import { CampoTexto } from '@/components/ui/campo-texto';
import { Casilla } from '@/components/ui/casilla';
import { Enlace } from '@/components/ui/enlace';
import { Pantalla } from '@/components/ui/pantalla';
import { Selector } from '@/components/ui/selector';
import { Texto } from '@/components/ui/texto';
import { mensajeDeError, pedir } from '@/lib/api';

type Formulario = Omit<RegistroDto, 'aceptaPoliticaDatos' | 'aceptaTerminos' | 'localidad'> & {
  localidad: Localidad | undefined;
  aceptaPoliticaDatos: boolean;
  aceptaTerminos: boolean;
};

const OPCIONES_LOCALIDAD = Object.values(Localidad).map((l) => ({
  valor: l,
  etiqueta: LOCALIDAD_NOMBRE[l],
}));

/** RF-01: registro con aceptación obligatoria de la política de datos y los términos. */
export default function RegistroScreen() {
  const { control, handleSubmit, formState } = useForm<Formulario>({
    resolver: zodResolver(registroSchema) as unknown as Resolver<Formulario>,
    defaultValues: {
      nombre: '',
      correo: '',
      contrasena: '',
      localidad: undefined,
      aceptaPoliticaDatos: false,
      aceptaTerminos: false,
    },
  });
  const { errors } = formState;

  const registro = useMutation({
    mutationFn: (datos: Formulario) =>
      pedir<{ correo: string }>('/api/v1/auth/registro', {
        method: 'POST',
        auth: false,
        cuerpo: datos,
      }),
    onSuccess: ({ correo }) => router.push({ pathname: '/verificar-correo', params: { correo } }),
  });

  return (
    <Pantalla bordeSuperior={false}>
      <Texto color="textSecondary">Solo te tomará un par de minutos.</Texto>

      <Controller
        control={control}
        name="nombre"
        render={({ field }) => (
          <CampoTexto
            etiqueta="Nombre"
            placeholder="Como quieres que te vean"
            autoComplete="name"
            textContentType="name"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.nombre?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="correo"
        render={({ field }) => (
          <CampoTexto
            etiqueta="Correo electrónico"
            placeholder="nombre@correo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.correo?.message}
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
            autoComplete="new-password"
            textContentType="newPassword"
            ayuda="Mínimo 8 caracteres, con letras y números."
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.contrasena?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="localidad"
        render={({ field }) => (
          <Selector
            etiqueta="¿En qué localidad vives?"
            opciones={OPCIONES_LOCALIDAD}
            valor={field.value}
            onChange={field.onChange}
            error={errors.localidad?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="aceptaPoliticaDatos"
        render={({ field }) => (
          <Casilla
            marcada={field.value}
            onChange={field.onChange}
            etiqueta="Acepto la política de tratamiento de datos personales"
            error={errors.aceptaPoliticaDatos?.message}
          >
            <Texto>
              Acepto la <Enlace href="/legal/politica">política de tratamiento de datos</Enlace>{' '}
              (Ley 1581 de 2012)
            </Texto>
          </Casilla>
        )}
      />
      <Controller
        control={control}
        name="aceptaTerminos"
        render={({ field }) => (
          <Casilla
            marcada={field.value}
            onChange={field.onChange}
            etiqueta="Acepto los términos de uso y soy mayor de 18 años"
            error={errors.aceptaTerminos?.message}
          >
            <Texto>
              Acepto los <Enlace href="/legal/terminos">términos de uso</Enlace> y soy mayor de 18
              años
            </Texto>
          </Casilla>
        )}
      />

      <Aviso mensaje={registro.error ? mensajeDeError(registro.error) : null} />
      <Boton
        titulo="Crear cuenta"
        cargando={registro.isPending}
        onPress={() => void handleSubmit((d) => registro.mutate(d))()}
      />
      <Boton titulo="Ya tengo cuenta" variante="texto" onPress={() => router.replace('/login')} />
    </Pantalla>
  );
}
