/* Eleven plans in a 195px rail. Three rows with a ragged last one is what you
   get from four columns, and two rows with the same ragged last one from five.
   The only column count that lands eleven plans in two rows is six.

   The labels were the reason it could not simply be widened. Measured at the
   11px label size, the widest plan name needs 62px in English, 79px in Thai and
   66px in Chinese. Six cells across 195px is 29px each, so no name fits a tile in
   any of the three languages — which is why the names moved to one caption line
   under the grid rather than wrapping, truncating, or being invented shorter. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const dist=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');

const FAMILIES=11;

test('the atlas takes six across, so eleven plans land in two rows',()=>{
 for(const f of ['style.css','console.css']){
  const css=dist(f);
  const cols=[...css.matchAll(/([^{}]*\.form-atlas[^{}]*)\{([^}]*)\}/g)]
   .filter(m=>/grid-template-columns/.test(m[2]));
  assert.ok(cols.length,`${f} has no .form-atlas column rule`);
  for(const m of cols){
   // A rule may legitimately change the column count at a breakpoint, but a
   // grid rule that sets no columns is inheriting a count from elsewhere and
   // is where this bug hid before.
   const n=/repeat\((\d+)/.exec(m[2]);
   assert.ok(n,`a .form-atlas rule sets grid-template-columns without a count: ${m[2].trim()}`);
   assert.ok(Number(n[1])>=6,
    `${f}: ${m[1].trim()} uses ${n[1]} columns — eleven plans need six to make two rows`);
  }
 }
 // Eleven plans over six columns leaves exactly one empty slot, and that gap is
 // the point: a grid that fills its last row is a grid that was sized to the
 // number of things in it rather than to the space available.
 assert.equal(FAMILIES,11,'the plan count moved — re-derive the column count');
 assert.equal(FAMILIES%6,5,'the ragged slot is now in the second row, not the third');
});

test('the atlas caption names the plan, and nothing is left unnamed',()=>{
 const play=dist('play.js');
 assert.ok(/id='atlasCaption'/.test(play),'the atlas has no caption to carry the plan name');
 assert.ok(/atlas\.append\(grid,caption\)/.test(play),'the caption must actually be appended');
 // Every tile still carries its name for a reader who cannot see the caption —
 // the tooltip and the accessible name are not optional decoration.
 const tile=/const b=el\('button'\);b\.type='button';b\.id='atlas-'\+f;(.*?)grid\.append\(b\)/s.exec(play);
 assert.ok(tile,'the atlas tile builder is gone');
 assert.ok(/b\.title=label\(f\)/.test(tile[1]),'a plan tile lost its tooltip');
 assert.ok(/aria-label/.test(tile[1]),'a plan tile lost its accessible name');
 // And the caption must follow the reader, not only the selection.
 for(const ev of['pointerenter','focus'])assert.ok(play.includes(`'${ev}'`),
  `the caption does not follow ${ev}, so the grid is only half readable`);
 assert.ok(play.includes('say(name(state.family))'),
  'the caption must return to the chosen plan when the pointer leaves');
});

test('the caption prints the whole label, because it fits all three languages',()=>{
 const play=dist('play.js');
 // Measured against the live 195px rail: the widest full label is 121px
 // (Cruciform / 8 outer corners), 107px in Thai, 86px in Chinese. All fit — so the corner count
 // stays, because it is what tells Eight-point (8 tips) from Rub el Hizb
 // (8 points), and those two eight-pointed glyphs are the pair a reader is
 // most likely to confuse. Only the name came off the tiles, because 29px is
 // room for a glyph and not for a name.
 assert.ok(/const name=f=>label\(f\);/.test(play),
  'the caption must keep the corner count — it distinguishes the two eight-pointed stars');
 assert.ok(!/label\(f\)\.split\(' \/ '\)/.test(play),
  'the caption was truncated to the bare name; the count fits and it is informative');
 assert.ok(/b\.title=label\(f\)/.test(play),'the tooltip must stay on the tile');
 assert.ok(/aria-label/.test(play),'the accessible name must stay on the tile');
});

test('the caption line box clears Thai tone marks',()=>{
 const css=dist('style.css');
 const rule=/\.atlas-caption\{([^}]*)\}/.exec(css);
 assert.ok(rule,'the caption has no rule');
 const lh=/line-height:([\d.]+)/.exec(rule[1]);
 assert.ok(lh,'the caption sets no line-height');
 // At 1.2 a 10px line box is 12px and the Thai combining vowels and the
 // thanthakhat overhang it by 2px, which reads as a phantom overflow in Thai
 // and in no other language. Nothing clips today; the guard is so nobody
 // tightens this back to a Latin-sized line box and the two get confused again.
 assert.ok(Number(lh[1])>=1.45,
  `caption line-height ${lh[1]} does not clear Thai tone marks — Thai reports a 2px overflow no other language does`);
});