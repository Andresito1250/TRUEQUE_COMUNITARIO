import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export const unstable_settings = { initialRouteName: 'bienvenida' };

export default function AuthLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: theme.primary,
        headerTitleStyle: { color: theme.text },
        headerStyle: { backgroundColor: theme.background },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="bienvenida" options={{ headerShown: false }} />
      <Stack.Screen name="registro" options={{ title: 'Crear cuenta' }} />
      <Stack.Screen name="verificar-correo" options={{ title: 'Verifica tu correo' }} />
      <Stack.Screen name="login" options={{ title: 'Iniciar sesión' }} />
      <Stack.Screen name="login-2fa" options={{ title: 'Verificación en dos pasos' }} />
      <Stack.Screen name="recuperar" options={{ title: 'Recuperar contraseña' }} />
      <Stack.Screen name="restablecer" options={{ title: 'Nueva contraseña' }} />
    </Stack>
  );
}
