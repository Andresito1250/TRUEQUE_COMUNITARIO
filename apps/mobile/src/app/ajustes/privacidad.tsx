import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Aviso } from '@/components/ui/aviso';
import { Boton } from '@/components/ui/boton';
import { CampoTexto } from '@/components/ui/campo-texto';
import { FilaMenu } from '@/components/ui/fila-menu';
import { Pantalla } from '@/components/ui/pantalla';
import { Texto } from '@/components/ui/texto';
import { Spacing } from '@/constants/theme';
import { mensajeDeError, pedir } from '@/lib/api';
import { useSesion } from '@/store/sesion';

/** RNF11: acceso a la política de datos y eliminación de la cuenta (Ley 1581 de 2012). */
export default function PrivacidadScreen() {
  const cerrar = useSesion((s) => s.cerrar);
  const [contrasena, setContrasena] = useState('');

  const eliminar = useMutation({
    mutationFn: () =>
      pedir<null>('/api/v1/usuarios/me', { method: 'DELETE', cuerpo: { contrasena } }),
    onSuccess: async () => {
      await cerrar();
      Alert.alert(
        'Cuenta eliminada',
        'Borramos tus datos personales. Gracias por ser parte de la comunidad.',
      );
    },
  });

  const confirmar = () =>
    Alert.alert(
      '¿Eliminar tu cuenta?',
      'Se borrarán tus datos personales y tus publicaciones. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => eliminar.mutate() },
      ],
    );

  return (
    <Pantalla bordeSuperior={false}>
      <View>
        <FilaMenu
          icono="document-text-outline"
          titulo="Política de tratamiento de datos"
          onPress={() => router.push('/legal/politica')}
        />
        <FilaMenu
          icono="reader-outline"
          titulo="Términos de uso"
          onPress={() => router.push('/legal/terminos')}
        />
      </View>

      <View style={{ gap: Spacing.md, marginTop: Spacing.lg }}>
        <Texto variante="subtitulo" accessibilityRole="header">
          Eliminar mi cuenta
        </Texto>
        <Texto color="textSecondary">
          Borraremos tu nombre, correo, teléfono, foto y ubicación, y cerraremos tus sesiones. Los
          trueques ya hechos se conservan sin datos que te identifiquen, solo para estadísticas.
        </Texto>
        <CampoTexto
          etiqueta="Escribe tu contraseña para confirmar"
          contrasena
          autoComplete="current-password"
          value={contrasena}
          onChangeText={setContrasena}
        />
        <Aviso mensaje={eliminar.error ? mensajeDeError(eliminar.error) : null} />
        <Boton
          titulo="Eliminar mi cuenta"
          variante="secundario"
          disabled={!contrasena}
          cargando={eliminar.isPending}
          onPress={confirmar}
        />
      </View>
    </Pantalla>
  );
}
