/**
 * Datos de ejemplo del piloto (Sprint 3): 10 vecinos y 30 publicaciones en Suba, Kennedy y
 * Teusaquillo, con imágenes generadas (no son fotos reales). Son idempotentes: si un vecino
 * de ejemplo ya tiene publicaciones, no se le crean de nuevo.
 *
 * Todas las cuentas usan el correo <usuario>@demo.trueque.local y la contraseña de DEMO_CONTRASENA.
 */
import { randomUUID } from 'node:crypto';
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { hash } from '@node-rs/argon2';
import {
  CENTRO_LOCALIDAD,
  type EstadoConservacion,
  LIMITES,
  type Localidad,
  LOCALIDAD_NOMBRE,
  ofuscarUbicacion,
  type TipoPublicacion,
  VERSION_POLITICA_DATOS,
  VERSION_TERMINOS,
} from '@trueque/shared';
import sharp from 'sharp';
import type { PrismaClient } from '../src/generated/prisma/client.js';

export const DEMO_CONTRASENA = 'Vecino2026';
export const DOMINIO_DEMO = 'demo.trueque.local';

type Pub = {
  titulo: string;
  descripcion: string;
  categoria: string;
  tipo?: TipoPublicacion;
  estado?: EstadoConservacion;
};

type Vecino = {
  usuario: string;
  nombre: string;
  localidad: Localidad;
  descripcion: string;
  publicaciones: [Pub, Pub, Pub];
};

const VECINOS: Vecino[] = [
  {
    usuario: 'laura',
    nombre: 'Laura Rodríguez',
    localidad: 'SUBA',
    descripcion: 'Mamá de dos. Me gusta darle una segunda vida a las cosas.',
    publicaciones: [
      {
        titulo: 'Bicicleta infantil rin 16',
        descripcion: 'Bicicleta roja con rueditas de apoyo, frenos buenos. Mi hijo ya creció.',
        categoria: 'Juguetes',
        estado: 'BUENO',
      },
      {
        titulo: 'Ropa de bebé de 6 a 12 meses',
        descripcion: 'Lote de 15 prendas: bodys, pantalones y dos chaquetas. Todo lavado.',
        categoria: 'Ropa',
        estado: 'COMO_NUEVO',
      },
      {
        titulo: 'Coche de bebé plegable',
        descripcion: 'Coche liviano, se pliega con una mano. Tiene un rayón en la capota.',
        categoria: 'Hogar',
        estado: 'ACEPTABLE',
      },
    ],
  },
  {
    usuario: 'andres',
    nombre: 'Andrés Gómez',
    localidad: 'SUBA',
    descripcion: 'Ingeniero de sistemas. Arreglo computadores los fines de semana.',
    publicaciones: [
      {
        titulo: 'Mantenimiento de computadores',
        descripcion: 'Limpieza, formateo e instalación de programas. Voy a tu casa en Suba.',
        categoria: 'Reparaciones',
        tipo: 'SERVICIO',
      },
      {
        titulo: 'Teclado mecánico',
        descripcion: 'Teclado con luces, conexión USB, todas las teclas funcionan.',
        categoria: 'Tecnología',
        estado: 'BUENO',
      },
      {
        titulo: 'Libros de programación',
        descripcion: 'Tres libros: Python, JavaScript y bases de datos. En español.',
        categoria: 'Libros',
        estado: 'BUENO',
      },
    ],
  },
  {
    usuario: 'marcela',
    nombre: 'Marcela Pineda',
    localidad: 'SUBA',
    descripcion: 'Profesora de inglés jubilada y amante de las plantas.',
    publicaciones: [
      {
        titulo: 'Clases de inglés para niños',
        descripcion: 'Refuerzo escolar de inglés, una hora por sesión, con juegos y canciones.',
        categoria: 'Clases y tutorías',
        tipo: 'SERVICIO',
      },
      {
        titulo: 'Plantas aromáticas en matera',
        descripcion: 'Hierbabuena, romero y albahaca. Las cambio por semillas o abono.',
        categoria: 'Hogar',
        estado: 'NUEVO',
      },
      {
        titulo: 'Novelas de García Márquez',
        descripcion:
          'Cien años de soledad, El amor en los tiempos del cólera y Crónica de una muerte anunciada.',
        categoria: 'Libros',
        estado: 'BUENO',
      },
    ],
  },
  {
    usuario: 'julian',
    nombre: 'Julián Castro',
    localidad: 'SUBA',
    descripcion: 'Ciclista urbano y carpintero aficionado.',
    publicaciones: [
      {
        titulo: 'Taladro percutor',
        descripcion: 'Taladro de 600 W con juego de brocas. Funciona perfecto.',
        categoria: 'Herramientas',
        estado: 'BUENO',
      },
      {
        titulo: 'Mesa de noche en madera',
        descripcion: 'Mesa con un cajón, hecha por mí en pino. Le falta una mano de barniz.',
        categoria: 'Hogar',
        estado: 'BUENO',
      },
      {
        titulo: 'Reparación de muebles de madera',
        descripcion: 'Lijo, pinto y arreglo sillas, mesas y repisas. Tú pones los materiales.',
        categoria: 'Reparaciones',
        tipo: 'SERVICIO',
      },
    ],
  },
  {
    usuario: 'diana',
    nombre: 'Diana Morales',
    localidad: 'KENNEDY',
    descripcion: 'Estudiante de enfermería. Cambio lo que ya no uso por libros de estudio.',
    publicaciones: [
      {
        titulo: 'Chaqueta de jean talla S',
        descripcion: 'Chaqueta clásica azul, sin daños. Me quedó pequeña.',
        categoria: 'Ropa',
        estado: 'BUENO',
      },
      {
        titulo: 'Tutorías de biología y química',
        descripcion: 'Ayudo a estudiantes de bachillerato a preparar exámenes y el ICFES.',
        categoria: 'Clases y tutorías',
        tipo: 'SERVICIO',
      },
      {
        titulo: 'Licuadora de 3 velocidades',
        descripcion: 'Vaso de vidrio, funciona bien. La cambio por una plancha de ropa.',
        categoria: 'Hogar',
        estado: 'ACEPTABLE',
      },
    ],
  },
  {
    usuario: 'carlos',
    nombre: 'Carlos Ramírez',
    localidad: 'KENNEDY',
    descripcion: 'Electricista con 20 años de experiencia. Papá de tres.',
    publicaciones: [
      {
        titulo: 'Instalación de tomas y lámparas',
        descripcion: 'Instalo tomas, interruptores y lámparas con materiales de buena calidad.',
        categoria: 'Reparaciones',
        tipo: 'SERVICIO',
      },
      {
        titulo: 'Juego de llaves y destornilladores',
        descripcion: 'Caja con 40 piezas: llaves boca fija, destornilladores y alicate.',
        categoria: 'Herramientas',
        estado: 'BUENO',
      },
      {
        titulo: 'Lego de construcción 500 piezas',
        descripcion: 'Caja de bloques completa, con manual. Mis hijos ya no juegan con él.',
        categoria: 'Juguetes',
        estado: 'BUENO',
      },
    ],
  },
  {
    usuario: 'sofia',
    nombre: 'Sofía Herrera',
    localidad: 'KENNEDY',
    descripcion: 'Diseñadora y costurera. Me encanta reciclar ropa.',
    publicaciones: [
      {
        titulo: 'Arreglos de ropa y costura',
        descripcion: 'Basta de pantalones, cambio de cremalleras y ajustes de talla.',
        categoria: 'Servicios varios',
        tipo: 'SERVICIO',
      },
      {
        titulo: 'Máquina de coser portátil',
        descripcion: 'Máquina pequeña para arreglos sencillos, con pedal. Ideal para empezar.',
        categoria: 'Hogar',
        estado: 'COMO_NUEVO',
      },
      {
        titulo: 'Vestido de fiesta talla M',
        descripcion: 'Vestido azul largo, usado una sola vez en un matrimonio.',
        categoria: 'Ropa',
        estado: 'COMO_NUEVO',
      },
    ],
  },
  {
    usuario: 'felipe',
    nombre: 'Felipe Ortiz',
    localidad: 'TEUSAQUILLO',
    descripcion: 'Estudiante de la Nacional. Músico y lector.',
    publicaciones: [
      {
        titulo: 'Lámpara de escritorio LED',
        descripcion: 'Lámpara con tres niveles de luz y brazo flexible. Ideal para estudiar.',
        categoria: 'Hogar',
        estado: 'COMO_NUEVO',
      },
      {
        titulo: 'Clases de guitarra para principiantes',
        descripcion: 'Aprende tus primeras canciones en cuatro sesiones. Cerca al Park Way.',
        categoria: 'Clases y tutorías',
        tipo: 'SERVICIO',
      },
      {
        titulo: 'Libros de cálculo y física',
        descripcion: 'Stewart y Serway, ediciones recientes, con algunos subrayados.',
        categoria: 'Libros',
        estado: 'ACEPTABLE',
      },
    ],
  },
  {
    usuario: 'patricia',
    nombre: 'Patricia León',
    localidad: 'TEUSAQUILLO',
    descripcion: 'Vecina de Galerías. Cocino y organizo trueques en mi conjunto.',
    publicaciones: [
      {
        titulo: 'Olla arrocera eléctrica',
        descripcion: 'Capacidad para 10 tazas, con vaporera. Funciona muy bien.',
        categoria: 'Hogar',
        estado: 'BUENO',
      },
      {
        titulo: 'Clases de cocina colombiana',
        descripcion: 'Te enseño a preparar ajiaco, sancocho y arepas. Sesiones de dos horas.',
        categoria: 'Clases y tutorías',
        tipo: 'SERVICIO',
      },
      {
        titulo: 'Rompecabezas de 1000 piezas',
        descripcion: 'Paisaje de Villa de Leyva, completo. Lo armamos solo una vez.',
        categoria: 'Juguetes',
        estado: 'COMO_NUEVO',
      },
    ],
  },
  {
    usuario: 'mateo',
    nombre: 'Mateo Vargas',
    localidad: 'TEUSAQUILLO',
    descripcion: 'Fotógrafo y aficionado a la tecnología.',
    publicaciones: [
      {
        titulo: 'Celular Android para repuestos',
        descripcion:
          'Enciende, pero la pantalla tiene una línea. Sirve para repuestos o como reproductor.',
        categoria: 'Tecnología',
        estado: 'ACEPTABLE',
      },
      {
        titulo: 'Sesión de fotos para tu emprendimiento',
        descripcion:
          'Fotos de producto con fondo blanco para redes sociales. Entrego 10 fotos editadas.',
        categoria: 'Servicios varios',
        tipo: 'SERVICIO',
      },
      {
        titulo: 'Audífonos inalámbricos',
        descripcion: 'Bluetooth, batería de 20 horas, con estuche de carga.',
        categoria: 'Tecnología',
        estado: 'COMO_NUEVO',
      },
    ],
  },
];

/** Color de fondo de las imágenes de ejemplo por categoría. */
const COLOR: Record<string, [string, string]> = {
  Ropa: ['#7B1FA2', '#CE93D8'],
  Libros: ['#5D4037', '#BCAAA4'],
  Tecnología: ['#1565C0', '#90CAF9'],
  Hogar: ['#EF6C00', '#FFCC80'],
  Juguetes: ['#C62828', '#EF9A9A'],
  Herramientas: ['#37474F', '#B0BEC5'],
  'Clases y tutorías': ['#2E6B30', '#A5D6A7'],
  Reparaciones: ['#00838F', '#80DEEA'],
  'Servicios varios': ['#AD1457', '#F48FB1'],
};

/** Generador pseudoaleatorio con semilla: los datos salen iguales cada vez que se siembran. */
function azarConSemilla(semilla: number) {
  let s = semilla;
  return () => {
    s = (s * 1_103_515_245 + 12_345) % 2_147_483_648;
    return s / 2_147_483_648;
  };
}

const escaparXml = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Parte el título en líneas de hasta ~16 caracteres. */
function lineas(texto: string, max = 16): string[] {
  const salida: string[] = [];
  for (const palabra of texto.split(' ')) {
    const ultima = salida.at(-1);
    if (ultima && `${ultima} ${palabra}`.length <= max)
      salida[salida.length - 1] = `${ultima} ${palabra}`;
    else salida.push(palabra);
  }
  return salida.slice(0, 4);
}

/** Imagen cuadrada con el título, para que la app no se vea vacía. Indica que es de ejemplo. */
async function imagenDeEjemplo(p: Pub, localidad: Localidad): Promise<Buffer> {
  const [oscuro, claro] = COLOR[p.categoria] ?? ['#2E6B30', '#A5D6A7'];
  const filas = lineas(p.titulo);
  const alto = 96;
  const inicio = 540 - ((filas.length - 1) * alto) / 2;
  const fuente = 'Segoe UI, Roboto, Arial, sans-serif';
  const texto = filas
    .map(
      (l, i) =>
        `<text x="540" y="${inicio + i * alto}" text-anchor="middle" font-family="${fuente}" font-size="84" font-weight="700" fill="#fff">${escaparXml(l)}</text>`,
    )
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${oscuro}"/><stop offset="1" stop-color="${claro}"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="930" cy="150" r="240" fill="#fff" fill-opacity="0.12"/>
    <circle cx="120" cy="980" r="200" fill="#fff" fill-opacity="0.08"/>
    ${texto}
    <text x="540" y="${inicio + filas.length * alto + 20}" text-anchor="middle" font-family="${fuente}" font-size="44" fill="#fff" fill-opacity="0.9">${escaparXml(`${p.categoria} · ${LOCALIDAD_NOMBRE[localidad]}`)}</text>
    <text x="540" y="1030" text-anchor="middle" font-family="${fuente}" font-size="32" fill="#fff" fill-opacity="0.75">Imagen de ejemplo</text>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
}

async function prepararBucket(s3: S3Client, bucket: string) {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  }
}

export async function sembrarDemo(prisma: PrismaClient): Promise<void> {
  const categorias = new Map(
    (await prisma.categoria.findMany()).map((c) => [c.nombre, c.id] as const),
  );
  const s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? 'us-east-1',
    forcePathStyle: true,
  });
  const bucket = process.env.S3_BUCKET ?? 'trueque';
  await prepararBucket(s3, bucket);
  const subir = (clave: string, cuerpo: Buffer) =>
    s3.send(
      new PutObjectCommand({ Bucket: bucket, Key: clave, Body: cuerpo, ContentType: 'image/jpeg' }),
    );

  const contrasenaHash = await hash(DEMO_CONTRASENA);
  const ahora = new Date();
  const azar = azarConSemilla(2026);
  let nuevas = 0;

  for (const v of VECINOS) {
    const correo = `${v.usuario}@${DOMINIO_DEMO}`;
    const usuario = await prisma.usuario.upsert({
      where: { correo },
      update: {},
      create: {
        nombre: v.nombre,
        correo,
        contrasenaHash,
        localidad: v.localidad,
        descripcion: v.descripcion,
        correoVerificado: true,
        politicaDatosVersion: VERSION_POLITICA_DATOS,
        politicaDatosFecha: ahora,
        terminosVersion: VERSION_TERMINOS,
        terminosFecha: ahora,
      },
    });
    // "Casa" de cada vecino: hasta 2,5 km del centro de su localidad.
    const centro = CENTRO_LOCALIDAD[v.localidad];
    const casa = ofuscarUbicacion(centro.lat, centro.lng, 2500, azar);
    if ((await prisma.publicacion.count({ where: { usuarioId: usuario.id } })) > 0) continue;

    for (const [i, p] of v.publicaciones.entries()) {
      const categoriaId = categorias.get(p.categoria);
      if (!categoriaId) throw new Error(`Falta la categoría ${p.categoria}: corre primero el seed`);
      const tipo = p.tipo ?? 'BIEN';
      const creada = await prisma.publicacion.create({
        data: {
          titulo: p.titulo,
          descripcion: p.descripcion,
          tipo,
          estadoConservacion: tipo === 'SERVICIO' ? 'NO_APLICA' : (p.estado ?? 'BUENO'),
          categoriaId,
          localidad: v.localidad,
          usuarioId: usuario.id,
          // Fechas escalonadas para que "Más recientes" tenga sentido.
          fechaPublicacion: new Date(ahora.getTime() - (nuevas * 7 + i) * 3_600_000),
        },
      });
      const punto = ofuscarUbicacion(casa.lat, casa.lng, LIMITES.OFUSCACION_UBICACION_M, azar);
      await prisma.$executeRaw`
        UPDATE "Publicacion"
        SET ubicacion = ST_SetSRID(ST_MakePoint(${punto.lng}, ${punto.lat}), 4326)::geography
        WHERE id = ${creada.id}::uuid`;

      const original = await imagenDeEjemplo(p, v.localidad);
      const base = `publicaciones/${creada.id}/${randomUUID()}`;
      await subir(`${base}.jpg`, original);
      await subir(
        `${base}_min.jpg`,
        await sharp(original).resize(400, 400).jpeg({ quality: 72 }).toBuffer(),
      );
      await prisma.imagenPublicacion.create({
        data: {
          publicacionId: creada.id,
          url: `${base}.jpg`,
          miniaturaUrl: `${base}_min.jpg`,
          orden: 0,
        },
      });
      nuevas++;
    }
  }
  console.log(`✔ ${VECINOS.length} vecinos de ejemplo, ${nuevas} publicaciones nuevas`);
  console.log(
    `  Correo: <nombre>@${DOMINIO_DEMO} (p. ej. laura@${DOMINIO_DEMO}), contraseña ${DEMO_CONTRASENA}`,
  );
}
