import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,families} from '../dist/model.js';
import {concreteECF,rebarECF,sectionECF,account,tower,materials,summary,carbonRead,curves,whatIf,scorsBand,
 CONCRETE_ECF,REBAR_ECF,SECTION_ECF,TEF_ROAD,WASTE,RHO_C,CONCRETE_KM,REFERENCE_STEEL,SCORS,TARGETS,SYSTEMS,SYSTEM_KEYS,
 HEARST_RATIO,PERIMETER_FRAME_INEFF,OUTRIGGER_SHARE,CARBON_TEXT,renderCarbonLab,carbonMethodSVG} from '../dist/carbon.js';

const near=(a,b,e=1e-9)=>assert.ok(Math.abs(a-b)<=e,`${a} != ${b}`);
const base={concrete:'C40/50',ggbs:25,rebarEAF:56,steelEAF:46,km:300};

test('IStructE Table 2.3 factors are carried exactly and interpolated between published points',()=>{
 near(concreteECF('C32/40',0),0.149);near(concreteECF('C32/40',25),0.120);near(concreteECF('C32/40',70),0.063);
 near(concreteECF('C40/50',25),0.138);near(concreteECF('C25/30',70),0.056);
 near(concreteECF('C40/50',50),0.138+(0.072-0.138)*25/45);       // linear between 25% and 70%
 near(rebarECF(0),REBAR_ECF.bof);near(rebarECF(100),REBAR_ECF.eaf);
 near(sectionECF(0),2.450);near(sectionECF(100),0.567);
 assert.ok(Math.abs(rebarECF(56)-1.960)<0.02,'default rebar share sits on the global 1.960');
 assert.ok(Math.abs(sectionECF(46)-1.580)<0.02,'default section share sits on the global 1.580');
 near(TEF_ROAD,0.10749e-3);
});

test('cement replacement lowers concrete carbon monotonically, for every class',()=>{
 for(const cls of Object.keys(CONCRETE_ECF)){let prev=Infinity;for(let r=0;r<=70;r+=1){const v=concreteECF(cls,r);assert.ok(v<prev,`${cls} ${r}%`);prev=v}}
});

test('carbon arithmetic: tonnes × factor, plus A4 and A5 waste, by hand',()=>{
 const kg={grav_conc:1e6,grav_rebar:0,grav_steel:0,lat_conc:0,lat_rebar:0,lat_steel:0};
 const a=account(kg,{...base,ggbs:25,concrete:'C32/40'});
 const a13=1e6*0.120,a4=1e6*CONCRETE_KM*0.10749e-3,a5=WASTE.concrete*(a13+a4+1e6*(0.005+0.013));
 near(a.a13,a13,1e-6);near(a.a4,a4,1e-6);near(a.a5,a5,1e-6);near(a.total,a13+a4+a5,1e-6);
 near(a13,120000,1e-6);                  // 1,000 t of C32/40 at 25% GGBS = 120 tCO2e A1–A3
 const s=account({grav_conc:0,grav_rebar:0,grav_steel:1000,lat_conc:0,lat_rebar:0,lat_steel:0},{...base,steelEAF:100,km:0});
 near(s.total,1000*0.567*(1+WASTE.steel)+1000*WASTE.steel*(0.005+0.013),1e-9);
 near(account(kg,{...base,rates:{conc:200}}).cost,1e6/RHO_C*200,1e-6);
});

test('lateral material grows with height, and with slenderness at a fixed floor area',()=>{
 for(const system of SYSTEM_KEYS){
  let prev=-1;
  for(const n of [20,30,40,50,60,70]){const r=summary(tower({...defaults},n),system,{...base,core:defaults.core});assert.ok(r.latM2>prev,`${system} ${n}`);prev=r.latM2}
  const wide=carbonRead({...defaults,system},{...base,spanFactor:1}).here,slim=carbonRead({...defaults,system},{...base,spanFactor:0.8}).here;
  assert.ok(Math.abs(slim.gross/wide.gross-1)<0.12,'equal floor area within rounding of storeys');
  assert.ok(slim.latM2>wide.latM2&&slim.totalM2>wide.totalM2,`${system}: slimmer costs more material`);
 }
});

test('drift scaling: once drift governs, lateral material per tower goes as about H³',()=>{
 const s={...defaults,family:'box',taper:1,program:'mini',height:4};
 const a=tower(s,40),b=tower(s,80),ka=materials(a,'diagrid',base).kg.lat_steel,kb=materials(b,'diagrid',base).kg.lat_steel;
 assert.equal(materials(b,'diagrid',base).governs,'drift');
 const p=Math.log(kb/ka)/Math.log(b.H/a.H);
 assert.ok(p>2.5&&p<4.5,`exponent ${p}`);       // wind profile adds to the cubic
});

test('system ordering follows the sourced assumptions',()=>{
 // Outriggers move half the moment to the perimeter (40–60% published): less core.
 const tw=tower({...defaults},60);
 const cg=materials(tw,'column-grid',{...base,core:defaults.core}).kg,ou=materials(tw,'outrigger',{...base,core:defaults.core}).kg;
 assert.ok(ou.lat_conc<cg.lat_conc);near(OUTRIGGER_SHARE,0.5);
 // Hearst Tower: diagrid 20% less steel than a conventional perimeter frame.
 near(SYSTEMS.diagrid.lat[0].ineff/PERIMETER_FRAME_INEFF,HEARST_RATIO);near(HEARST_RATIO,0.8);
 // Lateral material at height: core-only > outrigger > diagrid (Khan: core frames inefficient at height).
 const L=k=>k.lat_conc+k.lat_rebar+k.lat_steel,dg=materials(tw,'diagrid',{...base,core:defaults.core}).kg;
 assert.ok(L(cg)>L(ou)&&L(ou)>L(dg),`${L(cg)} ${L(ou)} ${L(dg)}`);
});

test('steel calibration: a Sears-like steel tower lands inside Khan’s published range',()=>{
 const s={...defaults,family:'box',taper:1,program:'mini',height:3.8,span:68,core:20};
 const r=summary(tower(s,108),'diagrid',{...base,core:20});
 const lo=Math.min(...REFERENCE_STEEL.map(p=>p.kg)),hi=Math.max(...REFERENCE_STEEL.map(p=>p.kg));
 assert.ok(r.steelM2>lo*0.9&&r.steelM2<hi*1.1,`${r.steelM2}`);
});

test('published reference points carry their citations',()=>{
 assert.deepEqual(REFERENCE_STEEL.map(p=>p.key),['hancock','empire','sears']);
 for(const p of REFERENCE_STEEL){assert.ok(p.src&&p.src.length>3);assert.ok(p.kg>100&&p.kg<250)}
 near(REFERENCE_STEEL[0].kg,30*4.8824,1e-9); // SOM: about 30 psf
 assert.equal(scorsBand(120),'A');assert.equal(scorsBand(199),'B');assert.equal(scorsBand(300),'E');
 assert.equal(scorsBand(341),'E');assert.equal(scorsBand(156),'B');assert.equal(scorsBand(228),'C');assert.equal(scorsBand(9999),'G');
 assert.deepEqual(TARGETS.map(t=>t.value),[156,228]);
 for(const l of ['en','th','zh'])for(const k of ['IStructE','SCORS','Khan','Hearst','Foraboschi'])assert.ok(CARBON_TEXT[l].src.includes(k),`${l} ${k}`);
});

test('finite outputs for floors 12/48/70 × every family × every system',()=>{
 for(const family of Object.keys(families))for(const system of SYSTEM_KEYS)for(const floors of [12,48,70]){
  const r=carbonRead({...defaults,family,system,floors},base);
  for(const v of [r.here.totalM2,r.here.gravM2,r.here.latM2,r.here.carbonM2,r.here.costM2,r.here.steelM2,r.premiumKg,r.premiumCarbon])
   assert.ok(Number.isFinite(v),`${family}/${system}/${floors}`);
  assert.ok(r.here.totalM2>0&&r.here.carbonM2>0);
  assert.ok(SCORS.some(([,b])=>b===r.here.band));
 }
});

test('what-if keeps the floor area: n′ = n / f²',()=>{
 const w=whatIf({...defaults,floors:48},{spanFactor:0.8});
 assert.equal(w.floors,75);near(w.state.span,defaults.span*0.8);
 const c=curves({...defaults},base,[20,40]);
 for(const k of SYSTEM_KEYS)assert.equal(c[k].length,2);
});

test('i18n: identical key sets in en, th, zh',()=>{
 const keys=o=>Object.entries(o).flatMap(([k,v])=>v&&typeof v==='object'?keys(v).map(x=>k+'.'+x):[k]).sort();
 const en=keys(CARBON_TEXT.en);
 assert.deepEqual(keys(CARBON_TEXT.th),en);assert.deepEqual(keys(CARBON_TEXT.zh),en);
 for(const l of ['th','zh'])for(const k of en){const v=k.split('.').reduce((o,p)=>o[p],CARBON_TEXT[l]);assert.ok(typeof v==='string'&&v.length>0,`${l} ${k}`)}
 assert.ok(!/ฉัน|เรา|ข้าพเจ้า/.test(JSON.stringify(CARBON_TEXT.th)),'Thai has no first person');
});

test('renderer never throws without a DOM',()=>{
 assert.doesNotThrow(()=>renderCarbonLab());
 assert.doesNotThrow(()=>renderCarbonLab({host:{}}));
 assert.doesNotThrow(()=>renderCarbonLab({host:{},state:{...defaults},metrics:{},lang:'th',active:true}));
 assert.doesNotThrow(()=>renderCarbonLab({host:{},state:{...defaults},lang:'xx',active:false}));
});
/* ── the method, drawn ─────────────────────────────────────────────────────
   The guard has to read the artifact, not the source. Everything below is
   measured on the emitted SVG: the numbers on the sheet are extracted from
   the text it actually contains and compared against the values the lab's own
   accounting computes, so a drawing that drifts from the books is a red
   test, not a drawing that looks right. */

const drawing=(system='diagrid',floors=40,o={})=>{
  const ctl={...base,...o,core:defaults.core};
  const r=carbonRead({...defaults,system,floors},ctl);
  return {r,svg:carbonMethodSVG({h:r.here,tower:r.hereTw,system:r.system,options:ctl},{lang:'en'})};
};
/* Every number the sheet prints, read back out of the text it contains. */
const drawn=s=>([...s.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].flatMap(m=>m[1].match(/-?[\d,]+(?:\.\d+)?/g)||[])).map(x=>Number(x.replace(/,/g,'')));
/* A number is "on the sheet" if it is there to the precision it is printed. */
const onSheet=(nums,v,d=0)=>nums.some(n=>Math.abs(n-v)<=0.51*Math.pow(10,-d));
/* The sheet's own words, flattened. A note is wrapped across lines, and the
   wrapper breaks at spaces, so joining the lines back together with a space
   gives the note back exactly as it was written. */
const flatText=s=>[...s.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m=>m[1]).join(' ');
/* The solid poché on the sheet. A section draws the material it cuts, so a
   steel member is a filled band and a bar segment is a filled block; both are
   read here off the path data, so "is that member there" is a fact about the
   drawing rather than a claim about the source. */
const solids=s=>[...s.matchAll(/<path d="([^"]+)" fill="var[(]-{2}ink[)][^>]*>/g)].map(m=>{
  const n=(m[1].match(/-?[\d.]+/g)||[]).map(Number),xs=[],ys=[];
  for(let i=0;i+1<n.length;i+=2){xs.push(n[i]);ys.push(n[i+1])}
  return {x0:Math.min(...xs),x1:Math.max(...xs),y0:Math.min(...ys),y1:Math.max(...ys)};
});

test('the method sheet is a sheet: one svg, no junk in it',()=>{
  const {svg}=drawing();
  assert.ok(svg.startsWith('<svg'),'it is not an svg');
  assert.ok(svg.includes('class="dsec"'),'it is not a drafting sheet');
  assert.ok(/^<svg class="dsec" viewBox="-?[\d.]+ -22 [\d.]+ [\d.]+"/.test(svg),'no viewBox');
  assert.ok(svg.includes('role="img"'),'the sheet is not described');
  assert.doesNotMatch(svg,/NaN|undefined|Infinity/,'the sheet prints junk');
  assert.ok(svg.length>8000,'the sheet is suspiciously small');
});

test('the sheet carries the lab\'s own numbers: total, stages, materials, transport',()=>{
  const {r,svg}=drawing('diagrid',40,{km:300});
  const a=r.here.account,G=r.here.gross,nums=drawn(svg);
  // the headline
  assert.ok(onSheet(nums,r.here.carbonM2,1),`the total ${r.here.carbonM2} is not on the sheet`);
  // the stage split, in value and in share
  for(const [k,v] of [['a13',a.a13],['a4',a.a4],['a5',a.a5]]){
    assert.ok(onSheet(nums,v/G,1),`stage ${k} (${v/G}) is not on the sheet`);
    assert.ok(onSheet(nums,v/a.total*100,1),`stage ${k} share is not on the sheet`);
  }
  // the material split, in value and in share
  for(const m of ['conc','rebar','steel']){
    assert.ok(onSheet(nums,a.byMat[m]/G,1),`material ${m} (${a.byMat[m]/G}) is not on the sheet`);
    assert.ok(onSheet(nums,a.byMat[m]/a.total*100,1),`material ${m} share is not on the sheet`);
    // the mass it puts into every square metre
    const kg=r.here.kg,mass=(kg['grav_'+m]+kg['lat_'+m])/G;
    assert.ok(onSheet(nums,mass,0),`the mass of ${m} (${mass}) is not on the sheet`);
  }
  // the emission factors actually in use
  assert.ok(onSheet(nums,a.ecf.conc,3),'the concrete factor is not on the sheet');
  assert.ok(onSheet(nums,a.ecf.rebar,2),'the rebar factor is not on the sheet');
  assert.ok(onSheet(nums,a.ecf.steel,2),'the section factor is not on the sheet');
  // the transport: the road the steel travelled, and the concrete\'s own 50 km
  assert.ok(onSheet(nums,300,0),'the transport distance is not on the sheet');
  assert.ok(onSheet(nums,CONCRETE_KM,0),'the concrete haul is not on the sheet');
  assert.ok(onSheet(nums,TEF_ROAD*1000,5),'the transport factor is not on the sheet');
  // and the class in use, in words
  assert.ok(svg.includes('C40/50'),'the concrete class is not on the sheet');
});

test('the sheet shows the members the take-off actually charges for',()=>{
  // The notes wrap, so the sheet is read as the text it prints, joined.
  const said=s=>[...s.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m=>m[1]).join(' ');
  // a concrete frame has no section steel, and the sheet must not draw one
  const cc=drawing('column-grid',40);
  assert.ok(!/Steel sections · [\d,]+/.test(said(cc.svg)),'a concrete frame is drawn with steel');
  assert.ok(/Steel sections 0\.0%/.test(said(cc.svg)),'the sheet does not say the frame has no steel');
  // a diagrid is a steel frame, and the sheet has to say so
  const dg=drawing('diagrid',40);
  assert.ok(/Steel sections · [\d,]+/.test(said(dg.svg)),'the diagrid is drawn without steel');
  // and it has to DRAW it. A section draws the material it cuts, so a steel
  // member is a solid band running the height of the tower. The slab dots are
  // solid as well, but they are dots: the band is most of the sheet tall, the
  // dot is not a twentieth of it.
  const tall=s=>{const h=+s.match(/viewBox="[-\d.]+ [-\d.]+ [-\d.]+ ([-\d.]+)"/)[1];
    return solids(s).filter(q=>q.y1-q.y0>0.25*h).length;};
  assert.ok(tall(dg.svg)>=1,'the diagrid is drawn with no steel member');
  assert.equal(tall(cc.svg),0,'a concrete frame is drawn with a steel member');
});

test('the sheet is clean in every language, and nothing on it is hard-coded',()=>{
  const ctl={...base,core:defaults.core};
  const r=carbonRead({...defaults,system:'diagrid',floors:40},ctl);
  for(const lang of ['en','th','zh']){
    const svg=carbonMethodSVG({h:r.here,tower:r.hereTw,system:r.system,options:ctl},{lang});
    assert.doesNotMatch(svg,/NaN|undefined|Infinity/,`${lang}: junk on the sheet`);
    // every word printed must be a word the dictionary carries: no English
    // typed straight into the markup, and no Thai or Chinese in the English.
    const words=new Set();
    for(const v of Object.values(CARBON_TEXT[lang]))
      for(const s of (v&&typeof v==='object'?Object.values(v):[v]))
        for(const w of String(s).match(/[A-Za-z]{3,}/g)||[])words.add(w);
    const printed=[...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map(m=>m[1]).join(' ');
    for(const w of printed.match(/[A-Za-z]{3,}/g)||[])
      assert.ok(words.has(w),`${lang}: "${w}" is not in the dictionary`);
  }
});

test('a broken payload cannot make the sheet print junk',()=>{
  assert.doesNotThrow(()=>carbonMethodSVG());
  assert.doesNotThrow(()=>carbonMethodSVG({},{}));
  for(const bad of [{h:{},tower:{},options:{}},{h:{account:{}},tower:{levels:[]},options:{}},{h:{gross:0}}]){
    const svg=carbonMethodSVG(bad,{lang:'en'});
    assert.doesNotMatch(svg,/NaN|undefined|Infinity/,'junk on a broken sheet');
  }
});

/* A DOM small enough to read. The carbon lab was never invoked by the suite,
   so a lab that threw on its first line would have left all of this green. */
function stubNode(tag){
  // The inner-HTML field is NOT called `_h`: the lab keeps its own `_h` on a
  // canvas (the pixel height it drew at), and a stub that borrowed the name
  // would report the canvas's height as the canvas's markup.
  const n={tagName:String(tag||'').toUpperCase(),childNodes:[],attrs:{},style:{},_t:'',_ih:'',
    className:'',id:'',htmlFor:'',type:'',value:'',
    classList:{add(){},remove(){},toggle(){},contains(){return false}},
    querySelector(){return null},closest(){return null},focus(){},click(){},
    appendChild(c){this.childNodes.push(c);return c},
    get children(){return this.childNodes},
    append(...cs){for(const c of cs)this.childNodes.push(c)},
    replaceChildren(){this.childNodes=[]},
    contains(){return false},
    setAttribute(k,v){this.attrs[k]=v},
    getAttribute(k){return this.attrs[k]},
    addEventListener(){},removeEventListener(){},
    checkValidity(){return true},reportValidity(){return true},
    get textContent(){return this._t+this.childNodes.map(c=>c.textContent).join('')},
    set textContent(v){this._t=String(v);this.childNodes=[]},
    get innerHTML(){return this._ih},
    set innerHTML(v){this._ih=String(v)}};
  return n;
}
const htmlOf=n=>n._ih+n.childNodes.map(htmlOf).join('');
const textOf=n=>n._t+n.childNodes.map(textOf).join('');

test('the lab puts the drawing where the method paragraph used to be',()=>{
  const realDoc=globalThis.document,realGcs=globalThis.getComputedStyle;
  globalThis.document={createElement:t=>stubNode(t),createElementNS:(ns,t)=>stubNode(t),
    createTextNode:t=>{const n=stubNode('#text');n.textContent=t;return n},
    getElementById:()=>null,activeElement:null};
  globalThis.getComputedStyle=()=>({getPropertyValue:()=>''});
  try{
    const host=stubNode('div');
    assert.doesNotThrow(()=>renderCarbonLab({host,state:{...defaults,system:'diagrid',floors:40},
      metrics:{},lang:'en',active:true}));
    const out=htmlOf(host);
    assert.ok(out.includes('<svg class="dsec"'),'the method sheet is not in the lab');
    assert.doesNotMatch(out,/NaN|undefined/,'the lab printed junk');
    // the caption under it is the shortened paragraph, and it is short
    assert.ok(textOf(host).includes(CARBON_TEXT.en.lede),'the caption is not the lab\'s own');
    assert.ok(CARBON_TEXT.en.lede.length<=260,'the caption is not a caption');
  }finally{globalThis.document=realDoc;globalThis.getComputedStyle=realGcs;}
});

test('the two bars are drawn to scale: each segment is its share',()=>{
  // The bars are the claim that the numbers are shares of something. So the
  // guard reads the rectangles off the sheet and checks their widths against
  // the shares the accounting computed — a bar that is drawn, but drawn to
  // the wrong proportion, is as wrong as no bar at all.
  const {r,svg}=drawing('diagrid',40);
  const a=r.here.account;
  const rects=[...svg.matchAll(/<path d="M([\d.-]+) ([\d.-]+) H([\d.-]+) V([\d.-]+) H[-\d.]+ Z"/g)]
    .map(m=>({x:+m[1],y:+m[2],w:+m[3]-+m[1]}));
  assert.ok(rects.length>=6,'the sheet draws no bars');
  const bands=new Map();
  for(const q of rects){const k=q.y.toFixed(2);if(!bands.has(k))bands.set(k,[]);bands.get(k).push(q);}
  const proportional=shares=>{
    const live=shares.filter(v=>v>0),sum=live.reduce((a,b)=>a+b,0);
    if(sum<=0)return false;
    for(const segs of bands.values()){
      const s=[...segs].sort((x,y)=>x.x-y.x);
      if(s.length!==live.length)continue;
      const k=s.reduce((a,q)=>a+q.w,0)/sum;
      if(k<=0)continue;
      let ok=true;
      live.forEach((v,i)=>{if(Math.abs(s[i].w-v*k)>Math.max(0.6,v*k*0.02))ok=false;});
      if(ok)return true;
    }
    return false;
  };
  assert.ok(proportional([a.a13,a.a4,a.a5].map(v=>v/a.total)),'the stage bar is not drawn to scale');
  assert.ok(proportional(['conc','rebar','steel'].map(m=>a.byMat[m]/a.total)),'the material bar is not drawn to scale');
});

test('the bars fill the panel they are drawn in, and both bars are the same total',()=>{
  // A bar drawn to the right proportions but only a third of the panel is still
  // a wrong bar: the panel says "this is the whole", and a stub in it says
  // something else. So the drawn length is measured against the rule that
  // marks the panel, and both bars are compared with each other — they are
  // both the whole total, so they have to be the same length.
  const {svg}=drawing('diagrid',40);
  const rule=[...svg.matchAll(/<path d="M([\d.-]+) [\d.-]+ L([\d.-]+) [\d.-]+" fill="none" stroke="var[(]-{2}line[)]"/g)]
    .map(m=>({x0:+m[1],x1:+m[2]}));
  assert.equal(rule.length,1,'the sheet draws no panel rule to measure the bars against');
  const P=Math.abs(rule[0].x1-rule[0].x0);
  const rects=[...svg.matchAll(/<path d="M([\d.-]+) ([\d.-]+) H([\d.-]+) V([\d.-]+) H[-\d.]+ Z"/g)]
    .map(m=>({x:+m[1],y:+m[2],w:+m[3]-+m[1]}));
  const bands=new Map();
  for(const q of rects){const k=q.y.toFixed(2);if(!bands.has(k))bands.set(k,[]);bands.get(k).push(q);}
  // the bars are the bands that begin at the panel's left edge
  const bars=[...bands.values()].filter(s=>Math.abs(Math.min(...s.map(q=>q.x))-rule[0].x0)<0.5);
  assert.equal(bars.length,2,'the sheet does not draw two bars in the panel');
  const spans=bars.map(b=>Math.max(...b.map(q=>q.x+q.w))-Math.min(...b.map(q=>q.x)));
  for(const span of spans)
    assert.ok(span>=0.9*P,`a bar is ${span.toFixed(1)} units long on a ${P}-unit panel`);
  assert.ok(Math.abs(spans[0]-spans[1])<0.5,'the two bars are not the same length');
});

test('every bar segment is labelled with its own share and its own value',()=>{
  // A bar is a claim about which piece is which. Printing the right numbers in
  // the wrong order, or one stage's share against another stage's value, still
  // puts real numbers on the sheet — and the sheet then lies. So each note is
  // checked as a sentence: the name, then the share, then the value.
  for(const lang of ['en','th','zh']){
    const ctl={...base,core:defaults.core};
    const r=carbonRead({...defaults,system:'diagrid',floors:40},ctl);
    const svg=carbonMethodSVG({h:r.here,tower:r.hereTw,system:r.system,options:ctl},{lang});
    const flat=flatText(svg);
    const a=r.here.account,G=r.here.gross,C=CARBON_TEXT[lang];
    const f1=v=>v.toLocaleString(lang==='th'?'th-TH':lang==='zh'?'zh-CN':'en-US',
      {minimumFractionDigits:1,maximumFractionDigits:1});
    for(const [k,name] of [['a13',C.m.sA13],['a4',C.m.sA4],['a5',C.m.sA5]]){
      const want=`${name} ${(a[k]/a.total*100).toFixed(1)}% · ${f1(a[k]/G)}`;
      assert.ok(flat.includes(want),`${lang}: the ${k} note does not read "${want}"`);
    }
    for(const m of ['conc','rebar','steel']){
      const want=`${C.mat[m]} ${(a.byMat[m]/a.total*100).toFixed(1)}% · ${f1(a.byMat[m]/G)}`;
      assert.ok(flat.includes(want),`${lang}: the ${m} note does not read "${want}"`);
    }
  }
});

test('the paragraph really did shrink: it is a caption now, in every language',()=>{
  // what the paragraph was before the drawing replaced it, and the flat cap
  // the brief set. The second rule is per language and relative, because a
  // flat cap alone would leave the Thai and Chinese paragraphs untouched.
  const WAS={en:274,th:240,zh:83},CAP={en:260,th:260,zh:110};
  for(const l of ['en','th','zh']){
    const v=CARBON_TEXT[l].lede;
    assert.ok(v.length<=CAP[l],`${l}: the caption is ${v.length} characters, over the ${CAP[l]} cap`);
    assert.ok(v.length<=Math.round(WAS[l]*0.7),
      `${l}: the caption is ${v.length} characters — it has not really shrunk from ${WAS[l]}`);
  }
});

test('the drawing\'s own words are translated, in all three languages',()=>{
  const CJK=/[㐀-鿿豈-﫿]/;
  for(const l of ['en','th','zh'])
    for(const [k,v] of Object.entries(CARBON_TEXT[l].m)){
      assert.ok(String(v).trim().length,`${l}.m.${k} is empty`);
      if(l==='zh'){
        assert.ok(/[㐀-鿿]/.test(v),`zh m.${k} falls back to Latin: "${v}"`);
        // the Chinese must not smuggle a Latin sentence past the guard
        assert.doesNotMatch(v.replace(/\{[^}]*\}/g,''),/[A-Za-z]{4,}/,`zh m.${k} contains a Latin word`);
      }else assert.ok(!CJK.test(v),`${l}.m.${k} contains CJK`);
    }
});


test('A5w includes waste haul and processing from IStructE Eq.2.3 even when inbound transport is zero',()=>{
 const a=account({grav_conc:1000,lat_rebar:1000,lat_steel:1000},{concrete:'C25/30',ggbs:25,km:0});
 near(a.a5Parts.outbound,(53+53+10)*0.005);
 near(a.a5Parts.processing,(53+53+10)*0.013);
 near(a.a5,Object.values(a.a5Parts).reduce((n,v)=>n+v,0));
 near(a.total,a.a13+a.a4+a.a5);
 const r=drawing('column-grid',40);
 for(const lang of ['en','th','zh']){
  const text=flatText(carbonMethodSVG({h:r.r.here,tower:r.r.hereTw,system:r.r.system,options:base},{lang}));
  assert.ok(text.includes('0.005')&&text.includes('0.013'),lang+': waste assumptions not exposed');
 }
});


test('Thai transport labels the same gram factor as the other scripts',()=>{
 const r=drawing('column-grid',40);
 const text=flatText(carbonMethodSVG({h:r.r.here,tower:r.r.hereTw,system:r.r.system,options:base},{lang:'th'}));
 assert.ok(text.includes('0.107')&&text.includes('กรัมCO₂e/กก./กม.'));
 assert.ok(!text.includes('0.107 กก.CO₂e/กก./กม.'));
});


test('source carbon factors retain explicit SI dimensions in imperial drawings',async()=>{
 const ref=readFileSync(new URL('../dist/carbon.js',import.meta.url),'utf8').match(/from ['"](.\/preferences.js[^'"]*)['"]/)[1];
 const pref=await import(new URL('../dist/'+ref.replace('./',''),import.meta.url));
 try{
  pref.setPreferences({units:'imperial'});
  const r=drawing('column-grid',40);
  for(const lang of ['en','th','zh']){
   const text=flatText(carbonMethodSVG({h:r.r.here,tower:r.r.hereTw,system:r.r.system,options:base},{lang}));
   assert.ok(text.includes('0.005')&&text.includes('0.013'));
   assert.ok(text.includes('(SI)'));
   assert.ok(text.includes(CARBON_TEXT[lang].m.transport.split('{f}')[1].trim()),lang);
   assert.ok(text.includes(CARBON_TEXT[lang].m.waste.split('{process}')[1].trim()),lang);
  }
 }finally{pref.resetPreferences()}
});
