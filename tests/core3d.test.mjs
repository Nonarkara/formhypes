/* The core is now a VOLUME and not a picture of one, which means most of what
   can go wrong is arithmetic rather than markup. Every guard below checks a
   number against a hand calculation or an invariant that would be visibly
   false if broken — not a string, and not a shape.

   The claims being protected, in order of how expensive they are to get wrong:

     · the core's plan is banded without overlap at EVERY core size. This is not
       cosmetic. The first layout put the escalator bank in the same square
       metre of plan as the lift shafts, and on a 14 m core the two happened not
       to overlap — so a 14 m model looked perfect while every core under 12 m
       was drawing an escalator through a lift car. A guard that only checks the
       default model checks the one case that cannot fail.

     · the escalator's run is quoted per storey of rise, because that is what
       decides how high it reaches, and the boundary case has to come out right.
       Two storeys of 4.1 m is 14.2 m of core, and 2 × 7.1 evaluates to
       14.200000000000001 — so the exact fit came back as not fitting and the
       reach was a whole storey wrong.

     · a car's height is a pure function of time, stays inside its own zone, and
       takes the stated travel time to cross it. A drawing that shows a faster
       car than the traffic calculation sized would be two drawings disagreeing
       about one building. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {defaults,evaluate,stack} from '../dist/model.js';
import {coreOf,liftDesign,CORE_METHOD} from '../dist/core.js';
import {CORE3,LIFT3,coreBands,escRun,podiumReach,escLayout,shaftLayout,carZ,coreScene} from '../dist/core3d.js';
const dist=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');
const CASES=[6,8,10,12,14,16,18,22,26,30,40];

test('the core plan is banded without overlap at every core size',()=>{
 for(const core of CASES){
  const s={...defaults,core};
  const B=coreBands(s);
  const eps=1e-9;
  assert.ok(B.stair.y1<=B.shaftBand.y0+eps,
   `core ${core}: the stair (to ${B.stair.y1}) runs into the shafts (from ${B.shaftBand.y0})`);
  assert.ok(B.shaftBand.y1<=B.bank.y0+eps,
   `core ${core}: the shafts (to ${B.shaftBand.y1}) run into the bank (from ${B.bank.y0})`);
  assert.ok(B.bank.y1<=core/2-CORE3.wall+eps,
   `core ${core}: the bank crosses the inner face of the core wall`);
  assert.ok(B.lobby.depth>=-eps,`core ${core}: the lift lobby has negative depth`);
 }
});

test('every element of the plan sits inside the core square',()=>{
 const eps=1e-9;
 for(const core of CASES){
  const s={...defaults,core},c=core/2,m=coreOf(s,evaluate(s).rentable,stack(s).filter(l=>l.gfa).length);
  const S=shaftLayout(s,m.lift),E=escLayout(s);
  for(const sh of S.shafts){
   assert.ok(sh.x0>=-c&&sh.x1<=c&&sh.y0>=-c&&sh.y1<=c,`core ${core}: a shaft leaves the core square`);
   assert.ok(sh.car.x>=sh.x0&&sh.car.x+sh.car.w<=sh.x1+eps,`core ${core}: the car is wider than its own shaft`);
  }
  for(const u of E.units)
   assert.ok(u.x0>=-c&&u.x1<=c+eps&&u.y0>=-c&&u.y1<=c,`core ${core}: an escalator leaves the core square`);
  assert.ok(E.y0>=B_of(core).shaftBand.y1-1e-9,`core ${core}: the bank overlaps the shaft band`);
 }
});
const B_of=core=>coreBands({...defaults,core});

test('the escalator run is a hand-checkable 30° incline',()=>{
 // 4.1 / tan(30°) = 7.1014 m of run per storey, checked against the literal
 // rather than against escRun itself — a guard that recomputes the function's own
 // formula proves nothing.
 assert.ok(Math.abs(escRun(4.1)-4.1/Math.tan(Math.PI/6))<1e-12,'run is not rise over tangent');
 assert.ok(Math.abs(escRun(4.1)-7.1014)<0.001,`run for one storey is ${escRun(4.1)}, expected 7.1014`);
 assert.equal(CORE3.escIncl,30,'the inclination constant is no longer 30 degrees');
 assert.ok(Math.abs(Math.atan(Math.tan(CORE3.escIncl*Math.PI/180))-Math.PI/6)<1e-12,'the inclination is not 30 degrees');
 // A rise quoted at 6 m — the EN 115-1 cap that belongs to the 35° case, not to
 // a bank running continuously at 30° — has to disagree, or the number is being
 // used for the wrong thing.
 assert.ok(escRun(6)>escRun(4.1),'a six-metre flight is not a longer run than a 4.1 m storey');
});

test('the reach is the largest number of storeys that fit, with no boundary error',()=>{
 const s={...defaults,core:14};
 const r=podiumReach(s);
 assert.ok(Math.abs(r.available-13.4)<0.01,`clear width is ${r.available}, expected s.core - 2 × wall`);
 // 13.4 / 7.096 = 1.888 — one storey, and one core wider buys the second.
 assert.equal(r.reach,1);
 // The core that reaches two storeys: 2 × 7.096 + 0.6 = 14.79 m.
 assert.ok(Math.abs(r.coreForNext-14.8)<0.05,`core for one more storey is ${r.coreForNext} m`);
 assert.ok(r.nextLevels>=r.reach,`a bigger core reaches fewer storeys: ${r.nextLevels} < ${r.reach}`);
 /* The exact-fit case. A core sized so that two storeys of run land on it to
    within floating-point noise must report two, not one. 2 × 4.1/tan(30°)
    is 14.200000000000001 m of clear width and the unrounded comparison came
    back one storey short. */
 const exact=2*escRun(4.1)+2*CORE3.wall;
 const got=podiumReach({...defaults,core:exact}).reach;
 assert.equal(got,2,
  `a core sized exactly for two storeys of run (${exact.toFixed(4)} m) reaches ${got}, not 2`);
 assert.equal(podiumReach({...defaults,core:exact-0.01}).reach,1,
  'a core a centimetre narrower still reaches two');
});

test('a core too narrow for its own traffic says so',()=>{
 const s={...defaults,core:14,floors:129};
 const m=evaluate(s);
 const L=liftDesign(s,m.rentable);
 const S=shaftLayout(s,L);
 assert.ok(S.short>0,`a ${s.floors}-floor core reports no shortfall with ${L.carsPerZone} cars demanded`);
 assert.equal(S.count+S.short,S.wanted,'the shortfall does not account for the shortfall');
 // And it is never drawn by shrinking the car to fit.
 for(const sh of S.shafts)
  assert.ok(sh.x1-sh.x0>=CORE3.carW,`a shaft is narrower than a ${CORE3.carW} m car`);
});

test("a car's height is pure, bounded by its zone, and takes the stated travel time",()=>{
 const s={...defaults,floors:129};
 const L=liftDesign(s,evaluate(s).rentable);
 const zf=L.zoneFloors;
 for(let i=0;i<L.zones;i++){
  /* Each car's OWN zone. Checking every car against zone zero's ceiling reports
     a perfectly correct lift system as broken from the second group upward —
     which is how a guard teaches you to ignore it. */
  const top=Math.min(s.floors,(i+1)*zf)*s.height, base=i*zf*s.height;
  for(let t=0;t<400;t+=1.7){
   const c=carZ(s,L,i,t);
   assert.ok(c.z>=base-1e-9&&c.z<=top+1e-9,
    `car ${i} at t=${t} is at ${c.z.toFixed(2)} m, outside its own zone ${base.toFixed(1)}–${top.toFixed(1)} m`);
   const again=carZ(s,L,i,t).z;
   assert.ok(Object.is(c.z,again)||Math.abs(c.z-again)<1e-12,
    `the same time gives ${c.z} then ${again}`);
  }
  // Travel time across the zone must match what liftDesign reports to the reader.
  const tr=carZ(s,L,i,0).travel;
  assert.ok(Number.isFinite(tr),`travel is not finite for car ${i}`);
  /* liftDesign() reports the time to cross a FULL zone, because that is what
     the interval was computed on. The top group of a 129-floor building holds
     three fewer floors than the rest, so its cars are genuinely quicker — and
     the guard has to know that, or it reports a correct lift system as broken on
     the last group. A car slower than the quoted figure would be the real fault:
     it would mean the drawing showed a slower lift than the traffic sum assumed. */
  const full=L.zoneFloors*s.height/L.carSpeed;
  assert.ok(tr<=full+1e-6,
   `car ${i} takes ${tr.toFixed(2)} s, slower than the ${full.toFixed(2)} s full zone`);
  assert.ok(Math.abs(full-L.travelTime)<0.51,
   `the quoted ${L.travelTime} s is not the ${full.toFixed(2)} s a full zone takes`);
 }
});

test('the escalator only claims what the core can hold',()=>{
 for(const core of CASES){
  const s={...defaults,core};
  const E=escLayout(s);
  assert.equal(E.units.length,E.fit?E.reach:0,
   `core ${core}: ${E.units.length} escalator units with fit=${E.fit} and reach=${E.reach}`);
  if(E.fit)assert.ok(E.width>=CORE3.escModule*1.5-1e-9,
   `core ${core}: the bank is ${E.width} m wide, less than one up-and-down pair`);
 }
});

test('the scene is built from the layout, not beside it',()=>{
 const s={...defaults,floors:48};
 const m=coreOf(s,evaluate(s).rentable,48);
 const sc=coreScene(s,m,3);
 const S=shaftLayout(s,m.lift),E=escLayout(s);
 assert.equal(sc.shafts,S.count,'the scene draws a different number of shafts than the layout makes');
 assert.equal(sc.solids.filter(o=>o.kind==='escalator').length,E.units.length,
  'the scene draws a different number of escalator segments than the layout makes');
 assert.equal(sc.cars.length,S.count,'the scene draws a different number of cars than there are shafts');
 // Every solid is finite. A missing constant turned every shaft coordinate into
 // NaN while the count still read plausibly, so this is checked on the artifact.
 for(const o of sc.solids)
  for(const k of ['x0','y0','x1','y1','z0','z1'])
   assert.ok(Number.isFinite(o.b[k]),`a solid has a non-finite ${k}: ${JSON.stringify(o.b)}`);
 // Every solid lies inside the core square in plan.
 const c=s.core/2;
 for(const o of sc.solids){
  assert.ok(o.b.x0>=-c-1e-9&&o.b.x1<=c+1e-9,`a solid leaves the core in x: ${JSON.stringify(o.b)}`);
  assert.ok(o.b.y0>=-c-1e-9&&o.b.y1<=c+1e-9,`a solid leaves the core in y: ${JSON.stringify(o.b)}`);
 }
 // And the window is the model's own rise, not a second idea of the height.
 assert.ok(Math.abs(sc.window.total-coreOf(s,evaluate(s).rentable,48).services.rise)<1e-6,
  'the scene measures a different height than the core calculation does');
});

test('the escalator incline is drawn at 30 degrees, not at the sheet own proportions',()=>{
 const s={...defaults,core:22};
 const E=escLayout(s);
 const u=E.units[0];
 assert.ok(u,'a 22 m core must reach the bank');
 const deg=Math.atan((u.z1-u.z0)/(u.x1-u.x0))*180/Math.PI;
 assert.ok(Math.abs(deg-CORE3.escIncl)<0.01,`the drawn incline is ${deg.toFixed(2)}°, not ${CORE3.escIncl}°`);
 // And one unit of rise is one storey of it.
 assert.ok(Math.abs((u.z1-u.z0)-s.height)<0.01,'a segment does not rise exactly one storey');
});

test('the core view is wired into the sheet, not described in a comment',()=>{
 const html=dist('index.html'),app=dist('app.js');
 assert.match(html,/id="coreView"/,'the core button is not on the sheet');
 // It must be a mode with its own camera, not a flag nobody reads.
 assert.match(app,/view==='core'/,'no branch reads the core view');
 assert.match(app,/coreScene\(/,'the scene builder is never called');
 assert.match(app,/requestAnimationFrame/,'the cars are never animated');
 // The loop must stop. A rAF that never ends is a battery burning behind a view
 // nobody is looking at.
 assert.match(app,/cancelAnimationFrame/,'the core loop can be stopped');
 // And the release graph has to know about the module, or its bytes can change
 // without moving a stamp.
 const rel=dist('../scripts/release-id.mjs');
 assert.match(rel,/'core3d\.js'/,'core3d.js is not hashed by the stamper');
 const sh=/const SHARED\s*=\s*\[([\s\S]*?)\]/.exec(rel);
 assert.ok(sh&&sh[1].includes("'core3d.js'"),'core3d.js is missing from SHARED');
 const ia=/const IN_APP\s*=\s*\[([\s\S]*?)\]/.exec(rel);
 assert.ok(ia&&ia[1].includes("'./core3d.js'"),'core3d.js is missing from IN_APP, so app.js ships a stale pin');
 // The stamp in app.js must be the actual hash of the bytes it points at.
 const pin=/from '\.\/core3d\.js\?v=([0-9a-f]+)'/.exec(app);
 assert.ok(pin,'app.js does not pin core3d.js');
 assert.equal(pin[1],createHash('sha256').update(dist('core3d.js')).digest('hex').slice(0,10),
  'app.js pins a core3d.js that is not the file being served');
});

test('the core view names its parts in all three languages, with no fallback',()=>{
 const i=dist('i18n.js');
 const langBlock=l=>{
  const start=i.indexOf('const '+l+'={');
  const rest=i.slice(start+8);
  const next=/^const (en|th|zh)=\{/m.exec(rest.slice(1));
  return next?rest.slice(1,next.index+1):rest;
 };
 /* Keys are in two places: the long `const en={…}` blocks, and an
    Object.assign(t.en,…) tail for the ones added later. Slicing the block alone
    reports perfectly good strings as missing — which is how half this file's own
    guards already went wrong once. Each language is looked up in its block first
    and in its own tail second. */
 const TAIL={en:'Object.assign(t.en,',th:'Object.assign(t.th,',zh:'Object.assign(t.zh,'};
 const tail=l=>{const at=i.indexOf(TAIL[l]);return at<0?'':i.slice(at,at+3000)};
 /* Both quote styles are in use in this file — the long language blocks are
    single-quoted and the Object.assign tail is not — so the lookup accepts
    either. Pinning one quote style is how a guard reports half a file as
    missing. */
 const grab=(l,k)=>{
  const re=new RegExp(`["']${k.replace('.','\\.')}["']\\s*:\\s*["']([^"']*)["']`);
  return (re.exec(langBlock(l))||[])[1]??(re.exec(tail(l))||[])[1];
 };
 for(const k of ['v.core','v.coreKey','v.coreZone','v.coreCaption','v.coreDrag']){
  for(const l of ['en','th','zh']){
   const m=grab(l,k);
   assert.ok(m,`${k} is missing from ${l}`);
   assert.ok(m[1].trim().length>0,`${k} in ${l} is empty`);
  }
 }
 // The button is a button.
 for(const l of ['en','th','zh']){
  const m=/"v\.core"\s*:\s*"([^"]*)"/.exec(i.slice(i.indexOf('Object.assign(t.'+l)));
  assert.ok(m&&m[1].length<=6,`v.core in ${l} is a phrase, not a button: ${m&&m[1]}`);
 }
 // No CJK in Thai or English, no Latin in Chinese.
 for(const k of ['v.coreKey','v.coreCaption','v.coreDrag']){
  assert.ok(!/[一-鿿]/.test(grab('en',k)[1]),`${k} in English contains CJK`);
  assert.ok(!/[一-鿿]/.test(grab('th',k)[1]),`${k} in Thai contains CJK`);
  assert.ok(!/[A-Za-z]/.test(grab('zh',k)[1]),`${k} in Chinese fell back to Latin`);
 }
 // Every label the view draws has to exist somewhere the reader can be shown it.
 for(const k of ['cx.lgShaft','cx.lgStair','cx.lgEsc','cx.lgCar'])
  for(const l of ['en','th','zh'])assert.ok(grab(l,k),`${k} is missing from ${l}`);
});

test('the two tables of escalator constants cannot drift apart',()=>{
 /* core.js carries CORE_METHOD for the arithmetic and core3d.js carries CORE3
    for the geometry, and both hold the inclination, the step width and the
    speed. Two tables of the same number is two chances to change one of them,
    and the drawing would then claim an angle the calculation never used. They
    have to agree, and the guard is the agreement. */
 assert.equal(CORE_METHOD.escInclMax,CORE3.escIncl,'the inclination disagrees between the two tables');
 assert.equal(CORE_METHOD.escPerMin,CORE3.escPerMin,'the capacity disagrees between the two tables');
 assert.equal(CORE_METHOD.escSpeed,CORE3.escSpeed,'the speed disagrees between the two tables');
 assert.equal(CORE_METHOD.escStepMM,CORE3.escStepMM,'the step width disagrees between the two tables');
 // And the lift's motion has one home. carZ used to reach into CORE_METHOD for
 // the speed and the dwell while CORE_METHOD reaches into core3d for the reach,
 // which is a circular import between two modules that each hold half an
 // argument.
 assert.equal(CORE_METHOD.carSpeed,LIFT3.carSpeed,'the car speed is stated twice');
 assert.equal(CORE_METHOD.doorTime,LIFT3.doorTime,'the door time is stated twice');
 const core3d=dist('core3d.js');
 assert.ok(!/from '\.\/core\.js'/.test(core3d),'core3d.js imports core.js — the circular import is back');
 // The figures still name the standard they come from.
 assert.match(dist('core.js'),/EN 115-1/,'the escalator figures no longer name their standard');
});