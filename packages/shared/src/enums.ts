/**
 * Enumeraciones del dominio. Deben coincidir con los enums de apps/api/prisma/schema.prisma.
 * Se definen como objetos `as const` para que funcionen igual en la app y en la API.
 */

export const Localidad = {
  SUBA: 'SUBA',
  KENNEDY: 'KENNEDY',
  TEUSAQUILLO: 'TEUSAQUILLO',
} as const;
export type Localidad = (typeof Localidad)[keyof typeof Localidad];

export const LOCALIDAD_NOMBRE: Record<Localidad, string> = {
  SUBA: 'Suba',
  KENNEDY: 'Kennedy',
  TEUSAQUILLO: 'Teusaquillo',
};

export const Rol = { CIUDADANO: 'CIUDADANO', ADMIN: 'ADMIN' } as const;
export type Rol = (typeof Rol)[keyof typeof Rol];

export const EstadoUsuario = {
  ACTIVO: 'ACTIVO',
  SUSPENDIDO: 'SUSPENDIDO',
  ELIMINADO: 'ELIMINADO',
} as const;
export type EstadoUsuario = (typeof EstadoUsuario)[keyof typeof EstadoUsuario];

export const TipoPublicacion = { BIEN: 'BIEN', SERVICIO: 'SERVICIO' } as const;
export type TipoPublicacion = (typeof TipoPublicacion)[keyof typeof TipoPublicacion];

export const EstadoConservacion = {
  NUEVO: 'NUEVO',
  COMO_NUEVO: 'COMO_NUEVO',
  BUENO: 'BUENO',
  ACEPTABLE: 'ACEPTABLE',
  NO_APLICA: 'NO_APLICA',
} as const;
export type EstadoConservacion = (typeof EstadoConservacion)[keyof typeof EstadoConservacion];

export const EstadoPublicacion = {
  DISPONIBLE: 'DISPONIBLE',
  RESERVADA: 'RESERVADA',
  INTERCAMBIADA: 'INTERCAMBIADA',
  OCULTA: 'OCULTA',
  ELIMINADA: 'ELIMINADA',
} as const;
export type EstadoPublicacion = (typeof EstadoPublicacion)[keyof typeof EstadoPublicacion];

/** Estados de la propuesta de trueque (Figura 2 del documento). */
export const EstadoPropuesta = {
  PROPUESTA_CREADA: 'PROPUESTA_CREADA',
  PENDIENTE_RESPUESTA: 'PENDIENTE_RESPUESTA',
  CONTRAPROPUESTA: 'CONTRAPROPUESTA',
  RECHAZADA: 'RECHAZADA',
  CANCELADA: 'CANCELADA',
  ACEPTADA: 'ACEPTADA',
  ENCUENTRO_ACORDADO: 'ENCUENTRO_ACORDADO',
  ESPERANDO_CONFIRMACION: 'ESPERANDO_CONFIRMACION',
  INTERCAMBIO_CONFIRMADO: 'INTERCAMBIO_CONFIRMADO',
  CALIFICACION_HABILITADA: 'CALIFICACION_HABILITADA',
  FINALIZADO: 'FINALIZADO',
} as const;
export type EstadoPropuesta = (typeof EstadoPropuesta)[keyof typeof EstadoPropuesta];

export const LadoArticulo = { OFRECIDO: 'OFRECIDO', SOLICITADO: 'SOLICITADO' } as const;
export type LadoArticulo = (typeof LadoArticulo)[keyof typeof LadoArticulo];

export const TipoNotificacion = {
  PROPUESTA_NUEVA: 'PROPUESTA_NUEVA',
  PROPUESTA_RESPONDIDA: 'PROPUESTA_RESPONDIDA',
  CONTRAPROPUESTA: 'CONTRAPROPUESTA',
  ENCUENTRO_ACORDADO: 'ENCUENTRO_ACORDADO',
  TRUEQUE_CANCELADO: 'TRUEQUE_CANCELADO',
  TRUEQUE_REALIZADO: 'TRUEQUE_REALIZADO',
  MENSAJE_NUEVO: 'MENSAJE_NUEVO',
  CALIFICACION_RECIBIDA: 'CALIFICACION_RECIBIDA',
  MODERACION: 'MODERACION',
} as const;
export type TipoNotificacion = (typeof TipoNotificacion)[keyof typeof TipoNotificacion];

export const MotivoReporte = {
  PROHIBIDO: 'PROHIBIDO',
  FRAUDE: 'FRAUDE',
  OFENSIVO: 'OFENSIVO',
  SPAM: 'SPAM',
  ACOSO: 'ACOSO',
  OTRO: 'OTRO',
} as const;
export type MotivoReporte = (typeof MotivoReporte)[keyof typeof MotivoReporte];

export const EstadoReporte = {
  PENDIENTE: 'PENDIENTE',
  REVISADO: 'REVISADO',
  RESUELTO: 'RESUELTO',
} as const;
export type EstadoReporte = (typeof EstadoReporte)[keyof typeof EstadoReporte];
