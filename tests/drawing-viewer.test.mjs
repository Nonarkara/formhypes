import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DRAWING_TEXT,drawingWidth,openDrawing,mountDrawingViewer} from '../dist/drawing-viewer.js';

const svg=(width=600,size=7.5)=>({
 style:{},label:'source',
 getAttribute:key=>key==='viewBox'?`-30 -22 ${width} 300`:null,
 querySelectorAll:()=>[{getAttribute:()=>String(size)}],
 cloneNode:deep=>{assert.equal(deep,true);return {style:{},label:'copy'}},
});
const node=tag=>({tag,style:{},attrs:{},children:[],isConnected:true,width:354,
 setAttribute(k,v){this.attrs[k]=v},append(...n){this.children.push(...n)},
 replaceChildren(...n){this.children=n},querySelector(selector){return selector==='figcaption'?this.children.find(n=>n.tag==='figcaption')||null:this.svg||null},
 insertBefore(n,before){this.children.splice(this.children.indexOf(before),0,n)},
 getBoundingClientRect(){return {width:this.width}},
 showModal(){this.open=true},close(){this.open=false;this.onclose?.()},focus(){this.focused=true},
});
function fixture(lang='en',onOpen){
 const doc=globalThis.document;globalThis.document={createElement:node};
 try{const figure=node('figure'),source=node('div');source.svg=svg();figure.append(source,node('figcaption'));
  return {figure,source,...mountDrawingViewer({figure,source,lang,onOpen})};
 }finally{globalThis.document=doc}
}

test('viewer scale keeps the smallest declared annotation at least sixteen CSS pixels',()=>{
 for(const width of [400,600,900])for(const size of [5.5,7.5,10]){
  const scaled=drawingWidth(svg(width,size));
  assert.ok(scaled>=1000);assert.ok(size*scaled/width>=16);
 }
 assert.equal(drawingWidth(svg(0,0)),1000);
});

test('viewer opens a readable copy and leaves the source drawing intact',()=>{
 const source=node('div'),dialog=node('dialog'),scroll=node('div');source.svg=svg(900,5.5);
 const original=source.svg;
 assert.equal(openDrawing(source,dialog,scroll),true);
 assert.equal(source.svg,original);assert.deepEqual(original.style,{});
 assert.equal(scroll.children[0].label,'copy');assert.equal(scroll.children[0].style.width,'2619px');
 assert.equal(scroll.focused,true);assert.equal(dialog.open,true);
 source.svg=null;dialog.open=false;
 assert.equal(openDrawing(source,dialog,scroll),false);assert.equal(dialog.open,false);
});

test('viewer commands and instructions are in the selected language',()=>{
 for(const lang of ['en','th','zh']){
  const f=fixture(lang);
  assert.equal(f.button.textContent,DRAWING_TEXT[lang].enlarge);
  assert.equal(f.button.attrs['aria-haspopup'],'dialog');
  assert.equal(f.figure.children.at(-1).tag,'figcaption','caption must remain the last figure child');
  assert.equal(f.dialog.attrs['aria-label'],DRAWING_TEXT[lang].title);
  assert.equal(f.scroll.attrs['aria-label'],DRAWING_TEXT[lang].pan);
  assert.equal(f.button.disabled,true);f.setAvailable(true);assert.equal(f.button.disabled,false);
 }
});

test('closing clears the copy and resumes its visible owner once',()=>{
 let paused=0,resumed=0;
 const f=fixture('en',()=>{paused++;return()=>resumed++});
 f.setAvailable(true);f.button.onclick();
 assert.equal(paused,1);assert.equal(f.scroll.children.length,1);
 f.dialog.close();assert.equal(resumed,1);assert.equal(f.scroll.children.length,0);
 assert.ok(f.source.svg);f.dialog.onclose();assert.equal(resumed,1);
 f.button.onclick();f.source.width=0;f.dialog.close();assert.equal(resumed,1,'hidden lab must stay stopped');
});

test('an unavailable drawing does not pause the lab or open an empty dialog',()=>{
 let paused=0;const f=fixture('th',()=>paused++);f.source.svg=null;
 f.button.onclick();assert.equal(paused,0);assert.notEqual(f.dialog.open,true);
 f.setAvailable(false);assert.equal(f.button.disabled,true);
});
