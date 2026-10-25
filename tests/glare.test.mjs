import test from 'node:test';import assert from 'node:assert/strict';
import {reflect,dot,groundHit,groundCosine,makeGrid,overlapAt,reflectance,facadeFacets,facetLean,glareStep,glareDay,sunAt,leanOffset,yearAdd,yearSummary,YEAR_DAYS,GLARE_TEXT,GLARE_DNI,renderGlareLab,glareMethodPayload,glareMethodSVG} from '../dist/glare.js';
import {defaults,families} from '../dist/model.js';
import {cities,solarPosition} from '../dist/solar.js';
const near=(a,b,tol=1e-9,msg='')=>assert.ok(Math.abs(a-b)<=tol,`${msg} ${a} vs ${b}`);
const unit=v=>{const l=Math.hypot(...v);return v.map(x=>x/l)};

test('reflection keeps length and mirrors the angle about the normal',()=>{
 const cases=[[[1,-2,-3],[0,1,0]],[[-.3,.4,-.8],unit([.2,-.7,.1])],[[0,0,-1],unit([1,1,1])]];
 for(const [d0,n]of cases){const d=unit(d0),r=reflect(d,n);
  near(Math.hypot(...r),Math.hypot(...d),1e-12,'|r|=|d|');
  near(dot(r,n),-dot(d,n),1e-12,'angle in = angle out');
  // r lies in the plane of d and n: (d × n)·r = 0
  const c=[d[1]*n[2]-d[2]*n[1],d[2]*n[0]-d[0]*n[2],d[0]*n[1]-d[1]*n[0]];near(dot(c,r),0,1e-12,'coplanar');
  near(Math.hypot(...reflect(r,n).map((x,i)=>x-d[i])),0,1e-12,'involution')}
});

test('a vertical south-facing facet at noon in Bangkok lands where the hand calculation says',()=>{
 const p=solarPosition({city:'bangkok',solarDate:'2026-12-21',solarTime:'12:00'});
 // Dec solstice: 90 − 13.76 − 23.44 ≈ 52.8° at solar noon; civil noon is ~16 min earlier.
 assert.ok(p.altitude>50&&p.altitude<54,'altitude '+p.altitude);
 assert.ok(p.azimuth>150&&p.azimuth<200,'sun in the south '+p.azimuth);
 const h=100,a=p.altitude*Math.PI/180,A=p.azimuth*Math.PI/180;
 const r=reflect([-p.vector.east,-p.vector.north,-p.vector.up],[0,-1,0]),g=groundHit([0,0,h],r);
 // Mirror in the plane y = 0: x keeps going the way the sun's ray went, y flips back south.
 near(g[0],-h*Math.sin(A)/Math.tan(a),1e-9,'x');
 near(g[1],h*Math.cos(A)/Math.tan(a),1e-9,'y');
 near(Math.hypot(...g),h/Math.tan(a),1e-9,'distance = h / tan(altitude)');
 assert.ok(g[1]<-70&&g[1]>-85,'about 76 m south of the face '+g[1]);
 // The same through the full facet pipeline: an untapered box, south face.
 const s={...defaults,family:'box',taper:1,twist:0,orientation:0};
 const geom=facadeFacets(s),beams=glareStep(geom,sunAt('bangkok','2026-12-21','12:00'),{rhoN:.13});
 const south=beams.filter(b=>b.kind==='ground'&&Math.abs(b.f.n[1]+1)<1e-9);
 assert.ok(south.length>=geom.K-1,'south face reflects to the ground');
 for(const b of south){const c=b.f.c;near(b.x,c[0]-c[2]*Math.sin(A)/Math.tan(a),1e-6);near(b.y,c[1]+c[2]*Math.cos(A)/Math.tan(a),1e-6)}
 assert.equal(groundHit([0,0,10],[0,.5,.1]),null,'rising rays never reach the ground');
});

test('a convex box never overlaps beams; a concave cross does',()=>{
 const box={...defaults,family:'box',taper:1,twist:0};
 for(const date of ['2026-03-20','2026-06-21','2026-12-21']){const r=glareDay(box,{city:'bangkok',date,frames:false});assert.ok(r.maxOverlap<=1,date+' box overlap '+r.maxOverlap);assert.equal(r.focus,null)}
 const cross=glareDay({...defaults,family:'cross'},{city:'bangkok',date:'2026-06-21',frames:false});
 assert.ok(cross.maxOverlap>1,'cross overlap '+cross.maxOverlap);
 assert.ok(cross.focus&&cross.focus.count>1&&Math.abs(cross.focus.W-GLARE_DNI*cross.focus.gain)<1e-6);
 assert.ok(cross.worst.W>=cross.focus.W,'peak is the brightest cell, overlapping or not');
 // A crown that leans outward (20 Fenchurch Street) focuses the box too.
 const lean=glareDay(box,{city:'bangkok',date:'2026-06-21',lean:15,frames:false});
 assert.ok(lean.maxOverlap>1,'overhang overlap '+lean.maxOverlap);
});

test('reflectance: frit and ρv scale proportionally; glancing angles rise to the City of London figures',()=>{
 near(reflectance(.2,1,0),.2,1e-12);near(reflectance(.2,1,.5),.1,1e-12);near(reflectance(.4,1,.25),.3,1e-12);
 for(const c of [1,.7,.3,.05])near(reflectance(.3,c,.4),.6*reflectance(.3,c,0),1e-12);
 const at=deg=>reflectance(.13,Math.cos(deg*Math.PI/180));
 near(at(45),.15,1e-9);near(at(60),.22,1e-9);near(at(75),.49,1e-9);near(at(90),1,1e-9);
 let prev=0;for(let d=0;d<=90;d+=5){const v=at(d);assert.ok(v>=prev-1e-12);prev=v}
 assert.ok(reflectance(.08,1)<reflectance(.4,1));
 assert.equal(reflectance(.2,1,2),0);assert.equal(reflectance(-1,1,0),0);
});

test('lean geometry: an overhang tilts the upper facets down, a taper tilts them up',()=>{
 const s={...defaults,family:'box',taper:1,twist:0};
 const out=facadeFacets(s,{lean:12}),top=out.facets.filter(f=>f.level===out.K-1),bot=out.facets.filter(f=>f.level===0);
 for(const f of top)assert.ok(facetLean(f)>9&&facetLean(f)<12.5,'top lean '+facetLean(f));
 for(const f of bot)assert.ok(facetLean(f)<1.5,'base lean '+facetLean(f));
 for(const f of facadeFacets({...s,taper:.7}).facets)assert.ok(facetLean(f)<0,'taper leans back');
 near(leanOffset(0,200,10),0);assert.ok(leanOffset(200,200,10)>0&&leanOffset(200,200,-10)<0);
 near(leanOffset(200,200,10),-Math.log(Math.cos(10*Math.PI/180))/(10*Math.PI/180/200),1e-9);
});

test('finite outputs for every family in every city',()=>{
 for(const city of Object.keys(cities))for(const family of Object.keys(families)){
  const r=glareDay({...defaults,family,city},{city,date:'2026-09-23',frames:false,stepMin:30});
  for(const v of [r.maxOverlap,r.reach,r.beyond,r.sky,r.anyGround])assert.ok(Number.isFinite(v),`${city}/${family}`);
  if(r.worst)for(const v of [r.worst.W,r.worst.x,r.worst.y,r.worst.count])assert.ok(Number.isFinite(v),`${city}/${family} worst`);
  for(const f of r.faces)assert.ok(Number.isFinite(f.ground)&&Number.isFinite(f.bearing));
  assert.ok(r.hours.every(Number.isFinite));
 }
});

test('a frame-producing day and a sampled year stay consistent',()=>{
 const s={...defaults,family:'petal'},d=glareDay(s,{city:'jakarta',date:'2026-06-21'});
 assert.ok(d.frames.length>40&&d.frames.length<100);
 for(const f of d.frames){assert.ok(/^\d\d:\d\d$/.test(f.time));for(const b of f.beams)assert.ok(Number.isFinite(b.x)&&Number.isFinite(b.y))}
 const t=yearAdd({},d);assert.equal(t.days,1);const y=yearSummary(t);
 assert.ok(Number.isFinite(y.ground)&&y.ground>=0&&Number.isFinite(y.area));assert.equal(YEAR_DAYS.length,24);
});

test('GLARE_TEXT has identical keys in English, Thai and Chinese',()=>{
 const shape=o=>Object.keys(o).sort().map(k=>Array.isArray(o[k])?k+'['+o[k].length+']':typeof o[k]==='object'?k+'{'+shape(o[k])+'}':k).join(',');
 const en=shape(GLARE_TEXT.en);
 for(const lang of ['th','zh'])assert.equal(shape(GLARE_TEXT[lang]),en,lang);
 const walk=o=>{for(const v of Object.values(o))typeof v==='object'?walk(v):assert.ok(typeof v==='string'&&v.length)};walk(GLARE_TEXT);
 for(const k of Object.keys(cities))assert.ok(GLARE_TEXT.en.cityNames[k]);
 // The template slots must survive translation.
 const slots=s=>(s.match(/\{\w+\}/g)||[]).sort().join();
 for(const k of Object.keys(GLARE_TEXT.en))if(typeof GLARE_TEXT.en[k]==='string')for(const lang of ['th','zh'])assert.equal(slots(GLARE_TEXT[lang][k]),slots(GLARE_TEXT.en[k]),lang+'.'+k);
 assert.ok(!/ฉัน|เรา|ข้าพเจ้า|ผม/.test(JSON.stringify(GLARE_TEXT.th)),'Thai copy has no first person');
});

test('the renderer never throws, with or without a DOM',()=>{
 assert.doesNotThrow(()=>renderGlareLab());
 assert.doesNotThrow(()=>renderGlareLab({host:null,state:defaults,lang:'xx',active:true}));
 assert.doesNotThrow(()=>renderGlareLab({host:{},state:defaults,lang:'th',active:true}));
});

/* ── the method, drawn ──────────────────────────────────────────────────────
   The paragraph that explained the reflection and the summation is now a
   drawing. These guards read the EMITTED SHEET, not the source: a sheet that
   has quietly drifted from the arithmetic looks perfectly fine on screen, and
   the only thing that catches it is a number read back off the paper and
   compared with the number the lab computed. */

/* The notes on a sheet, with their wrapped lines joined back together. A note
   that wraps is still ONE note, and the resolver lays it out as one. */
function sheetNotes(svg){
 const raw=[...svg.matchAll(
  /<text x="([-\d.]+)" y="([-\d.]+)"[^>]*font-size="([\d.]+)"[^>]*text-anchor="(\w+)"[^>]*>([^<]*)<\/text>/g)]
  .map(m=>({x:+m[1],y:+m[2],size:+m[3],anchor:m[4],s:m[5]}));
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
   else{runs.push(cur);cur=[g[i]]}}
  runs.push(cur);
  return runs.map(run=>({x:run[0].x,y:run[0].y,size:run[0].size,anchor:run[0].anchor,
   lines:run.map(r=>r.s),text:run.map(r=>r.s).join(' ')}));
 });
}
/* The bar's segments: the only group of rectangles that share a top and a
   bottom edge. Read back off the markup, so a drawing that stops drawing the
   bar cannot pass. */
function barSegments(svg){
 const rects=[...svg.matchAll(/<path d="M([-\d.]+) ([-\d.]+) H([-\d.]+) V([-\d.]+) H[-\d.]+ Z"/g)]
  .map(m=>({x0:+m[1],y0:+m[2],x1:+m[3],y1:+m[4]}));
 const groups=new Map();
 for(const r of rects){
  const k=r.y0+'|'+r.y1;
  if(!groups.has(k))groups.set(k,[]);
  groups.get(k).push(r);
 }
 let best=null;
 for(const g of groups.values()){
  if(g.length<2)continue;
  const w=g.reduce((a,b)=>a+(b.x1-b.x0),0);
  if(!best||w>best.w)best={w,g};
 }
 return best?best.g.sort((a,b)=>a.x0-b.x0).map(r=>r.x1-r.x0):[];
}
/* Where a note sits on the sheet: the box its text actually occupies. */
const noteBox=n=>{
 const w=Math.max(...n.lines.map(l=>[...l].length*n.size*.6));
 const x=n.anchor==='middle'?n.x-w/2:n.anchor==='end'?n.x-w:n.x;
 return {x0:x,x1:x+w,top:n.y-0.75*n.size,
  bot:n.y+(n.lines.length-1)*n.size*1.2+0.25*n.size};
};

const SHEET_STATES=[
 ['bangkok, June solstice',{...defaults},'bangkok','2026-06-21',null],
 ['bangkok, December solstice',{...defaults},'bangkok','2026-12-21',null],
 ['tokyo, June solstice',{...defaults},'tokyo','2026-06-21',null],
 ['a box leaning out',{...defaults,family:'box',taper:1,twist:0},'bangkok','2026-06-21',15],
 ['a cruciform',{...defaults,family:'cross'},'bangkok','2026-06-21',null],
];
const sheetDays=SHEET_STATES.map(([name,s,city,date,lean])=>
 ({name,day:glareDay(s,{city,date,lean})}));

test('the method sheet states the numbers the lab actually computed',()=>{
 for(const {name,day} of sheetDays){
  const pay=glareMethodPayload(day);
  assert.ok(pay,`${name}: no payload`);
  // The payload is the lab's own peak cell, taken apart — not a second run.
  const src=day.focus||day.worst;
  assert.equal(pay.peak,src.W,`${name}: the peak is not the lab's peak`);
  assert.equal(pay.count,src.count,`${name}: the count is not the lab's count`);
  assert.equal(pay.time,src.time,`${name}: the time is not the lab's time`);
  assert.equal(pay.parts.length,src.count,`${name}: ${pay.parts.length} beams for ${src.count}`);
  const sum=pay.parts.reduce((a,b)=>a+b.W,0);
  assert.ok(Math.abs(sum-pay.peak)<0.01,`${name}: the beams total ${sum}, not ${pay.peak}`);
  const svg=glareMethodSVG(pay,{lang:'en'});
  assert.ok(svg.includes('<svg'),`${name}: the method must be an svg`);
  assert.doesNotMatch(svg,/NaN|undefined|Infinity/,`${name}: a non-number reached the drawing`);
  const notes=sheetNotes(svg);
  // The sheet is a drawing, not a caption with a picture beside it: it has to
  // carry its own notes, and the three laws have to be ON it.
  assert.ok(notes.length>=11,`${name}: only ${notes.length} notes on the sheet`);
  const flat=t=>t.replace(/\s+/g,' ').trim();
  for(const law of ['law1','law2','law3']){
   const want=flat(GLARE_TEXT.en.mth[law]);
   assert.ok(notes.some(n=>flat(n.text).includes(want)),`${name}: ${law} is not drawn on the sheet`);
  }
  const nums=notes.flatMap(n=>[...n.text.matchAll(/-?\d+(?:\.\d+)?/g)].map(x=>+x[0]));
  const has=(v,tol)=>nums.some(n=>Math.abs(n-v)<=tol);
  assert.ok(has(pay.peak,0.6),`${name}: the peak ${pay.peak} is not on the sheet`);
  assert.ok(has(pay.count,0),`${name}: the beam count is not on the sheet`);
  assert.ok(has(pay.dist,0.6),`${name}: the distance ${pay.dist} is not on the sheet`);
  assert.ok(has(pay.cell,0),`${name}: the cell size is not on the sheet`);
  assert.ok(has(pay.dni,0),`${name}: the DNI is not on the sheet`);
  assert.ok(has(pay.gainSum,0.006),`${name}: the projected reflectance sum is not on the sheet`);
  assert.ok(has(pay.main.theta,0.06),`${name}: the incidence angle is not on the sheet`);
  assert.ok(has(pay.sun.altitude,0.6),`${name}: the sun's altitude is not on the sheet`);
  for(const part of pay.parts){
   assert.ok(has(part.rho,0.006),`${name}: rho ${part.rho} is not on the sheet`);
   assert.ok(has(part.cosGround,0.006),`${name}: ground cosine is not on the sheet`);
   assert.ok(has(part.W,0.6),`${name}: the beam's ${part.W} W/m² is not on the sheet`);
  }
  // And the bar is in proportion: each segment as long as its share of the peak.
  const widths=barSegments(svg);
  assert.equal(widths.length,pay.parts.length,`${name}: the bar must be split into ${pay.parts.length}`);
  const tot=widths.reduce((a,b)=>a+b,0);
  for(let i=0;i<pay.parts.length;i++){
   const want=pay.parts[i].W/pay.peak*tot;
   assert.ok(Math.abs(widths[i]-want)<0.9,`${name}: bar segment ${i} is ${widths[i]} wide, not ${want.toFixed(2)}`);
  }
 }
});

test('the method sheet is drawn for every language, from the same numbers',()=>{
 for(const {name,day} of sheetDays){
  const pay=glareMethodPayload(day);
  for(const lang of ['en','th','zh']){
   const svg=glareMethodSVG(pay,{lang});
   assert.ok(svg.includes('<svg'),`${name}/${lang}: no sheet`);
   assert.doesNotMatch(svg,/NaN|undefined|Infinity/,`${name}/${lang}: a non-number reached the drawing`);
   assert.ok(svg.includes('aria-label='),`${name}/${lang}: the sheet must describe itself`);
   assert.equal(svg.match(/aria-label="([^"]*)"/)[1],GLARE_TEXT[lang].mth.aria,
    `${name}/${lang}: the aria label is not the one from the dictionary`);
   const notes=sheetNotes(svg);
   const nums=notes.flatMap(n=>[...n.text.matchAll(/-?\d+(?:\.\d+)?/g)].map(x=>+x[0]));
   assert.ok(nums.some(n=>Math.abs(n-pay.peak)<=0.6),`${name}/${lang}: the peak is not on the sheet`);
   assert.ok(nums.some(n=>Math.abs(n-pay.count)<=0),`${name}/${lang}: the beam count is not on the sheet`);
  }
 }
});

test('the sheet annotation can be read: no note on another, none cut off',()=>{
 for(const {name,day} of sheetDays){
  const pay=glareMethodPayload(day);
  for(const lang of ['en','th','zh']){
   const svg=glareMethodSVG(pay,{lang});
   const vb=svg.match(/viewBox="([^"]+)"/);
   assert.ok(vb,`${name}/${lang}: no viewBox`);
   const [vx,,vw]=vb[1].split(/\s+/).map(Number);
   const notes=sheetNotes(svg);
   for(let i=0;i<notes.length;i++)for(let j=i+1;j<notes.length;j++){
    const a=noteBox(notes[i]),b=noteBox(notes[j]);
    if(a.x1<=b.x0||b.x1<=a.x0)continue;
    if(a.bot<=b.top||b.bot<=a.top)continue;
    assert.fail(`${name}/${lang}: "${notes[i].text}" printed on "${notes[j].text}"`);
   }
   for(const n of notes){
    const b=noteBox(n);
    assert.ok(b.x0>=vx-0.5,`${name}/${lang}: "${n.text}" cut off at the left`);
    assert.ok(b.x1<=vx+vw+0.5,`${name}/${lang}: "${n.text}" cut off at the right`);
   }
   // And the same check with the width a CJK glyph ACTUALLY has: one em, not
   // the .6 em the layout engine assumes for its monospace face. A Chinese
   // label is a third wider than the box reserved for it, and a label that
   // runs past the frame is a label the browser clips in silence.
   const adv=s=>[...s].reduce((a,ch)=>a+(/[㐀-鿿豈-﫿]/.test(ch)?1:0.6),0);
   for(const n of notes){
    const w=Math.max(...n.lines.map(l=>adv(l)*n.size));
    const x=n.anchor==='middle'?n.x-w/2:n.anchor==='end'?n.x-w:n.x;
    assert.ok(x>=vx-0.5,`${name}/${lang}: "${n.text}" runs off the left of the frame`);
    assert.ok(x+w<=vx+vw+0.5,`${name}/${lang}: "${n.text}" runs off the right of the frame`);
   }
  }
 }
});

test('the method prose really did shrink to a caption',()=>{
 assert.ok(GLARE_TEXT.en.m1.length<=260,`en m1 is ${GLARE_TEXT.en.m1.length} characters`);
 assert.ok(GLARE_TEXT.th.m1.length<=260,`th m1 is ${GLARE_TEXT.th.m1.length} characters`);
 assert.ok(GLARE_TEXT.zh.m1.length<=110,`zh m1 is ${GLARE_TEXT.zh.m1.length} characters`);
 for(const l of ['en','th','zh'])assert.ok(GLARE_TEXT[l].m1.trim().length>20,`${l} m1 is empty`);
});

test('the method drawing is translated, and the Chinese carries its own words',()=>{
 const CJK=/[㐀-鿿豈-﫿]/;
 const keysOf=o=>Object.entries(o).flatMap(([k,v])=>v&&typeof v==='object'?keysOf(v).map(x=>k+'.'+x):[k]).sort();
 const en=keysOf(GLARE_TEXT.en.mth);
 assert.ok(en.length>=10,'the method drawing needs its own vocabulary');
 for(const l of ['en','th','zh'])assert.deepEqual(keysOf(GLARE_TEXT[l].mth),en,`${l}: the method vocabulary differs`);
 const get=(l,k)=>k.split('.').reduce((o,x)=>o[x],GLARE_TEXT[l].mth);
 for(const l of ['en','th','zh'])for(const k of en)assert.ok(get(l,k).trim().length,`${l} ${k} is empty`);
 for(const l of ['en','th'])for(const k of en)
  assert.doesNotMatch(get(l,k),CJK,`${l} ${k} contains CJK`);
 for(const k of en)
  assert.match(get('zh',k),CJK,`zh ${k} falls back to Latin: "${get('zh',k)}"`);
 // The template slots have to survive the translation. A language may drop a
 // REPEATED slot — the Chinese sheet says the angle once where the English
 // says it twice — but it may never invent a slot the source does not have.
 const slots=s=>(s.match(/\{\w+\}/g)||[]);
 for(const k of en)for(const l of ['th','zh']){
  const have=slots(get(l,k)),want=slots(get('en',k));
  for(const s of have)assert.ok(want.includes(s),`${l}.${k}: the slot ${s} is not in the English`);
 }
});

test('every word on the sheet comes out of that language\'s dictionary',()=>{
 // The sheet's own vocabulary: the method block, the compass and the units.
 // A word that is not in here is a word somebody typed into the drawing.
 const words=lang=>{
  const out=new Set();
  const add=s=>{
   if(typeof s!=='string')return;
   for(const t of s.replace(/\{\w+\}/g,' ').split(/[\s,;|:，、。；：]+/)){
    const w=t.replace(/^[()\[\].,;]+|[()\[\].,;]+$/g,'').toLowerCase();
    if(w)out.add(w);
   }
  };
  const walk=v=>{if(typeof v==='string')add(v);else if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')Object.values(v).forEach(walk)};
  walk(GLARE_TEXT[lang].mth);
  for(const c of GLARE_TEXT[lang].compass)add(c);
  for(const u of ['h','m','w'])add(GLARE_TEXT[lang][u]);
  return out;
 };
 const isWord=t=>/[A-Za-zÀ-ɏͰ-Ͽ]/.test(t);
 for(const {name,day} of sheetDays){
  const pay=glareMethodPayload(day);
  for(const lang of ['en','th','zh']){
   const svg=glareMethodSVG(pay,{lang});
   const dict=words(lang);
   for(const n of sheetNotes(svg))for(const t of n.text.split(/[\s,;|:，、。；：]+/)){
    const w=t.replace(/^[()\[\].,;]+|[()\[\].,;]+$/g,'').toLowerCase();
    if(!w||!isWord(w))continue;
    assert.ok(dict.has(w),`${name}/${lang}: "${w}" is not in the dictionary`);
   }
  }
 }
});

test('the sheet is drawn in the drafting vocabulary, and claims nothing it cannot',()=>{
 const svg=glareMethodSVG(glareMethodPayload(sheetDays[0].day),{lang:'en'});
 assert.ok(svg.includes('<svg class="dsec"'),'the drawing must be a drafting sheet');
 for(const pat of ['d-conc','d-wool','d-earth'])assert.ok(svg.includes(`id="${pat}"`),`${pat} is not in the sheet's defs`);
 assert.doesNotMatch(svg,/linearGradient|radialGradient|<filter|box-shadow|rx=|ry=/,
  'the house sheet has no gradients, no filters, no shadows and no rounded corners');
 // And it says what the method computes, not what it proves.
 const words=sheetNotes(svg).map(n=>n.text).join(' ').toLowerCase();
 for(const rx of [/is safe/,/approved/,/code compliant/,/guarantees?/,/proves?/])
  assert.doesNotMatch(words,rx,`the sheet overclaims: ${rx}`);
});

/* A DOM small enough to read. The desk renderers were never invoked by the
   suite, so a desk could throw on the first line of its body and every test
   would stay green. This stub runs it for real and reads the drawing back
   out of the tree. */
function stubNode(tag){
 const n={tagName:String(tag||'').toUpperCase(),childNodes:[],attrs:{},_t:'',_h:'',
  className:'',id:'',htmlFor:'',type:'',value:'',min:'',max:'',step:'',inputMode:'',hidden:false,dataset:{},style:{},
  isConnected:false,clientWidth:0,clientHeight:0,
  classList:{add(){},remove(){},toggle(){},contains(){return false}},
  querySelector(){return stubNode('div')},closest(){return null},focus(){},click(){},insertBefore(){},
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

test('the lab renders the drawing, not a paragraph',()=>{
 const host=stubNode('div'),real=globalThis.document,realRaf=globalThis.requestAnimationFrame;
 globalThis.document={createElement:t=>stubNode(t),createElementNS:(ns,t)=>stubNode(t),
  createTextNode:t=>({textContent:t}),getElementById:()=>null,activeElement:{id:''}};
 globalThis.requestAnimationFrame=()=>0;
 try{
  for(const lang of ['en','th','zh']){
   renderGlareLab({host,state:defaults,lang,active:true});
   const boxes=walk(host,n=>String(n._h).includes('<svg'));
   assert.equal(boxes.length,1,`${lang}: the lab must draw the method`);
   assert.ok(boxes[0]._h.includes('<svg class="dsec"'),`${lang}: the drawing must be a drafting sheet`);
   // The glare page already has two figures — the plan and the section — so
   // the method's figure is the one the drawing actually sits in.
   const figs=walk(host,n=>n.tagName==='FIGURE'&&walk(n,m=>String(m._h).includes('<svg')).length>0);
   assert.equal(figs.length,1,`${lang}: the drawing must sit in a figure of its own`);
   const caps=walk(figs[0],n=>n.tagName==='FIGCAPTION');
   assert.equal(caps.length,1,`${lang}: the figure must carry a caption`);
   assert.equal(caps[0].textContent,GLARE_TEXT[lang].m1);
   // The sheet and the page must carry the SAME peak: the drawing is made
   // from the lab's own result, not from a second run of the same day.
   const outs=walk(host,n=>n.tagName==='DD');
   assert.ok(outs.length>=8,`${lang}: the lab must report its readouts`);
   const shown=Number(String(outs[0].textContent).replace(/[^\d.]/g,''));
   assert.ok(Number.isFinite(shown),`${lang}: the page does not report a peak`);
   const onSheet=sheetNotes(boxes[0]._h)
    .flatMap(n=>[...n.text.matchAll(/-?\d+(?:\.\d+)?/g)].map(x=>+x[0]));
   assert.ok(onSheet.some(v=>Math.abs(v-shown)<0.6),
    `${lang}: the page says ${shown}, and that number is not on the sheet`);
  }
 }finally{globalThis.document=real;globalThis.requestAnimationFrame=realRaf}
});
