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
   Both are required, and the second is easy to delete without noticing.

   The two guards that follow cover the halves of this that geometry cannot see:
   the ink the canvas paints INTO the band, and the offsets the band rows carry
   now that they are positioned relative instead of absolute. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const dist=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');

const BAND=['viewfoot','skyline-readout','phone-readout','titleblock'];

/* drawTower's body, from its definition to the next module-level statement.
   Sliced rather than pattern-matched so an assertion about the drawing cannot
   be satisfied by the same identifier appearing somewhere else in a 1000-line
   module. Comments are stripped first: a guard that reads prose trips on the
   comment written to explain the bug it is guarding, which is how a comment
   documenting `footR.top` would have kept the `footR` assertion red forever. */
function drawTower(){
 const app=dist('app.js').replace(/\/\*[\s\S]*?\*\//g,' ').replace(/^\s*\/\/.*$/gm,' ');
 const start=app.indexOf('function drawTower(){');
 assert.ok(start>0,'drawTower is missing from app.js');
 const end=app.indexOf('\nlet drag=null;',start);
 assert.ok(end>start,'the end of drawTower could not be located');
 return app.slice(start,end);
}

/* Every rule in a stylesheet, including those nested in @media.

   A flat /([^{}]+)\{([^}]*)\}/ cannot see inside a media query: the wrapper's
   brace makes the inner rule unmatchable, so a display declaration that only
   exists at a narrow width reads as absent. That is not a cosmetic limit here —
   it is the difference between .phone-readout being a real element and inert
   dead markup, and it is what made the inert check report a false positive. */
function cssRules(css){
 const out=[],stack=[];
 for(let i=0;i<css.length;i++){
  if(css[i]==='{'){stack.push(i);continue}
  if(css[i]!=='}')continue;
  const open=stack.pop();
  if(open===undefined)continue;
  if(css.slice(open+1,i).includes('{'))continue;   // a wrapper, not a rule
  let s=open-1;
  while(s>=0&&css[s]!=='{'&&css[s]!=='}')s--;
  out.push({sel:css.slice(s+1,open).trim(),body:css.slice(open+1,i)});
 }
 return out;
}

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
 // .vh-left (inside .viewhead) and reports it as a band element that needs
 // lifting. Nested content paints with its parent, and the parent's own
 // position already carries it.
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
 const rules=cssRules(css);
 const lifted=new Set(rules
   .filter(m=>/\bz-index:\s*\d/.test(m.body))
   .flatMap(m=>m.sel.split(',').map(s=>s.trim()))
   .flatMap(s=>[...s.matchAll(/\.([a-z][\w-]*)/gi)].map(x=>x[1])));
 // An element that no rule ever displays paints nothing and cannot be covered —
 // so it was previously filtered out of this check as noise. That was the wrong
 // call, and it cost a real defect: .mobileonly sat in the band for the whole
 // life of the project, display:none at every width, shipping the sentence "on a
 // narrow screen this console is cramped — rotate the device" to readers on
 // phones the console had already been rebuilt for. It was a band element with
 // no lift, no display, and a false claim in three languages. Inert markup in
 // the sheet is not noise: it is a sentence nobody reads, or a control that
 // looks present and is not.
 const shown=new Set(rules
   .filter(m=>/\bdisplay:\s*(?!none\b)[\w-]+/.test(m.body))
   .flatMap(m=>m.sel.split(',').map(s=>s.trim()))
   .flatMap(s=>[...s.matchAll(/\.([a-z][\w-]*)/gi)].map(x=>x[1])));
 const inert=[...new Set(direct)].filter(c=>!shown.has(c));
 assert.deepEqual(inert,[],
  `band elements that no rule ever displays — dead markup in the sheet: ${inert.join(', ')}`);
 const unlisted=[...new Set(direct)].filter(c=>!lifted.has(c)&&shown.has(c));
 assert.deepEqual(unlisted,[],
  `band elements with no lift rule will be painted over by the canvas: ${unlisted.join(', ')}`);
});

/* The lift fixes the z-order. It does not touch the ink.

   `.viewport` is a flex column with the band in flow at its foot, so the band
   sits inside the canvas box — the canvas is `position:absolute;inset:0` and
   spans the whole sheet. Every guard above is about which box paints over which.
   None of them asks what the canvas itself painted in that region, and so none
   of them failed while the ground plate, the city and the tower drew straight
   through the footer.

   The symptom only appeared on interaction, which is why it survived: at rest the
   default framing left the band's rows over bare sheet, so a probe reported 0%
   ink and the claim looked fine. Dragging the orbit put 7.96% ink under the
   credit line; three zoom-outs put 8.53% under the title block. On a phone the
   tower and the band overlap with no interaction at all.

   So the drawing has to be clipped to the field above the band — bounded by the
   measured inset, because a constant reintroduces the very bug the measurement
   exists to prevent. */
test('the drawing is clipped to the field above the footer band',()=>{
 const src=drawTower();
 const clip=/ctx\.rect\(\s*0\s*,\s*0\s*,\s*W\s*,\s*H-footInset\s*\)\s*;\s*ctx\.clip\(\s*\)/.exec(src);
 assert.ok(clip,
  'drawTower does not clip the drawing to H-footInset — the canvas paints the '+
  'ground, the city and the tower into the footer band, where the credit line '+
  'and the title block sit on top of them');
 // The clip must open before the drawing and close after it. Balanced save and
 // restore counts catch a clip left open at the end of the function, which would
 // silently constrain every later draw instead of being visibly wrong.
 const saves=(src.match(/ctx\.save\(\)/g)||[]).length;
 const restores=(src.match(/ctx\.restore\(\)/g)||[]).length;
 assert.equal(saves,restores,
  `drawTower has ${saves} ctx.save() and ${restores} ctx.restore() — an unbalanced `+
  'clip leaks into the next frame instead of being visibly wrong');
});

/* A band row that is position:relative and also carries a top/right/bottom/left
   offset is not a leftover. It is an instruction.

   `.viewfoot` was written as an absolutely positioned plate with bottom:48px,
   then made position:relative so it would stack with the rest of the band. The
   `bottom` was never removed — and under relative positioning it is live: it
   shifted the row 48px down out of its place in the flow, leaving a dead strip
   of sheet above the footer and dropping the row into the drawing. Zero offsets
   move nothing, which is why `.titleblock`'s bottom:0;left:0;right:0 is legal
   and this does not flag it. */
test('a band row that is relative carries no non-zero positional offset',()=>{
 const rules=cssRules(dist('style.css'));
 for(const cls of BAND){
  const sel='.'+cls.replace(/-/g,'\\-');
  const scoped=rules.filter(m=>m.sel.includes('>')&&new RegExp(sel+'\\b').test(m.sel));
  const positions=scoped.map(m=>/position:\s*([a-z]+)/.exec(m.body)).filter(Boolean);
  const effective=positions.length?positions[positions.length-1][1]:null;
  if(effective!=='relative')continue;
  for(const m of rules){
   if(!new RegExp('(^|[,\\s])'+sel+'\\b').test(m.sel))continue;
   for(const o of m.body.matchAll(/(?:^|;)\s*(top|right|bottom|left)\s*:\s*(-?[\d.]+)px\s*(?=[;!]|$)/g)){
    assert.equal(parseFloat(o[2]),0,
     `.${cls} is position:relative and \`${m.sel.trim()}\` gives it ${o[1]}:${o[2]} — `+
     'a relative offset displaces the row out of the band stack it now belongs to');
   }
  }
 }
});

/* An annotation that must clear the band is anchored to the band, not to one row
   of it.

   The axis triad was anchored to `.viewfoot`'s measured row. On a narrow screen
   the console hides that row: its rect collapses to zero, the expression goes
   negative, and the `Math.max` floor threw the triad into the top-left corner,
   where X printed across the View button. No error, no overlap report — the
   numbers were valid, just anchored to a box that was not there. A floor
   substituting for a missing measurement is the entire failure.

   footInset is measured across every in-flow child, so it is correct whether or
   not any single row happens to be on screen. The guard is that the vertical
   anchor comes from it, and that no band row's own rect places anything. */
test('annotations clear the band by the band inset, never by one row of it',()=>{
 const src=drawTower();
 assert.match(src,/const fieldBottom=H-footInset/,
  'drawTower does not derive the field edge from the band inset');
 assert.match(src,/origin=\[[^\]]*fieldBottom[^\]]*\]/,
  'the axis triad is not anchored to the field edge, so it is positioned by '+
  'something that can vanish');
 assert.ok(!/\bfootR\b/.test(src),
  "drawTower still takes a vertical placement from a single band row's own "+
  'rectangle — that row is display:none on a narrow screen, where its rect is '+
  'zero and a Math.max floor silently becomes the anchor');
});
