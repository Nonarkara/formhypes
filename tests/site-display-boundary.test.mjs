import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderSite} from '../dist/context.js';
import {defaults,massingRings} from '../dist/model.js';
import {makeScene} from '../dist/site.js';
import {t} from '../dist/i18n.js';
import {withDom,walk,byText,byClass,stub} from './desk-dom.mjs';
const contextURL=new URL('../dist/context.js',import.meta.url);
const prefsURL=new URL(readFileSync(contextURL,'utf8').match(/from ['"](.\/preferences\.js[^'"]*)['"]/)[1],contextURL);
const P=await import(prefsURL);

test('rectangle controls use the selected unit and return canonical dimensions without changing the building',()=>{
 const dom=withDom(),state={...defaults,city:'bangkok'},before=structuredClone(state),prior=P.getPreferences();
 try{
  P.setPreferences({units:'imperial'});renderSite({lang:'en',state,changed(){}});byText(dom.hosts.siteDesk,'A rectangle').onclick();
  let input=walk(dom.hosts.siteDesk).find(n=>n.id==='siteRectW');
  assert.match(dom.hosts.siteDesk.textContent,/Width · ft/);
  assert.equal(input.step,'any');
  for(const [key,metres]of [['min',5],['max',600]])assert.ok(Math.abs(Number(input[key])-metres/.3048)<1e-9);
  input.value=50/.3048;input.onchange();
  P.setPreferences({units:'metric'});renderSite({lang:'en',state,changed(){}});
  input=walk(dom.hosts.siteDesk).find(n=>n.id==='siteRectW');assert.ok(Math.abs(Number(input.value)-50)<1e-8);
  input.value='oops';input.onchange();assert.equal(Number(input.value),50);assert.deepEqual(state,before);
 }finally{P.setPreferences(prior);dom.restore()}
});

test('a crossed outline shows a correction path and never offers appraisal or Apply',()=>{
 const dom=withDom(),state={...defaults,city:'tokyo'},create=document.createElement;
 const scene=makeScene({radius:700,towerH:massingRings(state).at(-1).z});
 document.createElement=tag=>{
  const node=create(tag);node.querySelector=selector=>{
   if(selector!=='svg'||node.className!=='st-fig')return null;
   if(!node.map){node.map=stub('svg');node.map.handlers={};node.map.addEventListener=(name,fn)=>node.map.handlers[name]=fn;
    node.map.viewBox={baseVal:{x:0,y:0,width:scene.width,height:scene.height}};
    node.map.getBoundingClientRect=()=>({left:0,top:0,width:scene.width,height:scene.height});}
   return node.map;
  };return node;
 };
 try{
  renderSite({lang:'en',state,changed(){}});byText(dom.hosts.siteDesk,'An outline').onclick();
  for(const [x,y]of [[-100,-100],[100,100],[-100,100],[100,-100]]){
   const [clientX,clientY]=scene.project(x,y,0);byClass(dom.hosts.siteDesk,'st-fig').querySelector('svg').handlers.click({clientX,clientY});
  }
  assert.ok(dom.hosts.siteDesk.textContent.includes(t.en['st.invalidOutline']));
  assert.equal(byClass(dom.hosts.siteDesk,'st-takes'),null);assert.equal(byText(dom.hosts.siteDesk,t.en['st.use']),null);
  assert.ok(byText(dom.hosts.siteDesk,t.en['st.undo']));assert.ok(byText(dom.hosts.siteDesk,t.en['st.clear']));
  assert.doesNotMatch(dom.hosts.siteDesk.textContent,/Infinity|NaN/);
 }finally{dom.restore()}
});

test('the capped-site range is explained once with one unit per quantity in EN/TH/ZH',()=>{
 const dom=withDom(),prior=P.getPreferences(),state={...defaults,city:'bangkok'};
 try{
  P.setPreferences({units:'imperial'});
  for(const lang of ['en','th','zh']){
   renderSite({lang,state,changed(){}});byText(dom.hosts.siteDesk,t[lang]['st.srcRect']).onclick();
   for(const id of ['siteRectW','siteRectD']){const input=walk(dom.hosts.siteDesk).find(n=>n.id===id);input.value=P.toDisplay(200,'m');input.onchange()}
   const block=byClass(dom.hosts.siteDesk,'st-takes'),prefix=t[lang]['st.takesClamp'].split('{0}')[0];
   assert.equal(block.childNodes.filter(n=>n._t.startsWith(prefix)).length,1,lang+' clamp explanation');
   assert.doesNotMatch(block.textContent,/ft\s*(?:ft|m\b|ม\.|米)/,lang+' repeated unit');
  }
 }finally{P.setPreferences(prior);dom.restore()}
});
