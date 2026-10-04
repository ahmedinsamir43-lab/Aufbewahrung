import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Längste Bildkante für die Erkennung: genügt für Mahlzeiten und hält die Übertragung klein. */
export const MAX_EDGE_PX = 1024;

/** Verkleinert ein Foto und liefert es als JPEG in Base64. */
export async function prepareImage(uri: string, width: number, height: number): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > MAX_EDGE_PX) {
    context.resize(width >= height ? { width: MAX_EDGE_PX } : { height: MAX_EDGE_PX });
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({ base64: true, compress: 0.7, format: SaveFormat.JPEG });
  if (!result.base64) throw new Error('Bild konnte nicht kodiert werden');
  return result.base64;
}
