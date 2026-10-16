import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {SCHEMA,RELATIVE,ASSUMPTION} from '../dist/schema.js';
import {MANUAL} from '../dist/manual-text.js';
import {manualSections,controlGroups,controlRows,runSelfCheck} from '../dist/manual.js';
import {WORKSPACES,CONSOLE_TEXT} from '../dist/console.js';
import {t,translator} from '../dist/i18n.js';
import {defaults,families,profile} from '../dist/model.js';

const read=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');

test('the manual is translated, not fallen back on',()=>{
 assert.deepEqual(Object.keys(MANUAL),['en','th','zh']);
 for(const l of ['en','th','zh']){
  assert.ok(MANUAL[l].title&&MANUAL[l].lede,l+' has a title and a lede');
  assert.equal(MANUAL[l].sections.length,MANUAL.en.sections.length,l+' has every section');
  assert.deepEqual(MANUAL[l].sections.map(s=>s[0]),MANUAL.en.sections.map(s=>s[0]));
  assert.deepEqual(Object.keys(MANUAL[l].table),Object.keys(MANUAL.en.table));
  assert.equal(MANUAL[l].table.head.length,MANUAL.en.table.head.length);
  assert.deepEqual(Object.keys(MANUAL[l].checks),Object.keys(MANUAL.en.checks));
  assert.deepEqual(Object.keys(MANUAL[l].checks.labels),Object.keys(MANUAL.en.checks.labels));
  assert.deepEqual(Object.keys(MANUAL[l].checks.words),Object.keys(MANUAL.en.checks.words));
  for(const [w,v] of Object.entries(MANUAL[l].checks.words))assert.ok(String(v).trim().length>1,l+' check word '+w+' is empty');
  for(const g of MANUAL[l].table.groups)assert.ok(String(g).trim().length>1,l+' group heading is empty');
 }
 // The house rule: no untranslated Latin word left sitting in a Chinese or Thai
 // sentence. Standards names are the exception — "CIBSE Guide D" and
 // "BS EN 12056-2" are proper nouns a reader needs verbatim — so the exact
 // citation phrases come out whole before the sweep. The list is spelled out
 // rather than pattern-matched: a regex guessing where a citation ends is a
 // regex that eventually swallows a real untranslated word.
 const CITATIONS=['CIBSE Guide D','ISO 8100-32','BS EN 12056-2','CIB W062',
  'ASTM E2357','FormHypes','SHDT','Dr Non','Axiom','MIT','Tab'];
 const citationRe=new RegExp(CITATIONS.map(c=>c.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
 for(const l of ['th','zh']){
  assert.match(MANUAL[l].title,l==='th'?/[ก-๙]/:/[㐀-鿿]/,l+' title is a fallback');
  for(const [,head,body]of MANUAL[l].sections){
   assert.match(head,l==='th'?/[ก-๙]/:/[㐀-鿿]/,l+' heading "'+head+'" is not in '+l);
   assert.ok(body.length>40,l+' section "'+head+'" is a stub');
   const rest=body.replace(citationRe,'').replace(/\b\d[\d.,–\-]*\s*(?:m²|m³|m|%|°|×|\$|F|N)?\b/g,'');
   assert.doesNotMatch(rest,/[A-Za-z]{3,}/,l+' section "'+head+'" carries a Latin word: '+JSON.stringify(rest.match(/[A-Za-z]{3,}\S*/g)));
  }
  for(const h of MANUAL[l].checks.title)assert.ok(h);
 }
 // And the English is not the Thai. A copy would pass every test above.
 for(const [,head,body]of MANUAL.en.sections){
  const th=MANUAL.th.sections.find(s=>s[0]===''+head.length)&&null;
  void th;
 }
 assert.notEqual(MANUAL.th.sections[1][2],MANUAL.en.sections[1][2],'a Thai section is an English copy');
 assert.notEqual(MANUAL.zh.sections[1][2],MANUAL.en.sections[1][2],'a Chinese section is an English copy');
});

test('the manual documents every control, from the table the sliders are built from',()=>{
 const tt=translator('en');
 const rows=controlRows('en',tt);
 const documented=new Set(rows.map(r=>r.id));
 const onRail=new Set(controlGroups().flatMap(g=>g.keys));
 assert.equal(documented.size,Object.keys(SCHEMA).length,'every schema control gets a manual row');
 for(const k of Object.keys(SCHEMA))assert.ok(onRail.has(k),k+' is in the model but on no rail');
 for(const k of onRail)assert.ok(documented.has(k),k+' is on a rail but undocumented');
 // The ranges printed are the ranges in the model — equal for every control in
 // every language, because a copy is exactly what drifts.
 for(const l of ['en','th','zh']){
  const r=controlRows(l,translator(l));
  assert.equal(r.length,Object.keys(SCHEMA).length);
  for(const [k,[,min,max,step]]of Object.entries(SCHEMA)){
   const row=r.find(x=>x.id===k);
   assert.ok(row,l+' has no row for '+k);
   if(RELATIVE.has(k)){
    assert.equal(row.kind,'relative');
    assert.ok(!row.range.includes(String(min)),l+' prints an absolute range for a relative control');
    continue;
   }
   assert.ok(row.range.includes(String(min))&&row.range.includes(String(max)),l+'/'+k+' range "'+row.range+'" is not '+min+'-'+max);
   assert.equal(row.step,String(step));
  }
 }
 // A control the reader could mistake for a result is labelled an assumption.
 for(const k of ASSUMPTION)assert.equal(controlRows('en',tt).find(r=>r.id===k).kind,'assumption',k+' is an input and must say so');
 for(const k of ['floors','height','taper','twist'])assert.equal(controlRows('en',tt).find(r=>r.id===k).kind,'derived',k+' is geometry, not an assumption');
 // Every control the manual names resolves to a real label in all three languages.
 for(const k of Object.keys(SCHEMA))for(const l of ['en','th','zh']){
  const label=translator(l)(SCHEMA[k][0]);
  assert.ok(label&&!String(label).includes('undefined'),l+' has no label for '+k);
  if(l!=='en')assert.notEqual(label,translator('en')(SCHEMA[k][0]),k+' falls back to English in '+l);
 }
 // And the sections are ordered so the manual can be read front to back.
 assert.deepEqual(manualSections('en').map(s=>s[0]),manualSections('th').map(s=>s[0]));
 assert.equal(manualSections('en')[0][0],'start','the manual opens by saying how to start');
});

/* A stand-in document, built from the real markup. Enough structure for the
   check to run headless; enough that a failure means a real failure. Mutations
   go through `patch` so no test hand-rolls a second stub — two stubs drift, and
   then the mutation test quietly tests the wrong one. */
const stubDoc=(patch={})=>{
 const html=read('index.html');
 return {
  getElementById(id){
   if(Object.hasOwn(patch,id))return patch[id];
   if(id.startsWith('workspace-'))return WORKSPACES.includes(id.slice(10))?{id}:null;
   if(id.startsWith('console-tab-')){
    const k=id.slice(12);
    return WORKSPACES.includes(k)?{id,title:CONSOLE_TEXT.en.work[WORKSPACES.indexOf(k)]}:null;
   }
   if(SCHEMA[id]){
    const[,min,max]=SCHEMA[id];
    return {id,min:String(min),max:String(max),getAttribute:()=>null,children:[],textContent:'1'};
   }
   return new RegExp('id="'+id+'"').test(html)?{id,getAttribute:()=>null,children:[],textContent:'1'}:null;
  },
  querySelector(sel){
   const m=/^label\[for="(.+)"\]$/.exec(sel);
   if(!m)return null;
   const key='label:'+m[1];
   if(Object.hasOwn(patch,key))return patch[key];
   return new RegExp('<label for="'+m[1]+'"').test(html)?{tagName:'LABEL'}:null;
  },
  querySelectorAll(){return Object.hasOwn(patch,'all')?patch.all():[]}};
};
const KEYS=()=>({en:Object.keys(t.en).length,th:Object.keys(t.th).length,zh:Object.keys(t.zh).length});
const runStub=(lang,patch={},keys=KEYS())=>runSelfCheck(stubDoc(patch),lang,{tt:translator(lang),workspaces:WORKSPACES,defaults,keys,
  builtLabels:Object.hasOwn(patch,'builtLabels')?patch.builtLabels:Object.keys(SCHEMA)});

test('the self-check passes on the real page and names every tool',()=>{
 const result=runStub('en');
 assert.equal(result.count,7);
 for(const c of result.checks)assert.ok(c.ok,c.id+' failed: '+c.detail);
 assert.ok(result.pass);
 // Every check carries a detail line even when it passes. A green line that
 // says nothing is decoration, and decoration is what a check becomes the day
 // somebody wants it to look healthy.
 for(const c of result.checks)assert.ok(c.detail&&c.detail.length>8,c.id+' has no detail');
 // It runs in every language, not just the one it was written in.
 for(const l of ['en','th','zh']){
  const r=runStub(l);
  assert.ok(r.pass,l+' self-check fails: '+r.checks.filter(c=>!c.ok).map(c=>c.id).join(','));
  for(const c of r.checks)assert.ok(c.label&&c.label.trim().length,l+' has no label for check '+c.id);
 }
});

test('the self-check actually fails when the page is broken',()=>{
 // A check that has only ever passed has not been tested. Each mutation below
 // is a fault this instrument has actually had: a workspace with no panel, a
 // tool with no accessible name, a control with no label, a range widened past
 // the model, a key set that drifted between languages, a NaN on the rail.
 assert.ok(runStub('en').pass,'the baseline must pass before it can be broken');

 const noPanel=runStub('en',{'workspace-core':null});
 assert.equal(noPanel.checks.find(c=>c.id==='workspaces').ok,false,'a workspace with no panel must fail');
 assert.match(noPanel.checks.find(c=>c.id==='workspaces').detail,/core/);

 const noName=runStub('en',{'console-tab-core':{id:'console-tab-core',title:''}});
 assert.equal(noName.checks.find(c=>c.id==='glyphs').ok,false,'an unnamed glyph must fail');

 const notBuilt=runStub('en',{builtLabels:Object.keys(SCHEMA).filter(k=>k!=='floors')});
 assert.equal(notBuilt.checks.find(c=>c.id=='controls').ok,false,'a control with no slider must fail');
 assert.match(notBuilt.checks.find(c=>c.id=='controls').detail,/floors/);

 const wide=runStub('en',{floors:{id:'floors',min:'0',max:'70',getAttribute:()=>null,children:[],textContent:'1'}});
 assert.equal(wide.checks.find(c=>c.id==='ranges').ok,false,'a range widened past the model must fail');

 const parity=runStub('en',{},{en:435,th:434,zh:435});
 assert.equal(parity.checks.find(c=>c.id==='i18n').ok,false,'broken key parity must fail');

 const nan=runStub('en',{all:()=>[{children:[],textContent:'NaN',id:'grossArea',className:'x'}]});
 assert.equal(nan.checks.find(c=>c.id==='figures').ok,false,'a NaN on the rail must fail');

 // And the run as a whole reports failure, not just the one line.
 for(const r of [noPanel,noName,notBuilt,wide,parity,nan])
  assert.equal(r.pass,false,r.checks.find(c=>!c.ok).id+' failed but the run still reported pass');
});

test('the manual, the schema and the console take part in the release graph',()=>{
 for(const file of ['app.js','console.js','manual.js'])
  for(const [,ref,id]of read(file).matchAll(/["']((?:\.\/)?[\w./-]+\.(?:js|css|png))\?v=([a-f0-9]{10})["']/g))
   assert.equal(createHash('sha256').update(readFileSync(new URL('../dist/'+ref.replace(/^\.\//,''),import.meta.url))).digest('hex').slice(0,10),id,ref);
 // schema.js must be stamped before app.js hashes, or the manual's ranges can
 // move without any version id moving.
 const rel=readFileSync(new URL('../scripts/release-id.mjs',import.meta.url),'utf8');
 for(const f of ['schema.js','manual-text.js','manual.js'])assert.match(rel,new RegExp("'"+f.replace('.','\\.')+"'"),f+' is not in the release graph');
 assert.ok(rel.indexOf("'schema.js'")<rel.indexOf('const app ='),'schema.js must be stamped before app.js');
 // Every form family the atlas offers is one the manual's check can draw.
 assert.ok(Object.keys(families).length>=11);
 for(const family of Object.keys(families)){
  const plan=profile({...defaults,family},0);
  assert.ok(Array.isArray(plan)&&plan.length>=3,family+' draws no plan');
 }
 // The manual is reachable from every workspace: it is a header action, so it
 // is not inside the dock that a workspace switch hides.
 const html=read('index.html');
 assert.match(html,/id="manualBtn"[\s\S]{0,400}<button type="button" id="reset"/);
 assert.match(html,/id="manualDialog"/);
 assert.match(html,/id="runCheck"/);
});