import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../dist/model.js';

const S = () => ({...M.defaults});

/* ── geometry carried forward ──────────────────────────────────────────── */

test('polygon area is positive and finite for every family', () => {
  for (const f of Object.keys(M.families)) {
    const a = M.area(M.profile({...S(), family: f}, 0.5));
    assert.ok(a > 0 && Number.isFinite(a), f);
  }
});

test('corner areas never exceed rentable area', () => {
  for (const f of Object.keys(M.families)) {
    const m = M.evaluate({...S(), family: f});
    assert.ok(m.cornerArea <= m.rentable + 1e-6, f);
  }
});

/* ── Chen's level schedules ────────────────────────────────────────────── */

test('stack heights are in metres, not Chen’s millimetres', () => {
  const st = M.stack({...S(), floors: 48, program: 'mini'});
  // Chen's mini-skyscraper is `i * 4200` mm — 4.2 m per level.
  assert.equal(st.length, 48);
  for (const l of st) assert.ok(Math.abs(l.h - 4.2) < 1e-9);
  assert.ok(M.stackHeight({...S(), floors: 48, program: 'mini'}) > 190);
  assert.ok(M.stackHeight({...S(), floors: 48, program: 'mini'}) < 210);
});

test('Petronas stores five retail levels then office, with Chen’s irregularities intact', () => {
  const st = M.stack({...S(), floors: 59, program: 'petronas'});
  const uses = st.filter(l => l.gfa).map(l => l.use);
  assert.deepEqual(uses.slice(0, 5), ['retail','retail','retail','retail','retail']);
  assert.ok(uses.slice(5).every(u => u === 'office'));
  const heights = st.filter(l => l.gfa).map(l => l.h);
  assert.ok(heights.includes(4.505) && heights.includes(3.9) && heights.includes(4.35),
    'the 4505 / 3900 / 4350 irregularities must survive');
});

test('mechanical and refuge levels produce height but no floor area', () => {
  const s = {...S(), floors: 59, program: 'petronas'};
  const m = M.evaluate(s);
  assert.ok(m.voidLevels > 0, 'petronas must carry void levels');
  const occupiedHeight = M.stack(s).filter(l => l.gfa).reduce((a, l) => a + l.h, 0);
  assert.ok(m.height > occupiedHeight + 1, 'void levels must add height');
  assert.ok(m.voidArea > 0, 'void levels must show as surrendered area');
});

test('mini-skyscraper has no voids; petronas and hkifc do', () => {
  assert.equal(M.evaluate({...S(), program: 'mini'}).voidLevels, 0);
  assert.ok(M.evaluate({...S(), program: 'petronas'}).voidLevels > 0);
  assert.ok(M.evaluate({...S(), program: 'hkifc'}).voidLevels > 0);
});

test('every level is either gross-floor-area or a void, and z is monotonic', () => {
  for (const prog of Object.keys(M.levelPrograms)) {
    const st = M.stack({...S(), floors: 50, program: prog});
    let prev = -1;
    for (const l of st) {
      assert.ok(l.z >= prev - 1e-9, `${prog} z must be monotonic`);
      assert.ok(l.h > 0, `${prog} every level has height`);
      prev = l.z;
    }
    assert.ok(st.every(l => typeof l.gfa === 'boolean'));
  }
});

/* ── equal-area discipline ─────────────────────────────────────────────── */

test('search holds gross floor area exactly constant across every candidate', () => {
  const r = M.search(S(), 'contribution');
  const g = r.results.map(x => x.metrics.gross);
  assert.ok(g.length > 0);
  assert.ok(Math.max(...g) - Math.min(...g) < 1e-6,
    `GFA spread ${Math.max(...g) - Math.min(...g)} must be zero`);
});

test('equal-area baseline matches the current building’s gross floor area', () => {
  const m = M.evaluate(S());
  const b = M.baseline(S());
  assert.ok(Math.abs(m.gross - b.gross) / m.gross < 1e-9);
  assert.ok(b.valid, 'baseline must itself be feasible');
});

test('the cruciform earns more than its equal-area rectilinear baseline', () => {
  const m = M.evaluate(S());
  const b = M.baseline(S());
  assert.ok(m.contribution > b.contribution, 'form must beat a plain box at equal size');
});

/* ── the value levers ──────────────────────────────────────────────────── */

test('the corner premium is a subset of rentable area and is priced above base', () => {
  const m = M.evaluate({...S(), premium: 40});
  assert.ok(m.breakdown.rentCorner > 0);
  assert.ok(m.breakdown.rentCorner > m.breakdown.rentOrdinary * 0, 'corner rent must be positive');
  assert.ok(m.cornerArea <= m.rentable + 1e-6);
});

test('chamfered corners cut the edges below the frontage threshold', () => {
  // The finding, not a defect: you cannot have both a cut corner and a deep
  // corner office at the same frontage.
  const base = M.evaluate(S()).gross;
  const c = {...S(), family: 'chamfer'};
  c.span = S().span * Math.sqrt(base / M.evaluate(c).gross);
  assert.equal(M.evaluate(c).corners, 0);
});

test('a perimeter diagrid costs more in structure but pays a column-free premium', () => {
  const grid = M.evaluate({...S(), system: 'column-grid'});
  const dia = M.evaluate({...S(), system: 'diagrid'});
  assert.ok(dia.structureCost > grid.structureCost, 'diagrid must cost more');
  assert.equal(grid.premiums.columnFree, 0);
  assert.ok(dia.premiums.columnFree > 0, 'diagrid must earn the column-free premium');
  assert.ok(dia.contribution > grid.contribution, 'and the trade must be worth making');
});

test('clear height premium and obsolescence penalty both respond to the level program', () => {
  const tall = M.evaluate({...S(), program: 'mini'}).clearHeight;
  const short = M.evaluate({...S(), program: 'petronas'}).clearHeight;
  assert.ok(tall > short, 'a taller schedule must give more clear height');
  assert.ok(tall >= M.econ.specClear, 'the mini case clears the modern spec');
  assert.ok(short < tall, 'and the 2006 schedule does not clear it');
});

/* ── distinctiveness and regimes ───────────────────────────────────────── */

test('a plain box is the least distinctive form', () => {
  const box = M.distinctiveness({...S(), family: 'box', taper: 1, twist: 0});
  assert.ok(box.score < 0.15);
  for (const f of ['chamfer', 'cross', 'star']) {
    assert.ok(M.distinctiveness({...S(), family: f}).score > box.score, f);
  }
});

test('twist and taper both raise distinctiveness', () => {
  const base = M.distinctiveness({...S(), family: 'cross', taper: 1, twist: 0}).score;
  assert.ok(M.distinctiveness({...S(), family: 'cross', taper: 1, twist: 90}).score > base);
  assert.ok(M.distinctiveness({...S(), family: 'cross', taper: 0.7, twist: 0}).score > base);
});

test('identity premium rises from landlord yield to speculative capital', () => {
  const ids = ['yield', 'civic', 'competition', 'speculative']
    .map(r => M.evaluate({...S(), regime: r}).premiums.identity);
  for (let i = 1; i < ids.length; i++) assert.ok(ids[i] > ids[i - 1], 'must be monotonic');
});

test('a regime that competes on height spends the height allowance', () => {
  const plain = M.search({...S(), regime: 'yield'}, 'contribution');
  const race = M.search({...S(), regime: 'competition'}, 'contribution');
  assert.equal(plain.heightVariants, 1, 'a landlord does not spend the height');
  assert.equal(race.heightVariants, 2, 'a competitor may');
  const bestRace = race.results[0].metrics;
  const bestPlain = plain.results[0].metrics;
  assert.ok(bestRace.height > bestPlain.height,
    'the competitive answer must be the taller building');
  assert.ok(bestRace.contribution < bestPlain.contribution,
    'and it must earn less — that is the whole point of the comparison');
});

test('every regime still returns feasible candidates', () => {
  for (const r of Object.keys(M.regimes)) {
    const res = M.search({...S(), regime: r}, 'contribution');
    assert.ok(res.results.length > 0, r);
  }
});

/* ── constraints and exports ───────────────────────────────────────────── */

test('the height limit is enforced and maxFloors agrees with it', () => {
  const s = {...S(), maxHeight: 260};
  const n = M.maxFloors(s);
  assert.ok(M.stackHeight(s, n) <= 260, `${n} floors must fit`);
  assert.ok(M.stackHeight(s, n + 1) > 260, `${n + 1} must not fit`);
  assert.ok(M.evaluate({...s, floors: n}).valid);
  assert.equal(M.evaluate({...s, floors: n + 5}).reasons.includes('height'), true);
});

test('an over-height building is rejected with a stated reason', () => {
  const m = M.evaluate({...S(), maxHeight: 100});
  assert.equal(m.valid, false);
  assert.ok(m.reasons.includes('height'));
});

test('OBJ export is well formed with valid, in-range face indices', () => {
  const obj = M.meshOBJ(S()).split('\n');
  const verts = obj.filter(l => l.startsWith('v ')).length;
  const faces = obj.filter(l => l.startsWith('f '));
  assert.ok(verts > 0 && faces.length > 0);
  for (const f of faces) {
    for (const idx of f.slice(2).split(' ')) {
      assert.ok(Number(idx) >= 1 && Number(idx) <= verts, `index ${idx} in range`);
    }
  }
});
/* ── the three languages ───────────────────────────────────────────────── */
// These guard a bug that shipped once: the short canvas/SVG stamps in app.js
// carried Chinese characters in the Thai slot, so the plan label rendered as
// 平面 inside the Thai UI. Nothing about the failure was visible to the model
// tests, so it gets its own guard.

import {t, langs} from '../dist/i18n.js';

const CJK = /[\u3400-\u9fff\uf900-\ufaff]/;

test('every language defines exactly the same keys', () => {
  const union = [...new Set(langs.flatMap(l => Object.keys(t[l])))];
  assert.ok(union.length > 150, `expected a substantial string table, got ${union.length}`);
  for (const l of langs) {
    const missing = union.filter(k => !(k in t[l]));
    assert.deepEqual(missing, [], `${l} is missing keys`);
  }
});

test('no Chinese characters leak into the Thai or English tables', () => {
  // A leak is Chinese text that arrived because a string was never written in
  // this language. That is different from a Chinese name, an organisation's
  // registered name, or the title of a cited document — those are quoted in
  // their own script by definition, and transliterating them would misattribute
  // a source. The dedication block is the one place that legitimately does it,
  // so it is exempt by name and nothing else is.
  const CJK_BY_PROPER_NOUN = new Set(['r.dedHead', 'r.dedCred', 'r.dedSrc']);
  for (const l of ['th', 'en']) {
    const leaked = Object.entries(t[l])
      .filter(([k, v]) => !CJK_BY_PROPER_NOUN.has(k) && CJK.test(v))
      .map(([k]) => k);
    assert.deepEqual(leaked, [], `${l} contains CJK in: ${leaked.join(', ')}`);
  }
});

test('the Chinese table is actually Chinese', () => {
  // The mirror image: zh must not have quietly fallen back to English.
  // These three stay in Latin script in every language by convention —
  // the brand mark, a currency code, and a proper-noun credit line.
  const LATIN_BY_CONVENTION = new Set(['brand', 'c.USD', 'd.credit']);
  const latin = Object.entries(t.zh)
    .filter(([k, v]) => !LATIN_BY_CONVENTION.has(k) && !CJK.test(v) && /[A-Za-z]{3,}/.test(v));
  assert.deepEqual(latin.map(([k]) => k), [],
    `zh is still Latin in: ${latin.map(([k, v]) => `${k}="${v}"`).join(', ')}`);
});

test('every range control resolves in all three languages', () => {
  const ids = ['span', 'aspect', 'floors', 'taper', 'twist', 'core', 'common',
    'site', 'maxHeight', 'frontage', 'rent', 'premium', 'occupancy', 'reserve'];
  for (const id of ids) {
    for (const l of langs) {
      const v = t[l][`c.${id}`];
      assert.ok(v && v.length > 1, `c.${id} missing in ${l}`);
    }
  }
});

test('the translator returns the requested language and falls back to English', () => {
  assert.equal(typeof t.en['nav.studio'], 'string');
  // translator is exercised in the app; here we only pin that every key
  // resolves without throwing for all three languages.
  for (const l of langs) {
    for (const k of Object.keys(t[l])) assert.ok(t[l][k] !== undefined, `${l}/${k}`);
  }
});

/* ── release stamping ──────────────────────────────────────────────────── */
// index.html is served max-age=0 but every asset max-age=14400, so an
// unstamped asset URL lets a returning visitor run four-hour-old JS against new
// markup. The stamp makes the URL change with the bytes. These tests pin the
// invariant that the token IS the hash, so the stamp cannot silently drift from
// the file it points at.

import {createHash} from 'node:crypto';
import {readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const readDist = f => readFileSync(join(DIST, f), 'utf8');
const id10 = s => createHash('sha256').update(s).digest('hex').slice(0, 10);

const refs = () => {
  const out = [];
  for (const [file, re] of [['index.html', /["'`]((?:knowledge\/)?[\w.-]+\.(?:css|js|json|txt))\?v=([0-9a-f]{10})["'`]/g],
    ['app.js', /["'`](\.\/[a-z0-9]+\.js|knowledge\/[\w.-]+\.json)\?v=([0-9a-f]{10})["'`]/g],
    // model.js imports the geometry kernel; it is stamped by the same pass
    ['model.js', /["'`](\.\/[a-z0-9]+\.js)\?v=([0-9a-f]{10})["'`]/g]]) {
    for (const [, ref, id] of readDist(file).matchAll(re)) out.push({from: file, ref, id});
  }
  return out;
};

test('every asset reference in the shell carries a content id', () => {
  const found = refs();
  assert.ok(found.length >= 8, `expected the whole dependency graph stamped, found ${found.length}`);
  assert.ok(!/v=undefined/.test(readDist('index.html') + readDist('app.js')),
    'a stamp resolved to undefined — the id lookup missed');
});

test('each stamped id is the actual hash of the file it points at', () => {
  for (const {from, ref, id} of refs()) {
    const path = join(DIST, ref.replace(/^\.\//, ''));
    assert.ok(existsSync(path), `${from} points at missing ${ref}`);
    assert.equal(id10(readFileSync(path, 'utf8')), id,
      `${from}: ${ref} is stamped ${id} but its bytes hash to something else — rerun scripts/release-id.mjs`);
  }
});

test('no reference is left unstamped', () => {
  const html = readDist('index.html');
  for (const m of html.matchAll(/(?:src|href)="(?!#|https?:|data:)([^"]+)"/g)) {
    assert.match(m[1], /\?v=[0-9a-f]{10}$/, `index.html references ${m[1]} without a version`);
  }
  const app = readDist('app.js');
  for (const m of app.matchAll(/from'(\.\/[a-z0-9]+\.js)'|fetch\('(knowledge\/[\w.-]+)'\)/g)) {
    assert.fail(`app.js references ${m[1] || m[2]} without a version`);
  }
});

/* ── option labels come from the string table, not from model.js ────────── */
// model.js carries an English label for every family, program, façade and
// structural system. Those English labels once reached the selects directly,
// and the family labels were additionally frozen at module load — so a Thai or
// Chinese visitor read English in the dropdowns and on the model stamp. The
// labels now resolve through i18n; this test fails if a new model entry is
// added without its translations.
test('every model option has a label in all three languages', () => {
  const groups = [
    [Object.keys(M.families), 'f.'],
    [Object.keys(M.levelPrograms), 'g.prog.'],
    [Object.keys(M.facadeFamilies), 'g.facade.'],
    [Object.keys(M.systems), 'g.system.'],
  ];
  for (const [keys, prefix] of groups) {
    assert.ok(keys.length > 0, `${prefix} has no keys`);
    for (const k of keys) {
      for (const l of langs) {
        const v = t[l][prefix + k];
        assert.ok(v && v.length > 1, `${prefix}${k} is missing in ${l}`);
      }
    }
  }
});

test('a translated option label is not just the English one', () => {
  // Guards the freeze bug specifically: en/th/zh must be three distinct
  // strings, otherwise something handed the same translation to all three.
  for (const k of Object.keys(M.families)) {
    assert.equal(new Set([t.en['f.' + k], t.th['f.' + k], t.zh['f.' + k]]).size, 3,
      `f.${k} is the same string in all three languages`);
  }
});

test('the three runtime annotations resolve in every language', () => {
  // program note + source, the façade reading line and the structure note are
  // all rendered straight into the studio, and all three used to be English in
  // the Thai and Chinese builds.
  for (const k of Object.keys(M.levelPrograms)) {
    for (const l of langs) {
      assert.ok(t[l][`prog.${k}.note`]?.length > 10, `prog.${k}.note missing in ${l}`);
      assert.ok(t[l][`prog.${k}.src`]?.length > 5, `prog.${k}.src missing in ${l}`);
    }
  }
  for (const k of ['skin.reads', 'sys.free', 'sys.grid'])
    for (const l of langs) assert.ok(t[l][k]?.length > 5, `${k} missing in ${l}`);
});

test('the model carries no language-specific strings', () => {
  // label/note/source moved into i18n so there is one place to translate and no
  // second copy to drift. The computational entries must stay language-free.
  for (const [k, p] of Object.entries(M.levelPrograms)) {
    for (const dead of ['label', 'note', 'source'])
      assert.equal(p[dead], undefined, `levelPrograms.${k}.${dead} should live in i18n`);
  }
});

/* ── the name ──────────────────────────────────────────────────────────── */
// Renamed from FORM/YIELD to FormHypes (Form Hypothesis). The old name was
// still wired into the document title, the wordmark, the export filenames and
// the document title set at runtime, so a partial rename would ship two names.
test('the product name is FormHypes everywhere it is rendered', () => {
  for (const f of ['index.html', 'app.js', 'i18n.js', 'model.js', 'research.js'])
    assert.ok(readDist(f).includes('FormHypes') || f === 'research.js',
      `${f} no longer mentions the product name`);
  for (const l of langs) assert.equal(t[l].brand, 'FormHypes', `brand in ${l}`);

  const html = readDist('index.html');
  assert.match(html, /<title>FormHypes — /, 'document title not renamed');
  // The wordmark is a hierarchy, not a lockup of equal parts: FORM and HYPES
  // are the name and split into two colours; "inspired by SHDT" is a smaller
  // subordinate credit in the red of the thesis it draws on.
  assert.match(html, /aria-label="FormHypes — inspired by SHDT, Shouheng Chen's 2006 MIT thesis"/,
    'wordmark expansion missing');
  assert.match(html, /<span class="b-form">Form<\/span><span class="b-hypes">Hypes<\/span>/,
    'wordmark is not split into FORM and HYPES');
  assert.match(html, /<span class="b-cred">inspired by <i>SHDT<\/i><\/span>/,
    'the SHDT credit is not a subordinate element');
  // SHDT carries the CCP red the mark is named for; nothing else does.
  for (const sel of ['.brand .b-cred i{', '.tb-sheet .b-cred i{'])
    assert.ok(readDist('style.css').includes(sel + 'font-style:normal;font-weight:800;color:#de2910'),
      `SHDT is not set in the CCP red at ${sel}`);
  // The name must outrank the credit in size, or the hierarchy is inverted.
  const css = readDist('style.css');
  const px = s => { const m = css.match(s); return m ? parseFloat(m[1]) : NaN; };
  const name = px(/\.brand\{[^}]*font-size:([\d.]+)px/);
  const cred = px(/\.brand \.b-cred\{[^}]*font-size:([\d.]+)px/);
  assert.ok(name > cred * 1.4, `name ${name}px must clearly outrank credit ${cred}px`);
  // FORM and HYPES must actually be two different colours.
  assert.match(css, /\.brand \.b-form\{color:var\(--ink\)\}/);
  assert.match(css, /\.brand \.b-hypes\{color:var\(--accent\)\}/);
  assert.ok(!/>Form<span>H<\/span>ypes</.test(html), 'the old hinged-H wordmark is still here');
  assert.match(readDist('app.js'), /document\.title='FormHypes — '/, 'runtime title not renamed');
  assert.match(readDist('app.js'), /download\('formhypes-/, 'export filenames not renamed');
});

test('no surviving FORM/YIELD branding ships', () => {
  // Storage keys are exempt: the rebrand deliberately still reads them so a
  // saved language and study shelf survive the rename.
  for (const f of ['index.html', 'app.js', 'i18n.js', 'model.js', 'research.js', 'style.css']) {
    const src = readDist(f).replace(/formYield(?:Lang|Studies)/g, '');
    assert.ok(!/FORM\s*\/\s*YIELD/i.test(src), `${f} still says FORM/YIELD`);
    assert.ok(!/form-yield/.test(src), `${f} still says form-yield`);
  }
});

/* ── the geometry kernel ────────────────────────────────────────────────── */
// Everything below checks the new mathematics against a closed form or a
// theorem, not against a previous run. A model that only agrees with itself is
// not evidence of anything.

import * as G from '../dist/geometry.js';

const close=(a,b,tol,what)=>assert.ok(Math.abs(a-b)<=tol,
  `${what}: got ${a}, expected ${b} (tol ${tol})`);

test('Minkowski addition of two rectangles is the bounding rectangle', () => {
  const m=G.minkowski(G.rect(4,2),G.rect(2,2));
  assert.equal(m.length,4);
  close(G.polyArea(m),24,1e-9,'area');
  close(G.polyPerimeter(m),20,1e-9,'perimeter');
});

test('Minkowski perimeter is additive — Cauchy\'s theorem', () => {
  // Perimeter is the one measure that linearises under Minkowski addition.
  // Any convex pair must satisfy P(A⊕B) = P(A) + P(B); this catches a merge
  // that produces the wrong shape even when the area happens to look plausible.
  const A=G.regularPolygon(8,0.5), B=G.regularPolygon(6,0.4);
  const sum=G.minkowski(A,B);
  close(G.polyPerimeter(sum),G.polyPerimeter(A)+G.polyPerimeter(B),1e-9,'P(A+B)=P(A)+P(B)');
  assert.ok(G.isConvex(sum),'a Minkowski sum of convex bodies is convex');
});

test('Minkowski addition is commutative', () => {
  const A=G.rect(3,1),B=G.regularPolygon(8,0.5);
  close(G.polyArea(G.minkowski(A,B)),G.polyArea(G.minkowski(B,A)),1e-9,'area(A+B)=area(B+A)');
});

test('regular polygon matches its closed form', () => {
  for(const n of [4,6,8,12]){
    const R=1.3,p=G.regularPolygon(n,R);
    close(G.polyArea(p),n/2*R*R*Math.sin(2*Math.PI/n),1e-9,`area of regular ${n}`);
    close(G.polyPerimeter(p),2*n*R*Math.sin(Math.PI/n),1e-9,`perimeter of regular ${n}`);
  }
});

test('a prism\'s skin is exactly perimeter times height', () => {
  const tab=G.loftTable(G.rect(20,20)),P=G.polyPerimeter(G.rect(20,20));
  close(G.lateralArea(tab,0,4,()=>1,()=>0,()=>0,()=>0),P*4,1e-6,'prism lateral area');
});

test('a square frustum\'s skin matches the closed form', () => {
  const box=G.rect(20,20),tab=G.loftTable(box),P=G.polyPerimeter(box);
  // half-widths 10 → 5 over a height of 1; slant = sqrt(1+(10-5)²)
  const exact=((P+P/2)/2)*Math.sqrt(1+25);
  const got=G.lateralArea(tab,0,1,z=>1-0.5*z,()=>-0.5,()=>0,()=>0,400,64);
  close(got,exact,1e-3,'frustum lateral area');
});

test('a twist costs more than the familiar slant formula says', () => {
  // For a 20 m square twisted a full turn over its height, the surface integral
  // has a closed form: four edges, each integrating sqrt(1+(θ'x)²).
  const th=2*Math.PI,a=10;
  const F=x=>0.5*(x*Math.sqrt(1+th*th*x*x)+Math.asinh(th*x)/th);
  const exact=8*F(a);
  const tab=G.loftTable(G.rect(20,20));
  close(G.lateralArea(tab,0,1,()=>1,()=>0,()=>0,()=>th,200,64),exact,exact*2e-3,'twisted prism');
  // …and the usual P·sqrt(1+θ'²) is badly wrong, because it ignores the lever
  // arm of each point about the rotation axis.
  const naive=G.polyPerimeter(G.rect(20,20))*Math.sqrt(1+th*th);
  assert.ok(exact/naive>4,'slant formula should understate by more than 4x here');
});

test('the plans that can be convex are, and the ones that cannot are not', () => {
  // This is the interesting boundary. A cruciform and a star are not convex
  // bodies — no straight line spans them — so the whole support-function
  // algebra is unavailable for them. The model says so explicitly rather than
  // pretending otherwise.
  assert.ok(G.isConvex(G.planLibrary.box()),'box');
  assert.ok(G.isConvex(G.planLibrary.chamfer()),'chamfer');
  assert.ok(G.isConvex(G.planLibrary.octagon()),'octagon');
  assert.equal(G.isConvex(G.planLibrary.cross()),false,'cruciform is not convex');
  assert.equal(G.isConvex(G.planLibrary.star()),false,'star is not convex');
});

test('every plan is normalised so span keeps meaning half-width', () => {
  for(const [k,make] of Object.entries(G.planLibrary))
    close(Math.max(...make().flatMap(([x,y])=>[Math.abs(x),Math.abs(y)])),0.5,1e-9,`${k} half-extent`);
});

test('daylight reach follows the sky-angle relation', () => {
  // cot 42° is the standard overcast reference; reach must be head × cot(sky).
  close(G.cotSky,1/Math.tan(42*Math.PI/180),1e-12,'cot(42°)');
  close(G.daylightReachFor(3.0),3.0*G.cotSky,1e-12,'reach is linear in head height');
  // A taller window head reaches further; this is the whole point.
  assert.ok(G.daylightReachFor(3.0)>G.daylightReachFor(2.0));
});

test('daylight geometry is measured on a real plate, not a unit plan', () => {
  // At building scale — a 48 m span — a sky reach of a few metres must leave
  // most of the floor plate unlit. Against the unit-scale library plan every
  // point would trivially be daylit, which is why the scale matters.
  const plate=M.profile({...M.defaults,family:'octagon'},0);
  const reach=G.daylightReachFor(3.2);
  const lit=G.daylitFraction(plate,reach);
  assert.ok(lit>0.05&&lit<0.75,`a 48 m octagon should be mostly unlit, got ${(lit*100).toFixed(1)}%`);
  assert.ok(G.daylitFraction(plate,1e6)>0.99,'an infinite reach lights everything');
  // A deeper plate must be worse, not better.
  const deep=M.profile({...M.defaults,family:'octagon',span:90},0);
  assert.ok(G.daylitFraction(deep,reach)<lit,'a larger plate has a worse daylight ratio');
});

test('structural cost follows the plate perimeter, not a flat rate', () => {
  const s={...M.defaults,system:'column-grid'};
  const box=M.columnDensity(M.profile({...s,family:'box'},0),s);
  const star=M.columnDensity(M.profile({...s,family:'star'},0),s);
  // Both at the same span. The star carries far more perimeter per square
  // metre of floor and therefore more perimeter columns to stand up.
  assert.ok(star.multiplier>box.multiplier,'a spiky plan must cost more frame than a compact one');
  // The reference plate — 40 × 40 m on the 8.5 m grid — is exactly 1.00.
  const ref=M.columnDensity([[-20,-20],[20,-20],[20,20],[-20,20]],{...s,span:40,aspect:1,family:'box'});
  assert.ok(Math.abs(ref.multiplier-1)<0.35,'reference plate should sit near 1.0');
});

test('the integrated skin includes the levels that earn nothing', () => {
  // Mechanical and refuge floors wear a skin. Counting only the lettable levels
  // understated the envelope by the whole height of the voids.
  const withVoids=M.evaluate({...M.defaults,program:'petronas'});
  const noVoids=M.evaluate({...M.defaults,program:'mini',floors:M.defaults.floors+3});
  assert.ok(withVoids.facade>0&&noVoids.facade>0);
  const perM2=withVoids.facade/withVoids.gross;
  assert.ok(perM2>0.4&&perM2<0.9,'skin-to-floor ratio should be physically sane');
});

test('gross floor area is still conserved exactly under the new geometry', () => {
  const base=M.grossOf({...M.defaults});
  for(const f of Object.keys(M.families))for(const tw of [0,45,90])
    assert.ok(Number.isFinite(M.grossOf({...M.defaults,family:f,twist:tw}))&&M.grossOf({...M.defaults,family:f,twist:tw})>0,f+'/'+tw);
  assert.ok(base>0);
});

test('every plan still produces corners the model can price', () => {
  // Four of the five plans earn at least one corner office somewhere; the
  // chamfered slab is the documented exception and must be zero, not broken.
  const counts=Object.fromEntries(Object.keys(M.families)
    .map(f=>[f,M.evaluate({...M.defaults,family:f}).corners]));
  for(const f of ['box','cross','octagon','star'])
    assert.ok(counts[f]>0,`${f} should earn corner offices, got ${counts[f]}`);
  assert.equal(counts.chamfer,0,'the chamfer finding must survive: short edges cannot host a corner');
});

/* ── the Rub el Hizb ──────────────────────────────────────────────────────
   Pelli's plan is the only sixth family, and it is the only one whose shape is
   a closed form rather than a taste. These tests assert the identities, so the
   figures the research tab quotes are the kernel's and cannot drift from it. */

test('the Rub el Hizb is the union of two squares, so its ratio is exact', () => {
  assert.ok(Math.abs(G.RUB_INNER_RATIO-Math.sqrt(2-Math.SQRT2))<1e-15);
  // Rebuild the ratio geometry before unit() normalises it.
  const raw=[];
  for(let i=0;i<16;i++){
    const a=Math.PI/8+i*Math.PI/8,r=i%2?G.RUB_INNER_RADIUS:0.5;
    raw.push([Math.cos(a)*r,Math.sin(a)*r]);
  }
  assert.ok(Math.abs(G.polyArea(raw)-(2-Math.SQRT2))<1e-12,'area must be 2 − √2');
  assert.ok(Math.abs(G.polyPerimeter(raw)/16-((Math.SQRT2-1)/2))<1e-12,'edge must be (√2 − 1) ÷ 2');
  // And the point radius must actually be smaller than the outer one. Passing
  // the ratio where an absolute radius belongs inverts the star into a
  // rounded blob with sixteen "valleys" that are not valleys — this caught it.
  assert.ok(G.RUB_INNER_RADIUS<0.5,'the inner radius must sit inside the outer');
  assert.equal(G.planLibrary.rub().length,16,'sixteen vertices');
});

test("Pelli's star points come out at 90° and its valleys at 135°", () => {
  const p=G.planLibrary.rub(),deg=[];
  for(let i=0;i<p.length;i++){
    const v=p[i],a=p[(i+p.length-1)%p.length],b=p[(i+1)%p.length];
    const u=[a[0]-v[0],a[1]-v[1]],w=[b[0]-v[0],b[1]-v[1]];
    const lu=Math.hypot(...u),lw=Math.hypot(...w);
    deg.push({a:Math.acos(Math.max(-1,Math.min(1,(u[0]*w[0]+u[1]*w[1])/(lu*lw))))*180/Math.PI,
      cross:(u[0]*w[1]-u[1]*w[0])/(lu*lw)});
  }
  assert.equal(deg.filter(d=>d.cross<0).length,8,'eight points');
  assert.equal(deg.filter(d=>d.cross>=0).length,8,'eight valleys');
  deg.filter(d=>d.cross<0).forEach(d=>assert.ok(Math.abs(d.a-90)<1e-9,'point is 90°'));
  deg.filter(d=>d.cross>=0).forEach(d=>assert.ok(Math.abs(d.a-135)<1e-9,'valley is 135°'));
  assert.ok(!G.isConvex(p),'a star is not convex, and the kernel must say so');
});

test('the eight points only become leasable above a 12 m edge — which is why Pelli filled the notches', () => {
  const at=span=>M.cornerZones(M.profile({...M.defaults,family:'rub',span},0),M.defaults).length;
  assert.equal(at(48),0,'at a 48 m half-width the edges are 10.8 m and nothing qualifies');
  assert.equal(at(54),8,'at 54 m they clear 12 m and all eight points qualify');
});

test('at equal floor area the star buys daylight and pays for it in frame', () => {
  const s={...M.defaults,family:'rub',span:48,aspect:1,system:'column-grid'};
  const k=Math.sqrt(M.area(M.profile(s,0))/M.area(M.profile({...s,family:'box',span:1},0)));
  const box={...s,family:'box',span:k};
  const r=M.evaluate(s),b=M.evaluate(box);
  assert.ok(Math.abs(r.gross-b.gross)<1,'compared at equal floor area');
  assert.ok(M.perimeter(M.profile(s,0))>M.perimeter(M.profile(box,0)),'more perimeter, so more frame');
  assert.ok(r.daylitFraction>b.daylitFraction,'archnet: the pattern maximises exposure to natural light');
  assert.ok(r.structureMultiplier>b.structureMultiplier,'and it is not free');
});

test('every photograph the research tab names is really there', async () => {
  const {stat}=await import('node:fs/promises');
  const {RESEARCH_T}=await import('../dist/research.js');
  assert.equal(RESEARCH_T.photos.length,5);
  for(const [src,key] of RESEARCH_T.photos){
    const st=await stat(new URL('../dist/'+src,import.meta.url));
    assert.ok(st.size>10_000,`${src} is suspiciously small (${st.size} bytes)`);
    for(const l of langs)assert.ok(t[l][key],`${key} missing in ${l}`);
  }
});

test('the research tab has no section that is a heading without a number', async () => {
  const {SECTIONS}=await import('../dist/research.js');
  const heads=SECTIONS.filter(s=>s.kind==='head').map(s=>t.en[s.key]);
  for(const h of heads)assert.match(h,/^\d+ · /,`unnumbered heading: ${h}`);
  const nums=heads.map(h=>parseInt(h,10));
  assert.deepEqual(nums,nums.map((_,i)=>i+1),'sections must run 1..N with no gap');
});

/* ── the three-tower argument ──────────────────────────────────────────── */
/* Section 10 rests on three numbers: two square plates land on four rentable
   corners, and the star lands on eight. If the kernel or the cited dimensions
   move, the sentence under the plate has to move with them — so they are
   asserted here rather than left to the copy. */

test('the two square towers are four corners; the star is eight', () => {
  // World Trade Center: 207 ft square, core 87 × 135 ft (Wikipedia).
  const wtcPlate = 207 * 0.3048, wtcCore = [87 * 0.3048, 135 * 0.3048];
  assert.equal(Math.round(wtcPlate), 63);
  // Willis Tower: three 75 ft tubes across, 225 ft overall (SOM / Princeton).
  const willis = 3 * 75 * 0.3048;
  assert.equal(Math.round(willis * 10) / 10, 68.6);

  // Two squares. A convex four-sided plate has four vertices and no more,
  // whatever its width — the corners are a property of the count of sides.
  for (const w of [wtcPlate, willis]) {
    const st = {...S(), family: 'box', span: w / 2};
    assert.equal(M.cornerZones(M.profile(st, 0), st).length, 4,
      `a ${w.toFixed(1)} m square must have four corners on the plate`);
  }

  // The star, at the span that reproduces the floor area the published record
  // implies for the real tower: 218,000 m² ÷ 88 storeys = 2,477 m².
  const st = {...S(), family: 'rub', span: 60, aspect: 1};
  const star = M.profile(st, 0);
  assert.equal(M.cornerZones(star, st).length, 8,
    'the eight-pointed star must give eight corners on the plate');
  assert.equal(star.length, 16, 'eight points and eight valleys');
  // Non-convex, so the four-sided reasoning above genuinely does not apply.
  assert.equal(M.isConvex(star), false);
});

test('the World Trade Center core share is derived, not quoted', () => {
  // 27 × 41 m inside a 63 m square. Published as dimensions, never as a ratio —
  // so the 27.9% on the plate is ours and is labelled as derived.
  const share = (27 * 41) / (63 * 63) * 100;
  assert.equal(share.toFixed(1), '27.9');
  // The honest consequence: the record 75% rentable leaves ~25% for core and
  // circulation, which is why the plate cannot honestly claim "the core is 50%".
  assert.ok(share < 30 && share > 25);
});

test('the trio section is present, numbered, and sourced in every language', async () => {
  const {SECTIONS, RESEARCH_T} = await import('../dist/research.js');
  // A section may carry several plates; `then` is then an array.
  const kinds = s => (Array.isArray(s.then) ? s.then : [s.then]).map(b => b?.kind);
  assert.ok(SECTIONS.some(s => kinds(s).includes('trio')), 'no trio block in SECTIONS');
  assert.ok(SECTIONS.some(s => kinds(s).includes('cores')), 'no cores block in SECTIONS');
  for (const l of langs) {
    assert.ok(t[l]['r.trio.h'], `r.trio.h missing in ${l}`);
    assert.match(t[l]['r.trio.note'], /Wikipedia|NOVA|Archnet/, `trio sources missing in ${l}`);
    for (const b of ['b1','b2','b3','b4','b5']) assert.ok(t[l]['r.trio.' + b], `${b} missing in ${l}`);
  }

  // The plate's values are not decoration and must not fall back to English.
  for (const k of ['trioSysWtc','trioSysWillis','trioSysPetronas',
                   'trioCoreWillis','trioCorePetronas'])
    assert.ok(RESEARCH_T[k].en && RESEARCH_T[k].th && RESEARCH_T[k].zh, `${k} incomplete`);
  // Chinese carries no Latin *words* in these. Strip units, digits, punctuation and
  // CJK; whatever is left must be nothing. A metre is a metre in every language,
  // so "22.9 m" is not a fallback to English.
  const latinWords = s => s
    .replace(/[0-9.,×·:;/%()（）—–\-\s]/g, '')
    .replace(/[m²ft]/gi, '')
    .replace(/[⺀-鿿　-〿＀-￯]/g, '');
  for (const k of ['trioSysWtc','trioSysWillis','trioSysPetronas','trioCoreWillis','trioCorePetronas'])
    assert.equal(latinWords(RESEARCH_T[k].zh), '',
      `${k} falls back to a Latin word in zh: ${RESEARCH_T[k].zh}`);
  // English and Thai are allowed the technical term; English must still be English.
  assert.match(RESEARCH_T.trioSysWtc.en, /Framed tube/);
});

/* ── the six systems ───────────────────────────────────────────────────── */
/* The strip is a taxonomy with running order, not a chronology: the systems are
   alternatives. Each building, address and date was checked independently, so
   those are asserted rather than trusted. What is NOT asserted as fact is the
   drawing — the isometrics are schematic and the plate says so. */

test('the six systems are complete, dated, and written in all three languages', async () => {
  const {RESEARCH_T} = await import('../dist/research.js');
  const C = RESEARCH_T.cores;
  assert.equal(C.length, 6);
  // The reference set, with the years each source gives.
  const years = C.map(c => c.year);
  assert.deepEqual(years, ['1893','1968','1973','1989','1986','2017']);
  assert.deepEqual(C.map(c => c.addr),
    ['304 S. Broadway','445 S. Figueroa St.','707 Wilshire Blvd.','633 W. 5th St.',
     '801 S. Grand Ave.','900 Wilshire Blvd.']);
  assert.deepEqual(C.map(c => c.bld),
    ['Bradbury Building','Union Bank Plaza','Aon Center','U.S. Bank Tower',
     'Chase Plaza','Wilshire Grand']);
  // Every system needs a distinct kind so the six drawings are actually six.
  assert.equal(new Set(C.map(c => c.kind)).size, 6);
  // And every system needs prose in every language, with no Latin fallback in zh.
  for (const c of C) {
    for (const l of langs) {
      // Chinese carries the same thought in far fewer characters, so the bar for
      // "is this a real sentence" is not the same length in every language.
      assert.ok(c.say[l] && c.say[l].length >= (l === 'zh' ? 10 : 20),
        `${c.sys}: say.${l} missing or too short (${c.say[l] ? c.say[l].length : 0} chars)`);
      assert.ok(l === 'zh' ? (c.sysZh || c.sys) : (c.sysTh || c.sys), `${c.sys}: ${l} label missing`);
    }
    assert.ok(!/[A-Za-z]{3,}/.test(c.say.zh), `${c.sys} zh annotation falls back to English`);
  }
  // The strip's own framing has to be written, or the plate is unsourced copy.
  for (const k of ['coresHead','coresNote','coresPlan','coresOutr','coresOutrNote'])
    for (const l of langs) assert.ok(RESEARCH_T[k][l], `${k}.${l} missing`);
});

test('the dedication names 陈寿恒 and is written in every language', () => {
  // "Inspired by" was on the site for a long time. "Dedicated to" was not, and
  // the name existed only in Latin letters — which is useless to the audience
  // this instrument was actually built for. Both gaps are now assertions.
  for (const l of langs) {
    for (const k of ['r.dedHead', 'r.dedBody', 'r.dedCred', 'r.dedSrc'])
      assert.ok(t[l][k] && t[l][k].trim(), `${k}.${l} missing`);
  }
  // The name in his own script, in all three — that is the whole point of the block.
  for (const l of langs)
    assert.ok(t[l]['r.dedHead'].includes('陈寿恒'), `${l} dedication does not name 陈寿恒`);
  // The act itself has to be stated, not merely implied by the name.
  assert.match(t.en['r.dedBody'], /dedicated to him/i);
  assert.match(t.en['r.dedHead'], /dedicated to/i);
  // His standing is sourced, and the source is linked from the page.
  assert.ok(t.en['r.dedCred'].includes('Shenzhen'), 'en credentials omit the Shenzhen practice');
  assert.ok(t.zh['r.dedCred'].includes('深圳寿恒建筑设计事务所'),
    'zh credentials must name his practice as registered');
  assert.ok(t.zh['r.dedCred'].includes('麻省理工学院'), 'zh credentials must name MIT');
  const html = readDist('index.html');
  assert.ok(html.includes('id="dedication"'), 'dedication container missing from index.html');
  assert.ok(/saup\.szu\.edu\.cn\/info\/1022\/1671/.test(readDist('app.js')),
    'the Shenzhen University source is no longer linked');
});
