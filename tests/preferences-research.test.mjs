import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderReader,researchComparison} from '../dist/research-reader.js';

const readerURL=new URL('../dist/research-reader.js',import.meta.url);
const readerSource=readFileSync(readerURL,'utf8');
const edge=name=>new URL(readerSource.match(new RegExp(`from ['"](\\./${name}\\.js[^'"]*)['"]`))[1],readerURL);
const {setPreferences,resetPreferences,getRateBook}=await import(edge('preferences').href);
const {defaults,evaluate,meshOBJ}=await import(edge('model').href);

function node(tag){
 return {tag,children:[],style:{},dataset:{},_text:'',innerHTML:'',
  append(...children){this.children.push(...children)},
  replaceChildren(...children){this.children=children;this._text=''},
  setAttribute(){},querySelectorAll(){return []},
  get textContent(){return this._text+this.children.map(child=>child.textContent).join(' ')},
  set textContent(value){this._text=String(value);this.children=[]}
 };
}
function all(root,predicate){return [...(predicate(root)?[root]:[]),...root.children.flatMap(child=>all(child,predicate))]}

test('live Research table and plot convert in EN/TH/ZH while preserving the SI/USD study',()=>{
 const saved=new Map(['document','location'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 const host=node('root'),state={...defaults,program:'custom',floors:24};
 const canonical=structuredClone(state),metrics=evaluate(state),geometry=meshOBJ(state),comparison=researchComparison(state);
 Object.defineProperty(globalThis,'document',{configurable:true,value:{
  createElement:node,createTextNode:text=>{const result=node('text');result.textContent=text;return result},
  getElementById:id=>id==='reader'?host:null,querySelectorAll:()=>[]
 }});
 Object.defineProperty(globalThis,'location',{configurable:true,value:{search:'?reading=value&chapter=test'}});
 try{
  setPreferences({units:'imperial',currency:'THB'});
  const rate=getRateBook().rates.THB;
  for(const lang of ['en','th','zh']){
   renderReader(lang,{state});
   const table=all(host,n=>n.tag==='table').find(n=>n.textContent.includes('THB'));
   assert.ok(table,lang+' live comparison table missing');
   const header=all(table,n=>n.tag==='thead')[0].textContent;
   assert.match(header,/ft²/);assert.match(header,/THB/);assert.doesNotMatch(header,/m²|USD/);
   const rows=all(all(table,n=>n.tag==='tbody')[0],n=>n.tag==='tr');
   const fmt=value=>new Intl.NumberFormat(lang,{maximumFractionDigits:1}).format(value);
   comparison.forEach((row,index)=>{
    const cells=rows[index].children;
    assert.equal(cells[1].textContent,fmt(row.metrics.gross/.09290304),lang+' gross area');
    assert.equal(cells[3].textContent,fmt(row.metrics.facade/.09290304),lang+' envelope area');
    assert.equal(cells[4].textContent,fmt(row.metrics.contribution*rate),lang+' contribution');
   });
   const plot=all(host,n=>n.className==='research-tradeoff')[0];
   assert.ok(plot,lang+' live plot missing');
   assert.match(plot.textContent,/ft²/);assert.match(plot.textContent,/THB/);
   assert.doesNotMatch(plot.textContent,/m²|USD/);
   const svg=all(plot,n=>n.innerHTML.includes('<svg'))[0].innerHTML;
   const ticks=[...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map(match=>match[1]);
   const compact=value=>new Intl.NumberFormat(lang,{notation:'compact',maximumFractionDigits:1}).format(value);
   for(const key of ['facade','contribution']){
    const values=comparison.map(row=>row.metrics[key]*(key==='facade'?1/.09290304:rate));
    for(const bound of [Math.min(...values),Math.max(...values)])assert.ok(ticks.includes(compact(bound)),lang+' converted '+key+' plot tick missing');
   }
   assert.deepEqual(state,canonical);assert.deepEqual(evaluate(state),metrics);
   assert.equal(meshOBJ(state),geometry);assert.deepEqual(researchComparison(state),comparison);
  }
 }finally{
  resetPreferences();
  for(const [key,descriptor]of saved){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}
 }
});
