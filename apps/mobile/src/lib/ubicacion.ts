import { type Coordenadas, dentroDeBogota } from '@trueque/shared';
import * as Location from 'expo-location';

/**
 * Ubicación aproximada del celular (precisión media, sin GPS fino).
 * Devuelve null si el usuario no da permiso o si está fuera de Bogotá; en ese caso
 * el API usa el centro de su localidad.
 */
export async function ubicacionAproximada(): Promise<Coordenadas | null> {
  try {
    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) return null;
    const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const c = { lat: p.coords.latitude, lng: p.coords.longitude };
    return dentroDeBogota(c.lat, c.lng) ? c : null;
  } catch {
    return null;
  }
}
