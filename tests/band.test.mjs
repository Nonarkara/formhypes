/* The sheet's bottom band was laid out correctly and invisible at the same time.

   `.viewport` is a flex column and the band children were made `position:static`
   on purpose — that is what stopped the view foot, the skyline readout and the
   title block colliding with each other, which a fixed pixel offset cannot do.
   But `canvas{position:absolute;inset:0}` is a positioned box, and in the CSS
   painting order a positioned element paints ABOVE every in-flow sibling in the
   same stacking context. So the band reserved its space, measured as present,
   overlapped nothing — and was covered by the drawing.

   The tell was `elementFromPoint` over the readout returning `tower`. A
   geometry audit reporting "zero overlap" was true and useless: it measured the
   boxes and never asked what was painted on top of them.

   In flow is what makes the band stack. Positioned is what makes it visible.
   Both are required, and the second is easy to delete without noticing. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const dist=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');

const BAND=['viewfoot','skyline-readout','phone-readout','titleblock'];

test('the canvas is positioned, so everything in flow over it must be too',()=>{
 const css=dist('style.css');
 const canvas=/^canvas\{([^}]*)\}/m.exec(css);
 assert.ok(canvas,'the base canvas rule is missing');
 assert.match(canvas[1],/position:\s*absolute/,
  'this guard assumes an out-of-flow canvas; if the canvas goes in flow, the '+
  'band no longer needs lifting and this rule should be re-derived, not deleted');
 assert.ok(!/z-index:\s*\d/.test(canvas[1]),
  'the canvas declares a z-index — recompute what the band needs to beat');

 for(const cls of BAND){
  // The rules that matter are the child-scoped ones on the sheet, not a later
  // single-class restyle describing the band elsewhere. Among those, equal
  // specificity means source order decides — so read the LAST position declared,
  // which is the one the browser applies.
  const scoped=[...css.matchAll(/([^{}]*\.viewport[^{}]*)\{([^}]*)\}/g)]
   .filter(m=>m[1].includes('>')&&new RegExp('\\.'+cls.replace(/-/g,'\\-')+'\\b').test(m[1]));
  assert.ok(scoped.length,`no .viewport rule targets .${cls} — the band would stack however it is styled`);
  const pos=[...scoped.map(m=>/position:\s*([a-z]+)/.exec(m[2])).filter(Boolean)];
  assert.ok(pos.length,`.viewport>.${cls} sets no position at all`);
  const effective=pos[pos.length-1][1];
  assert.notEqual(effective,'static',
   `.viewport>.${cls} resolves to position:static while the canvas is absolute — the `+
   'band reserves its space and is then painted over by the drawing');
 }
});

test('the band never intercepts the orbit drag',()=>{
 const css=dist('style.css');
 const scoped=[...css.matchAll(/([^{}]*\.viewport[^{}]*)\{([^}]*)\}/g)]
  .filter(m=>m[1].includes('>')&&BAND.some(c=>new RegExp('\\.'+c.replace(/-/g,'\\-')+'\\b').test(m[1])));
 assert.ok(scoped.length,'no child-scoped band rules found to check');
 // Any rule may legitimately refine padding or colour. The one thing that must
 // not appear is a rule handing pointer events back to the lifted band.
 for(const m of scoped){
  const pe=/pointer-events:\s*([\w-]+)/.exec(m[2]);
  if(pe)assert.equal(pe[1],'none',
   `a lifted band element takes pointer events (${m[1].trim()} → ${pe[1]}) — `+
   'dragging the orbit across the bottom band would go dead');
 }
});

test('every band element the sheet declares is on the lift list',()=>{
 const html=dist('index.html');
 const vp=/<section class="viewport"([\s\S]*?)<\/section>/.exec(html);
 assert.ok(vp,'the .viewport section is missing from index.html');
 // Direct children only, by nesting depth — a regex over every tag picks up
 // .vh-left (inside .viewhead) and .mobileonly and reports them as band
 // elements that need lifting. Nested content paints with its parent, and the
 // parent's own position already carries it.
 const VOID=new Set(['img','br','hr','input','meta','link']);
 let depth=0; const direct=[];
 for(const m of vp[1].matchAll(/<(\/?)([a-z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/gi)){
  const [,close,tag,attrs,self]=m;
  if(close){depth=Math.max(0,depth-1);continue}
  if(self||VOID.has(tag.toLowerCase()))continue;
  if(depth===0){const c=/\bclass="([^"]*)"/.exec(attrs);if(c)direct.push(...c[1].split(/\s+/))}
  depth++;
 }
 // Lifted means: some rule setting a z-index targets it. Not necessarily a
 // `.viewport>` one — .viewhead and .viewtools position themselves absolutely
 // and carry their own z-index, which is the same guarantee by another route.
 const css=dist('style.css');
 const rules=[...css.matchAll(/([^{}]+)\{([^}]*)\}/g)];
 const lifted=new Set(rules
   .filter(m=>/\bz-index:\s*\d/.test(m[2]))
   .flatMap(m=>m[1].split(',').map(s=>s.trim()))
   .flatMap(s=>[...s.matchAll(/\.([a-z][\w-]*)/gi)].map(x=>x[1])));
 // An element that no rule ever displays paints nothing and cannot be covered.
 // .mobileonly is display:none at every width today; flagging it as a band
 // element would be noise about markup that is currently inert.
 const shown=new Set(rules
   .filter(m=>/\bdisplay:\s*(?!none\b)[\w-]+/.test(m[2]))
   .flatMap(m=>m[1].split(',').map(s=>s.trim()))
   .flatMap(s=>[...s.matchAll(/\.([a-z][\w-]*)/gi)].map(x=>x[1])));
 const unlisted=[...new Set(direct)].filter(c=>!lifted.has(c)&&shown.has(c));
 assert.deepEqual(unlisted,[],
  `band elements with no lift rule will be painted over by the canvas: ${unlisted.join(', ')}`);
});