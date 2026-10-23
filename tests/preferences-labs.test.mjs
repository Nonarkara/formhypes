import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,evaluate} from '../dist/model.js';
import {readFileSync} from 'node:fs';
// Match the stamped URL used by the labs so Node shares their preference instance.
const preferenceEdge=readFileSync(new URL('../dist/lifts.js',import.meta.url),'utf8').match(/from ['"](\.\/preferences\.js(?:\?v=[^'"]+)?)['"]/)[1];
const {setPreferences,resetPreferences,toDisplay,displayText}=await import(new URL('../dist/'+preferenceEdge.slice(2),import.meta.url));
import {liftPlan,liftsMethodPayload,liftsMethodSVG,renderLiftsLab} from '../dist/lifts.js';
import {fireRead,fireMethodSVG} from '../dist/fire.js';
import {windRead,windMethodPayload,windMethodSVG,renderWindLab} from '../dist/wind.js';
import {supplyDesign,waterMethodPayload,waterMethodSVG} from '../dist/water.js';
import {glareDay,glareMethodPayload,glareMethodSVG} from '../dist/glare.js';
import {carbonRead,carbonMethodSVG,renderCarbonLab} from '../dist/carbon.js';

const plain=svg=>[...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map(x=>x[1]).join(' ');
const model={...defaults,floors:24},metrics=evaluate(model);
const co={concrete:'C40/50',ggbs:25,rebarEAF:56,steelEAF:46,km:300,core:defaults.core};
const carbon=carbonRead(model,co);
const wind=windMethodPayload(windRead(model,{},metrics));
const cases=[
 ['lifts',liftsMethodPayload(liftPlan(model,{speed:5},metrics)),liftsMethodSVG,/RTT/],
 ['fire',fireRead(model,{strategy:'simultaneous',refuge:'off'},metrics),fireMethodSVG,/\bin\b/],
 ['wind',wind,windMethodSVG,/ft\/s/],
 ['water',waterMethodPayload(supplyDesign(model,metrics,{})),waterMethodSVG,/ft|US gal/],
 ['glare',glareMethodPayload(glareDay(model,{city:'bangkok',date:'2026-06-21',stepMin:60})),glareMethodSVG,/ft|Btu/],
 ['carbon',{h:carbon.here,tower:carbon.hereTw,system:carbon.system,options:co},carbonMethodSVG,/lbCO₂e\/ft²/],
];

test('all six method sheets emit selected units in EN, TH and ZH without changing their payloads',()=>{
 try{
  for(const [name,payload,render,unit]of cases){
   const canonical=structuredClone(payload);
   for(const lang of ['en','th','zh']){
    resetPreferences();const metric=render(payload,{lang});
    setPreferences({units:'imperial',currency:'THB'});const imperial=render(payload,{lang});
    assert.match(plain(imperial),unit,name+' '+lang+' did not convert its drawing');
    if(name==='lifts')assert.equal(plain(imperial),plain(metric),'seconds and counts must stay unchanged');
    else assert.notEqual(plain(imperial),plain(metric),name+' '+lang+' presentation unchanged');
    if(name==='fire')assert.ok(plain(imperial).includes(toDisplay(payload.riser,'mm').toFixed(2)+'/'+toDisplay(payload.treadMM,'mm').toFixed(2)+' in'),'stair dimensions were relabelled without converting');
    assert.deepEqual(payload,canonical,name+' altered canonical calculations');
    assert.doesNotMatch(imperial,/NaN|undefined|Infinity/);
    resetPreferences();assert.equal(render(payload,{lang}),metric,name+' did not return to exact metric drawing');
   }
  }
 }finally{resetPreferences()}
});

test('wind method dimensions show the actual converted height, not relabelled metres',()=>{
 try{
  resetPreferences();const metric=plain(windMethodSVG(wind));
  const canonicalHeight=wind.H.toFixed(1)+' m';assert.ok(metric.includes(canonicalHeight));
  setPreferences({units:'imperial'});
  assert.ok(plain(windMethodSVG(wind)).includes(displayText(canonicalHeight)), 'height numeric value was not converted');
 }finally{resetPreferences()}
});

function stub(tag){return{tagName:tag.toUpperCase(),childNodes:[],attrs:{},className:'',id:'',value:'',style:{},isConnected:false,clientWidth:0,clientHeight:0,_t:'',_h:'',
 classList:{add(){},remove(){},toggle(){}},append(...nodes){this.childNodes.push(...nodes)},appendChild(n){this.append(n);return n},replaceChildren(...n){this.childNodes=n},
 get children(){return this.childNodes},contains(n){return this===n||this.childNodes.some(c=>c?.contains?.(n))},
 setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]},addEventListener(){},removeEventListener(){},getContext(){return null},
 querySelector(){return null},get textContent(){return this._t+this.childNodes.map(c=>typeof c==='string'?c:c.textContent).join('')},set textContent(v){this._t=String(v);this.childNodes=[]},get innerHTML(){return this._h},set innerHTML(v){this._h=String(v)}}}
const find=(n,id)=>n.id===id?n:n.childNodes.map(c=>c&&typeof c==='object'?find(c,id):null).find(Boolean);
function withDOM(run){const real=globalThis.document;globalThis.document={createElement:stub,createElementNS:(_,t)=>stub(t),getElementById(){return null},activeElement:{id:''}};try{run()}finally{globalThis.document=real;resetPreferences()}}

test('wind and lift speed controls convert value, limits, step and input back to canonical speed',()=>withDOM(()=>{
 for(const [render,id]of [[renderWindLab,'wl-vb'],[renderLiftsLab,'lt-speed']]){
  resetPreferences();const host=stub('div');render({host,state:model,metrics,lang:'en',active:true});
  const input=find(host,id);assert.ok(input,id+' did not render');const canonical={min:+input.min,max:+input.max,step:+input.step,value:+input.value};
  setPreferences({units:'imperial'});render({host,state:model,metrics,lang:'en',active:true});
  const converted=find(host,id);
  for(const k of ['min','max','step','value'])assert.ok(Math.abs(+converted[k]-toDisplay(canonical[k],'m/s'))<1e-8,id+' '+k+' mismatch');
  converted.value=toDisplay(5,'m/s');converted.oninput();
  resetPreferences();render({host,state:model,metrics,lang:'en',active:true});
  assert.ok(Math.abs(+find(host,id).value-5)<1e-8,id+' changed the wrong canonical speed');
 }
}));

test('carbon unit-rate inputs use selected currency and volume/mass, preserving the USD model rates',()=>withDOM(()=>{
 resetPreferences();const host=stub('div');renderCarbonLab({host,state:model,metrics,lang:'en',active:true});
 const base=+find(host,'cb-rate-conc').value;assert.ok(base>0,'rate control did not render');
 setPreferences({units:'imperial',currency:'THB'});renderCarbonLab({host,state:model,metrics,lang:'en',active:true});
 const input=find(host,'cb-rate-conc');assert.ok(Math.abs(+input.value-toDisplay(base,'USD/m³'))<1e-8);
 assert.match(host.textContent,/THB\/ft³/);input.valueAsNumber=toDisplay(200,'USD/m³');input.oninput();
 resetPreferences();renderCarbonLab({host,state:model,metrics,lang:'en',active:true});
 assert.ok(Math.abs(+find(host,'cb-rate-conc').value-200)<1e-8);
}));
