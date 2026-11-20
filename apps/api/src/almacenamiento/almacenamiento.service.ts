import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger, NotFoundException, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Readable } from 'node:stream';
import type { Env } from '../config/env.js';

/** Prefijos permitidos: evita que el endpoint de archivos exponga otras rutas del bucket. */
export const PREFIJOS_PUBLICOS = ['publicaciones/', 'perfiles/'] as const;

/**
 * Almacenamiento de imágenes en un servicio compatible con S3
 * (SeaweedFS en local; S3, Cloudflare R2 u otro en producción).
 * En la base de datos se guarda solo la clave del objeto; la URL se arma al responder.
 */
@Injectable()
export class AlmacenamientoService implements OnModuleInit {
  private readonly logger = new Logger(AlmacenamientoService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly urlPublica: string;

  constructor(config: ConfigService<Env, true>) {
    this.bucket = config.get('S3_BUCKET', { infer: true });
    this.urlPublica = config.get('ARCHIVOS_URL_PUBLICA', { infer: true }).replace(/\/+$/, '');
    this.s3 = new S3Client({
      endpoint: config.get('S3_ENDPOINT', { infer: true }),
      region: config.get('S3_REGION', { infer: true }),
      forcePathStyle: true,
    });
  }

  async onModuleInit() {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Bucket "${this.bucket}" creado`);
      } catch (error) {
        // No se detiene el API: el resto de funciones sigue disponible y el error se ve al subir.
        this.logger.error(`No se pudo preparar el bucket "${this.bucket}"`, error as Error);
      }
    }
  }

  async guardar(clave: string, contenido: Buffer, tipo: string): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: clave, Body: contenido, ContentType: tipo }),
    );
  }

  async obtener(clave: string): Promise<{ cuerpo: Readable; tipo: string; tamano?: number }> {
    try {
      const r = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: clave }));
      return {
        cuerpo: r.Body as Readable,
        tipo: r.ContentType ?? 'application/octet-stream',
        tamano: r.ContentLength,
      };
    } catch {
      throw new NotFoundException('Archivo no encontrado.');
    }
  }

  /** Borra objetos; los errores se registran pero no interrumpen la operación. */
  async eliminar(claves: (string | null | undefined)[]): Promise<void> {
    const validas = claves.filter((c): c is string => !!c);
    if (validas.length === 0) return;
    try {
      await this.s3.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: { Objects: validas.map((Key) => ({ Key })) },
        }),
      );
    } catch (error) {
      this.logger.warn(`No se pudieron borrar ${validas.length} archivos`, error as Error);
    }
  }

  /** URL para la app: absoluta si hay URL pública; si no, relativa al API. */
  url(clave: string): string;
  url(clave: string | null): string | null;
  url(clave: string | null): string | null {
    if (!clave) return null;
    return this.urlPublica ? `${this.urlPublica}/${clave}` : `/api/v1/archivos/${clave}`;
  }
}
