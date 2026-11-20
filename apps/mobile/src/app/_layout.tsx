import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { queryClient } from '@/lib/query-client';
import { useSesion } from '@/store/sesion';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const colores = Colors[scheme];
  const listo = useSesion((s) => s.listo);
  const conSesion = useSesion((s) => s.usuario !== null);

  useEffect(() => {
    void useSesion.getState().restaurar();
  }, []);

  useEffect(() => {
    if (listo) SplashScreen.hideAsync().catch(() => undefined);
  }, [listo]);

  if (!listo) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        value={{
          ...base,
          colors: {
            ...base.colors,
            primary: colores.primary,
            background: colores.background,
            card: colores.surface,
            text: colores.text,
            border: colores.border,
          },
        }}
      >
        <Stack
          screenOptions={{
            headerShown: false,
            // Encabezado opaco: sin fondo, iOS lo dibuja translúcido encima del contenido y tapa
            // lo primero de cada pantalla (filtros, campos del formulario).
            headerTransparent: false,
            headerStyle: { backgroundColor: colores.background },
            headerShadowVisible: false,
            headerBackButtonDisplayMode: 'minimal',
            headerTintColor: colores.primary,
            headerTitleStyle: { color: colores.text },
          }}
        >
          {/* Sin sesión: bienvenida, registro e inicio de sesión. */}
          <Stack.Protected guard={!conSesion}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
          {/* Con sesión: pestañas y ajustes. */}
          <Stack.Protected guard={conSesion}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="ajustes/perfil"
              options={{ headerShown: true, title: 'Editar perfil' }}
            />
            <Stack.Screen
              name="ajustes/seguridad"
              options={{ headerShown: true, title: 'Seguridad' }}
            />
            <Stack.Screen
              name="ajustes/privacidad"
              options={{ headerShown: true, title: 'Privacidad y datos' }}
            />
            <Stack.Screen name="publicacion/[id]" options={{ headerShown: true, title: '' }} />
            <Stack.Screen
              name="publicacion/editar/[id]"
              options={{ headerShown: true, title: 'Editar publicación' }}
            />
            <Stack.Screen
              name="propuesta/nueva"
              options={{ headerShown: true, title: 'Proponer trueque' }}
            />
            <Stack.Screen name="propuesta/[id]" options={{ headerShown: true, title: 'Trueque' }} />
            <Stack.Screen
              name="propuesta/encuentro/[id]"
              options={{ headerShown: true, title: 'Acordar el encuentro' }}
            />
            <Stack.Screen
              name="propuesta/contrapropuesta/[id]"
              options={{ headerShown: true, title: 'Proponer otro trato' }}
            />
            <Stack.Screen
              name="filtros"
              options={{ headerShown: true, title: 'Filtros', presentation: 'modal' }}
            />
            <Stack.Screen
              name="mis-publicaciones"
              options={{ headerShown: true, title: 'Mis publicaciones' }}
            />
          </Stack.Protected>
          {/* Siempre disponibles. */}
          <Stack.Screen
            name="legal/politica"
            options={{ headerShown: true, title: 'Política de datos' }}
          />
          <Stack.Screen
            name="legal/terminos"
            options={{ headerShown: true, title: 'Términos de uso' }}
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
