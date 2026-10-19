/* The water lab claims numbers about pressure, energy and rain. Each claim is
   checked here against a hand calculation or a physical monotonicity, so a
   later edit that breaks the physics fails loudly instead of drawing nicely. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,evaluate,families} from '../dist/model.js';
import {servicesDesign} from '../dist/core.js';
import {WATER_METHOD as M,WATER_TEXT,headOf,barOf,pumpKWh,zonePlan,supplyDesign,simulateDay,
 rainFlow,stackCapacity,drainageDesign,diurnal,supplySentence,drainSentence,supplyVerdict,renderWaterLab} from '../dist/water.js';

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
