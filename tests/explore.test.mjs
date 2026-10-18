import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,grossOf,searchPlan,scoreCandidate,rank,evaluate} from '../dist/model.js';
import {familyResponse,lattice,responseScale,familyBands,compact} from '../dist/explore.js';

/* ── a DOM small enough to read ───────────────────────────────────────────
   The figures are the deliverable, so the guards read what they emit rather
   than the source that emits it. explore.js only needs elements, attributes,
   inline styles and append, so that is all this provides. */
const serial=(n,depth=0)=>{
  if(n==null||n===false)return '';
  if(typeof n==='string')return n.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  if(Array.isArray(n))return n.map(x=>serial(x,depth)).join('');
  const attrs=Object.entries(n.attrs).map(([k,v])=>` ${k}="${String(v).replace(/"/g,'&quot;')}"`).join('');
  const style=Object.keys(n.style).length?' style="'+Object.entries(n.style).map(([k,v])=>`${k}:${v}`).join(';')+'"':'';
  const open=`<${n.tag}${attrs}${style}>`;
  if(n.selfClosing)return open;
  const inner=n._void?n._raw:serial(n.children,depth+1);
  return`${open}${n._void?n._raw:n._text}${inner}</${n.tag}>`;
};
class El{
  constructor(tag,{ns=false,selfClosing=false}={}){
    this.tag=tag;this.attrs={};this.style={};this.children=[];this._text='';
    this._void=false;this._raw='';this.selfClosing=selfClosing;
  }
  set textContent(v){this._text=String(v);this.children=[];this._void=false;this._raw='';}
  get textContent(){return this._text||this.children.map(c=>c.textContent??String(c)).join('');}
  set className(v){this.attrs.class=v;}
  get className(){return this.attrs.class||'';}
  set title(v){this.attrs.title=v;}
  set type(v){this.attrs.type=v;}
  get classList(){const self=this;return{add(c){self.attrs.class=(self.attrs.class?self.attrs.class+' ':'')+c}};}
  setAttribute(k,v){this.attrs[k]=v}
  append(...n){for(const c of n){if(c==null)continue;this.children.push(c);if(c instanceof El){c.parent=this;if(c.tag==='text')this._text=''}}return this}
  querySelectorAll(){return[]}
  toString(){return serial(this)}
}
const document={
  createElement:t=>new El(t),
  createElementNS:(ns,t)=>new El(t,{ns})
};
globalThis.document=document;
const T=new Map();
const put=k=>{T.set(k,k)}; // tests set the wording keys; the rest echo, as the real translator does
const tt=k=>T.get(k)??k;
for(const f of['box','chamfer','cross','octagon','star','rub','triangle','hexagon','oval','petal','pinwheel'])put('fs.'+f);
const strip=s=>String(s).replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"');

/* The search space, recomputed here from the model rather than reused from
   explore.js, so a cell that stopped matching its candidate fails the test. */
function run(){
  const plan=searchPlan(defaults);
  return rank(plan.list.map(c=>scoreCandidate(c,'contribution')));
}
const ALTS=run();
const CURRENT={contribution:evaluate(defaults).contribution,family:defaults.family};
const cell=(family,taper,twist)=>{
  const target=grossOf(defaults);
  const c={...defaults,family,taper,twist};
  c.span*=Math.sqrt(target/Math.max(grossOf(c),1));
  return c;
};

/* The expected geometry, derived here from the raw contributions rather than
   by calling responseScale. An expectation produced by the function under test
   proves nothing: break the scale and the expectation breaks with it, and the
   guard goes green on exactly the defect it was written for. */
const VALUES=ALTS.map(a=>a.metrics.contribution);
const LO=Math.min(...VALUES),HI=Math.max(...VALUES);
const expectX=v=>118+(v-LO)/((HI-LO)||1)*(650-118);

test('the search space is what the lattice claims: eleven families, 168 feasible, one gross area',()=>{
  const plan=searchPlan(defaults);
  assert.equal(plan.examined,176);
  assert.equal(ALTS.length,168);
  assert.equal(plan.examined-ALTS.length,8);
  // The spine of the whole instrument: every candidate was resized to the same
  // gross floor area, so the comparison is between forms of the same size.
  const target=grossOf(defaults);
  for(const a of ALTS)assert.ok(Math.abs(a.metrics.gross-target)<1e-6,`${a.state.family} ${a.metrics.gross}`);
});

test('every family gets a band, and no band hides a candidate',()=>{
  const bands=familyBands(ALTS);
  assert.equal(bands.length,11);
  assert.equal(bands.reduce((n,b)=>n+b.rows.length,0),ALTS.length);
  for(const b of bands){
    const cs=b.rows.map(r=>r.metrics.contribution);
    assert.equal(b.lo,Math.min(...cs),b.family);
    assert.equal(b.hi,Math.max(...cs),b.family);
    assert.equal(b.best.metrics.contribution,b.hi,b.family);
    assert.equal(b.family,b.best.state.family);
  }
  // Sorted by best contribution, descending: the figure is a ranking, not a set.
  for(let i=1;i<bands.length;i++)assert.ok(bands[i-1].hi>=bands[i].hi);
  // Disjoint: no candidate is counted under two families.
  assert.equal(new Set(ALTS.map(a=>a)).size,ALTS.length);
});

test('the family response figure is drawn on one shared scale, extremes at the ends',()=>{
  for(const k of ['s.plotTitle','s.plotNote'])put(k);
  const svg=familyResponse(ALTS,CURRENT,tt,'en');
  const out=strip(svg);
  const s=responseScale(ALTS,CURRENT);
  // The current tower has to be drawable on the same scale as the candidates,
  // which is why the scale is built from both and not from the run alone.
  assert.ok(s.min<=CURRENT.contribution&&CURRENT.contribution<=s.max,'current rule would fall off the paper');
  assert.equal(s.min,LO);
  assert.equal(s.max,Math.max(HI,CURRENT.contribution));
  // responseScale itself, checked against a map written out here.
  for(const v of[LO,HI,CURRENT.contribution,(LO+HI)/2])
    assert.ok(Math.abs(s.x(v)-expectX(v))<1e-6,`scale at ${v}`);
  // A per-family normalisation still looks tidy — every rule spans the full
  // width — and it erases the one comparison the figure exists to make. So the
  // extremes have to land on the ends of the axis and nothing may be padded in.
  assert.ok(Math.abs(expectX(LO)-118)<1e-6);
  assert.ok(Math.abs(expectX(HI)-650)<1e-6);
  assert.ok(HI>LO*1.05,'the run must actually span a range worth plotting');
  const bands=[...out.matchAll(/<g class="study-band[^"]*"[^>]*aria-label="[^"]*"/g)];
  assert.equal(bands.length,11);
  // Every rule endpoint must come from the ONE shared scale. A per-family
  // normalisation would still look tidy and would erase the whole comparison.
  const rules=[...out.matchAll(/<path d="M([\d.]+) [\d.]+H([\d.]+)" stroke="#(?:191c1b|585e5b)" stroke-width="2"/g)];
  assert.equal(rules.length,11);
  const expect=familyBands(ALTS).map(b=>[expectX(b.lo),expectX(b.hi)]);
  rules.forEach((m,i)=>{
    assert.ok(Math.abs(+m[1]-expect[i][0])<0.01,`band ${i} lo is not on the shared scale`);
    assert.ok(Math.abs(+m[2]-expect[i][1])<0.01,`band ${i} hi is not on the shared scale`);
    assert.ok(+m[2]>+m[1],`band ${i} has no spread`);
  });
  // The widest run therefore spans the whole width, with nothing padded inside.
  const xs=rules.flatMap(m=>[+m[1],+m[2]]);
  assert.ok(Math.abs(Math.min(...xs)-s.x(s.min))<1e-6);
  assert.ok(Math.abs(Math.max(...xs)-s.x(s.max))<1e-6);
  // The current tower is a rule of its own, on the same scale, and dashed.
  const cur=/<path d="M([\d.]+) [\d.]+V[\d.]+" stroke="#f59e0b" stroke-width="1" stroke-dasharray/.exec(out);
  assert.ok(cur,'current rule missing');
  assert.ok(Math.abs(+cur[1]-expectX(CURRENT.contribution))<0.01,'current rule is off the shared scale');
  assert.match(out,/stroke-dasharray="4 3"/);
  // One amber mark per band, and it sits at that band's high end.
  assert.equal((out.match(/r="3.4" fill="#f59e0b"/g)||[]).length,11);
});

test('the lattice is the grid the search walked: 16 cells, real values, one best',()=>{
  for(const k of['s.latticeTitle','s.latticeNote','s.latticeLegend','s.latticeRejected','s.roofScale','s.twist','s.rejected'])put(k);
  T.set('s.latticeRejected','Dashed cells were examined and rejected.');
  const out=strip(lattice(ALTS,'cross',tt,'en',()=>{}));
  const buttons=[...out.matchAll(/<button class="lattice-cell[^"]*"[^>]*>([^<]*)<\/button>/g)];
  assert.equal(buttons.length,16,'a complete family is a full 4x4 grid');
  const seen=new Set();
  buttons.forEach((m,i)=>{
    const taper=[1,.9,.8,.7][(i/4)|0],twist=[0,30,60,90][i%4];
    const want=compact('en',scoreCandidate(cell('cross',taper,twist),'contribution').metrics.contribution);
    assert.equal(m[1],want,`cell ${taper}/${twist} is not the candidate the search scored`);
    seen.add(m[1]);
  });
  // Four distinct roof scales by four distinct twists — the axes are real.
  assert.equal(new Set([...out.matchAll(/class="lattice-lab">([\d.]+)</g)].map(m=>m[1])).size,4);
  assert.equal(new Set([...out.matchAll(/class="lattice-tick">([\d.]+)°/g)].map(m=>m[1])).size,4);
  // Exactly one cell is the best, and it is the family's maximum.
  const best=[...out.matchAll(/<button class="lattice-cell best"[^>]*>([^<]*)</g)];
  assert.equal(best.length,1);
  const famMax=Math.max(...ALTS.filter(a=>a.state.family==='cross').map(a=>a.metrics.contribution));
  assert.equal(best[0][1],compact('en',famMax));
  // A complete family must not be told about absent cells. The legend has to
  // track the data, so the clause is emitted only when a cell is actually gone.
  assert.doesNotMatch(out,/Dashed cells were examined and rejected/);
});

test('an incomplete family draws the absent cells and says so',()=>{
  for(const k of['s.latticeTitle','s.latticeNote','s.latticeLegend','s.roofScale','s.twist','s.rejected'])put(k);
  put('s.latticeRejected');
  T.set('s.latticeRejected','Dashed cells were examined and rejected.');
  const out=strip(lattice(ALTS,'triangle',tt,'en',()=>{}));
  // Triangular is the one family the run could not complete: 8 of 16 survived.
  assert.equal(ALTS.filter(a=>a.state.family==='triangle').length,8);
  assert.equal((out.match(/<button class="lattice-cell/g)||[]).length,8);
  assert.equal((out.match(/<span class="lattice-cell"[^>]*>—<\/span>/g)||[]).length,8);
  assert.match(out,/Dashed cells were examined and rejected/);
});

test('cell shade is a data ladder, not decoration: monotone in value, one accent',()=>{
  for(const k of['s.latticeTitle','s.latticeNote','s.latticeLegend','s.roofScale','s.twist'])put(k);
  const out=strip(lattice(ALTS,'cross',tt,'en',()=>{}));
  const cells=[...out.matchAll(/<button class="lattice-cell([^"]*)"[^>]*style="background:([^;]*);color:([^"]*)"[^>]*>([^<]*)</g)];
  assert.equal(cells.length,16);
  const STEP=b=>b==='#f59e0b'?99:['#eceeea','#d8dbd6','#bec2bc','#9ba09b','#767c77','#4e544f'].indexOf(b);
  assert.ok(cells.every(m=>STEP(m[2])>=0),'a cell used a colour outside the ladder');
  assert.ok(cells.every(m=>m[2]==='#f59e0b'||m[3].length>0),'every cell states a readable ink');
  // Darker step for a higher number, never the reverse.
  const pairs=cells.map(m=>[STEP(m[2]),parseFloat(m[4].replace(/[^\d.]/g,'')),m[5]]);
  const sorted=[...pairs].sort((a,b)=>a[1]-b[1]);
  for(let i=1;i<sorted.length;i++)assert.ok(sorted[i][0]>=sorted[i-1][0],'shade is not monotone in value');
  // Exactly one accent, on the largest value.
  assert.equal(cells.filter(m=>m[2]==='#f59e0b').length,1);
  assert.equal(pairs.filter(p=>p[0]===99)[0][2],sorted[sorted.length-1][2]);
  // Ink flips once, at the step the ladder turns dark — never per-cell whim.
  for(const m of cells){const s=STEP(m[2]);if(s>=4&&s<99)assert.equal(m[3],'#f2f2ef',m[2]);else assert.equal(m[3],'#191c1b',m[2])}
});

test('the three scripts agree on the study wording, and Chinese carries no Latin fallback',async()=>{
  const {t}=await import('../dist/i18n.js');
  const keys=['s.plotTitle','s.plotNote','s.latticeTitle','s.latticeNote','s.latticeLegend','s.latticeRejected','s.roofScale','s.twist','s.current'];
  const fams=Object.keys(defaults&&{})&&['box','chamfer','cross','octagon','star','rub','triangle','hexagon','oval','petal','pinwheel'];
  for(const l of['en','th','zh'])for(const k of[...keys,...fams.map(f=>'fs.'+f)]){
    const v=t[l][k];
    assert.ok(typeof v==='string'&&v.trim().length>0,`${l} ${k} missing`);
  }
  // Exact key parity, both directions, so a key cannot exist in one script only.
  const ours=Object.keys(t.en).filter(k=>k.startsWith('s.plot')||k.startsWith('s.lattice')||k.startsWith('fs.'));
  assert.deepEqual(Object.keys(t.th).filter(k=>k.startsWith('s.plot')||k.startsWith('s.lattice')||k.startsWith('fs.')).sort(),ours.slice().sort());
  assert.deepEqual(Object.keys(t.zh).filter(k=>k.startsWith('s.plot')||k.startsWith('s.lattice')||k.startsWith('fs.')).sort(),ours.slice().sort());
  assert.equal(ours.filter(k=>k.startsWith('fs.')).length,11,'every profile family has a short name');
  for(const k of keys)if(k!=='s.current'){assert.match(t.th[k],/[ก-๙]/,k);assert.match(t.zh[k],/[\u3400-\u9fff]/,k)}
  for(const f of fams){assert.match(t.th['fs.'+f],/[ก-๙]/,f);assert.match(t.zh['fs.'+f],/[\u3400-\u9fff]/,f)}
  // No zh string may fall back to an English sentence.
  for(const k of[...keys,...fams.map(f=>'fs.'+f)]){
    if(k==='s.current')continue;
    assert.notEqual(t.zh[k],t.en[k],`${k} is English text sitting in the Chinese table`);
  }
});

test('a cell reads the same width in all three scripts, and the unit is said once',async()=>{
  const {t}=await import('../dist/i18n.js');
  for(const k of['s.latticeTitle','s.latticeNote','s.latticeLegend','s.roofScale','s.twist'])put(k);
  // Intl's compact notation writes 2628.0万 into a cell built for 26.3. The
  // figure divides by a million instead, so the glyph count cannot change with
  // the language and the currency is named once in the caption, not per cell.
  const v=26280000;
  for(const l of['en','th','zh'])assert.equal(compact(l,v),'26.3',l);
  assert.equal(compact('en',1000000),'1.0');
  assert.equal(compact('zh',23456789),'23.5');
  const runs=['en','th','zh'].map(l=>strip(lattice(ALTS,'cross',(k)=>k==='s.latticeNote'?'caption':k,l,()=>{})));
  const texts=runs.map(r=>[...r.matchAll(/<button class="lattice-cell[^"]*"[^>]*>([^<]*)</g)].map(m=>m[1]).join(' '));
  assert.equal(texts[0],texts[1],'Thai cells changed width');
  assert.equal(texts[0],texts[2],'Chinese cells changed width');
  assert.equal(texts[0].split(' ')[0],'26.3');
  // No cell may carry a currency symbol: the unit lives in the caption.
  assert.doesNotMatch(texts[0],/\$/);
  for(const l of['en','th','zh']){
    const n=t[l]['s.latticeNote'];
    assert.ok(n.length>(l==='zh'?20:30),`${l} caption too short to carry a unit`);
  }
});

test('a language click redraws the result instead of re-running it',()=>{
  const src=readFile();
  // The table is DOM built from tt(). If a language change never redraws it, the
  // reader is left reading a study in whichever script launched the search.
  assert.match(src,/if\(searchRun\)renderSearch\(\)/);
  // And it must not re-run: the numbers are language-independent, and a re-run
  // would make a language click look like a fresh search.
  const setLang=src.slice(src.indexOf('function setLang'),src.indexOf('function setLang')+1400);
  assert.doesNotMatch(setLang,/runSearch\(\)/);
  // The family name in the table was a hardcoded English string; it has to come
  // from the translation table like every other word on the desk.
  assert.match(src,/tt\('fs\.'\+r\.state\.family\)/);
  assert.doesNotMatch(src,/<td>\$\{i\+1\} \/ \$\{families\[/);
});

test('height-competing regimes keep the best height variant per lattice cell instead of overwriting it',()=>{
  const plan=searchPlan({...defaults,regime:'competition'});
  assert.equal(plan.heightVariants,2,'competition regime must test two floor counts');
  const alts=rank(plan.list.map(c=>scoreCandidate(c,'contribution')));
  const out=strip(lattice(alts,'box',tt,'en',()=>{}));
  const buttons=[...out.matchAll(/<button class="lattice-cell[^"]*"[^>]*>([^<]*)<\/button>/g)];
  assert.equal(buttons.length,16);
  let multiVariantCells=0;
  buttons.forEach((m,i)=>{
    const taper=[1,.9,.8,.7][(i/4)|0],twist=[0,30,60,90][i%4];
    const matching=alts.filter(a=>a.state.family==='box'&&a.state.taper===taper&&a.state.twist===twist);
    if(matching.length>1)multiVariantCells++;
    const bestOfCell=matching.reduce((b,a)=>a.score>b.score?a:b);
    assert.equal(m[1],compact('en',bestOfCell.metrics.contribution),`cell ${taper}/${twist} was overwritten by the lower-ranked floor variant`);
  });
  assert.ok(multiVariantCells>=12,'box under competition must have multiple feasible height variants per cell');
});

test('the facade objective minimizes skin area rather than maximizing it',()=>{
  const plan=searchPlan(defaults);
  const byFacade=rank(plan.list.map(c=>scoreCandidate(c,'facade')));
  const byContrib=rank(plan.list.map(c=>scoreCandidate(c,'contribution')));
  assert.ok(byFacade[0].metrics.facade<byContrib[0].metrics.facade,'minimizing facade must pick a tighter skin than maximizing contribution');
  const minSkin=Math.min(...byFacade.map(a=>a.metrics.facade));
  assert.ok(Math.abs(byFacade[0].metrics.facade-minSkin)<1e-6,'under yield regime (heightPull=0), top facade candidate must have the smallest facade');
});

test('applying a candidate updates the active study figures and objective changes re-run',()=>{
  const src=readFile();
  const applyFn=src.slice(src.indexOf('function applyCandidate'),src.indexOf('function finishSearch'));
  assert.match(applyFn,/if\(searchRun\)\{exploreFamily=state\.family;renderSearch\(\)\}/);
  assert.match(src,/obj\.onchange=\(\)=>\{state\.objective=obj\.value;if\(searchRun\)runSearch\(\)\}/);
});

test('lattice cells and walk reset button size to their text rather than stretching across 1fr',()=>{
  const css=readFileSync(new URL('../dist/style.css',import.meta.url),'utf8');
  const desks=readFileSync(new URL('../dist/desks.css',import.meta.url),'utf8');
  const latticeRow=/\.lattice-row\{([^}]*)\}/.exec(css);
  assert.ok(latticeRow,'missing .lattice-row rule');
  assert.doesNotMatch(latticeRow[1],/1fr/,'.lattice-row must not stretch 4-char cells across 1fr');
  assert.match(css,/\.lattice\{[^}]*width:max-content/);
  const trioCap=/\.trioFig figcaption\{([^}]*)\}/.exec(css);
  assert.ok(trioCap,'missing .trioFig figcaption rule');
  assert.doesNotMatch(trioCap[1],/min-height/,'.trioFig figcaption must not pad short text with min-height');
  const wkBtn=/\.wk-btn\{([^}]*)\}/.exec(desks);
  assert.ok(wkBtn,'missing .wk-btn rule');
  assert.match(wkBtn[1],/width:fit-content/,'.wk-btn must fit its label instead of stretching across the grid track');
});

function readFile(){
  return readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
}