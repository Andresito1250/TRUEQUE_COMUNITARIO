import {
  EVENTOS,
  type EventosServidor,
  type MensajeChat,
  type RespuestaSocket,
} from '@trueque/shared';
import { io, type Socket } from 'socket.io-client';

import { API_URL, sesionApi } from '@/lib/api';

/** Eventos que la app envía: todos llevan un objeto y algunos esperan respuesta. */
type EventosCliente = Record<string, (datos: object, ack?: (r: unknown) => void) => void>;
type SocketApp = Socket<EventosServidor, EventosCliente>;

let socket: SocketApp | null = null;

/**
 * Un solo socket para el chat (RF-20) y los avisos al instante (RF-21). Usa el access token de
 * la sesión; si el servidor lo rechaza porque venció, se renueva y se reconecta.
 */
export function conectarTiempoReal(): SocketApp {
  if (socket) return socket;
  const s: SocketApp = io(`${API_URL}/tiempo-real`, {
    // En React Native el transporte de WebSocket es el más estable.
    transports: ['websocket'],
    auth: (cb) => cb({ token: sesionApi.access() }),
    reconnectionDelay: 2000,
    reconnectionDelayMax: 15_000,
  });
  s.on('disconnect', (motivo) => {
    // "io server disconnect": el servidor rechazó el token. Se renueva y se intenta otra vez.
    if (motivo === 'io server disconnect') {
      void sesionApi.renovar().then((nuevo) => {
        if (nuevo && socket === s) s.connect();
      });
    }
  });
  socket = s;
  return s;
}

export function socketActual(): SocketApp | null {
  return socket;
}

export function desconectarTiempoReal() {
  socket?.removeAllListeners();
  socket?.disconnect();
  socket = null;
}

/** Envía un mensaje por el socket; devuelve null si no hay conexión (se usa REST). */
export async function enviarPorSocket(
  propuestaId: string,
  contenido: string,
): Promise<RespuestaSocket<MensajeChat> | null> {
  const s = socket;
  if (!s?.connected) return null;
  try {
    return (await s
      .timeout(6000)
      .emitWithAck(EVENTOS.ENVIAR, { propuestaId, contenido })) as RespuestaSocket<MensajeChat>;
  } catch {
    return null;
  }
}

export function emitir(evento: (typeof EVENTOS)[keyof typeof EVENTOS], datos: object) {
  socket?.emit(evento, datos);
}
