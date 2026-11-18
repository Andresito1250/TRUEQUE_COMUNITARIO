import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // process.env (y no env()) para que `prisma generate` funcione en CI sin base de datos.
    url: process.env.DATABASE_URL ?? '',
  },
});
