import type { Notificacion } from '@trueque/shared';
import { create } from 'zustand';

type EstadoAvisos = {
  /** Aviso flotante que se muestra arriba al llegar una notificación (RF-21). */
  actual: Notificacion | null;
  /** Chat abierto en pantalla: sus mensajes no muestran aviso flotante. */
  chatAbierto: string | null;
  mostrar(n: Notificacion): void;
  cerrar(): void;
  abrirChat(propuestaId: string | null): void;
};

export const useAvisos = create<EstadoAvisos>((set, get) => ({
  actual: null,
  chatAbierto: null,
  mostrar: (n) => {
    if (n.tipo === 'MENSAJE_NUEVO' && n.ruta === `/chat/${get().chatAbierto}`) return;
    set({ actual: n });
  },
  cerrar: () => set({ actual: null }),
  abrirChat: (chatAbierto) => set({ chatAbierto }),
}));
