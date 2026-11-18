/**
 * Tema visual: paleta verde/tierra (comunitario y sostenible).
 * Todos los pares texto/fondo cumplen contraste WCAG 2.2 AA (≥ 4.5:1) — RNF03.
 */

export const Colors = {
  light: {
    text: '#1B1F1B',
    textSecondary: '#4A524A',
    background: '#FAFAF5',
    surface: '#FFFFFF',
    surfaceAlt: '#EEF2EA',
    border: '#D5DBD0',
    primary: '#2E6B30', // 6.4:1 sobre blanco
    onPrimary: '#FFFFFF',
    secondary: '#7A5A44', // tierra, 6.3:1 sobre blanco
    onSecondary: '#FFFFFF',
    danger: '#B3261E',
    success: '#2E6B30',
    tabInactive: '#5C645C',
  },
  dark: {
    text: '#E8ECE6',
    textSecondary: '#B8C0B6',
    background: '#121512',
    surface: '#1C201C',
    surfaceAlt: '#262B26',
    border: '#3A413A',
    primary: '#8FCB8F', // 9.6:1 sobre el fondo oscuro
    onPrimary: '#0E2A10',
    secondary: '#D7B79C',
    onSecondary: '#2B1C11',
    danger: '#F2B8B5',
    success: '#8FCB8F',
    tabInactive: '#A3ABA1',
  },
} as const;

export type ThemeColors = { [K in keyof typeof Colors.light]: string };
export type ThemeColor = keyof ThemeColors;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

/** Tamaños de letra en sp. La base es 16 y el mínimo 14 (RNF03). Respetan el tamaño de letra del sistema. */
export const FontSize = {
  small: 14,
  body: 16,
  subtitle: 20,
  title: 26,
} as const;

/** Área táctil mínima en dp (RNF03). */
export const MIN_TOUCH = 48;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 20,
} as const;
