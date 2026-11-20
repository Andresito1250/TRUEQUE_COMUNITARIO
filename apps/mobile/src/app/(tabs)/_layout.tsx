import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';

import { FontSize, MIN_TOUCH } from '@/constants/theme';
import { useActividad } from '@/hooks/use-notificaciones';
import { useTheme } from '@/hooks/use-theme';

type Icono = ComponentProps<typeof Ionicons>['name'];

const PESTANAS: { name: string; titulo: string; icono: Icono; iconoActivo: Icono }[] = [
  { name: 'index', titulo: 'Inicio', icono: 'home-outline', iconoActivo: 'home' },
  { name: 'buscar', titulo: 'Buscar', icono: 'search-outline', iconoActivo: 'search' },
  { name: 'publicar', titulo: 'Publicar', icono: 'add-circle-outline', iconoActivo: 'add-circle' },
  {
    name: 'trueques',
    titulo: 'Trueques',
    icono: 'swap-horizontal-outline',
    iconoActivo: 'swap-horizontal',
  },
  {
    name: 'perfil',
    titulo: 'Perfil',
    icono: 'person-circle-outline',
    iconoActivo: 'person-circle',
  },
];

/** Barra inferior con las 5 pestañas definidas en §9 del prompt. */
export default function TabsLayout() {
  const theme = useTheme();
  const { data: actividad } = useActividad();
  // Insignia de Trueques: propuestas por responder y mensajes sin leer.
  const pendientes = (actividad?.recibidas ?? 0) + (actividad?.mensajesSinLeer ?? 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.tabInactive,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarItemStyle: { minHeight: MIN_TOUCH },
      }}
    >
      {PESTANAS.map((p) => (
        <Tabs.Screen
          key={p.name}
          name={p.name}
          options={{
            title: p.titulo,
            tabBarAccessibilityLabel:
              p.name === 'trueques' && pendientes
                ? `${p.titulo}, ${pendientes} pendientes`
                : p.titulo,
            tabBarBadge: p.name === 'trueques' && pendientes ? pendientes : undefined,
            tabBarBadgeStyle: { backgroundColor: theme.danger, color: theme.onPrimary },
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? p.iconoActivo : p.icono}
                color={String(color)}
                size={p.name === 'publicar' ? FontSize.title + 4 : FontSize.title - 2}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
