import { zodResolver } from '@hookform/resolvers/zod';
import {
  actualizarPerfilSchema,
  type Localidad,
  LOCALIDAD_NOMBRE,
  Localidad as Localidades,
} from '@trueque/shared';
import { router } from 'expo-router';
import { Controller, type Resolver, useForm } from 'react-hook-form';

import { Aviso } from '@/components/ui/aviso';
import { Boton } from '@/components/ui/boton';
import { CampoTexto } from '@/components/ui/campo-texto';
import { Pantalla } from '@/components/ui/pantalla';
import { Selector } from '@/components/ui/selector';
import { Texto } from '@/components/ui/texto';
import { useActualizarPerfil, useCategorias, usePerfil } from '@/hooks/use-perfil';
import { mensajeDeError } from '@/lib/api';

type Formulario = {
  nombre: string;
  descripcion: string;
  localidad: Localidad;
  telefonoContacto: string;
  categoriasInteres: number[];
};

const OPCIONES_LOCALIDAD = Object.values(Localidades).map((l) => ({
  valor: l,
  etiqueta: LOCALIDAD_NOMBRE[l],
}));

/** RF-05: editar el perfil. La foto se agrega en el Sprint 2 junto con la subida de imágenes. */
export default function EditarPerfilScreen() {
  const { data: perfil } = usePerfil();
  const { data: categorias = [] } = useCategorias();
  const guardar = useActualizarPerfil();

  const { control, handleSubmit, formState } = useForm<Formulario>({
    resolver: zodResolver(
      actualizarPerfilSchema.required({ nombre: true, localidad: true }),
    ) as unknown as Resolver<Formulario>,
    values: perfil && {
      nombre: perfil.nombre,
      descripcion: perfil.descripcion ?? '',
      localidad: perfil.localidad,
      telefonoContacto: perfil.telefonoContacto ?? '',
      categoriasInteres: perfil.categoriasInteres.map((c) => c.id),
    },
  });
  const { errors } = formState;

  const enviar = handleSubmit((f) =>
    guardar.mutate(
      {
        nombre: f.nombre,
        localidad: f.localidad,
        descripcion: f.descripcion.trim() || null,
        telefonoContacto: f.telefonoContacto.trim() || null,
        categoriasInteres: f.categoriasInteres,
      },
      { onSuccess: () => router.back() },
    ),
  );

  if (!perfil) return null;

  return (
    <Pantalla bordeSuperior={false}>
      <Controller
        control={control}
        name="nombre"
        render={({ field }) => (
          <CampoTexto
            etiqueta="Nombre"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.nombre?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="descripcion"
        render={({ field }) => (
          <CampoTexto
            etiqueta="Sobre ti (opcional)"
            placeholder="Cuéntale a la comunidad qué te gusta cambiar"
            multiline
            maxLength={500}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.descripcion?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="localidad"
        render={({ field }) => (
          <Selector
            etiqueta="Localidad"
            opciones={OPCIONES_LOCALIDAD}
            valor={field.value}
            onChange={field.onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="telefonoContacto"
        render={({ field }) => (
          <CampoTexto
            etiqueta="Teléfono (opcional)"
            keyboardType="phone-pad"
            autoComplete="tel"
            ayuda="Es privado: nunca se muestra a otras personas."
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.telefonoContacto?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="categoriasInteres"
        render={({ field }) => (
          <Selector
            multiple
            etiqueta="¿Qué te interesa recibir?"
            opciones={categorias.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
            valor={field.value}
            onChange={field.onChange}
          />
        )}
      />
      <Texto variante="pequeno" color="textSecondary">
        Tu correo ({perfil.correo}) no se puede cambiar.
      </Texto>
      <Aviso mensaje={guardar.error ? mensajeDeError(guardar.error) : null} />
      <Boton titulo="Guardar cambios" cargando={guardar.isPending} onPress={() => void enviar()} />
    </Pantalla>
  );
}
