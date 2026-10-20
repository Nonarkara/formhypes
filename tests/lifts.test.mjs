import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,evaluate} from '../dist/model.js';
import {liftDesign,CORE_METHOD} from '../dist/core.js';
import {flightTime,travelPos,probableStops,highestReversal,rttFormula,groupRTT,shuttleRTT,awtCibse,sizeGroup,
 liftPlan,waitCurve,waitCurveDelta,skyCandidates,simulate,createSim,stepSim,simStats,timeScale,shaftArea,LIFTS_TEXT,LIFT_ASSUME,renderLiftsLab,
 liftsMethodSVG,liftsMethodPayload} from '../dist/lifts.js';

const near=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<=e,`${a} != ${b}`);

test('kinematics: trapezoid and triangle flight times, position reaches the end',()=>{
 near(flightTime(40,2,1),40/2+2/1);                 // reaches rated speed: d/v + v/a
 near(flightTime(4,5,1),2*Math.sqrt(4));            // never reaches 5 m/s in 4 m
 near(travelPos(40,2,1,flightTime(40,2,1)),40);
 near(travelPos(40,2,1,1),0.5);                     // ½·a·t²
 near(travelPos(40,2,1,5),2+2*3);                    // after accel, cruise
 assert.equal(flightTime(0,2,1),0);
});

test('probable stops and highest reversal floor match hand calculation (CIBSE Guide D)',()=>{
 // N = 10, P = 8: S = 10·(1 − 0.9^8) = 5.6953
 near(probableStops(10,8),10*(1-Math.pow(0.9,8)));
 near(probableStops(10,8),5.6953,1e-4);
 // H = 10 − Σ_{i=1}^{9} (i/10)^8
 let s=0;for(let i=1;i<10;i++)s+=Math.pow(i/10,8);
 near(highestReversal(10,8),10-s);
 near(highestReversal(10,8),9.3227,1e-3);
 assert.equal(probableStops(1,5),1);
 assert.ok(highestReversal(16,10.4)<16&&highestReversal(16,10.4)>14);
});

test('round trip, interval and handling capacity by hand',()=>{
 // RTT = 2·(E+H)·tv + (S+1)·ts + 2·P·tp
 near(rttFormula({H:9,S:6,E:0,tv:2,ts:5,P:10,tp:1.2}),2*9*2+7*5+2*10*1.2); // 36 + 35 + 24 = 95
 const df=4,v=2.5,a=1,td=4,P=10.4,N=12;
 const g=groupRTT({N,E:0,df,v,a,td,P});
 const tv=df/v,ts=flightTime(df,v,a)-tv+td;
 near(g.rtt,2*highestReversal(N,P)*tv+(probableStops(N,P)+1)*ts+2*P*1.2);
 // an upper zone adds exactly 2·E·tv for its express run
 const up=groupRTT({N,E:20,df,v,a,td,P});
 near(up.rtt-g.rtt,2*20*tv);
 // sizing: interval = RTT/L, handling = 300·P·L/RTT
 const sz=sizeGroup({rttOf:p=>groupRTT({N,E:0,df,v,a,td,P:p}).rtt,demand:60,cap:13,cars:4,auto:false});
 near(sz.interval,sz.rtt/4);near(sz.hc,300*0.8*13*4/sz.rtt);
 // shuttle: two full flights, two door cycles, two transfers per passenger
 near(shuttleRTT({d:100,v:5,a:1,td:4,P:10}),2*flightTime(100,5,1)+8+24);
});

test('Barney/Al-Sharif average wait approximation',()=>{
 near(awtCibse(30,0.4),0.4*30);
 near(awtCibse(30,0.8),(0.4+Math.pow(1.44-0.77,2))*30);
 assert.ok(awtCibse(30,0.8)>awtCibse(30,0.6));
});

test('the RTT formula reproduces the Core desk on the default tower (documented difference in inputs)',()=>{
 const m=evaluate(defaults),cd=liftDesign(defaults,m.rentable),M=CORE_METHOD;
 // liftDesign: H = S = N/2, E = 0, t_v = h/v, t_s = one-floor flight − t_v + doors, P = 0.8·13
 const N=cd.zoneFloors,P=M.carLoad*M.carRated;
 // liftDesign states its own t_v and t_s (CIBSE split); the formula must return its round trip.
 const rt=rttFormula({H:N/2,S:N/2,E:0,tv:cd.tv,ts:cd.ts,P,tp:M.transferTime});
 assert.equal(Math.round(rt),cd.rt);
 // At the Core desk's own speed the lab reproduces it; by default it starts at
 // the typical speed for the rise instead.
 const plan=liftPlan(defaults,{speed:cd.carSpeed},m);
 assert.equal(liftPlan(defaults,{},m).v,liftPlan(defaults,{},m).vTypical);
 // same population, same zone count, same car and speed defaults
 assert.equal(plan.popDefault,cd.population);assert.equal(plan.Z,cd.zones);
 assert.equal(plan.cap,M.carRated);assert.equal(plan.v,cd.carSpeed);
 assert.deepEqual(plan.coreDesk,{zones:cd.zones,cars:cd.carsPerZone,rt:cd.rt,interval:cd.interval});
 // the fuller inputs (probabilistic H, express run) can only lengthen the upper zone's trip
 const topZone=plan.groups[plan.groups.length-1];
 assert.ok(topZone.rtt>cd.rt,'upper zone round trip includes its express run');
 assert.ok(LIFTS_TEXT.en.coreDesk.includes('H = S = N/2'));
});

test('more cars never lengthen the CIBSE interval',()=>{
 const m=evaluate(defaults);
 for(const o of [{},{speed:5},{speed:5,sky:true},{dd:true},{dispatch:'destination'}]){
  let prev=Infinity;
  for(let c=1;c<=16;c++){const p=liftPlan(defaults,{...o,auto:false,cars:c},m);assert.ok(p.interval<=prev+1e-9,`${JSON.stringify(o)} cars ${c}`);prev=p.interval}
 }
 const curve=waitCurve(defaults,{speed:5},m,16);
 const finite=curve.filter(d=>Number.isFinite(d.awt));
 for(let i=1;i<finite.length;i++)assert.ok(finite[i].awt<=finite[i-1].awt+1e-9);
 for(let i=1;i<curve.length;i++)assert.ok(curve[i].ground>curve[i-1].ground);
 // with every group sized to CIBSE, extra cars still help less each time
 const dc=waitCurveDelta(defaults,{speed:5},m,-2,6),z=dc.findIndex(d=>d.x===0);
 assert.ok(Number.isFinite(dc[z].awt));
 for(let i=z+1;i<dc.length;i++){assert.ok(dc[i].awt<=dc[i-1].awt+1e-9);assert.ok(dc[i].ground>dc[i-1].ground)}
});

test('auto sizing meets the interval and the arrival rate',()=>{
 const m=evaluate(defaults),p=liftPlan(defaults,{speed:5,zones:4},m);
 for(const g of p.groups){assert.ok(g.interval<=30+1e-9);assert.ok(g.hcPct>=p.rate-1e-9)}
 assert.equal(p.verdict,'pass');
 const slow=liftPlan(defaults,{auto:false,cars:2},m);
 assert.equal(slow.verdict,'sat');
});

test('a sky lobby reduces shaft area above it and over the tower',()=>{
 const m=evaluate(defaults);
 for(const o of [{},{speed:5},{speed:5,zones:4}]){
  const p=liftPlan(defaults,{...o,sky:true},m);
  assert.ok(p.sky&&p.L>0);
  assert.ok(p.recoveredUpper>0,`upper floors recover area for ${JSON.stringify(o)}: ${p.recoveredUpper}`);
  assert.ok(p.recovered>0);
  const base=liftPlan(defaults,{...o,sky:false},m);
  let up=0,upB=0;for(let f=p.L+1;f<=p.top;f++){up+=p.shafts[f];upB+=base.shafts[f]}
  assert.ok(up<upB);
 }
 // snaps to the stored Petronas plant level (mechanical void at index 22)
 const c=skyCandidates(defaults);assert.ok(c.some(x=>x.f===22&&x.use==='plant'));
 assert.equal(liftPlan(defaults,{sky:true,skyLevel:21},m).L,22);
 // shaft area per car is the stated assumption
 near(shaftArea(13),6.05);
});

test('simulation is deterministic for a seed and responds to the seed',()=>{
 const m=evaluate(defaults),p=liftPlan(defaults,{speed:5},m);
 const a=simulate(p,{seed:11,duration:600}),b=simulate(p,{seed:11,duration:600}),c=simulate(p,{seed:12,duration:600});
 assert.deepEqual(a,b);
 assert.notDeepEqual(a.zs,c.zs);
 assert.ok(a.delivered>0&&a.arrived>=a.delivered);
 assert.ok(Number.isFinite(a.avg)&&Number.isFinite(a.p90)&&a.p90>=0);
 // arrivals at the chosen rate: ~12% of the population per 5 min
 const expect=0.12*p.pop/300*600;
 assert.ok(Math.abs(a.arrived-expect)<0.15*expect,`${a.arrived} vs ${expect}`);
 // a short-handed group visibly queues
 const short=simulate(liftPlan(defaults,{speed:5,auto:false,cars:2},m),{seed:11,duration:600});
 assert.ok(short.queueMax>a.queueMax*3);
 // cars never leave their shafts
 const sim=createSim(p,{seed:3});for(let i=0;i<3000;i++)stepSim(sim,0.2);
 for(const car of sim.cars){const g=p.groups[car.g];assert.ok(car.z>=p.levelZ[g.base]-1e-6&&car.z<=p.levelZ[g.hi]+1e-6)}
 assert.ok(simStats(sim).n>0);
});

test('every pattern, sky lobby, double-deck and destination dispatch simulate without error',()=>{
 const m=evaluate(defaults);
 for(const pattern of ['up','two','down'])for(const extra of [{},{sky:true},{dd:true},{dispatch:'destination'}]){
  const r=simulate(liftPlan(defaults,{speed:5,pattern,...extra},m),{seed:5,duration:400});
  assert.ok(r.delivered>0,`${pattern} ${JSON.stringify(extra)}`);assert.ok(Number.isFinite(r.avg));
 }
});

test('finite outputs for 12, 48 and 70 floors on every programme',()=>{
 for(const program of ['petronas','hkifc','mini','custom'])for(const floors of [12,48,70]){
  const s={...defaults,program,floors},m=evaluate(s);
  for(const o of [{},{sky:true,zones:3},{dd:true,dispatch:'destination'}]){
   const p=liftPlan(s,o,m);
   for(const k of ['interval','hcPct','groundArea','shaftFloorArea','pop','cars'])assert.ok(Number.isFinite(p[k]),`${program} ${floors} ${k}`);
   assert.ok(Number.isFinite(p.awt)||p.saturated);
   for(const g of p.groups)assert.ok(Number.isFinite(g.rtt)&&g.rtt>0&&g.cars>=1);
  }
  const r=simulate(liftPlan(s,{},m),{seed:2,duration:120});assert.ok(Number.isFinite(r.avg));
 }
 assert.doesNotThrow(()=>liftPlan({},{}));
 assert.ok(timeScale(300)>=30&&timeScale(300)<=50);
});

const keys=o=>Object.entries(o).flatMap(([k,v])=>v&&typeof v==='object'?keys(v).map(x=>k+'.'+x):[k]).sort();
test('i18n parity across en, th, zh',()=>{
 const en=keys(LIFTS_TEXT.en);
 for(const l of ['th','zh'])assert.deepEqual(keys(LIFTS_TEXT[l]),en,l);
 for(const l of ['en','th','zh']){const t=LIFTS_TEXT[l];for(const k of keys(t)){const v=k.split('.').reduce((o,x)=>o[x],t);assert.ok(typeof v==='string'&&v.length>0,l+' '+k)}}
 // no first person in Thai
 assert.ok(!JSON.stringify(LIFTS_TEXT.th).match(/ผม|ฉัน|เรา|ข้าพเจ้า/));
});

test('renderer never throws without a DOM',()=>{
 assert.doesNotThrow(()=>renderLiftsLab());
 assert.doesNotThrow(()=>renderLiftsLab({host:{},state:defaults,lang:'xx',active:true}));
 assert.doesNotThrow(()=>renderLiftsLab({host:{},state:defaults,active:false}));
 assert.equal(LIFT_ASSUME.intervalMax,30);
});

/* ── the method, drawn ──────────────────────────────────────────────────────
   The paragraph that explained the round trip time was replaced by a drawing.
   These guards read the EMITTED SHEET, not the source: a drawing that has
   quietly drifted from the arithmetic looks perfectly fine on screen, and the
   only thing that catches it is a number read back off the paper and compared
   with the number the lab computed. */

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
  // A note's lines are set one line-height apart. Two DIFFERENT notes can
  // share an x — the title and the figure below it both start at the same
  // margin — so the pitch, not the x, is what says which lines belong
  // together.
  const runs=[];let cur=[g[0]];
  for(let i=1;i<g.length;i++){
   if(Math.abs((g[i].y-g[i-1].y)-g[i-1].size*1.2)<0.01)cur.push(g[i]);
   else{runs.push(cur);cur=[g[i]]}
  }
  runs.push(cur);
  return runs.map(run=>({x:run[0].x,y:run[0].y,size:run[0].size,anchor:run[0].anchor,
   lines:run.map(r=>r.s),text:run.map(r=>r.s).join(' ')}));
 });
}
/* The bar's three segments: the only group of three rectangles that share a
   top and a bottom edge. Read back off the markup, so a drawing that stops
   drawing the bar cannot pass. */
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
  if(g.length!==3)continue;
  const w=g.reduce((a,b)=>a+(b.x1-b.x0),0);
  if(!best||w>best.w)best={w,g};
 }
 return best?best.g.sort((a,b)=>a.x0-b.x0).map(r=>r.x1-r.x0):[];
}
/* Where a note sits on the sheet: the box its text actually occupies. A note
   that wraps is as wide as its longest line and as tall as all of them. */
const noteBox=n=>{
 const w=Math.max(...n.lines.map(l=>[...l].length*n.size*.6));
 const x=n.anchor==='middle'?n.x-w/2:n.anchor==='end'?n.x-w:n.x;
 return {x0:x,x1:x+w,top:n.y-0.75*n.size,
  bot:n.y+(n.lines.length-1)*n.size*1.2+0.25*n.size};
};

const SHEET_PLANS=[{},{speed:5},{speed:5,zones:4},{speed:5,sky:true},{speed:5,dd:true},{speed:5,dispatch:'destination'}];

test('the method sheet states the numbers the lab actually computed',()=>{
 const m=evaluate(defaults);
 for(const o of SHEET_PLANS){
  const plan=liftPlan(defaults,o,m);
  const pay=liftsMethodPayload(plan);
  assert.ok(pay,`no zone to draw for ${JSON.stringify(o)}`);
  const svg=liftsMethodSVG(pay,{lang:'en'});
  assert.ok(svg.includes('<svg'),'the method must be an svg');
  assert.doesNotMatch(svg,/NaN|undefined|Infinity/,'a non-number reached the drawing');
  const notes=sheetNotes(svg);
  const nums=notes.flatMap(n=>[...n.text.matchAll(/-?\d+(?:\.\d+)?/g)].map(x=>+x[0]));
  const has=(v,tol)=>nums.some(n=>Math.abs(n-v)<=tol);
  assert.ok(has(pay.rtt,0.06),`RTT ${pay.rtt} is not on the sheet`);
  assert.ok(has(pay.interval,0.06),`interval ${pay.interval} is not on the sheet`);
  assert.ok(has(pay.S,0.06),`S ${pay.S} is not on the sheet`);
  assert.ok(has(pay.P,0.06),`P ${pay.P} is not on the sheet`);
  assert.ok(has(pay.H,0.06),`H ${pay.H} is not on the sheet`);
  assert.ok(has(pay.E,0.6),`E ${pay.E} is not on the sheet`);
  assert.ok(has(pay.N,0.6),`N ${pay.N} is not on the sheet`);
  assert.ok(has(pay.tv,0.01),`t_v ${pay.tv} is not on the sheet`);
  assert.ok(has(pay.ts,0.01),`t_s ${pay.ts} is not on the sheet`);
  assert.ok(has(pay.tp,0.01),`t_p ${pay.tp} is not on the sheet`);
  // the three contributions, read back off the sheet in seconds
  const segs=notes.filter(n=>/\d\s*%/.test(n.text)&&/-?\d/.test(n.text));
  assert.equal(segs.length,3,`the bar must be labelled in three parts, found ${segs.length}`);
  const secs=segs.map(n=>+n.text.match(/-?\d+(?:\.\d+)?/)[0]);
  const sum=secs.reduce((a,b)=>a+b,0);
  assert.ok(Math.abs(sum-pay.rtt)<0.2,`the three segments total ${sum} s, not the RTT ${pay.rtt} s`);
  for(const sec of [pay.travel,pay.doors,pay.people])
   assert.ok(secs.some(v=>Math.abs(v-sec)<0.06),`${sec} s is not among the segments ${secs}`);
  // and the bar itself is in proportion: each segment as long as its seconds
  const widths=barSegments(svg);
  assert.equal(widths.length,3,'the sheet must draw the round trip as one bar in three parts');
  const tot=widths.reduce((a,b)=>a+b,0);
  for(let i=0;i<3;i++){
   const want=[pay.travel,pay.doors,pay.people][i]/pay.rtt*tot;
   assert.ok(Math.abs(widths[i]-want)<0.8,`bar segment ${i} is ${widths[i]} wide, not ${want.toFixed(2)}`);
  }
  // the probable stops are drawn as ticks on the shaft, and the passengers as
  // dots at the lobby: a sheet that claims S and P must show them
  const ticks=(svg.match(/<path d="M[\d.]+ [\d.]+ L[\d.]+ [\d.]+" fill="none" stroke="var\(--ink\)"/g)||[]).length;
  assert.equal(ticks,Math.max(1,Math.min(12,Math.round(pay.S))),`the sheet must draw a tick for each probable stop`);
  const dots=(svg.match(/<circle[^>]*fill="var\(--ink\)"/g)||[]).length;
  assert.equal(dots,Math.max(1,Math.min(16,Math.round(pay.P))),`the sheet must draw the passengers waiting`);
  // the zone and the express run are two bands, drawn in proportion to the
  // floors they hold — the express run is the point of the section
  const bands=[...svg.matchAll(/<path d="M[\d.]+ ([\d.]+) H[\d.]+ V([\d.]+) H[\d.]+ Z" fill="none" stroke="var\(--faint\)" stroke-width="\.6" stroke-dasharray="3 2"\/>/g)]
   .map(m=>({y0:+m[1],y1:+m[2]})).sort((a,b)=>a.y0-b.y0);
  assert.equal(bands.length,2,
   `the sheet must separate the zone from the express run below it, found ${bands.length}`);
  const zoneH=bands[0].y1-bands[0].y0;
  const expH=bands.length>1?bands[1].y1-bands[1].y0:0;
  const share=zoneH/(zoneH+expH);
  assert.ok(Math.abs(share-pay.N/(pay.N+pay.E))<0.02,
   `the zone band is ${(share*100).toFixed(0)}% of the shaft, not ${(pay.N/(pay.N+pay.E)*100).toFixed(0)}%`);
 }
});

test('the method sheet is drawn for every language, from the same numbers',()=>{
 const m=evaluate(defaults),plan=liftPlan(defaults,{speed:5},m);
 const pay=liftsMethodPayload(plan);
 for(const lang of ['en','th','zh']){
  const svg=liftsMethodSVG(pay,{lang});
  assert.ok(svg.includes('<svg'),`${lang}: no sheet`);
  assert.doesNotMatch(svg,/NaN|undefined|Infinity/,`${lang}: a non-number reached the drawing`);
  assert.ok(svg.includes('aria-label='),`${lang}: the sheet must describe itself`);
  const notes=sheetNotes(svg);
  const nums=notes.flatMap(n=>[...n.text.matchAll(/-?\d+(?:\.\d+)?/g)].map(x=>+x[0]));
  assert.ok(nums.some(n=>Math.abs(n-pay.rtt)<=0.06),`${lang}: the RTT is not on the sheet`);
  assert.ok(nums.some(n=>Math.abs(n-pay.interval)<=0.06),`${lang}: the interval is not on the sheet`);
 }
});

test('the sheet annotation can be read: no note on another, none cut off',()=>{
 const m=evaluate(defaults);
 for(const o of SHEET_PLANS){
  for(const lang of ['en','th','zh']){
   const pay=liftsMethodPayload(liftPlan(defaults,o,m));
   const svg=liftsMethodSVG(pay,{lang});
   const vb=svg.match(/viewBox="([^"]+)"/);
   assert.ok(vb,`${lang}: no viewBox`);
   const [vx,,vw]=vb[1].split(/\s+/).map(Number);
   const notes=sheetNotes(svg);
   for(let i=0;i<notes.length;i++)for(let j=i+1;j<notes.length;j++){
    const a=noteBox(notes[i]),b=noteBox(notes[j]);
    if(a.x1<=b.x0||b.x1<=a.x0)continue;
    if(a.bot<=b.top||b.bot<=a.top)continue;
    assert.fail(`${JSON.stringify(o)}/${lang}: "${notes[i].text}" printed on "${notes[j].text}"`);
   }
   for(const n of notes){
    const b=noteBox(n);
    assert.ok(b.x0>=vx-0.5,`${lang}: "${n.text}" cut off at the left`);
    assert.ok(b.x1<=vx+vw+0.5,`${lang}: "${n.text}" cut off at the right`);
   }
   // And the same check with the width a CJK glyph ACTUALLY has: one em, not
   // the .6 em the layout engine assumes for its monospace face. A Chinese
   // label is a third wider than the box reserved for it, and a label that
   // runs past the frame is a label the browser clips in silence.
   const adv=s=>[...s].reduce((a,c)=>a+(/[㐀-鿿豈-﫿]/.test(c)?1:0.6),0);
   for(const n of notes){
    const w=Math.max(...n.lines.map(l=>adv(l)*n.size));
    const x=n.anchor==='middle'?n.x-w/2:n.anchor==='end'?n.x-w:n.x;
    assert.ok(x>=vx-0.5,`${lang}: "${n.text}" runs off the left of the frame`);
    assert.ok(x+w<=vx+vw+0.5,`${lang}: "${n.text}" runs off the right of the frame`);
   }
  }
 }
});

test('the method prose really did shrink to a caption',()=>{
 // The prose this replaced explained the formula in eight hundred characters.
 // A caption is a caption: the drawing carries the method now.
 assert.ok(LIFTS_TEXT.en.m1.length<=260,`en m1 is ${LIFTS_TEXT.en.m1.length} characters`);
 assert.ok(LIFTS_TEXT.th.m1.length<=260,`th m1 is ${LIFTS_TEXT.th.m1.length} characters`);
 assert.ok(LIFTS_TEXT.zh.m1.length<=110,`zh m1 is ${LIFTS_TEXT.zh.m1.length} characters`);
 for(const l of ['en','th','zh'])assert.ok(LIFTS_TEXT[l].m1.trim().length>20,`${l} m1 is empty`);
});

test('the method drawing is translated, and the Chinese carries its own words',()=>{
 const CJK=/[㐀-鿿豈-﫿]/;
 const keysOf=o=>Object.entries(o).flatMap(([k,v])=>v&&typeof v==='object'?keysOf(v).map(x=>k+'.'+x):[k]).sort();
 const en=keysOf(LIFTS_TEXT.en).filter(k=>k.startsWith('m.'));
 assert.ok(en.length>=12,'the method drawing needs its own vocabulary');
 for(const l of ['en','th','zh'])assert.deepEqual(keysOf(LIFTS_TEXT[l]).filter(k=>k.startsWith('m.')),en,`${l}: the method vocabulary differs`);
 const get=(l,k)=>k.split('.').reduce((o,x)=>o[x],LIFTS_TEXT[l]);
 for(const l of ['en','th','zh'])for(const k of en)assert.ok(get(l,k).trim().length,`${l} ${k} is empty`);
 for(const l of ['en','th'])for(const k of en)
  assert.doesNotMatch(get(l,k),CJK,`${l} ${k} contains CJK`);
 for(const k of en)
  assert.match(get('zh',k),CJK,`zh ${k} falls back to Latin: "${get('zh',k)}"`);
});

/* A DOM small enough to read. The desk renderers were never invoked by the
   suite, so a desk could throw on the first line of its body and every test
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

test('the lab renders the drawing, not a paragraph',()=>{
 const host=stubNode('div'),real=globalThis.document;
 globalThis.document={createElement:t=>stubNode(t),createElementNS:(ns,t)=>stubNode(t),
  createTextNode:t=>({textContent:t}),getElementById:()=>null,activeElement:{id:''}};
 try{
  const m=evaluate(defaults);
  for(const lang of ['en','th','zh']){
   renderLiftsLab({host,state:defaults,metrics:m,lang,active:true});
   const boxes=walk(host,n=>String(n._h).includes('<svg'));
   assert.equal(boxes.length,1,`${lang}: the lab must draw the method`);
   assert.ok(boxes[0]._h.includes('<svg class="dsec"'),`${lang}: the drawing must be a drafting sheet`);
   const figs=walk(host,n=>n.tagName==='FIGURE');
   assert.equal(figs.length,1,`${lang}: the drawing must sit in a figure`);
   const caps=walk(host,n=>n.tagName==='FIGCAPTION');
   assert.equal(caps.length,1,`${lang}: the figure must carry a caption`);
   assert.equal(caps[0].textContent,LIFTS_TEXT[lang].m1);
   // and the paragraph it replaced is gone from the page
   assert.equal(walk(host,n=>n.className==='lt-prose lt-formula'&&n.textContent===LIFTS_TEXT[lang].m1).length,0,
    `${lang}: the old method paragraph is still on the page`);
  }
 }finally{globalThis.document=real}
});
