import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults,families} from '../dist/model.js';
import {windMethodPayload,windMethodSVG,LOCK_BAND,TERRAIN,kr,cr,Iv,qp,vm,projectedWidth,cfOf,cf0Rect,vortexState,windRead,familyComparison,defaultZeta,timeScale,WIND_TEXT,TERRAIN_KEYS,renderWindLab} from '../dist/wind.js';

const near=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<=e,`${a} != ${b}`);

test('roughness factor, turbulence and peak pressure match hand calculation (EN 1991-1-4 Eq. 4.4–4.8)',()=>{
 near(kr(0.05),0.19);                                   // terrain II is the reference
 near(kr(1.0),0.19*Math.pow(20,0.07));                  // 0.2343
 near(kr(1.0),0.2343,1e-4);
 near(cr(10,'II'),0.19*Math.log(200));                  // 1.0067
 near(cr(10,'II'),1.0067,1e-4);
 near(Iv(10,'II'),1/Math.log(200));                     // 0.1887
 near(qp(10,30,'II'),1323.16,0.05);                     // (1+7·0.1887)·½·1.25·30.20² Pa
 near(cr(5,'IV'),cr(10,'IV'));                          // below z_min the value at z_min
 near(cr(100,'IV'),0.2343*Math.log(100),1e-3);
 near(vm(100,30,'IV'),30*cr(100,'IV'));
});

test('force coefficient follows Fig. 7.23 for the rectangle',()=>{
 near(cf0Rect(1),2.1);near(cf0Rect(0.7),2.4);near(cf0Rect(2),1.65);near(cf0Rect(5),1.0);near(cf0Rect(100),0.9);
 assert.equal(cfOf('box',1).basis,'tabulated');
 assert.equal(cfOf('box',1,{normal:false}).basis,'interpolated');
 assert.equal(cfOf('octagon',1).cf,1.3);assert.equal(cfOf('hexagon',1).cf,1.6);
 assert.equal(cfOf('oval',1).basis,'interpolated');assert.equal(cfOf('cross',1).basis,'assumed');
});

test('projected width rotates with the wind',()=>{
 const rect=[[-10,-2],[10,-2],[10,2],[-10,2]];
 near(projectedWidth(rect,0).b,4);near(projectedWidth(rect,0).d,20);
 near(projectedWidth(rect,90).b,20,1e-9);near(projectedWidth(rect,90).d,4,1e-9);
 const a=45*Math.PI/180;near(projectedWidth(rect,45).b,20*Math.sin(a)+4*Math.cos(a),1e-9);
 near(projectedWidth(rect,180).b,4,1e-9);
});

test('base shear scales with v_b squared; moment with it',()=>{
 const a=windRead(defaults,{vb:20,terrain:'III'}),b=windRead(defaults,{vb:40,terrain:'III'});
 near(b.shear/a.shear,4,1e-9);near(b.moment/a.moment,4,1e-9);
 assert.ok(windRead(defaults,{vb:30,terrain:'0'}).shear>windRead(defaults,{vb:30,terrain:'IV'}).shear,'open sea loads more than a city centre');
});

test('lock-in flag follows E.1.2(3): clear below 0.8, lock-in 0.8–1.25, below beyond',()=>{
 assert.equal(vortexState(0.5),'clear');assert.equal(vortexState(0.79),'clear');
 assert.equal(vortexState(0.8),'lockin');assert.equal(vortexState(1),'lockin');assert.equal(vortexState(1.25),'lockin');
 assert.equal(vortexState(1.3),'below');assert.equal(vortexState(NaN),'clear');
 const r=windRead(defaults,{vb:30,terrain:'IV'});
 near(r.ratio,r.fs/r.n1,1e-9);                           // f_s/n1 = v_m/v_crit
 near(r.vCrit,r.bE*r.n1/r.st,1e-9);near(r.n1,46/r.H,1e-12);
 // a slender box in a strong wind passes through lock-in; a squat one does not
 const slim={...defaults,family:'box',span:26,floors:90};
 let found=false;for(let vb=15;vb<=55;vb++)if(windRead(slim,{vb,terrain:'IV'}).state==='lockin')found=true;
 assert.ok(found,'slender tower reaches lock-in somewhere on the slider');
 assert.equal(windRead({...defaults,family:'box',span:60,floors:20},{vb:30,terrain:'IV'}).state,'clear');
});

test('damping raises the Scruton number; TMD adds its stated value',()=>{
 near(defaultZeta('column-grid'),0.10/(2*Math.PI));near(defaultZeta('diagrid'),0.05/(2*Math.PI));
 const a=windRead(defaults,{zeta:0.01}),b=windRead(defaults,{zeta:0.01,tmd:true});
 near(b.zeta,0.03,1e-12);near(b.sc/a.sc,3,1e-9);
});

test('finite outputs for every family × system × terrain × direction edge',()=>{
 for(const family of Object.keys(families))for(const system of ['column-grid','outrigger','diagrid'])for(const terrain of TERRAIN_KEYS)for(const dir of [0,45,90,180])for(const tw of [0,180]){
  const r=windRead({...defaults,family,system,twist:tw,aspect:family==='box'?1.8:1},{vb:55,terrain,dir});
  for(const k of ['vTop','qTop','shear','moment','vCrit','ratio','sc','fs','n1','lambda','cfE','zeta'])assert.ok(Number.isFinite(r[k])&&r[k]>0,`${family}/${system}/${terrain}/${dir}/${tw} ${k}=${r[k]}`);
 }
 const cmp=familyComparison(defaults,{vb:30});
 assert.equal(cmp.length,Object.keys(families).length);
 for(let i=1;i<cmp.length;i++)assert.ok(cmp[i].shear>=cmp[i-1].shear);
});

test('time scale is a round number and the lab never throws without a DOM',()=>{
 const k=timeScale(1.6,440);assert.ok(k>0&&Number.isFinite(k));
 assert.doesNotThrow(()=>renderWindLab({}));
 assert.doesNotThrow(()=>renderWindLab({host:{},state:defaults,lang:'xx',active:false}));
});

test('WIND_TEXT has the same keys in every language',()=>{
 const shape=o=>Object.entries(o).flatMap(([k,v])=>v&&typeof v==='object'?shape(v).map(x=>k+'.'+x):[k]).sort();
 const en=shape(WIND_TEXT.en);
 for(const l of ['th','zh'])assert.deepEqual(shape(WIND_TEXT[l]),en,l);
 for(const l of ['en','th','zh'])for(const f of Object.keys(families))assert.ok(WIND_TEXT[l].fam[f],l+' '+f);
 assert.doesNotMatch(JSON.stringify(WIND_TEXT.th),/ฉัน|ผม|เรา/);
});

test('wind.css keeps the house rules',()=>{
 const css=readFileSync(new URL('../dist/wind.css',import.meta.url),'utf8');
 assert.doesNotMatch(css,/gradient\(|box-shadow|border-radius:\s*[1-9]/);
 const sizes=new Set([...css.matchAll(/font-size:([^;}]+)/g)].map(m=>m[1].trim()));
 assert.ok(sizes.size<=3,[...sizes].join(','));
 const js=readFileSync(new URL('../dist/wind.js',import.meta.url),'utf8');
 assert.doesNotMatch(js,/style="|<style/);
});

/* ── the method, drawn ──────────────────────────────────────────────────────
   The wind lab's method was a sentence: what the code formulas ask the tower
   to carry, and whether its own sway frequency meets the vortices its plan
   sheds. A sentence cannot show a PROFILE, a MODE or a BAND. The sheet does.

   These guards read the emitted sheet, not the source. */
const METHOD_LANGS=['en','th','zh'];
const said=svg=>svg.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const TOWER={...defaults,program:'petronas',floors:48};

test('the method drawing is a sheet, and nothing but numbers reached it',()=>{
 const r=windRead(TOWER,{});
 for(const lang of METHOD_LANGS){
  const svg=windMethodSVG(windMethodPayload(r),{lang});
  assert.equal(typeof svg,'string');
  assert.ok(svg.includes('<svg'),lang+': no svg');
  assert.ok(/viewBox="[-\d. ]+"/.test(svg),lang+': no viewBox — the frame must be sized from its notes');
  assert.doesNotMatch(svg,/NaN|undefined|Infinity/,lang+': a non-number reached the sheet');
  for(const m of svg.matchAll(/="([^"]*)"/g))
   assert.doesNotMatch(m[1],/NaN|undefined/,lang+': "'+m[1]+'" in an attribute');
 }
});

test('the drawing carries the numbers the wind read actually produced',()=>{
 const r=windRead(TOWER,{});
 const text=said(windMethodSVG(windMethodPayload(r),{lang:'en'}));
 // the headline numbers, each in the form the sheet prints it
 assert.ok(text.includes(r.H.toFixed(1)+' m'),'the height is not on the sheet');
 assert.ok(text.includes(r.n1.toFixed(3)+' Hz'),'the first-mode frequency is not on the sheet');
 assert.ok(text.includes((1/r.n1).toFixed(2)+' s'),'the period is not on the sheet');
 assert.ok(text.includes((r.zeta*100).toFixed(1)+' %'),'the damping is not on the sheet');
 assert.ok(text.includes(r.cfE.toFixed(2)),'the force coefficient is not on the sheet');
 assert.ok(text.includes(r.ze.toFixed(1)+' m'),'the equivalent height is not on the sheet');
 assert.ok(text.includes(r.vb.toFixed(1)+' m/s'),'the basic wind speed is not on the sheet');
 assert.ok(text.includes(r.ratio.toFixed(2)),'the frequency ratio is not on the sheet');
 assert.ok(text.includes(r.lambda.toFixed(1)),'the slenderness is not on the sheet');
 // the profile's own numbers: the top of the run and the critical wind
 assert.ok(text.includes(r.vTop.toFixed(1)+' m/s'),'the wind speed at the top is not on the sheet');
 assert.ok(text.includes(r.vCrit.toFixed(1)+' m/s'),'the critical wind speed is not on the sheet');
 // the terrain the profile was computed over
 assert.ok(text.includes(TERRAIN[r.terrain].z0.toFixed(2)+' m'),'the terrain roughness length is not on the sheet');
 assert.ok(text.includes(TERRAIN[r.terrain].zmin.toFixed(1)+' m'),'the terrain minimum height is not on the sheet');
});

test('the lock-in band on the sheet is the band the rule uses',()=>{
 // The band edges are stated once, in LOCK_BAND, and both the rule and the
 // drawing read them. If the drawing grew its own copy of 0.8 and 1.25 the
 // sheet would eventually say something the code no longer believes.
 for(const r of [0.5,0.9,1.1,1.4]){
  assert.equal(vortexState(r), r<LOCK_BAND[0]?'clear':r<=LOCK_BAND[1]?'lockin':'below');
 }
 const svg=windMethodSVG(windMethodPayload(windRead(TOWER,{})),{lang:'en'});
 assert.ok(svg.includes('0.8')&&svg.includes('1.25'),'the lock-in band edges are not on the sheet');
 // and the tower's own ratio is placed on the scale, not asserted in prose
 const p=windMethodPayload(windRead(TOWER,{}));
 assert.ok(said(svg).includes(p.ratio.toFixed(2)),'the tower stands nowhere on the slenderness scale');
});

test('no two notes on the wind drawing overlap, and none is clipped',()=>{
 // The house measure: the face is monospace with a .6 em advance, so a note's
 // width is its length. Two notes printed on one another are not "adjacent" —
 // they are unreadable.
 const ADV=.6,CAP=.75,DESC=.25;
 const widthOf=(s,size)=>[...s].length*size*ADV;
 for(const lang of METHOD_LANGS){
  const svg=windMethodSVG(windMethodPayload(windRead(TOWER,{})),{lang});
  const box=svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  const notes=[...svg.matchAll(/<text x="([-\d.]+)" y="([-\d.]+)"[^>]*font-size="([\d.]+)"[^>]*text-anchor="(\w+)"[^>]*>([^<]*)<\/text>/g)]
   .map(m=>{const size=+m[3],x=+m[1],y=+m[2],anchor=m[4],s=m[5],w=widthOf(s,size);
    // A ROTATED note (a vertical dimension's label) is not a wide box: turned
    // on its side, its length runs down the sheet and its depth is its cap
    // height. Measuring it as if it were horizontal puts a phantom overlap on
    // every vertical dimension on the sheet.
    if(/rotate\(-?\d/.test(m[0])){
     // The same box the layout engine reserves: a label turned on its side
     // runs its length DOWN from its baseline, and its depth is a cap height.
     const down=/rotate\(-90/.test(m[0]);
     return {s,size,x,y,anchor,rot:true,x0:x-w,x1:x,top:y-CAP*size,bot:down?y+w:y+DESC*size};
    }
    const x0=anchor==='end'?x-w:anchor==='middle'?x-w/2:x;
    return {s,size,x,y,anchor,rot:false,x0,x1:x0+w,top:y-CAP*size,bot:y+DESC*size};});
  assert.ok(notes.length>8,lang+': the sheet carries almost no annotation');
  for(let i=0;i<notes.length;i++)for(let j=i+1;j<notes.length;j++){
   const a=notes[i],b=notes[j];
   if(a.x1<=b.x0||b.x1<=a.x0)continue;
   if(a.bot<=b.top||b.bot<=a.top)continue;
   assert.fail(lang+': "'+a.s+'" and "'+b.s+'" are printed on one another');
  }
  for(const n of notes){
   assert.ok(n.x0>=box[0]-0.5,lang+': "'+n.s+'" runs off the left of the sheet');
   assert.ok(n.x1<=box[0]+box[2]+0.5,lang+': "'+n.s+'" runs off the right of the sheet');
  }
  /* And the same check with the width a CJK glyph ACTUALLY has: one em, not
     the .6 em the layout engine assumes for its monospace face. A Chinese
     label is a third wider than the box reserved for it, and a label that
     runs past the frame is a label the browser clips in silence. The Thai
     sheet clipped its terrain note this way, and nothing said so. */
  const adv=s=>[...s].reduce((a,c)=>a+(/[\u3400-\u9fff\uf900-\ufaff]/.test(c)?1:0.6),0);
  for(const n of notes){
   const w=adv(n.s)*n.size;
   if(n.rot){
    // A label on its side: its LENGTH is what a CJK glyph widens, and the
    // length runs down the sheet, not across it.
    assert.ok(n.x0>=box[0]-0.5,lang+': "'+n.s+'" runs off the left of the frame');
    assert.ok(n.x1<=box[0]+box[2]+0.5,lang+': "'+n.s+'" runs off the right of the frame');
    assert.ok(n.y+w<=box[1]+box[3]+0.5,lang+': "'+n.s+'" runs off the bottom of the frame');
    continue;
   }
   const x=n.anchor==='middle'?n.x-w/2:n.anchor==='end'?n.x-w:n.x;
   assert.ok(x>=box[0]-0.5,lang+': "'+n.s+'" runs off the left of the frame');
   assert.ok(x+w<=box[0]+box[2]+0.5,lang+': "'+n.s+'" runs off the right of the frame');
  }
 }
});

test('the wind method is a caption now, and the sheet carries it',()=>{
 for(const lang of METHOD_LANGS){
  const lede=WIND_TEXT[lang].lede;
  assert.ok(lede.length<=140,lang+': the method lede is still a paragraph ('+lede.length+')');
  assert.ok(lede.length>=20,lang+': the caption says nothing');
 }
 // the drawing is on the page, not the paragraph
 const js=readFileSync(new URL('../dist/wind.js',import.meta.url),'utf8');
 assert.ok(js.includes('windMethodSVG('),'the sheet is never drawn');
 assert.ok(/root\.append\([^)]*methodFig/.test(js),'the sheet is never put on the page');
});

test('the wind method drawing is translated, and carries no English on a Thai or Chinese sheet',()=>{
 // Every WORD on the sheet comes out of WIND_TEXT[lang]. If the sheet is
 // built from literal English, the Thai and Chinese readers get an English
 // drawing, which is a different instrument for them.
 for(const lang of ['th','zh']){
  const svg=windMethodSVG(windMethodPayload(windRead(TOWER,{})),{lang});
  const text=said(svg);
  // the English strings of the method dict must not appear
  for(const v of Object.values(WIND_TEXT.en.m))
   if(typeof v==='string'&&/[A-Za-z]{4,}/.test(v)&&!/\{|\}/.test(v))
    assert.ok(!text.includes(v),lang+': the sheet still says "'+v+'"');
 }
 // and every language draws a sheet of the same size and weight
 const sizes=METHOD_LANGS.map(l=>windMethodSVG(windMethodPayload(windRead(TOWER,{})),{lang:l}).length);
 assert.ok(Math.max(...sizes)-Math.min(...sizes)<Math.max(...sizes)*0.5,'one language drew a very different sheet');
});
