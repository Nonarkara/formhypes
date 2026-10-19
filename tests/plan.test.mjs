/* The plan view exists because the orbit could not show the floor: at a 599 m
   skyline the ground plane is edge-on and the street grid is a sliver, and the
   neighbours' walls plus a height-scaled contact shadow were painting over
   what little showed.

   These guards cover the two halves of that claim that a screenshot cannot:
   the reach geometry, checked against hand calculations rather than against
   its own source, and the order things are drawn in, which is the reason the
   ground was visible at all. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {convexHull,sweptHull,reachSteps,reachLabelled,contactOffset} from '../dist/reach.js';
import {stackHeight,defaults} from '../dist/model.js';
import {crownOf} from '../dist/crowns.js';

const dist=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');

/* drawPlan's body. Comments stripped first, for the reason Argon's guard did
   not: a guard that reads prose trips on the comment written to explain the
   bug it guards, and then keeps it green forever. */
const strip=(t)=>t.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/^\s*\/\/.*$/gm,' ');
function drawPlanSheet(){
 const app=strip(dist('app.js'));
 const a=app.indexOf('const REACH=[');
 assert.ok(a>0,'the plan block is missing from app.js');
 const b=app.indexOf('if(city&&planView)',a);
 assert.ok(b>a,'the end of drawPlan could not be located');
 return app.slice(a,b);
}

const SQUARE=[[-24,-24],[24,-24],[24,24],[-24,24]];

test('a convex hull keeps corners and drops everything that is not one',()=>{
 // A pentagon with a point sitting just outside one edge's line and another
 // sitting well inside it. Both must go; the first is not on the hull, the
 // second never was. A pop condition that is merely wrong in sign keeps the
 // first and drops a real corner, and only the vertex count and the set of
 // coordinates can tell those two apart.
 const P=[[0,0],[4,-1],[8,0],[6,5],[2,5],[4,2]];
 const h=convexHull(P);
 assert.equal(h.length,5,'the interior point is dropped and the shallow one with it');
 assert.deepEqual(h.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]),
   [[0,0],[2,5],[4,-1],[6,5],[8,0]].sort((a,b)=>a[0]-b[0]||a[1]-b[1]));
 // Duplicates and collinear points must not survive as vertices.
 const dup=[[0,0],[5,0],[10,0],[10,0],[5,5],[0,5]];
 assert.equal(convexHull(dup).length,4,'a duplicate and a collinear mid-point are not corners');
});

test('the swept shadow of a square grows downwind only',()=>{
 // Light due east: dx=1, dy=0. The shadow reaches from -24 to +34 in x and is
 // unchanged in y. An assertion expecting it to grow both ways would be
 // describing a symmetric shadow, which is not a thing the sun casts.
 const h=sweptHull(SQUARE,10,1,0);
 assert.deepEqual(h.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]),
   [[-24,-24],[-24,24],[34,-24],[34,24]].sort((a,b)=>a[0]-b[0]||a[1]-b[1]));
 const back=sweptHull(SQUARE,10,-1,0);
 assert.equal(Math.min(...back.map(p=>p[0])),-34,'the west-going shadow reaches -34');
 assert.equal(Math.max(...back.map(p=>p[0])),24,'the east edge is upwind and does not move');
 // A diagonal light grows both axes by the offset it actually carries.
 const d=sweptHull(SQUARE,10,Math.SQRT1_2,Math.SQRT1_2);
 assert.ok(Math.abs(Math.max(...d.map(p=>p[0]))-Math.max(...d.map(p=>p[1])))<1e-9,
   'a diagonal light grows x and y equally');
});

test('a sweep of zero distance is the footprint itself',()=>{
 assert.deepEqual(convexHull(SQUARE),[[-24,-24],[24,-24],[24,24],[-24,24]]);
 assert.deepEqual(sweptHull(SQUARE,0,1,0),[[-24,-24],[24,-24],[24,24],[-24,24]]);
 assert.equal(sweptHull([],10,1,0).length,0,'an empty footprint sweeps to nothing');
});

test('the contour ladder is exact, and its last rung is the height itself',()=>{
 // The bug this guards: a 214.4 m tower drew its outer contour at 214.4 m and
 // the label printed 250 m. A dimension that disagrees with the line it
 // measures is the oldest way a drawing starts lying. Exact arrays, not
 // inequalities, because an inequality passed on the wrong ladder too.
 assert.deepEqual(reachSteps(214.4),[50,100,150,200,214.4]);
 assert.deepEqual(reachSteps(40),[40],'a short tower gets no invented steps below it');
 assert.deepEqual(reachSteps(50),[50]);
 assert.deepEqual(reachSteps(50.5),[50,50.5]);
 assert.deepEqual(reachSteps(260),[50,100,150,200,250,260]);
 assert.deepEqual(reachSteps(412.9),[50,100,150,200,250,300,350,400,412.9]);
 assert.deepEqual(reachSteps(0),[],'a zero tower lays no shadow');
 for(const ext of [214.4,49.9,50,50.1,199,200,201,314.7,600]){
  const s=reachSteps(ext);
  assert.equal(s.at(-1),ext,`ext ${ext}: the outer contour is the height itself`);
  assert.deepEqual(reachSteps(ext,25).filter(v=>v%50===0),reachSteps(ext).filter(v=>v%50===0),
   `ext ${ext}: a finer step still contains the same 50 m rungs`);
 }
});

test('exactly these contours are lettered, and no two land together',()=>{
 assert.deepEqual(reachSteps(214.4).filter(o=>reachLabelled(o,214.4)),[100,214.4]);
 assert.deepEqual(reachSteps(260).filter(o=>reachLabelled(o,260)),[100,200,260]);
 assert.deepEqual(reachSteps(412.9).filter(o=>reachLabelled(o,412.9)),[100,200,300,412.9]);
 assert.deepEqual(reachSteps(600).filter(o=>reachLabelled(o,600)),[100,200,300,400,500,600]);
 assert.deepEqual(reachSteps(137).filter(o=>reachLabelled(o,137)),[137],
   'at 137 m the outer contour is the only one far enough from its neighbour');
 for(const ext of [40,80,137,214.4,260,412.9,600]){
  const lit=reachSteps(ext).filter(o=>reachLabelled(o,ext));
  for(let i=1;i<lit.length;i++)
   assert.ok(lit[i]-lit[i-1]>=50,`ext ${ext}: ${lit[i-1]} and ${lit[i]} would overprint`);
 }
});

test('a contact shadow is bounded by its own footprint and tracks height below that',()=>{
 // Numbers, not source text. The first version of this guard was a regex over
 // the offset expression, which any line mentioning a half-width satisfied —
 // a guard that certifies the defect it was written for.
 assert.equal(contactOffset(599,40,35),20,'a 599 m tower over a 40 m footprint is capped at half its width');
 assert.equal(contactOffset(120,60,60),19.2,'below the cap the height still sets it');
 assert.equal(contactOffset(300,60,60),30,'at 300 m the footprint cap takes over');
 assert.equal(contactOffset(40,400,400),6.4,'a wide low massing keeps a height-scaled contact');
 assert.equal(contactOffset(12,30,18),1.92,'a shed gets a small contact');
 assert.equal(contactOffset(8,300,300),1.28,'a flat block is nearly flush with its own base');
 for(const [h,w,d] of [[599,40,35],[599,180,120],[600,20,20],[30,25,25]])
  assert.ok(contactOffset(h,w,d)<=Math.max(w,d)/2+1e-9,'the shadow never outruns the building');
});

test('the reach is measured against the tower the model actually built',()=>{
 const ext=stackHeight({...defaults})+crownOf(defaults).h;
 assert.ok(ext>50,`the default tower is ${ext} m and should cast a legible reach`);
 assert.equal(reachSteps(ext).at(-1),ext);
 const taller=stackHeight({...defaults,floors:120})+crownOf(defaults).h;
 assert.ok(taller>ext);
 assert.ok(reachSteps(taller).at(-1)>reachSteps(ext).at(-1),
   'a taller model must reach further across the same ground');
});

test('the ground is drawn inside the plate clip, before anything that can hide it',()=>{
 const b=drawPlanSheet();
 // Call sites, not definitions: indexOf('drawReach()') finds the word inside
 // `function drawReach(){` first, which silently moved the reach stage ahead
 // of everything and made this guard fail for a reason that had nothing to do
 // with the drawing.
 const body=b.slice(b.indexOf('function drawPlanSheet(){'));
 const iSave=body.indexOf('ctx.save()'),iClip=body.indexOf('ctx.clip()'),iGround=body.indexOf('drawGround()'),iRestore=body.indexOf('ctx.restore()');
 const iCity=body.indexOf('planTone('),iReach=body.indexOf('drawReach();');
 for(const [i,n] of [[iSave,'save'],[iClip,'clip'],[iGround,'ground'],[iRestore,'restore'],[iCity,'context'],[iReach,'reach']])
  assert.ok(i>=0,`drawPlanSheet is missing its ${n} stage`);
 // The clip has to close again before the first context footprint, or the
 // footprints are clipped to the plate too and the map loses its edge.
 assert.ok(iSave<iClip&&iClip<iGround&&iGround<iRestore,'the ground is drawn inside save/clip/restore');
 assert.ok(iRestore<iCity,'the clip is released before the context buildings');
 assert.ok(iCity<iReach,'the reach is laid over the footprints it falls on');
});

test('the plan never paints a wall, a roof or a contact shadow',()=>{
 // Those three are what made the floor a void. If they come back, the view is
 // no longer the thing that fixed it.
 const b=drawPlanSheet();
 for(const t of ['drawCity(','roofTone(','WALL_MID','SHADOW','hatch'])
  assert.ok(!b.includes(t),`drawPlanSheet must not use ${t}`);
});


test('the printed figure is the offset the contour was actually drawn at',()=>{
 // One artefact, one value. The contour is filled and stroked from `d`, so the
 // text has to come from the same `d` — and the first version of this printed
 // ceil(d/50)*50, which put 250 m on a line drawn at 214.4 m.
 const b=drawPlanSheet();
 const loop=b.slice(b.indexOf('const steps=reachSteps(ext);'));
 const iGeom=loop.indexOf('band(steps[k])');
 const iText=loop.search(/fillText\([^)]*\)/);
 assert.ok(iGeom>=0&&iText>=0,'the reach loop no longer draws and labels in one place');
 const between=loop.slice(iGeom,iText);
 assert.ok(!/50\)|100\)|200\)/.test(between),'the label is built from a rounded multiple, not the drawn offset');
 assert.match(b,/fillText\(Math\.round\(d\)\+' m'/,'the figure printed is not the offset swept');
});

test('the plan pans on drag instead of orbiting',()=>{
 const app=strip(dist('app.js'));
 const i=app.indexOf("canvas.onpointermove");
 const b=app.slice(i,app.indexOf('canvas.onpointerup',i));
 assert.ok(/view==='plan'\)\{panX\+=dx;panY\+=dy\}/.test(b),
  'dragging the plan orbits a top-down sheet, which has no meaning');
 assert.ok(/yaw\+=dx\*/.test(b),'the orbit must still orbit when it is the orbit');
 const k=app.indexOf('canvas.onkeydown');
 const kb=app.slice(k,app.indexOf("canvas.onkeydown")+700);
 assert.ok(/view==='plan'&&e\.key\.startsWith\('Arrow'\)/.test(kb),'arrow keys do not pan the plan');
 assert.ok(/if\(e\.key==='ArrowUp'\)panY-=k/.test(kb),'there is no way to pan north');
});

test('the scale bar states a real distance and stays on the sheet',()=>{
 const b=drawPlanSheet();
 const i=b.indexOf('function drawScaleBar');
 assert.ok(i>0,'the plan has no scale bar, so nothing on it can be measured');
 const sb=b.slice(i,b.indexOf('function drawNorth',i));
 assert.match(sb,/for\(const q of\[10,20,50,100,200,500,1000\]\)/,'the bar does not choose a round distance');
 assert.ok(/x\+px/.test(sb)&&/fillText\(m\+' m'/.test(sb),'the bar is not labelled with its own length');
 assert.ok(/Math\.min\(origin\[0\],/.test(sb),'a long bar walks off the right edge of the canvas');
});

test('north is drawn where the projection puts it',()=>{
 const b=drawPlanSheet();
 const i=b.indexOf('function drawNorth');
 const nb=b.slice(i,b.indexOf('function drawPlanSheet',i));
 assert.ok(nb.length>0);
 // The plan projection ignores yaw entirely, so north is straight up. An
 // arrow drawn below the bar would state something the projection does not do.
 assert.ok(/y=Math\.max\(30,origin\[1\]-34\)/.test(nb),'the north arrow is not above the scale bar');
 assert.match(nb,/ctx\.moveTo\(x,y\+14\);ctx\.lineTo\(x,y\)/,'the north arrow does not point up the sheet');
 // And the projection really does drop the rotation.
 const app=strip(dist('app.js'));
 assert.match(app,/if\(planView\)return\[W\*\.5\+x\*scale\+panX,planCY-y\*scale\+panY,z\]/,
  'the plan is no longer a true top-down orthographic');
});


test('the plan is fitted to the harvested radius, not to a constant',()=>{
 const app=strip(dist('app.js'));
 const i=app.indexOf('const planScale=');
 assert.ok(i>0,'the plan has no scale of its own');
 const b=app.slice(i,app.indexOf('const scale=',i));
 assert.match(b,/city\.radius/,'the plan scale ignores how much ground was harvested');
 assert.match(b,/\(W-90\)\/\(city\.radius\*([\d.]+)\)/,'the width fit does not use the harvested radius');
 assert.match(b,/fieldH\/\(city\.radius\*([\d.]+)\)/,'the height fit does not use the harvested radius');
 // Both axes must be constrained, or a wide city overflows the sheet sideways.
 assert.match(b,/Math\.min\([\s\S]{0,120},/,'the plan takes only one axis into account');
 // And it must still follow the zoom the +/- buttons drive.
 assert.match(b,/\*zoom\b/,'the plan ignores the zoom control');
});

test('every string the plan prints exists in all three languages',()=>{
 const i=dist('i18n.js');
 const keys=[...new Set([...drawPlanSheet().matchAll(/tt\('([^']+)'\)/g)].map(m=>m[1]))];
 assert.ok(keys.length>=2,`expected the plan to print strings, found ${keys.length}`);
 for(const k of keys)for(const l of ['en','th','zh']){
  const m=new RegExp(`t\\.${l}[\\s\\S]{0,3000}?"${k.replace('.','\\.')}":"([^"]+)"`).exec(i);
  assert.ok(m,`${k} is missing from ${l}`);
  assert.notEqual(m[1],k,`${k} falls back to its own key in ${l}`);
  assert.notEqual(m[1],'',`${k} is empty in ${l}`);
 }
});


test('the legend falls back to a note that is genuinely shorter',()=>{
 // The note is the longest string on the sheet and the one most likely to be
 // clipped by the canvas edge, so a short form exists for it. The first version
 // of this guard compared the two strings inside i18n.js — which says nothing
 // about which of them the drawing actually reaches for. A mutation that points
 // the drawing at the LONG key left that guard green, because i18n.js never
 // changed. The artefact under test is the choice the drawing makes.
 const b=drawPlanSheet();
 const m=/\?note:tt\('([^']+)'\)/.exec(b);
 assert.ok(m,'the legend does not fall back to a shorter note at all');
 const fallback=m[1];
 // It must not be the legend's own heading. A fallback that is merely SHORT is
 // not enough: pointing the note at "Tower shadow on the ground" prints the
 // heading twice and says nothing, and it sailed through a pure length check
 // because the heading happens to be shorter than the note.
 assert.notEqual(fallback,'v.reach','the legend falls back to its own heading, not to a note');
 const i=dist('i18n.js');
 const grab=(l,k)=>new RegExp(`t\\.${l}[\\s\\S]{0,3000}?"${k}":"([^"]*)"`).exec(i)?.[1];
 for(const l of ['en','th','zh']){
  const long=grab(l,'v.reachNote'),short=grab(l,fallback);
  assert.ok(long&&short,`the reach note pair is missing from ${l}`);
  assert.ok(short.length<long.length,
   `the drawing falls back to ${fallback}, which is not shorter than v.reachNote in ${l}, so the clipping the fallback exists to prevent comes straight back`);
 }
});


test('everything the plan draws with is actually imported',()=>{
 // The whole node suite passed while the browser threw ReferenceError:
 // contactOffset was called in drawCity, the import silently failed to pick it
 // up because the line had been re-stamped with a ?v= hash, and every test
 // imported reach.js directly and so never saw app.js fail to load. Nothing in
 // node could have caught it. This at least pins the import list against the
 // names the file actually calls, in both directions.
 const app=strip(dist('app.js'));
 const m=/import\s*\{([^}]*)\}\s*from\s*'\.\/reach\.js/.exec(app);
 assert.ok(m,'app.js does not import reach.js at all');
 const names=m[1].split(',').map(s=>s.trim()).filter(Boolean);
 for(const n of ['sweptHull','reachSteps','reachLabelled','contactOffset'])
  assert.ok(names.includes(n),`${n} is called in app.js but not imported from reach.js`);
 for(const n of names)
  assert.ok((app.match(new RegExp('\\b'+n+'\\b','g'))||[]).length>1,
   `${n} is imported from reach.js and never used`);
 // The module must also be inside the list release-id stamps INTO app.js, or
 // app.js's own content hash never moves when the sweep changes.
 const rel=dist('../scripts/release-id.mjs');
 const inApp=/const IN_APP\s*=\s*\[([\s\S]*?)\]/.exec(rel);
 assert.ok(inApp,'release-id.mjs has no IN_APP list');
 assert.ok(inApp[1].includes("'./reach.js'"),
  'reach.js is not in IN_APP, so app.js ships a stale pin for it');
 const shared=/const SHARED\s*=\s*\[([\s\S]*?)\]/.exec(rel);
 assert.ok(shared[1].includes("'reach.js'"),
  'reach.js is not hashed by release-id.mjs, so a change to it does not move any stamp');
});

test('the view foot names the gesture the sheet actually responds to',()=>{
 // Dragging a plan pans and orbiting it is meaningless, so a foot that still
 // says "orbit" is telling the reader to do something that does nothing. The
 // same failure as printing 250 m on a line drawn at 214 m.
 const i=dist('i18n.js');
 // Keys live inside three separate `const en={…}` objects, thousands of lines
 // long, and only some of them are ever re-stated in the `Object.assign(t.en,…)`
 // tail. Anchoring the lookup on `t.<lang>` therefore finds half the file and
 // reports perfectly good strings as missing — so each language is sliced out
 // of its own block instead.
 const langBlock=(l)=>{
  const start=i.indexOf('const '+l+'={');
  assert.ok(start>0,`i18n.js has no ${l} block`);
  const rest=i.slice(start+8);
  const next=/^const (en|th|zh)=\{/m.exec(rest.slice(1));
  return next?rest.slice(1,next.index+1):rest;
 };
 // Both quote styles are in use in this file — the view-foot block is
 // single-quoted and the view-tool block is not — so the lookup accepts either.
 const grab=(l,k)=>{
  const m=new RegExp(`["']${k.replace('.','\\.')}["']\\s*:\\s*["']([^"']*)["']`).exec(langBlock(l));
  return m&&m[1];
 };
 for(const l of ['en','th','zh']){
  assert.ok(grab(l,'v.pan'),`v.pan is missing from ${l}`);
  assert.ok(grab(l,'v.pan').length<grab(l,'v.drag').length+40,`v.pan in ${l} is not a gesture hint`);
  assert.notEqual(grab(l,'v.pan'),grab(l,'v.drag'),`v.pan is a copy of v.drag in ${l}`);
 }
 const app=strip(dist('app.js'));
 assert.match(app,/syncDragHint\(\)/,'the view foot hint is never resynchronised');
 assert.match(app,/tt\(view==='plan'\?'v\.pan':'v\.drag'\)/,
  'the foot hint does not follow the view');
 // And it must be restored on the way back, or the orbit inherits the plan text.
 assert.ok((app.match(/syncDragHint\(\)/g)||[]).length>=3,
  'the hint is set on entering the plan but never on leaving it');
});

test('the plan button exists, is translated in all three languages, and is not Latin-fallback',()=>{
 const html=dist('index.html');
 assert.match(html,/id="planView"/,'the plan button is missing from the sheet');
 const i=dist('i18n.js');
 for(const lang of ['en','th','zh']){
  const m=new RegExp(`t\\.${lang}[\\s\\S]{0,2000}?"v\\.plan":"([^"]+)"`).exec(i);
  assert.ok(m,`v.plan is missing from ${lang}`);
  assert.notEqual(m[1],'');
  assert.ok(m[1].length<=6,`v.plan in ${lang} is a phrase, not a button: ${m[1]}`);
 }
 // No CJK may leak into the Thai or English tables, and no Latin word may
 // carry the Chinese one.
 const grab=(l)=>new RegExp(`t\\.${l}[\\s\\S]{0,2000}?"v\\.plan":"([^"]+)"`).exec(i)[1];
 assert.ok(!/[\u4e00-\u9fff]/.test(grab('th')),'Thai plan label contains CJK');
 assert.ok(!/[A-Za-z]/.test(grab('zh')),'Chinese plan label fell back to Latin');
 assert.ok(!/[\u4e00-\u9fff]/.test(grab('en')),'English plan label contains CJK');
});

test('the plan is reachable and the orbit is not stacked on top of it',()=>{
 const app=dist('app.js');
 assert.match(app,/\$?\('planView'\)\.onclick/,'the plan button is wired to nothing');
 assert.match(app,/view=view==='plan'\?'orbit':'plan'/);
 // Plan and Neighbourhood answer different questions; stacking them produced a
 // sheet that was neither.
 assert.match(app,/if\(neighbourhood&&view==='plan'\)\{view='orbit'/);
 const toggle=app.slice(app.indexOf("$('planView').onclick"),app.indexOf("$('cityView').onclick"));
 assert.ok(/panX=0/.test(toggle)&&/panY=0/.test(toggle),'entering the plan must clear the pan');
});

test('a contact shadow may not exceed the building casting it',()=>{
 // Checked as numbers, not as source text. A regex over the offset expression
 // pins the shape of a line rather than the rule it carries, and the first
 // version of this guard was satisfied by any code that merely mentioned a
 // half-width — which is exactly how a guard ends up certifying the defect.
 for(const [h,w,d] of [[599,40,35],[599,180,120],[120,60,60],[12,30,18],[600,20,20]]){
  assert.ok(contactOffset(h,w,d)<=Math.max(w,d)/2+1e-9,
    `a ${h} m massing over a ${w}x${d} m footprint gets an offset longer than its own footprint`);
 }
 // And it still tracks height for a small building, so the shadow is not
 // simply pinned at zero.
 assert.ok(contactOffset(40,400,400)>0,'a wide low massing keeps a visible contact shadow');
});