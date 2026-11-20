/** Fechas en español de Colombia y hora de Bogotá. */
const FORMATO_FECHA_HORA = new Intl.DateTimeFormat('es-CO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/Bogota',
});

const FORMATO_FECHA = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'America/Bogota',
});

/** "sábado, 22 de noviembre, 10:00 a. m." */
export const fechaHora = (iso: string) => FORMATO_FECHA_HORA.format(new Date(iso));

/** "22 nov 2026" */
export const fecha = (iso: string) => FORMATO_FECHA.format(new Date(iso));

/** "hace 5 min", "hace 2 h", "ayer", o la fecha. */
export function haceCuanto(iso: string, ahora = Date.now()): string {
  const min = Math.round((ahora - new Date(iso).getTime()) / 60_000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  if (h < 48) return 'ayer';
  return fecha(iso);
}
