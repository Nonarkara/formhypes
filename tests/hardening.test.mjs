import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,evaluate,searchPlan,scoreCandidate,rank} from '../dist/model.js';

test('ranking is independent of candidate arrival order when scores tie',()=>{
 const s={...defaults,family:'rub',span:60.13,aspect:1.25,floors:22,height:4.85,taper:.64,twist:80,core:18,common:14,frontage:6.5,site:90,maxHeight:290,program:'hkifc',regime:'yield',system:'column-grid',orientation:85};
 const results=searchPlan(s).list.map(c=>scoreCandidate(c,'corners'));
 const key=r=>r.state.family+'|'+r.state.taper+'|'+r.state.twist;
 const a=rank(results).map(key);
 for(let i=0;i<5;i++){const shuffled=[...results].sort(()=>Math.random()-.5);assert.deepEqual(rank(shuffled).map(key),a)}
});

test('a terrace level cannot charge corner premium on plate it gives away',()=>{
 const base={...defaults,family:'box',floors:70,program:'custom',frontage:9,taper:1};
 const none=evaluate({...base,garden:'none'}),half=evaluate({...base,garden:'half'});
 assert.ok(half.cornerArea<none.cornerArea,'terraces must reduce the corner area');
 assert.ok(half.cornerArea<=half.rentable);
});

test('stored studies off the slider grid or of the wrong type are refused',()=>{
 const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
 assert.match(app,/const onStep=/);
 assert.match(app,/x\[k\]>=1&&x\[k\]<300/,'span below 1 m crashes the OBJ cap triangulation');
 assert.match(app,/typeof s\.state==='object'&&!Array\.isArray\(s\.state\)/);
});

test('every drafting rule() call passes two full points before its options',()=>{
 for(const f of ['core.js','details.js','facade.js','walk.js','app.js']){
  const src=readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');
  for(const m of src.matchAll(/\brule\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g)){
   const args=m[1].split(/,(?![^{]*\})/);
   if(args.some(a=>a.trim().startsWith('{')))assert.ok(args.findIndex(a=>a.trim().startsWith('{'))>=4,`${f}: rule(${m[1]}) passes options as a coordinate`);
  }
 }
});
