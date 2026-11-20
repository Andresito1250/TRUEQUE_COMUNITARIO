import 'dotenv/config';
import { defineConfig } from 'vitest/config';
import { urlBdPruebas } from './test/preparar-bd.js';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/preparar-bd.ts'],
    env: { NODE_ENV: 'test', DATABASE_URL: urlBdPruebas(), S3_BUCKET: 'trueque-test' },
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
