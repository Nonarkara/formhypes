import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,evaluate} from '../dist/model.js';
import {cities} from '../dist/solar.js';
import {lensOf,lensSVG,lensFormula,LENSES,LENS_ORDER,LENS_KEY,LIFE_YEARS,CONSTANTS} from '../dist/lens.js';
import {monoWidth} from '../dist/areasplit.js';
import {t} from '../dist/i18n.js';

const read=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');
const CTX={storeyM:4.1,heightM:538,netArea:42495};
/* The strings the drawings actually ship. This file used to carry a hand-written
   stand-in table so the guards had something to measure — and the stand-in was
   SHORTER than the real English label, so a guard read "one storey 4.10 m" while
   the page printed something 63 pixels wider, and the two boxes disagreed by
   exactly the amount the guard could not see. The charts are now measured with
   the shipped strings, in all three languages: the Chinese tag is wider than the
   English one, and a guard that reads only English is blind to the case that
   breaks. */
const KEYS={years:'lx.years',bench:'lx.bench',let:'lx.let',overflow:'lx.overflow',storey:'lx.storey',settle:'lx.settle',model:'lx.model',ground:'lx.ground',aria:'lx.title'};
const TXT_FOR=l=>{const c=t[l]||t.en,o={};for(const[k,i]of Object.entries(KEYS))o[k]=c[i];return o};
const TXT=TXT_FOR('en');

test('every city in the picker has a lens, and no lens exists without a city',()=>{
 // The point of the feature is that choosing a city CHOOSES a problem. A city
 // with no lens makes the six buttons six copies of one button.
 assert.deepEqual([...LENS_ORDER].sort(),Object.keys(LENSES).sort());
 for(const c of Object.keys(cities))assert.ok(LENSES[c],c+' is in the picker with no lens');
 assert.equal(LENS_ORDER.length,6,'a city was dropped from the lens list');
 // And they are genuinely different problems, not one template six times.
 const kinds=new Set(LENS_ORDER.map(c=>LENSES[c].kind));
 assert.ok(kinds.size>=3,`only ${kinds.size} distinct lens kinds across six cities`);
 const leads=LENS_ORDER.map(c=>c);
 assert.equal(new Set(leads).size,6);
});

test('every published number has a source, and every source is a real URL',()=>{
 for(const city of Object.keys(LENSES)){
  const L=LENSES[city];
  assert.ok(L.src.length>=2,city+' has fewer than two citations');
  for(const [label,href]of L.src){
   assert.ok(label&&label.length>12,city+' has an unlabelled source');
   assert.match(href,/^https:\/\//,`${city}: "${label}" is not a resolvable link`);
  }
  // A fact with no citation is the failure this whole module exists to avoid.
  assert.ok(L.rows.length>=2&&L.rows.length<=3,
   `${city} shows ${L.rows.length} facts — the band is sized for two or three`);
 }
});

test('the formulas are arithmetic on published constants, not typed strings',()=>{
 // The 60-year life is the one assumption here, so it is exported, fixed and
 // tested rather than buried in a literal at six call sites.
 assert.equal(LIFE_YEARS,60);

 for(const city of ['bangkok','jakarta','hcmc']){
  const L=lensOf(city,CTX),r=LENSES[city].rate;
  assert.equal(L.settle.lo,r.lo*LIFE_YEARS,`${city}: the low band is not rate × life`);
  assert.equal(L.settle.hi,r.hi*LIFE_YEARS);
  assert.equal(L.settleM.v,r.v*LIFE_YEARS/1000,`${city}: the central figure lost the ×life term`);
  // The one that shipped broken: every central value divided by 1000 without
  // multiplying by the life, so 10 mm/yr read as 0.01 m instead of 0.6 m.
  assert.ok(L.settleM.v>0&&L.settleM.v<=L.settleM.hi,`${city}: central settlement is outside its own band`);
  // And against the model's OWN storey height, which is what makes it a formula
  // rather than a fact: move the storey and the answer moves.
  assert.ok(Math.abs(L.storeys.v-L.settleM.v/CTX.storeyM)<1e-9,`${city}: storey fraction is not settlement ÷ storey`);
  const tall=lensOf(city,{...CTX,storeyM:8});
  assert.ok(tall.storeys.v<L.storeys.v,'a taller storey should shrink the fraction of it lost');
  const shallow=lensOf(city,{...CTX,storeyM:3});
  assert.ok(shallow.storeys.v>L.storeys.v,'a shorter storey should grow the fraction of it lost');
  // The three sinking cities are not the same number three times.
 }
 const settled=LENS_ORDER.filter(c=>LENSES[c].kind==='settle').map(c=>lensOf(c,CTX).settle.v);
 assert.equal(new Set(settled).size,3,`three settling cities share settlement values ${settled}`);

 const tokyo=lensOf('tokyo',CTX);
 assert.equal(tokyo.prob.lo,CONSTANTS.tokyo.probLo);
 assert.ok(tokyo.prob.lo<=tokyo.prob.hi,'the probability band is inverted');
 // Below is a fraction of the tower's own height.
 assert.ok(Math.abs(tokyo.ratio-CONSTANTS.tokyo.tunnelDepth/538*100)<1e-9);

 const kl=lensOf('kl',CTX);
 assert.ok(Math.abs(kl.dischRate-5000000/22)<1e-6,'the diversion rate is not volume ÷ hours');
 assert.ok(kl.overCap>0,'the tunnel ran past its own capacity — that is the argument; do not soften it');

 const sz=lensOf('shenzhen',CTX);
 assert.ok(Math.abs(sz.let.mid-CTX.netArea*(1-(CONSTANTS.shenzhen.vacLo+CONSTANTS.shenzhen.vacHi)/200))<1e-6,
  'the let-able area is not the model\'s rentable area less the market vacancy');
 // A model with no rentable area must not invent one.
 assert.equal(lensOf('shenzhen',{...CTX,netArea:0}).let,null,'a zero-area model produced a let-able area');
});

test('every lens draws without a NaN and every drawing is its own shape',()=>{
 const shapes={};
 for(const city of LENS_ORDER){
  const L=lensOf(city,CTX);
  const svg=lensSVG(L,TXT);
  assert.ok(svg.startsWith('<svg viewBox="0 0 '),city+' drew no viewBox');
  assert.doesNotMatch(svg,/NaN|undefined|Infinity/,`${city}: the drawing carries a NaN`);
  // Every coordinate is inside the box it declares.
  const [,w,h]=/viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg).map(Number);
  for(const m of svg.matchAll(/ x="(-?[\d.]+)"/g))assert.ok(Math.abs(+m[1])<=+w+1,`${city}: x=${m[1]} is outside 0..${w}`);
  for(const m of svg.matchAll(/ y="(-?[\d.]+)"/g))assert.ok(Math.abs(+m[1])<=+h+1,`${city}: y=${m[1]} is outside 0..${h}`);
  for(const m of svg.matchAll(/ (?:x1|y1|x2|y2)="(-?[\d.]+)"/g))assert.ok(Number.isFinite(+m[1]));
  const fx=lensFormula(L);
  assert.ok(fx&&fx.expr.length>0,city+' has no formula to print');
  assert.doesNotMatch(fx.expr,/NaN|undefined/,`${city}: the formula prints a NaN`);
  assert.ok(fx.gloss&&fx.gloss.startsWith('f'),city+' gloss key is malformed');
  shapes[city]=/viewBox="0 0 [\d.]+ [\d.]+"/.exec(svg)[0];
  // A missing lens must not draw a broken band.
  assert.equal(lensSVG(null,TXT),'');
  assert.equal(lensOf('atlantis',CTX),null);
 }
 // The four kinds draw four different boxes, so no city is quietly getting
 // Bangkok's chart with a different caption.
 assert.ok(new Set(Object.values(shapes)).size>=4,'two lens kinds draw an identical box');
});

test('no drawing spends a third of its own height on blank paper',()=>{
 /* "There is so little information, but you give it so much space." Measured on
    the emitted box rather than argued from taste: from the deepest label's
    descender to the bottom of the viewBox. The Shenzhen chart was carrying 49
    blank units under a two-bar drawing — a third of its height, spent on
    nothing, for no reason anyone could name. Tolerance is 8 units, which is
    real padding rather than rounding. */
 for(const city of LENS_ORDER)for(const l of['en','th','zh']){
  const svg=lensSVG(lensOf(city,CTX),TXT_FOR(l));
  const h=+/viewBox="0 0 [\d.]+ ([\d.]+)"/.exec(svg)[1];
  const ys=[...svg.matchAll(/<text[^>]*y="([\d.]+)"/g)].map(m=>+m[1]);
  const bottom=Math.max(...ys)+9.5*0.24;
  assert.ok(h-bottom<=8,
   `${city}/${l}: ${(h-bottom).toFixed(0)} of ${h} units below the last label are blank (${((h-bottom)/h*100).toFixed(0)}% of the drawing)`);
 }
});

test('the settlement wedge starts at zero and opens, instead of lying flat across a time axis',()=>{
 /* This chart plots settlement against YEARS, which means at year zero there is
   none. The version that shipped drew the two END-POINT values — the central
   figure and the top of the band — straight across the time axis, so the ground
   read as already 0.6 m down on the day the building opened, and the agreed
   range was a solid slab rather than a wedge. Every other guard was green,
   because the coordinates in the path were exactly the numbers the renderer had
   been handed: self-consistent, and wrong. So this reads the EMITTED path —
   the first point of each area and the two right-hand corners — and never the
   rates, which are the thing under suspicion. */
 for(const city of['bangkok','jakarta','hcmc']){
  const svg=lensSVG(lensOf(city,CTX),TXT);
  const ax=/y1="([\d.]+)" x2="[\d.]+" y2="\1" stroke="var\(--ink\)"/.exec(svg);
  assert.ok(ax,`${city}: the settlement chart has no x-axis to measure the band against`);
  const baseY=+ax[1];
  const areas=[...svg.matchAll(/<path d="M([\d.]+) ([\d.]+) L([\d.]+) ([\d.]+) L[\d.]+ [\d.]+ L[\d.]+ [\d.]+ Z" fill="var\(--accent\)"/g)]
   .map(m=>({x0:+m[1],y0:+m[2],x1:+m[3],y1:+m[4]}));
  assert.equal(areas.length,2,`${city}: drew ${areas.length} filled areas, not the agreed core and the disputed band`);
  for(const a of areas)
   assert.ok(Math.abs(a.y0-baseY)<0.05,
    `${city}: the ground is already ${(baseY-a.y0).toFixed(0)} units down at year zero`);
  // Emitted order is paint order: the disputed band goes down first so the
  // agreed core sits on top of it rather than behind it.
  assert.ok(areas[0].y1<areas[1].y1,`${city}: the disputed range is not drawn above the agreed one`);
  for(const a of areas)
   assert.ok(a.x1>a.x0,`${city}: the band does not widen across ${LIFE_YEARS} years`);
 }
});

test('the band is sized by its content — nothing stretches, nothing spreads',()=>{
 /* Air slop is not a taste complaint, it is measurable: a row of items whose
    combined natural width is a fraction of the width they were given. The CSS
    is checked for the properties that cause it, because that is where it goes
    wrong — not in the markup. */
 const css=read('desks.css'),block=css.slice(css.indexOf('.lx-band{border'),css.indexOf('@media(max-width:900px){.lx-body'));
 assert.ok(block.length>400,'the lens styles are missing');
 // No equal-share columns, no growth, no stretch, no space-between.
 assert.doesNotMatch(block,/1fr|space-between|space-around|flex:\s*1|justify-content:\s*space/,
  'the lens layout spreads its items instead of sizing them to content');
 assert.doesNotMatch(block,/gradient|border-radius|box-shadow/, 'the lens broke the house rules');
 assert.match(block,/max-content/, 'the fact rows are not content-width');
 // Wrapping is the escape hatch when content exceeds the room.
 assert.match(block,/flex-wrap:wrap/);
 // The whole band is referenced by context.js and lands under the city picker,
 // before the four cards that are the same on every city.
 const ctx=read('context.js');
 assert.match(ctx,/lensBand\(/);
 assert.ok(ctx.indexOf('lensBand({key')>ctx.indexOf('cx-cities')||ctx.indexOf('lensBand({key')<ctx.indexOf('cx-grid'),
  'the lens must be built at the call site below the picker, not hoisted');
 assert.ok(ctx.lastIndexOf('host.append(lensBand')>ctx.indexOf('host.append(row)')&&
  ctx.lastIndexOf('host.append(lensBand')<ctx.indexOf('host.append(grid)'),
  'the lens is not between the city picker and the grid');
 assert.match(ctx,/evaluate\(state\)\.rentable/,'the lens is not reading the model');
 // It enters the release graph, or its published numbers can change with no
 // stamp moving.
 const rel=readFileSync(new URL('../scripts/release-id.mjs',import.meta.url),'utf8');
 assert.match(rel,/'lens\.js'/,'lens.js is not in SHARED');
 assert.match(rel,/['"]\.\/lens\.js['"]/,'lens.js is not stamped into the desks');
});

test('the lens reads in all three languages with no fallback and no Latin leak',()=>{
 for(const l of ['en','th','zh']){
  for(const k of ['lx.title','lx.formula','lx.sources','lx.assumed','lx.years','lx.let','lx.bench','lx.overflow',
   ...LENS_ORDER.map(c=>'lx.'+LENS_KEY[c]),'lx.fSettle','lx.fSubgrade','lx.fCoverage','lx.fMarket',
   ...LENSES[LENS_ORDER[0]].rows.map(([id])=>'lx.'+id)])
   assert.ok(t[l][k],`${l} omits ${k}`);
  // No language is allowed to inherit another's sentence.
  for(const c of LENS_ORDER)assert.notEqual(t[l]['lx.'+LENS_KEY[c]],'');
 }
 // The city lead is written, not machine-slipped: the three are different
 // sentences, and Thai and Chinese are not the English with different letters.
 assert.notEqual(t.en['lx.bkk'],t.th['lx.bkk']);
 assert.notEqual(t.th['lx.bkk'],t.zh['lx.bkk']);
 for(const l of ['th','zh'])for(const c of LENS_ORDER)
  assert.doesNotMatch(t[l]['lx.'+LENS_KEY[c]],/\b(the|and|of|this city)\b/i,`${l}/${c} reads like untranslated English`);
 // Every fact row resolves in every language.
 for(const l of ['en','th','zh'])for(const city of LENS_ORDER)
  for(const [id]of LENSES[city].rows)
   assert.ok(t[l]['lx.'+id],`${l} omits lx.${id}, used by ${city}`);
});
test('every city in the solar picker can be reached from the Place desk',()=>{
 /* Tokyo is in the solar set and in the OSM cityscape, and for a long time it
    was not in the Place desk's own list — so the city the reasoning was
    clearest about could not be clicked. A lens nobody can reach is a lens that
    does not exist, and this is the guard that says so. */
 const ctx=read('context.js');
 const order=/const ORDER=\[([^\]]+)\]/.exec(ctx);
 assert.ok(order,'the Place desk city list is gone');
 const list=order[1].split(',').map(s=>s.trim().replace(/^'|'$/g,''));
 assert.deepEqual([...list].sort(),Object.keys(cities).sort(),
  'the Place desk offers ' + list.join(',') + ' but the picker has ' + Object.keys(cities).join(','));
 for(const c of list)assert.ok(LENSES[c],c+' is clickable in the Place desk with no lens');
 // A city with no pilot site still renders its band, and says what is missing,
 // rather than replacing the whole desk with a one-line notice.
 assert.ok(ctx.includes('host.append(lensBand({key:state.city'),'the no-site branch drops the lens');
 assert.ok(!/if\(!home\)\{host\.replaceChildren\(el\('h2'/.test(ctx),'the no-site branch still short-circuits');
 // The three languages name Tokyo; a button with an undefined label is invisible.
 for(const l of ['en','th','zh']){
  const m=new RegExp("Object\\.assign\\(CONTEXT_I18N\\."+l+",\\{cityTky:'([^']+)'").exec(read('context.js'));
  assert.ok(m&&m[1].trim().length>1,`${l} does not name Tokyo in the desk`);
 }
});

test('no drawing clips a label or stacks two of them on top of each other',()=>{
 /* The viewBox guard above is necessary and not sufficient: every one of these
    three defects sat comfortably INSIDE the box it declared. A label clipped at
    y=2, an annotation running below the panel it belongs to, and a metre axis
    that was simply absent all passed "inside 0..width". So this one measures the
    text itself — its estimated box, its clearance from the top and bottom edges,
    and whether any two of them overlap. */
 const FS=9.5;                       // .lx-s font size
 const marks=(svg,w,h)=>[...svg.matchAll(/<text x="(-?[\d.]+)" y="(-?[\d.]+)"([^>]*)>([^<]*)</g)]
  .map(m=>{
   const anchor=/text-anchor="end"/.test(m[3])?'end':/text-anchor="middle"/.test(m[3])?'middle':'start';
   const tw=monoWidth(m[4],FS);
   const x=+m[1],l=anchor==='end'?x-tw:anchor==='middle'?x-tw/2:x;
   return {t:m[4],l,r:l+tw,y:+m[2],top:+m[2]-FS*0.78,bot:+m[2]+FS*0.24};
  });
 for(const city of LENS_ORDER)for(const l of['en','th','zh']){
  const svg=lensSVG(lensOf(city,CTX),TXT_FOR(l));
  const {w,h}=(()=>{const m=/viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);return {w:+m[1],h:+m[2]}})();
  const ms=marks(svg,w,h);
  assert.ok(ms.length>=4,`${city}/${l}: a drawing with ${ms.length} labels is not a drawing`);
  for(const m of ms){
   assert.ok(m.top>=0,`${city}/${l}: "${m.t}" is clipped at the top (baseline ${m.y})`);
   assert.ok(m.bot<=h,`${city}/${l}: "${m.t}" is clipped at the bottom (baseline ${m.y} of ${h})`);
   assert.ok(m.l>=-1&&m.r<=w+1,`${city}/${l}: "${m.t}" runs from ${m.l.toFixed(0)} to ${m.r.toFixed(0)} outside 0..${w}`);
  }
  for(let i=0;i<ms.length;i++)for(let j=i+1;j<ms.length;j++){
   const a=ms[i],b=ms[j];
   const ov=a.r>b.l+0.5&&b.r>a.l+0.5&&a.bot>b.top+0.5&&b.bot>a.top+0.5;
   assert.ok(!ov,`${city}/${l}: "${a.t}" and "${b.t}" are drawn on top of each other`);
  }
 }
 // And the metre axis the settlement chart was missing: three cities draw it,
 // and every one of them labels at least two levels.
 for(const city of ['bangkok','jakarta','hcmc']){
  const svg=lensSVG(lensOf(city,CTX),TXT);
  const nums=[...svg.matchAll(/<text x="[\d.]+" y="[\d.]+" class="lx-s" text-anchor="end">([\d.]+)<\/text>/g)].map(m=>+m[1]);
  assert.ok(nums.filter(n=>n>0).length>=2,`${city}: the settlement chart has no readable vertical axis`);
 }
 // Tokyo's annotations belong inside the ground panel, not below it.
 const tk=lensSVG(lensOf('tokyo',CTX),TXT);
 const gy=/<rect x="\d+" y="(\d+\.?\d*)" width="\d+" height="(\d+)" fill="var\(--dark\)"/.exec(tk);
 assert.ok(gy,'the ground panel is missing');
 const groundY=+gy[1],groundB=+gy[1]+ +gy[2];
 for(const m of marks(tk,300,164)){
  if(m.t.includes('km')||m.t.includes('m³/s')||m.t.includes('Ø'))
   assert.ok(m.bot<=groundB,`Tokyo: "${m.t}" hangs below the ground panel (bot ${m.bot.toFixed(1)} of ${groundB})`);
 }
 /* The tower must carry MASS. It used to be a 1px rectangle of fill="none" —
    the same value as the paper it sat on, with seven grey lines in it — which is
    the flat-picture complaint in its purest form, and which no amount of looking
    at the page would have turned into a unit test until it was written down. */
 const tw=/<rect x="[\d.]+" y="([\d.]+)" width="[\d.]+" height="([\d.]+)" fill="([^"]+)"/.exec(tk);
 assert.ok(tw,'the tower panel is missing');
 assert.notEqual(tw[3],'none','the tower is an outline, so it weighs exactly as much as the page');
 const tT=+tw[1],tB=+tw[1]+(+tw[2]);
 // A depth with no tick is a caption, so every printed depth carries a mark.
 const depths=[...tk.matchAll(/<text x="[\d.]+" y="[\d.]+" class="lx-s lx-on">−(\d+)</g)].map(m=>+m[1]);
 for(const d of depths)
  assert.ok(tk.includes(`<line x1="16" y1="${92+80*(d/80)}" x2="23" y2="${92+80*(d/80)}"`),
   `Tokyo: −${d} is printed with no depth mark beside it`);
 // And the break mark stays in the gap. It is an admission about the DRAWING,
 // so it must not overlap the building or the ground — it reads as damage.
 const br=/<path d="([^"]+)" fill="none"/.exec(tk);
 assert.ok(br,'the scale break is missing from the section');
 // Walk it. `l` carries a DELTA, and reading those as absolute positions makes
 // the break look like it reached 4 units ABOVE the top of the drawing.
 const bys=[];let cy=0;
 for(const c of br[1].matchAll(/([Ml])\s*(-?[\d.]+)\s+(-?[\d.]+)/g)){
  cy=c[1]==='l'?cy+ +c[3]:+c[3];
  bys.push(cy);
 }
 assert.ok(Math.min(...bys)>tB,`the scale break reaches up into the tower (${Math.min(...bys)} vs base ${tB})`);
 assert.ok(Math.max(...bys)<groundY,`the scale break reaches down into the ground (${Math.max(...bys)} vs ${groundY})`);
});

test('the type scale has real levels, so the eye has somewhere to land',()=>{
 /* "Almost all the text has equal weight" is measurable, and it was measurable
    while the first version shipped: six typographic roles running on three
    sizes, 10 / 11 / 13.5, with a ONE PIXEL step between the source list and the
    fact values. Nothing in that scale can be ranked by an eye. So the scale is
    read back out of the stylesheet and required to have separation — this is the
    guard for a complaint that otherwise sounds like taste and gets argued away. */
 const css=read('desks.css');
 const block=css.slice(css.indexOf('.lx-band{border'),css.indexOf('@media(max-width:900px){.lx-body'));
 // Roles declared with font-size AND roles declared with the font shorthand.
 const sizes=new Map();
 for(const m of block.matchAll(/([.#][\w-]+(?:\s+[\w.#-]+)?)\{([^}]*)\}/g)){
  const body=m[2];
  const a=/font-size:([\d.]+)px/.exec(body);
  const b=/font:(?:\d+\s+)?([\d.]+)px/.exec(body);
  const v=a?+a[1]:b?+b[1]:null;
  if(v)sizes.set(m[1].trim(),v);
 }
 const role=s=>{for(const [k,v]of sizes)if(k.includes(s))return v;return null};
 const lead=role('.lx-head p'),code=role('.lx-fx code'),val=role('.lx-rows dd'),
  gloss=role('.lx-fx span'),dt=role('.lx-rows dt'),meta=role('.lx-src');
 for(const [name,v]of Object.entries({lead,code,val,gloss,dt,meta}))
  assert.ok(Number.isFinite(v),`no measurable size for the ${name} role`);

 // The claim must dominate. 1.8x is the floor at which a reader's eye lands on
 // one line instead of scanning six.
 assert.ok(lead>=1.8*meta,`the claim is only ${(lead/meta).toFixed(2)}x the smallest text`);
 assert.ok(lead>=1.35*code,`the claim and the formula are too close (${(lead/code).toFixed(2)}x)`);
 assert.ok(code>gloss*1.15,`the formula is not distinct from its gloss (${code} vs ${gloss})`);
 // The numbers lead and their labels support — the old table had them inverted.
 assert.ok(val>dt*1.1,`the fact value is not bigger than its label (${val} vs ${dt})`);
 assert.ok(gloss>=dt,`the gloss has fallen below a row label`);
 // And the scale must not collapse again into a near-flat band.
 const all=[...sizes.values()];
 assert.ok(all.length>=6,`only ${all.length} distinct sizes for ${sizes.size} roles`);
 assert.ok(Math.max(...all)/Math.min(...all)>=2,`the whole scale spans only ${(Math.max(...all)/Math.min(...all)).toFixed(2)}x`);

 // Weight and colour carry the rest of the hierarchy, so they must actually be
 // used — size alone is not enough.
 assert.match(block,/font-weight:500/, 'the claim carries no weight');
 assert.match(block,/font:600 15px/, 'the formula carries no weight');
 assert.match(block,/--faint/, 'demoted text does not use the faint token');

 // The drawing must have mass. Outlined-only earth on a cream page is the same
 // value as the page, which is why it read as a second caption.
 assert.match(block,/\.lx-on\{fill:var\(--dim\)\}/,'no light type for labels on the dark ground');
 const tokyo=lensSVG(lensOf('tokyo',CTX),TXT);
 assert.match(tokyo,/fill="var\(--dark\)"/,'the ground is not a solid mass');
 assert.match(tokyo,/<circle[^>]+fill="var\(--accent\)"/,'the bore is not a solid mark');
 for(const city of ['bangkok','kl','shenzhen']){
  const s2=lensSVG(lensOf(city,CTX),TXT);
  assert.match(s2,/fill="var\(--accent\)"(?!\s+fill-opacity)/,
   `${city}: the drawing has no solid ink — it is outline on paper and reads as text`);
 }
});
