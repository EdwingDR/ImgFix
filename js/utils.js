/** Utilidades compartidas para ImageFix. */
export const IMAGE_EXTENSIONS = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'avif', 'jxl',
]);

/** Obtiene la extensión de un nombre de archivo. */
export function getExtension(name) {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

/** Obtiene el nombre sin extensión. */
export function getBaseName(name) {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
}

/** Obtiene el último segmento de una ruta. */
export function getFileName(path) {
  return path.split(/[\\/]/).pop() || path;
}

/** Obtiene el nombre de la carpeta seleccionada. */
export function getFolderName(files) {
  const path = files[0]?.webkitRelativePath || '';
  return path.split('/')[0] || 'ImageFix';
}

/** Formatea una duración para mostrarla en la interfaz. */
export function formatDuration(ms) {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`;
}

/** Permite ceder el control al navegador durante procesos largos. */
export function sleep(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Escapa texto antes de insertarlo como HTML. */
export function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[character]));
}
