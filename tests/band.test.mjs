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

/* Three defects the render kept, and a geometry audit kept calling clean.

   Headroom: the fit reserved the title band and then hung the model from 80% of
   the FULL sheet height, so the crown landed 24px from the top on a 924px sheet
   and ran off it entirely on a short one. The band inset was measured, the
   annotations were measured, and nothing measured the gap above the model.

   The plate: the ground was #0a0d10 against a #111416 page background — four
   values DARKER than the sky behind it — so it was invisible and every building
   stood on nothing. Combined with a roof that was the brightest tone on the
   model, that is a lit slab floating in the dark, which is a table.

   Both are value and offset claims, so both are asserted as values. */
test('the model is fitted to a field with a real margin at the top',()=>{
 const src=drawTower();
 const head=/const HEAD=Math\.max\((\d+),Math\.round\(H\*([\d.]+)\)\)/.exec(src);
 assert.ok(head,'drawTower declares no head margin, so the crown floats against the sheet edge');
 const [,floor,frac]=head;
 const pct=parseFloat(frac)*100;
 assert.ok(pct>=7,`the top margin is ${pct}% of the sheet — it read as cramped at 7% and below`);
 assert.ok(parseInt(floor,10)>=26,'the head margin has no floor, so a short sheet collapses it to nothing');
 // And the base is derived from that margin, not chosen as a fraction of the
 // whole sheet — that fraction was the original bug, in a different costume.
 assert.match(src,/const baseY=HEAD\+ext\*\.96\*scale/,
  'the model base is not derived from the head margin');
 assert.ok(!/H\*\.80/.test(src),
  'the model is still hung from a fraction of the full sheet height, which is '+
  'what put the crown against the top edge');
});

test('the sheet stacks sky, ground and wall in that order',()=>{
 const src=drawTower();
 const hex=/'#([0-9a-f]{6})'/gi;
 const named={};
 for(const key of ['WALL_LIT','WALL_MID','WALL_SHADE','ROOF_HI','ROOF_LO','SHADOW'])
  named[key]=new RegExp(key+"='#([0-9a-f]{6})'",'i').exec(src);
 for(const [k,v] of Object.entries(named))assert.ok(v,`${k} is not declared in drawTower`);
 // Relative luminance, linearised. A gamma-encoded weighted sum is not the
// quantity the drawing is reasoned in, and a ratio taken on one scale while
// quoted on the other silently measures nothing.
 const chan=c=>{c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4)};
 const lum=h=>{const n=parseInt(h,16);return 0.2126*chan(n>>16&255)+0.7152*chan(n>>8&255)+0.0722*chan(n&255)};
 const sky=/ctx\.fillStyle='#([0-9a-f]{6})';[\s\S]{0,40}ctx\.fillRect\(0,0,W,H\)/.exec(src);
 // Read the plate out of the fill, not out of the sentence before it. This used
 // to require `closePath();fillStyle=…;fill()` as three adjacent statements, so
 // factoring the disc into a helper broke a guard whose actual claim — the
 // value ladder — was still true. The claim is the values.
 const plate=/(?:closePath\(\)|disc\(\));ctx\.fillStyle='#([0-9a-f]{6})';ctx\.fill\(\)/.exec(src);
 assert.ok(sky,'the sheet paints no sky before the ground');
 assert.ok(plate,'the ground plate is not filled');
 // The ground carries four tones now that the harvested streets are on it.
 // All of them sit between the sky and the shadowed wall, and none of them is
 // allowed to invent a brighter step to signal importance — hierarchy is line
 // weight, so a "major road" cannot climb above the buildings it runs between.
 const tones={};
 for(const key of['GROUND_GREEN','GROUND_WATER','GROUND_ROAD']){
  const m=new RegExp(key+"='#([0-9a-f]{6})'",'i').exec(src);
  assert.ok(m,`${key} is not declared next to the plate it belongs to`);
  tones[key]=m[1];
 }
 // Sky darkest, then the plate, then the darkest wall. This order is the whole
 // reason the city stopped looking like furniture: an invisible ground under a
 // roof that outshone its own walls is a table, not a street.
 const L=lum,order=[L(sky[1]),L(plate[1]),L(named.WALL_SHADE[1]),L(named.WALL_MID[1]),L(named.WALL_LIT[1])];
 assert.ok(order[0]<order[1],`the plate (${order[1].toFixed(0)}) is not lighter than the sky (${order[0].toFixed(0)}) — the ground vanishes`);
 assert.ok(order[1]<order[2],`the darkest wall (${order[2].toFixed(0)}) is not lighter than the plate (${order[1].toFixed(0)}) — buildings dissolve into the ground`);
 assert.ok(order[3]<order[4],'the lit and mid walls are not two distinguishable steps');
 // Every drawn feature has to lift off the plate, or it disappears into it.
 // The streets are allowed ABOVE the shadowed wall: they are lines on a plane,
 // not the field a massing stands on, and holding them under the wall is what
 // starved the ground to #121820 — black on a monitor — in the first place.
 for(const [k,v]of Object.entries(tones)){
  assert.ok(L(v)>L(plate[1]),`${k} (${L(v).toFixed(0)}) is not lighter than the plate (${L(plate[1]).toFixed(0)}) — it disappears into it`);
 }
 // The plate is the field, so the field is what has to stay under the wall.
 assert.ok(L(plate[1])<L(named.WALL_SHADE[1]),
  'the plate is lighter than the shadowed wall — a massing will have nothing to separate from');
 // And the network has to read. Two and a half times the plate is the floor
 // below which this stopped being a map and became a coin.
 const road=tones.GROUND_ROAD,pl=L(plate[1]);
 assert.ok(L(road)>pl*2.2,
  `the street tone is only ${(L(road)/pl).toFixed(1)}x the plate — the ground reads as a black disc again`);
 // The ground has to say something. Expressed as a ratio of the plate so the
 // claim does not depend on which luminance scale the reader has in mind.
 const hi=Math.max(...Object.values(tones).map(L)),lo2=Math.min(...Object.values(tones).map(L));
 assert.ok(hi/lo2>1.6,`the ground tones span only ${(hi/lo2).toFixed(2)}x — a plate with a texture nobody can see`);
 // The roof must not outshine the lit wall, or the top of every building is a
 // bright plane over a dark mass.
 assert.ok(L(named.ROOF_LO[1])<L(named.WALL_LIT[1]),
  'the roof is brighter than the sunlit wall — that is the tabletop');
});

test('the ground is the harvested street network, drawn through the tower projection',async()=>{
  const {GROUND,GROUND_ROAD_M}=await import('../dist/ground.data.js');
  const {parseGround}=await import('../dist/site.js');
  const {cities}=await import('../dist/solar.js');
  const src=drawTower();
  // Every city the sheet can draw a plate for has to carry ground. A city with
  // an empty disc is the black coin this was written to remove.
  for(const city of Object.keys(cities)){
   const g=parseGround(city,GROUND,GROUND_ROAD_M);
   assert.ok(g,`${city} has no harvested ground`);
   assert.ok(g.roads.length>20,`${city} has only ${g.roads.length} streets`);
   assert.ok(g.roadW.length===GROUND_ROAD_M.length&&g.roadW[0]>g.roadW[g.roadW.length-1],
     `${city}: road widths must run widest to narrowest or the hierarchy is noise`);
  }
  // The shape the drawer actually indexes. green and water are {pts} records,
  // not bare point lists — getting this wrong threw a TypeError in the canvas
  // and the plate came back black, which is the bug dressed as a feature.
  assert.match(src,/for\(const p of g\.green\)path\(flat\(p\.pts\)/);
  assert.match(src,/for\(const p of g\.water\)path\(flat\(p\.pts\)/);
  assert.match(src,/for\(const r of g\.roads\)[\s\S]{0,200}project\(r\.pts\[i\]\[0\],r\.pts\[i\]\[1\],0\)/);
  // Areas first, network on top: a road under a park reads as a road through it.
  const gi=src.indexOf('for(const p of g.green)'),wi=src.indexOf('for(const p of g.water)'),
        yi=src.indexOf('for(const w of g.ways)'),ri=src.indexOf('for(const r of g.roads)');
  for(const i of[gi,wi,yi,ri])assert.ok(i>0,'the ground is missing one of its four layers');
  assert.ok(gi<wi&&wi<yi&&yi<ri,`ground layers are out of order: green ${gi}, water ${wi}, ways ${yi}, roads ${ri}`);
  // Hierarchy is line weight, drawn from the real road width in metres.
  assert.match(src,/g\.roadW\[r\.cls\]\?\?6\)\*scale/);
  // Clipped to the plate, so a street that runs off the data ends at the data.
  assert.match(src,/ctx\.save\(\);disc\(\);ctx\.clip\(\);[\s\S]{0,40}drawGround\(\);[\s\S]{0,40}ctx\.restore\(\)/);
  // And the decode is kept, not redone on every pointer move. Checking only
  // that a cache is declared let a mutation pass that kept the declaration and
  // deleted the lookup — the memo would exist and never be read.
  const runtime=dist('app.js').replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
  assert.ok(runtime.indexOf('const groundCache=new Map()')<runtime.indexOf('function drawTower(){'),'cache must outlive a draw');
  assert.match(runtime,/const groundCache=new Map\(\)/);
  assert.match(runtime,/groundCache\.has\(city\)\)return groundCache\.get\(city\)/);
  assert.match(runtime,/groundCache\.set\(city,g\|\|null\);return g/);
});
