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

/** Calcula el nombre de salida conservando el nombre original. */
export function getOutputName(file, format = 'png', renamedName = null) {
  const sourceName = renamedName || getFileName(file.name);
  return `${getBaseName(sourceName)}.${format}`;
}

/** Obtiene la ruta relativa sin la extensión para conservar subcarpetas. */
export function getRelativeOutputPath(file, format = 'png', renamedName = null) {
  const relativePath = file.webkitRelativePath || getFileName(file.name);
  const folders = relativePath.split(/[\\/]/);
  if (file.webkitRelativePath && folders.length > 1) folders.shift();
  folders[folders.length - 1] = getOutputName(file, format, renamedName);
  return folders.join('/');
}

/** Convierte una imagen al formato seleccionado mediante Canvas. */
export async function convertImageToFormat(file, format = 'png') {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d');
  if (format === 'jpg') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error(`No se pudo convertir ${file.name}.`));
    }, format === 'jpg' ? 'image/jpeg' : 'image/png', format === 'jpg' ? 0.92 : undefined);
  });
}

/** Mantiene compatibilidad con llamadas anteriores que convertían a PNG. */
export async function convertImageToPng(file) {
  return convertImageToFormat(file, 'png');
}

/** Convierte archivos respetando orden, formato y rutas relativas. */
export async function convertFiles(files, nameMap, format = 'png', onProgress = () => {}) {
  const converted = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const blob = await convertImageToFormat(file, format);
    converted.push({
      blob,
      path: getRelativeOutputPath(file, format, nameMap.get(file) || null),
      original: file,
    });
    onProgress(((index + 1) / files.length) * 100, index + 1, files.length);
  }

  return converted;
}
