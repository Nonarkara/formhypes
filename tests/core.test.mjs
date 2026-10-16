/* The core section is the one drawing on this site that claims a number, so the
   numbers have to survive being checked.

   Everything below comes out of a named published method, and the guard is that
   the method is still named. A section that cannot say how it was sized is a
   picture of a core; a section that says "CIBSE Guide D" and then disagrees with
   it is worse. The physics that cannot be argued with is also guarded: gravity
   takes wastewater down, so the drain's flow must run down and the others up. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,evaluate} from '../dist/model.js';
import {coreOf,coreSVG,carTracks,CORE_METHOD,CORE_SRC} from '../dist/core.js';
const dist=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');
const net=evaluate({...defaults}).rentable;

test('the lift group meets the interval the standard asks for',()=>{
 for(const floors of [12,24,48,72,96]){
  const s={...defaults,floors,height:4.1};
  const {lift}=coreOf(s,net*floors/defaults.floors);
  assert.ok(lift.interval<=CORE_METHOD.intervalMax,
   `${floors} floors: up-peak interval ${lift.interval}s exceeds the ${CORE_METHOD.intervalMax}s in ISO 8100-32 — the zoning is not doing its job`);
 }
});

test('more floors means more cars, and never fewer zones than the method needs',()=>{
 let last={zones:0,cars:0};
 for(const floors of [8,16,24,32,48,64,80]){
  const {lift}=coreOf({...defaults,floors,height:4.1},net*floors/defaults.floors);
  assert.ok(lift.cars>=last.cars,`${floors} floors produced fewer cars than ${floors/2}`);
  assert.ok(lift.cars>=lift.zones*1,`${floors} floors: ${lift.zones} zones with ${lift.carsPerZone} car each`);
  last=lift;
 }
});

test('a car is never faster than the speed the figure claims',()=>{
 const {lift}=coreOf(defaults,net);
 assert.equal(lift.carSpeed,CORE_METHOD.carSpeed);
 // The travel time must be the time to cross a zone at that speed, not a number
 // picked to look plausible on the drawing.
 const s={...defaults},rise=s.floors*s.height,k=(312-24)/rise;
 const zoneMeters=lift.zoneFloors*s.height;
 const honest=zoneMeters/lift.carSpeed;
 assert.ok(Math.abs(lift.travelTime-honest)<honest*0.35,
  `stated travel ${lift.travelTime}s but a zone is ${zoneMeters.toFixed(0)}m at ${lift.carSpeed}m/s = ${honest.toFixed(0)}s — the drawing would be lying about its own speed`);
});

test('gravity is not negotiable: wastewater falls, the rest rise',()=>{
 const css=dist('style.css');
 // Each riser carries its own complete rule, so a class can be read directly.
 // They used to share a grouped selector, where anything matching
 // '.core-flow-air' could land on the group's declarations and report the
 // drain's stroke as the vent's — which is exactly what a guard did.
 const rule=n=>new RegExp(`(?:^|[},\\n])\\s*\\.${n}\\{([^}]*)\\}`,'m').exec(css);
 const up=rule('core-flow-up'),down=rule('core-flow-down'),air=rule('core-flow-air');
 assert.ok(up&&down&&air, 'every riser must have a rule of its own');
 assert.match(down[1],/animation:[^;}]*\breverse\b/,
  'the drain must run the opposite way to the supply — it carries water downward');
 assert.doesNotMatch(up[1],/\breverse\b/,'the supply rises; it is not reversed');
 assert.match(up[1],/stroke:\s*#f59e0b/,'rising water carries the accent');
 assert.match(down[1],/stroke:\s*#f59e0b/,'both water directions carry the accent');
 assert.match(air[1],/stroke:\s*#8b918d/,'the vent must read as air, not water');
 assert.match(air[1],/stroke-dasharray:\s*2 6/,
  'air is a fine dash and water a long one — they must not look alike');
 for(const [n,r] of Object.entries({up,down,air}))
  assert.match(r[1],/animation:[^;}]*infinite/, n+' must loop — a riser that stops is a broken drawing');
});

test('the pipes cost nothing to read, and stop for a reader who asked them to',()=>{
 const css=dist('style.css');
 const motion=css.match(/@media\s*\(prefers-reduced-motion:reduce\)\{([^}]*)\}/g)||[];
 assert.ok(motion.some(m=>/core-flow/.test(m)),
  'no reduced-motion rule — the section would keep moving for a reader who asked it not to');
 // The pipes must be CSS, not a JS loop: a requestAnimationFrame per riser is
 // four timers running for a drawing most readers never look at.
 const core=dist('core.js');
 const risers=(core.match(/core-flow-(up|down|air)/g)||[]).length;
 const raf=(core.match(/requestAnimationFrame/g)||[]).length;
 assert.ok(raf<=2,`${raf} animation frames in core.js — the pipes belong in CSS`);
 assert.ok(risers>=3,'the bay must draw all four risers');
});

test('the section names its method and does not claim a compliance result',()=>{
 const app=dist('app.js');
 assert.ok(app.includes('CORE_SRC.lifts')&&app.includes('CORE_SRC.water')&&app.includes('CORE_SRC.drains'),
  'the section must publish which method sized it');
 for(const [k,v]of Object.entries(CORE_SRC)){
  assert.ok(v&&v.length>6,`${k} is empty`);
 }
 const src=app.match(/CORE_SRC\.lifts/)?'ok':'';
 // No compliance language anywhere in the module. These are traffic and
 // plumbing sizing methods, not a check against a building code.
 const all=dist('core.js')+app;
 for(const word of ['complies','compliant','code-compliant','certified','approved']){
  assert.ok(!new RegExp(word,'i').test(all),
   `the core section says it is "${word}" — no code has been checked against anything here`);
 }
 assert.ok(src);
});

test('the section is a section: it spans the model rise and marks the level',()=>{
 const s={...defaults};
 const core=coreOf(s,net);
 const svg=coreSVG(s,core,{floor:24,lang:'en'});
 assert.match(svg,/viewBox="0 0 240 336"/);
 assert.match(svg,/id="section"/,'the section must be addressable so the animation can find it');
 assert.ok((svg.match(/id="core-car-/g)||[]).length>=2,'at least two cars must be drawn');
 assert.ok(svg.includes('stroke-dasharray'),'a riser must be dashed or its flow cannot be read');
 // The flow classes have to actually appear, or the CSS animates nothing.
 for(const c of ['core-flow-up','core-flow-down','core-flow-air'])
  assert.ok(svg.includes(c),`${c} is styled but never drawn`);
 // Every level line, so the reader can count floors against the schedule.
 assert.ok((svg.match(/font-family="IBM Plex Mono/g)||[]).length>=4);
 // And it must say what the drawing is in the language asked for.
 assert.ok(!coreSVG(s,core,{floor:1,lang:'en'}).includes(coreSVG(s,core,{floor:1,lang:'th'}).match(/aria-label="([^"]+)"/)[1].slice(0,20)),
  'the accessible description must differ per language');
});

test('the figures under the section are computed, never typed in',()=>{
 const app=dist('app.js');
 // Every row reads a value out of the computed object. A literal in the row
 // table is a number that will not move when the model does.
 const rows=app.match(/const rows=\[[\s\S]*?\];/);
 assert.ok(rows,'the facts table is missing');
 for(const m of rows[0].matchAll(/\['(cx\.[a-z]+)',([^\]]+)\]/g)){
  assert.ok(!/^\s*['\"]?\d/.test(m[2]),
   `${m[1]} is a literal (${m[2].trim()}) — every figure on the section must be computed`);
 }
});
test('the car motion is valid SMIL, or it silently does nothing',()=>{
 const s={...defaults},core=coreOf(s,net);
 const tracks=carTracks(s,core);
 assert.equal(tracks.length,2,'two shafts are cut, so two tracks');
 for(const t of tracks){
  assert.ok(t.travel>0&&t.dwell>0,'a track must have both a run and a door dwell');
  assert.ok(t.yTop<=t.yBot,'a car travels up: yTop is above yBot in drawing space');
  // The bug this guard exists for: the cycle closes exactly at c, so writing
  // the last keyTime twice produces keyTimes "…;1;1". A duplicate there makes
  // the animation invalid and the cars sit still — with the drawing looking
  // entirely fine. Every count must increase strictly.
  const c=2*t.travel+2*t.dwell;
  const kt=[0,t.dwell/c,(t.dwell+t.travel)/c,(2*t.dwell+t.travel)/c,1];
  assert.equal(kt.length,5,'five stops: run, dwell, run, dwell, run');
  for(let i=1;i<kt.length;i++)
   assert.ok(kt[i]>kt[i-1],`keyTimes must increase strictly: ${kt[i]} follows ${kt[i-1]}`);
  assert.equal(kt[kt.length-1],1,'the last keyTime must be exactly 1');
 }
 // The other invisible failure: a car group written as translate(0,NaN).
 // SVG discards a non-numeric transform without raising anything, so the car
 // renders at the untransformed origin, outside its zone, while the animate-
 // Transform inside it runs perfectly. Nothing else in the build can see it —
 // the figure still draws, the counts still compute, the markup is well formed.
 const svg=coreSVG(s,core,{floor:1,lang:'en'});
 assert.doesNotMatch(svg,/NaN|undefined|Infinity/,'the section drawing contains a non-finite number');
 for(const m of svg.matchAll(/transform="([^"]*)"/g))
  assert.doesNotMatch(m[1],/NaN|undefined|Infinity/,'a transform is not a number: '+m[1]);
 // Each car group must sit on the floor of its own zone, inside the viewBox.
 for(const m of svg.matchAll(/id="core-car-(\d+)" transform="translate\(0,([-\d.]+)\)"/g)){
  const y=Number(m[2]);
  assert.ok(Number.isFinite(y),'car '+m[1]+' has a non-finite position');
  assert.ok(y>=0&&y<=336,`car ${m[1]} is drawn at y=${y}, outside the 0-336 viewBox`);
 }
 // And the two cars belong to different zones, so they must not share a spot.
 const ys=[...svg.matchAll(/id="core-car-\d+" transform="translate\(0,([-\d.]+)\)"/g)].map(m=>Number(m[1]));
 assert.equal(ys.length,2);
 assert.notEqual(ys[0],ys[1],'two cars in two zones must not be drawn at the same height');
});
