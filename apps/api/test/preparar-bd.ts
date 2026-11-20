/**
 * globalSetup de las pruebas e2e: usa una base de datos aparte (trueque_test) para no tocar
 * los datos de desarrollo, la crea si no existe y le aplica las migraciones.
 * En CI no hay DATABASE_URL_TEST y se usa directamente la base de datos del servicio.
 */
import 'dotenv/config';
import { execSync } from 'node:child_process';
import pg from 'pg';

export function urlBdPruebas(): string {
  const base = process.env.DATABASE_URL ?? '';
  if (process.env.CI) return base;
  return process.env.DATABASE_URL_TEST ?? base.replace(/\/trueque(\?|$)/, '/trueque_test$1');
}

export default async function setup() {
  const url = urlBdPruebas();
  if (!process.env.CI) {
    const nombre = new URL(url).pathname.slice(1);
    const admin = new pg.Client({ connectionString: process.env.DATABASE_URL });
    await admin.connect();
    const existe = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [nombre]);
    if (existe.rowCount === 0) await admin.query(`CREATE DATABASE "${nombre}"`);
    await admin.end();
  }
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'ignore',
  });
}
