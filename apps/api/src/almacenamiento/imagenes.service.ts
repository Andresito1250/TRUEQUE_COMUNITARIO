import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { AlmacenamientoService } from './almacenamiento.service.js';

export const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_BYTES_IMAGEN = 10 * 1024 * 1024;

/** Reconoce JPEG, PNG y WEBP por su firma de bytes. */
export function detectarTipoImagen(b: Buffer): (typeof TIPOS_IMAGEN)[number] | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return 'image/png';
  if (
    b.length >= 12 &&
    b.subarray(0, 4).toString('ascii') === 'RIFF' &&
    b.subarray(8, 12).toString('ascii') === 'WEBP'
  )
    return 'image/webp';
  return null;
}

/** Archivo recibido por multer (solo los campos que se usan). */
export type ArchivoSubido = { buffer: Buffer; mimetype: string; size: number };

/**
 * Normaliza las imágenes antes de guardarlas (RNF04, RNF05): corrige la orientación,
 * elimina metadatos (incluida la ubicación GPS de la foto, por privacidad), reduce el tamaño
 * y genera una miniatura para los listados.
 */
@Injectable()
export class ImagenesService {
  constructor(private readonly almacenamiento: AlmacenamientoService) {}

  /**
   * Se revisan los primeros bytes del archivo en vez de confiar en el tipo que declara el
   * cliente (algunos celulares lo envían vacío o como application/octet-stream).
   */
  validar(archivo: ArchivoSubido): void {
    if (!detectarTipoImagen(archivo.buffer)) {
      throw new BadRequestException('Solo se permiten fotos JPG, PNG o WEBP.');
    }
    if (archivo.size > MAX_BYTES_IMAGEN) {
      throw new BadRequestException('Cada foto puede pesar máximo 10 MB.');
    }
  }

  /** Guarda la foto (1280 px) y su miniatura (400 px). Devuelve las claves en el almacenamiento. */
  async guardarFotoPublicacion(
    publicacionId: string,
    archivo: ArchivoSubido,
  ): Promise<{ clave: string; claveMiniatura: string }> {
    this.validar(archivo);
    const base = `publicaciones/${publicacionId}/${randomUUID()}`;
    const [grande, miniatura] = await Promise.all([
      this.procesar(archivo.buffer, 1280, 80),
      this.procesar(archivo.buffer, 400, 72),
    ]);
    await Promise.all([
      this.almacenamiento.guardar(`${base}.jpg`, grande, 'image/jpeg'),
      this.almacenamiento.guardar(`${base}_min.jpg`, miniatura, 'image/jpeg'),
    ]);
    return { clave: `${base}.jpg`, claveMiniatura: `${base}_min.jpg` };
  }

  /** Foto de perfil cuadrada de 512 px. */
  async guardarFotoPerfil(usuarioId: string, archivo: ArchivoSubido): Promise<string> {
    this.validar(archivo);
    const clave = `perfiles/${usuarioId}/${randomUUID()}.jpg`;
    const contenido = await this.ejecutar(() =>
      sharp(archivo.buffer)
        .rotate()
        .resize(512, 512, { fit: 'cover' })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer(),
    );
    await this.almacenamiento.guardar(clave, contenido, 'image/jpeg');
    return clave;
  }

  private procesar(buffer: Buffer, ancho: number, calidad: number): Promise<Buffer> {
    return this.ejecutar(() =>
      sharp(buffer)
        .rotate()
        .resize({ width: ancho, height: ancho, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: calidad, mozjpeg: true })
        .toBuffer(),
    );
  }

  private async ejecutar(fn: () => Promise<Buffer>): Promise<Buffer> {
    try {
      return await fn();
    } catch {
      throw new BadRequestException('No pudimos leer la foto. Prueba con otra imagen.');
    }
  }
}
