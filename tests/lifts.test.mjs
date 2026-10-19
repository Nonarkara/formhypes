import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,evaluate} from '../dist/model.js';
import {liftDesign,CORE_METHOD} from '../dist/core.js';
import {flightTime,travelPos,probableStops,highestReversal,rttFormula,groupRTT,shuttleRTT,awtCibse,sizeGroup,
 liftPlan,waitCurve,waitCurveDelta,skyCandidates,simulate,createSim,stepSim,simStats,timeScale,shaftArea,LIFTS_TEXT,LIFT_ASSUME,renderLiftsLab} from '../dist/lifts.js';

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
