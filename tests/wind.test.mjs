import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,families} from '../dist/model.js';
import {kr,cr,Iv,qp,vm,projectedWidth,cfOf,cf0Rect,vortexState,windRead,familyComparison,defaultZeta,timeScale,WIND_TEXT,TERRAIN_KEYS,renderWindLab} from '../dist/wind.js';

const near=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<=e,`${a} != ${b}`);

test('roughness factor, turbulence and peak pressure match hand calculation (EN 1991-1-4 Eq. 4.4–4.8)',()=>{
 near(kr(0.05),0.19);                                   // terrain II is the reference
 near(kr(1.0),0.19*Math.pow(20,0.07));                  // 0.2343
 near(kr(1.0),0.2343,1e-4);
 near(cr(10,'II'),0.19*Math.log(200));                  // 1.0067
 near(cr(10,'II'),1.0067,1e-4);
 near(Iv(10,'II'),1/Math.log(200));                     // 0.1887
 near(qp(10,30,'II'),1323.16,0.05);                     // (1+7·0.1887)·½·1.25·30.20² Pa
 near(cr(5,'IV'),cr(10,'IV'));                          // below z_min the value at z_min
 near(cr(100,'IV'),0.2343*Math.log(100),1e-3);
 near(vm(100,30,'IV'),30*cr(100,'IV'));
});

test('force coefficient follows Fig. 7.23 for the rectangle',()=>{
 near(cf0Rect(1),2.1);near(cf0Rect(0.7),2.4);near(cf0Rect(2),1.65);near(cf0Rect(5),1.0);near(cf0Rect(100),0.9);
 assert.equal(cfOf('box',1).basis,'tabulated');
 assert.equal(cfOf('box',1,{normal:false}).basis,'interpolated');
 assert.equal(cfOf('octagon',1).cf,1.3);assert.equal(cfOf('hexagon',1).cf,1.6);
 assert.equal(cfOf('oval',1).basis,'interpolated');assert.equal(cfOf('cross',1).basis,'assumed');
});

test('projected width rotates with the wind',()=>{
 const rect=[[-10,-2],[10,-2],[10,2],[-10,2]];
 near(projectedWidth(rect,0).b,4);near(projectedWidth(rect,0).d,20);
 near(projectedWidth(rect,90).b,20,1e-9);near(projectedWidth(rect,90).d,4,1e-9);
 const a=45*Math.PI/180;near(projectedWidth(rect,45).b,20*Math.sin(a)+4*Math.cos(a),1e-9);
 near(projectedWidth(rect,180).b,4,1e-9);
});

test('base shear scales with v_b squared; moment with it',()=>{
 const a=windRead(defaults,{vb:20,terrain:'III'}),b=windRead(defaults,{vb:40,terrain:'III'});
 near(b.shear/a.shear,4,1e-9);near(b.moment/a.moment,4,1e-9);
 assert.ok(windRead(defaults,{vb:30,terrain:'0'}).shear>windRead(defaults,{vb:30,terrain:'IV'}).shear,'open sea loads more than a city centre');
});

test('lock-in flag follows E.1.2(3): clear below 0.8, lock-in 0.8–1.25, below beyond',()=>{
 assert.equal(vortexState(0.5),'clear');assert.equal(vortexState(0.79),'clear');
 assert.equal(vortexState(0.8),'lockin');assert.equal(vortexState(1),'lockin');assert.equal(vortexState(1.25),'lockin');
 assert.equal(vortexState(1.3),'below');assert.equal(vortexState(NaN),'clear');
 const r=windRead(defaults,{vb:30,terrain:'IV'});
 near(r.ratio,r.fs/r.n1,1e-9);                           // f_s/n1 = v_m/v_crit
 near(r.vCrit,r.bE*r.n1/r.st,1e-9);near(r.n1,46/r.H,1e-12);
 // a slender box in a strong wind passes through lock-in; a squat one does not
 const slim={...defaults,family:'box',span:26,floors:90};
 let found=false;for(let vb=15;vb<=55;vb++)if(windRead(slim,{vb,terrain:'IV'}).state==='lockin')found=true;
 assert.ok(found,'slender tower reaches lock-in somewhere on the slider');
 assert.equal(windRead({...defaults,family:'box',span:60,floors:20},{vb:30,terrain:'IV'}).state,'clear');
});

test('damping raises the Scruton number; TMD adds its stated value',()=>{
 near(defaultZeta('column-grid'),0.10/(2*Math.PI));near(defaultZeta('diagrid'),0.05/(2*Math.PI));
 const a=windRead(defaults,{zeta:0.01}),b=windRead(defaults,{zeta:0.01,tmd:true});
 near(b.zeta,0.03,1e-12);near(b.sc/a.sc,3,1e-9);
});

test('finite outputs for every family × system × terrain × direction edge',()=>{
 for(const family of Object.keys(families))for(const system of ['column-grid','outrigger','diagrid'])for(const terrain of TERRAIN_KEYS)for(const dir of [0,45,90,180])for(const tw of [0,180]){
  const r=windRead({...defaults,family,system,twist:tw,aspect:family==='box'?1.8:1},{vb:55,terrain,dir});
  for(const k of ['vTop','qTop','shear','moment','vCrit','ratio','sc','fs','n1','lambda','cfE','zeta'])assert.ok(Number.isFinite(r[k])&&r[k]>0,`${family}/${system}/${terrain}/${dir}/${tw} ${k}=${r[k]}`);
 }
 const cmp=familyComparison(defaults,{vb:30});
 assert.equal(cmp.length,Object.keys(families).length);
 for(let i=1;i<cmp.length;i++)assert.ok(cmp[i].shear>=cmp[i-1].shear);
});

test('time scale is a round number and the lab never throws without a DOM',()=>{
 const k=timeScale(1.6,440);assert.ok(k>0&&Number.isFinite(k));
 assert.doesNotThrow(()=>renderWindLab({}));
 assert.doesNotThrow(()=>renderWindLab({host:{},state:defaults,lang:'xx',active:false}));
});

test('WIND_TEXT has the same keys in every language',()=>{
 const shape=o=>Object.entries(o).flatMap(([k,v])=>v&&typeof v==='object'?shape(v).map(x=>k+'.'+x):[k]).sort();
 const en=shape(WIND_TEXT.en);
 for(const l of ['th','zh'])assert.deepEqual(shape(WIND_TEXT[l]),en,l);
 for(const l of ['en','th','zh'])for(const f of Object.keys(families))assert.ok(WIND_TEXT[l].fam[f],l+' '+f);
 assert.doesNotMatch(JSON.stringify(WIND_TEXT.th),/ฉัน|ผม|เรา/);
});

test('wind.css keeps the house rules',()=>{
 const css=readFileSync(new URL('../dist/wind.css',import.meta.url),'utf8');
 assert.doesNotMatch(css,/gradient\(|box-shadow|border-radius:\s*[1-9]/);
 const sizes=new Set([...css.matchAll(/font-size:([^;}]+)/g)].map(m=>m[1].trim()));
 assert.ok(sizes.size<=3,[...sizes].join(','));
 const js=readFileSync(new URL('../dist/wind.js',import.meta.url),'utf8');
 assert.doesNotMatch(js,/style="|<style/);
});
