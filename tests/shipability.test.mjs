import {DECISION_I18N,cleanStudyName,cleanStudyNote} from '../dist/decisions.js';
import {getEnvironmentStudy,restoreEnvironmentStudy,validateEnvironment} from '../dist/environment.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as M from '../dist/model.js';
import {SCHEMA} from '../dist/schema.js';
import {solarDefaults,validSolar,solarPosition} from '../dist/solar.js';
import {MATERIALS} from '../dist/materials.js';
import {CROWNS,GARDENS} from '../dist/crowns.js';
import {DETAILS} from '../dist/details.js';
import {getBriefStudy,restoreBriefInputs,resetBrief} from '../dist/brief.js';
import {projectedShadow,shade} from '../dist/context.js';
import {street} from '../dist/walk.js';
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
const near=(a,b,tol=1e-4)=>assert.ok(Math.abs(a-b)<tol,`${a} vs ${b}`);
const parse=state=>{const lines=M.meshOBJ(state).split('\n');return {v:lines.filter(l=>l.startsWith('v ')).map(l=>l.split(' ').slice(1).map(Number)),f:lines.filter(l=>l.startsWith('f ')).map(l=>l.split(' ').slice(1).map(n=>+n-1))}};
const volume=({v,f})=>f.reduce((total,face)=>{const [a,b,c]=face.map(i=>v[i]);return total+(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6},0);

test('every search winner can survive the actual saved-state validator',()=>{
 const source=app.slice(app.indexOf('const own='),app.indexOf('// The rebrand renamed'));
 const ctx={...M,schema:SCHEMA,solarDefaults,validSolar,MATERIALS,CROWNS,GARDENS,DETAILS};
 runInNewContext(source+'\nthis.accepts=validState;',ctx);
 const s={...M.defaults,program:'custom',height:3,floors:70,maxHeight:350,regime:'competition'};
 const run=M.search(s);
 assert.ok(run.results.length>0);
 for(const r of run.results){assert.ok(r.state.floors<=SCHEMA.floors[2]);assert.ok(ctx.accepts(r.state),'search created a state that reload discards')}
 const saved=JSON.parse(JSON.stringify({state:run.results[0].state}));assert.ok(ctx.accepts(saved.state));
});

test('height alternatives spend the crown allowance and explore the last fitting count',()=>{
 const s={...M.defaults,regime:'competition',crown:'stepped'},n=M.maxFloors(s);
 assert.equal(n,53);assert.deepEqual(M.searchPlan(s).floorSets,[48,53]);
 assert.ok(M.stackHeight(s,n)+CROWNS.stepped.h<=s.maxHeight);
 assert.ok(M.stackHeight(s,n+1)+CROWNS.stepped.h>s.maxHeight);
});

test('all profile/crown OBJ meshes are triangular, closed, outward and as tall as the model',()=>{
 for(const family of Object.keys(M.families))for(const crown of Object.keys(CROWNS))for(const twist of [0,180]){
  const s={...M.defaults,family,crown,twist,taper:.6,aspect:.65},mesh=parse(s),edges=new Map();
  near(Math.max(...mesh.v.map(v=>v[1])),M.evaluate(s).heightTotal);
  for(const f of mesh.f){assert.equal(f.length,3);for(let i=0;i<3;i++){
   const a=f[i],b=f[(i+1)%3],key=[Math.min(a,b),Math.max(a,b)].join('/');
   const e=edges.get(key)||{count:0,balance:0};e.count++;e.balance+=a<b?1:-1;edges.set(key,e);
  }}
  for(const e of edges.values()){assert.equal(e.count,2);assert.equal(e.balance,0)}
  assert.ok(volume(mesh)>0,`${family}/${crown}/${twist} has inward orientation`);
 }
});

test('OBJ volume agrees with an independent prism calculation, including concave plans',()=>{
 for(const family of Object.keys(M.families)){
  const s={...M.defaults,program:'custom',family,floors:12,taper:1,twist:0},expected=M.area(M.profile(s,0))*12*s.height;
  near(volume(parse(s)),expected,.03);
 }
});

test('crown changes reach shadows, their cache and the street perspective',()=>{
 const flat={...M.defaults,solarDate:'2026-12-21',solarTime:'08:00'},post={...flat,crown:'post'},sun=solarPosition(flat);
 const a=projectedShadow(flat,sun),b=projectedShadow(post,sun);
 assert.notDeepEqual(a,b);
 const low=shade(flat,[sun],[]),high=shade(post,[sun],[]);
 near(high.H-low.H,73.5);assert.ok(high.longest>low.longest);
 near(street(post,k=>k,{d:46,look:16,across:0,turn:0}).total,M.evaluate(post).heightTotal);
});

test('ground decoding survives repeated draws and caches each city independently',()=>{
 const source=app.slice(app.indexOf('const groundCache=new Map()'),app.indexOf('let drawn='));
 assert.ok(app.indexOf('const groundCache=new Map()')<app.indexOf('function drawTower(){'));
 let calls=0;const ctx={GROUND:{},GROUND_ROAD_M:{},parseGround:city=>{calls++;return {city}}};
 runInNewContext(source+'\nthis.draw=city=>groundOf(city);',ctx);
 const first=ctx.draw('bangkok');assert.equal(ctx.draw('bangkok'),first);assert.equal(calls,1);
 const tokyo=ctx.draw('tokyo');assert.equal(calls,2);assert.equal(ctx.draw('tokyo'),tokyo);assert.equal(ctx.draw('bangkok'),first);assert.equal(calls,2);
});

test('full Brief restores exactly, invalid inputs are atomic, and legacy saves cannot mix studies',()=>{
 resetBrief();const original=getBriefStudy(M.defaults).inputs;
 const saved={...original,gfa:240000,plate:2400,scheme:'podium',podium:{share:.5,floors:8,pf:3,ff:1.8},seeded:true};
 assert.equal(restoreBriefInputs(saved),true);assert.deepEqual(getBriefStudy(M.defaults).inputs,saved);
 const snapshot=getBriefStudy(M.defaults).inputs;
 for(const bad of [{...saved,podium:{...saved.podium,floors:Infinity}},{...saved,unknown:1},{...saved,gfa:-1}]){
  assert.equal(restoreBriefInputs(bad),false);assert.deepEqual(getBriefStudy(M.defaults).inputs,snapshot);
 }
 assert.equal(restoreBriefInputs({plot:4000,far:7}),true);
 assert.deepEqual(getBriefStudy(M.defaults).inputs,{...original,plot:4000,far:7});resetBrief();
});

const candidate=(id,objective,height,regime='civic',valid=true)=>({objective:'contribution',state:{regime,twist:0,id},metrics:{contribution:objective,height,distinctiveness:1,valid}});
test('mixed regimes apply literal weights after normalizing feasible candidates',()=>{
 const rows=[candidate('low',100,10),candidate('high',200,30),candidate('middle',150,20),candidate('invalid',1e12,1e12,'civic',false)];
 const ranked=M.rank(rows);assert.equal(ranked.length,3);
 const middle=ranked.find(r=>r.state.id==='middle');near(middle.score,.5);near(middle.ranking.objectiveWeight,.65);near(middle.ranking.heightWeight,.35);
 const swapped=M.rank([candidate('money',200,10),candidate('height',100,30)]);
 near(swapped[0].score,.65);assert.equal(swapped[0].state.id,'money');
 for(const r of ranked)assert.ok(r.score>=0&&r.score<=1);
});

test('normalized rankings do not depend on the monetary unit or constant offsets',()=>{
 const rows=[candidate('a',100,30),candidate('b',180,15),candidate('c',150,25)];
 const before=M.rank(rows),after=M.rank(rows.map(r=>({...r,metrics:{...r.metrics,contribution:r.metrics.contribution*100+2500}})));
 assert.deepEqual(after.map(r=>r.state.id),before.map(r=>r.state.id));
 before.forEach((r,i)=>near(r.score,after[i].score));
 const equal=M.rank([candidate('a',100,20),candidate('b',100,20)]);for(const r of equal)near(r.score,.5);
});

test('pure regimes retain their original objective and height-only rankings',()=>{
 const a=candidate('a',100,30,'yield'),b=candidate('b',180,15,'yield');assert.equal(M.rank([a,b])[0].state.id,'b');
 assert.equal(M.rank([a,b].map(r=>({...r,state:{...r.state,regime:'competition'}})))[0].state.id,'a');
});

test('the actual Save/Reload/Restore flow preserves a full Brief and rolls back blocked deletion',()=>{
 class El{constructor(){this.children=[]}replaceChildren(...c){this.children=c}append(...c){this.children.push(...c)}setAttribute(){}}
 const nodes=Object.fromEntries(['save','savedStudies','saveNamed','pinStudy','clearReference','studyName','studyNote','importStudy','studyFile'].map(id=>[id,new El()])),messages=[];nodes.studyName.value='Keep daylight';nodes.studyNote.value='Check access with users';
 let stored='',blocked=false;
 const source=app.slice(app.indexOf('function renderStudies(){'),app.indexOf('/* ── chrome height'));
 const ctx={studies:[],state:{...M.defaults},defaults:M.defaults,$:id=>nodes[id],document:{createElement:()=>new El()},
  lang:'en',DECISION_I18N,cleanStudyName,cleanStudyNote,renderDecisionStudy(){},tt:k=>k,money:String,evaluate:M.evaluate,getBriefStudy,restoreBriefInputs,getEnvironmentStudy,restoreEnvironmentStudy,validateEnvironment,setBriefInputs(){},changed(){},toast:m=>messages.push(m),
  persist:()=>{if(blocked)return false;stored=JSON.stringify(ctx.studies);return true}};
 runInNewContext(source,ctx);
 resetBrief();const original=getBriefStudy(M.defaults).inputs;
 const wanted={...original,gfa:360000,scheme:'solid',plate:3000,seeded:true};restoreBriefInputs(wanted);
 nodes.save.onclick();assert.equal(messages.at(-1),'s.saved');assert.equal(ctx.studies[0].name,'Keep daylight');assert.equal(ctx.studies[0].note,'Check access with users');
 restoreBriefInputs({...original,gfa:180000,scheme:'podium'});
 ctx.studies=JSON.parse(stored);runInNewContext('renderStudies()',ctx);
 nodes.savedStudies.children[0].children[0].onclick();
 assert.deepEqual(getBriefStudy(M.defaults).inputs,wanted);
 blocked=true;nodes.savedStudies.children[0].children[1].onclick();
 assert.equal(ctx.studies.length,1);assert.equal(messages.at(-1),'s.deleteFail');
 resetBrief();
});
