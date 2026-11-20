import { z } from 'zod';
import type { EstadoPropuesta, Localidad } from './enums.js';
import type { PublicacionResumen } from './publicaciones.js';

/** Módulo 4: gestión del trueque (RF-14 a RF-19) y máquina de estados (plan §3, D3, D4). */

export const MAX_ARTICULOS_POR_LADO = 5;

// ───────────── Máquina de estados ─────────────

export type RolEnPropuesta = 'proponente' | 'receptor';

export const AccionPropuesta = {
  ACEPTAR: 'aceptar',
  RECHAZAR: 'rechazar',
  CONTRAPROPONER: 'contraproponer',
  CANCELAR: 'cancelar',
  ACORDAR_ENCUENTRO: 'acordarEncuentro',
  CONFIRMAR: 'confirmar',
  CALIFICAR: 'calificar',
  CHATEAR: 'chatear',
} as const;
export type AccionPropuesta = (typeof AccionPropuesta)[keyof typeof AccionPropuesta];

type Regla = {
  accion: AccionPropuesta;
  desde: readonly EstadoPropuesta[];
  actor: RolEnPropuesta | 'cualquiera';
};

/** Quién puede hacer qué y desde qué estado. Cualquier otra combinación responde 409. */
export const REGLAS: readonly Regla[] = [
  { accion: 'aceptar', desde: ['PENDIENTE_RESPUESTA'], actor: 'receptor' },
  { accion: 'rechazar', desde: ['PENDIENTE_RESPUESTA'], actor: 'receptor' },
  { accion: 'contraproponer', desde: ['PENDIENTE_RESPUESTA'], actor: 'receptor' },
  { accion: 'cancelar', desde: ['PENDIENTE_RESPUESTA'], actor: 'proponente' },
  { accion: 'cancelar', desde: ['ACEPTADA', 'ESPERANDO_CONFIRMACION'], actor: 'cualquiera' },
  {
    accion: 'acordarEncuentro',
    desde: ['ACEPTADA', 'ESPERANDO_CONFIRMACION'],
    actor: 'cualquiera',
  },
  // D4: basta con que UNA de las partes marque el trueque como hecho.
  { accion: 'confirmar', desde: ['ESPERANDO_CONFIRMACION'], actor: 'cualquiera' },
  { accion: 'calificar', desde: ['CALIFICACION_HABILITADA'], actor: 'cualquiera' },
  {
    accion: 'chatear',
    desde: ['PENDIENTE_RESPUESTA', 'ACEPTADA', 'ESPERANDO_CONFIRMACION'],
    actor: 'cualquiera',
  },
];

export function puede(accion: AccionPropuesta, estado: EstadoPropuesta, rol: RolEnPropuesta) {
  return REGLAS.some(
    (r) =>
      r.accion === accion &&
      r.desde.includes(estado) &&
      (r.actor === 'cualquiera' || r.actor === rol),
  );
}

export function accionesPermitidas(estado: EstadoPropuesta, rol: RolEnPropuesta) {
  return [...new Set(REGLAS.filter((r) => puede(r.accion, estado, rol)).map((r) => r.accion))];
}

/** Estado al que lleva cada acción (los intermedios automáticos se resuelven en el API). */
export const DESTINO: Partial<Record<AccionPropuesta, EstadoPropuesta>> = {
  aceptar: 'ACEPTADA',
  rechazar: 'RECHAZADA',
  contraproponer: 'CONTRAPROPUESTA',
  cancelar: 'CANCELADA',
  acordarEncuentro: 'ESPERANDO_CONFIRMACION',
  confirmar: 'CALIFICACION_HABILITADA',
};

export const ESTADOS_PENDIENTES: readonly EstadoPropuesta[] = ['PENDIENTE_RESPUESTA'];
export const ESTADOS_EN_CURSO: readonly EstadoPropuesta[] = [
  'ACEPTADA',
  'ENCUENTRO_ACORDADO',
  'ESPERANDO_CONFIRMACION',
];
export const ESTADOS_REALIZADOS: readonly EstadoPropuesta[] = [
  'INTERCAMBIO_CONFIRMADO',
  'CALIFICACION_HABILITADA',
  'FINALIZADO',
];
export const ESTADOS_CERRADOS: readonly EstadoPropuesta[] = ['RECHAZADA', 'CANCELADA'];

export const ESTADO_PROPUESTA_NOMBRE: Record<EstadoPropuesta, string> = {
  PROPUESTA_CREADA: 'Enviada',
  PENDIENTE_RESPUESTA: 'Esperando respuesta',
  CONTRAPROPUESTA: 'Con contrapropuesta',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
  ACEPTADA: 'Aceptada',
  ENCUENTRO_ACORDADO: 'Encuentro acordado',
  ESPERANDO_CONFIRMACION: 'Encuentro acordado',
  INTERCAMBIO_CONFIRMADO: 'Trueque hecho',
  CALIFICACION_HABILITADA: 'Trueque hecho',
  FINALIZADO: 'Trueque hecho',
};

// ───────────── Entradas ─────────────

const ids = (mensaje: string) =>
  z
    .array(z.uuid('Publicación no válida'))
    .min(1, mensaje)
    .max(MAX_ARTICULOS_POR_LADO, `Puedes incluir máximo ${MAX_ARTICULOS_POR_LADO} publicaciones`)
    .refine((l) => new Set(l).size === l.length, 'No repitas publicaciones');

const mensajeOpcional = z
  .string()
  .trim()
  .max(500, 'El mensaje puede tener máximo 500 caracteres')
  .optional()
  .transform((m) => m || undefined);

/** RF-14: proponer un trueque por una publicación, ofreciendo una o varias propias. */
export const crearPropuestaSchema = z.object({
  publicacionId: z.uuid('Publicación no válida'),
  ofrecidas: ids('Elige al menos una publicación tuya para ofrecer'),
  mensaje: mensajeOpcional,
});
export type CrearPropuestaDto = z.input<typeof crearPropuestaSchema>;

/** RF-15: contrapropuesta. Quien la hace pasa a ser el proponente. */
export const contrapropuestaSchema = z.object({
  /** Publicaciones de la otra persona que se piden. */
  solicitadas: ids('Elige al menos una publicación de la otra persona'),
  /** Publicaciones propias que se ofrecen. */
  ofrecidas: ids('Elige al menos una publicación tuya para ofrecer'),
  mensaje: mensajeOpcional,
});
export type ContrapropuestaDto = z.input<typeof contrapropuestaSchema>;

/** RF-16: lugar seguro y fecha del encuentro. */
export const encuentroSchema = z
  .object({
    puntoEncuentroId: z.number().int().positive().optional(),
    puntoTexto: z.string().trim().min(3, 'Escribe el lugar').max(160).optional(),
    fechaHora: z.iso.datetime({ offset: true, error: 'Elige la fecha y la hora' }),
  })
  .refine((d) => d.puntoEncuentroId !== undefined || d.puntoTexto !== undefined, {
    message: 'Elige un punto de encuentro',
    path: ['puntoEncuentroId'],
  })
  .refine((d) => new Date(d.fechaHora).getTime() > Date.now() - 5 * 60_000, {
    message: 'La fecha del encuentro debe ser en el futuro',
    path: ['fechaHora'],
  });
export type EncuentroDto = z.input<typeof encuentroSchema>;

/** RF-18: cancelar, con un motivo opcional que ve la otra persona. */
export const cancelarPropuestaSchema = z.object({
  motivo: z
    .string()
    .trim()
    .max(200, 'El motivo puede tener máximo 200 caracteres')
    .optional()
    .transform((m) => m || undefined),
});
export type CancelarPropuestaDto = z.input<typeof cancelarPropuestaSchema>;

export const Bandeja = {
  RECIBIDAS: 'recibidas',
  ENVIADAS: 'enviadas',
  ACTIVAS: 'activas',
  HISTORIAL: 'historial',
} as const;
export type Bandeja = (typeof Bandeja)[keyof typeof Bandeja];

export const bandejaSchema = z.object({ bandeja: z.enum(Bandeja).default('recibidas') });

export const puntosEncuentroSchema = z.object({
  propuestaId: z.preprocess((v) => v || undefined, z.uuid().optional()),
});

// ───────────── Respuestas ─────────────

export type Persona = {
  id: string;
  nombre: string;
  fotoUrl: string | null;
  verificado: boolean;
  localidad: Localidad;
};

export type PuntoEncuentro = {
  id: number;
  nombre: string;
  tipo: 'CENTRO_COMERCIAL' | 'BIBLIOTECA' | 'ESTACION' | 'PARQUE' | 'OTRO';
  localidad: Localidad;
  direccion: string | null;
  ubicacion: { lat: number; lng: number };
  /** Distancia al punto medio entre las dos partes, si se pidió para una propuesta. */
  distanciaM: number | null;
};

export const TIPO_PUNTO_NOMBRE: Record<PuntoEncuentro['tipo'], string> = {
  CENTRO_COMERCIAL: 'Centro comercial',
  BIBLIOTECA: 'Biblioteca',
  ESTACION: 'Estación de TransMilenio',
  PARQUE: 'Parque',
  OTRO: 'Otro lugar',
};

export type PropuestaResumen = {
  id: string;
  estado: EstadoPropuesta;
  soyProponente: boolean;
  contraparte: Persona;
  /** Lo que pide el proponente (la primera es la publicación por la que se propuso). */
  solicitadas: PublicacionResumen[];
  ofrecidas: PublicacionResumen[];
  /** D3: otra propuesta sobre estos artículos ya fue aceptada; no se puede aceptar esta. */
  bloqueada: boolean;
  motivoCierre: string | null;
  actualizadoEn: string;
};

export type PropuestaDetalle = PropuestaResumen & {
  mensaje: string | null;
  creadoEn: string;
  proponente: Persona;
  receptor: Persona;
  /** Propuesta a la que esta responde, y la que respondió a esta. */
  propuestaPadreId: string | null;
  contrapropuestaId: string | null;
  encuentro: { fechaHora: string; lugar: string; punto: PuntoEncuentro | null } | null;
  confirmacion: { porMi: boolean; porNombre: string; fecha: string } | null;
  /** Lo que el usuario que consulta puede hacer ahora. */
  acciones: AccionPropuesta[];
  calificacion: {
    /** Hasta cuándo se puede calificar (7 días después del trueque). */
    limite: string;
    mia: { puntuacion: number; comentario: string | null } | null;
    recibida: boolean;
  } | null;
};

export const CONSEJOS_SEGURIDAD = [
  'Encuéntrense de día en un lugar público y concurrido.',
  'Ve acompañado o avisa a alguien de confianza a dónde vas.',
  'Revisa el artículo antes de entregar el tuyo.',
  'No compartas datos bancarios ni envíes dinero por adelantado.',
  'Si algo no te da confianza, cancela el trueque y repórtalo.',
] as const;
