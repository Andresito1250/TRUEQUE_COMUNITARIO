import { z } from 'zod';
import { Localidad, Rol } from './enums.js';

/** Reglas de validación del Módulo 1 (RF-01 a RF-05). Mensajes en español para mostrarlos tal cual. */

export const correoSchema = z
  .string({ error: 'Escribe tu correo' })
  .trim()
  .toLowerCase()
  .pipe(z.email('Escribe un correo válido, por ejemplo nombre@gmail.com'));

export const contrasenaSchema = z
  .string({ error: 'Escribe una contraseña' })
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña puede tener máximo 72 caracteres')
  .regex(/[A-Za-zÁÉÍÓÚÑáéíóúñ]/, 'La contraseña debe tener al menos una letra')
  .regex(/\d/, 'La contraseña debe tener al menos un número');

export const codigoSchema = z
  .string({ error: 'Escribe el código' })
  .trim()
  .regex(/^\d{6}$/, 'El código tiene 6 dígitos');

export const nombreSchema = z
  .string({ error: 'Escribe tu nombre' })
  .trim()
  .min(2, 'Tu nombre debe tener al menos 2 letras')
  .max(80, 'Tu nombre puede tener máximo 80 caracteres');

export const localidadSchema = z.enum(Localidad, 'Elige tu localidad');

export const registroSchema = z.object({
  nombre: nombreSchema,
  correo: correoSchema,
  contrasena: contrasenaSchema,
  localidad: localidadSchema,
  aceptaPoliticaDatos: z.literal(true, 'Debes aceptar la política de tratamiento de datos'),
  aceptaTerminos: z.literal(true, 'Debes aceptar los términos de uso'),
});
export type RegistroDto = z.infer<typeof registroSchema>;

export const verificarCorreoSchema = z.object({ correo: correoSchema, codigo: codigoSchema });
export type VerificarCorreoDto = z.infer<typeof verificarCorreoSchema>;

export const soloCorreoSchema = z.object({ correo: correoSchema });
export type SoloCorreoDto = z.infer<typeof soloCorreoSchema>;

export const loginSchema = z.object({
  correo: correoSchema,
  contrasena: z.string({ error: 'Escribe tu contraseña' }).min(1, 'Escribe tu contraseña'),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const login2faSchema = z.object({
  tokenTemporal: z.string().min(1),
  codigo: codigoSchema,
});
export type Login2faDto = z.infer<typeof login2faSchema>;

export const refreshSchema = z.object({ refreshToken: z.string().min(1) });
export type RefreshDto = z.infer<typeof refreshSchema>;

export const restablecerSchema = z.object({
  correo: correoSchema,
  codigo: codigoSchema,
  contrasenaNueva: contrasenaSchema,
});
export type RestablecerDto = z.infer<typeof restablecerSchema>;

export const codigo2faSchema = z.object({ codigo: codigoSchema });
export type Codigo2faDto = z.infer<typeof codigo2faSchema>;

export const confirmarContrasenaSchema = z.object({
  contrasena: z.string({ error: 'Escribe tu contraseña' }).min(1, 'Escribe tu contraseña'),
});
export type ConfirmarContrasenaDto = z.infer<typeof confirmarContrasenaSchema>;

export const actualizarPerfilSchema = z
  .object({
    nombre: nombreSchema,
    descripcion: z.string().trim().max(500, 'Máximo 500 caracteres').nullable(),
    localidad: localidadSchema,
    telefonoContacto: z
      .string()
      .trim()
      .regex(/^\+?\d{7,15}$/, 'Escribe un teléfono válido (solo números)')
      .nullable(),
    categoriasInteres: z.array(z.number().int().positive()).max(20),
  })
  .partial();
export type ActualizarPerfilDto = z.infer<typeof actualizarPerfilSchema>;

// ───────────── Respuestas ─────────────

export type Tokens = {
  accessToken: string;
  refreshToken: string;
  /** Fecha ISO en que vence el access token. */
  accessExpiraEn: string;
};

export type Categoria = { id: number; nombre: string; icono: string | null };

export type PerfilPublico = {
  id: string;
  nombre: string;
  localidad: Localidad;
  fotoUrl: string | null;
  descripcion: string | null;
  verificado: boolean;
  miembroDesde: string;
  reputacion: { promedio: number | null; calificaciones: number; intercambios: number };
};

export type PerfilPrivado = PerfilPublico & {
  correo: string;
  telefonoContacto: string | null;
  rol: Rol;
  totpActivo: boolean;
  categoriasInteres: Categoria[];
};

export type RespuestaLogin =
  | ({ requiere2fa: false; usuario: PerfilPrivado } & Tokens)
  | { requiere2fa: true; tokenTemporal: string };

export type Configuracion2fa = { secreto: string; uri: string };

/** Códigos de error que la app interpreta para decidir a qué pantalla ir. */
export const CodigoError = {
  CORREO_NO_VERIFICADO: 'CORREO_NO_VERIFICADO',
  CUENTA_SUSPENDIDA: 'CUENTA_SUSPENDIDA',
  CODIGO_INVALIDO: 'CODIGO_INVALIDO',
  CODIGO_VENCIDO: 'CODIGO_VENCIDO',
} as const;
export type CodigoError = (typeof CodigoError)[keyof typeof CodigoError];
