import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,levelPrograms} from '../dist/model.js';
import {effectiveWidth,speedAt,specificFlow,maxSpecificFlow,paulsMinutes,STAIR_TYPES,simulate,fireRead,placeRefuges,towerLevels,widthCurve,FIRE_TEXT,renderFireLab,fmtTime,DT,fireMethodSVG} from '../dist/fire.js';

const near=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<=e,`${a} != ${b}`);

test('effective width and SFPE flow match hand calculation',()=>{
 near(effectiveWidth(1.2),0.9);                          // 1.2 − 2 × 0.15
 near(effectiveWidth(0.2),0);
 const k=STAIR_TYPES['7/11'].k;                          // 1.08 m/s
 near(speedAt(0,k),1.08*(1-0.266*0.54));                 // free movement below 0.54 p/m²
 near(speedAt(2,k),1.08*(1-0.266*2));
 near(speedAt(3.8,k),0);
 near(specificFlow(1.88,k),1.08*1.88*(1-0.266*1.88));    // 1.015
 near(maxSpecificFlow(k),1.01,0.01);                     // SFPE: 1.01 p/s/m for 7/11
 near(maxSpecificFlow(STAIR_TYPES['7.5/10'].k),0.94,0.01);
 near(maxSpecificFlow(STAIR_TYPES['6.5/13'].k),1.16,0.01);
 near(maxSpecificFlow(1.40),1.32,0.01);                  // doors and corridors
 for(let D=0;D<3.7;D+=0.1)assert.ok(specificFlow(D,k)<=maxSpecificFlow(k)+1e-12);
 near(paulsMinutes(100),0.68+0.081*Math.pow(100,0.73));
});

test('a queue at one door drains at the SFPE maximum flow',()=>{
 // two levels: everybody on level 1, ready at once, one storey of 3.5 m to descend
 const We=0.9,k=STAIR_TYPES['7/11'].k,conv=STAIR_TYPES['7/11'].conv,N=600;
 const r=simulate({levels:[{h:3.5,pop:0,t0:0,t1:0},{h:3.5,pop:N,t0:0,t1:0}],k,conv,We,WeDoor:We});
 const hand=N/(maxSpecificFlow(k)*We);                   // ≈ 657 s
 assert.ok(r.finished);
 assert.ok(Math.abs(r.tEnd-hand)/hand<0.06,`${r.tEnd} vs ${hand}`);
 near(r.exited,N,1e-6);
});

test('doubling stair width shortens the flow-limited time',()=>{
 for(const program of ['custom','petronas']){
  const s={...defaults,program,floors:48};
  const a=fireRead(s,{width:1.1,refuge:'off',prmShare:0}),b=fireRead(s,{width:2.2,refuge:'off',prmShare:0});
  assert.ok(b.simTotal<a.simTotal,`${program} ${b.simTotal} < ${a.simTotal}`);
  assert.ok(b.bound<a.bound);
  // effective width 0.8 → 1.9: the flow term shrinks by the same ratio
  near((a.bound-0.5*a.c.pre)/(b.bound-0.5*b.c.pre),1.9/0.8,1e-9);
  assert.ok(b.simTotal<0.7*a.simTotal);
 }
});

test('refuge floors never increase the time to a place of safety',()=>{
 for(const program of Object.keys(levelPrograms))for(const floors of [30,48,70])for(const strategy of ['simultaneous','phased','lifts'])for(const mode of ['hk','gb']){
  const s={...defaults,program,floors};
  const off=fireRead(s,{refuge:'off',strategy}),on=fireRead(s,{refuge:mode,strategy});
  const tOff=off.chosen.total,tOn=on.refuge.safety??on.chosen.total;
  assert.ok(tOn<=tOff+1e-9,`${program}/${floors}/${strategy}/${mode} ${tOn} > ${tOff}`);
 }
});

test('refuge placement follows the HK and GB limits',()=>{
 const {levels}=towerLevels({...defaults,program:'petronas',floors:70},null,10);
 const hk=placeRefuges(levels,'hk'),gb=placeRefuges(levels,'gb');
 assert.ok(hk.required&&gb.required);
 let prev=0;for(const r of hk.list){assert.ok(r.i-prev<=25);prev=r.i}assert.ok(levels.length-1-prev<=25);
 prev=0;for(const r of gb.list){assert.ok(levels[r.i].z-levels[prev].z<=50+1e-9);prev=r.i}
 assert.ok(hk.list.some(r=>r.kind!=='converted'),'snaps to the model refuge/mechanical levels');
 const low=towerLevels({...defaults,program:'custom',floors:12},null,10).levels;
 assert.equal(placeRefuges(low,'hk').required,false);
});

test('phased: the alarm floors are out before the simultaneous total',()=>{
 for(const program of Object.keys(levelPrograms))for(const floors of [12,48,70]){
  const r=fireRead({...defaults,program,floors},{strategy:'phased'});
  assert.equal(r.alarm.length,3);
  assert.ok(r.phasedAlarm<r.simTotal,`${program}/${floors} ${r.phasedAlarm} < ${r.simTotal}`);
 }
});

test('deterministic',()=>{
 const o={strategy:'lifts',refuge:'gb',pre:90,prmShare:0.05};
 const a=fireRead({...defaults,floors:48},o),b=fireRead({...defaults,floors:48},o);
 assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));
});

test('finite outputs for 12, 48 and 70 floors and every program',()=>{
 for(const program of Object.keys(levelPrograms))for(const floors of [12,48,70])for(const strategy of ['simultaneous','phased','lifts']){
  const r=fireRead({...defaults,program,floors},{strategy,refuge:floors>30?'hk':'off'});
  for(const k of ['pop','simTotal','pauls','bound','phasedAlarm','phasedTotal','flowPerStair','We'])assert.ok(Number.isFinite(r[k])&&r[k]>0,`${program}/${floors}/${strategy} ${k}=${r[k]}`);
  assert.ok(Number.isFinite(r.chosen.total)&&r.finished,`${program}/${floors}/${strategy} finished`);
  assert.ok(r.simTotal>=r.bound*0.9,'simulation is not faster than the flow bound');
  if(strategy==='lifts')assert.ok(Number.isFinite(r.lifts.time));
 }
 const curve=widthCurve({...defaults,floors:12},{});
 for(let i=1;i<curve.length;i++)assert.ok(curve[i].total<=curve[i-1].total+DT);
});

test('FIRE_TEXT has the same keys in every language',()=>{
 const shape=o=>Object.entries(o).flatMap(([k,v])=>v&&typeof v==='object'?shape(v).map(x=>k+'.'+x):[k]).sort();
 const en=shape(FIRE_TEXT.en);
 for(const l of ['th','zh'])assert.deepEqual(shape(FIRE_TEXT[l]),en,l);
 assert.doesNotMatch(JSON.stringify(FIRE_TEXT.th),/ฉัน|ผม|เรา/);
 assert.equal(fmtTime(125),'2 min 05 s');assert.equal(fmtTime(NaN),'—');
});

test('the lab never throws without a DOM',()=>{
 assert.doesNotThrow(()=>renderFireLab({}));
 assert.doesNotThrow(()=>renderFireLab({host:{},state:defaults,lang:'xx',active:false}));
 assert.doesNotThrow(()=>renderFireLab({host:{},state:defaults,lang:'th',active:true}));
 assert.doesNotThrow(()=>fireRead({},{}));
 assert.doesNotThrow(()=>fireRead({...defaults,floors:1},{stairs:'x',width:-3,tread:'?',strategy:'??'}));
});

test('fire.css keeps the house rules',()=>{
 const css=readFileSync(new URL('../dist/fire.css',import.meta.url),'utf8');
 assert.doesNotMatch(css,/gradient\(|box-shadow|border-radius:\s*[1-9]/);
 const sizes=new Set([...css.matchAll(/font-size:([^;}]+)/g)].map(m=>m[1].trim()));
 assert.ok(sizes.size<=3,[...sizes].join(','));
 for(const m of css.matchAll(/\.([a-z][\w-]*)/g))assert.ok(m[1].startsWith('fe'),m[1]);
 const js=readFileSync(new URL('../dist/fire.js',import.meta.url),'utf8');
 assert.doesNotMatch(js,/style="|<style|innerHTML/);
});

/* ── the method, drawn ─────────────────────────────────────────────────────
   The Fire lab explained how the evacuation time is worked out in a dense
   paragraph. It is now a drawing: a schematic section of the escape stair
   with the refuge level and the fire floor marked, and the total time split
   into its real parts in proportion.

   The guards below read the EMITTED SHEET, not the source. A drawing that
   has drifted from the simulation it claims to explain is the failure that
   matters, and the only way to catch it is to take the numbers out of the
   artifact and compare them with the numbers the model computed. */

const METHOD_LANGS=['en','th','zh'];
const TOWER={...defaults,program:'petronas',floors:48};
const mm=t=>{const q=Math.max(0,Math.round(t));return Math.floor(q/60)+':'+String(q%60).padStart(2,'0')};
/* the words on the sheet, with the markup taken out */
const said=svg=>svg.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
/* the four parts of the bar, straight out of the run: pre-movement, the
   descent to the refuge level, the descent from there to the exit, and
   whoever is still going when the crowd is out. */
function barParts(r){
 const total=r.chosen.total,tPre=0.5*r.c.pre,tExit=r.chosen.res.tExit;
 const hasRef=r.refuge.list.length>0;
 const tP1=hasRef?r.chosen.res.tRef:(Number.isFinite(r.chosen.res.clear[r.fire])?r.chosen.res.clear[r.fire]:tPre);
 const p=[[0,tPre],[tPre,Math.min(tExit,tP1)],[Math.min(tExit,tP1),tExit]];
 if(total>tExit+0.5)p.push([tExit,total]);
 return p.filter(x=>x[1]-x[0]>0.5);
}

test('the method drawing is a sheet, and nothing but numbers reached it',()=>{
 const r=fireRead(TOWER,{strategy:'simultaneous',refuge:'hk'});
 for(const lang of METHOD_LANGS){
  const svg=fireMethodSVG(r,{lang});
  assert.equal(typeof svg,'string');
  assert.ok(svg.includes('<svg'),lang+': no svg');
  assert.ok(/viewBox="[-\d. ]+"/.test(svg),lang+': no viewBox — the frame must be sized from its notes');
  assert.doesNotMatch(svg,/NaN|undefined|Infinity/,lang+': a non-number reached the sheet');
  for(const m of svg.matchAll(/="([^"]*)"/g))
   assert.doesNotMatch(m[1],/NaN|undefined/,lang+': "'+m[1]+'" in an attribute');
 }
});

test('the drawing carries the numbers the simulation actually produced',()=>{
 const r=fireRead(TOWER,{strategy:'simultaneous',refuge:'hk'});
 const text=said(fireMethodSVG(r,{lang:'en'}));
 const total=r.chosen.total;
 // every part of the bar, with its own length and its share
 for(const [a,b] of barParts(r)){
  const dur=b-a,pct=Math.round(dur/total*100);
  assert.ok(text.includes(`${mm(dur)} · ${pct}%`),`the sheet does not say ${mm(dur)} · ${pct}%`);
 }
 // the headline
 assert.ok(text.includes(`total ${mm(total)}`),'the total evacuation time is not on the sheet');
 // the levels the phased evacuation turns on
 assert.ok(text.includes(`fire · level ${r.fire}`),'the fire floor is not marked');
 assert.ok(text.includes(`refuge ${r.refuge.list[0].i}`),'the refuge level is not marked');
 // the counts
 const prmN=r.chosen.prmDots.reduce((a,d)=>a+d.count,0);
 assert.ok(text.includes(Math.round(r.pop).toLocaleString('en-US')),'the population is not on the sheet');
 assert.ok(text.includes(Math.round(r.stairPop).toLocaleString('en-US')),'the stair population is not on the sheet');
 assert.ok(text.includes(String(Math.round(prmN))),'the reduced-mobility count is not on the sheet');
 assert.ok(text.includes(`${r.levels.length-1} storeys`),'the storey count is not on the sheet');
 // and the stair type the model walked down
 assert.ok(text.includes(`riser/tread ${r.riser}/${r.treadMM}`),'the stair type is not on the sheet');
 const pitch=Math.atan2(r.riser,r.treadMM)*180/Math.PI;
 assert.ok(text.includes(`${pitch.toFixed(1)}°`),'the pitch is not on the sheet');
});

test('the time bar is drawn in proportion to the times it claims',()=>{
 const r=fireRead(TOWER,{strategy:'simultaneous',refuge:'hk'});
 const svg=fireMethodSVG(r,{lang:'en'});
 const bar=/<g id="fe-bar">([\s\S]*?)<\/g>/.exec(svg);
 assert.ok(bar,'the drawing has no time bar');
 const rects=[...bar[1].matchAll(/<rect[^>]*y="([-\d.]+)"[^>]*height="([-\d.]+)"/g)].map(m=>({y:+m[1],h:+m[2]}));
 const parts=barParts(r);
 assert.equal(rects.length,parts.length,'the bar does not have one part per phase');
 const barH=rects.reduce((a,x)=>a+x.h,0);
 assert.ok(barH>0);
 const total=r.chosen.total;
 for(let i=0;i<parts.length;i++){
  const dur=parts[i][1]-parts[i][0];
  near(rects[i].h/barH,dur/total,0.01);
 }
 // and the parts tile the bar, end to end, from the bottom up
 assert.ok(rects.every((x,i)=>i===0||Math.abs(x.y+x.h-rects[i-1].y)<0.02),'the parts of the bar do not meet');
});

test('no two notes on the drawing overlap, and none is clipped',()=>{
 // The house measure: the face is monospace with a .6 em advance, so a
 // note's width is its length. Two notes printed on one another are not
 // "adjacent" — they are unreadable.
 const ADV=.6,CAP=.75,DESC=.25;
 const widthOf=(s,size)=>[...s].length*size*ADV;
 const cases=[['simultaneous','hk'],['simultaneous','off'],['phased','hk'],['lifts','hk'],['simultaneous','gb']];
 for(const [strategy,refuge] of cases){
  const r=fireRead(TOWER,{strategy,refuge});
  for(const lang of METHOD_LANGS){
   const svg=fireMethodSVG(r,{lang});
   const vb=svg.match(/viewBox="([^"]+)"/);
   const box=vb[1].split(/\s+/).map(Number);
   const notes=[...svg.matchAll(/<text x="([-\d.]+)" y="([-\d.]+)"[^>]*font-size="([\d.]+)"[^>]*text-anchor="(\w+)"[^>]*>([^<]*)<\/text>/g)]
    .map(m=>{const size=+m[3],x=+m[1],y=+m[2],anchor=m[4],s=m[5],w=widthOf(s,size);
     const x0=anchor==='end'?x-w:anchor==='middle'?x-w/2:x;
     return {s,size,x0,x1:x0+w,top:y-CAP*size,bot:y+DESC*size};});
   const bad=[];
   for(let i=0;i<notes.length;i++)for(let j=i+1;j<notes.length;j++){
    const a=notes[i],b=notes[j];
    if(a.x1<=b.x0||b.x1<=a.x0)continue;
    if(a.bot<=b.top||b.bot<=a.top)continue;
    bad.push(`${strategy}/${refuge}/${lang}: "${a.s}" printed on "${b.s}"`);}
   assert.deepEqual(bad,[],'annotation that cannot be read:\n'+bad.join('\n'));
   const L=box[0],R=box[0]+box[2],T=box[1],B=box[1]+box[3];
   for(const n of notes){
    assert.ok(n.x0>=L-0.5,`${strategy}/${refuge}/${lang}: "${n.s}" cut off at the left`);
    assert.ok(n.x1<=R+0.5,`${strategy}/${refuge}/${lang}: "${n.s}" cut off at the right`);
    assert.ok(n.top>=T-0.5&&n.bot<=B+0.5,`${strategy}/${refuge}/${lang}: "${n.s}" cut off vertically`);
   }
  }
 }
});

test('no note is printed on the drawing itself',()=>{
 // A note on top of the poché is a note on top of the thing it names. The
 // filled bodies are the material the section cuts: the shaft walls, the
 // floor plates and the earth below grade. Their boxes come straight out of
 // the path data.
 const bbox=d=>{
  const xs=[],ys=[];
  for(const t of d.match(/[MHVZL][^MHVZL]*/g)||[]){
   const v=t.slice(1).trim().split(/[\s,]+/).filter(Boolean).map(Number);
   if(t[0]==='M'){xs.push(v[0]);ys.push(v[1])}
   else if(t[0]==='H')xs.push(v[0]);
   else if(t[0]==='V')ys.push(v[0]);
  }
  return {x0:Math.min(...xs),x1:Math.max(...xs),y0:Math.min(...ys),y1:Math.max(...ys)};
 };
 const ADV=.6,CAP=.75,DESC=.25;
 const widthOf=(s,size)=>[...s].length*size*ADV;
 const cases=[['simultaneous','hk'],['simultaneous','off'],['phased','hk'],['lifts','hk'],['simultaneous','gb']];
 for(const [strategy,refuge] of cases){
  const r=fireRead(TOWER,{strategy,refuge});
  for(const lang of METHOD_LANGS){
   const svg=fireMethodSVG(r,{lang});
   const bodies=[...svg.matchAll(/<path d="([^"]+)" fill="url\(#d-(?:conc|earth)\)"/g)].map(m=>bbox(m[1]));
   assert.ok(bodies.length>=4,'the section has no poché');
   const notes=[...svg.matchAll(/<text x="([-\d.]+)" y="([-\d.]+)"[^>]*font-size="([\d.]+)"[^>]*text-anchor="(\w+)"[^>]*>([^<]*)<\/text>/g)]
    .map(m=>{const size=+m[3],x=+m[1],y=+m[2],anchor=m[4],s=m[5],w=widthOf(s,size);
     const x0=anchor==='end'?x-w:anchor==='middle'?x-w/2:x;
     return {s,x0,x1:x0+w,top:y-CAP*size,bot:y+DESC*size};});
   const bad=[];
   for(const n of notes)for(const b of bodies){
    if(n.x1<=b.x0||b.x1<=n.x0)continue;
    if(n.bot<=b.y0||b.y1<=n.top)continue;
    bad.push(`${strategy}/${refuge}/${lang}: "${n.s}" printed on the drawing`);
   }
   assert.deepEqual(bad,[],'annotation on top of the drawing:\n'+bad.join('\n'));
  }
 }
});

/* A DOM small enough to read. The lab was never run by the suite — only the
   string "renderFireLab" was checked — so a lab that threw on its first line
   would have stayed green for ever. This stub runs it for real and reads the
   drawing back out of the page. */
function stubNode(tag){
 const n={tagName:String(tag||'').toUpperCase(),childNodes:[],attrs:{},_t:'',
  className:'',id:'',htmlFor:'',type:'',value:'',
  classList:{add(){},remove(){},toggle(){},contains(){return false}},
  querySelector(){return null},closest(){return null},focus(){},click(){},
  appendChild(c){this.childNodes.push(c);return c},
  get children(){return this.childNodes},
  append(...cs){for(const c of cs)this.childNodes.push(c)},
  replaceChildren(...cs){this.childNodes=cs.slice()},
  contains(){return true},
  setAttribute(k,v){this.attrs[k]=v},
  getAttribute(k){return this.attrs[k]},
  addEventListener(){},removeEventListener(){},
  get textContent(){return this._t+this.childNodes.map(c=>c.textContent||'').join('')},
  set textContent(v){this._t=String(v);this.childNodes=[]},
  get clientWidth(){return 640},get clientHeight(){return 420}};
 return n;
}
function labPage(lang='en'){
 const host=stubNode('div');
 const realDoc=globalThis.document,realParser=globalThis.DOMParser;
 globalThis.document={createElement:t=>stubNode(t),createElementNS:(ns,t)=>stubNode(t),
  importNode:el=>({nodeName:el.nodeName,markup:el.markup,attrs:{}})};
 globalThis.DOMParser=class{parseFromString(src){return {documentElement:{nodeName:'svg',markup:src}}}};
 try{renderFireLab({host,state:TOWER,metrics:null,lang,active:true});}
 finally{globalThis.document=realDoc;globalThis.DOMParser=realParser;}
 const walk=n=>[n,...(n.childNodes||[]).flatMap(walk)];
 const sheet=walk(host).find(n=>n.markup&&n.markup.includes('<svg'));
 return {host,sheet};
}

test('the lab puts the drawing on the page',()=>{
 const r=fireRead(TOWER,{strategy:'simultaneous',refuge:'hk'});
 const {sheet}=labPage('en');
 assert.ok(sheet,'no drawing reached the page');
 assert.ok(sheet.markup.includes('<svg'),'what reached the page is not a sheet');
 // the drawing on the page is the drawing the model produced
 const text=said(sheet.markup);
 assert.ok(text.includes(`total ${mm(r.chosen.total)}`),'the drawing on the page is not this run');
 for(const [a,b] of barParts(r)){
  const dur=b-a,pct=Math.round(dur/r.chosen.total*100);
  assert.ok(text.includes(`${mm(dur)} · ${pct}%`),'the drawing on the page is not this run');
 }
 // and it is in a figure, with the caption under it
 assert.doesNotMatch(sheet.markup,/style="|<style/, 'the drawing carries a style');
});

test('the lab still renders with no DOM at all',()=>{
 assert.equal(typeof globalThis.document,'undefined','this test needs no document');
 assert.doesNotThrow(()=>renderFireLab({}));
 assert.doesNotThrow(()=>renderFireLab({host:{},state:TOWER,lang:'th',active:true}));
 assert.doesNotThrow(()=>fireMethodSVG(fireRead(TOWER,{}),{lang:'zh'}));
});

test('the prose that explained the method is now a caption',()=>{
 // A flat cap would force padding one script: Chinese is roughly half the
 // length of the same sentence, so the cap is per language.
 const caps={en:260,th:260,zh:110};
 for(const l of METHOD_LANGS){
  const s=FIRE_TEXT[l].method;
  assert.ok(s.length<=caps[l],`${l}: the method prose is ${s.length} characters — it is a paragraph again`);
  assert.ok(s.trim().length>20,`${l}: the caption is empty`);
 }
 // the caption must still say what the drawing cannot
 assert.match(FIRE_TEXT.en.method,/S = k\(1/);
 assert.match(FIRE_TEXT.en.method,/F_s = S·D/);
 assert.match(FIRE_TEXT.th.method,/F_s = S·D/);
 assert.match(FIRE_TEXT.zh.method,/F_s = S·D/);
});

test('the drawing translates completely, with no English left on the sheet',()=>{
 const shape=o=>Object.entries(o).flatMap(([k,v])=>v&&typeof v==='object'?shape(v).map(x=>k+'.'+x):[k]).sort();
 const en=shape(FIRE_TEXT.en);
 for(const l of ['th','zh'])assert.deepEqual(shape(FIRE_TEXT[l]),en,l);
 const CJK=/[㐀-鿿豈-﫿]/;
 for(const l of ['en','th'])for(const [k,v] of Object.entries(FIRE_TEXT[l].m))
  assert.ok(!CJK.test(v),`${l}.m.${k} contains CJK`);
 for(const [k,v] of Object.entries(FIRE_TEXT.zh.m))
  assert.ok(/[㐀-鿿]/.test(v),`zh.m.${k} falls back to Latin: "${v}"`);
 for(const l of METHOD_LANGS)for(const [k,v] of Object.entries(FIRE_TEXT[l].m))
  assert.ok(String(v).trim().length,`${l}.m.${k} is empty`);
 // and no language but English may carry an English label
 const EN_ONLY=['pre-movement','phase 1','phase 2','exit level','reduced mobility','people move down','storeys','in the tower','on the stairs','strategy:','riser/tread','refuge '];
 for(const lang of ['th','zh']){
  const r=fireRead(TOWER,{strategy:'simultaneous',refuge:'hk'});
  const text=said(fireMethodSVG(r,{lang}));
  for(const w of EN_ONLY)
   assert.ok(!text.includes(w),`${lang}: the drawing still says "${w}" in English`);
 }
});
