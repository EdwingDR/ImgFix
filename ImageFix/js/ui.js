import { escapeHtml, getFileName } from './utils.js';

/** Encapsula las actualizaciones de DOM para mantener app.js legible. */
export function createUI() {
  const $ = (id) => document.getElementById(id);
  const elements = {
    dropzone: $('dropzone'),
    input: $('folderInput'),
    workspace: $('workspace'),
    body: $('resultsBody'),
    empty: $('emptyTable'),
    log: $('activityLog'),
    toast: $('toast'),
    progress: $('progressArea'),
    bar: $('progressBar'),
    progressLabel: $('progressLabel'),
    percent: $('progressPercent'),
  };

  /** Muestra una notificación temporal. */
  function toast(message, success = false) {
    elements.toast.textContent = message;
    elements.toast.className = `toast show${success ? ' success' : ''}`;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
      elements.toast.className = 'toast';
    }, 3500);
  }

  /** Añade una entrada al panel de actividad. */
  function log(message) {
    const line = document.createElement('div');
    line.className = 'log-line';
    line.innerHTML = `<b>›</b>${escapeHtml(message)}`;
    elements.log.prepend(line);
  }

  /** Actualiza la barra de progreso y su etiqueta. */
  function setProgress(percent, label = 'Procesando...') {
    elements.progress.classList.remove('hidden');
    elements.bar.style.width = `${Math.round(percent)}%`;
    elements.percent.textContent = `${Math.round(percent)}%`;
    elements.progressLabel.textContent = label;
  }

  /** Oculta la barra de progreso. */
  function hideProgress() {
    elements.progress.classList.add('hidden');
  }

  /** Renderiza la tabla completa de resultados. */
  function renderResults(results) {
    elements.body.innerHTML = '';

    results.forEach((item) => {
      const row = document.createElement('tr');
      const statusLabel = {
        renamed: 'Renombrado',
        unchanged: 'Sin cambios',
        conflict: 'Conflicto',
      }[item.status];
      const badgeClass = {
        renamed: 'badge-green',
        unchanged: 'badge-blue',
        conflict: 'badge-amber',
      }[item.status];

      row.dataset.search = `${item.original} ${item.newName}`.toLowerCase();
      row.dataset.status = item.status;
      row.dataset.type = item.file.type || '';
      row.innerHTML = `
        <td><img class="thumb" alt="" /></td>
        <td class="muted">${escapeHtml(item.original)}</td>
        <td class="new-name">${escapeHtml(item.newName)}</td>
        <td class="action">${item.status === 'unchanged' ? '—' : item.rule ? `Regla ${item.rule}` : 'Colisión resuelta'}</td>
        <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
      `;

      const image = row.querySelector('img');
      if (item.file.type.startsWith('image/')) {
        image.src = URL.createObjectURL(item.file);
      }
      elements.body.append(row);
    });
  }

  /** Filtra y ordena las filas visibles. */
  function filterRows(query, sort) {
    const rows = [...elements.body.rows];

    rows.sort((first, second) => {
      if (sort === 'status') return first.dataset.status.localeCompare(second.dataset.status);
      if (sort === 'type') return first.dataset.type.localeCompare(second.dataset.type);
      return first.dataset.search.localeCompare(second.dataset.search);
    });

    rows.forEach((row) => elements.body.append(row));

    let visible = 0;
    rows.forEach((row) => {
      const shouldShow = row.dataset.search.includes(query.toLowerCase());
      row.hidden = !shouldShow;
      if (shouldShow) visible += 1;
    });

    elements.empty.classList.toggle('hidden', visible !== 0 || rows.length === 0);
    $('resultCount').textContent = `${visible} resultado${visible === 1 ? '' : 's'}`;
  }

  /** Actualiza las tarjetas de estadísticas. */
  function stats(summary, duration) {
    $('totalStat').textContent = summary.total;
    $('renamedStat').textContent = summary.renamed;
    $('unchangedStat').textContent = summary.unchanged;
    $('conflictStat').textContent = summary.conflict;
    $('timeStat').textContent = duration;
  }

  return {
    ...elements,
    toast,
    log,
    setProgress,
    hideProgress,
    renderResults,
    filterRows,
    stats,
    getFileName,
  };
}
