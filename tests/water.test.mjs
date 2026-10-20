/* The water lab claims numbers about pressure, energy and rain. Each claim is
   checked here against a hand calculation or a physical monotonicity, so a
   later edit that breaks the physics fails loudly instead of drawing nicely. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,evaluate,families} from '../dist/model.js';
import {servicesDesign} from '../dist/core.js';
import {WATER_METHOD as M,WATER_TEXT,headOf,barOf,pumpKWh,zonePlan,supplyDesign,simulateDay,
 rainFlow,stackCapacity,drainageDesign,diurnal,supplySentence,drainSentence,supplyVerdict,renderWaterLab,
 waterMethodPayload,waterMethodSVG} from '../dist/water.js';

const near=(a,b,tol,msg)=>assert.ok(Math.abs(a-b)<=tol,`${msg}: ${a} vs ${b}`);
// 48 storeys of 4.1 m with no plant levels: highest outlet at 47 × 4.1 = 192.7 m.
const plain={...defaults,program:'custom',floors:48,height:4.1,garden:'none'};

test('one pressure zone spans (Pmax − Pmin)/ρg — 45.9 m for 5.5/1.0 bar',()=>{
 near(headOf(4.5),4.5e5/(1000*9.81),1e-9,'head of 4.5 bar');
 near(barOf(headOf(3.2)),3.2,1e-12,'bar ↔ m round trip');
 const floors=Array.from({length:48},(_,i)=>({z:i*4.1,w:1}));
 const {band,zones}=zonePlan(floors,5.5,1.0);
 near(band,45.872,0.01,'band');
 // 192.7 / 45.87 = 4.2 → 5 zones, as servicesDesign() in core.js says.
 assert.equal(zones.length,5);
 assert.equal(zones.length,servicesDesign(plain).zones,'agrees with the core section');
 for(const z of zones)assert.ok(z.zTop-z.zBot<=band+1e-9,'no zone exceeds the band');
 assert.equal(zones.reduce((a,z)=>a+z.count,0),48,'every floor is in exactly one zone');
});

test('hand-checked pump energy for strategy A',()=>{
 // 100 m³ lifted 100 m at η = 0.5: 1000·9.81·100·100/0.5 J = 196.2 MJ = 54.5 kWh.
 near(pumpKWh(100,100,0.5),54.5,0.01,'E = ρgVH/η');
 const met=evaluate(plain),d=supplyDesign(plain,met,{pop:1000,lpd:50,eta:0.5});
 near(d.V,50,1e-9,'1000 people × 50 L');
 // Roof tank surface = max(roof + 2 m, top outlet + Pmin head).
 near(d.TA,Math.max(d.H+M.tankRise,192.7+headOf(1)),1e-6,'roof tank level');
 near(d.A.energy,pumpKWh(50,d.TA*(1+M.friction),0.5),1e-9,'A lifts everything to the roof');
 assert.ok(d.A.waste>0.3,'A burns a large share of its lift in PRVs');
 assert.equal(d.B.waste,0,'B lifts each zone only as far as it needs');
 assert.ok(d.C.energy<d.A.energy,'staged tanks pump less than roof downfeed');
 assert.equal(d.B.tanks.length,0);assert.equal(d.B.elevated,0);
 near(d.A.elevated,50*M.hours/24,1e-9,'one day of storage aloft by default');
 // A zone fed through a PRV still sees no more than Pmax at its lowest floor.
 for(const k of ['A','B','C'])for(const z of d[k].zones){
  const p=z.prv?d.inp.pmin+barOf(z.zTop-z.zBot):barOf(z.src-z.zBot);
  assert.ok(p<=d.inp.pmax+1e-9,`${k}: ${p} bar at the bottom of a zone`);
 }
});

test('outage: gravity storage keeps water flowing, boosters stop at once',()=>{
 const d=supplyDesign(plain,evaluate(plain),{outage:6,hours:24});
 const sim=simulateDay(d);
 assert.equal(sim.series.B.kept,0,'no stored water aloft');
 assert.equal(sim.series.A.kept,6);assert.equal(sim.series.C.kept,6);
 const dry=simulateDay(supplyDesign(plain,evaluate(plain),{outage:6,hours:0}));
 assert.equal(dry.series.A.kept,0,'with no storage a gravity system is dry too');
 // A tiny tank runs dry inside a long outage.
 const short=simulateDay(supplyDesign(plain,evaluate(plain),{outage:16,hours:2}));
 assert.ok(short.series.A.kept>0&&short.series.A.kept<16,`2 h of storage: kept ${short.series.A.kept} h`);
 assert.equal(supplyVerdict(d,sim).best!=='B',true,'the verdict never picks a strategy that runs dry');
 near(diurnal('office').reduce((a,b)=>a+b,0),1,1e-12,'profile sums to one day');
});

test('Q = i·A/3600 and the Wyly–Eaton stack capacity',()=>{
 assert.equal(rainFlow(100,3600),100);
 near(rainFlow(150,1000),41.667,0.001,'150 mm/h on 1000 m²');
 // BS EN 12056-3 tabulates about 10.5 L/s for a 100 mm pipe at f = 0.33.
 near(stackCapacity(100),10.5,0.4,'DN100 gravity');
 near(stackCapacity(150),30.2,1.5,'DN150 gravity');
 assert.ok(stackCapacity(150,'siphonic')>stackCapacity(150),'full-bore beats a third full');
 const r=drainageDesign(defaults,{i:100});
 near(r.Q,100*(r.roof+r.wall)/3600,1e-9,'roof catchment incl. half the parapet');
 assert.ok(r.n>=2,'never fewer than two stacks');
 const flood=drainageDesign(defaults,{i:250,n:1,dn:100,dur:30});
 near(flood.pond,(flood.Q-flood.cap)*30*60/flood.roof,1e-9,'excess L/m² = mm');
 assert.ok(flood.pond>0);
});

test('monotonic: more height, more rain, wider window',()=>{
 let last=0,lastE=0;
 for(const floors of [12,24,48,70]){
  const s={...plain,floors},d=supplyDesign(s,evaluate(s),{pop:2000});
  assert.ok(d.zones.length>=last,'more floors never means fewer zones');last=d.zones.length;
  assert.ok(d.A.energy>lastE,'same people higher up costs more energy');lastE=d.A.energy;
 }
 const s=plain,met=evaluate(s);
 assert.ok(supplyDesign(s,met,{pmax:6}).zones.length<=supplyDesign(s,met,{pmax:4}).zones.length,'a wider window needs no more zones');
 let q=0,p=-1;
 for(const i of [25,50,100,150,200,250]){const r=drainageDesign(defaults,{i,n:2});assert.ok(r.Q>q);assert.ok(r.pond>=p);q=r.Q;p=r.pond}
});

test('every family at 12, 48 and 70 floors gives finite numbers',()=>{
 for(const family of Object.keys(families))for(const floors of [12,48,70]){
  const s={...defaults,family,floors},met=evaluate(s);
  const d=supplyDesign(s,met,{outage:4}),sim=simulateDay(d),r=drainageDesign(s,{});
  for(const k of ['A','B','C'])for(const v of [d[k].energy,d[k].head,d[k].pipeBar,d[k].waste,d[k].mass,d[k].pumps,sim.series[k].kept,sim.series[k].unserved])
   assert.ok(Number.isFinite(v),`${family}/${floors} ${k}: ${v}`);
  for(const v of [r.roof,r.Q,r.cap,r.n,r.pond,r.detention,r.Qf])assert.ok(Number.isFinite(v),`${family}/${floors} drain ${v}`);
  for(const lang of ['en','th','zh']){
   assert.ok(!/undefined|NaN|\{\w+\}/.test(supplySentence(d,sim,lang)),supplySentence(d,sim,lang));
   assert.ok(!/undefined|NaN|\{\w+\}/.test(drainSentence(r,lang)),drainSentence(r,lang));
  }
 }
});

test('i18n: identical keys, no empty strings',()=>{
 const en=Object.keys(WATER_TEXT.en).sort();
 for(const lang of ['th','zh']){
  assert.deepEqual(Object.keys(WATER_TEXT[lang]).sort(),en,lang);
  for(const k of en)assert.ok(WATER_TEXT[lang][k].trim(),`${lang}.${k} empty`);
 }
 assert.ok(!/ฉัน|เรา|ข้าพเจ้า/.test(Object.values(WATER_TEXT.th).join(' ')),'no first person in Thai');
});

test('renderWaterLab never throws, even without a DOM',()=>{
 assert.doesNotThrow(()=>renderWaterLab({}));
 assert.doesNotThrow(()=>renderWaterLab({host:null,state:defaults}));
});

/* ── the method, drawn ──────────────────────────────────────────────────────
   The water lab's method was a paragraph: how the pressure window cuts the
   tower into zones, and what becomes of the head the pumps put in before it
   reaches the tap. A paragraph cannot show a PROPORTION, and a proportion is
   the whole argument.

   These guards read the EMITTED SHEET, not the source. A drawing that has
   quietly drifted from the arithmetic looks perfectly fine on screen, and the
   only thing that catches it is a number read back off the paper and compared
   with the number the lab computed. */
const LANGS=['en','th','zh'];
/* The house's own number format, spelled out here so the guard cannot drift
   from the sheet by agreeing with itself. */
const enGB=(v,d=0)=>Number.isFinite(v)?(+v).toLocaleString('en-GB',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const fillT=(t,o)=>String(t).replace(/\{(\w+)\}/g,(_,k)=>o[k]??'');

/* The notes on a sheet, with their wrapped lines joined back together. A note
   that wraps is still ONE note, and the resolver lays it out as one. */
function sheetNotes(svg){
 const raw=[...svg.matchAll(
  /<text x="([-\d.]+)" y="([-\d.]+)"[^>]*font-size="([\d.]+)"[^>]*text-anchor="(\w+)"[^>]*>([^<]*)<\/text>/g)]
  .map(m=>({x:+m[1],y:+m[2],size:+m[3],anchor:m[4],s:m[5],rotated:/rotate\(-?\d/.test(m[0])}));
 const groups=new Map();
 for(const r of raw){
  const k=`${r.x}|${r.size}|${r.anchor}`;
  if(!groups.has(k))groups.set(k,[]);
  groups.get(k).push(r);
 }
 return [...groups.values()].flatMap(g=>{
  g.sort((a,b)=>a.y-b.y);
  const runs=[];let cur=[g[0]];
  for(let i=1;i<g.length;i++){
   if(Math.abs((g[i].y-g[i-1].y)-g[i-1].size*1.2)<0.01)cur.push(g[i]);
   else{runs.push(cur);cur=[g[i]]}
  }
  runs.push(cur);
  return runs.map(run=>({x:run[0].x,y:run[0].y,size:run[0].size,anchor:run[0].anchor,
   rotated:!!run[0].rotated,lines:run.map(r=>r.s),text:run.map(r=>r.s).join(' ')}));
 });
}
/* The energy bars: the widest group of cut rectangles that share a height —
   three rows of two segments each, the second segment of a row starting
   exactly where the first one ends. Read back off the markup, so a sheet
   that stops drawing the bar cannot pass. */
function barRows(svg){
 const rects=[...svg.matchAll(/<path d="M([-\d.]+) ([-\d.]+) H([-\d.]+) V([-\d.]+) H[-\d.]+ Z" fill="([^"]+)"/g)]
  .map(m=>({x0:+m[1],y0:+m[2],x1:+m[3],y1:+m[4],fill:m[5]}));
 const groups=new Map();
 for(const r of rects){
  const h=r.y1-r.y0;
  if(!groups.has(h))groups.set(h,[]);
  groups.get(h).push(r);
 }
 let best=null;
 for(const g of groups.values()){
  const w=g.reduce((a,b)=>a+(b.x1-b.x0),0);
  if(!best||w>best.w)best={w,g};
 }
 if(!best)return [];
 const rows=new Map();
 for(const r of best.g){
  if(!rows.has(r.y0))rows.set(r.y0,[]);
  rows.get(r.y0).push(r);
 }
 return [...rows.entries()].sort((a,b)=>a[0]-b[0]).map(([y,g])=>({y,segs:g.sort((a,b)=>a.x0-b.x0)}));
}
/* Where a note sits: the box its text actually occupies. A rotated dimension
   label is a vertical box, not a wide one. */
const noteBox=(n,adv)=>{
 const w=Math.max(...n.lines.map(l=>adv(l)*n.size));
 if(n.rotated){
  const half=w/2;
  return {x0:n.x-0.75*n.size,x1:n.x+0.25*n.size,top:n.y-half,bot:n.y+half};
 }
 const x=n.anchor==='middle'?n.x-w/2:n.anchor==='end'?n.x-w:n.x;
 return {x0:x,x1:x+w,top:n.y-0.75*n.size,bot:n.y+(n.lines.length-1)*n.size*1.2+0.25*n.size};
};
/* A CJK glyph is one em wide, not the .6 em the layout engine assumes for its
   monospace face. A Chinese label is a third wider than the box reserved for
   it, and a label that runs past the frame is one the browser clips in
   silence. */
const advMono=s=>[...s].reduce((a,c)=>a+(/[㐀-鿿豈-﫿]/.test(c)?1:0.6),0);
const advLatin=s=>[...s].length*0.6;

const DESIGNS=[
 {s:defaults,in:{}},
 {s:{...defaults,program:'custom',floors:12,height:4.1},in:{}},
 {s:{...defaults,program:'custom',floors:70,height:3.6},in:{}},
 {s:defaults,in:{use:'residential'}},
 {s:defaults,in:{pmax:6,pmin:0.8,pop:900}},
 {s:defaults,in:{hours:6}}
];
const design=o=>supplyDesign(o.s,evaluate(o.s),o.in);

test('the method sheet states the numbers the lab actually computed',()=>{
 const T=WATER_TEXT.en;
 for(const o of DESIGNS){
  const d=design(o),pay=waterMethodPayload(d);
  assert.ok(pay,`no payload for ${JSON.stringify(o.in)}`);
  const svg=waterMethodSVG(pay,{lang:'en'});
  assert.ok(svg.includes('<svg'),'the method must be an svg');
  assert.ok(svg.includes('aria-label='),'the sheet must describe itself');
  assert.doesNotMatch(svg,/NaN|undefined|Infinity/,'a non-number reached the drawing');
  const notes=sheetNotes(svg).map(n=>n.text);
  const has=t=>assert.ok(notes.includes(t),`"${t}" is not on the sheet for ${JSON.stringify(o.in)}`);
  // the height of the tower, the pressure window, the zone count and the band
  has(`${d.H.toFixed(1)} m`);
  has(fillT(T.mWindow,{a:d.inp.pmax.toFixed(1),b:d.inp.pmin.toFixed(1)}));
  has(fillT(T.zonesV,{n:d.zones.length,b:d.band.toFixed(1)}));
  // the demand the energy is spent on
  has(fillT(T.demandV,{p:enGB(d.pop),l:enGB(d.inp.lpd),v:enGB(d.V,1)}));
  // and each strategy's own energy and its own burnt share
  for(const k of ['A','B','C']){
   const st=d[k];
   has(fillT(T.mBarVal,{e:enGB(st.energy,1)}));
   has(fillT(T.mBarBurnt,{p:Math.round(st.waste*100)}));
  }
  // the storage: A and C hold water aloft, B holds none
  if(d.A.storageH>0)has(fillT(T.mStoreAC,{s:enGB(d.A.storageH)}));
  else has(T.mStoreNone);
  assert.equal(d.B.storageH,0,'B stores nothing, so the sheet may say so');
  assert.equal(d.A.storageH,d.C.storageH,'the sheet says A and C hold the same water aloft');
  has(T.mStoreB);
 }
});

test('the energy bar is in proportion, and the split is the lab\'s own waste figure',()=>{
 for(const o of DESIGNS){
  const d=design(o),pay=waterMethodPayload(d);
  const rows=barRows(waterMethodSVG(pay,{lang:'en'}));
  assert.equal(rows.length,3,`the sheet must draw three bars, found ${rows.length}`);
  const widths=rows.map(r=>r.segs.reduce((a,b)=>a+(b.x1-b.x0),0));
  const scale=Math.max(...widths);
  for(let i=0;i<3;i++){
   const st=pay.strats.find(s=>s.key==='ABC'[i]);
   assert.ok(st,`no payload for ${'ABC'[i]}`);
   const want=scale*st.energy/pay.maxE;
   assert.ok(Math.abs(widths[i]-want)<0.8,
    `${'ABC'[i]}: the bar is ${widths[i].toFixed(2)} wide, not ${want.toFixed(2)} (${st.energy} kWh/d)`);
   // the burnt head is the hatched segment, and it is the lab's own figure
   const hatched=rows[i].segs.filter(s=>s.fill.includes('d-wool'));
   const solid=rows[i].segs.filter(s=>s.fill.includes('var(--ink)'));
   assert.equal(hatched.length,st.waste>0?1:0,`'ABC'[i]}: ${st.waste} of the head is burnt`);
   assert.equal(solid.length,1,`'ABC'[i]}: the bar must have one solid segment`);
   const wb=hatched.reduce((a,b)=>a+(b.x1-b.x0),0);
   assert.ok(Math.abs(wb-widths[i]*st.waste)<0.8,
    `'ABC'[i]}: the burnt part is ${wb.toFixed(2)} wide, not ${(widths[i]*st.waste).toFixed(2)}`);
   assert.ok(Math.abs((solid[0].x1-solid[0].x0)-widths[i]*(1-st.waste))<0.8,
    `'ABC'[i]}: the useful part does not fill the rest of the bar`);
  }
 }
});

test('no two notes on the method sheet overlap, and none is cut off',()=>{
 // The house measure: the face is monospace with a .6 em advance, so a note's
 // width is its length. Two notes printed on one another are not "adjacent" —
 // they are unreadable.
 for(const o of DESIGNS){
  for(const lang of LANGS){
   const pay=waterMethodPayload(design(o));
   const svg=waterMethodSVG(pay,{lang});
   const box=svg.match(/viewBox="([^"]+)"/);
   assert.ok(box,`${lang}: no viewBox`);
   const [vx,,vw]=box[1].split(/\s+/).map(Number);
   const notes=sheetNotes(svg);
   assert.ok(notes.length>=15,`${lang}: the sheet carries almost no annotation`);
   for(let i=0;i<notes.length;i++)for(let j=i+1;j<notes.length;j++){
    const a=noteBox(notes[i],advMono),b=noteBox(notes[j],advMono);
    if(a.x1<=b.x0||b.x1<=a.x0)continue;
    if(a.bot<=b.top||b.bot<=a.top)continue;
    assert.fail(`${JSON.stringify(o.in)}/${lang}: "${notes[i].text}" printed on "${notes[j].text}"`);
   }
   for(const n of notes){
    const b=noteBox(n,advMono);
    assert.ok(b.x0>=vx-0.5,`${lang}: "${n.text}" cut off at the left`);
    assert.ok(b.x1<=vx+vw+0.5,`${lang}: "${n.text}" cut off at the right`);
   }
   // And no note may be printed ON the thing it names. The bars are the
   // sheet's main drawing, and a label that lands on one of them is a label
   // nobody can read. This is not a hypothetical: a Thai bar label that
   // wrapped put its second line inside the bar it names.
   const bars=barRows(svg);
   assert.ok(bars.length>0,`${lang}: the sheet draws no bar`);
   for(const n of notes){
    const b=noteBox(n,advMono);
    for(const row of bars)for(const seg of row.segs){
     if(b.x1<=seg.x0||seg.x1<=b.x0)continue;
     if(b.bot<=seg.y0||seg.y1<=b.top)continue;
     assert.fail(`${JSON.stringify(o.in)}/${lang}: "${n.text}" is printed on the bar`);
    }
   }
  }
 }
});

test('the method prose is a caption now, and the sheet carries the method',()=>{
 assert.ok(WATER_TEXT.en.m1.length<=260,`en m1 is ${WATER_TEXT.en.m1.length} characters`);
 assert.ok(WATER_TEXT.th.m1.length<=260,`th m1 is ${WATER_TEXT.th.m1.length} characters`);
 assert.ok(WATER_TEXT.zh.m1.length<=110,`zh m1 is ${WATER_TEXT.zh.m1.length} characters`);
 for(const l of LANGS)assert.ok(WATER_TEXT[l].m1.trim().length>20,`${l} m1 is empty`);
 // and no dense paragraph is left on the page either
 for(const l of LANGS)for(const k of ['note','noteDrain'])
  assert.ok(WATER_TEXT[l][k].length<=(l==='zh'?110:260),
   `${l} ${k} is still a paragraph (${WATER_TEXT[l][k].length} characters)`);
 // and the formula is on the sheet, not in a paragraph
 const pay=waterMethodPayload(design({s:defaults,in:{}}));
 const said=waterMethodSVG(pay,{lang:'en'}).replace(/<[^>]+>/g,' ');
 assert.ok(said.includes(WATER_TEXT.en.mFormula),'the energy formula is not on the sheet');
});

test('the method drawing is translated, and carries no English on a Thai or Chinese sheet',()=>{
 const CJK=/[㐀-鿿豈-﫿]/;
 const MK=Object.keys(WATER_TEXT.en).filter(k=>k.startsWith('m'));
 assert.ok(MK.length>=14,'the method drawing needs its own vocabulary');
 for(const l of LANGS)for(const k of MK)assert.ok(WATER_TEXT[l][k]&&WATER_TEXT[l][k].trim(),`${l} ${k} is empty`);
 for(const l of ['en','th'])for(const k of MK)
  assert.doesNotMatch(WATER_TEXT[l][k],CJK,`${l} ${k} contains CJK`);
 for(const k of MK)assert.match(WATER_TEXT.zh[k],CJK,`zh ${k} falls back to Latin: "${WATER_TEXT.zh[k]}"`);
 // and every WORD on the sheet comes out of that language's own dictionary
 for(const l of LANGS){
  const pay=waterMethodPayload(design({s:defaults,in:{}}));
  const svg=waterMethodSVG(pay,{lang:l});
  const blob=Object.values(WATER_TEXT[l]).join(' ');
  for(const n of sheetNotes(svg))for(const tok of n.text.split(/\s+/)){
   if([...tok].filter(c=>/\p{L}/u.test(c)).length<2)continue;
   assert.ok(blob.includes(tok),`${l}: the sheet says "${tok}", which is not in the dictionary`);
  }
 }
});

test('the sheet claims nothing it cannot claim, and is drawn in the house style',()=>{
 const BANNED=[/is safe/i,/approved/i,/code compliant/i,/guarantees?/i,/proves?/i];
 for(const lang of LANGS){
  const pay=waterMethodPayload(design({s:defaults,in:{}}));
  const svg=waterMethodSVG(pay,{lang});
  const said=svg.replace(/<[^>]+>/g,' ');
  for(const b of BANNED)assert.doesNotMatch(said,b,`${lang}: the sheet claims something it cannot`);
  // no gradients, no filters, no rounded corners, no hand-rolled geometry
  assert.doesNotMatch(svg,/gradient|<filter|feGaussian|feDropShadow/i);
  assert.doesNotMatch(svg,/<rect|<polygon|<polyline|<line\b|<image|<use\b/i);
  assert.doesNotMatch(svg,/rx="[1-9]|ry="[1-9]/);
 }
 const css=readFileSync(new URL('../dist/water.css',import.meta.url),'utf8');
 assert.doesNotMatch(css,/gradient/i);
 assert.doesNotMatch(css,/box-shadow:\s*(?!none)/);
 assert.doesNotMatch(css,/border-radius:\s*[1-9]/);
});

/* A DOM small enough to read. The lab renderers were never invoked by the
   suite, so a lab could throw on the first line of its body and every test
   would stay green. This stub runs it for real and reads the drawing back
   out of the tree. */
function stubNode(tag){
 const n={tagName:String(tag||'').toUpperCase(),childNodes:[],attrs:{},_t:'',_h:'',
  className:'',id:'',htmlFor:'',type:'',value:'',min:'',max:'',step:'',inputMode:'',hidden:false,
  isConnected:false,clientWidth:0,clientHeight:0,
  classList:{add(){},remove(){},toggle(){},contains(){return false}},
  querySelector(){return null},closest(){return null},focus(){},click(){},
  appendChild(c){this.childNodes.push(c);return c},
  get children(){return this.childNodes},
  append(...cs){for(const c of cs)this.childNodes.push(c)},
  replaceChildren(...cs){this.childNodes=[];if(cs.length)this.append(...cs)},
  contains(){return false},
  setAttribute(k,v){this.attrs[k]=v},
  getAttribute(k){return this.attrs[k]},
  addEventListener(){},removeEventListener(){},
  getContext(){return null},
  get textContent(){return this._t+this.childNodes.map(c=>c.textContent).join('')},
  set textContent(v){this._t=String(v);this.childNodes=[]},
  get innerHTML(){return this._h},
  set innerHTML(v){this._h=String(v)}};
 return n;
}
const walk=(node,pred,out=[])=>{if(pred(node))out.push(node);for(const c of node.childNodes)walk(c,pred,out);return out};

test('the lab draws the method sheet, not a paragraph',()=>{
 const host=stubNode('div');
 const real={document:globalThis.document,gcs:globalThis.getComputedStyle,raf:globalThis.requestAnimationFrame};
 globalThis.document={createElement:t=>stubNode(t),createElementNS:(ns,t)=>stubNode(t),
  createTextNode:t=>({textContent:t}),getElementById:()=>null,activeElement:{id:''}};
 globalThis.getComputedStyle=()=>({getPropertyValue:()=>''});
 globalThis.requestAnimationFrame=()=>0;globalThis.cancelAnimationFrame=()=>{};
 try{
  const m=evaluate(defaults);
  for(const lang of LANGS){
   renderWaterLab({host,state:defaults,metrics:m,lang,active:true});
   const boxes=walk(host,n=>String(n._h).includes('<svg'));
   assert.equal(boxes.length,1,`${lang}: the lab must draw the method`);
   assert.ok(boxes[0]._h.includes('<svg class="dsec"'),`${lang}: the drawing must be a drafting sheet`);
   const figs=walk(host,n=>n.tagName==='FIGURE');
   assert.equal(figs.length,1,`${lang}: the drawing must sit in a figure`);
   const caps=walk(host,n=>n.tagName==='FIGCAPTION');
   assert.equal(caps.length,1,`${lang}: the figure must carry a caption`);
   assert.equal(caps[0].textContent,WATER_TEXT[lang].m1);
  }
 }finally{
  globalThis.document=real.document;globalThis.getComputedStyle=real.gcs;
  globalThis.requestAnimationFrame=real.raf;
 }
});
