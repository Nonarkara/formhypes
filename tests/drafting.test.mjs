import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {detailSVG,DETAIL_DRAWS,DETAILS,DETAIL_KEYS} from '../dist/details.js';
import {layout,pendingNotes,DEFS,matOf,cut,beyond,dim,brkV,sheet,txt} from '../dist/drafting.js';

/* The complaint these guards exist for: "it looks like a stickman drawing,
   which doesn't tell us anything."

   A stickman drawing is not ugly. It is UNINFORMATIVE, and it is uninforming in
   ways that are all measurable: no poché, so nothing says what anything is made
   of; annotation that runs off the sheet, so the reader is left guessing at half
   a word; two labels printed on each other, so neither can be read; a dimension
   with an arrowhead on it, so it reads as a CAD tic rather than a measurement.

   Every guard below therefore measures the EMITTED SVG, not the source. A guard
   that greps for an identifier passes the moment the identifier appears while
   the drawing is still a stickman. */

/* ── the measuring stick ───────────────────────────────────────────────────
   IBM Plex Mono is monospace with a .6 em advance, so a note's width is its
   length — exact, and computable without a DOM. The box is the cap height above
   the baseline and the descenders below it. */
const ADV=.6, CAP=.75, DESC=.25;
const widthOf=(s,size)=>[...s].length*size*ADV;

function readSheet(key){
 const svg=detailSVG(key);
 const vb=svg.match(/viewBox="([^"]+)"/);
 assert.ok(vb,`${key}: no viewBox — the frame must be sized from its notes`);
 const box=vb[1].split(/\s+/).map(Number);
 assert.equal(box.length,4,`${key}: viewBox must have four numbers`);
 const notes=[...svg.matchAll(
  /<text x="([-\d.]+)" y="([-\d.]+)"[^>]*font-size="([\d.]+)"[^>]*text-anchor="(\w+)"[^>]*>([^<]*)<\/text>/g)]
  .map(m=>{
   const size=+m[3],x=+m[1],y=+m[2],anchor=m[4],s=m[5],w=widthOf(s,size);
   // A label turned on its side: its length runs DOWN from its own baseline
   // and its depth is a cap height. Measured flat, it is a short wide box
   // sitting above the pivot, and the guard looks at ground the ink never
   // occupies — while the ink, running down the sheet, goes unseen. This is
   // the same box the layout engine reserves for it.
   if(/rotate\(-?\d/.test(m[0])){
    const down=/rotate\(-90/.test(m[0]);
    return {s,size,x0:x-CAP*size,x1:x+DESC*size,top:y,bot:down?y+w:y+DESC*size};
   }
   const x0=anchor==='end'?x-w:anchor==='middle'?x-w/2:x;
   return {s,size,x0,x1:x0+w,top:y-CAP*size,bot:y+DESC*size};
  });
 return {svg,box,notes,key};
}
const SHEETS=DETAIL_DRAWS.map(readSheet);

test('every detail renders, and no detail leaves a note orphaned',()=>{
 assert.equal(DETAIL_DRAWS.length,12,'the Assembly panel must still offer twelve details');
 // A leader registers and sheet() draws it. A note registered and never drawn
 // is a silent orphan, and the next drawing inherits it.
 assert.equal(pendingNotes(),0,
  'notes registered but never drawn — a drawing threw before its sheet() ran');
});

test('no two notes on a sheet overlap',()=>{
 const bad=[];
 for(const {key,notes} of SHEETS){
  for(let i=0;i<notes.length;i++)for(let j=i+1;j<notes.length;j++){
   const a=notes[i],b=notes[j];
   if(a.x1<=b.x0||b.x1<=a.x0) continue;
   if(a.bot<=b.top||b.bot<=a.top) continue;
   bad.push(`${key}: "${a.s}" printed on "${b.s}"`);
  }
 }
 assert.deepEqual(bad,[],'annotation that cannot be read:\n'+bad.join('\n'));
});

test('no note falls outside its own frame — an SVG clip is silent',()=>{
 const bad=[];
 for(const {key,box,notes} of SHEETS){
  const left=box[0],right=box[0]+box[2],top=box[1],bot=box[1]+box[3];
  for(const n of notes){
   if(n.x0<left-0.5) bad.push(`${key}: "${n.s}" cut off at the left by ${(left-n.x0).toFixed(1)} units`);
   if(n.x1>right+0.5) bad.push(`${key}: "${n.s}" cut off at the right by ${(n.x1-right).toFixed(1)} units`);
   if(n.top<top-0.5||n.bot>bot+0.5) bad.push(`${key}: "${n.s}" cut off vertically`);
  }
 }
 assert.deepEqual(bad,[],'text the browser silently clipped:\n'+bad.join('\n'));
});

test('no note is set in anything smaller than a readable size',()=>{
 for(const {key,notes} of SHEETS)
  for(const n of notes)
   assert.ok(n.size>=5.5,`${key}: "${n.s}" set at ${n.size}px — below the floor`);
});

test('every drawing has poché: cut material is filled, by material',()=>{
 for(const {key,svg} of SHEETS){
  assert.ok(svg.includes('<defs>'),`${key}: no defs, so no hatch can exist`);
  const hatched=(svg.match(/fill="url\(#d-/g)||[]).length;
  const solid=(svg.match(/fill="var\(--ink\)"/g)||[]).length;
  assert.ok(hatched+solid>0,
   `${key}: nothing is filled — a section with no poché says nothing about material`);
 }
});

test('material is distinguished by hatch, not by colour alone',()=>{
 const fills=new Set();
 for(const m of ['wool','conc','earth','metal','glass','beyond','void'])
  fills.add(matOf(m).cut);
 assert.ok(new Set([matOf('wool').cut,matOf('conc').cut,matOf('earth').cut]).size===3,
  'insulation, concrete and earth must not share one fill');
 assert.equal(matOf('glass').cut,'none',
  'glass is beyond the cut plane — filling it would lie about what glass looks like');
 assert.equal(matOf('void').cut,'none','a void is the absence of material and is not drawn');
});

test('anything beyond the cut plane is outline only, never filled',()=>{
 assert.equal(beyond('M0,0 H10 V10 H0 Z'),'<path d="M0,0 H10 V10 H0 Z" fill="none" stroke="var(--faint)" stroke-width="0.55"/>');
 const {svg}=readSheet('cavity');
 for(const m of svg.matchAll(/<path d="([^"]+)" fill="([^"]*)"/g))
  if(m[2]==='var(--faint)') assert.fail('a beyond body was given a visible fill');
});

test('dimensions terminate in slashes, never arrowheads',()=>{
 const d=dim(0,0,40,0,'70');
 assert.ok(d.includes('l4,-4'),'the terminator must be the architectural slash');
 assert.ok(!/<(polygon|marker)/.test(d),'an arrowhead belongs to a flow arrow, not a dimension');
 for(const {key,svg} of SHEETS)
  assert.ok(!/<marker/.test(svg),`${key}: a marker on a dimension is a CAD tic, not a drawing standard`);
});

test('a dimension label is a barrier, not a note that wanders',()=>{
 // The label is registered so other notes are laid out AROUND it. It must never
 // itself be pushed: a dimension that slides off its line stops measuring.
 const d=dim(0,100,40,100,'70');
 const label=d.match(/text-anchor="middle"[^>]*>70</);
 assert.ok(label,'the dimension must still draw its own label');
 assert.equal((d.match(/>70</g)||[]).length,1,'the label must be drawn exactly once');
 // And it must REACH the layout pass. A dimension that draws itself but never
 // registers is a dimension no other note knows to avoid, which is precisely
 // the collision it was registered to prevent.
 const before=pendingNotes();
 dim(0,100,40,100,'70');
 assert.equal(pendingNotes(),before+1,
  'the dimension label never reached the layout — notes will be laid straight over it');
});

test('the frame grows for a note that needs a margin, and only for that note',()=>{
 const tight=layout([
  {k:'leader',x:120,y:60,tx:126,ty:60,text:'post',o:{}},
  {k:'leader',x:126,y:80,tx:132,ty:90,text:'taper',o:{}}]);
 assert.equal(tight.needL,0,'a note inside the field must not widen the sheet');
 assert.equal(tight.needR,0,'a note inside the field must not widen the sheet');
 const wide=layout([
  {k:'leader',x:120,y:60,tx:240,ty:60,text:'a note that runs off the right edge',o:{}}]);
 assert.ok(wide.needR>0,'a note past the field must widen the frame instead of being clipped');
 assert.equal(wide.needL,0,'only the side that overflowed may grow');
 const left=layout([
  {k:'leader',x:120,y:60,tx:2,ty:60,text:'a note that runs off the left edge',o:{}}]);
 assert.ok(left.needL>0,'a note past the left edge must widen the frame instead of being clipped');
});

test('a long note is wrapped at a word, never truncated',()=>{
 // A truncated note is a lie about what the detail contains: it removes the
 // words that say which element it names.
 const note='waterproofing already continuous across the whole upstand';
 const {out}=layout([{k:'leader',x:120,y:60,tx:2,ty:60,text:note,o:{}}]);
 const joined=out[0].lines.join(' ');
 assert.equal(joined.replace(/\s+/g,' '),note,
  'every word of the note must survive the wrap');
 assert.ok(out[0].lines.length>1,'this note must actually have wrapped');
});

test('two notes given the same height are separated, not printed on each other',()=>{
 const {out}=layout([
  {k:'leader',x:40,y:60,tx:4,ty:60,text:'alpha note',o:{}},
  {k:'leader',x:45,y:62,tx:4,ty:61,text:'beta note',o:{}}]);
 assert.notEqual(out[0].ty,out[1].ty,
  'two notes sharing a height and an x range must be staggered apart');
 const gap=Math.abs(out[0].ty-out[1].ty);
 assert.ok(gap>=8,`staggered only ${gap} units apart — that is not a clearance`);
});

test('a note is never stacked on a dimension label',()=>{
 // The invariant, not the layout: the dimension stays where it is drawn and
 // everything else goes around it.
 const {out}=layout([
  {k:'txt',x:100,y:115,tx:100,ty:115,text:'a long note in the dimension band',o:{}},
  {k:'txt',x:130,y:117,tx:130,ty:117,text:'1000',o:{fixed:true,obstacle:true,size:6,anchor:'middle'}}]);
 const fixed=out.find(p=>p.o.obstacle),moved=out.find(p=>!p.o.obstacle);
 assert.equal(fixed.ty,117,'the dimension label must not move');
 assert.ok(Math.abs(moved.ty-fixed.ty)>=8,'the note must clear the dimension label');
});

test('a note with nowhere to fit between two labels escapes BOTH of them',()=>{
 // Two fixed labels with a gap too narrow for a third note to stand in. The
 // old resolver stepped to one side, hit the other, and walked in a circle
 // until the passes ran out — leaving the note printed on a label. The note
 // must end up standing clear of BOTH.
 const {out}=layout([
  {k:'txt',x:100,y:80,tx:100,ty:80,text:'upper label',o:{fixed:true,obstacle:true,size:8,anchor:'start'}},
  {k:'txt',x:100,y:92,tx:100,ty:92,text:'lower label',o:{fixed:true,obstacle:true,size:8,anchor:'start'}},
  {k:'txt',x:100,y:86,tx:100,ty:86,text:'a note that has to fit somewhere',o:{}}]);
 const [u,l,n]=out;
 const top=p=>p.ty+2.4-.75*p.size, bot=p=>p.ty+2.4+(p.lines.length-1)*p.size*1.2+.25*p.size;
 const overlap=(a,b)=>Math.min(bot(a),bot(b))-Math.max(top(a),top(b));
 assert.ok(overlap(n,u)<=0,`the note still sits on the upper label by ${overlap(n,u).toFixed(2)} units`);
 assert.ok(overlap(n,l)<=0,`the note still sits on the lower label by ${overlap(n,l).toFixed(2)} units`);
});

test('a vertical dimension label is a strip running down the sheet, not a wide box',()=>{
 // Turned on its side, a dimension label's length runs DOWN from its own
 // baseline. Measured flat it is a short wide box ABOVE the pivot, and the
 // resolver then reserves ground the ink never occupies — while the ink,
 // running down the sheet, goes straight through whatever stands there.
 const d=dim(20,100,20,40,'1000');
 const t=d.match(/<text x="([-\d.]+)" y="([-\d.]+)"[^>]*transform="rotate\(-90 [^)]*\)"[^>]*>([^<]*)</);
 assert.ok(t,'the vertical dimension must draw its label turned on its side');
 const px=+t[1],py=+t[2],label=t[3];
 const w=[...label].length*8*.6;
 // Registered the way dim() registers it.
 const {out}=layout([
  {k:'txt',x:px,y:py,tx:px,ty:py-2.4,text:label,o:{fixed:true,obstacle:true,size:8,anchor:'end',rot:true}},
  {k:'txt',x:24,y:py+6,tx:10,ty:py+6,text:'a note beside the dimension',o:{}}]);
 const n=out[1];
 const nTop=n.ty+2.4-.75*n.size, nBot=n.ty+2.4+(n.lines.length-1)*n.size*1.2+.25*n.size;
 // The ink of the turned label runs from its baseline down its own length.
 const clearBelow=py+w;
 assert.ok(nTop>=clearBelow||nBot<=py,
  `the note at ${nTop.toFixed(1)}..${nBot.toFixed(1)} is printed on the label's ink (${py.toFixed(1)}..${clearBelow.toFixed(1)})`);
});

test('the layout reserves the ground a dimension label is actually drawn on',()=>{
 // Every note the layout places is drawn at ty + 2.4. A dimension label
 // draws ITSELF, at its own coordinate — so registering it at the drawn
 // baseline put the model's box 2.4 units off the ink, and the note the
 // resolver put in that 2.4 units of nothing landed on the label.
 const d=dim(30,120,90,120,'1000');
 const t=d.match(/<text x="([-\d.]+)" y="([-\d.]+)"[^>]*text-anchor="middle"[^>]*>1000</);
 assert.ok(t,'the dimension must draw its own label');
 const y=+t[2];
 const {out}=layout([
  {k:'txt',x:60,y,y:120,tx:60,ty:y-2.4,text:'1000',o:{fixed:true,obstacle:true,size:8,anchor:'middle'}}]);
 const m=out[0];
 assert.equal(m.ty+2.4-.75*m.size,y-0.75*8,'the reserved box must start at the drawn cap line');
 assert.equal(m.ty+2.4+.25*m.size,y+0.25*8,'the reserved box must end at the drawn descender line');
});

test('a break line stays inside the length it was given',()=>{
 // A break drawn with absolute points under a RELATIVE command compounds: a
 // four-unit zigzag walks off the assembly as a long diagonal across the sheet.
 const d=brkV(34,52,56,4);
 assert.ok(!/l[-\d]/.test(d),'a break must use absolute line segments');
 const ys=[...d.matchAll(/[ML]([-\d.]+) ([-\d.]+)/g)].map(m=>+m[2]);
 const xs=[...d.matchAll(/[ML]([-\d.]+) ([-\d.]+)/g)].map(m=>+m[1]);
 assert.ok(Math.min(...ys)>=52-4&&Math.max(...ys)<=52+56+4,
  'the break must span the length it was given, not several times it');
 assert.ok(Math.max(...xs)-Math.min(...xs)<=8,'the zigzag must stay within its amplitude');
});

test('the assembly list and the drawings agree',()=>{
 for(const k of DETAIL_KEYS)
  assert.ok(DETAILS[k],`the chooser offers "${k}" but there is no detail for it`);
});

test('no drawing leaks a non-number',()=>{
 for(const {key,svg} of SHEETS){
  assert.ok(!/NaN|undefined|Infinity/.test(svg),
   `${key}: a non-number reached the SVG — a coordinate became NaN`);
  for(const m of svg.matchAll(/="([^"]*)"/g))
   assert.ok(!/NaN|undefined/.test(m[1]),`${key}: "${m[1]}" in an attribute`);
 }
});

test('the drafting module obeys the house rules',()=>{
 const src=readFileSync(new URL('../dist/drafting.js',import.meta.url),'utf8');
 const code=src.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'');
 assert.doesNotMatch(code,/gradient|border-radius|box-shadow|blur\(/,
  'a drawing is not a card');
});

test('the drafting vocabulary is in the release graph',()=>{
 const r=readFileSync(new URL('../scripts/release-id.mjs',import.meta.url),'utf8');
 // Parse the two arrays and look INSIDE them. Asserting that the string
 // './drafting.js' appears somewhere in the file passes even after it has been
 // dropped from IN_APP, because the stamping list spells the same path — which
 // is a guard that survives the exact removal it exists to catch.
 const arr=name=>{
  const m=new RegExp(`const ${name} = \\[([^\\]]*)\\]`,'s').exec(r);
  assert.ok(m,`release-id.mjs no longer declares ${name} — the guard has gone blind`);
  return [...m[1].matchAll(/'([^']+)'/g)].map(x=>x[1]);
 };
 const inApp=arr('IN_APP'), shared=arr('SHARED');
 assert.ok(inApp.includes('./drafting.js'),'drafting.js must be stamped into the bundle');
 assert.ok(shared.includes('drafting.js'),
  'drafting.js must be in the hashed set, or its own stamp is never computed');
 // And it must be rewritten BEFORE anything that imports it. Stamped in the
 // wrong order it gets a number that was true the instant it was written.
 const detAt=r.indexOf("read('details.js')");
 const modelAt=r.indexOf("read('model.js')");
 assert.ok(detAt>0&&modelAt>detAt,
  'details.js must be re-stamped before model.js, which imports it');
});

test('every module import on the detail path carries a live content stamp',()=>{
 // Not "is there a stamp" but "is it the stamp OF THESE BYTES". A number left
 // behind by an earlier edit is still a number.
 const sha=p=>createHash('sha256').update(readFileSync(new URL(p,import.meta.url))).digest('hex').slice(0,10);
 const det=readFileSync(new URL('../dist/details.js',import.meta.url),'utf8');
 const m=/from '\.\/drafting\.js\?v=([0-9a-f]{10})'/.exec(det);
 assert.ok(m,'details.js must import drafting.js with a ?v= stamp');
 assert.equal(m[1],sha('../dist/drafting.js'),'the stamp is stale — rerun scripts/release-id.mjs');
});

test('the hatch patterns are defined and referenced, never orphaned',()=>{
 for(const id of ['d-wool','d-conc','d-earth'])
  assert.ok(DEFS.includes(`id="${id}"`),`${id} is referenced by a material but never defined`);
});
test('a middle-anchored note is drawn ON its point, not half a label to the left',()=>{
 // The bug: layout() places a 'middle' note's BOX at tx - w/2, which is
 // correct, and then drawNotes drew the text AT THAT X with text-anchor still
 // set to 'middle'. The browser centred it there as well, so the label sat
 // half a label to the left of where it was asked to be — every time, on every
 // drawing in the project. Two workers on two different labs hit it before
 // either could explain it.
 //
 // The test is behavioural: render a note through the vocabulary and measure
 // where the text actually landed.

 const w=40,ADV=.6;
 for(const text of ['8','1:4.5','conventional']){
  const size=7.5,tx=100;
  const svg=sheet(txt(tx,60,text,{anchor:'middle',size}),300,150,'test');
  const m=/<text x="([-\d.]+)" y="([-\d.]+)"[^>]*font-size="([\d.]+)"[^>]*text-anchor="middle"[^>]*>([^<]*)<\/text>/.exec(svg);
  assert.ok(m,'no middle-anchored note was drawn for "'+text+'"');
  const x=+m[1],drawnWidth=[...text].length*size*ADV;
  // The text is centred on x, so its box is x - w/2 .. x + w/2, and that box
  // must straddle the point the note was registered at.
  const lo=x-drawnWidth/2,hi=x+drawnWidth/2;
  assert.ok(lo<=tx&&tx<=hi,`"${text}" was drawn centred on ${x}, not on ${tx}`);
  // and it must be within half a label of it, not a whole label
  assert.ok(Math.abs((x)-tx)<=0.01,`"${text}" was drawn at ${x}, not at ${tx}`);
 }
});
