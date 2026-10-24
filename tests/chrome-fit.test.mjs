/* The chrome around the instrument: the header that holds the parameters, the
   strip that switches the workspace, and the desk that holds a table.

   Four defects were found by measuring the rendered page at 390, 1024 and
   1440 in three languages, not by reading the source:

   1. The header's two destinations were a fixed 46px tall — the height the
      header had before the compact chrome cut it to 40 — so they hung three
      pixels below the header's rule and lay across the workspace strip
      underneath, and the active tab's amber underline sat ON the header's
      black rule instead of above it.

   2. The workspace strip wrapped into a second row between 601 and 1359px:
      eleven on the first row, five on the second, with six hundred pixels of
      nothing beside the first row. A row of noise with a void beside it is
      not a switchboard.

   3. The Feng Shui table could not fit the column it sits in. Its headers
      were held on one line and its mass cell's "34 · 17,715 m² · 64 m" could
      not break, so the table's smallest honest width was 457px against a
      432px column: the last column was cut off the page.

   4. The header's parameters were placed by a constant — 1439px — measured
      from one language. Thai needs more header than Chinese, and in the
      difference the bar was squeezed and the site's own headline figure lost
      its unit. The page is asked now: the bar is measured against the room
      the rest of the header leaves it, in the language being read.

   The guards read the shipped stylesheets and the shipped measurement. The
   measurement is run, not read: a guard that only checks the source cannot
   see an inverted comparison, and one of these defects was an inverted
   comparison. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const app = readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8');
const style = readFileSync(new URL('../dist/style.css', import.meta.url), 'utf8');
const consoleCss = readFileSync(new URL('../dist/console.css', import.meta.url), 'utf8');
const desks = readFileSync(new URL('../dist/desks.css', import.meta.url), 'utf8');

/* The stylesheets, with their comments stripped: a rule described in a
   comment is not a rule, and a comment that explains a repair must never be
   able to satisfy a guard that checks for the repair. */
const bare = css => css.replace(/\/\*[\s\S]*?\*\//g, '');

/* Every @media block with its condition and its body. */
function media(css) {
  const src = bare(css), out = [];
  const re = /@media([^{]+)\{/g;
  let m;
  while ((m = re.exec(src))) {
    let depth = 1, i = re.lastIndex;
    while (depth > 0 && i < src.length) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') depth--;
      i++;
    }
    out.push({cond: m[1].trim(), body: src.slice(re.lastIndex, i - 1)});
    re.lastIndex = i;
  }
  return out;
}

/* The declarations of every rule with this exact selector, in the whole file. */
function rule(css, selector) {
  const src = bare(css), out = [];
  for (const m of src.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sels = m[1].split(',').map(s => s.trim());
    if (sels.includes(selector)) out.push(m[2]);
  }
  return out;
}

/* The declarations of a rule inside a media block with this condition. */
function ruleIn(css, cond, selector) {
  const block = media(css).find(b => b.cond.includes(cond));
  assert.ok(block, `the stylesheet has no @media block for ${cond}`);
  const out = [];
  for (const m of block.body.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sels = m[1].split(',').map(s => s.trim());
    if (sels.includes(selector)) out.push(m[2]);
  }
  return out;
}

/* ── the measurement, run ────────────────────────────────────────────────── */

function fitSource() {
  const start = app.indexOf('function fitSiteBar(h){');
  const end = app.indexOf('function measureChrome(){');
  assert.ok(start >= 0 && end > start, 'fitSiteBar moved');
  return app.slice(start, end);
}

/* A header and a parameters bar with measured widths, and nothing else.
   The bar's own gap (between the parameters) and the header's gap (between
   the groups) are different widths, and the measurement uses both. The bar
   carries a left padding and a left rule; both are room it needs. */
function room({bar, others, width, padding = 14, gap = 10, barGap = 8, barPad = 8, barBorder = 1}) {
  const barNode = {
    id: 'siteBar', offsetWidth: 0, children: bar.map(w => ({offsetWidth: w})),
    scrollWidth: 0, clientWidth: 0,
  };
  const header = {
    clientWidth: width,
    children: [...others.map(w => ({offsetWidth: w})), barNode],
    classList: {
      _on: new Set(),
      toggle(name, on) { on ? this._on.add(name) : this._on.delete(name); },
      contains(name) { return this._on.has(name); },
    },
  };
  const ctx = {
    document: {getElementById: id => (id === 'siteBar' ? barNode : null)},
    getComputedStyle: el => (el === barNode
      ? {columnGap: barGap + 'px', paddingLeft: barPad + 'px', borderLeftWidth: barBorder + 'px'}
      : {columnGap: gap + 'px', paddingLeft: padding + 'px', paddingRight: padding + 'px'}),
  };
  runInNewContext(fitSource() + '\nthis.fit=fitSiteBar;', ctx);
  ctx.fit(header);
  return {moved: header.classList.contains('bar-row'), header, barNode};
}

/* The measured cases. Each is a real header, measured: the widths are the
   ones the rendered page reported. */
const CASES = [
  {
    name: 'Thai at 1440: the unit was cut off the headline figure',
    bar: [140, 151, 157, 119], others: [215, 173, 69, 61, 255], width: 1412, moved: true,
  },
  {
    name: 'English at 1440: the room is there',
    bar: [130, 102, 153, 119], others: [215, 207, 66, 61, 242], width: 1412, moved: false,
  },
  {
    name: 'the bar is seven pixels too wide once its own padding is counted',
    bar: [130, 102, 153, 131], others: [215, 207, 66, 61, 242], width: 1412, moved: true,
  },
  {
    name: 'the gaps between the groups are room too',
    bar: [130, 102, 153, 132], others: [215, 207, 66, 61, 242], width: 1412, moved: true,
  },
];

test('the parameters take their own row when the line cannot hold them', () => {
  for (const c of CASES) {
    const r = room(c);
    assert.equal(r.moved, c.moved, c.name);
  }
});

test('the bar is measured by its contents, not by the space it was given', () => {
  // The bar is clipped by the header when the header is full, so its own
  // clientWidth is not its width. Its children carry labels that do not
  // wrap, so their widths are the bar's honest width whatever the header
  // did to it.
  const squeezed = room(CASES[0]);
  squeezed.barNode.clientWidth = 578;
  squeezed.barNode.scrollWidth = 599;
  assert.equal(squeezed.moved, true,
    'the bar was measured by the space it was given');
});

test('the header is asked every time it is laid out', () => {
  assert.match(app, /function measureChrome\(\)\{[\s\S]{0,400}?fitSiteBar\(h\)/,
    'the header is not measured against the page it is on');
  const start = app.indexOf('function update(){');
  const end = app.indexOf('\n}\n', start);
  const update = app.slice(start, end);
  assert.match(update, /fitSiteBar\(/,
    'the bar is not re-fitted after the numbers in it change');
});

/* ── the header's own height ────────────────────────────────────────────── */

test("the header's destinations fill the header's height instead of overrunning it", () => {
  const tabs = rule(style, '.tabs');
  assert.ok(tabs.length, 'the destinations lost their rule');
  assert.match(tabs.join('\n'), /align-self:\s*stretch/,
    'the destinations do not fill the header, so they sit wherever their own height puts them');
  for (const body of rule(style, '.tabs a')) {
    assert.doesNotMatch(body, /(?<!min-)height:\s*\d+px/,
      'a destination is a fixed number of pixels tall, and the header is not that tall any more');
  }
});

/* ── the workspace strip ─────────────────────────────────────────────────── */

test('the workspace strip does not wrap into a second row between the phone and the laptop', () => {
  const nav = ruleIn(consoleCss, 'min-width:601px', '.console-nav');
  assert.ok(nav.length, 'the strip has no rule for the band between the phone and the laptop');
  const body = nav.join('\n');
  assert.match(body, /flex-wrap:\s*nowrap/, 'the strip wraps, and a wrapped strip is a row of noise with a void beside it');
  assert.match(body, /overflow-x:\s*auto/, 'the strip cannot scroll, so it must wrap');
  const button = ruleIn(consoleCss, 'min-width:601px', '.console-nav button');
  assert.ok(button.length, 'the strip\'s buttons have no rule for that band');
  assert.match(button.join('\n'), /flex-direction:\s*column/,
    'the mark does not sit over its word, so sixteen of them cannot share one row');
});

test('the strip keeps every workspace on one row where the side-by-side arrangement fits', () => {
  const nav = rule(consoleCss, '.console-nav');
  assert.match(nav.join('\n'), /flex-wrap:\s*wrap/,
    'the strip may never wrap, so a language that needs more room would lose the end of it');
  const tight = ruleIn(consoleCss, 'min-width:1360px', '.console-nav button');
  assert.ok(tight.length, 'the strip does not tighten for the laptop band');
  assert.match(tight.join('\n'), /padding:\s*6px 7px/,
    'the strip does not tighten for the laptop band, so sixteen targets cannot share one row');
});

/* ── the Feng Shui desk ─────────────────────────────────────────────────── */

test('the Feng Shui table can fit the column it is given', () => {
  const heads = rule(desks, '#fengshuiDesk .feng-table th');
  assert.ok(heads.length, 'the table lost its headings');
  for (const body of heads) {
    assert.doesNotMatch(body, /white-space:\s*nowrap/,
      'the table headings are held on one line, and one long heading makes the table wider than its column');
  }
  const cells = rule(desks, '#fengshuiDesk .feng-table td');
  assert.ok(cells.length, 'the table lost its cells');
  assert.match(cells.join('\n'), /overflow-wrap:\s*anywhere/,
    "the mass cell's figures cannot break, so the table cannot shrink into its column");
});

test('the drawing beside the Feng Shui table keeps room for its own tools', () => {
  const grid = rule(consoleCss, 'body.is-console .studio[data-task="feng"]');
  assert.ok(grid.length, 'the Feng Shui layout lost its rule');
  const body = grid.join('\n');
  const m = body.match(/grid-template-columns:\s*minmax\((\d+)px/);
  assert.ok(m, 'the drawing\'s column has no floor, so it can be narrower than the tools over it');
  assert.ok(Number(m[1]) >= 380,
    `the drawing's column may be ${m[1]}px wide, and the tool row over it is 363px`);
});

test("the header's parameters are no longer placed by a constant width", () => {
  assert.doesNotMatch(consoleCss, /max-width:\s*1439px/,
    'the parameters are placed by a constant measured from one language');
  const row = rule(consoleCss, 'body.is-console header.bar-row .console-site');
  assert.ok(row.length, 'the header has no rule for a row of its own');
  assert.match(row.join('\n'), /flex:\s*1 0 100%/,
    'the bar does not take the whole row when it is given one');
});
