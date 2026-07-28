import { analyzeFiles } from './analyzer.js';
import { applyRenames, summarize } from './renamer.js';
import { createZip, downloadBlob } from './zip.js';
import { createUI } from './ui.js';
import { formatDuration, getExtension, getFolderName, IMAGE_EXTENSIONS } from './utils.js';
import { initializeConverter } from './converter/converter-ui.js';

const ui = createUI();
const $ = (id) => document.getElementById(id);

let selectedFiles = [];
let analysis = null;
let folderName = 'ImageFix';

/** Abre la confirmación visual de la carpeta seleccionada. */
function requestFolderConfirmation(name, files) {
  const modal = $('folderModal');
  const imageCount = files.filter((file) => IMAGE_EXTENSIONS.has(getExtension(file.name))).length;
  $('selectedFolderName').textContent = name;
  $('selectedFolderImages').textContent = `${imageCount} imagen${imageCount === 1 ? '' : 'es'} encontrada${imageCount === 1 ? '' : 's'}`;
  modal.classList.remove('hidden');

  return new Promise((resolve) => {
    const close = (result) => {
      modal.classList.add('hidden');
      modal.removeEventListener('click', backdropClick);
      $('folderModalConfirmBtn').onclick = null;
      $('folderModalCancelBtn').onclick = null;
      $('folderModalCloseBtn').onclick = null;
      resolve(result);
    };
    const backdropClick = (event) => {
      if (event.target === modal) close(false);
    };

    modal.addEventListener('click', backdropClick);
    $('folderModalConfirmBtn').onclick = () => close(true);
    $('folderModalCancelBtn').onclick = () => close(false);
    $('folderModalCloseBtn').onclick = () => close(false);
  });
}

/** Abre el modal visual de confirmación y devuelve la decisión del usuario. */
function requestDownloadConfirmation(summary) {
  const modal = $('confirmModal');
  $('modalTotal').textContent = summary.total;
  $('modalRenamed').textContent = summary.renamed;
  $('modalUnchanged').textContent = summary.unchanged;
  $('modalConflicts').textContent = summary.conflict;
  modal.classList.remove('hidden');

  return new Promise((resolve) => {
    const close = (result) => {
      modal.classList.add('hidden');
      modal.removeEventListener('click', backdropClick);
      $('modalConfirmBtn').onclick = null;
      $('modalCancelBtn').onclick = null;
      $('modalCloseBtn').onclick = null;
      resolve(result);
    };
    const backdropClick = (event) => {
      if (event.target === modal) close(false);
    };

    modal.addEventListener('click', backdropClick);
    $('modalConfirmBtn').onclick = () => close(true);
    $('modalCancelBtn').onclick = () => close(false);
    $('modalCloseBtn').onclick = () => close(false);
  });
}

/** Alterna entre la pantalla inicial y el espacio de trabajo. */
function setWorkspaceVisible(visible) {
  ui.workspace.classList.toggle('hidden', !visible);
  ui.dropzone.classList.toggle('hidden', visible);
}

/** Limpia la sesión actual para permitir cargar otra carpeta. */
function resetImageFixSession() {
  selectedFiles = [];
  analysis = null;
  ui.input.value = '';
  setWorkspaceVisible(false);
}

/** Ejecuta nuevamente el análisis de la carpeta seleccionada. */
async function runAnalysis() {
  if (!selectedFiles.length) return;

  ui.setProgress(0, 'Analizando imágenes...');
  const outcome = await analyzeFiles(
    selectedFiles,
    (progress) => ui.setProgress(progress, 'Analizando imágenes...'),
    { enabledRules: getEnabledRules() },
  );
  analysis = outcome;

  const resetRuleToggle = document.querySelector('[data-rule-toggle="4"]');
  if (resetRuleToggle && outcome.resetNumberingAutoDisabled) {
    resetRuleToggle.checked = false;
  }

  const summary = summarize(outcome.results);
  ui.stats(summary, formatDuration(outcome.duration));
  ui.renderResults(outcome.results);
  ui.filterRows($('searchInput').value, $('sortSelect').value);
  ui.hideProgress();
  $('downloadBtn').disabled = !summary.total;

  ui.log(`Se detectaron ${summary.total} imágenes en ${folderName}.`);
  if (summary.renamed) {
    ui.log(`Se prepararon ${summary.renamed} imágenes para renombrar.`);
  }
  if (summary.conflict) {
    ui.log(`Se resolvieron ${summary.conflict} conflictos sin sobrescribir archivos.`);
  }
  if (outcome.threeDigitDetected) {
    ui.log(outcome.threeDigitHasZero
      ? 'Se detectó un archivo 000. Se renumeró toda la secuencia comenzando desde 01.'
      : 'Se detectó numeración de tres dígitos. No existe archivo 000; se eliminaron ceros iniciales.');
    ui.log(`Se corrigieron ${summary.ruleCounts[3]} imágenes mediante la regla de tres dígitos.`);
  }
  if (outcome.resetNumberingDetected) {
    ui.log(`Se detectó una secuencia numérica. Se reinició la numeración desde 1 en ${summary.ruleCounts[4]} imágenes.`);
  }
  if (outcome.resetNumberingAutoDisabled) {
    ui.log('La Regla 4 se desactivó automáticamente para evitar un conflicto de nombres.');
  }
  if (outcome.zeroShiftDetected) {
    ui.log(`Se detectó un archivo 0. Se desplazó la numeración en ${summary.ruleCounts[5]} imágenes.`);
  }
  ui.toast('Análisis completado', true);
}

/** Obtiene las reglas activas desde los interruptores de la interfaz. */
function getEnabledRules() {
  return new Set(
    [...document.querySelectorAll('[data-rule-toggle]:checked')]
      .map((input) => Number(input.dataset.ruleToggle)),
  );
}

/** Carga los archivos elegidos y muestra el espacio de trabajo. */
async function loadFiles(files) {
  const list = [...files];
  if (!list.length) {
    ui.toast('No se encontraron archivos en la carpeta.');
    return;
  }

  selectedFiles = list;
  folderName = getFolderName(list);
  const confirmation = await requestFolderConfirmation(folderName, list);
  if (!confirmation) {
    selectedFiles = [];
    ui.input.value = '';
    return;
  }
  $('folderTitle').textContent = folderName;
  setWorkspaceVisible(true);
  ui.log(`Carpeta cargada correctamente: ${folderName}.`);
  runAnalysis();
}

/** Confirma, aplica el proceso y descarga el ZIP generado. */
async function download() {
  if (!analysis) return;

  const summary = summarize(analysis.results);
  const confirmation = await requestDownloadConfirmation(summary);
  if (!confirmation) return;

  try {
    ui.setProgress(0, 'Aplicando cambios...');
    await applyRenames(
      analysis.results,
      (progress) => ui.setProgress(progress, 'Aplicando cambios...'),
    );
    ui.setProgress(0, 'Generando ZIP...');
    const blob = await createZip(
      analysis.results,
      folderName,
      (progress) => ui.setProgress(progress, 'Generando ZIP...'),
    );
    downloadBlob(blob, `${folderName}.zip`);
    ui.hideProgress();
    ui.log('ZIP generado correctamente.');
    resetImageFixSession();
    ui.toast('ZIP creado correctamente. Listo para cargar otra carpeta.', true);
  } catch (error) {
    ui.hideProgress();
    ui.toast(error.message);
  }
}

/** Registra todos los eventos de la interfaz. */
function registerEvents() {
  $('selectFolderBtn').addEventListener('click', () => ui.input.click());
  ui.input.addEventListener('change', (event) => loadFiles(event.target.files));

  ui.dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    ui.dropzone.classList.add('dragging');
  });
  ui.dropzone.addEventListener('dragleave', () => ui.dropzone.classList.remove('dragging'));
  ui.dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    ui.dropzone.classList.remove('dragging');
    loadFiles(event.dataTransfer.files);
  });
  ui.dropzone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      ui.input.click();
    }
  });

  $('analyzeBtn').addEventListener('click', runAnalysis);
  $('downloadBtn').addEventListener('click', download);
  $('searchInput').addEventListener('input', (event) => {
    ui.filterRows(event.target.value, $('sortSelect').value);
  });
  $('sortSelect').addEventListener('change', (event) => {
    ui.filterRows($('searchInput').value, event.target.value);
  });
  $('clearBtn').addEventListener('click', () => {
    ui.log('Sesión limpiada.');
    resetImageFixSession();
  });
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') {
      event.preventDefault();
      ui.input.click();
    }
  });
}

registerEvents();
initializeConverter();
