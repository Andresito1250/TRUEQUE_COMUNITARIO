import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export type Origen = 'galeria' | 'camara';

/**
 * Pide permiso, abre la galería o la cámara y devuelve las fotos ya comprimidas
 * (lado mayor de 1280 px, JPEG al 70 %) para que suban rápido con datos móviles (RNF04).
 */
export async function elegirFotos(origen: Origen, limite: number): Promise<string[]> {
  if (limite <= 0) return [];
  const permiso =
    origen === 'camara'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permiso.granted) {
    Alert.alert(
      'Permiso necesario',
      origen === 'camara'
        ? 'Para tomar fotos, permite el acceso a la cámara en los ajustes del celular.'
        : 'Para elegir fotos, permite el acceso a tus fotos en los ajustes del celular.',
    );
    return [];
  }
  const opciones: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 1,
    allowsMultipleSelection: origen === 'galeria' && limite > 1,
    selectionLimit: limite,
  };
  const resultado =
    origen === 'camara'
      ? await ImagePicker.launchCameraAsync(opciones)
      : await ImagePicker.launchImageLibraryAsync(opciones);
  if (resultado.canceled) return [];
  const elegidas = resultado.assets.slice(0, limite);
  return Promise.all(elegidas.map((a) => comprimir(a.uri, a.width, a.height)));
}

export async function comprimir(uri: string, ancho = 0, alto = 0): Promise<string> {
  let contexto = ImageManipulator.manipulate(uri);
  if (Math.max(ancho, alto) > 1280) {
    contexto = contexto.resize(ancho >= alto ? { width: 1280 } : { height: 1280 });
  }
  const imagen = await contexto.renderAsync();
  const guardada = await imagen.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
  return guardada.uri;
}

/**
 * Arma el cuerpo multipart con las fotos locales.
 * Desde Expo SDK 58 el `fetch` global es `expo/fetch`, que no acepta el formato antiguo
 * `{ uri, name, type }`: los archivos deben ir como `File` de expo-file-system.
 */
export function formularioConFotos(campo: string, uris: string[]): FormData {
  const datos = new FormData();
  for (const uri of uris) datos.append(campo, new File(uri));
  return datos;
}

/** Ofrece galería o cámara en un menú. */
export function preguntarOrigen(
  alElegir: (o: Origen) => void,
  extra?: { texto: string; accion: () => void },
) {
  Alert.alert('Agregar foto', undefined, [
    { text: 'Tomar foto', onPress: () => alElegir('camara') },
    { text: 'Elegir de la galería', onPress: () => alElegir('galeria') },
    ...(extra ? [{ text: extra.texto, style: 'destructive' as const, onPress: extra.accion }] : []),
    { text: 'Cancelar', style: 'cancel' as const },
  ]);
}
