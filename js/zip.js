/** Crea un ZIP local con la carpeta raíz y todos los archivos analizados. */
export async function createZip(results, folderName, onProgress = () => {}) {
  if (!window.JSZip) {
    throw new Error('JSZip todavía no está disponible.');
  }

  const zip = new window.JSZip();

  for (let index = 0; index < results.length; index += 1) {
    const item = results[index];
    // Los archivos quedan en la raíz para evitar una carpeta anidada al extraer.
    zip.file(item.newName, item.file);
    onProgress(((index + 1) / results.length) * 70);

    if (index % 20 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE' },
    (metadata) => onProgress(70 + metadata.percent * 0.3),
  );
}

/** Dispara la descarga del blob sin enviar datos a ningún servidor. */
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
