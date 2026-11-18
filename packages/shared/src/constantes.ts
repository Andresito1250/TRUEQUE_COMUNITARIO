/** Límites de negocio tomados de la Tabla 8 del documento. */
export const LIMITES = {
  /** RF-06: máximo de imágenes por publicación. */
  MAX_IMAGENES: 5,
  /** RF-12: radio configurable de búsqueda en km. */
  RADIO_MIN_KM: 1,
  RADIO_MAX_KM: 10,
  RADIO_DEFECTO_KM: 3,
  /** RF-22: escala de calificación. */
  CALIFICACION_MIN: 1,
  CALIFICACION_MAX: 5,
  /** Días que una calificación sigue habilitada tras realizar el trueque. */
  DIAS_PARA_CALIFICAR: 7,
  /** Privacidad: desplazamiento máximo aplicado a las ubicaciones guardadas (metros). */
  OFUSCACION_UBICACION_M: 300,
  TAMANO_PAGINA: 20,
} as const;

/** Versiones vigentes de los documentos legales aceptados en el registro (RF-01, RNF11, RNF12). */
export const VERSION_POLITICA_DATOS = '2026-11';
export const VERSION_TERMINOS = '2026-11';
