/**
 * Datos iniciales (idempotente): categorías, una cuenta de administrador y los datos de ejemplo
 * del piloto (10 vecinos y 30 publicaciones). Uso: npm run db:seed
 * Para no sembrar los datos de ejemplo (p. ej. en el despliegue real): SEED_DEMO=false.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from '@node-rs/argon2';
import { VERSION_POLITICA_DATOS, VERSION_TERMINOS } from '@trueque/shared';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { sembrarDemo } from './demo.js';
import { sembrarPuntos } from './puntos-encuentro.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
});

/** Categorías definidas en el prompt de desarrollo. Iconos de Ionicons. */
const CATEGORIAS: { nombre: string; icono: string }[] = [
  { nombre: 'Ropa', icono: 'shirt-outline' },
  { nombre: 'Libros', icono: 'book-outline' },
  { nombre: 'Tecnología', icono: 'phone-portrait-outline' },
  { nombre: 'Hogar', icono: 'home-outline' },
  { nombre: 'Juguetes', icono: 'happy-outline' },
  { nombre: 'Herramientas', icono: 'hammer-outline' },
  { nombre: 'Clases y tutorías', icono: 'school-outline' },
  { nombre: 'Reparaciones', icono: 'construct-outline' },
  { nombre: 'Servicios varios', icono: 'hand-left-outline' },
];

async function main() {
  for (const c of CATEGORIAS) {
    await prisma.categoria.upsert({
      where: { nombre: c.nombre },
      update: { icono: c.icono },
      create: c,
    });
  }
  console.log(`✔ ${CATEGORIAS.length} categorías`);
  await sembrarPuntos(prisma);

  const correo = process.env.SEED_ADMIN_CORREO ?? 'admin@trueque.local';
  const contrasena = process.env.SEED_ADMIN_CONTRASENA ?? 'Admin2026';
  const ahora = new Date();
  await prisma.usuario.upsert({
    where: { correo },
    update: { rol: 'ADMIN' },
    create: {
      nombre: 'Administración Trueque',
      correo,
      contrasenaHash: await hash(contrasena),
      localidad: 'TEUSAQUILLO',
      rol: 'ADMIN',
      correoVerificado: true,
      politicaDatosVersion: VERSION_POLITICA_DATOS,
      politicaDatosFecha: ahora,
      terminosVersion: VERSION_TERMINOS,
      terminosFecha: ahora,
    },
  });
  console.log(`✔ Administrador: ${correo}`);
  if (!process.env.SEED_ADMIN_CONTRASENA) {
    console.warn(
      `  Contraseña por defecto "${contrasena}". Cámbiala con SEED_ADMIN_CONTRASENA fuera de tu PC.`,
    );
  }

  if (process.env.SEED_DEMO !== 'false') await sembrarDemo(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
