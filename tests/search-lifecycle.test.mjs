import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {defaults,searchPlan,scoreCandidate,rank,rerank,regimes} from '../dist/model.js';
const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
// Execute the real controller functions against a deterministic scheduler. A
// source substring in a comment cannot satisfy these lifecycle checks.
const handler=app.slice(app.indexOf(' obj.onchange=()=>'),app.indexOf('\n };',app.indexOf(' obj.onchange=()=>'))+4);
const search=app.slice(app.indexOf('let searchToken=0'),app.indexOf('function applyCandidate'));
const finish=app.slice(app.indexOf('function finishSearch'),app.indexOf('// Split from the run'));
const changed=app.slice(app.indexOf('function changed()'),app.indexOf('/* ── update'));
function harness(){
 const queue=[],published=[],shared=[];let clock=0,calls=0,plans=0,updates=0;
 const el=()=>({replaceChildren(){},append(){}}),host=el(),obj={value:'contribution'};
 const ctx={obj,state:{regime:'yield'},searchRun:null,alternatives:[],
  $:id=>id==='objective'?obj:host,document:{createElement:el},tt:k=>k,ruleMark:el,
  performance:{now:()=>clock},setTimeout:f=>queue.push(f),
  history:{replaceState:(_a,_b,url)=>shared.push(url)},location:{hash:'#studio'},
  searchPlan:()=>{plans++;return {examined:8,list:Array.from({length:8},(_,id)=>({id}))}},
  scoreCandidate:(s,o)=>{calls++;clock+=5;return {state:s,metrics:{valid:true},score:o}},
  rerank:(results,objective)=>results.map(r=>({...r,score:objective})),
  renderSearch:()=>published.push(ctx.searchRun.objective),update:()=>updates++};
 runInNewContext(search+finish+changed+handler+'\nthis.start=runSearch;this.change=changed;',ctx);
 return {ctx,obj,queue,published,shared,host,counts:()=>({calls,plans,updates}),flush(){while(queue.length)queue.shift()()}};
}
test('an objective changed during the first sliced search is the one published',()=>{
 const h=harness();h.ctx.start();
 assert.deepEqual(h.counts(),{calls:2,plans:1,updates:0}); // yields after 10ms, not twelve candidates
 h.obj.value='facade';h.obj.onchange();h.flush();
 assert.deepEqual(h.published,['facade']);assert.equal(h.ctx.searchRun.objective,'facade');
 assert.ok(h.ctx.alternatives.every(r=>r.score==='facade'));
 assert.equal(h.counts().calls,8);assert.match(h.shared.at(-1),/objective=facade/);
});
test('completed runs reuse the original candidates after Apply and objective changes',()=>{
 const h=harness();h.ctx.start();h.flush();const run=h.ctx.searchRun,results=run.results;
 h.ctx.state={regime:'yield',family:'applied',floors:72};
 h.obj.value='facade';h.obj.onchange();
 assert.equal(h.ctx.searchRun,run);assert.equal(run.results,results);
 assert.deepEqual(h.counts(),{calls:8,plans:1,updates:0});
 assert.ok(h.ctx.alternatives.every(r=>r.score==='facade'),'completed results kept the old scores');
 assert.equal(run.objective,'facade');assert.deepEqual(h.published,['contribution','facade']);
});
test('design edits cancel pending work without constructing a candidate plan',()=>{
 const h=harness();h.ctx.start();h.ctx.change();h.flush();
 assert.deepEqual(h.counts(),{calls:2,plans:1,updates:1});assert.equal(h.ctx.searchRun,null);
 assert.deepEqual(h.published,[]);assert.ok(h.host.innerHTML.includes('s.changed'));
});
test('a replacement run cannot publish the cancelled run',()=>{
 const h=harness();h.ctx.start();h.obj.value='rent';h.ctx.start();h.flush();
 assert.deepEqual(h.published,['rent']);assert.equal(h.counts().calls,10);
});
test('cached ranking matches fresh evaluation for every objective and regime',()=>{
 for(const regime of Object.keys(regimes)){
  const plan=searchPlan({...defaults,regime,floors:12});
  // A stride coprime with the 16-cell grid visits every family and both heights.
  const candidates=plan.list.filter((_,i)=>i%7===0);
  const cached=candidates.map(c=>scoreCandidate(c,'contribution'));
  const original=cached.map(r=>r.score);
  for(const objective of ['contribution','rent','yieldOnCost','corners','facade','silhouette']){
   const fresh=rank(candidates.map(c=>scoreCandidate(c,objective))),reused=rerank(cached,objective);
   assert.deepEqual(reused.map(r=>[r.state.family,r.state.taper,r.state.twist,r.state.floors,r.score]),fresh.map(r=>[r.state.family,r.state.taper,r.state.twist,r.state.floors,r.score]),regime+' '+objective);
   for(const r of reused)assert.ok(cached.some(c=>c.metrics===r.metrics),'metrics were recomputed');
  }
  assert.deepEqual(cached.map(r=>r.score),original,'reranking mutated the captured run');
 }
});

test('the published summary names the captured rule, including City competition',()=>{
 const source=app.slice(app.indexOf('function renderSearch(){'),app.indexOf('// The table ranks'));
 const host={innerHTML:''},record={state:{family:'box',taper:1,twist:0},metrics:{contribution:10,gross:100,rentable:75,corners:4,height:200,heightTotal:200}};
 for(const inert of [false,true]){
  const ctx={regimes,searchRun:{plan:{examined:1,target:100,heightVariants:1},objective:'facade',elapsed:5},state:{regime:inert?'competition':'yield'},
   alternatives:[record],metrics:{contribution:8},$:id=>{assert.equal(id,'searchResults','summary must not read the current selector');return host},
   document:{querySelectorAll:()=>[]},studyFocus:()=>null,restoreStudyFocus(){},objectiveInert:()=>inert,tt:k=>k,num:String,money:String,drawStudy(){},toast(){}};
  runInNewContext(source+'\nrenderSearch();',ctx);
  assert.ok(host.innerHTML.includes(inert?'s.rankingCompetition':'s.objective.facade'));
 }
});

test('replacing chart controls restores the same focused control without scrolling',()=>{
 const source=app.slice(app.indexOf('function studyFocus(){'),app.indexOf('function drawStudy(){'));
 let active=null;const old={getAttribute:()=> 'family:hexagon'},replacement={getAttribute:()=> 'family:hexagon',focus:options=>{assert.equal(options.preventScroll,true);active=replacement}};
 const host={contains:n=>n===old,querySelectorAll:()=>[replacement]},ctx={$:()=>host,document:{activeElement:old}};
 runInNewContext(source+'\nthis.key=studyFocus();restoreStudyFocus(this.key);',ctx);
 assert.equal(ctx.key,'family:hexagon');assert.equal(active,replacement);
});
