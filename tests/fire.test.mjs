import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,levelPrograms} from '../dist/model.js';
import {effectiveWidth,speedAt,specificFlow,maxSpecificFlow,paulsMinutes,STAIR_TYPES,simulate,fireRead,placeRefuges,towerLevels,widthCurve,FIRE_TEXT,renderFireLab,fmtTime,DT} from '../dist/fire.js';

const near=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<=e,`${a} != ${b}`);

test('effective width and SFPE flow match hand calculation',()=>{
 near(effectiveWidth(1.2),0.9);                          // 1.2 − 2 × 0.15
 near(effectiveWidth(0.2),0);
 const k=STAIR_TYPES['7/11'].k;                          // 1.08 m/s
 near(speedAt(0,k),1.08*(1-0.266*0.54));                 // free movement below 0.54 p/m²
 near(speedAt(2,k),1.08*(1-0.266*2));
 near(speedAt(3.8,k),0);
 near(specificFlow(1.88,k),1.08*1.88*(1-0.266*1.88));    // 1.015
 near(maxSpecificFlow(k),1.01,0.01);                     // SFPE: 1.01 p/s/m for 7/11
 near(maxSpecificFlow(STAIR_TYPES['7.5/10'].k),0.94,0.01);
 near(maxSpecificFlow(STAIR_TYPES['6.5/13'].k),1.16,0.01);
 near(maxSpecificFlow(1.40),1.32,0.01);                  // doors and corridors
 for(let D=0;D<3.7;D+=0.1)assert.ok(specificFlow(D,k)<=maxSpecificFlow(k)+1e-12);
 near(paulsMinutes(100),0.68+0.081*Math.pow(100,0.73));
});

test('a queue at one door drains at the SFPE maximum flow',()=>{
 // two levels: everybody on level 1, ready at once, one storey of 3.5 m to descend
 const We=0.9,k=STAIR_TYPES['7/11'].k,conv=STAIR_TYPES['7/11'].conv,N=600;
 const r=simulate({levels:[{h:3.5,pop:0,t0:0,t1:0},{h:3.5,pop:N,t0:0,t1:0}],k,conv,We,WeDoor:We});
 const hand=N/(maxSpecificFlow(k)*We);                   // ≈ 657 s
 assert.ok(r.finished);
 assert.ok(Math.abs(r.tEnd-hand)/hand<0.06,`${r.tEnd} vs ${hand}`);
 near(r.exited,N,1e-6);
});

test('doubling stair width shortens the flow-limited time',()=>{
 for(const program of ['custom','petronas']){
  const s={...defaults,program,floors:48};
  const a=fireRead(s,{width:1.1,refuge:'off',prmShare:0}),b=fireRead(s,{width:2.2,refuge:'off',prmShare:0});
  assert.ok(b.simTotal<a.simTotal,`${program} ${b.simTotal} < ${a.simTotal}`);
  assert.ok(b.bound<a.bound);
  // effective width 0.8 → 1.9: the flow term shrinks by the same ratio
  near((a.bound-0.5*a.c.pre)/(b.bound-0.5*b.c.pre),1.9/0.8,1e-9);
  assert.ok(b.simTotal<0.7*a.simTotal);
 }
});

test('refuge floors never increase the time to a place of safety',()=>{
 for(const program of Object.keys(levelPrograms))for(const floors of [30,48,70])for(const strategy of ['simultaneous','phased','lifts'])for(const mode of ['hk','gb']){
  const s={...defaults,program,floors};
  const off=fireRead(s,{refuge:'off',strategy}),on=fireRead(s,{refuge:mode,strategy});
  const tOff=off.chosen.total,tOn=on.refuge.safety??on.chosen.total;
  assert.ok(tOn<=tOff+1e-9,`${program}/${floors}/${strategy}/${mode} ${tOn} > ${tOff}`);
 }
});

test('refuge placement follows the HK and GB limits',()=>{
 const {levels}=towerLevels({...defaults,program:'petronas',floors:70},null,10);
 const hk=placeRefuges(levels,'hk'),gb=placeRefuges(levels,'gb');
 assert.ok(hk.required&&gb.required);
 let prev=0;for(const r of hk.list){assert.ok(r.i-prev<=25);prev=r.i}assert.ok(levels.length-1-prev<=25);
 prev=0;for(const r of gb.list){assert.ok(levels[r.i].z-levels[prev].z<=50+1e-9);prev=r.i}
 assert.ok(hk.list.some(r=>r.kind!=='converted'),'snaps to the model refuge/mechanical levels');
 const low=towerLevels({...defaults,program:'custom',floors:12},null,10).levels;
 assert.equal(placeRefuges(low,'hk').required,false);
});

test('phased: the alarm floors are out before the simultaneous total',()=>{
 for(const program of Object.keys(levelPrograms))for(const floors of [12,48,70]){
  const r=fireRead({...defaults,program,floors},{strategy:'phased'});
  assert.equal(r.alarm.length,3);
  assert.ok(r.phasedAlarm<r.simTotal,`${program}/${floors} ${r.phasedAlarm} < ${r.simTotal}`);
 }
});

test('deterministic',()=>{
 const o={strategy:'lifts',refuge:'gb',pre:90,prmShare:0.05};
 const a=fireRead({...defaults,floors:48},o),b=fireRead({...defaults,floors:48},o);
 assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));
});

test('finite outputs for 12, 48 and 70 floors and every program',()=>{
 for(const program of Object.keys(levelPrograms))for(const floors of [12,48,70])for(const strategy of ['simultaneous','phased','lifts']){
  const r=fireRead({...defaults,program,floors},{strategy,refuge:floors>30?'hk':'off'});
  for(const k of ['pop','simTotal','pauls','bound','phasedAlarm','phasedTotal','flowPerStair','We'])assert.ok(Number.isFinite(r[k])&&r[k]>0,`${program}/${floors}/${strategy} ${k}=${r[k]}`);
  assert.ok(Number.isFinite(r.chosen.total)&&r.finished,`${program}/${floors}/${strategy} finished`);
  assert.ok(r.simTotal>=r.bound*0.9,'simulation is not faster than the flow bound');
  if(strategy==='lifts')assert.ok(Number.isFinite(r.lifts.time));
 }
 const curve=widthCurve({...defaults,floors:12},{});
 for(let i=1;i<curve.length;i++)assert.ok(curve[i].total<=curve[i-1].total+DT);
});

test('FIRE_TEXT has the same keys in every language',()=>{
 const shape=o=>Object.entries(o).flatMap(([k,v])=>v&&typeof v==='object'?shape(v).map(x=>k+'.'+x):[k]).sort();
 const en=shape(FIRE_TEXT.en);
 for(const l of ['th','zh'])assert.deepEqual(shape(FIRE_TEXT[l]),en,l);
 assert.doesNotMatch(JSON.stringify(FIRE_TEXT.th),/ฉัน|ผม|เรา/);
 assert.equal(fmtTime(125),'2 min 05 s');assert.equal(fmtTime(NaN),'—');
});

test('the lab never throws without a DOM',()=>{
 assert.doesNotThrow(()=>renderFireLab({}));
 assert.doesNotThrow(()=>renderFireLab({host:{},state:defaults,lang:'xx',active:false}));
 assert.doesNotThrow(()=>renderFireLab({host:{},state:defaults,lang:'th',active:true}));
 assert.doesNotThrow(()=>fireRead({},{}));
 assert.doesNotThrow(()=>fireRead({...defaults,floors:1},{stairs:'x',width:-3,tread:'?',strategy:'??'}));
});

test('fire.css keeps the house rules',()=>{
 const css=readFileSync(new URL('../dist/fire.css',import.meta.url),'utf8');
 assert.doesNotMatch(css,/gradient\(|box-shadow|border-radius:\s*[1-9]/);
 const sizes=new Set([...css.matchAll(/font-size:([^;}]+)/g)].map(m=>m[1].trim()));
 assert.ok(sizes.size<=3,[...sizes].join(','));
 for(const m of css.matchAll(/\.([a-z][\w-]*)/g))assert.ok(m[1].startsWith('fe'),m[1]);
 const js=readFileSync(new URL('../dist/fire.js',import.meta.url),'utf8');
 assert.doesNotMatch(js,/style="|<style|innerHTML/);
});
