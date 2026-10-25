import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {MATERIALS,MATERIAL_KEYS,materialAssumptions} from '../dist/materials.js';
import {defaults,evaluate} from '../dist/model.js';
import {translator} from '../dist/i18n.js';
import {displayText} from '../dist/preferences.js';

const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');

test('material scenario provenance describes the actual reserve and capital consequences',()=>{
 const base=evaluate({...defaults,material:'float'});
 for(const material of MATERIAL_KEYS){
  const state={...defaults,material},m=evaluate(state),basis=materialAssumptions(state);
  assert.equal(basis.material,material);
  assert.equal(basis.basis,'scenario-2026');
  assert.equal(basis.verified,false);
  assert.equal(basis.product,null);assert.equal(basis.epd,null);
  assert.equal(basis.baseline,'float glass = 1.00');
  assert.equal(basis.multiplier,MATERIALS[material].envelope);
  assert.ok(basis.affects.includes('annual envelope reserve'));
  assert.ok(basis.affects.includes('envelope capital cost'));
  assert.ok(Math.abs(m.facadeCost-base.facadeCost*basis.multiplier)<1e-6);
  assert.ok(Math.abs(m.capexEnvelope-base.capexEnvelope*basis.multiplier)<1e-6);
  assert.equal(m.gross,base.gross);assert.equal(m.rent,base.rent);
  assert.ok(Math.abs((m.contribution-base.contribution)+(m.facadeCost-base.facadeCost))<1e-6);
 }
});

test('rendered material notes disclose an unverified financial scenario in every language',()=>{
 const start=app.indexOf("if($('materialNote'))"),end=app.indexOf('\n',start);
 assert.ok(start>=0&&end>start);
 const source=app.slice(start,end);
 const markers={en:/unverified assumption/,th:/สมมติฐานที่ยังไม่ผ่านการตรวจสอบ/,zh:/未经验证的假设/};
 for(const lang of ['en','th','zh'])for(const material of MATERIAL_KEYS){
  const note={textContent:''};
  runInNewContext(source,{displayText,lang,tt:translator(lang),state:{material},mt:MATERIALS[material],$:()=>note});
  assert.match(note.textContent,markers[lang]);
  assert.ok(note.textContent.includes(MATERIALS[material].envelope.toFixed(2)));
  assert.doesNotMatch(note.textContent,/Sears|1929|kgCO|published ranges/);
 }
});

test('the actual study download carries the selected material assumption',()=>{
 const start=app.indexOf("$('exportJson').onclick="),end=app.indexOf("$('exportQty').onclick=",start);
 assert.ok(start>=0&&end>start);
 const state={...defaults,material:'pv'},nodes={exportJson:{},studyName:{value:''},studyNote:{value:''}};
 let data;
 runInNewContext(app.slice(start,end),{
  $:id=>nodes[id],state,metrics:evaluate(state),lang:'en',materialAssumptions,
  cleanStudyName:x=>x,cleanStudyNote:x=>x,getPreferences:()=>({currency:'USD'}),
  getRateBook:()=>({source:'fixture',date:'2026-10-25',rates:{USD:1}}),
  getEnvironmentStudy:()=>({}),getLocationStudy:()=>({}),getFengStudy:()=>({}),getFengPlayStudy:()=>({}),getBriefStudy:()=>({}),getWalkStudy:()=>({}),
  regimes:{[state.regime]:{label:'fixture'}},howMeasured:()=>({}),
  download:(name,text)=>{data=JSON.parse(text)},
 });
 nodes.exportJson.onclick();
 assert.deepEqual(data.materialScenario,materialAssumptions(state));
 assert.equal(data.materialScenario.multiplier,1.55);
 assert.equal(data.units.currency,'USD');
});
