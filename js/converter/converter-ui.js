import { analyzeFiles } from '../analyzer.js';
import { getExtension, getFolderName } from '../utils.js';
import { convertFiles, filterConvertibleFiles, getOriginalFormat } from './image-converter.js';
import { createConvertedZip, downloadConvertedZip } from './zip-creator.js';

let converterFiles = [];
let converterFolderName = 'Imagenes';

const $ = (id) => document.getElementById(id);

/** Inicializa la herramienta Conversor y sus eventos. */
export function initializeConverter() {
  const dropzone = $('converterDropzone');
  const filesInput = $('converterFilesInput');
  const folderInput = $('converterFolderInput');

  $('converterSelectFilesBtn').addEventListener('click', () => filesInput.click());
  $('converterSelectFolderBtn').addEventListener('click', () => folderInput.click());
  filesInput.addEventListener('change', (event) => loadConverterFiles(event.target.files));
  folderInput.addEventListener('change', (event) => loadConverterFiles(event.target.files));

  dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropzone.classList.add('dragging');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragging'));
  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropzone.classList.remove('dragging');
    loadConverterFiles(event.dataTransfer.files);
  });
  dropzone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      filesInput.click();
    }
  });

  $('converterStartBtn').addEventListener('click', startConversion);
  $('converterClearBtn').addEventListener('click', clearConverter);
  $('converterOutputFormat').addEventListener('change', renderFileList);
}

/** Carga, filtra y lista los archivos seleccionados. */
function loadConverterFiles(files) {
  converterFiles = filterConvertibleFiles(files);
  if (!converterFiles.length) {
    setStatus('No se encontraron imágenes compatibles.', true);
    return;
  }

  resetConverterOutput();
  converterFolderName = converterFiles.some((file) => file.webkitRelativePath)
    ? getFolderName(converterFiles)
    : 'Imagenes';
  renderFileList();
  $('converterWorkspace').classList.remove('hidden');
  setStatus('Archivos cargados correctamente.');
}

/** Renderiza nombre, formato y destino de cada imagen. */
function renderFileList() {
  const list = $('converterFileList');
  const format = $('converterOutputFormat').value.toUpperCase();
  list.innerHTML = converterFiles.map((file) => `
    <div class="converter-file-row">
      <span class="converter-file-icon">▧</span>
      <span class="converter-file-name" title="${file.name}">${file.name}</span>
      <span class="converter-file-format">${getOriginalFormat(file)}</span>
      <span class="converter-file-arrow">→ ${format}</span>
    </div>
  `).join('');
  $('converterCount').textContent = converterFiles.length;
  $('converterFormats').textContent = [...new Set(converterFiles.map(getOriginalFormat))].join(' · ');
}

/** Convierte los archivos y prepara el ZIP de salida. */
async function startConversion() {
  if (!converterFiles.length) return;
  const startButton = $('converterStartBtn');
  const outputFormat = $('converterOutputFormat').value;
  startButton.disabled = true;
  $('converterProgress').classList.remove('hidden');

  try {
    let nameMap = new Map();
    if ($('converterApplyRules').checked) {
      const analysis = await analyzeFiles(converterFiles, () => {}, {
        enabledRules: new Set([1, 2, 3]),
      });
      nameMap = new Map(analysis.results.map((item) => [item.file, item.newName]));
    }

    setStatus('Conversión iniciada.');
    const converted = await convertFiles(converterFiles, nameMap, outputFormat, (progress, current, total) => {
      setProgress(progress, `Procesando imagen ${current} de ${total}`);
    });
    setStatus('Creando carpeta ZIP...');
    const outputFolder = converterFolderName;
    const zip = await createConvertedZip(converted, outputFolder, (progress) => {
      setProgress(progress, 'Generando ZIP...');
    });
    // La descarga comienza automáticamente cuando el ZIP termina de generarse.
    downloadConvertedZip(zip, `${outputFolder}.zip`);
    clearConverter();
  } catch (error) {
    setStatus(`Error al procesar un archivo: ${error.message}`, true);
  } finally {
    startButton.disabled = false;
  }
}

/** Actualiza el texto y el estado visual del proceso. */
function setStatus(message, isError = false) {
  const status = $('converterStatus');
  status.textContent = message;
  status.classList.toggle('error', isError);
}

/** Actualiza la barra de progreso del conversor. */
function setProgress(progress, label) {
  $('converterProgressBar').style.width = `${Math.round(progress)}%`;
  $('converterProgressPercent').textContent = `${Math.round(progress)}%`;
  $('converterProgressLabel').textContent = label;
}

/** Invalida el resultado anterior cuando comienza una nueva selección. */
function resetConverterOutput() {
  const downloadButton = $('converterDownloadBtn');
  downloadButton.classList.add('hidden');
  downloadButton.onclick = null;
  $('converterProgress').classList.add('hidden');
  $('converterProgressBar').style.width = '0%';
  $('converterProgressPercent').textContent = '0%';
  $('converterProgressLabel').textContent = 'Preparando...';
}

/** Limpia los archivos y devuelve el conversor a su estado inicial. */
function clearConverter() {
  converterFiles = [];
  resetConverterOutput();
  $('converterFilesInput').value = '';
  $('converterFolderInput').value = '';
  $('converterOutputFormat').value = 'jpg';
  $('converterWorkspace').classList.add('hidden');
  $('converterFileList').innerHTML = '';
}
