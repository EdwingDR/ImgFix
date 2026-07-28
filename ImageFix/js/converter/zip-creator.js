/** Crea el ZIP de salida conservando la estructura relativa de las carpetas. */
export async function createConvertedZip(convertedFiles, outputFolder, onProgress = () => {}) {
  if (!window.JSZip) throw new Error('JSZip todavía no está disponible.');

  const zip = new window.JSZip();
  // Los archivos se guardan en la raíz para que Windows no cree una carpeta anidada.
  convertedFiles.forEach((item) => zip.file(item.path, item.blob));

  return zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE' },
    (metadata) => onProgress(metadata.percent),
  );
}

/** Descarga el ZIP generado localmente. */
export function downloadConvertedZip(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
