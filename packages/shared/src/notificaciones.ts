import type { TipoNotificacion } from './enums.js';

/** RF-21: bandeja de notificaciones dentro de la app (D2: sin push). */
export type Notificacion = {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  /** Pantalla que se abre al tocarla, p. ej. "/propuesta/<id>". */
  ruta: string | null;
  leida: boolean;
  fechaHora: string;
};

/** Contadores para las insignias de las pestañas. */
export type ResumenActividad = {
  /** Propuestas recibidas esperando respuesta. */
  recibidas: number;
  /** Trueques aceptados o con encuentro acordado. */
  enCurso: number;
  notificacionesSinLeer: number;
  mensajesSinLeer: number;
};
