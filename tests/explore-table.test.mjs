import {quantity,toDisplay,displayText,formatAmount,getPreferences} from '../dist/preferences.js';
/* The candidate table on the explore desk.

   The desk's job is: compare five candidates and apply one. The table used to
   put the action in the last column, which is the column that falls off the
   edge of a phone — at 390 the Apply button sat 125px outside the viewport,
   and the Δ column was cut mid-number, showing "+U". A reader on a phone
   could read the money and could not press anything.

   So the table now reads the way the decision is made: the candidate and the
   two money columns first, the drivers that produced them after, and the
   action pinned to the right edge of the scroller where it cannot be lost.

   The guards read the shipped builder and the shipped stylesheet, and they
   hold the values, not the names. */

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const app = readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../dist/console.css', import.meta.url), 'utf8');

/* Run the shipped table builder and read the HTML it produces. */
function buildTable(lang = 'en') {
  const start = app.indexOf('const COLS=[');
  const end = app.indexOf('html+=`</tbody></table>');
  assert.ok(start >= 0 && end > start, 'the candidate table builder moved');
  const source = app.slice(start, end);
  const rows = [
    {state: {family: 'box', taper: 1, twist: 0}, metrics: {contribution: 100, gross: 10, rentable: 8, corners: 4, heightTotal: 40}, score: 0.5},
    {state: {family: 'star', taper: 0.8, twist: 45}, metrics: {contribution: 90, gross: 10, rentable: 8, corners: 6, heightTotal: 40}, score: 0.4},
  ];
  const ctx = {
    formatAmount,getPreferences,quantity,toDisplay,lang,rows, best: rows[0], blended: true, state: {family: 'box'},
    metrics: {contribution: 80},
    tt: k => k, num: v => String(v), money: v => '$' + v,
  };
  runInNewContext(source + '\nthis.html=html;', ctx);
  return ctx.html;
}

test('the candidate table reads in decision order: the name, the money, then the drivers', () => {
  const html = buildTable();
  const heads = [...html.matchAll(/<th scope="col" class="c-([a-z]+)"/g)].map(m => m[1]);
  const order = heads.filter(h => h !== 'gross' && h !== 'rentable');
  assert.deepEqual(order, ['cand', 'contribution', 'delta', 'roof', 'corners', 'height', 'score', 'apply'],
    'the columns are not in the order the decision is made in');
  // The two columns that are the same in every row are still there, named.
  // They are hidden in the desk, not deleted from the instrument.
  assert.ok(heads.includes('gross') && heads.includes('rentable'),
    'the gross and rentable columns were removed from the table instead of hidden by name');
});

test('every column carries its own name, so hiding one can never hide another', () => {
  const html = buildTable();
  // The heading and the cell of a column must carry the SAME name. A heading
  // that lost its name would leave the rule that hides a column pointing at
  // a column that is no longer there — and the rule would then hide the
  // next one along.
  const heads = [...html.matchAll(/<th scope="col" class="([^"]*)"/g)].map(m => m[1]);
  assert.ok(heads.length >= 8, 'the table lost its headings');
  for (const h of heads) assert.match(h, /^c-[a-z]+$/, `a heading carries no column name: "${h}"`);
  const cells = [...html.matchAll(/<td class="([^"]*)"/g)].map(m => m[1]);
  assert.ok(cells.length >= 18, 'the rows did not carry the expected cells');
  for (const c of cells) assert.match(c, /^c-[a-z]+( numeric)?$/, `a cell carries no column name: "${c}"`);
  const headNames = heads.map(h => h.replace('c-', ''));
  const cellNames = cells.map(c => c.replace('c-', '').replace(' numeric', ''));
  assert.deepEqual(cellNames.slice(0, headNames.length), headNames,
    'a column has a heading under one name and cells under another');
  // The action is in the last cell of every row, and it still carries the
  // candidate it applies.
  const buttons = [...html.matchAll(/<button data-candidate="(\d+)"[^>]*>([^<]*)<\/button>/g)];
  assert.equal(buttons.length, 2, 'the rows lost their apply button');
  assert.ok(buttons.every(b => b[2].trim().length > 0), 'a row has an unlabelled apply button');
});

test('the two identical columns are hidden by name, not by their position', () => {
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const hide = [...rules.matchAll(/[^{}]*\{[^}]*display:none[^}]*\}/g)].map(m => m[0]);
  const named = hide.filter(r => /c-gross|c-rentable/.test(r));
  assert.ok(named.length, 'the identical columns are not hidden by name');
  // A rule that hides by position is a rule that moves with the columns. It
  // is how a column that still holds a value goes missing without a trace.
  const positional = hide.filter(r => /nth-child/.test(r));
  assert.deepEqual(positional, [],
    `a column is still hidden by its position in the row:\n${positional.join('\n')}`);
});

test('the action is pinned to the right edge of the scroller, with a rule and no decoration', () => {
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const sticky = [...rules.matchAll(/([^{}]*)\{([^}]*position:sticky[^}]*)\}/g)]
    .filter(m => /last-child/.test(m[1]));
  assert.equal(sticky.length, 1, 'the action column is not pinned');
  const body = sticky[0][2];
  assert.match(body, /right:\s*0/, 'the pinned column is not pinned to the right edge');
  assert.match(body, /background:\s*var\(--paper\)/, 'the pinned column has no ground of its own, so the scrolled row shows through it');
  assert.match(body, /border-left:\s*1px solid/, 'the pinned column has no hairline to say where it ends');
  // The house does not float things: no shadow, no blur, no gradient.
  for (const banned of [/box-shadow/, /filter\s*:\s*blur/, /backdrop-filter/, /gradient/]) {
    assert.doesNotMatch(body, banned, `the pinned column is decorated with ${banned}`);
  }
});
