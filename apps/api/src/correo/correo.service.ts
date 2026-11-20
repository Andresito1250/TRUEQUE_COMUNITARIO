import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type { Env } from '../config/env.js';

/** Envío de correos transaccionales. En local llegan a Mailpit (http://localhost:8025). */
@Injectable()
export class CorreoService {
  private readonly logger = new Logger(CorreoService.name);
  private readonly transporte: Transporter;
  private readonly remitente: string;

  constructor(config: ConfigService<Env, true>) {
    this.transporte = createTransport(config.get('SMTP_URL', { infer: true }));
    this.remitente = config.get('MAIL_FROM', { infer: true });
  }

  /** RF-02: código para verificar el correo. */
  enviarCodigoVerificacion(correo: string, nombre: string, codigo: string) {
    return this.enviar(
      correo,
      `${codigo} es tu código de Trueque Comunitario`,
      plantilla(
        `¡Hola, ${escapar(nombre)}!`,
        'Gracias por unirte a Trueque Comunitario. Escribe este código en la app para activar tu cuenta:',
        codigo,
        'El código vence en 15 minutos. Si no creaste una cuenta, ignora este mensaje.',
      ),
    );
  }

  /** RF-04: código para restablecer la contraseña. */
  enviarCodigoRecuperacion(correo: string, nombre: string, codigo: string) {
    return this.enviar(
      correo,
      `${codigo} es tu código para cambiar la contraseña`,
      plantilla(
        `Hola, ${escapar(nombre)}`,
        'Recibimos una solicitud para cambiar tu contraseña. Escribe este código en la app:',
        codigo,
        'El código vence en 15 minutos. Si no fuiste tú, ignora este mensaje: tu contraseña sigue igual.',
      ),
    );
  }

  private async enviar(para: string, asunto: string, html: string): Promise<void> {
    try {
      await this.transporte.sendMail({ from: this.remitente, to: para, subject: asunto, html });
    } catch (error) {
      // No se revela el fallo al usuario para no bloquear el registro; se puede reenviar el código.
      this.logger.error(`No se pudo enviar el correo a ${para}`, error as Error);
    }
  }
}

function escapar(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function plantilla(saludo: string, texto: string, codigo: string, pie: string): string {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#FAFAF5;font-family:Arial,sans-serif;color:#1B1F1B">
<div style="max-width:480px;margin:0 auto;padding:32px 24px">
<p style="font-size:20px;font-weight:bold;color:#2E6B30;margin:0 0 24px">Trueque Comunitario</p>
<p style="font-size:16px">${saludo}</p>
<p style="font-size:16px;line-height:24px">${texto}</p>
<p style="font-size:34px;letter-spacing:8px;font-weight:bold;background:#EEF2EA;border-radius:12px;padding:16px;text-align:center">${codigo}</p>
<p style="font-size:14px;color:#4A524A;line-height:20px">${pie}</p>
</div></body></html>`;
}
