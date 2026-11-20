import { zodResolver } from '@hookform/resolvers/zod';
import {
  crearPublicacionSchema,
  ESTADO_CONSERVACION_NOMBRE,
  EstadoConservacion,
  TIPO_NOMBRE,
  TipoPublicacion,
} from '@trueque/shared';
import { useEffect } from 'react';
import {
  type Control,
  Controller,
  type FieldErrors,
  type Resolver,
  useForm,
  useWatch,
} from 'react-hook-form';

import { CampoTexto } from '@/components/ui/campo-texto';
import { Selector } from '@/components/ui/selector';
import { useCategorias } from '@/hooks/use-perfil';

export type ValoresPublicacion = {
  titulo: string;
  descripcion: string;
  tipo: TipoPublicacion;
  categoriaId: number | undefined;
  estadoConservacion: EstadoConservacion | undefined;
};

export const VALORES_VACIOS: ValoresPublicacion = {
  titulo: '',
  descripcion: '',
  tipo: 'BIEN',
  categoriaId: undefined,
  estadoConservacion: undefined,
};

const OPCIONES_TIPO = Object.values(TipoPublicacion).map((t) => ({
  valor: t,
  etiqueta: TIPO_NOMBRE[t],
}));
const OPCIONES_CONSERVACION = Object.values(EstadoConservacion)
  .filter((e) => e !== 'NO_APLICA')
  .map((e) => ({ valor: e, etiqueta: ESTADO_CONSERVACION_NOMBRE[e] }));

/** Formulario de publicación validado con el mismo esquema que usa el API. */
export function useFormularioPublicacion(iniciales: ValoresPublicacion = VALORES_VACIOS) {
  const form = useForm<ValoresPublicacion>({
    resolver: zodResolver(crearPublicacionSchema) as unknown as Resolver<ValoresPublicacion>,
    defaultValues: iniciales,
  });
  const tipo = useWatch({ control: form.control, name: 'tipo' });
  const { setValue, getValues } = form;

  // Los servicios no tienen estado de conservación.
  useEffect(() => {
    if (tipo === 'SERVICIO') setValue('estadoConservacion', 'NO_APLICA');
    else if (getValues('estadoConservacion') === 'NO_APLICA')
      setValue('estadoConservacion', undefined);
  }, [tipo, setValue, getValues]);

  return form;
}

type CamposProps = {
  control: Control<ValoresPublicacion>;
  errors: FieldErrors<ValoresPublicacion>;
};

/** Campos de RF-06: tipo, título, descripción, categoría y estado de conservación. */
export function CamposPublicacion({ control, errors }: CamposProps) {
  const { data: categorias = [] } = useCategorias();
  const tipo = useWatch({ control, name: 'tipo' });

  return (
    <>
      <Controller
        control={control}
        name="tipo"
        render={({ field }) => (
          <Selector
            etiqueta="¿Qué ofreces?"
            opciones={OPCIONES_TIPO}
            valor={field.value}
            onChange={field.onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="titulo"
        render={({ field }) => (
          <CampoTexto
            etiqueta="Título"
            placeholder={tipo === 'SERVICIO' ? 'Ej.: Clases de inglés' : 'Ej.: Bicicleta rin 16'}
            maxLength={80}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.titulo?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="descripcion"
        render={({ field }) => (
          <CampoTexto
            etiqueta="Descripción"
            placeholder="Cuenta cómo es, qué tamaño tiene y qué te gustaría recibir a cambio"
            multiline
            maxLength={1000}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.descripcion?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="categoriaId"
        render={({ field }) => (
          <Selector
            etiqueta="Categoría"
            opciones={categorias.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
            valor={field.value}
            onChange={field.onChange}
            error={errors.categoriaId?.message}
          />
        )}
      />
      {tipo === 'BIEN' ? (
        <Controller
          control={control}
          name="estadoConservacion"
          render={({ field }) => (
            <Selector
              etiqueta="¿En qué estado está?"
              opciones={OPCIONES_CONSERVACION}
              valor={field.value}
              onChange={field.onChange}
              error={errors.estadoConservacion?.message}
            />
          )}
        />
      ) : null}
    </>
  );
}
