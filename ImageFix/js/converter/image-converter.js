import { getBaseName, getExtension, getFileName, IMAGE_EXTENSIONS } from '../utils.js';

/** Filtra una lista conservando únicamente imágenes compatibles con ImageFix. */
export function filterConvertibleFiles(files) {
  return [...files].filter((file) =>
    file.type.startsWith('image/') || IMAGE_EXTENSIONS.has(getExtension(file.name)),
  );
}

/** Devuelve la extensión original para mostrarla en la interfaz. */
export function getOriginalFormat(file) {
  return getExtension(file.name).toUpperCase() || 'IMAGEN';
}

/** Calcula el nombre PNG, conservando el nombre original por defecto. */
export function getPngName(file, renamedName = null) {
  const sourceName = renamedName || getFileName(file.name);
  return `${getBaseName(sourceName)}.png`;
}

/** Obtiene la ruta relativa sin la extensión para conservar subcarpetas. */
export function getRelativePngPath(file, renamedName = null) {
  const relativePath = file.webkitRelativePath || getFileName(file.name);
  const folders = relativePath.split(/[\\/]/);
  if (file.webkitRelativePath && folders.length > 1) folders.shift();
  folders[folders.length - 1] = getPngName(file, renamedName);
  return folders.join('/');
}

/** Convierte una imagen a PNG mediante Canvas sin modificar sus dimensiones. */
export async function convertImageToPng(file) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d');
  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error(`No se pudo convertir ${file.name}.`));
    }, 'image/png');
  });
}

/** Convierte todos los archivos respetando el orden y la ruta relativa. */
export async function convertFiles(files, nameMap, onProgress = () => {}) {
  const converted = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const blob = await convertImageToPng(file);
    converted.push({
      blob,
      path: getRelativePngPath(file, nameMap.get(file) || null),
      original: file,
    });
    onProgress(((index + 1) / files.length) * 100, index + 1, files.length);
  }

  return converted;
}
