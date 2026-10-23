// The reader's own plot: the land decides the size, and the instrument's range
// is stated beside the answer.
//
// THE DEFECT THIS FILE EXISTS FOR. The desk used to cap the fit search with
// SCHEMA.span[1] and to read the range with SCHEMA.span[0]. SCHEMA.span is
// [key, min, max, step, unit], so index 1 is the SMALLEST plate this
// instrument draws and index 0 is the key, not a number. A 52,000 m² outline
// was told it carried a 32 m tower — the instrument's minimum — and the note
// under it printed "—–32 m". Nothing was wrong with the geometry: the search
// was simply told to stop at the wrong end of the range.
//
// A test that checks the code calls the right function cannot see that. These
// read the PANEL and the numbers on it, which is the only place the reader
// meets this.
import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults, profile, area} from '../dist/model.js';
import {renderSite} from '../dist/context.js';
import {t} from '../dist/i18n.js';
import {SCHEMA} from '../dist/schema.js';
import * as S from '../dist/site.js';
import {withDom, walk, byClass, byText, rows} from './desk-dom.mjs';

/** Drive the desk inside ONE DOM session: render, choose a way of stating the
    plot, type a rectangle, and hand back the panel it printed. The desk
    rebuilds itself on every change, and it rebuilds into the same host, so
    the session has to be one — a second document would leave the desk looking
    for its controls in a panel it had already thrown away. */
function desk({mode, w, d, state = {}, lang = 'en'} = {}) {
  const dom = withDom();
  const changed = [];
  const st = {...defaults, city: 'bangkok', ...state};
  const render = () => renderSite({lang, state: st, changed: p => changed.push(p)});
  try {
    render();
    if (mode) {
      const btn = byText(dom.hosts.siteDesk, mode);
      assert.ok(btn, `the desk offers no "${mode}" control`);
      assert.equal(typeof btn.onclick, 'function', `the "${mode}" control does nothing`);
      btn.onclick();
    }
    if (w != null) {
      const win = walk(dom.hosts.siteDesk).find(n => n.id === 'siteRectW');
      assert.ok(win, 'the rectangle width input is not on the panel');
      win.value = String(w);
      win.onchange();
    }
    if (d != null) {
      const din = walk(dom.hosts.siteDesk).find(n => n.id === 'siteRectD');
      assert.ok(din, 'the rectangle depth input is not on the panel');
      din.value = String(d);
      din.onchange();
    }
  } finally {
    dom.restore();
  }
  return {host: dom.hosts.siteDesk, changed, warns: dom.warns, text: dom.hosts.siteDesk.textContent};
}

test('the schema range is read from the right end of the array', () => {
  /* SCHEMA.span is [key, min, max, step, unit]. Every number in this project
     that reads it has to agree on that, and the desk got it wrong twice: the
     cap came off index 1 (the minimum) and the note off index 0 (the key). */
  assert.equal(SCHEMA.span[0], 'c.span', 'the span entry no longer starts with its key');
  assert.equal(SCHEMA.span[1], 32, 'the span minimum moved');
  assert.equal(SCHEMA.span[2], 62, 'the span maximum moved');
  assert.ok(SCHEMA.span[1] < SCHEMA.span[2], 'the span range is inverted');
});

test('the projection inverts exactly, so a corner lands where it was clicked', () => {
  const scene = S.makeScene({radius: 700, towerH: 220});
  for (const [x, y] of [[0, 0], [120, -80], [-300, 250], [11.5, 0.25]]) {
    const [sx, sy] = scene.project(x, y, 0);
    const [ux, uy] = scene.unproject(sx, sy);
    assert.ok(Math.abs(ux - x) < 1e-6 && Math.abs(uy - y) < 1e-6,
      `unproject(project(${x},${y})) came back as ${ux},${uy}`);
  }
});

test('a typed rectangle is a ring with the area and perimeter it claims', () => {
  const ring = S.rectangleRing(0, 0, 60, 30);
  assert.equal(ring.length, 4);
  assert.ok(Math.abs(Math.abs(S.ringArea(ring)) - 1800) < 1e-6, 'the area is not 60 × 30');
  assert.ok(Math.abs(S.ringPerimeter(ring) - 180) < 1e-6, 'the perimeter is not 2(60+30)');
});

test('the frame of a ring is its own minimum-area rectangle', () => {
  const ring = S.rectangleRing(0, 0, 60, 30);
  const f = S.frameOf(ring);
  assert.ok(Math.abs(f.w - 60) < 1e-6 && Math.abs(f.h - 30) < 1e-6,
    `the frame came out ${f.w} × ${f.h}`);
  // A square turned on the map is still a square in its own frame.
  const turned = S.rectangleRing(0, 0, 50, 50).map(([x, y]) => [
    x * Math.cos(0.62) - y * Math.sin(0.62), x * Math.sin(0.62) + y * Math.cos(0.62)]);
  const t = S.frameOf(turned);
  assert.ok(Math.abs(t.w - 50) < 1e-6 && Math.abs(t.h - 50) < 1e-6,
    `a 50 m square came out ${t.w} × ${t.h} in its own frame`);
});

test('the land decides the size: a big plot takes a big plate and a small one does not', () => {
  const plate = [[-24, -24], [24, -24], [24, 24], [-24, 24]];
  const big = S.plateThatFits(plate, {ring: S.rectangleRing(0, 0, 400, 400)});
  const small = S.plateThatFits(plate, {ring: S.rectangleRing(0, 0, 30, 20)});
  assert.ok(big.k > 6, `a 400 m plot only took a ${(big.k * 48).toFixed(0)} m plate`);
  assert.ok(small.k < 0.6, `a 30 × 20 m plot took a ${(small.k * 48).toFixed(0)} m plate`);
  assert.ok(big.fit >= 0.999 && small.fit >= 0.999, 'the fitted plate does not stand wholly on its plot');
});

test('the floor area printed is the area of the plate the panel names', () => {
  /* The plate on the sheet and the floor area under it have to be the same
     building. When the size was clamped and the area was not, the panel named
     one tower and priced another. */
  const {host} = desk({mode: 'A rectangle', w: 200, d: 200});
  const block = byClass(host, 'st-takes');
  assert.ok(block, 'the panel has no block for what the land will carry');
  const printed = rows(block).find(r => r.startsWith('Floor area'));
  assert.ok(printed, 'the block prints no floor area');
  const shown = rows(block).find(r => r.startsWith('Plate'));
  assert.ok(shown, 'the block prints no plate');
  const metres = parseFloat((shown.match(/([\d.]+) ×/) || [])[1]);
  assert.ok(metres > 0, `the plate size is not a number: "${shown}"`);
  const expected = Math.round(area(profile({...defaults, span: metres}, 0)));
  assert.equal(printed.replace(/\D+/g, ''), String(expected),
    `the panel says ${printed} for a ${metres} m plate, whose area is ${expected} m²`);
});

test('the desk prints the widest plate the land takes, not the narrowest', () => {
  /* THE REGRESSION. A 200 × 200 m plot takes a plate far wider than the
     instrument's smallest, and the panel used to print the instrument's
     smallest — the cap was read off the wrong end of the range. */
  const {host, warns} = desk({mode: 'A rectangle', w: 200, d: 200});
  assert.deepEqual(warns, [], 'the desk threw: ' + warns.join(' | '));
  const text = rows(host);
  assert.ok(text.some(r => r.includes('62.0 × 62.0 m')),
    `the panel did not print the 62 m plate: ${JSON.stringify(text)}`);
  assert.ok(!text.some(r => r.includes('32.0 × 32.0 m')),
    `the panel printed the instrument's smallest plate for a plot that takes more: ${JSON.stringify(text)}`);
});

test('the note under the plate names the range the instrument draws', () => {
  const {text} = desk({mode: 'A rectangle', w: 200, d: 200});
  assert.ok(text.includes('32') && text.includes('62'),
    'the range note does not name 32 m and 62 m');
  assert.ok(!text.includes('—–'), 'the range note prints a dash where a number belongs');
});

test('a plot too small for the instrument offers nothing, and says why', () => {
  /* A button that offers a tower which cannot stand on the plot is a lie the
     reader can act on. The panel says the land is smaller than the smallest
     plate this instrument draws, and offers no size at all. */
  const {host} = desk({mode: 'A rectangle', w: 30, d: 20});
  assert.equal(byClass(host, 'st-use'), null, 'the desk offered a plate that does not fit');
  assert.ok(host.textContent.includes(t.en['st.takesShort'].split('{0}')[0].trim()),
    'the desk did not say the plot is too small');
});

test('the adopt action applies a size inside the range the instrument draws', () => {
  const {host, changed} = desk({mode: 'A rectangle', w: 200, d: 200});
  const btn = byClass(host, 'st-use');
  assert.ok(btn, 'there is nothing to adopt');
  btn.onclick();
  assert.equal(changed.length, 1, 'the adopt action did not apply anything');
  const patch = changed[0];
  assert.ok(patch.span >= SCHEMA.span[1] && patch.span <= SCHEMA.span[2],
    `the adopted span ${patch.span} is outside ${SCHEMA.span[1]}–${SCHEMA.span[2]}`);
  assert.ok(Number.isFinite(patch.orientation), 'the adopted bearing is not a number');
});

test('the strings for this desk exist in three languages and take the same placeholders', () => {
  const keys = Object.keys(t.en).filter(k => k.startsWith('st.'));
  assert.ok(keys.length > 30, 'the desk lost its strings');
  const holes = s => (String(s).match(/\{\d+\}/g) || []).sort().join(',');
  // A name quoted from a source is allowed to stay Latin; an ordinary word is
  // not. The list is named so it cannot quietly grow.
  const PROPER = /OpenStreetMap|ODbL|ObLiB/g;
  const CJK = /[㐀-鿿豈-﫿]/;
  for (const k of keys) {
    for (const lang of ['th', 'zh']) {
      assert.ok(t[lang][k] !== undefined, `${k} is missing in ${lang}`);
      assert.equal(holes(t[lang][k]), holes(t.en[k]),
        `${k} takes different placeholders in ${lang} and en`);
      assert.ok(String(t[lang][k]).trim().length, `${k}.${lang} is empty`);
    }
    // The English and Thai carry no Chinese, and the Chinese carries no
    // Latin word — the rule every table in this project is held to. A value
    // that is only a unit ('m²', 'ตร.ม.') is exempt: it has no words in it
    // to translate.
    assert.ok(!CJK.test(t.en[k]), `${k} carries CJK in en`);
    assert.ok(!CJK.test(t.th[k]), `${k} carries CJK in th`);
    const zh = t.zh[k].replace(PROPER, '');
    const unitOnly = !/[A-Za-z]{3,}/.test(zh);
    if (!unitOnly) assert.ok(CJK.test(zh), `${k} in zh falls back to Latin: "${zh}"`);
    assert.ok(!/[A-Za-z]{4,}/.test(zh),
      `${k} in zh carries a Latin word: "${zh}"`);
  }
});
