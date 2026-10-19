import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,families,stackHeight} from '../dist/model.js';
import {leastWidth,structureRead,STRUCT_TEXT,DIAGRID_OPTIMUM} from '../dist/structure.js';

const near=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<=e,`${a} != ${b}`);

test('least width is the weakest direction, not the span',()=>{
 near(leastWidth([[0,0],[10,0],[10,4],[0,4]]),4);
 near(leastWidth([[0,0],[10,0],[5,10*Math.sqrt(3)/2]]),10*Math.sqrt(3)/2); // equilateral: its height
 const rot=a=>[[0,0],[10,0],[10,4],[0,4]].map(([x,y])=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)]);
 near(leastWidth(rot(.7)),4,1e-9);
});

test('structure read is finite for every family and system, and follows its stated rules',()=>{
 for(const family of Object.keys(families))for(const system of ['column-grid','outrigger','diagrid'])for(const floors of [12,48,70]){
  const s={...defaults,family,system,floors},r=structureRead(s);
  for(const k of ['H','bBase','lambda','tEC','tASCE','vCrit','coreShare'])assert.ok(Number.isFinite(r[k])&&r[k]>0,`${family}/${system}/${floors} ${k}`);
  near(r.tEC,stackHeight(s)/46);                  // EN 1991-1-4 F.2
  near(r.tASCE,0.0488*Math.pow(stackHeight(s),.75)); // ASCE 7 Table 12.8-2, metric
  assert.ok(r.tASCE<r.tEC,'ASCE Ta is the lower bound of the band');
  near(r.lambda,r.H/r.bBase);
  assert.equal(r.skyLobby,Math.ceil(floors/16)>4);
 }
});

test('the diagrid angle is read from the module and judged against the published band',()=>{
 const r=structureRead({...defaults,system:'diagrid',height:4.1});
 near(r.diagridAngle,Math.atan2(8*4.1,6)*180/Math.PI);
 assert.equal(r.diagridInBand,r.diagridAngle>=DIAGRID_OPTIMUM[0]&&r.diagridAngle<=DIAGRID_OPTIMUM[1]);
 assert.equal(structureRead({...defaults,system:'outrigger'}).diagridAngle,null);
});

test('structure text has the same keys in all three languages',()=>{
 const keys=o=>Object.entries(o).flatMap(([k,v])=>typeof v==='object'?keys(v).map(x=>k+'.'+x):[k]).sort();
 assert.deepEqual(keys(STRUCT_TEXT.th),keys(STRUCT_TEXT.en));
 assert.deepEqual(keys(STRUCT_TEXT.zh),keys(STRUCT_TEXT.en));
});
