import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Borradores guardados en el celular (RNF07): si se cae la red o se cierra la app,
 * lo escrito no se pierde.
 */
export async function leerBorrador<T>(clave: string): Promise<T | null> {
  try {
    const crudo = await AsyncStorage.getItem(clave);
    return crudo ? (JSON.parse(crudo) as T) : null;
  } catch {
    return null;
  }
}

export async function guardarBorrador<T>(clave: string, valor: T): Promise<void> {
  try {
    await AsyncStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Si el almacenamiento falla no se interrumpe al usuario.
  }
}

export async function borrarBorrador(clave: string): Promise<void> {
  await AsyncStorage.removeItem(clave).catch(() => undefined);
}
