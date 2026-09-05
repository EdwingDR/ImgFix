import assert from 'node:assert/strict';
import test from 'node:test';

import { analyzeFiles } from '../analyzer.js';

const image = (name) => ({ name });
const rules = (...ids) => new Set(ids);

async function names(files, enabledRules, options = {}) {
  const outcome = await analyzeFiles(files.map(image), () => {}, {
    enabledRules,
    ...options,
  });
  return outcome;
}

test('Regla 1 conserva la numeración y elimina la secuencia entre paréntesis', async () => {
  const outcome = await names(['2 (24).jpg'], rules(1));
  assert.equal(outcome.results[0].newName, '02.jpg');
  assert.equal(outcome.results[0].rule, 1);
  assert.equal(outcome.fallbackDetected, false);
});

test('Regla 2 elimina prefijos de cuatro o cinco dígitos', async () => {
  const outcome = await names(['1590_1.png'], rules(2));
  assert.equal(outcome.results[0].newName, '01.png');
  assert.equal(outcome.results[0].rule, 2);
});

test('Regla 3 corrige numeración de tres dígitos', async () => {
  const outcome = await names(['001.jpg'], rules(3));
  assert.equal(outcome.results[0].newName, '01.jpg');
  assert.equal(outcome.results[0].rule, 3);
});

test('Regla 4 ordena la secuencia numérica y la reinicia desde 01', async () => {
  const outcome = await names(['50.jpg', '48.jpg', '49.jpg'], rules(4));
  assert.deepEqual(outcome.results.map((item) => item.newName), ['03.jpg', '01.jpg', '02.jpg']);
  assert.equal(outcome.results.every((item) => item.rule === 4), true);
});

test('Regla 5 desplaza la secuencia que comienza en 0', async () => {
  const outcome = await names(['0.jpg', '1.jpg', '2.jpg'], rules(5));
  assert.deepEqual(outcome.results.map((item) => item.newName), ['01.jpg', '02.jpg', '03.jpg']);
  assert.equal(outcome.results.every((item) => item.rule === 5), true);
});

test('Regla 6 corrige numeración de cuatro dígitos con cero inicial', async () => {
  const outcome = await names(['0001.webp'], rules(6));
  assert.equal(outcome.results[0].newName, '01.webp');
  assert.equal(outcome.results[0].rule, 6);
});

test('el fallback usa el orden de entrada y conserva las extensiones', async () => {
  const outcome = await names([
    'IMG_4587.jpg',
    'foto_perro.jpg',
    'captura.png',
    'WhatsApp Image.jpg',
    'imagen.webp',
  ], rules(1, 2, 3, 4, 5, 6));

  assert.deepEqual(outcome.results.map((item) => item.newName), [
    '01.jpg', '02.jpg', '03.png', '04.jpg', '05.webp',
  ]);
  assert.equal(outcome.fallbackDetected, true);
  assert.equal(outcome.results.every((item) => item.fallback), true);
});

test('el fallback mantiene una numeración de dos dígitos por encima de nueve imágenes', async () => {
  const files = Array.from({ length: 12 }, (_, index) => `imagen-${index}.jpeg`);
  const outcome = await names(files, rules());
  assert.deepEqual(outcome.results.map((item) => item.newName), [
    '01.jpeg', '02.jpeg', '03.jpeg', '04.jpeg', '05.jpeg', '06.jpeg',
    '07.jpeg', '08.jpeg', '09.jpeg', '10.jpeg', '11.jpeg', '12.jpeg',
  ]);
});

test('las colisiones existentes siguen resolviéndose sin sobrescribir nombres', async () => {
  const outcome = await names(['2 (24).jpg', '2 (25).jpg'], rules(1));
  assert.deepEqual(outcome.results.map((item) => item.newName), ['02.jpg', '02 (1).jpg']);
  assert.equal(outcome.results[1].conflict, true);
});

test('un patrón de regla habilitada impide activar el fallback para el resto de archivos', async () => {
  const outcome = await names(['2 (24).jpg', 'foto.jpg'], rules(1, 2, 3, 4, 5, 6));
  assert.equal(outcome.fallbackDetected, false);
  assert.equal(outcome.results[0].rule, 1);
  assert.equal(outcome.results[1].newName, 'foto.jpg');
});

test('si se desactiva una regla, el fallback se usa cuando no hay otra regla aplicable', async () => {
  const outcome = await names(['2 (24).jpg', 'foto.jpg'], rules());
  assert.deepEqual(outcome.results.map((item) => item.newName), ['01.jpg', '02.jpg']);
  assert.equal(outcome.results.every((item) => item.fallback), true);
});

test('la conversión puede desactivar el fallback para conservar nombres', async () => {
  const outcome = await names(['foto.jpg'], rules(), { enableFallback: false });
  assert.equal(outcome.results[0].newName, 'foto.jpg');
  assert.equal(outcome.fallbackDetected, false);
});
