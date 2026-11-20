import { defineConfig } from 'vitest/config';

// Configuración explícita: evita fallos de vitest en Windows cuando la letra de unidad llega en minúscula.
export default defineConfig({
  test: { root: './', include: ['src/**/*.test.ts'] },
});
