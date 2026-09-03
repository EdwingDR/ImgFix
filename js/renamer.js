/** Devuelve estadísticas agrupadas para la vista y la confirmación. */
export function summarize(results) {
  return results.reduce((summary, item) => {
    summary.total += 1;
    summary[item.status] += 1;
    if (item.rule) summary.ruleCounts[item.rule] += 1;
    return summary;
  }, {
    total: 0,
    renamed: 0,
    unchanged: 0,
    conflict: 0,
    ruleCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
  });
}

/** Simula la fase de aplicación para mostrar progreso antes de crear el ZIP. */
export async function applyRenames(results, onProgress = () => {}) {
  for (let index = 0; index < results.length; index += 1) {
    // Primera fase virtual: el navegador no puede renombrar los originales.
    results[index].temporaryName = `temp_${results[index].original}`;
    onProgress(((index + 1) / results.length) * 100);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return results;
}
