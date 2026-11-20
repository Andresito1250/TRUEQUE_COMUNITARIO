import { z } from 'zod';

/** Variables de entorno validadas al arrancar. Si falta una obligatoria, la API no inicia. */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  /** Firma de los access token (JWT). */
  JWT_ACCESS_SECRET: z.string().min(1),
  /** Clave para tokens temporales de 2FA y para el HMAC de refresh tokens y códigos. */
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_MIN: z.coerce.number().int().positive().default(15),
  JWT_REFRESH_TTL_DIAS: z.coerce.number().int().positive().default(7),
  SMTP_URL: z.string().default('smtp://localhost:1025'),
  MAIL_FROM: z.string().default('Trueque Comunitario <no-responder@trueque.local>'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('trueque'),
  /** Si está vacía, el API sirve las imágenes en /api/v1/archivos (funciona con Expo Go en la red local). */
  ARCHIVOS_URL_PUBLICA: z.string().default(''),
  CORS_ORIGINS: z.string().default('*'),
});

export type Env = z.infer<typeof envSchema>;
