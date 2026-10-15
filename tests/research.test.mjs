import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {TRACKS,RESEARCH_UI,RESEARCH_SOURCES,THESIS_EXCERPTS,PROTOCOL_FILES,HISTORY_PHOTO} from '../dist/research-tracks.js';
import {researchComparison,readingSelection,researchProtocol} from '../dist/research-reader.js';
import {defaults,grossOf,evaluate} from '../dist/model.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);
const text=(l)=>JSON.stringify(TRACKS[l]);
test('three research paths and all nine chapters have complete EN TH ZH structures',()=>{
 const shape=ts=>ts.map(t=>[t.id,t.pages.map(p=>[p.id,p.diagram,p.labels.length,p.artifacts?.map(a=>a.id),p.table?.rows.map(r=>r.length),!!p.action,!!p.comparison,!!p.download])]);
 for(const l of ['en','th','zh']){
  assert.equal(TRACKS[l].length,3);assert.deepEqual(shape(TRACKS[l]),shape(TRACKS.en));
  assert.deepEqual(Object.keys(RESEARCH_UI[l]),Object.keys(RESEARCH_UI.en));
  for(const t of TRACKS[l]){
   assert.ok(t.label&&t.intro);assert.equal(t.pages.length,3);
   for(const p of t.pages){
    assert.equal(p.paras.length,3);assert.ok(p.paras.every(s=>s.length>(l==='zh'?60:100)));
    assert.ok(p.labels.length>=4);assert.ok(p.title&&p.tab&&p.stand);
    const all=[p.title,p.tab,...p.paras,...p.labels,...(p.table?.rows.flat()||[])];
    if(l==='th')for(const s of all)assert.match(s,/[ก-๙]/,s);
    if(l==='zh')for(const s of all)assert.match(s,/[\u3400-\u9fff]/,s);
    for(const para of p.paras)for(const [,id]of para.matchAll(/\[([a-z]+)\]/g))assert.ok(RESEARCH_SOURCES.some(s=>s.id===id),id);
    for(const a of p.artifacts||[])assert.ok(THESIS_EXCERPTS[a.id]&&a.caption.length>(l==='zh'?15:30));
   }
  }
  assert.doesNotMatch(text(l),/Xiaohei|egotist|asshole/i);
  assert.match(RESEARCH_UI[l].by,/Dr Non/);assert.match(RESEARCH_UI[l].by,/depa \+ Axiom/);
  assert.match(RESEARCH_UI[l].contribution,/USD/);assert.equal(RESEARCH_UI[l].atlasLabels.length,11);assert.ok(HISTORY_PHOTO.caption[l]);
 }
});
test('thesis reading spans all chapters, implementation and original limitations with attributable artifacts',()=>{
 const thesis=TRACKS.en[0];assert.equal(thesis.pages[0].table.rows.length,6);
 assert.match(text('en'),/Profile Finding/);assert.match(text('en'),/Point Finding/);
 assert.match(text('en'),/VB.Net/);assert.match(text('en'),/RhinoScript/);
 assert.match(thesis.pages[2].paras[2],/connections behind the skin, interior programmes, and structural or ecological performance/);
 assert.deepEqual(THESIS_EXCERPTS.map(a=>[a.figure,a.page]),[[34,41],[36,43],[76,94],[38,47],[40,52],[49,63]]);
 for(const a of THESIS_EXCERPTS){const b=readFileSync(new URL('../dist/'+a.src,import.meta.url));assert.equal(b.subarray(1,4).toString(),'PNG');assert.ok(b.length>4000)}
});
test('equal-area research experiment preserves all non-family assumptions and actual Studio area accounting',()=>{
 for(const s of [defaults,{...defaults,program:'custom',height:4.55,floors:30,twist:25,taper:.9,premium:0},{...defaults,regime:'civic',core:20,span:32}]){
  const frozen=JSON.stringify(s),target=grossOf(s),rows=researchComparison(s);
  assert.equal(JSON.stringify(s),frozen);assert.deepEqual(rows.map(r=>r.family),['box','cross','oval']);
  for(const r of rows){near(r.metrics.gross,target);near(r.metrics.gross,r.metrics.core+r.metrics.common+r.metrics.rentable);
   for(const [k,v]of Object.entries(s))if(!['family','span'].includes(k))assert.equal(r.state[k],v,k);
   near(r.metrics.contribution,evaluate(r.state).contribution);
   if(s.premium===0)near(r.metrics.breakdown.rentCorner,0);
  }
 }
 const rows=researchComparison({...defaults,core:30,span:24});assert.ok(rows.some(r=>!r.metrics.valid),'failed model cases must remain available');
 const a=researchComparison(defaults),b=researchComparison({...defaults,rent:defaults.rent*2});
 assert.ok(b.every((r,i)=>r.metrics.contribution>a[i].metrics.contribution));
});
test('reading links resolve validated chapter identities and reject inherited or unknown keys',()=>{
 assert.deepEqual(readingSelection('?reading=value&chapter=test'),{track:2,page:1});
 for(const q of ['','?reading=constructor&chapter=__proto__','?reading=missing&chapter=missing'])assert.deepEqual(readingSelection(q),{track:0,page:0});
 assert.deepEqual(readingSelection('?reading=system&chapter=paper'),{track:1,page:0});
});
test('paper download has real content and evidence links in all languages',()=>{
 for(const l of ['en','th','zh']){const p=researchProtocol(l);assert.ok(p.length>2500);assert.ok(p.includes(RESEARCH_UI[l].protocolState));assert.ok(p.includes(TRACKS[l][2].pages[2].title));assert.ok(p.includes('https://dspace.mit.edu/'));assert.doesNotMatch(p,/\[(chen|non|urban|agency)\]/);assert.equal(readFileSync(new URL('../dist/'+PROTOCOL_FILES[l],import.meta.url),'utf8'),p);}
 const en=researchProtocol('en');assert.match(en,/no participant, leasing or willingness-to-pay results collected/);assert.match(en,/Counterbalance/);assert.match(en,/held-out/);assert.match(en,/consent/);
});
test('new research dependency graph and all excerpts carry content-derived release pins',()=>{
 for(const file of ['app.js','research-reader.js','research-tracks.js']){
  const src=readFileSync(new URL('../dist/'+file,import.meta.url),'utf8');
  for(const [,ref,id]of src.matchAll(/["']((?:\.\/)?(?:research\/artifacts\/)?[\w.-]+\.(?:js|png))\?v=([a-f0-9]{10})["']/g)){
   const bytes=readFileSync(new URL('../dist/'+ref,import.meta.url),'utf8');assert.equal(createHash('sha256').update(bytes).digest('hex').slice(0,10),id,ref);
  }
 }
});
