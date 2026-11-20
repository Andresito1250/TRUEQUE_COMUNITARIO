import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { detectarTipoImagen } from './imagenes.service.js';

describe('detectarTipoImagen', () => {
  const lienzo = () =>
    sharp({ create: { width: 4, height: 4, channels: 3, background: '#2E6B30' } });

  it('reconoce JPEG, PNG y WEBP por su contenido', async () => {
    expect(detectarTipoImagen(await lienzo().jpeg().toBuffer())).toBe('image/jpeg');
    expect(detectarTipoImagen(await lienzo().png().toBuffer())).toBe('image/png');
    expect(detectarTipoImagen(await lienzo().webp().toBuffer())).toBe('image/webp');
  });

  it('rechaza archivos que no son fotos aunque digan serlo', () => {
    expect(detectarTipoImagen(Buffer.from('hola, no soy una foto'))).toBeNull();
    expect(detectarTipoImagen(Buffer.alloc(0))).toBeNull();
  });
});
