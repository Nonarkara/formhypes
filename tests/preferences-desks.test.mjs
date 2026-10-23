import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults,evaluate} from '../dist/model.js';
import {readFileSync} from 'node:fs';
// Exercise the same stamped module instance used by the shipped desk.
const briefURL=new URL('../dist/brief.js',import.meta.url);
const preferenceURL=new URL(readFileSync(briefURL,'utf8').match(/from ['\"](\.\/preferences\.js[^'\"]*)['\"]/)[1],briefURL);
const {getPreferences,setPreferences,toDisplay,getRateBook}=await import(preferenceURL.href);
import {quantityTable,quantityCsv,levelRows} from '../dist/quantity.js';
import {renderBrief,getBriefStudy,resetBrief} from '../dist/brief.js';
import {renderFacade,facadeFrame} from '../dist/facade.js';
import {renderDecision} from '../dist/decisions.js';
import {renderEnvironment} from '../dist/environment-desk.js';
import {ENV_BOUNDS} from '../dist/environment.js';
import {renderStructure,structureRead} from '../dist/structure.js';

function node(tag){return {tagName:tag.toUpperCase(),childNodes:[],attrs:{},style:{},_text:'',_html:'',className:'',id:'',value:'',classList:{add(){},remove(){},toggle(){}},
 append(...children){this.childNodes.push(...children)},insertBefore(child){this.childNodes.push(child)},appendChild(child){this.append(child);return child},replaceChildren(){this.childNodes=[];this._text=''},contains(){return false},focus(){},
 setAttribute(key,value){this.attrs[key]=value},getAttribute(key){return this.attrs[key]},checkValidity(){return true},reportValidity(){return true},
 get firstElementChild(){return this.childNodes[0]||node('svg')},get children(){return this.childNodes},get valueAsNumber(){return Number(this.value)},
 get textContent(){return this._text+this.childNodes.map(n=>n.textContent||'').join(' ')},set textContent(value){this._text=String(value)},get innerHTML(){return this._html},set innerHTML(value){this._html=value}}}
function withDOM(fn){const previous=globalThis.document,host=node('div');globalThis.document={activeElement:null,createElement:node,createElementNS:(_,tag)=>node(tag),createTextNode:text=>{const n=node('text');n.textContent=text;return n},getElementById:id=>['briefDesk','environmentDesk'].includes(id)?host:find(host,n=>n.id===id)};try{return fn(host)}finally{globalThis.document=previous}}
function find(root,check){if(check(root))return root;for(const child of root.childNodes||[]){const found=find(child,check);if(found)return found}return null}
function prefs(fn){const previous=getPreferences();try{setPreferences({units:'imperial',currency:'THB'});return fn()}finally{setPreferences(previous)}}
const state={...defaults,program:'custom',floors:12};

test('imperial quantity CSV declares selected units and balances converted level rows',()=>prefs(()=>{
 const canonical=levelRows(state),table=quantityTable(state,'en'),total=table.rows.at(-2),levels=table.rows.slice(0,-2);
 assert.match(table.headers[1],/ft/);assert.match(table.headers[2],/ft²/);assert.doesNotMatch(table.headers.join(' '),/m²/);
 const value=c=>Number(c.exact??c.v);
 assert.ok(Math.abs(value(total[2])-toDisplay(canonical.screen.gross,'m²'))<=.0051);
 for(let col=2;col<table.headers.length-1;col++)assert.equal(Math.round(levels.reduce((sum,row)=>sum+value(row[col]),0)*100),Math.round(value(total[col])*100),'printed column '+col);
 assert.match(quantityCsv(state,'th'),/ft²/);assert.match(total.at(-1),/canonical SI/);
 assert.deepEqual(levelRows(state),canonical,'presentation export cannot change canonical geometry');
}));

test('Brief imperial inputs convert value, bounds and step together and store SI on edit',()=>prefs(()=>withDOM(host=>{
 resetBrief();const snapshot=structuredClone(state);renderBrief({lang:'en',state,changed(){},onInputs(){}});
 const input=find(host,n=>n.id==='br-gfa'),before=getBriefStudy(state).inputs;
 assert.ok(Math.abs(Number(input.value)-toDisplay(before.gfa,'m²'))<1e-7);assert.equal(Number(input.min),toDisplay(1000,'m²'));assert.equal(Number(input.step),toDisplay(1000,'m²'));assert.match(host.textContent,/ft²/);
 input.value=toDisplay(85000,'m²');input.onchange();assert.ok(Math.abs(getBriefStudy(state).inputs.gfa-85000)<1e-8);assert.deepEqual(state,snapshot);
 resetBrief();
})));

test('façade millimetre and metre inputs edit the same assembly after imperial conversion',()=>prefs(()=>withDOM(host=>{
 renderFacade({host,lang:'en',state,level:1,onLevel(){}});const input=find(host,n=>n.id==='facade-joint');
 assert.equal(Number(input.value),toDisplay(20,'mm'));assert.equal(Number(input.min),toDisplay(5,'mm'));assert.match(host.textContent,/in/);
 input.value=toDisplay(30,'mm');input.onchange();assert.ok(Math.abs(Number(find(host,n=>n.id==='facade-joint').value)-toDisplay(30,'mm'))<1e-10);
 const frame=facadeFrame(state);assert.ok(host.textContent.includes('ft'));assert.equal(frame.height,state.height);
 // Restore the desk-only assembly choice for later checks.
 const reset=find(host,n=>n.id==='facade-joint');reset.value=toDisplay(20,'mm');reset.onchange();
})));

test('comparison money and area cells use the currency and units named by their headers',()=>prefs(()=>withDOM(host=>{
 const ref={state,name:'A'},cur={state:{...state,span:state.span+1},name:'B'};
 renderDecision({host,lang:'en',reference:ref,current:cur,label:()=>'',inputLabel:()=>'',checkStatus:()=>''});
 const gross=find(host,n=>n.tagName==='TR'&&n.childNodes[0]?.textContent.includes('Gross area'));
 assert.match(gross.childNodes[0].textContent,/ft²/);assert.equal(Number(gross.childNodes[1].textContent.replaceAll(',','')),Math.round(toDisplay(evaluate(state).gross,'m²')));
 const money=find(host,n=>n.tagName==='TR'&&n.childNodes[0]?.textContent.includes('Annual contribution'));
 assert.match(money.childNodes[0].textContent,/THB/);assert.equal(Number(money.childNodes[1].textContent.replaceAll(',','')),Math.round(evaluate(state).contribution*getRateBook().rates.THB));
})));

test('structure converts its displayed geometry while keeping computed rules and source citation intact',()=>prefs(()=>withDOM(host=>{
 const canonical=structureRead(state);renderStructure({host,state,metrics:evaluate(state),lang:'en'});
 assert.match(host.textContent,/ft tall/);assert.match(host.textContent,/ft\/s/);assert.deepEqual(structureRead(state),canonical);assert.match(host.textContent,/ASCE 7 Table 12.8-2/);
})));

test('Effects wind controls convert speed, acceleration and specialised engineering inputs',()=>prefs(()=>withDOM(host=>{
 renderEnvironment({lang:'zh',state,changed(){}});find(host,n=>n.id==='environment-mode-1').onclick();find(host,n=>n.id==='env-demo').onclick();
 const speed=find(host,n=>n.id==='env-speed'),acceleration=find(host,n=>n.id==='env-acceleration');
 assert.equal(Number(speed.value),toDisplay(30,'m/s'));assert.equal(Number(speed.max),toDisplay(ENV_BOUNDS.speed[1],'m/s'));assert.equal(Number(acceleration.value),toDisplay(.5,'m/s²'));
 assert.match(host.textContent,/ft\/s/);assert.match(host.textContent,/10⁶ kip·ft²/);
 for(const [key,unit]of [['density','kg/m³'],['ei','GN·m²'],['mass','t/m']]){const n=find(host,n=>n.id==='env-'+key);assert.equal(Number(n.max),toDisplay(ENV_BOUNDS[key][1],unit));}
 speed.value=toDisplay(40,'m/s');speed.onchange();assert.ok(Math.abs(Number(find(host,n=>n.id==='env-speed').value)-toDisplay(40,'m/s'))<1e-8);
 find(host,n=>n.tagName==='button'.toUpperCase()&&n.textContent==='清除输入').onclick();find(host,n=>n.id==='environment-mode-0').onclick();
})));
