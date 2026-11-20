import { HttpException, Logger, type OnModuleDestroy } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  enviarMensajeSchema,
  EVENTOS,
  type EventosServidor,
  type MensajeChat,
  type RespuestaSocket,
} from '@trueque/shared';
import type { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { TokensService } from '../auth/tokens.service.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MensajesService } from './mensajes.service.js';

type Datos = { usuarioId: string };
type SocketApp = Socket<Record<string, never>, EventosServidor, Record<string, never>, Datos>;

const salaUsuario = (id: string) => `usuario:${id}`;
const salaPropuesta = (id: string) => `propuesta:${id}`;
const propuestaSchema = z.object({ propuestaId: z.uuid() });

/** Convierte cualquier error en una respuesta comprensible para la app. */
function fallo(e: unknown): RespuestaSocket<never> {
  if (e instanceof HttpException) {
    const r = e.getResponse();
    const m = typeof r === 'string' ? r : (r as { message?: string | string[] }).message;
    return { ok: false, error: Array.isArray(m) ? m.join('\n') : (m ?? e.message) };
  }
  if (e instanceof z.ZodError)
    return { ok: false, error: e.issues[0]?.message ?? 'Datos no válidos' };
  return { ok: false, error: 'No pudimos enviar el mensaje. Inténtalo de nuevo.' };
}

/**
 * Socket.IO en `/tiempo-real`: chat de cada propuesta (RF-20) y avisos instantáneos de la bandeja
 * (RF-21, D2). Se autentica con el mismo access token del API en el handshake.
 */
@WebSocketGateway({ namespace: '/tiempo-real', cors: { origin: true } })
export class TiempoRealGateway implements OnGatewayConnection, OnModuleDestroy {
  @WebSocketServer() private readonly servidor!: Server;
  private readonly logger = new Logger(TiempoRealGateway.name);
  private readonly dejarDeEscuchar: () => void;

  constructor(
    private readonly tokens: TokensService,
    private readonly prisma: PrismaService,
    private readonly mensajes: MensajesService,
    notificaciones: NotificacionesService,
  ) {
    this.dejarDeEscuchar = notificaciones.escuchar((usuarioId, n) => {
      this.servidor?.to(salaUsuario(usuarioId)).emit(EVENTOS.NOTIFICACION, n);
    });
  }

  onModuleDestroy() {
    this.dejarDeEscuchar();
  }

  async handleConnection(socket: SocketApp) {
    try {
      const token = (socket.handshake.auth as { token?: string } | undefined)?.token;
      if (!token) throw new Error('sin token');
      const { sub } = await this.tokens.verificarAccess(token);
      const u = await this.prisma.usuario.findUnique({
        where: { id: sub },
        select: { estado: true },
      });
      if (u?.estado !== 'ACTIVO') throw new Error('cuenta no activa');
      socket.data.usuarioId = sub;
      await socket.join(salaUsuario(sub));
    } catch {
      // Desconexión del servidor: la app renueva el token y vuelve a conectarse.
      socket.disconnect(true);
    }
  }

  @SubscribeMessage(EVENTOS.UNIRSE)
  async unirse(
    @ConnectedSocket() socket: SocketApp,
    @MessageBody() cuerpo: unknown,
  ): Promise<RespuestaSocket<null>> {
    try {
      const { propuestaId } = propuestaSchema.parse(cuerpo);
      await this.mensajes.partes(propuestaId, socket.data.usuarioId);
      await socket.join(salaPropuesta(propuestaId));
      return { ok: true, datos: null };
    } catch (e) {
      return fallo(e);
    }
  }

  @SubscribeMessage(EVENTOS.SALIR)
  async salir(@ConnectedSocket() socket: SocketApp, @MessageBody() cuerpo: unknown) {
    const r = propuestaSchema.safeParse(cuerpo);
    if (r.success) await socket.leave(salaPropuesta(r.data.propuestaId));
  }

  @SubscribeMessage(EVENTOS.ENVIAR)
  async enviar(
    @ConnectedSocket() socket: SocketApp,
    @MessageBody() cuerpo: unknown,
  ): Promise<RespuestaSocket<MensajeChat>> {
    try {
      const { propuestaId } = propuestaSchema.parse(cuerpo);
      const { contenido } = enviarMensajeSchema.parse(cuerpo);
      const { mensaje, destinatarioId } = await this.mensajes.enviar(
        propuestaId,
        socket.data.usuarioId,
        contenido,
      );
      this.difundir(mensaje, destinatarioId);
      return { ok: true, datos: mensaje };
    } catch (e) {
      return fallo(e);
    }
  }

  @SubscribeMessage(EVENTOS.LEIDO)
  async leido(@ConnectedSocket() socket: SocketApp, @MessageBody() cuerpo: unknown) {
    try {
      const { propuestaId } = propuestaSchema.parse(cuerpo);
      await this.avisarLeido(propuestaId, socket.data.usuarioId);
    } catch (e) {
      this.logger.debug(`mensaje:leido rechazado: ${String(e)}`);
    }
  }

  @SubscribeMessage(EVENTOS.ESCRIBIENDO)
  async escribiendo(@ConnectedSocket() socket: SocketApp, @MessageBody() cuerpo: unknown) {
    const r = propuestaSchema.safeParse(cuerpo);
    if (!r.success || !socket.rooms.has(salaPropuesta(r.data.propuestaId))) return;
    socket.to(salaPropuesta(r.data.propuestaId)).emit(EVENTOS.ESCRIBIENDO, {
      propuestaId: r.data.propuestaId,
      usuarioId: socket.data.usuarioId,
    });
  }

  /** También se usa cuando el mensaje llega por REST. */
  difundir(m: MensajeChat, destinatarioId: string) {
    this.servidor
      ?.to([salaPropuesta(m.propuestaId), salaUsuario(destinatarioId), salaUsuario(m.emisorId)])
      .emit(EVENTOS.NUEVO, m);
  }

  async avisarLeido(propuestaId: string, lectorId: string) {
    const avisar = await this.mensajes.marcarLeidos(propuestaId, lectorId);
    if (avisar) {
      this.servidor
        ?.to([salaPropuesta(propuestaId), salaUsuario(avisar)])
        .emit(EVENTOS.LEIDO, { propuestaId, lectorId });
    }
  }
}
