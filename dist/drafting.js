/* The architectural drafting vocabulary this sheet is missing.

   Every detail in this project was drawn with five primitives: a line, a
   dashed line, an arrow, an arrowhead and some text. That produced diagrams of
   the IDEA of a detail — a stickman of a drained cavity — where the outer
   pressure plate, the mineral wool and the air seal are all the same weight in
   the same colour, so the reader is told the arrangement but learns nothing
   about what it is made of or how deep it is.

   The conventions that make a detail a detail are old and they are not
   optional:

   POCHE. A section CUTS material. The cut face is drawn solid or hatched BY
   MATERIAL, and that is the single strongest cue in the whole discipline —
   it is how the eye separates "this is aluminium, 6 mm" from "this is
   nothing at all, a 40 mm cavity" without reading a single word. Nothing here
   had a poché.

   MATERIAL. Different material, different fill. Mineral wool is hatched.
   Aluminium in section is solid. A sealant is a solid bead. Glass is drawn
   beyond the cut plane, as an outline, because a cut pane of glass would be a
   lie about what glass looks like at 1:5.

   BEYOND. What you see PAST the cut plane is outline only, never filled. This
   is the difference between a section and a diagram, and it is the reason
   poché has to exist.

   LEADERS. A label floats nowhere. It sits at the end of a leader that lands
   on the thing it names, with a dot terminator, and the leaders are staggered
   so they do not cross. The old drawings ran six labels in one row along the
   bottom, which is a caption, not annotation.

   BREAK LINES. Anything that continues is cut with the freehand break, so the
   drawing says what it is not showing.

   CENTRE LINES. Dash-dot, for anything with an axis.

   DIMENSIONS. Architectural dimensions terminate in slashes, not arrowheads —
   the arrowhead belongs to the flow arrows and to nothing else.

   GROUND. Below grade is drawn: a heavy ground line and earth hatch. Above
   grade it is simply not there. */
const P=(id,body)=>`<pattern id="${id}" width="6" height="6" patternUnits="userSpaceOnUse">${body}</pattern>`;

/* Pattern fills. Defined in every drawing's <defs>; the ids are fixed and the
   definitions identical everywhere, so the browser resolving two of them to one
   is the intended behaviour rather than a collision. */
export const DEFS=
 P('d-wool',`<path d="M-1,1 L1,-1 M0,6 L6,0 M5,7 L7,5" stroke="var(--muted)" stroke-width=".5" fill="none"/>`)
 +P('d-conc',`<path d="M-1,1 L1,-1 M0,6 L6,0 M5,7 L7,5" stroke="var(--faint)" stroke-width=".5" fill="none"/>`
   +`<circle cx="1.5" cy="4.5" r=".7" fill="var(--faint)"/><circle cx="4.5" cy="1.5" r=".55" fill="var(--faint)"/>`)
 +P('d-earth',`<path d="M-1,1 L1,-1 M0,6 L6,0 M5,7 L7,5" stroke="var(--muted)" stroke-width=".55" fill="none"/>`
   +`<circle cx="1.2" cy="4.6" r=".8" fill="var(--muted)"/><circle cx="4.4" cy="1.4" r=".65" fill="var(--muted)"/>`
   +`<circle cx="3" cy="3.2" r=".5" fill="var(--muted)"/>`);

/* Material classes. `cut` is the poché fill, `edge` the outline stroke. */
const MATERIAL={
 metal:{cut:'var(--ink)',edge:'var(--ink)',w:.7},          // aluminium, steel: solid in section
 steel:{cut:'var(--ink)',edge:'var(--ink)',w:.8},
 wool:{cut:'url(#d-wool)',edge:'var(--muted)',w:.6},       // insulation: hatched
 conc:{cut:'url(#d-conc)',edge:'var(--muted)',w:.7},       // concrete: hatch + aggregate
 earth:{cut:'url(#d-earth)',edge:'var(--ink)',w:.9},
 seal:{cut:'var(--ink)',edge:'var(--ink)',w:.5},            // sealant, gasket: a solid bead
 board:{cut:'var(--muted)',edge:'var(--ink)',w:.6},
 glass:{cut:'none',edge:'var(--muted)',w:.6},              // beyond the cut plane
 beyond:{cut:'none',edge:'var(--faint)',w:.55},
 void:{cut:'none',edge:'none',w:0}
};
export const matOf=k=>MATERIAL[k]||MATERIAL.metal;

/* A cut body. The whole point: a section cuts it, so it is FILLED, by
   material. `b` is an open path — the four sides of the thing being cut. */
export function cut(d,m='metal'){
 const M=matOf(m);
 if(M.cut==='none'&&M.edge==='none')return '';
 return `<path d="${d}" fill="${M.cut}" stroke="${M.edge}" stroke-width="${M.w}"/>`;
}
/* Material seen PAST the cut plane. Outline only, never filled — that
   distinction is what separates a section from a diagram. */
export const beyond=(d,sw=.55)=>`<path d="${d}" fill="none" stroke="var(--faint)" stroke-width="${sw}"/>`;

/* ── annotation ────────────────────────────────────────────────────────────
   A leader: from the element, out at 45°, then a horizontal land under the
   text. Dot terminator at the element, which is the convention — a leader
   without one is just a line.

   Leaders do not draw themselves. They REGISTER, and sheet() lays them out and
   draws them last, on top of the drawing, which is where annotation belongs.

   The reason is arithmetic. The drawing field is 250 wide. A note like
   "slab edge, beyond" is about 62 units long, so a leader that lands at x=200
   puts its last eleven characters outside the frame — and SVG clips silently,
   so the sheet reads "slab edge, beyo" and the reader is left guessing. The
   first twelve drawings all had that defect, on both margins.

   The fix is the one a real detail sheet uses: the sheet is allowed to be
   WIDER than the drawing, and the frame is sized from the notes that actually
   need the room. A drawing whose notes all sit inside its field keeps its
   original tight frame; one that needs a margin gets exactly that margin, and
   no more. Nothing is ever clipped, and nothing pays for space it did not use.

   Text is measured, not guessed at: this face is monospace, the advance is .6 em,
   so a label's width is its length. That is exact, it needs no DOM, and it is
   therefore testable in node — which is the only place this kind of arithmetic
   gets caught before it ships. */
const CW=250, CH=150, TOP=22, BOT=12, GUT=112, PAD=5;
/* Notes may sit in the head and foot margins as well as over the field. Without
   that the whole stack is squeezed into the 150-unit drawing height and the
   resolver runs out of room exactly where a sheet has the most to say. */
const LO=TOP+3, HI=CH+BOT-4;
export const FIELD={w:CW,h:CH};
const adv=(s,size)=>s.length*size*.6;              // monospace advance, .6 em
/* Break at a word rather than run off the sheet. A note that cannot fit the
   margin column is wrapped, never truncated — a truncated note is a lie about
   what the detail contains. */
function wrap(s,maxw,size){
 if(adv(s,size)<=maxw) return [s];
 const per=Math.max(10,Math.floor(maxw/(size*.6)));
 const out=[]; let cur='';
 for(const word of s.split(' ')){
  let t=cur?cur+' '+word:word;
  if(t.length<=per){ cur=t; continue; }
  if(cur) out.push(cur);
  if(word.length<=per){ cur=word; continue; }   // one word longer than a whole line
  for(let i=0;i<word.length;i+=per) out.push(word.slice(i,i+per));
  cur='';
 }
 if(cur) out.push(cur);
 return out;
}

let PEND=[];
export function leader(x,y,tx,ty,text,opts={}){ PEND.push({k:'leader',x,y,tx,ty,text,o:opts}); return ''; }
/* Loose text registers too. That is the second half of the fix and it was
   missing: a note typed straight onto the sheet with txt() never took part in
   the collision pass, so on the screen detail "louvred screen" printed straight
   through "blades, poched" and both became unreadable. Annotation that cannot
   see the rest of the annotation is not annotation. */
export function note(x,y,s,o={}){ PEND.push({k:'txt',x,y,tx:x,ty:y,text:s,o}); return ''; }

/* Resolve every registered note: measure it, wrap it if it cannot fit the
   margin, move it clear of anything it lands on, and report how much sheet the
   whole set actually needs.

   Two things this has to get right, and both were wrong the first time:

   SEPARATION IS A GAP, NOT AN ABSENCE OF OVERLAP. Comparing boxes for
   intersection and then doing nothing is the classic bug — two notes printed on
   each other are "not adjacent", so the test passes and the sheet is still
   unreadable. What matters is the CLEARANCE between them, so a note is pushed
   until there is a real gap, whichever side of its neighbour it is on.

   ORDER IS NOT THE AUTHOR'S ORDER. A dimension label belongs on its dimension
   line and cannot move, so it cannot be treated as just another note that gets
   shoved aside: fixed notes are placed first and everything else is placed
   around them. Otherwise "70" moves out from under its dimension, which is a
   dimension that now measures the wrong distance — the exact failure this whole
   exercise exists to remove. */
export function layout(items,W=CW,H=CH){
 const rank=i=>i.o.fixed?0:1;
 const ordered=[...items].sort((a,b)=>rank(a)-rank(b));
 const out=[]; let needL=0,needR=0;
 for(const it of ordered){
  // Drawings are shown at about 1.3 px per unit; 7.5 units is the 10 px floor.
  const size=Math.max(7.5,it.o.size||7.5), side=it.tx<it.x?'L':'R';
  const lines=wrap(it.text, GUT-2*PAD, size);
  const w=Math.max(...lines.map(l=>adv(l,size)));
  const x0=it.o.anchor==='middle'?it.tx-w/2:it.o.anchor==='end'?it.tx-w:side==='R'?it.tx+3:it.tx-3-w;
  const box=p=>[p.x0,p.x0+p.w];
  const [ax0,ax1]=box({x0,w});
  const lo=TOP+3,hi=H+BOT-4;
  let ty=Math.max(lo, Math.min(hi, it.ty));
  if(!it.o.fixed){
   // One collision per pass, then rescan. Applying a shift for EVERY obstacle in
   // a single pass compounds the corrections and walks the note back into the
   // note it was escaping from: the pass count stops being a bound and starts
   // being a random walk. Resolve the first conflict, then look again.
   //
   // The measurement is a TEXT BOX, not a baseline. A note is drawn at ty+2.4
   // with its cap height above that and its descenders below, so its box runs
   // from ty + 2.4 - .75em to ty + 2.4 + .25em. Comparing baselines as if they
   // were box edges put the clearance out by a whole line height — which is
   // exactly enough to leave two labels touching, which is what "clearance"
   // was supposed to mean.
   const gap=5, LEAD=.75*size+.25*size+2.4;   // baseline distance for one clear step
   const ctop=()=>ty+2.4-.75*size, cbot=()=>ty+2.4+.25*size;
   const ptop=p=>p.ty+2.4-.75*p.size, pbot=p=>p.ty+2.4+.25*p.size;
   for(let pass=0;pass<200;pass++){
    let shift=null;
    for(const p of out){
     const [b0x,b1x]=box(p);
     if(ax1<=b0x-2||ax0>=b1x+2) continue;                 // clear in x
     // AND clear in y. Testing only the x band makes every note in a column a
     // permanent collision with every other: the note escapes its neighbour,
     // lands in the next one's band, and never settles. A collision is a box
     // overlap, and a box has two dimensions.
     if(cbot()+gap<=ptop(p)||ctop()-gap>=pbot(p)) continue; // clear in y
     const aboveT=p.ty-LEAD-gap, belowT=p.ty+LEAD+gap;
     const want=ty<=p.ty?aboveT:belowT;
     const alt=want===aboveT?belowT:aboveT;
     // If the side we want is off the sheet, take the other one. A note that
     // is pinned against the frame must step the other way or it stays printed
     // on top of its neighbour forever.
     shift=want>=lo&&want<=hi?want:(alt>=lo&&alt<=hi?alt:want);
     break;
    }
    if(shift===null) break;
    ty=Math.max(LO,Math.min(HI,shift));
   }
  }
  out.push({...it,size,side,lines,w,x0,ty});
  if(x0+w+3>W) needR=Math.max(needR,x0+w+3-W);
  if(x0-3<0) needL=Math.max(needL,3-x0);
 }
 return {out,needL,needR};
}

function drawNotes(items,W=CW,H=CH){
 const {out,needL,needR}=layout(items,W,H);
 const notes=out.map(p=>{
  const c=p.o.on?'var(--accent)':'var(--muted)';
  const anchor=p.o.anchor||(p.side==='R'?'start':'end');
  // Every line is set to the SAME edge of the box. For an end-anchored note that
  // edge is the box's right, not its left — anchoring 'end' at x0 puts the text
  // one whole width further left than the collision pass reserved room for, and
  // the sheet grows leftward by exactly the width it had already accounted for.
  const ax=anchor==='end'?p.x0+p.w:p.x0;
  const body=p.lines.map((l,i)=>`<text x="${ax}" y="${p.ty+2.4+i*p.size*1.2}"`
   +` font-family="var(--mono)" font-size="${p.size}" text-anchor="${anchor}"`
   +` fill="${c}" stroke="none">${l}</text>`).join('');
  if(p.o.obstacle) return '';        // placed as a barrier, drawn by its owner
  if(p.k==='txt') return body;
  const land=anchor==='start'?p.x0-3:p.x0+p.w+3;
  const mid=[p.x+(land-p.x)*.55,p.y+(p.ty-p.y)*.55];
  return `<path d="M${p.x} ${p.y} L${mid[0]} ${mid[1]} L${land} ${p.ty}" fill="none" stroke="${c}" stroke-width=".6"/>`
   +`<circle cx="${p.x}" cy="${p.y}" r="1.2" fill="${c}"/>`+body;
 }).join('');
 return {body:notes,viewBox:`${-needL} ${-TOP} ${W+needL+needR} ${H+TOP+BOT}`};
}
/* A flow arrow — water, air, smoke. Thin shaft, small solid head, and it is the
   ONLY thing in a detail allowed an arrowhead. */
/* A flow line — a riser, a duct, a run of water. `cls` is an optional class
   name, and it is not decoration.

   The core section styles its risers with CSS keyframes that march a dash
   pattern downward or upward, so the direction of travel is animated rather than
   described. That animation hangs off `core-flow-up` / `-down` / `-air`. The
   first version of the core drew them by passing the class name into a
   parameter that only ever tested truthiness: the lines came out in the accent
   colour and no class was ever emitted, so the sheet looked right and nothing
   moved. The guard that catches this is a *presence* check on the emitted
   markup — a styling rule that is styled but never drawn is the same defect as
   a function that is exported but never called.

   So the class is put on the element. A truthy non-string (the details
   drawings' `true`) still means "accent" and no class, exactly as before. */
export function flow(d,cls=false){
 const on=!!cls,c=typeof cls==='string'?cls:'';
 return `<path d="${d}"${c?` class="${c}"`:''} fill="none" stroke="${on?'var(--accent)':'var(--muted)'}" stroke-width=".8"/>`;
}
export const head=(x,y,dir,on=false)=>{
 const p={u:'M0,2.6 l2.6,-2.6 l2.6,2.6',d:'M0,-2.6 l2.6,2.6 l2.6,-2.6',l:'M2.6,0 l-2.6,2.6 l2.6,2.6',r:'M-2.6,0 l2.6,2.6 l-2.6,2.6'}[dir];
 return `<path d="${p}" transform="translate(${x},${y})" stroke="${on?'var(--accent)':'var(--muted)'}" stroke-width=".8" fill="none"/>`;
};

/* An architectural dimension. Slash terminators, not arrowheads — a filled
   arrowhead on a dimension is a CAD tic and belongs to no drawing standard. */
export function dim(x1,y1,x2,y2,label,off=6){
 const h=y2-y1,w=x2-x1;
 const vert=Math.abs(h)>Math.abs(w);
 const mx=(x1+x2)/2,my=(y1+y2)/2;
 const line=vert?`M${x1} ${y1+off} V${y2-off}`:`M${x1+off} ${y1} H${x2-off}`;
 const slash=(x,y)=>`<path d="M${x-2} ${y+2} l4,-4" stroke="var(--muted)" stroke-width=".6"/>`;
 // The label registers as a FIXED OBSTACLE. It sits on its own dimension line
 // and it is the one note in the drawing that must not move: a dimension that
 // slides off its line stops being the measurement of that distance. It is
 // registered for one reason only — so every other note is laid out around it.
 // It draws itself, as it always has, and this pass must not draw it twice.
 note(vert?x1-3:mx, vert?my:y1-3, label,{fixed:true,obstacle:true,size:8,anchor:vert?'end':'middle'});
 return `<g>${vert
  ?`<path d="M${x1} ${y1} V${y2}" stroke="var(--muted)" stroke-width=".5" stroke-dasharray="3 1.5"/>${slash(x1,y1)}${slash(x1,y2)}`
   +`<text x="${x1-3}" y="${my}" font-family="var(--mono)" font-size="8" fill="var(--muted)" text-anchor="end" stroke="none" transform="rotate(-90 ${x1-3} ${my})">${label}</text>`
  :`<path d="M${x1} ${y1} H${x2}" stroke="var(--muted)" stroke-width=".5" stroke-dasharray="3 1.5"/>${slash(x1,y1)}${slash(x2,y1)}`
   +`<text x="${mx}" y="${y1-3}" font-family="var(--mono)" font-size="8" fill="var(--muted)" text-anchor="middle" stroke="none">${label}</text>`
 }</g>`;
}

/* The freehand break, running up the page — the one that matters at the end of a
   wall, a slab or a cavity. A break has to CUT something. Drawn as a squiggle
   beside the assembly it is supposed to be cutting through, it reads as a
   scribble, and a scribble on a detail is worse than no break at all: it makes
   the whole sheet look drawn by someone who had not seen one. */
export function brkV(x,y,h,amp=4){
 const n=Math.max(3,Math.round(h/(amp*3)));
 const seg=h/n;
 // Absolute coordinates with an ABSOLUTE lineto. Emitting absolute points
 // under a relative `l` compounds: each segment adds to the last point, so a
 // 4-unit zigzag walks off the drawing as a long diagonal across the sheet.
 return `<path d="${Array.from({length:n},(_,i)=>(i?'L':'M')+`${x+(i%2?amp:-amp)} ${(y+seg*i).toFixed(2)}`).join(' ')}"`
  +` fill="none" stroke="var(--ink)" stroke-width=".7" stroke-linejoin="miter"/>`;
}
/* Centre line — long dash, short dash, for anything with an axis. */
export const cl=(x1,y1,x2,y2)=>`<path d="M${x1} ${y1} L${x2} ${y2}" stroke="var(--faint)" stroke-width=".5" stroke-dasharray="9 2 2 2"/>`;
/* The ground line and the earth below it. Below grade is drawn; above grade
   it is simply absent. */
export function ground(x,y,w){
 return `<path d="M${x} ${y} H${x+w}" stroke="var(--ink)" stroke-width="1"/>`
  +`<path d="M${x} ${y} V${y+12} H${x+w} V${y}" fill="url(#d-earth)" stroke="var(--ink)" stroke-width=".8"/>`;
}
export const txt=(x,y,s,o={})=>note(x,y,s,o);
export const rule=(x1,y1,x2,y2,o={})=>`<path d="M${x1} ${y1} L${x2} ${y2}" fill="none"`
 +` stroke="${o.c||'var(--muted)'}" stroke-width="${o.w||.6}"${o.dash?' stroke-dasharray="'+o.dash+'"':''}/>`;

/* Every drawing is the same frame: defs, then the body, then the annotation on
   top of it. A drawing with no defs has no poché, which is how the last twelve
   managed to be stickmen; a drawing whose notes are clipped has a lie in it,
   which is how the next twelve would have managed it. The frame grows to the
   notes it actually has — a drawing whose notes all sit inside the field keeps
   its original 250x150 box and pays for no margin it did not use. */
/* The frame's own ARIA.

   `aria-hidden="true"` was here because every sheet of a drawing set is a
   sibling of a caption in the surrounding HTML, and hiding them stopped a screen
   reader announcing twelve identical "image" nodes. It was right for the twelve
   details and wrong for the core section, which carries its own
   aria-label — and `aria-hidden` on an element with a label does not fall back
   to the label, it hides the element. The core section's long description,
   written for exactly this, was unreachable.

   So the decision is the caller's: sheet() takes the label and marks the
   element hidden only when there is none. A sheet with no label is decorative
   and is hidden; a sheet with a label is described by it. */
export const sheet=(body,w=CW,h=CH,label='')=>{
 const notes=PEND; PEND=[];
 const {body:noteSVG,viewBox}=drawNotes(notes,w,h);
 return `<svg class="dsec" viewBox="${viewBox}" role="img"`
  +(label?` aria-label="${label}"`:` aria-hidden="true"`)
  +` xmlns="http://www.w3.org/2000/svg" fill="none" stroke-linecap="square">`
  +`<defs>${DEFS}</defs>${body}${noteSVG}</svg>`;
};
/* Which drawing are we in? sheet() is what closes one. Nothing else reads this,
   but a guard can: a note registered and never drawn is a silent orphan. */
export const pendingNotes=()=>PEND.length;