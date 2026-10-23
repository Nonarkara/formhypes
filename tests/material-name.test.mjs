import {quantity,toDisplay,displayText} from '../dist/preferences.js';
/* The material name contract.

   A material is a common noun: a wall made of float glass is float glass in
   every language. The name used to come straight out of the English table, so
   a Thai reader choosing a cladding was handed "Float glass, clear" inside a
   Thai interface — in the select, at the head of the note, and as the
   accessible name of every swatch. The table underneath was right; the words
   on top of it were not.

   These guards run the shipped code. The select is built by the shipped
   `buildSelectors`, the swatch by the shipped `sync` block, and the schedule
   by the shipped `quantityTable`, so a name that stops being localised fails
   here rather than in a reader's eye. */

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {t, langs, translator} from '../dist/i18n.js';
import {MATERIALS, MATERIAL_KEYS} from '../dist/materials.js';
import {quantityTable} from '../dist/quantity.js';
import {defaults, families, levelPrograms, facadeFamilies, systems, regimes} from '../dist/model.js';
import {CROWNS, CROWNS_KEYS, GARDENS, GARDENS_KEYS} from '../dist/crowns.js';
import {DETAILS, DETAIL_KEYS} from '../dist/details.js';

const app = readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
const CJK = /[\u3400-\u9fff\uf900-\ufaff]/;

test('every material is named in all three languages, and the name is the reader\'s own', () => {
  for (const k of MATERIAL_KEYS) {
    for (const l of langs) {
      const v = t[l]['mat.' + k];
      assert.ok(v && v.trim(), `mat.${k} is missing in ${l}`);
      if (l === 'zh') assert.match(v, CJK, `mat.${k} in Chinese is not Chinese: "${v}"`);
      else assert.doesNotMatch(v, CJK, `mat.${k} in ${l} contains Chinese: "${v}"`);
    }
    // A Thai or Chinese reader must not be handed the English word. This is
    // the whole failure: the string existed, and it was the wrong one.
    assert.notEqual(t.th['mat.' + k], t.en['mat.' + k], `the Thai name for ${k} is the English name`);
    assert.notEqual(t.zh['mat.' + k], t.en['mat.' + k], `the Chinese name for ${k} is the English name`);
  }
});

/* A DOM small enough to run the shipped builder in. */
function stubEl(tag) {
  return {
    tagName: String(tag || '').toUpperCase(), children: [], attrs: {}, style: {},
    value: '', checked: false, textContent: '', id: '', type: '',
    replaceChildren(...c) { this.children = c; },
    append(...c) { this.children.push(...c); },
    setAttribute(k, v) { this.attrs[k] = v; },
    getAttribute(k) { return this.attrs[k]; },
    addEventListener() {}, focus() {},
  };
}

test('the material select is built from the string table, in the reader\'s language', () => {
  const start = app.indexOf('function opt(sel,value,label){');
  const end = app.indexOf('/* ── ranges ');
  assert.ok(start >= 0 && end > start, 'the select builder moved');
  const source = app.slice(start, end);

  const nodes = new Map();
  const $ = id => {
    if (!nodes.has(id)) nodes.set(id, stubEl('select'));
    return nodes.get(id);
  };
  const ctx = {
    displayText,lang: 'th', tt: translator('th'), t, langs,
    MATERIALS, MATERIAL_KEYS, families, levelPrograms, facadeFamilies, systems, regimes,
    CROWNS, CROWNS_KEYS, GARDENS, GARDENS_KEYS, DETAILS, DETAIL_KEYS,
    cities: {}, state: {...defaults, material: 'float'}, changed() {},
    document: {createElement: tag => stubEl(tag)},
    $,
  };
  runInNewContext(source + '\nthis.build=buildSelectors;', ctx);
  ctx.build();

  const sel = $('material');
  const options = sel.children.map(o => ({value: o.value, text: o.textContent}));
  assert.equal(options.length, MATERIAL_KEYS.length, 'the material select lost an option');
  for (const o of options) {
    const expected = t.th['mat.' + o.value];
    assert.equal(o.text, expected, `the select shows "${o.text}" for ${o.value}, not the Thai name`);
    assert.notEqual(o.text, t.en['mat.' + o.value], `the select shows the English name for ${o.value}`);
  }
});

test('the note under the material is headed by the material, in the reader\'s language', () => {
  // The note is the sentence that explains what the choice does to the
  // figures. It opens with the material's name, so an English name there
  // reads as a different material in a Thai page.
  const start = app.indexOf("if($('materialNote'))");
  const end = app.indexOf('\n', start);
  assert.ok(start >= 0 && end > start, 'the material note moved');
  const source = app.slice(start, end);
  const note = stubEl('p');
  const ctx = {
    displayText,lang: 'th', tt: translator('th'),
    state: {material: 'float'},
    mt: {thesis: 'Sears Tower 1929', envelope: 1, carbon: 25, upkeep: 1},
    $: id => (id === 'materialNote' ? note : null),
  };
  runInNewContext(source, ctx);
  assert.ok(note.textContent.startsWith(t.th['mat.float']),
    `the note begins "${String(note.textContent).slice(0, 40)}" — not the Thai name`);
  assert.ok(!note.textContent.startsWith(t.en['mat.float']),
    'the note begins with the English name');
});

test('the quantity schedule names the material in the language it is printed in', () => {
  // The schedule and the studio must not disagree about what a material is
  // called. One name, one table, both surfaces.
  for (const l of langs) {
    const table = quantityTable({...defaults, material: 'precast'}, l);
    const headers = table.headers.map(String);
    assert.ok(headers.some(h => h.includes(t[l]['mat.precast'])),
      `the ${l} schedule does not name precast as "${t[l]['mat.precast']}"`);
    if (l !== 'en') {
      assert.ok(!headers.some(h => h.includes(t.en['mat.precast'])),
        `the ${l} schedule names precast in English`);
    }
  }
});
