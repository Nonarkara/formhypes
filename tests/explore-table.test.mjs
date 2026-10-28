import {quantity,toDisplay,displayText,formatAmount,getPreferences} from '../dist/preferences.js';
/* The candidate table on the explore desk.

   The desk's job is: compare five candidates and apply one. The table used to
   put the action in the last column, which is the column that falls off the
   edge of a phone — at 390 the Apply button sat 125px outside the viewport,
   and the Δ column was cut mid-number, showing "+U". A reader on a phone
   could read the money and could not press anything.

   So the table reads the way the decision is made: the candidate and the
   two money columns first, the drivers that produced them after, and the
   action at the end of the row.

   The action is NOT pinned to the right edge, and that took a measurement to
   learn. A pin slides left by exactly the table's overflow, so it stands on
   the column beside it: on the phone in Chinese the pinned button sat on the
   height and on the corners, the last two drivers, and a reader could press a
   candidate whose numbers they had never seen. Freezing the candidate at the
   other end as well only moved the hiding — at the far end of the scroll the
   money column went under the name. Two frozen ends hide a column at each
   end.

   One frozen end hides nothing where the reader starts. The candidate's name
   is frozen at the left, the action is the end of the row, and every column
   reaches its natural place where all of it can be read.

   The guards read the shipped builder and the shipped stylesheet, and they
   hold the values, not the names. */

import {test} from 'node:test';
import {candidateFitFailures} from '../scripts/control-fit.mjs';
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

test('the candidate name is frozen at the left, with a rule and no decoration', () => {
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const sticky = [...rules.matchAll(/([^{}]*)\{([^}]*position:sticky[^}]*)\}/g)]
    .filter(m => /\.c-cand/.test(m[1]));
  assert.equal(sticky.length, 1, 'the candidate column is not frozen at the left');
  const body = sticky[0][2];
  assert.match(body, /left:\s*0/, 'the frozen column is not frozen to the left edge');
  assert.match(body, /background:\s*var\(--paper\)/, 'the frozen column has no ground of its own, so the scrolled row shows through it');
  assert.match(body, /border-right:\s*1px solid/, 'the frozen column has no hairline to say where it ends');
  // The house does not float things: no shadow, no blur, no gradient.
  for (const banned of [/box-shadow/, /filter\s*:\s*blur/, /backdrop-filter/, /gradient/]) {
    assert.doesNotMatch(body, banned, `the frozen column is decorated with ${banned}`);
  }
});

test('the action is the end of the row and is not pinned over the drivers', () => {
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');
  // A pin slides left by exactly the table's overflow and stands on the
  // column beside it. The action is the last column, so the column it stood
  // on was the last driver — the height, and on a phone the corners too.
  const pinned = [...rules.matchAll(/([^{}]*)\{([^}]*position:sticky[^}]*)\}/g)]
    .filter(m => /\.c-apply/.test(m[1]));
  assert.deepEqual(pinned, [],
    `the action column is pinned over the data:\n${pinned.map(m => m[0]).join('\n')}`);
  // It is still named, still marked, and still a column of its own.
  const named = [...rules.matchAll(/([^{}]*\.c-apply[^{}]*)\{([^}]*)\}/g)];
  assert.ok(named.length, 'the action column carries no rule of its own');
  assert.ok(named.some(m => /border-left:\s*1px solid/.test(m[2])),
    'the action column has no hairline to say where the decision begins');
});

test('the candidate label is never broken across lines', () => {
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');
  // Chinese may break between any two ideographs, so a candidate cell that
  // may wrap has a minimum width of one character: the table handed the
  // column twenty-eight pixels and wrote "十字" down the page, one character
  // to a line, and broke "Eight-point" at its hyphen.
  const nowrap = [...rules.matchAll(/([^{}]*)\{([^}]*white-space:nowrap[^}]*)\}/g)]
    .filter(m => /\.c-cand/.test(m[1]));
  assert.equal(nowrap.length, 1, 'the candidate label may be broken across lines');
});


test('phone decision rows retain translated labels for every numeric driver', () => {
  for (const lang of ['en','th','zh']) {
    const html=buildTable(lang);
    for (const key of ['contribution','delta','roof','corners','height','score']) {
      const cell=html.match(new RegExp('<td class="c-'+key+' numeric"[^>]*>([\\s\\S]*?)</td>'))?.[1];
      assert.ok(cell?.includes('class="candidate-label" aria-hidden="true"'), key+' lost its visible phone label');
      assert.ok(cell.includes('s.col.'+key),key+' lost its translated column label');
    }
  }
});

test('phone candidate rows place identity and action above money and drivers', () => {
  const rules=css.replace(/\/\*[\s\S]*?\*\//g,'');
  const start=rules.indexOf('@container candidate-desk (max-width:600px){\n #searchResults');
  assert.ok(start>=0,'phone candidate composition missing');
  const phone=rules.slice(start);
  for(const [key,row] of [['cand',1],['apply',1],['contribution',2],['delta',2],['roof',3],['corners',3],['height',3],['score',3]]) {
    const body=phone.match(new RegExp('#searchResults tbody td\\.c-'+key+'\\{([^}]+)'))?.[1];
    assert.ok(body?.includes('grid-row:'+row),key+' separated from its decision row');
  }
  assert.match(phone,/#searchResults tbody tr\{[^}]*display:grid/);
  assert.match(phone,/#searchResults \.candidate-label\{display:block/);
  assert.match(phone,/#searchResults tbody td\.c-apply button\{min-height:32px/);
});


test('candidate receipt gate rejects separated actions, clipped values and missing labels',()=>{
 const states=[];
 for(const lang of ['en','th','zh'])for(const width of [390,1024,1440]){
  const cells=['cand','contribution','delta','roof','corners','height','apply'].map((key,i)=>({key,text:'value',label:'label',clipped:false,rect:{left:10+i*45,right:50+i*45,top:100,bottom:120,width:40}}));
  states.push({lang,width,coarse:false,blended:false,height:844,clientWidth:width-36,scrollWidth:width-36,overflow:false,rows:Array.from({length:5},()=>({rect:{height:40,bottom:160},button:{left:320,right:360,width:40,height:32},cells}))});
 }
 assert.deepEqual(candidateFitFailures(states),[]);
 for(const breakIt of [s=>{s.blended=true},s=>{s.scrollWidth+=100},s=>{s.rows[0].button.right=550},s=>{s.rows[0].cells[1].clipped=true},s=>{s.rows[0].cells[1].label=''},s=>{s.rows[0].cells.pop()},s=>{s.rows[0].rect.bottom=900},s=>{s.rows[0].cells[1].rect={...s.rows[0].cells[0].rect}}]){
  const broken=structuredClone(states);breakIt(broken[0]);assert.ok(candidateFitFailures(broken).length,'invalid measured decision passed');
 }
 assert.ok(candidateFitFailures(states.slice(1)).length,'missing phone state passed');
});
