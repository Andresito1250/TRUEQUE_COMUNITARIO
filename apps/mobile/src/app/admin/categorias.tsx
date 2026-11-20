import Ionicons from '@expo/vector-icons/Ionicons';
import type { CategoriaAdmin } from '@trueque/shared';
import { type ComponentProps, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Aviso } from '@/components/ui/aviso';
import { Boton } from '@/components/ui/boton';
import { CampoTexto } from '@/components/ui/campo-texto';
import { Pantalla } from '@/components/ui/pantalla';
import { Texto } from '@/components/ui/texto';
import { Radius, Spacing } from '@/constants/theme';
import { useCategoriasAdmin, useGuardarCategoria } from '@/hooks/use-admin';
import { useTheme } from '@/hooks/use-theme';
import { mensajeDeError } from '@/lib/api';

type Icono = ComponentProps<typeof Ionicons>['name'];
const esIcono = (n: string): n is Icono => n in Ionicons.glyphMap;

/** RF-28: administrar las categorías. Desactivar no borra las publicaciones existentes. */
export default function CategoriasAdminScreen() {
  const theme = useTheme();
  const { data, isLoading } = useCategoriasAdmin();
  const guardar = useGuardarCategoria();
  const [editando, setEditando] = useState<CategoriaAdmin | 'nueva' | null>(null);
  const [nombre, setNombre] = useState('');
  const [icono, setIcono] = useState('');

  const abrir = (c: CategoriaAdmin | 'nueva') => {
    setEditando(c);
    setNombre(c === 'nueva' ? '' : c.nombre);
    setIcono(c === 'nueva' ? '' : (c.icono ?? ''));
    guardar.reset();
  };

  const enviar = () =>
    guardar.mutate(
      editando && editando !== 'nueva' ? { id: editando.id, nombre, icono } : { nombre, icono },
      { onSuccess: () => setEditando(null) },
    );

  return (
    <Pantalla bordeSuperior={false}>
      {editando ? (
        <View
          style={[
            styles.tarjeta,
            { backgroundColor: theme.surfaceAlt, borderColor: theme.primary },
          ]}
        >
          <Texto variante="subtitulo">
            {editando === 'nueva' ? 'Nueva categoría' : 'Editar categoría'}
          </Texto>
          <CampoTexto etiqueta="Nombre" value={nombre} onChangeText={setNombre} maxLength={60} />
          <CampoTexto
            etiqueta="Icono (nombre de Ionicons)"
            value={icono}
            onChangeText={setIcono}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="bicycle-outline"
          />
          <View style={styles.fila}>
            <Texto variante="pequeno" color="textSecondary">
              Vista previa:
            </Texto>
            <Ionicons
              name={esIcono(icono) ? icono : 'help-circle-outline'}
              size={28}
              color={esIcono(icono) ? theme.primary : theme.textSecondary}
            />
          </View>
          <Aviso mensaje={guardar.error ? mensajeDeError(guardar.error) : null} />
          <Boton
            titulo="Guardar"
            onPress={enviar}
            cargando={guardar.isPending}
            disabled={!esIcono(icono)}
          />
          <Boton titulo="Cancelar" variante="texto" onPress={() => setEditando(null)} />
        </View>
      ) : (
        <Boton titulo="Agregar categoría" onPress={() => abrir('nueva')} />
      )}

      {isLoading ? <ActivityIndicator color={theme.primary} /> : null}
      {(data ?? []).map((c) => (
        <View
          key={c.id}
          style={[
            styles.tarjeta,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              opacity: c.activa ? 1 : 0.6,
            },
          ]}
        >
          <View style={styles.fila}>
            <Ionicons
              name={c.icono && esIcono(c.icono) ? c.icono : 'pricetag-outline'}
              size={26}
              color={theme.primary}
            />
            <View style={styles.flex}>
              <Texto negrita>{c.nombre}</Texto>
              <Texto variante="pequeno" color="textSecondary">
                {c.publicaciones} publicaciones · {c.activa ? 'Activa' : 'Desactivada'}
              </Texto>
            </View>
          </View>
          <View style={styles.acciones}>
            <Boton titulo="Editar" variante="texto" onPress={() => abrir(c)} />
            <Boton
              titulo={c.activa ? 'Desactivar' : 'Activar'}
              variante="secundario"
              onPress={() => guardar.mutate({ id: c.id, activa: !c.activa })}
            />
          </View>
        </View>
      ))}
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tarjeta: { gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  acciones: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm },
});
