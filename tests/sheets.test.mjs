import test from 'node:test';import assert from 'node:assert/strict';
import {defaults,evaluate} from '../dist/model.js';
import {glareDay,glareMethodPayload,glareMethodSVG} from '../dist/glare.js';
import {supplyDesign,waterMethodPayload,waterMethodSVG} from '../dist/water.js';
import {windRead,windMethodPayload,windMethodSVG} from '../dist/wind.js';
import {liftPlan,liftsMethodPayload,liftsMethodSVG} from '../dist/lifts.js';
import {fireRead,fireMethodSVG} from '../dist/fire.js';
import {carbonRead,carbonMethodSVG} from '../dist/carbon.js';
import {sheet,leader} from '../dist/drafting.js';
import {detailSVG,DETAIL_DRAWS} from '../dist/details.js';

/* ─────────────────────────────────────────────────────────────────────────────
   THE INK STAYS INSIDE THE FRAME.

   Every lab now draws a METHOD SHEET — the drawing that carries the method,
   because a paragraph cannot show an angle or a proportion. Six of them, in
   three languages, on the same vocabulary.

   This guard is CROSS-CUTTING on purpose. Each lab had its own guard, and
   each of them asked the wrong question. A lab's own guard asks "are MY notes
   inside MY frame" — and the frame GROWS to fit the notes, so the answer is
   yes by construction and proves nothing. The Chinese fire sheet shipped
   with three evacuation-phase labels running off the right edge of the sheet,
   the browser clipping them in silence: "12%" lost its half and "10%" was
   gone entirely. Four of the six labs had no frame check at all, and the two
   that did had the frame built from the drawing's own measure, which was the
   measure that was wrong.

   So this guard states the rules ONCE, from outside:

     1. The frame holds the INK, with air around it. Every mark of every
        sheet is inside the frame the sheet drew for itself.
     2. The width a glyph really has. IBM Plex Mono advances .6 em a glyph;
        a CJK glyph has no mono glyph to fall back on and comes from Noto
        Sans SC at a FULL em. The guard states this in its own words, so a
        drawing that measures a Chinese label at .6 em fails.
     3. No leader crosses a label. A leader that arrives through the middle
        of the text it names leaves a label with a line through it — which is
        what the lifts and the glare sheets used to print.
     4. A leader lands on the OUTSIDE of its label, so the rule holds even
        for a label centred on the very thing it names.

   The measure below is deliberately the guard's OWN. If it imported the
   drawing's measure, the guard would be the drawing agreeing with itself.
   ────────────────────────────────────────────────────────────────────────── */

/* The advance width of a string, in ems, as the BROWSER will lay it out.
   IBM Plex Mono advances .6 em a glyph. A CJK glyph is not in IBM Plex Mono
   and falls back to Noto Sans SC, where it is a full em. */
const CJK=/[⺀-鿿豈-﫿＀-￯　-〿]/;
const advEm=s=>[...s].reduce((a,ch)=>a+(CJK.test(ch)?1:0.6),0);

const NUM='[-+0-9.eE]+';
const TEXT_RE=new RegExp(`<text x="(${NUM})" y="(${NUM})"[^>]*font-size="([\\d.]+)"[^>]*text-anchor="(\\w+)"[^>]*>([^<]*)<\\/text>`,'g');
const LEADER_RE=new RegExp(`<path d="M(${NUM}) (${NUM}) L(${NUM}) (${NUM}) L(${NUM}) (${NUM})" fill="none" stroke="var\\(--(?:muted|accent)\\)" stroke-width="\\.6"/><circle cx="(${NUM})" cy="(${NUM})" r="1\\.2"[^>]*/>`,'g');

/* The frame the sheet drew for itself. */
function frameOf(svg){
 const m=svg.match(/viewBox="([^"]+)"/);
 assert.ok(m,'the sheet has no viewBox');
 const [x,y,w,h]=m[1].trim().split(/\s+/).map(Number);
 return {x,y,w,h,right:x+w,bottom:y+h};
}

/* The notes: the text elements, joined back into the notes the layout engine
   placed. A note that wraps is still ONE note. A note TURNED ON ITS SIDE is
   marked, because its ink is not where a horizontal note's ink is. */
function notesOf(svg){
 const raw=[...svg.matchAll(TEXT_RE)].map(m=>({x:+m[1],y:+m[2],size:+m[3],anchor:m[4],s:m[5],
  rot:/transform="rotate\(-?90/.test(m[0])}));
 const groups=new Map();
 for(const r of raw){
  const k=`${r.x}|${r.size}|${r.anchor}|${r.rot?'r':'h'}`;
  if(!groups.has(k))groups.set(k,[]);
  groups.get(k).push(r);
 }
 return [...groups.values()].flatMap(g=>{
  g.sort((a,b)=>a.y-b.y);
  const runs=[];let cur=[g[0]];
  for(let i=1;i<g.length;i++){
   if(Math.abs((g[i].y-g[i-1].y)-g[i-1].size*1.2)<0.01)cur.push(g[i]);
   else{runs.push(cur);cur=[g[i]]}
  }
  runs.push(cur);
  return runs.map(run=>({x:run[0].x,y:run[0].y,size:run[0].size,anchor:run[0].anchor,rot:run[0].rot,
   lines:run.map(r=>r.s),text:run.map(r=>r.s).join(' ')}));
 });
}

/* Where a note's INK sits. A note turned on its side — a vertical dimension's
   label — is a narrow strip running DOWN from its pivot, not a wide box
   lying flat above it. The drawing's own layout engine models it that way,
   and so does this. */
function boxOf(n){
 const w=Math.max(...n.lines.map(l=>advEm(l)*n.size));
 if(n.rot) return {x0:n.x-0.75*n.size,x1:n.x+0.25*n.size,top:n.y,bot:n.y+w};
 const x=n.anchor==='middle'?n.x-w/2:n.anchor==='end'?n.x-w:n.x;
 return {x0:x,x1:x+w,top:n.y-0.75*n.size,bot:n.y+(n.lines.length-1)*n.size*1.2+0.25*n.size};
}

/* The leaders: a two-segment polyline with a dot where it leaves the drawing.
   The label that belongs to a leader is the first note printed after it. */
function leadersOf(svg){
 const out=[];let m;
 while((m=LEADER_RE.exec(svg))!==null){
  out.push({at:m.index,end:m.index+m[0].length,
   p:[{x:+m[1],y:+m[2]},{x:+m[3],y:+m[4]},{x:+m[5],y:+m[6]}]});
 }
 for(const l of out){
  const next=out.find(o=>o.at>l.at);
  const stop=next?next.at:svg.length;
  const first=[...svg.slice(l.end,stop).matchAll(TEXT_RE)][0];
  l.label=first?{x:+first[1],y:+first[2],size:+first[3],anchor:first[4],lines:[first[5]],text:first[5]}:null;
 }
 return out;
}

/* Does a segment cut through a box?
   NOT a midpoint test. A leader can run through the LAST CHARACTER of a
   label and still have its midpoint outside the label — and that is exactly
   what the lifts sheet did: the line struck through "57%)" and the midpoint
   of the segment sat in the white space below. The test is a real
   segment/rectangle intersection: an endpoint inside, or a crossing of any
   of the four edges. */
const orient=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const onSeg=(a,b,p)=>Math.min(a.x,b.x)-1e-9<=p.x&&p.x<=Math.max(a.x,b.x)+1e-9
 &&Math.min(a.y,b.y)-1e-9<=p.y&&p.y<=Math.max(a.y,b.y)+1e-9;
function segCross(a,b,c,d){
 const o1=orient(a,b,c),o2=orient(a,b,d),o3=orient(c,d,a),o4=orient(c,d,b);
 if(((o1>0&&o2<0)||(o1<0&&o2>0))&&((o3>0&&o4<0)||(o3<0&&o4>0)))return true;
 if(o1===0&&onSeg(a,b,c))return true;
 if(o2===0&&onSeg(a,b,d))return true;
 if(o3===0&&onSeg(c,d,a))return true;
 if(o4===0&&onSeg(c,d,b))return true;
 return false;
}
function hitsBox(a,b,box){
 const inside=p=>p.x>=box.x0&&p.x<=box.x1&&p.y>=box.top&&p.y<=box.bot;
 if(inside(a)||inside(b))return true;
 const c=[{x:box.x0,y:box.top},{x:box.x1,y:box.top},{x:box.x1,y:box.bot},{x:box.x0,y:box.bot}];
 for(let i=0;i<4;i++)if(segCross(a,b,c[i],c[(i+1)%4]))return true;
 return false;
}

/* Every method sheet, in every language. */
const TOWER={...defaults,program:'petronas',floors:48};
const CARBON_CTL={concrete:'C40/50',ggbs:25,rebarEAF:56,steelEAF:46,km:300,core:defaults.core};
const CARBON_READ=carbonRead({...defaults,system:'diagrid',floors:40},CARBON_CTL);
const SHEETS=[
 ['glare',glareMethodPayload(glareDay({...defaults},{city:'bangkok',date:'2026-06-21'})),glareMethodSVG],
 ['water',waterMethodPayload(supplyDesign(defaults,evaluate(defaults),{})),waterMethodSVG],
 ['wind',windMethodPayload(windRead(TOWER,{})),windMethodSVG],
 ['lifts',liftsMethodPayload(liftPlan(defaults,{speed:5},evaluate(defaults))),liftsMethodSVG],
 ['fire',fireRead(TOWER,{strategy:'simultaneous',refuge:'hk'}),fireMethodSVG],
 ['carbon',{h:CARBON_READ.here,tower:CARBON_READ.hereTw,system:CARBON_READ.system,options:CARBON_CTL},carbonMethodSVG],
];
const LANGS=['en','th','zh'];
/* The air the ink must have INSIDE the frame. The vocabulary keeps two units;
   the guard demands one, so a frame grown to the exact edge of the ink —
   which clips the last stroke of every leader that lands on it — is caught
   rather than tolerated. */
const AIR=1;

test('every method sheet draws, in every language, with a frame',()=>{
 for(const [name,pay,draw] of SHEETS){
  for(const lang of LANGS){
   const svg=draw(pay,{lang});
   assert.equal(typeof svg,'string',`${name}/${lang}: the sheet did not draw`);
   assert.ok(svg.includes('<svg'),`${name}/${lang}: no svg`);
   assert.doesNotMatch(svg,/NaN|undefined|Infinity/,`${name}/${lang}: a non-number reached the sheet`);
  }
 }
});

test('every note on every method sheet is inside the frame that holds the ink',()=>{
 for(const [name,pay,draw] of SHEETS){
  for(const lang of LANGS){
   const svg=draw(pay,{lang});
   const f=frameOf(svg);
   for(const n of notesOf(svg)){
    const b=boxOf(n);
    assert.ok(b.x0>=f.x+AIR,`${name}/${lang}: "${n.text}" runs off the left of the frame (${b.x0.toFixed(1)} < ${f.x.toFixed(1)})`);
    assert.ok(b.x1<=f.right-AIR,`${name}/${lang}: "${n.text}" runs off the right of the frame (${b.x1.toFixed(1)} > ${f.right.toFixed(1)})`);
    assert.ok(b.top>=f.y+AIR,`${name}/${lang}: "${n.text}" runs off the top of the frame`);
    assert.ok(b.bot<=f.bottom-AIR,`${name}/${lang}: "${n.text}" runs off the bottom of the frame`);
   }
  }
 }
});

test('every leader on every method sheet stays inside the frame',()=>{
 for(const [name,pay,draw] of SHEETS){
  for(const lang of LANGS){
   const svg=draw(pay,{lang});
   const f=frameOf(svg);
   for(const l of leadersOf(svg)){
    for(const p of l.p){
     assert.ok(p.x>=f.x+AIR,`${name}/${lang}: a leader runs off the left of the frame at x=${p.x.toFixed(1)}`);
     assert.ok(p.x<=f.right-AIR,`${name}/${lang}: a leader runs off the right of the frame at x=${p.x.toFixed(1)} (frame ${f.right.toFixed(1)})`);
     assert.ok(p.y>=f.y+AIR,`${name}/${lang}: a leader runs off the top of the frame at y=${p.y.toFixed(1)}`);
     assert.ok(p.y<=f.bottom-AIR,`${name}/${lang}: a leader runs off the bottom of the frame at y=${p.y.toFixed(1)}`);
    }
   }
  }
 }
});

test('no leader crosses a label — its own or anybody else\'s',()=>{
 for(const [name,pay,draw] of SHEETS){
  for(const lang of LANGS){
   const svg=draw(pay,{lang});
   const notes=notesOf(svg);
   for(const l of leadersOf(svg)){
    for(let i=0;i<l.p.length-1;i++){
     for(const n of notes){
      const b=boxOf(n);
      if(hitsBox(l.p[i],l.p[i+1],b))
       assert.fail(`${name}/${lang}: the leader to "${l.label?l.label.text:'?'}" is drawn through the label "${n.text}"`);
     }
    }
   }
  }
 }
});

test('no two notes on a method sheet are printed on one another',()=>{
 /* Five of the six labs had a guard of their own for this. The sixth did not,
    and a guard that exists in five places and not in the sixth is a guard
    that is really five guards — the law belongs to the sheet, not to the lab
    that happened to write it down first. */
 for(const [name,pay,draw] of SHEETS){
  for(const lang of LANGS){
   const svg=draw(pay,{lang});
   const notes=notesOf(svg);
   for(let i=0;i<notes.length;i++)for(let j=i+1;j<notes.length;j++){
    const a=boxOf(notes[i]),b=boxOf(notes[j]);
    if(a.x1<=b.x0||b.x1<=a.x0)continue;
    if(a.bot<=b.top||b.bot<=a.top)continue;
    assert.fail(`${name}/${lang}: "${notes[i].text}" is printed on "${notes[j].text}"`);
   }
  }
 }
});

test('a label centred on the thing it names is still not struck through',()=>{
 /* The rule the drawing vocabulary now holds, exercised directly. A caller
    who centres a label on its source — which two of the sheets used to do —
    leaves the leader no side to arrive from. The leader must come down onto
    the label's top edge instead of cutting through the text. */
 const text='travel 53.9 s (38%)';
 const w=advEm(text)*7.5;
 const svg=`<svg>${(()=>{
  const g=leader(120,40,120+w/2,80,text,{anchor:'end'});
  return sheet(g,260,120,'');
 })()}</svg>`;
 const leaders=leadersOf(svg);
 assert.ok(leaders.length,'the leader was not drawn');
 const notes=notesOf(svg);
 assert.ok(notes.length,'the label was not drawn');
 const b=boxOf(notes[0]);
 for(let i=0;i<leaders[0].p.length-1;i++)
  assert.ok(!hitsBox(leaders[0].p[i],leaders[0].p[i+1],b),
   'the leader was drawn through a label centred on its own source');
});

test('the measure models the browser: a CJK glyph is a full em, not .6',()=>{
 /* The rule the whole sheet rests on. If this is wrong, every Chinese label
    is a third wider than the box reserved for it and the frame is built to
    fit the wrong size — which is how the Chinese fire sheet lost its
    percentages. */
 assert.ok(advEm('中')>advEm('a'),'a CJK glyph is not narrower than a Latin one');
 assert.equal(advEm('中'),1);
 assert.equal(advEm('a'),0.6);
 assert.equal(advEm('中a'),1.6);
 /* Thirty Chinese glyphs are thirty ems wide, not eighteen. */
 assert.ok(advEm('中中中中中中中中中中中中中中中中中中中中中中中中中中')>25);
});

/* ─────────────────────────────────────────────────────────────────────────────
   THE SAME LAW, ON THE TWELVE DETAIL DRAWINGS.

   The details are not method sheets and they are not in three languages — they
   are the twelve sections of the envelope, drawn on the SAME vocabulary. The
   law is the vocabulary's, so the guard is the vocabulary's: extending it to a
   second family of drawings is not a new law, it is the same law applied
   where it had not been applied before.

   Seven of the twelve carried a real defect when the law was first extended to
   them, and no guard in the repository had caught any of them: the cavity
   detail's wool leader was struck through by the dimension label "70"; the
   slab detail's amber leader was struck through by "frame drift"; the fire
   detail's "slab still moves" ran through "smoke seal"; the node's "glass
   bracket" ran through "fire stops here"; the screen's "blades, poched" ran
   through "louvred screen"; the aviation's "luminaire" ran through "light
   envelope"; and the threshold's "upstand" and "waterproofing" both ran
   through "movement". Every one of them was a line through a word.
   ────────────────────────────────────────────────────────────────────────── */
const DETAILS=DETAIL_DRAWS.map(k=>[k,detailSVG(k)]);

test('every detail drawing draws, with a frame',()=>{
 for(const [name,svg] of DETAILS){
  assert.equal(typeof svg,'string',`${name}: the detail did not draw`);
  assert.ok(svg.includes('<svg'),`${name}: no svg`);
  assert.doesNotMatch(svg,/NaN|undefined|Infinity/,`${name}: a non-number reached the drawing`);
 }
});

test('every note on every detail drawing is inside the frame that holds the ink',()=>{
 for(const [name,svg] of DETAILS){
  const f=frameOf(svg);
  for(const n of notesOf(svg)){
   const b=boxOf(n);
   assert.ok(b.x0>=f.x+AIR,`${name}: "${n.text}" runs off the left of the frame (${b.x0.toFixed(1)} < ${f.x.toFixed(1)})`);
   assert.ok(b.x1<=f.right-AIR,`${name}: "${n.text}" runs off the right of the frame (${b.x1.toFixed(1)} > ${f.right.toFixed(1)})`);
   assert.ok(b.top>=f.y+AIR,`${name}: "${n.text}" runs off the top of the frame`);
   assert.ok(b.bot<=f.bottom-AIR,`${name}: "${n.text}" runs off the bottom of the frame`);
  }
 }
});

test('every leader on every detail drawing stays inside the frame',()=>{
 for(const [name,svg] of DETAILS){
  const f=frameOf(svg);
  for(const l of leadersOf(svg)){
   for(const p of l.p){
    assert.ok(p.x>=f.x+AIR,`${name}: a leader runs off the left of the frame at x=${p.x.toFixed(1)}`);
    assert.ok(p.x<=f.right-AIR,`${name}: a leader runs off the right of the frame at x=${p.x.toFixed(1)}`);
    assert.ok(p.y>=f.y+AIR,`${name}: a leader runs off the top of the frame at y=${p.y.toFixed(1)}`);
    assert.ok(p.y<=f.bottom-AIR,`${name}: a leader runs off the bottom of the frame at y=${p.y.toFixed(1)}`);
   }
  }
 }
});

test('no leader on a detail drawing crosses a label — its own or anybody else\'s',()=>{
 for(const [name,svg] of DETAILS){
  const notes=notesOf(svg);
  for(const l of leadersOf(svg)){
   for(let i=0;i<l.p.length-1;i++){
    for(const n of notes){
     const b=boxOf(n);
     if(hitsBox(l.p[i],l.p[i+1],b))
      assert.fail(`${name}: the leader to "${l.label?l.label.text:'?'}" is drawn through the label "${n.text}"`);
    }
   }
  }
 }
});

test('no two notes on a detail drawing are printed on one another',()=>{
 for(const [name,svg] of DETAILS){
  const notes=notesOf(svg);
  for(let i=0;i<notes.length;i++)for(let j=i+1;j<notes.length;j++){
   const a=boxOf(notes[i]),b=boxOf(notes[j]);
   if(a.x1<=b.x0||b.x1<=a.x0)continue;
   if(a.bot<=b.top||b.bot<=a.top)continue;
   assert.fail(`${name}: "${notes[i].text}" is printed on "${notes[j].text}"`);
  }
 }
});

/* ─────────────────────────────────────────────────────────────────────────────
   NO LINE THROUGH A WORD.

   A line through a word makes the word unreadable, and the BODY of the line
   does not matter. The law above is about leaders, because leaders are what the
   vocabulary draws — but the details' defects were not all leaders. A membrane
   rule ran through "inside". The obstruction arc ran through "light envelope".
   A dimension tick ran through the wool leader. A beyond line ran through
   "roped access", and the glass's own edge ran through "post, poched metal".
   Nine of them, found by rendering the sheets and looking at them, and not one
   of them was caught by any guard in the repository.

   THE INK MODEL, stated here in the guard's own words. A word's ink is the cap
   height above its baseline — and the descender below it, but only if the word
   HAS a descender. "rain" has none, so a line 1.6 units below its baseline is
   clear of it; "gutter" has a 'g', so the same line would cut the 'g' in half.
   Measuring every word's full box flags every flow arrow that starts just
   below the label it names, and a guard that fires on that teaches people to
   route around it, which is worse than having no guard at all.

   A PATH'S OWN ENDS ARE NOT EXEMPT. A leader lands on a label — that is what
   a leader is for, and the leaders are excluded from this law and held by the
   one above. Every OTHER line must stay off the words entirely, ends
   included: a flow arrow that stops on a word is a blemish, and the house's
   way of naming something is a leader with a dot on it. The exemption was
   tried, and it hid one real strike: the slab detail's plate-deflection arrow
   started inside the dimension label's box, and only the exemption let it
   pass. The arrow moved instead.
   ────────────────────────────────────────────────────────────────────────── */
const DESC=/[gjpqy]/;
function inkBoxOf(n){
 const w=Math.max(...n.lines.map(l=>advEm(l)*n.size));
 if(n.rot)return {x0:n.x-0.75*n.size,x1:n.x+0.25*n.size,top:n.y,bot:n.y+w};
 const x=n.anchor==='middle'?n.x-w/2:n.anchor==='end'?n.x-w:n.x;
 const desc=n.lines.some(l=>DESC.test(l));
 return {x0:x,x1:x+w,top:n.y-0.75*n.size,
  bot:n.y+(n.lines.length-1)*n.size*1.2+(desc?0.25*n.size:0)};
}

/* Every path in the drawing. A path that is immediately followed by a circle
   is a LEADER — the law above owns those, and this one would only report them
   twice. A path placed by a transform is not measured in absolute terms. */
const PATH_RE=/<path d="([^"]+)"([^>]*?)\/>(\s*<circle[^>]*\/>)?/g;
function pathsOf(svg){
 const out=[];let m;
 PATH_RE.lastIndex=0;
 while((m=PATH_RE.exec(svg))!==null){
  const attrs=m[2]||'';
  if(/transform=/.test(attrs))continue;
  if(!/fill="none"/.test(attrs))continue;      // a filled body is a shape, not a line
  if(m[3])continue;                              // a leader
  out.push({d:m[1]});
 }
 return out;
}

/* The segments of a path, in absolute terms. M, L, H and V are read; an arc
   is SAMPLED, because the aviation detail's obstruction envelope is an arc and
   that arc ran through a word. A relative path is not read: the guard would
   rather leave a gap than guess. */
function segmentsOf(d){
 const out=[];let cur=null;
 const num=t=>t.split(/[ ,]+/).map(Number);
 for(const tok of d.split(/(?=[MLHVACmlhvac])/)){
  const t=tok.trim();if(!t)continue;
  const c=t[0];
  if(c==='M'||c==='L'){
   const n=num(t.slice(1));
   for(let i=0;i+1<n.length;i+=2){
    if(cur)out.push([cur,{x:n[i],y:n[i+1]}]);
    cur={x:n[i],y:n[i+1]};
   }
  }else if(c==='H'||c==='V'){
   const n=+t.slice(1);if(!isFinite(n))continue;
   const p=c==='H'?{x:n,y:cur?cur.y:0}:{x:cur?cur.x:0,y:n};
   if(cur)out.push([cur,p]);
   cur=p;
  }else if(c==='A'){
   if(!cur)continue;
   const n=num(t.slice(1));
   const arc=sampleArc(cur,{x:n[5],y:n[6]},n[0],n[1],n[3],n[4]);
   for(const p of arc)out.push([cur,p]),cur=p;
  }else{cur=null;}
 }
 return out;
}
/* An arc, sampled. The endpoint-to-centre parameterisation, in full: the
   centre, the two angles, and the sweep. */
function sampleArc(p0,p1,rx,ry,large,sweep){
 if(!rx||!ry)return [];
 const phi=0;                                    // no x-axis rotation is used here
 const dx=(p0.x-p1.x)/2,dy=(p0.y-p1.y)/2;
 const d=Math.hypot(dx,dy);
 if(d>rx||d>ry){const s=Math.max(dx/rx,dy/ry);rx*=s;ry*=s;}
 const num=rx*rx*ry*ry-rx*rx*dy*dy-ry*ry*dx*dx;
 const den=rx*rx*dy*dy+ry*ry*dx*dx;
 if(den===0)return [];
 const co=Math.sqrt(Math.max(0,num/den));
 const sgn=(large===sweep)?-1:1;
 const cxp=co*sgn*(rx*dy/ry),cyp=co*sgn*(-ry*dx/rx);
 const cx=Math.cos(phi)*cxp-Math.sin(phi)*cyp+(p0.x+p1.x)/2;
 const cy=Math.sin(phi)*cxp+Math.cos(phi)*cyp+(p0.y+p1.y)/2;
 const ang=(ux,uy,vx,vy)=>{
  const d=ux*vy-uy*vx;
  const a=Math.acos(Math.min(1,Math.max(-1,(ux*vx+uy*vy)/(Math.hypot(ux,uy)*Math.hypot(vx,vy)))));
  return (d<0?-a:a);
 };
 const th1=ang(1,0,(p0.x-cx)/rx,(p0.y-cy)/ry);
 let dth=ang((p0.x-cx)/rx,(p0.y-cy)/ry,(p1.x-cx)/rx,(p1.y-cy)/ry);
 if(!sweep&&dth>0)dth-=2*Math.PI;
 if(sweep&&dth<0)dth+=2*Math.PI;
 const N=24,out=[];
 for(let i=1;i<=N;i++){
  const t=th1+dth*i/N;
  out.push({x:cx+rx*Math.cos(t),y:cy+ry*Math.sin(t)});
 }
 return out;
}
/* Does the line pass THROUGH the box, or merely touch it? */
function cutsInk(a,b,box,openEnd){
 const inside=p=>p.x>=box.x0&&p.x<=box.x1&&p.y>=box.top&&p.y<=box.bot;
 const ia=inside(a),ib=inside(b);
 if(ia||ib){
  if(ia&&openEnd.includes(0))return false;
  if(ib&&openEnd.includes(1))return false;
  return true;
 }
 const c=[{x:box.x0,y:box.top},{x:box.x1,y:box.top},{x:box.x1,y:box.bot},{x:box.x0,y:box.bot}];
 for(let i=0;i<4;i++)if(segCross(a,b,c[i],c[(i+1)%4]))return true;
 return false;
}

test('no drawn line passes through a label',()=>{
 const check=(name,svg)=>{
  const notes=notesOf(svg);
  for(const p of pathsOf(svg)){
   const segs=segmentsOf(p.d);
   for(let i=0;i<segs.length;i++){
    const openEnd=[];
    for(const n of notes){
     const b=inkBoxOf(n);
     if(cutsInk(segs[i][0],segs[i][1],b,openEnd))
      assert.fail(`${name}: the line "${p.d.slice(0,40)}" is drawn through the label "${n.text}"`);
    }
   }
  }
 };
 for(const [name,pay,draw] of SHEETS)for(const lang of LANGS)check(`${name}/${lang}`,draw(pay,{lang}));
 for(const [name,svg] of DETAILS)check(name,svg);
});

test('the law sees a curve: an arc is sampled, not skipped',()=>{
 /* The aviation detail's obstruction envelope is an ARC, and that arc ran
    through "light envelope". A guard that skipped arcs would have called the
    word safe, and the word was not safe. This is a synthetic drawing, and the
    law must fail on it. */
 const svg='<svg><path d="M120,120 A60 60 0 0 1 120,0" fill="none" stroke="var(--muted)" stroke-width=".5"/>'
  +'<text x="40" y="58" font-family="var(--mono)" font-size="7.5" text-anchor="start" fill="var(--muted)">envelope</text></svg>';
 const notes=notesOf(svg);
 assert.ok(notes.length,'the word was not read');
 const b=inkBoxOf(notes[0]);
 let struck=false;
 for(const p of pathsOf(svg))for(const seg of segmentsOf(p.d))
  if(cutsInk(seg[0],seg[1],b,[]))struck=true;
 assert.ok(struck,'the arc was not read: the word it runs through was called safe');
});

test('a descender is ink; a word without one is not',()=>{
 /* The word "gutter" has a 'g' that hangs below the baseline, and a line
    1.6 units under the baseline cuts it in half. The word "rain" has no
    descender, and the same line is clear of it. A guard that measured every
    word's full box would flag every flow arrow that starts just below the
    label it names — and a guard that fires on that teaches people to route
    around it, which is worse than having no guard at all. */
 const at=(word,x)=>`<svg><path d="M0,100 H200" fill="none" stroke="var(--muted)" stroke-width=".5"/>`
  +`<text x="${x}" y="99" font-family="var(--mono)" font-size="7.5" text-anchor="start" fill="var(--muted)">${word}</text></svg>`;
 const struck=word=>{
  const notes=notesOf(at(word,20));
  const b=inkBoxOf(notes[0]);
  for(const p of pathsOf(at(word,20)))for(const seg of segmentsOf(p.d))
   if(cutsInk(seg[0],seg[1],b,[]))return true;
  return false;
 };
 assert.ok(struck('gutter'),'a line through a descender was called safe');
 assert.ok(!struck('rain'),'a line below a word with no descender was called a strike');
});

test('a horizontal and a vertical line are read',()=>{
 /* The dimensions are drawn with H and V, and the beyond lines with H. A guard
    that could not read them would not have seen a single one of the nine
    strikes the details carried. */
 const word=(d)=>`<svg><path d="${d}" fill="none" stroke="var(--muted)" stroke-width=".5"/>`
  +'<text x="40" y="60" font-family="var(--mono)" font-size="7.5" text-anchor="start" fill="var(--muted)">struck</text></svg>';
 const struck=d=>{
  const notes=notesOf(word(d));
  const b=inkBoxOf(notes[0]);
  for(const p of pathsOf(word(d)))for(const seg of segmentsOf(p.d))
   if(cutsInk(seg[0],seg[1],b,[]))return true;
  return false;
 };
 assert.ok(struck('M0,58 H200'),'a horizontal line through a word was called safe');
 assert.ok(struck('M50,0 V200'),'a vertical line through a word was called safe');
});
