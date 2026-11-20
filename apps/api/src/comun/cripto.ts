import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

/** HMAC-SHA256 en hexadecimal. Se usa para guardar refresh tokens y códigos sin texto plano (RNF08). */
export function hmac(valor: string, clave: string): string {
  return createHmac('sha256', clave).update(valor).digest('hex');
}

/** Compara dos hashes en tiempo constante. */
export function igualesSeguro(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Código numérico de 6 dígitos para verificación de correo y recuperación (RF-02, RF-04). */
export function generarCodigo(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/** Token opaco aleatorio de 256 bits. */
export function tokenAleatorio(): string {
  return randomBytes(32).toString('base64url');
}
