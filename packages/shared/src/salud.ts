import { z } from 'zod';

/** Respuesta de GET /health (RNF06). */
export const saludSchema = z.object({
  estado: z.enum(['ok', 'degradado', 'error']),
  version: z.string(),
  baseDeDatos: z.enum(['ok', 'error']),
  fecha: z.string(),
});
export type Salud = z.infer<typeof saludSchema>;
