import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../dist/model.js';
import {CORE_METHOD,liftDesign} from '../dist/core.js';
import {liftEvac,evacuationCarsAt,FIRE_TEXT} from '../dist/fire.js';
import {awtCibse,sizeGroup,liftPlan,LIFTS_TEXT,waitCurve} from '../dist/lifts.js';
import {drainageAt,drainageDesign} from '../dist/water.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);

test('evacuation lift trips visit every floor and each car completes its trips sequentially',()=>{
 const s={...defaults,program:'custom',floors:11,height:4,garden:'none'};
 const levels=Array.from({length:11},(_,i)=>({i,z:4*i,h:4,occ:true}));
 const r=liftEvac(s,levels,[0,...Array(10).fill(1)],110,20),z=r.zs[0];
 assert.equal(z.trips,10,'ten occupied floors require ten separate visits');
 assert.deepEqual(z.jobs.map(j=>j.floor),[10,9,8,7,6,5,4,3,2,1]);
 assert.equal(z.jobs.reduce((n,j)=>n+j.passengers,0),10);
 const v=liftDesign(s,110).carSpeed,a=CORE_METHOD.carAccel;
 const ends=Array(r.cars).fill(20);
 for(const job of z.jobs){
  near(job.start,Math.min(...ends));
  near(job.start,ends[job.car]);
  const d=4*job.floor,flight=d>=v*v/a?d/v+v/a:2*Math.sqrt(d/a);
  near(job.duration,2*flight+2*CORE_METHOD.doorTime+2*CORE_METHOD.transferTime);
  ends[job.car]=job.end;
 }
 near(r.time,Math.max(...ends));
 const users=levels.map((_,i)=>i===10?21:0),busy=liftEvac(s,levels,users,110,0).zs[0];
 assert.equal(busy.trips,3,'round each floor up to whole trips');
 near(busy.jobs.reduce((n,j)=>n+j.passengers,0),21);
 assert.ok(busy.jobs.every(j=>j.passengers<=CORE_METHOD.carLoad*CORE_METHOD.carRated));
 for(const lang of ['en','th','zh'])assert.ok(FIRE_TEXT[lang].ctl.liftNote.length>50);
});

test('Barney wait approximation has no value above 80%, including population aggregates and curves',()=>{
 assert.ok(Number.isFinite(awtCibse(30,.8)));
 assert.equal(awtCibse(30,.800001),null);
 const g=sizeGroup({rttOf:()=>100,demand:35.1,cap:13,cars:1,auto:false});
 assert.equal(g.saturated,false);near(g.lf,.9);assert.equal(g.awt,null);
 const p=liftPlan(defaults,{auto:false,cars:7,rate:12});
 assert.equal(p.saturated,false);assert.ok(p.groups.some(g=>g.lf>.8));
 assert.equal(p.awt,null,'an unavailable zone cannot contribute a zero wait');
 assert.equal(waitCurve(defaults,{rate:12},undefined,7).at(-1).awt,null);
 const saturated=sizeGroup({rttOf:()=>100,demand:60,cap:13,cars:1,auto:false});
 assert.equal(saturated.awt,Infinity,'physical saturation stays distinct');
 for(const lang of ['en','th','zh'])assert.ok(LIFTS_TEXT[lang].v.awtScope.includes('80%'));
});

test('storm animation conserves inflow between the roof and below-grade tank, including drain-down',()=>{
 for(const input of [{i:250,n:1,dn:100,dur:30},{i:25,n:10,dn:150,dur:30}]){
  const r=drainageDesign(defaults,input);
  for(const t of [0,5,15,30,35,60,240]){
   const x=drainageAt(r,t);
   near(x.inflow,x.collected+x.roofVolume);
   assert.ok(x.roofVolume>=0&&x.collected>=0&&x.collected<=r.detention+1e-8);
   near(x.depth*r.roof/1000,x.roofVolume);
  }
  const end=drainageAt(r,30),later=drainageAt(r,35);
  near(end.inflow,r.detention);
  near(end.collected,(Math.min(r.Q,r.capacity)+r.Qf)*30*60/1000);
  assert.ok(later.collected>=end.collected&&later.roofVolume<=end.roofVolume);
  near(drainageAt(r,240).collected,r.detention);
 }
});


test('evacuation drawing reads actual per-car floor jobs and dwell periods',()=>{
 const s={...defaults,program:'custom',floors:11,height:4,garden:'none'};
 const levels=Array.from({length:11},(_,i)=>({i,z:4*i,h:4,occ:true}));
 const lifts=liftEvac(s,levels,[0,...Array(10).fill(1)],110,20);
 assert.ok(evacuationCarsAt(lifts,19).every(c=>c.phase==='idle'&&c.z===0));
 for(const job of lifts.zs[0].jobs){
  const top=evacuationCarsAt(lifts,job.start+job.flight+job.dwell/2).find(c=>c.car===job.car);
  assert.equal(top.floor,job.floor);near(top.z,levels[job.floor].z);assert.equal(top.phase,'loading');
  const returning=evacuationCarsAt(lifts,job.start+job.flight+job.dwell+job.flight/2).find(c=>c.car===job.car);
  near(returning.z,job.height/2);assert.equal(returning.phase,'down');
 }
 assert.ok(evacuationCarsAt(lifts,lifts.time).every(c=>c.phase==='idle'&&c.z===0));
});
