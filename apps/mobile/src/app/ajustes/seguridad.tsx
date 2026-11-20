import Ionicons from '@expo/vector-icons/Ionicons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Configuracion2fa } from '@trueque/shared';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CampoCodigo } from '@/components/campo-codigo';
import { Aviso } from '@/components/ui/aviso';
import { Boton } from '@/components/ui/boton';
import { Pantalla } from '@/components/ui/pantalla';
import { Texto } from '@/components/ui/texto';
import { Radius, Spacing } from '@/constants/theme';
import { usePerfil } from '@/hooks/use-perfil';
import { useTheme } from '@/hooks/use-theme';
import { mensajeDeError, pedir } from '@/lib/api';

/** RF-02 / RNF09: activar o desactivar la verificación en dos pasos (TOTP). */
export default function SeguridadScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const { data: perfil } = usePerfil();
  const [config, setConfig] = useState<Configuracion2fa | null>(null);
  const [codigo, setCodigo] = useState('');
  const [copiado, setCopiado] = useState(false);

  const alTerminar = async () => {
    setConfig(null);
    setCodigo('');
    await qc.invalidateQueries({ queryKey: ['perfil'] });
  };

  const configurar = useMutation({
    mutationFn: () => pedir<Configuracion2fa>('/api/v1/auth/2fa/configurar', { method: 'POST' }),
    onSuccess: setConfig,
  });
  const activar = useMutation({
    mutationFn: () =>
      pedir<{ mensaje: string }>('/api/v1/auth/2fa/activar', {
        method: 'POST',
        cuerpo: { codigo },
      }),
    onSuccess: alTerminar,
  });
  const desactivar = useMutation({
    mutationFn: () =>
      pedir<{ mensaje: string }>('/api/v1/auth/2fa/desactivar', {
        method: 'POST',
        cuerpo: { codigo },
      }),
    onSuccess: alTerminar,
  });

  if (!perfil) return null;
  const error = configurar.error ?? activar.error ?? desactivar.error;
  const exito = activar.data?.mensaje ?? desactivar.data?.mensaje;

  return (
    <Pantalla bordeSuperior={false}>
      <View style={[styles.estado, { backgroundColor: theme.surfaceAlt }]}>
        <Ionicons
          name={perfil.totpActivo ? 'shield-checkmark' : 'shield-outline'}
          size={32}
          color={perfil.totpActivo ? theme.primary : theme.textSecondary}
        />
        <View style={styles.flex}>
          <Texto negrita>Verificación en dos pasos</Texto>
          <Texto color="textSecondary">
            {perfil.totpActivo ? 'Activa' : 'Desactivada (opcional)'}
          </Texto>
        </View>
      </View>
      <Texto>
        Además de tu contraseña, te pediremos un código de una app autenticadora como Google
        Authenticator o Microsoft Authenticator. Así nadie entra a tu cuenta aunque conozca tu
        contraseña.
      </Texto>
      <Aviso tipo="exito" mensaje={exito} />
      <Aviso mensaje={error ? mensajeDeError(error) : null} />

      {perfil.totpActivo ? (
        <>
          <CampoCodigo
            etiqueta="Código de tu app autenticadora"
            valor={codigo}
            onChange={setCodigo}
          />
          <Boton
            titulo="Desactivar verificación en dos pasos"
            variante="secundario"
            disabled={codigo.length !== 6}
            cargando={desactivar.isPending}
            onPress={() => desactivar.mutate()}
          />
        </>
      ) : config ? (
        <>
          <Texto negrita>1. Agrega la cuenta a tu app autenticadora</Texto>
          <Boton
            titulo="Abrir app autenticadora"
            onPress={() => void Linking.openURL(config.uri).catch(() => undefined)}
          />
          <Texto color="textSecondary">
            Si no se abre, agrega la cuenta a mano con esta clave:
          </Texto>
          <View style={[styles.clave, { borderColor: theme.border }]}>
            <Texto selectable negrita style={styles.flex}>
              {config.secreto}
            </Texto>
            <Boton
              titulo={copiado ? 'Copiada' : 'Copiar'}
              variante="texto"
              onPress={async () => {
                await Clipboard.setStringAsync(config.secreto);
                setCopiado(true);
              }}
            />
          </View>
          <Texto negrita>2. Escribe el código que muestra la app</Texto>
          <CampoCodigo valor={codigo} onChange={setCodigo} />
          <Boton
            titulo="Activar"
            disabled={codigo.length !== 6}
            cargando={activar.isPending}
            onPress={() => activar.mutate()}
          />
        </>
      ) : (
        <Boton
          titulo="Activar verificación en dos pasos"
          cargando={configurar.isPending}
          onPress={() => configurar.mutate()}
        />
      )}
    </Pantalla>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  estado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  clave: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingLeft: Spacing.md,
  },
});
