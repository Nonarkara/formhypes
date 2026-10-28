/* The sheet's budget: how much of the drawing sheet is drawing, and how much
   is paper.

   Three defects, all found by measuring the rendered console — the sheet at
   390, 600, 700, 1024 and 1440, in English, Thai and Chinese — and not by
   reading the source:

   1. THE SHEET NAMED ITS PLAN TWICE. The caption above the drawing says
      "Cruciform / 8 outer corners / 48". The title block said it again —
      "A-101 · CRUCIFORM / 8 OUTER CORNERS · 48L" — in a second register, on
      a second line, in the same words. Two statements of one fact is a second
      source of truth, and on a phone that second line was a whole row of
      paper the drawing could have had.

   2. THE SMALLER SCREEN GAVE THE DRAWING MORE ROOM THAN THE BIGGER ONE. The
      phone's form task split the studio 1.45fr to .62fr, so the drawing had
      70% of it. A window between 601 and 900 left the same task on the
      general 1fr to .8fr, so the drawing had 55%. Measured at 700×900: the
      drawing had 299px of field and the controls had 319. At 390 the drawing
      had 427 and the controls 237. The phone's share is the right one, so the
      narrow window takes it too — and the two statements of that share must
      not drift apart, which is what the second guard is for.

   3. THE SHEET'S NUMBER WAS PUSHED ONTO A ROW OF ITS OWN below 560, so the
      title block took two lines on a phone to hold one line of text.

   WHAT THE NUMBERS MEAN. The field is the canvas above the sheet's bottom
   band, and the band is measured across the band's in-flow children — the
   same measurement the drawing itself makes before it clips its ink
   (app.js, drawTower). The guards below read the shipped application and the
   shipped stylesheets; the last one models the title block's line count in
   ch, the unit all three languages can be counted in, and says plainly what
   it does and does not know. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = f => readFileSync(new URL('../dist/' + f, import.meta.url), 'utf8');
/* Comments are prose, not rules: a comment describing a repair must never be
   able to satisfy a guard that checks for the repair. */
const bare = css => css.replace(/\/\*[\s\S]*?\*\//g, '');

/* Every @media block in a stylesheet, with its condition and its body.
   A flat /([^{}]+)\{([^}]*)\}/ cannot see inside a media query — the
   wrapper's brace makes the inner rule unmatchable — so a rule that only
   exists at a narrow width reads as absent. */
function mediaBlocks(css) {
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

/* The body of the rule with this exact selector, inside the media blocks
   whose condition names this width. */
function ruleAtWidth(css, width, selector) {
  const blocks = mediaBlocks(css).filter(b => b.cond.includes('max-width:' + width));
  assert.ok(blocks.length, `the stylesheet has no @media block for ${width}px`);
  const out = [];
  for (const block of blocks) {
    for (const m of block.body.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const sels = m[1].split(',').map(s => s.trim());
      if (sels.includes(selector)) out.push(m[2]);
    }
  }
  return out;
}

/* The form task's row split, as the two fr weights it gives the drawing and
   the desk below it. */
function formSplit(css, width) {
  const rules = ruleAtWidth(css, width, 'body.is-console .studio[data-task="form"]');
  const withRows = rules.filter(r => /grid-template-rows/.test(r));
  assert.ok(withRows.length, `the form task has no row split at ${width}px`);
  const g = /grid-template-rows:\s*minmax\([^,]+,\s*([\d.]+)fr\)\s*minmax\([^,]+,\s*([\d.]+)fr\)/.exec(withRows[withRows.length - 1]);
  assert.ok(g, `the form task rows at ${width}px are not a two-row fr split: ${withRows[withRows.length - 1]}`);
  return {draw: +g[1], desk: +g[2]};
}

test('the sheet names its plan once', () => {
  const app = read('app.js');
  const m = /\$?\('tbRef'\)\.textContent\s*=\s*([^;]+);/.exec(app);
  assert.ok(m, 'the title block reference is never written');
  const expr = m[1];
  assert.ok(!/state\.family/.test(expr),
    'the title block restates the plan family — the caption above the drawing already says it, and two statements of one fact is a second source of truth');
  assert.ok(!/state\.floors/.test(expr),
    'the title block restates the floor count — the caption above the drawing already says it');
  assert.ok(!/tt\(/.test(expr),
    'the title block reference is translated text; a sheet number is not a sentence and does not change with the language');
  assert.match(expr, /'A-\d+'/,
    'the title block must carry the sheet number the drawing can be referred to by');
});

test('the narrow window gives the drawing the same share the phone gives', () => {
  const css = read('console.css');
  const narrow = formSplit(css, 900);
  const phone = formSplit(css, 600);
  const ratio = s => s.draw / s.desk;
  assert.ok(Math.abs(ratio(narrow) - ratio(phone)) < 1e-9,
    `the narrow window gives the drawing ${ratio(narrow).toFixed(2)} and the phone ${ratio(phone).toFixed(2)} — the smaller screen must not give the drawing more room than the bigger one, and one share must not be stated in two places that can drift apart`);
  assert.ok(narrow.draw / (narrow.draw + narrow.desk) >= 0.65,
    `the drawing takes only ${(narrow.draw / (narrow.draw + narrow.desk) * 100).toFixed(0)}% of a narrow window — the sheet is the work in this workspace, and the desk below it is its parameter rail`);
  assert.ok(phone.draw / (phone.draw + phone.desk) >= 0.65,
    `the phone gives the drawing only ${(phone.draw / (phone.draw + phone.desk) * 100).toFixed(0)}% of the sheet`);
});

test("the sheet's number shares the title block's row", () => {
  const css = read('style.css');
  const rules = ruleAtWidth(css, 560, '.tb-ref');
  assert.ok(rules.length, 'the narrow title block has no rule for the sheet number');
  for (const r of rules) {
    assert.ok(!/flex-basis:\s*100%/.test(r),
      "the sheet's number is forced onto a row of its own, so the block takes two lines for one line of text — and the drawing loses that row of paper");
    assert.ok(!/margin-left:\s*0/.test(r),
      "the sheet's number is pushed to the left edge instead of the right, which is where a title block puts it");
  }
});

/* The title block on a phone is one line: the notice and the sheet's number.
   It is one line as long as the two fit the width the sheet has, and a line
   is counted in ch — the width of a "0" in the block's own font — because
   Thai has no spaces and Chinese may break between any two ideographs, so a
   character count is a different number in every language. The model is
   honest about what it knows: it counts the notice's glyphs, gives an
   ideograph a full em and everything else the Latin advance, and asks
   whether the row fits. It is a model of the LINE COUNT, not a measurement
   of the pixels; the pixels were measured on the rendered sheet. */
test("the title block is one line on a phone, in every language", () => {
  const i18n = read('i18n.js');
  const notice = lang => {
    const m = new RegExp("'tb\\.notice':'([^']*)'").exec(i18n);
    assert.ok(m, 'the notice string is missing');
    // The three occurrences, in the order the languages are declared.
    const all = [...i18n.matchAll(/'tb\.notice':'([^']*)'/g)].map(x => x[1]);
    assert.equal(all.length, 3, 'the notice is not declared in three languages');
    return all[lang];
  };
  const EM = 11;                       // the title block's own font size
  const LATIN = EM * 0.6;             // the advance of a Latin glyph in the mono face
  const IDEO = EM;                    // an ideograph is a full em
  const width = s => [...s].reduce((w, ch) => w + (/[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFF60]/.test(ch) ? IDEO : LATIN), 0);
  // The narrowest sheet the phone has: 374px wide, the block's own padding
  // taken off, the gap between the notice and the number, and the number.
  const SHEET = 374 - 36;
  const NUMBER = width('A-101');
  for (const [lang, name] of [[0, 'English'], [1, 'Thai'], [2, 'Chinese']]) {
    const row = width(notice(lang)) + NUMBER + 14;
    assert.ok(row <= SHEET,
      `the title block does not fit on one line in ${name}: ${row.toFixed(0)}px of text in ${SHEET}px of sheet — it wraps, and the drawing loses a row`);
  }
});
