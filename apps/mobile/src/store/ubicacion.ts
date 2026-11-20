import { type Coordenadas, dentroDeBogota } from '@trueque/shared';
import * as Location from 'expo-location';
import { create } from 'zustand';

type Permiso = 'desconocido' | 'concedido' | 'denegado';

type EstadoUbicacion = {
  /** Ubicación actual del celular (solo en memoria, nunca se guarda). null = usar la localidad. */
  origen: Coordenadas | null;
  permiso: Permiso;
  /** Revisa el permiso sin mostrar el diálogo; si ya lo dio, obtiene la ubicación. */
  revisar(): Promise<void>;
  /** Pide el permiso (muestra el diálogo del sistema) y obtiene la ubicación. */
  pedir(): Promise<void>;
};

async function leerPosicion(): Promise<Coordenadas | null> {
  try {
    const ultima = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60_000 });
    const p =
      ultima ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    const c = { lat: p.coords.latitude, lng: p.coords.longitude };
    // Fuera de Bogotá (o en el simulador) se usa el centro de la localidad.
    return dentroDeBogota(c.lat, c.lng) ? c : null;
  } catch {
    return null;
  }
}

/**
 * Origen de las búsquedas por cercanía (RF-12). Si el usuario no comparte su ubicación,
 * el API mide desde el centro de su localidad.
 */
export const useUbicacion = create<EstadoUbicacion>((set, get) => ({
  origen: null,
  permiso: 'desconocido',
  async revisar() {
    if (get().permiso !== 'desconocido') return;
    const { granted } = await Location.getForegroundPermissionsAsync().catch(() => ({
      granted: false,
    }));
    if (!granted) return set({ permiso: 'denegado' });
    set({ permiso: 'concedido', origen: await leerPosicion() });
  },
  async pedir() {
    const { granted } = await Location.requestForegroundPermissionsAsync().catch(() => ({
      granted: false,
    }));
    if (!granted) return set({ permiso: 'denegado' });
    set({ permiso: 'concedido', origen: await leerPosicion() });
  },
}));
