import {
  IMAGE_EXTENSIONS,
  getBaseName,
  getExtension,
  getFileName,
  sleep,
} from './utils.js';

/** Regla 1: conserva el número situado antes de " (n)". */
export function applyParenthesisRule(base) {
  const match = base.match(/^(\d+)\s*\(\d+\)$/);
  return match ? { name: match[1], rule: 1 } : null;
}

/** Regla 2: elimina cinco dígitos iniciales y el guion bajo. */
export function applyPrefixRule(base) {
  const match = base.match(/^\d{4,5}_(.+)$/);
  return match ? { name: match[1], rule: 2 } : null;
}

/** Identificador de la regla de numeración de tres dígitos. */
export const THREE_DIGIT_RULE_ID = 3;

/** Identificador de la regla que reinicia una secuencia desde 1. */
export const RESET_NUMBERING_RULE_ID = 4;

/** Identificador de la regla que desplaza una secuencia que empieza en 0. */
export const ZERO_SHIFT_RULE_ID = 5;

/** Identificador de la regla para numeración de cuatro dígitos con cero. */
export const FOUR_DIGIT_ZERO_RULE_ID = 6;

/** Devuelve si una regla está activa en la configuración recibida. */
function isRuleEnabled(enabledRules, ruleId) {
  return enabledRules instanceof Set
    ? enabledRules.has(ruleId)
    : enabledRules[ruleId] !== false;
}

/** Analiza toda la carpeta y prepara la renumeración de tres dígitos. */
function buildThreeDigitPlan(files, enabledRules) {
  const plan = new Map();
  if (!isRuleEnabled(enabledRules, THREE_DIGIT_RULE_ID)) return plan;

  const threeDigitCandidates = files.filter((file) =>
    /^\d{3}$/.test(getBaseName(getFileName(file.name))),
  );
  const hasZeroFile = threeDigitCandidates.some(
    (file) => getBaseName(getFileName(file.name)) === '000',
  );
  let candidates = threeDigitCandidates;

  if (hasZeroFile) {
    const sequenceCandidates = files.filter((file) => {
      const base = getBaseName(getFileName(file.name));
      return /^\d{3}$/.test(base) || /^\d{2}$/.test(base);
    });
    const byNumber = new Map();

    sequenceCandidates.forEach((file) => {
      const value = Number(getBaseName(getFileName(file.name)));
      if (!byNumber.has(value)) byNumber.set(value, []);
      byNumber.get(value).push(file);
    });

    const contiguousCandidates = [];
    let expected = 0;
    while (byNumber.has(expected)) {
      contiguousCandidates.push(...byNumber.get(expected));
      expected += 1;
    }
    candidates = contiguousCandidates;
  }

  for (const file of candidates) {
    const base = getBaseName(getFileName(file.name));
    const extension = getExtension(file.name);
    let correctedBase;

    if (hasZeroFile) {
      correctedBase = String(Number(base) + 1).padStart(2, '0');
    } else if (base.startsWith('0')) {
      correctedBase = base.slice(1);
    }

    if (correctedBase) {
      plan.set(file, {
        name: `${correctedBase}.${extension}`,
        rule: THREE_DIGIT_RULE_ID,
      });
    }
  }

  return plan;
}

/**
 * Ordena todos los nombres formados solo por números y asigna una nueva
 * posición consecutiva comenzando desde 1.
 */
function buildResetNumberingPlan(files, enabledRules) {
  const plan = new Map();
  if (!isRuleEnabled(enabledRules, RESET_NUMBERING_RULE_ID)) return plan;

  const candidates = files
    .map((file, index) => ({ file, index, base: getBaseName(getFileName(file.name)) }))
    .filter((item) => /^\d+$/.test(item.base))
    .sort((first, second) => Number(first.base) - Number(second.base) || first.index - second.index);

  candidates.forEach((item, index) => {
    plan.set(item.file, {
      name: `${String(index + 1).padStart(2, '0')}.${getExtension(item.file.name)}`,
      rule: RESET_NUMBERING_RULE_ID,
    });
  });

  return plan;
}

/** Prepara el desplazamiento de toda secuencia cuando existe un archivo 0. */
function buildZeroShiftPlan(files, enabledRules) {
  const plan = new Map();
  if (!isRuleEnabled(enabledRules, ZERO_SHIFT_RULE_ID)) return plan;

  const numericFiles = files
    .map((file) => {
      let base = getBaseName(getFileName(file.name));
      for (const [index, rule] of renameRules.entries()) {
        if (!isRuleEnabled(enabledRules, index + 1)) continue;
        const result = rule(base);
        if (result) {
          base = result.name;
          break;
        }
      }
      return { file, base };
    })
    .filter((item) => /^\d+$/.test(item.base));
  const hasZeroFile = numericFiles.some(
    (item) => item.base === '0',
  );
  if (!hasZeroFile) return plan;

  numericFiles.forEach(({ file, base }) => {
    plan.set(file, {
      name: `${String(Number(base) + 1).padStart(2, '0')}.${getExtension(file.name)}`,
      rule: ZERO_SHIFT_RULE_ID,
    });
  });

  return plan;
}

/** Corrige nombres numéricos de cuatro dígitos que comienzan con cero. */
function buildFourDigitZeroPlan(files, enabledRules) {
  const plan = new Map();
  if (!isRuleEnabled(enabledRules, FOUR_DIGIT_ZERO_RULE_ID)) return plan;

  files.forEach((file) => {
    const base = getBaseName(getFileName(file.name));
    if (/^0\d{3}$/.test(base)) {
      plan.set(file, {
        name: `${String(Number(base)).padStart(2, '0')}.${getExtension(file.name)}`,
        rule: FOUR_DIGIT_ZERO_RULE_ID,
      });
    }
  });

  return plan;
}

/** Detecta si un destino de la Regla 4 chocaría con otra imagen. */
function resetNumberingHasConflict(files, resetNumberingPlan, fourDigitZeroPlan, zeroShiftPlan, threeDigitPlan, enabledRules) {
  const resetTargets = new Set();
  const resetSources = new Set([...resetNumberingPlan.keys()].map((file) =>
    getFileName(file.name).toLowerCase(),
  ));

  for (const file of resetNumberingPlan.keys()) {
    const target = resetNumberingPlan.get(file).name.toLowerCase();
    if (resetTargets.has(target)) return true;
    resetTargets.add(target);
  }

  for (const file of files) {
    if (resetSources.has(getFileName(file.name).toLowerCase())) continue;
    const otherTarget = proposedName(file, fourDigitZeroPlan, zeroShiftPlan, threeDigitPlan, new Map(), enabledRules)
      .name.toLowerCase();
    if (resetTargets.has(otherTarget)) return true;
  }

  return false;
}

/** Punto de extensión para añadir reglas futuras sin cambiar el analizador. */
export const renameRules = [applyParenthesisRule, applyPrefixRule];

/** Normaliza únicamente los resultados numéricos a un mínimo de dos dígitos. */
function formatNumericResult(name) {
  return /^\d+$/.test(name) ? name.padStart(2, '0') : name;
}

/**
 * Crea el respaldo de renombrado usando exactamente el orden recibido.
 * `analyzeFiles` no ordena los archivos: conserva el orden del FileList.
 */
function buildFallbackPlan(files) {
  const plan = new Map();

  files.forEach((file, index) => {
    plan.set(file, {
      name: `${String(index + 1).padStart(2, '0')}.${getExtension(file.name)}`,
      rule: null,
      fallback: true,
    });
  });

  return plan;
}

/** Determina si alguna regla habilitada ya reconoce un patrón válido. */
function hasApplicableRule(files, enabledRules, threeDigitPlan, fourDigitZeroPlan, zeroShiftPlan) {
  const directRuleMatch = files.some((file) => {
    const base = getBaseName(getFileName(file.name));
    return renameRules.some((rule, index) =>
      isRuleEnabled(enabledRules, index + 1) && Boolean(rule(base)),
    );
  });

  const resetRuleMatch = isRuleEnabled(enabledRules, RESET_NUMBERING_RULE_ID)
    && files.some((file) => /^\d+$/.test(getBaseName(getFileName(file.name))));

  return directRuleMatch
    || resetRuleMatch
    || threeDigitPlan.size > 0
    || fourDigitZeroPlan.size > 0
    || zeroShiftPlan.size > 0;
}

/** Calcula el nombre propuesto por las reglas activas. */
function proposedName(file, fourDigitZeroPlan, zeroShiftPlan, threeDigitPlan, resetNumberingPlan, enabledRules, fallbackPlan = new Map()) {
  const fourDigitZeroResult = fourDigitZeroPlan.get(file);
  if (fourDigitZeroResult) return fourDigitZeroResult;

  const zeroShiftResult = zeroShiftPlan.get(file);
  if (zeroShiftResult) return zeroShiftResult;

  const resetNumberingResult = resetNumberingPlan.get(file);
  if (resetNumberingResult) return resetNumberingResult;

  const threeDigitResult = threeDigitPlan.get(file);
  if (threeDigitResult) return threeDigitResult;

  const base = getBaseName(getFileName(file.name));
  const extension = getExtension(file.name);

  for (const [index, rule] of renameRules.entries()) {
    if (!isRuleEnabled(enabledRules, index + 1)) continue;
    const result = rule(base);
    if (result) {
      return {
        name: `${formatNumericResult(result.name)}.${extension}`,
        rule: result.rule,
      };
    }
  }

  const fallbackResult = fallbackPlan.get(file);
  if (fallbackResult) return fallbackResult;

  return { name: getFileName(file.name), rule: null };
}

/** Analiza imágenes y resuelve colisiones sin sobrescribir archivos. */
export async function analyzeFiles(fileList, onProgress = () => {}, options = {}) {
  const files = [...fileList].filter((file) =>
    IMAGE_EXTENSIONS.has(getExtension(file.name)),
  );
  const results = [];
  const used = new Set();
  const started = performance.now();
  const enabledRules = options.enabledRules || new Set([1, 2, THREE_DIGIT_RULE_ID, RESET_NUMBERING_RULE_ID, ZERO_SHIFT_RULE_ID, FOUR_DIGIT_ZERO_RULE_ID]);
  const threeDigitPlan = buildThreeDigitPlan(files, enabledRules);
  const fourDigitZeroPlan = buildFourDigitZeroPlan(files, enabledRules);
  const zeroShiftPlan = buildZeroShiftPlan(files, enabledRules);
  const fallbackPlan = options.enableFallback === false || hasApplicableRule(
    files,
    enabledRules,
    threeDigitPlan,
    fourDigitZeroPlan,
    zeroShiftPlan,
  )
    ? new Map()
    : buildFallbackPlan(files);
  const paddedZeroSequenceActive = [...threeDigitPlan.keys()].some((file) => {
    const base = getBaseName(getFileName(file.name));
    return base === '000' || /^\d{2}$/.test(base);
  });
  let resetNumberingPlan = zeroShiftPlan.size || paddedZeroSequenceActive
    ? new Map()
    : buildResetNumberingPlan(files, enabledRules);
  let resetNumberingAutoDisabled = false;

  if (resetNumberingPlan.size && resetNumberingHasConflict(
    files,
    resetNumberingPlan,
    fourDigitZeroPlan,
    zeroShiftPlan,
    threeDigitPlan,
    enabledRules,
  )) {
    resetNumberingPlan = new Map();
    resetNumberingAutoDisabled = true;
  }

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const proposed = proposedName(file, fourDigitZeroPlan, zeroShiftPlan, threeDigitPlan, resetNumberingPlan, enabledRules, fallbackPlan);
    const original = getFileName(file.name);
    const extension = getExtension(proposed.name);
    const base = getBaseName(proposed.name);
    let finalName = proposed.name;
    let conflict = false;
    let suffix = 1;

    while (used.has(finalName.toLowerCase())) {
      finalName = `${base} (${suffix}).${extension}`;
      suffix += 1;
      conflict = true;
    }

    used.add(finalName.toLowerCase());
    results.push({
      file,
      original,
      newName: finalName,
      rule: proposed.rule,
      fallback: Boolean(proposed.fallback),
      conflict,
      status: conflict ? 'conflict' : finalName === original ? 'unchanged' : 'renamed',
    });

    onProgress(((index + 1) / files.length) * 100);
    if (index % 30 === 0) await sleep();
  }

  return {
    results,
    duration: performance.now() - started,
    threeDigitDetected: threeDigitPlan.size > 0,
    threeDigitHasZero: [...threeDigitPlan.keys()].some(
      (file) => getBaseName(getFileName(file.name)) === '000',
    ),
    resetNumberingDetected: resetNumberingPlan.size > 0,
    resetNumberingAutoDisabled,
    zeroShiftDetected: zeroShiftPlan.size > 0,
    fourDigitZeroDetected: fourDigitZeroPlan.size > 0,
    fallbackDetected: fallbackPlan.size > 0,
  };
}
