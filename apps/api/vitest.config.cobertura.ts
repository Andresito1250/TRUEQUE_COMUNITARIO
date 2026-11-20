import { defineConfig, mergeConfig } from 'vitest/config';
import e2e from './vitest.config.e2e.js';

/**
 * RNF16: cobertura del API sumando pruebas unitarias y de punta a punta.
 * Uso: npm run test:cobertura (necesita la base de datos y SeaweedFS de docker compose).
 */
export default mergeConfig(
  e2e,
  defineConfig({
    test: {
      include: ['**/*.e2e-spec.ts', 'src/**/*.spec.ts'],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.ts'],
        exclude: ['src/generated/**', 'src/main.ts', 'src/**/*.spec.ts', 'src/**/*.module.ts'],
        reporter: ['text-summary', 'html', 'json-summary'],
        reportsDirectory: './coverage',
        thresholds: { lines: 60, statements: 60, functions: 60, branches: 50 },
      },
    },
  }),
);
