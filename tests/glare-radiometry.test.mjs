import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reflect,groundHit,groundCosine,makeGrid,overlapAt,cellCentre,glareDay,facadeFacets,glareMethodPayload,openGlareDrawing,GLARE_TEXT,GLARE_DNI} from '../dist/glare.js';
import {defaults} from '../dist/model.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const area=p=>Math.abs(p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length];return sum+a[0]*b[1]-b[0]*a[1]},0))/2;

test('horizontal receiver conserves the power reflected by a one-square-metre mirror',()=>{
 const d=[-Math.sqrt(3)/2,0,-.5],n=[1,0,0],r=reflect(d,n),rho=.4;
 const quad=[[0,-.5,1],[0,.5,1],[0,.5,2],[0,-.5,2]],foot=quad.map(p=>groundHit(p,r));
 const ov=overlapAt([{kind:'ground',rho,r,foot}],makeGrid(5,.1));
 near(GLARE_DNI*ov.maxGain,160); // 800 × 0.4 × 0.5
 const received=GLARE_DNI*ov.maxGain*area(foot);
 const reflected=GLARE_DNI*rho*1*Math.sqrt(3)/2;
 near(received,reflected);
 near(groundCosine(r),.5);near(groundCosine(r.map(x=>x*7)),.5);
 near(groundCosine([0,0,-1]),1);near(groundCosine([1,0,0]),0);
 near(groundCosine([0,0,1]),0);near(groundCosine([0,0,0]),0);
});

test('different beam directions add on one horizontal receiver, not separate beam-normal planes',()=>{
 const foot=[[-1,-1],[1,-1],[1,1],[-1,1]],g=makeGrid(2,1);
 const beams=[-1,1].map(sign=>({kind:'ground',rho:1,r:[sign*Math.sqrt(3)/2,0,-.5],foot}));
 const ov=overlapAt(beams,g);
 assert.equal(ov.maxCount,2);near(GLARE_DNI*ov.maxGain,800);
 near(GLARE_DNI*ov.focusGain,800);
});

test('ground peak ranking includes the receiver cosine',()=>{
 const g=makeGrid(2,1),ov=overlapAt([
  {kind:'ground',rho:.8,r:[Math.sqrt(.99),0,-.1],foot:[[-2,-2],[0,-2],[0,2],[-2,2]]},
  {kind:'ground',rho:.2,r:[0,0,-1],foot:[[0,-2],[2,-2],[2,2],[0,2]]},
 ],g);
 assert.ok(cellCentre(g,ov.maxIdx)[0]>0,'steep 160 W/m² beam must beat shallow 64 W/m² beam');
 near(GLARE_DNI*ov.maxGain,160);
});

test('cached frames and method contributions retain the actual receiver direction',()=>{
 const state={...defaults,family:'cross'},geom=facadeFacets(state,{levels:2});
 const day=glareDay(state,{geom,stepMin:120,radius:200,cell:10,neighbours:false});
 const pay=glareMethodPayload(day);assert.ok(pay&&pay.parts.length);
 const src=day.focus||day.worst,frame=day.frames[src.frame];
 for(const beam of frame.beams.filter(b=>b.kind==='ground'))assert.equal(beam.r.length,3);
 for(const part of pay.parts){
  const beam=frame.beams.find(b=>b.e===part.edge&&b.k===part.level);
  const expected=GLARE_DNI*beam.rho*Math.max(0,-beam.r[2]/Math.hypot(...beam.r));
  near(part.W,expected);near(part.cosGround,Math.max(0,-beam.r[2]/Math.hypot(...beam.r)));
 }
 near(pay.parts.reduce((sum,p)=>sum+p.W,0),src.W);
});

test('enlarging the method preserves the overview and opens its own vector copy',()=>{
 const copy={},svg={cloneNode:deep=>{assert.equal(deep,true);return copy}};
 let shown=0,focused=0,content;
 const source={querySelector:selector=>{assert.equal(selector,'svg');return svg}};
 const dialog={showModal:()=>shown++},scroll={scrollLeft:99,scrollTop:88,replaceChildren:x=>content=x,focus:()=>focused++};
 assert.equal(openGlareDrawing(source,dialog,scroll),true);
 assert.equal(content,copy);assert.equal(shown,1);assert.equal(focused,1);
 assert.equal(source.querySelector('svg'),svg,'original must remain available');
 assert.equal(scroll.scrollLeft,0);assert.equal(scroll.scrollTop,0);
 assert.equal(openGlareDrawing({querySelector:()=>null},dialog,scroll),false);
 assert.equal(shown,1,'a missing drawing must not open an empty viewer');
});

test('annual ground exposure is not presented as a receptor glare compliance threshold',()=>{
 const markers={en:/not a planning or safety threshold/,th:/ไม่ใช่เกณฑ์อนุญาตหรือความปลอดภัย/,zh:/并非规划或安全阈值/};
 for(const lang of ['en','th','zh']){
  assert.match(GLARE_TEXT[lang].yearNote,markers[lang]);
  assert.match(GLARE_TEXT[lang].yearNote,/50/);
 }
});
