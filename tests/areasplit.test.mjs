import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,evaluate,families} from '../dist/model.js';
import {splitOf,splitSVG,legendLayout,wrapLabel,textWidth,monoWidth,LAYOUT,CIRCULATION_SHARE,AREA_SPLIT,KEYS} from '../dist/areasplit.js';
import {t} from '../dist/i18n.js';

const read=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');

/* Read a rendered legend back out of the SVG, the way a person would look at
   it: as marks with positions and measured widths, not as the arguments the
   renderer was handed. A guard that reuses the renderer's own arithmetic only
   proves the arithmetic is self-consistent; this one proves the drawing fits. */
const texts=(frag,cls)=>[...frag.matchAll(new RegExp('<text x="([\\d.]+)" y="([\\d.]+)" class="'+cls+'"[^>]*>([^<]*)<','g'))]
 .map(m=>({x:Number(m[1]),y:Number(m[2]),t:m[3]}));
const viewBox=svg=>{
 const m=/viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
 assert.ok(m,'the drawing has no viewBox: '+svg.slice(0,80));
 return {w:Number(m[1]),h:Number(m[2])};
};
/* The angle a drawn wedge actually covers, measured off its own endpoints.
   atan2 returns (-π, π], so a sweep that crosses twelve o'clock arrives
   negative and has to be brought back round before it means anything. */
const sweepOf=w=>{
 let d=w.a1-w.a0;
 while(d<0)d+=Math.PI*2;
 return d;
};

test('the three slices are core, circulation and net usable, and they sum to the plate',()=>{
 // The whole point of a proportion chart is that it is a proportion. If the
 // slices do not add to the plate, one of the three numbers is being read as a
 // share of something other than what it is labelled a share of — and a pie
 // cannot say so.
 const ev=evaluate(defaults),sp=splitOf(ev);
 assert.equal(sp.slices.length,3);
 assert.deepEqual(sp.slices.map(s=>s.key),KEYS);
 const sum=sp.slices.reduce((a,s)=>a+s.value,0);
 assert.ok(Math.abs(sum-sp.gross)<1e-6,
  `slices sum to ${sum} but the plate is ${sp.gross}`);
 // And usable is exactly the plate minus the core, as specified.
 assert.ok(Math.abs(sp.usable-(sp.gross-sp.core))<1e-6);
 assert.ok(Math.abs(sp.circulation-sp.usable*CIRCULATION_SHARE)<1e-9,
  'circulation is not 30% of the plate inside the core');
 assert.ok(Math.abs(sp.net-(sp.usable-sp.circulation))<1e-6,'net usable double-counts the circulation');
 // Percentages are of the plate, and they add to 100.
 const pcs=sp.slices.map(s=>parseFloat(s.pct));
 assert.ok(Math.abs(pcs.reduce((a,b)=>a+b,0)-100)<0.2,`percentages sum to ${pcs.reduce((a,b)=>a+b,0)}`);
 for(const s of sp.slices)assert.ok(s.value>=0&&s.value<=sp.gross,`${s.key} is outside the plate`);
});

test('a bigger core or a bigger span moves the split the way it should',()=>{
 const base=splitOf(evaluate(defaults));
 // A wider span grows the plate faster than the core, so the core's share must
 // fall. If it does not, the chart is not reading the geometry.
 const wide=splitOf(evaluate({...defaults,span:60}));
 assert.ok(wide.core/wide.gross<base.core/base.gross,
  `a 60 m span should shrink the core share (${(wide.core/wide.gross*100).toFixed(1)}% vs ${(base.core/base.gross*100).toFixed(1)}%)`);
 // A larger core side grows the core area, so its share must rise.
 const fat=splitOf(evaluate({...defaults,core:26}));
 assert.ok(fat.core/fat.gross>base.core/base.gross,'a 26 m core should raise the core share');
 for(const sp of [wide,fat]){
  assert.ok(Math.abs(sp.slices.reduce((a,s)=>a+s.value,0)-sp.gross)<1e-6,'slices stopped summing to the plate');
 }
 // Every form family produces a drawable split, because the whole request is to
 // see the proportion in EACH design.
 for(const family of Object.keys(families)){
  const sp=splitOf(evaluate({...defaults,family}));
  assert.ok(sp.gross>0,family+' has no plate');
  assert.ok(Math.abs(sp.slices.reduce((a,s)=>a+s.value,0)-sp.gross)<1e-6,family+' slices do not sum');
  assert.equal(sp.slices.filter(s=>s.value>0).length,3,family+' has an empty slice');
 }
});

test('the chart says the circulation share is an assumption, and names the other deduction',()=>{
 // The model's own common allowance is not circulation: it is a gross-up that
 // also carries shafts and structure. The two therefore disagree — 30% of the
 // plate against a 12% allowance by default — and a drawing that prints one of
 // them without saying so is the exact failure the note exists to prevent.
 assert.equal(CIRCULATION_SHARE,0.30);
 assert.ok(AREA_SPLIT.note.length>60,'the assumption is not stated');
 assert.match(AREA_SPLIT.note,/30%/,'the assumed share is not named on the drawing');
 assert.match(AREA_SPLIT.note,/shaft|structure|common/i,'the other deduction is not distinguished from circulation');
 const ev=evaluate(defaults),sp=splitOf(ev);
 // Both figures are carried so the caller can print both.
 assert.ok(sp.modelCommon>0&&sp.modelRentable>0&&sp.modelEfficiency>0);
 assert.notEqual(Math.round(sp.net),Math.round(sp.modelRentable),
  'if the pie and the schedule agree exactly, the reconciliation note is claiming a difference that does not exist');
});

test('the pie draws three wedges and a fixed-column legend, and never a label collision',()=>{
 const ev=evaluate(defaults),sp=splitOf(ev);
 const names={core:'Core',circulation:'Circulation',net:'Usable, net of circulation'};
 const svg=splitSVG(sp.slices.map(s=>({...s,label:names[s.key]})),
  {total:sp.gross,legend:sp.legend.map((g,i)=>({...g,label:names[KEYS[i]],value:'1,000 m²'}))});
 assert.match(svg,/<svg viewBox="0 0 [\d.]+ [\d.]+" role="img" aria-label="[^"]+"/);
 assert.equal((svg.match(/<path d="M/g)||[]).length,3,'three slices means three wedges');
 // Every wedge carries the large-arc flag, which is the detail that silently
 // draws a slice as its mirror image when a share passes half the pie.
 for(const m of svg.matchAll(/A(\d+) \1 0 (\d) 1/g))assert.ok(m[2]==='0'||m[2]==='1','a wedge has a malformed arc flag');
 assert.doesNotMatch(svg,/NaN|undefined|Infinity/);
 // Legend rows are in a column, so two rows can never land on the same line.
 // More than three name lines is correct — a name too wide for the column is
 // wrapped rather than clipped — but no two lines may share a baseline.
 const ys=texts(svg,'as-name').map(g=>g.y);
 assert.ok(ys.length>=3,'the legend lost a row');
 assert.equal(new Set(ys).size,ys.length,'two legend rows share a line');
 for(let i=1;i<ys.length;i++)assert.ok(ys[i]-ys[i-1]>1,'two legend rows share a line');
 // A degenerate split — everything core, no usable — must still draw.
 const flat=splitSVG([{key:'core',label:'Core',value:100,fill:'#9aa3a0'},{key:'circulation',label:'Circulation',value:0,fill:'#5c6a72'},{key:'net',label:'Usable',value:0,fill:'#f59e0b'}],
  {total:100,legend:[]});
 assert.doesNotMatch(flat,/NaN|undefined/,'a zero-width slice broke the arc maths');
 const empty=splitSVG([],{total:0,legend:[]});
 assert.doesNotMatch(empty,/NaN|undefined/,'a zero plate broke the arc maths');
});

test('the wedges are the angles their shares deserve, and close the circle',()=>{
 /* This is the guard that was missing while the pie drew a quarter of itself.
    TAU was Math.PI/2 under that name, so all three wedges swept a quarter of
    their true angle and the chart was a ninety-degree fan labelled 16 / 25 / 59.
    Every other test in this file passed, because every other test read the
    numbers — and the numbers were right. The only thing wrong was the geometry,
    and nothing was measuring the geometry. So this one measures the geometry:
    it reads the arc endpoints back out of the drawn path data, derives each
    wedge's real central angle, and checks it against the share. */
 const ev=evaluate(defaults),sp=splitOf(ev);
 const svg=splitSVG(sp.slices,{total:sp.gross,legend:[]});
 const DEG=180/Math.PI;
 const wedges=[...svg.matchAll(/M([\d.]+) ([\d.]+) L([\d.-]+) ([\d.-]+) A[\d.]+ [\d.]+ 0 (\d) 1 ([\d.-]+) ([\d.-]+) Z/g)]
  .map(m=>({
   cx:+m[1],cy:+m[2],
   a0:Math.atan2(+m[4]-+m[2],+m[3]-+m[1]),
   a1:Math.atan2(+m[7]-+m[2],+m[6]-+m[1]),
   large:+m[5]
  }));
 assert.equal(wedges.length,3,'could not read three wedges back out of the path data');

 // Walk the wedges in draw order and accumulate, the way the builder does, so
 // a sweep that runs backwards cannot be hidden by a later one compensating.
 /* Path coordinates are written to two decimals, so at r=50 a coordinate can be
    out by 0.01 and an angle recovered from it by 0.01/50 ≈ 0.011°. Asserting to
    a tighter tolerance than the file's own precision would be asserting that
    the rounding did not happen. 0.05° per wedge is above that noise floor and
    far below anything that would change what the reader sees. */
 const TOL=0.05/DEG;
 let acc=0;
 for(const w of wedges){
  const sweep=sweepOf(w);
  acc+=sweep;
  assert.ok(sweep>0&&sweep<Math.PI*2+1e-9,`a wedge swept ${(sweep*DEG).toFixed(1)}°`);
  // The large-arc flag has to agree with the sweep it is flagging.
  assert.equal(w.large,sweep>Math.PI?1:0,
   `a wedge of ${(sweep*DEG).toFixed(1)}° carries large-arc=${w.large}`);
 }
 assert.ok(Math.abs(acc-Math.PI*2)<TOL*4,
  `the wedges cover ${(acc*DEG).toFixed(2)}° of a 360° circle`);

 // And each wedge is its own share of the turn, to within the rounding.
 sp.slices.forEach((sl,i)=>{
  const sweep=sweepOf(wedges[i]);
  const want=Math.PI*2*(sl.value/sp.gross);
  assert.ok(Math.abs(sweep-want)<TOL,
   `${sl.key} sweeps ${(sweep*DEG).toFixed(2)}° but ${sl.pct} of the plate is ${(want*DEG).toFixed(2)}°`);
 });

 // The same has to hold when a family puts one slice past half the plate,
 // because that is the case where the large-arc flag is load-bearing.
 let sawLarge=false;
 for(const family of Object.keys(families)){
  const s2=splitOf(evaluate({...defaults,family}));
  const g2=splitSVG(s2.slices,{total:s2.gross,legend:[]});
  const w2=[...g2.matchAll(/M[\d.]+ [\d.]+ L[\d.-]+ [\d.-]+ A[\d.]+ [\d.]+ 0 (\d) 1 [\d.-]+ [\d.-]+ Z/g)]
   .map(m=>{const r=Number(m[1]);if(r===1)sawLarge=true;return r;});
  assert.equal(w2.length,3,family+' drew '+w2.length+' wedges');
  // Re-derive each family from its own path data, not from the model.
  const mm=[...g2.matchAll(/M([\d.]+) ([\d.]+) L([\d.-]+) ([\d.-]+) A[\d.]+ [\d.]+ 0 \d 1 ([\d.-]+) ([\d.-]+) Z/g)]
   .map(m=>({cx:+m[1],cy:+m[2],a0:Math.atan2(+m[4]-+m[2],+m[3]-+m[1]),a1:Math.atan2(+m[6]-+m[2],+m[5]-+m[1])}));
  const tot=mm.reduce((a,w)=>a+sweepOf(w),0);
  assert.ok(Math.abs(tot-Math.PI*2)<TOL*4,`${family} covers ${(tot*DEG).toFixed(2)}°, not a full turn`);
 }
 assert.ok(sawLarge,'no family produced a large-arc wedge, so the flag is still untested');
});

test('the legend measures its labels, so no language prints its name through the percentage',()=>{
 /* The regression this guards is specific. The legend was three fixed rows
    against three fixed columns, tuned until the English fitted. 扣除交通后的使用面积
    is eleven full-width glyphs where "Usable, net of circulation" is twenty-five
    narrow ones, so in Chinese the name ran straight through 58.8% and the two
    printed on top of each other. Shortening the label would have hidden it —
    "net" is the word that stops the third slice double-counting the circulation
    — so the name stays and the COLUMN gives way instead. */
 const LANG={
  en:{core:'Core',circulation:'Circulation',net:'Usable, net of circulation',unit:'m²'},
  th:{core:'แกนกลาง',circulation:'ทางเดิน',net:'พื้นที่ใช้สอย หักทางเดินแล้ว',unit:'ตร.ม.'},
  zh:{core:'核心筒',circulation:'交通',net:'扣除交通后的使用面积',unit:'m²'}
 };
 // The probe labels are checked against the translation file, so a translation
 // change that breaks the layout fails here rather than only on screen.
 for(const l of ['en','th','zh'])
  for(const k of KEYS)
   assert.equal(LANG[l][k],t[l]['as.'+(k==='circulation'?'circ':k)],
    'the probe label for '+l+'/'+k+' has drifted from the translation');

 const ev=evaluate(defaults),sp=splitOf(ev);
 for(const lang of Object.keys(LANG)){
  const n=LANG[lang];
  const legend=sp.legend.map((g,i)=>({...g,label:n[KEYS[i]],value:'34,701 '+n.unit}));
  const svg=splitSVG(sp.slices.map(s=>({...s,label:n[s.key]})),{total:sp.gross,legend});
  const {w:vw,h:vh}=viewBox(svg);

  // Rows are read back in the order they were emitted — one block per swatch —
  // so a row is never confused with the rows above it.
  const blocks=svg.split('<rect').slice(1);
  assert.equal(blocks.length,3,lang+' lost a legend row');
  let prevValY=null;
  for(const b of blocks){
   const rows=texts(b,'as-name'),val=texts(b,'as-val'),pct=texts(b,'as-pct');
   assert.equal(val.length,1,lang+': a row has no value');
   assert.equal(pct.length,1,lang+': a row has no percentage');
   assert.ok(rows.length>=1&&rows.length<=3,`${lang}: a row has ${rows.length} name lines`);
   for(let j=1;j<rows.length;j++)
    assert.ok(Math.abs(rows[j].y-rows[j-1].y-LAYOUT.LINE)<0.2,lang+': name lines are not evenly spaced');
   assert.ok(val[0].y>rows[rows.length-1].y,`${lang}: the value is drawn on top of its own name`);
   assert.equal(val[0].y,pct[0].y,lang+': the value and the percentage are on different lines');
   if(prevValY!==null)
    assert.ok(rows[0].y-prevValY>=LAYOUT.BLOCK_GAP-0.2,
     `${lang}: a row starts ${(rows[0].y-prevValY).toFixed(1)} after the row above it`);
   prevValY=val[0].y;
  }

  // The percentage column's left edge, from the widest percentage drawn.
  const pcts=texts(svg,'as-pct'),names=texts(svg,'as-name'),vals=texts(svg,'as-val');
  const pctLeft=Math.min(...pcts.map(p=>p.x-monoWidth(p.t,LAYOUT.PCT_SZ)));
  for(const g of names){
   const right=g.x+textWidth(g.t,LAYOUT.NAME_SZ);
   assert.ok(right<=pctLeft-3,
    `${lang}: "${g.t}" reaches ${right.toFixed(1)} but the percentage starts at ${pctLeft.toFixed(1)}`);
  }
  // The value sits under its own name with the whole width to itself, but must
  // still stop before the box edge — Thai carries the longest unit.
  for(const v of vals)
   assert.ok(v.x+monoWidth(v.t,LAYOUT.VAL_SZ)<=vw-4,`${lang}: value "${v.t}" runs past the drawing`);
  for(const g of [...pcts,...names])
   assert.ok(g.y>=1&&g.y<=vh-2&&g.x<=vw-4,`${lang}: "${g.t}" is outside the box`);
 }

 // The wrap is load-bearing, not luck. If every real label fitted the column,
 // this test would still pass with the measuring removed — so require that at
 // least two of them do NOT fit, which is the Chinese and the Thai one.
 const col=LAYOUT.PCT_X-LAYOUT.NAME_X-monoWidth('58.8%',LAYOUT.PCT_SZ)-LAYOUT.COL_GAP;
 const tooWide=Object.values(LANG).filter(n=>textWidth(n.net,LAYOUT.NAME_SZ)>col);
 assert.ok(tooWide.length>=2,
  `only ${tooWide.length} real label(s) overflow the column — the wrap is untested`);

 // And an absurd name must still not collide, which is the property the
 // estimator is actually there to guarantee.
 const wild=legendLayout([{label:'A'.repeat(400),pct:'58.8%',value:'34,701 m²'}]);
 assert.ok(wild.blocks[0].lines.length>1,'a 400-glyph name should wrap');
 for(const line of wild.blocks[0].lines)
  assert.ok(textWidth(line,LAYOUT.NAME_SZ)<=wild.nameMax+1e-9,'the wrap let a line exceed the column');
 // A script with no spaces distributes instead of leaving an orphan, which is
 // what "扣除交通后的使用面" + "积" was.
 const zh=wrapLabel(LANG.zh.net,col,LAYOUT.NAME_SZ);
 assert.ok(zh.length>=2);
 assert.ok(Math.min(...zh.map(l=>[...l].length))>=2,'a no-space label was left with an orphan glyph');
});

test('the split is drawn in the rail beside the schedule, in all three languages',()=>{
 const html=read('index.html'),app=read('app.js');
 assert.match(html,/id="areaFigure"/);
 assert.match(html,/data-i18n="as\.head"/);
 assert.match(app,/drawAreaSplit\(\)/);
 // Called from drawPlan so it follows the floor slider and every slider, like
 // the plan and the core section beside it.
 assert.ok(app.includes('drawCore();\n drawAreaSplit();'));
 // Both rails' language coverage.
 for(const l of ['en','th','zh']){
  for(const k of ['as.core','as.circ','as.net','as.head','as.note'])
   assert.ok(t[l][k],l+' omits '+k);
  assert.ok(!/undefined/.test(t[l]['as.note']));
 }
 // The chart must not invent a gradient or a rounded chip to hold the legend —
 // the house rules apply to a chart exactly as they do to a panel.
 const css=read('style.css');
 const block=css.slice(css.indexOf('.areasplit svg'),css.indexOf('.dsecwrap'));
 assert.doesNotMatch(block,/gradient|border-radius|box-shadow/);
 assert.ok(readFileSync(new URL('../scripts/release-id.mjs',import.meta.url),'utf8').includes("'areasplit.js'"),'areasplit.js is not in the release graph');
});