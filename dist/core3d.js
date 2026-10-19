/* ── the core, as GEOMETRY rather than as markup ────────────────────────────
   Everything here is in METRES, in the model's own coordinate system, and every
   rectangle is cut out of the core square: a square of side s.core, centred on
   the origin — exactly what evaluate() already charges area to and what
   daylightDepth() already measures daylight from. There is no second core and no
   second idea of where it is.

   Why a module at all, rather than more arithmetic inside core.js: the claims
   here are geometric claims about a building — does the escalator bank fit in
   this core at all, does a car reach the head of its zone before it has to come
   back — and those are exactly the claims that have to be checkable against a
   hand calculation rather than against their own source text. */

/* The lift's own motion, held here rather than in core.js.

   carZ() needs the speed and the dwell to reproduce a real cycle, and it used
   to reach into core.js for them — while core.js reaches into here for
   podiumReach. A circular import between two modules that are each half of the
   same argument works today under ESM hoisting and stops working the moment
   either file is edited to touch the other at module scope. The constants move
   down here, where the motion is actually computed, and core.js reads them from
   this side. One direction of travel, and the citation still sits with the
   method it belongs to. */
export const LIFT3={
 carSpeed:1.6,       // m/s — the speed liftDesign() does the traffic sum at
 doorTime:2.0        // s per opening
};

/* EN 115-1: inclination not more than 30°, and 35° is permitted only where the
   rise does not exceed 6 m at no more than 0.5 m/s. That 6 m is also the
   conventional cap on a single flight, and it is what decides how far up a
   podium an escalator can reach inside a core of a given size.

   Car dimensions are the 13-person car in ISO 8100-7 / EN 81-70 — the same
   rated load core.js sizes on — 1.6 m of clear width by 1.4 m of depth, so the
   shaft is the car plus a wall each face. Getting this wrong is not cosmetic:
   carW feeds the shaft pitch, the pitch decides how many cars fit across the
   core, and a missing constant silently turned every shaft coordinate into
   null while the count still read plausibly. */
export const CORE3={
 wall:0.30,          // shaft wall, each face
 stairClear:2.50,    // clear width inside a service stair
 carW:1.60, carD:1.40,
 escModule:2.10,     // 1000 mm step + balustrade + structure (EN 115-1 nominal)
 shaftGap:0.30,      // between adjacent shafts
 escIncl:30,
 escFlightRise:6,    // metres — one flight
 escPerMin:100,      // EN 115-1 / KONE: 1000 mm step at 0.5 m/s
 escSpeed:0.5,
 escStepMM:1000
};

const rad=d=>d*Math.PI/180;
/* The horizontal run a flight occupies at 30°. Pure escalator geometry, rise
   over tangent — and the single number that decides whether the bank fits. */
export const escRun=rise=>rise/Math.tan(rad(CORE3.escIncl));

/* How high an escalator can actually reach in THIS core, and what it would take
   to reach one level higher.

   The binding constraint is the RUN, not the rise an escalator could be bought
   to. At 30° a storey of 4.1 m costs 7.10 m of escalator laid end to end, and
   because flights stack in plan they do not overlap — so the core's own clear
   width is the whole budget. A 14 m core has 13.4 m clear, which buys one
   storey; reaching two needs a 15.7 m core.

   The 6 m figure in EN 115-1 is the cap on rise at the STEEPER 35°, where a
   flight's horizontal run is what makes it unmanageable. At 30° there is no
   such cap and a bank runs up continuously. So the run is quoted per storey of
   rise, and this is the generous reading of the geometry: no intermediate
   landing is deducted, and a real bank adds one every 6–12 m of rise, which
   would shorten the reach again. Stated here because a reach that flatters the
   building is worse than a small one that does not. */
/* The core's plan, banded once.

   From the far edge in: the stair, the lift shafts, the lobby, the bank against
   the near wall. Three functions used to decide these boundaries independently
   and they disagreed — the bank was placed against a line computed from the
   wall and the module alone, which on an 8 m core put two escalators inside a
   lift shaft. On a 14 m core nobody would ever have seen it; the collision only
   exists in the small ones, which is exactly where a guard has to look.

   So the bands are computed once, here, and every layout reads them. `bankRoom`
   is what is genuinely left for the escalators after the stair and the shafts
   have been placed, and `bank` is what two modules actually fit into it —
   narrower than they want when the core is small, and `bankRoom < one module`
   means the bank does not fit at all, which is reported rather than drawn over
   a shaft. */
export function coreBands(s){
 const M=CORE3,c=s.core/2;
 const stairW=M.stairClear+2*M.wall;
 const stair={y0:-c,y1:-c+stairW};
 const sy0=stair.y1+M.shaftGap, sy1=sy0+M.carD+2*M.wall;
 const lobbyY0=sy1+M.shaftGap;
 const bankRoom=Math.max(0,(c-M.wall)-lobbyY0);
 const want=Math.min(2*M.escModule,bankRoom);
 const bank={y0:c-M.wall-want,y1:c-M.wall,room:+bankRoom.toFixed(2)};
 return{stairW,stair:{...stair,depth:+stairW.toFixed(2)},
  shaftBand:{y0:sy0,y1:sy1},
  lobby:{y0:lobbyY0,y1:bank.y0,depth:+(bank.y0-lobbyY0).toFixed(2)},
  bank,oneModule:M.escModule,
  fit:bankRoom>=M.escModule*1.5};
}

export function podiumReach(s){
 const M=CORE3,rad=d=>d*Math.PI/180;
 const avail=Math.max(0,s.core-2*M.wall);
 const perLevel=Math.max(.1,s.height)/Math.tan(rad(M.escIncl));
 // The epsilon is not decoration. Two storeys of run at 4.1 m is 14.2 m of
 // core interior, and 2 × 7.1 evaluates to 14.200000000000001 — so a core that
 // fits two levels exactly came back as fitting one. A reach that is wrong by a
 // whole storey on the boundary case is the kind of error nobody spots, because
 // the answer is still a small sensible-looking integer.
 const eps=1e-9;
 const fit=w=>Math.floor(w/perLevel+eps);
 const levels=Math.min(s.floors,fit(avail));
 const coreForNext=+( (levels+1)*perLevel + 2*M.wall ).toFixed(2);
 const nextLevels=Math.min(s.floors,fit(Math.max(0,coreForNext-2*M.wall)));
 return{available:+avail.toFixed(2),runOne:+perLevel.toFixed(2),
  reach:levels,coreForNext,nextLevels,blocked:nextLevels>levels};
}


/* The escalator bank, in plan and section together: each storey of rise is one
   inclined segment, running along +x from the core's inner face, occupying two
   escModule widths so the up and the down unit sit side by side. It runs below
   the shaft band, so the two never overlap in plan — the shafts are laid out
   against the core's far wall by shaftLayout(), and the bank is laid against
   the near one here. The pair is what makes the claim true in three
   dimensions rather than only in the section. */
export function escLayout(s){
 const M=CORE3,c=s.core/2,r=podiumReach(s);
 const B=coreBands(s),y1=B.bank.y1,width=B.bank.y1-B.bank.y0,y0=B.bank.y0,fit=B.fit;
 const x0=-c+M.wall,units=[];
 for(let i=0;fit&&i<r.reach;i++){
  const b=Math.min(c-M.wall,x0+r.runOne);
  units.push({x0,y0,x1:b,y1,z0:+(i*s.height).toFixed(2),z1:+((i+1)*s.height).toFixed(2)});
 }
 return{units,width:+width.toFixed(2),y0,y1,fit,levels:fit?r.reach:0,...r};
}


/* The shafts, and which zone each serves. A car never crosses a zone boundary:
   its own group cannot reach there, and a drawing that let one would be drawing
   a lift system nobody could commission.

   Shafts are laid side by side ACROSS the core, each one the 13-person car plus
   a wall each face, because that is how a bank is laid out in plan: a shaft is
   tall and thin, so a group runs along the width of the core and the whole
   group is as deep as a single car. Stacking them in depth instead - the first
   attempt - made the group eight metres deep, which is a garage, not a core.

   And if the number of cars the traffic calculation demands does not fit across
   the core, that is reported rather than absorbed. A core too narrow for its own
   traffic is a real building problem, the same class of finding as the
   escalator's reach, and quietly drawing twenty shafts on a 14 m core by
   shrinking the car until they fit would hide it. `short` is how many cars the
   core cannot hold. */
export function shaftLayout(s,lift){
 const M=CORE3,c=s.core/2;
 /* The plan is banded from the far edge in — stair, shafts, lobby, bank — and
    the order is not cosmetic. With the stair and the shafts both on the near
    side, the stair, which is the full width of the core, stands across
    everything behind it and hides the shafts, the cars and the whole point of
    the drawing. Banded this way the stair is furthest away, the shafts sit in
    the middle where they read past it, and the bank is nearest the viewer where
    its incline is legible. See coreBands(). */
 const B=coreBands(s),stair={x0:-c,y0:B.stair.y0,x1:c,y1:B.stair.y1};
 const wanted=Math.max(1,lift.carsPerZone);
 const pitchX=M.carW+2*M.wall+M.shaftGap;
 const width=c*2-2*M.wall;
 const n=Math.max(1,Math.min(wanted,Math.floor((width+M.shaftGap)/pitchX)));
 const spanX=n*pitchX-M.shaftGap;
 const x0=-c+M.wall+Math.max(0,(width-spanX)/2);
 const depth=M.carD+2*M.wall;
 const y0=B.shaftBand.y0, y1=B.shaftBand.y1;
 const shafts=[];
 for(let i=0;i<n;i++){
  const a=x0+i*pitchX;
  shafts.push({
   x0:a, y0, x1:a+pitchX-M.shaftGap, y1,
   car:{x:a+M.wall, y:y0+M.wall, w:M.carW, d:M.carD},
   zone:Math.min(i,Math.max(0,lift.zones-1))
  });
 }
 return{shafts,stair,lobby:B.lobby,
  pitch:+pitchX.toFixed(2),depth:+depth.toFixed(2),band:{y0,y1},
  wanted,count:n,short:wanted-n};
}

/* A car's height at time t, in metres. Pure — the same t always gives the same
   z — which is what lets a test check the motion against the travel time the
   lift calculation reports instead of against the animation that plays it.

   The cycle is the honest one: run up, dwell, run down, dwell, at the stated car
   speed. A car that glided through its dwells would be a faster lift than the
   one the up-peak calculation was done for, and the two drawings would
   disagree about the same building. */
export function carZ(s,lift,i,tSec){
 const zf=lift.zoneFloors;
 const z=Math.min(i,Math.max(0,lift.zones-1));
 const f0=z*zf,f1=Math.min(s.floors,(z+1)*zf),span=Math.max(0,f1-f0);
 const travel=span*s.height/LIFT3.carSpeed,dwell=LIFT3.doorTime*2;
 const cycle=2*travel+2*dwell;
 if(!(cycle>0))return{z:0,zone:z,cycle:0,atFloor:true,dir:0};
 // Each car starts a third of a cycle in, so a bank is never in lockstep.
 let t=(tSec+i*cycle/3)%cycle; if(t<0)t+=cycle;
 const base=f0*s.height,rise=span*s.height;
 let u,dir;
 if(t<dwell){u=0;dir=0}
 else if(t<dwell+travel){u=(t-dwell)/travel;dir=1}
 else if(t<2*dwell+travel){u=1;dir=0}
 else {u=1-(t-2*dwell-travel)/travel;dir=-1}
 return{z:base+u*rise,zone:z,cycle,travel,base,top:base+rise,dir,
        atFloor:t<dwell||t>=2*dwell+travel};
}
/* ── the core as a scene ──────────────────────────────────────────────────────
   The whole point of this module is that the core is a VOLUME INSIDE THE
   BUILDING, not a diagram beside it. So it has to be drawable in the same three
   dimensions as the tower it stands in, at the same projection, at true scale —
   and it has to be checkable while it is still numbers.

   coreScene() is that seam. It takes the model and the time, and returns a flat
   list of boxes and inclined solids in MODEL METRES — no canvas, no projection,
   no colours. app.js paints them with the same `path()` it paints the tower with,
   so the core cannot end up at a different scale or a different camera than the
   building around it: there is one `project` and both go through it.

   Everything the scene contains is claimed by another function in this file.
   The shafts come from shaftLayout, the bank from escLayout, the cars from
   carZ. Nothing here decides a dimension; it only decides what is solid and what
   is void. */

const box=(x0,y0,x1,y1,z0,z1)=>({x0,y0,x1,y1,z0,z1});
/* An escalator flight is not a box: its top face is the incline and its soffit
   hangs below it by the truss depth. A box would draw a 4.1 m tall slab lying on
   its side, which is a ramp lying flat — the one thing an escalator never is. */
const ramp=(x0,x1,y0,y1,z0,z1,deep)=>({x0,x1,y0,y1,z0,z1,z1b:z0-deep,deep});

/* What the scene contains, and the height it runs to. `lo`/`hi` are the height
   WINDOW: the core is a 600 m column and at any legible scale you are looking at
   a window of it, so the window is an input to what is drawn rather than
   something the reader discovers by scrolling. */
export function coreScene(s,core,tSec=0,win=null){
 const M=CORE3,c=s.core/2,total=core.services.rise||s.floors*s.height;
 const lo=win?.lo??0, hi=win?.hi??total;
 const S=shaftLayout(s,core.lift),E=escLayout(s);
 const solids=[],zones=[],cars=[],notes=[];

 /* The core's own walls. Drawn as four upright slabs the height of the window,
    because a core with no drawn walls is a hole in a drawing and the reader
    cannot tell it from the lift shafts, which ARE holes. */
 const wt=M.wall;
 for(const b of [
  box(-c,-c,c,-c+wt,lo,hi),            // south
  box(-c,c-wt,c,c,lo,hi),              // north
  box(-c,-c+wt,-c+wt,c-wt,lo,hi),      // west
  box(c-wt,-c+wt,c,c-wt,lo,hi)          // east
 ])solids.push({b,kind:'wall'});

 /* The slab the core is cut through, at the level the reader has selected. It
    is the same datum drawPlan() marks, so the two views agree on which floor
    they are talking about. */
 const slab=s.floors>1?+((lo+hi)/2/s.height).toFixed(2)*s.height:lo;

 /* Each shaft is a VOID — outline only, no fill, because the shaft is the space
    a car runs in and filling it would bury the car. Its outline is drawn over
    the window, not the whole height, and it stops at the top of the zone it
    serves: a bank that physically stopped at its zone boundary is the only way
    to make "a car never crosses a zone boundary" true on the model. */
 for(const sh of S.shafts){
  const zf=core.lift.zoneFloors;
  const zTop=Math.min(hi,Math.min(s.floors,(sh.zone+1)*zf)*s.height);
  if(zTop<=lo)continue;
  solids.push({b:box(sh.x0,sh.y0,sh.x1,sh.y1,lo,zTop),kind:'shaft'});
  zones.push({zone:sh.zone,base:sh.zone*zf*s.height,top:zTop});
 }

 /* The car, at its height this instant. Its floor is at carZ and it stands one
    car height tall, clamped to the top of its zone so the topmost car is not
    drawn poking through the roof of its own shaft. */
 const ch=Math.min(s.height,2.4);
 for(let i=0;i<S.shafts.length;i++){
  const c0=carZ(s,core.lift,i,tSec);
  if(c0.z+ch<lo||c0.z>hi)continue;
  const k=S.shafts[i].car;
  const z=Math.max(lo,Math.min(c0.z,hi-ch));
  cars.push({b:box(k.x,k.y,k.x+k.w,k.y+k.d,z,z+ch),
   zone:c0.zone,dir:c0.dir,floor:Math.round(z/s.height)});
 }

 /* The stair: a full-height void, drawn so the escape route is visible next to
    the lifts. A core drawing with no stair in it reads as a lift shaft with
    plumbing in it. */
 solids.push({b:box(S.stair.x0,S.stair.y0,S.stair.x1,S.stair.y1,lo,hi),kind:'stair'});

 /* The bank. Its segments are real inclines in metres; the renderer draws the
    true 30° rather than anything the sheet's proportions imply. */
 for(const u of E.units){
  if(u.z1<=lo||u.z0>=hi)continue;
  solids.push({b:ramp(u.x0,u.x1,u.y0,u.y1,Math.max(u.z0,lo),Math.min(u.z1,hi),1.2),kind:'escalator'});
 }

 /* The services risers are not modelled as geometry — they are a water and
    drainage calculation, and drawing a pipe nobody sized would claim more than
    the calculation does. The section drawing carries them for that reason. */

 return{solids,cars,zones,stair:S.stair,slab:Math.max(lo,Math.min(slab,hi-ch)),
  window:{lo,hi,total},short:S.short,wanted:S.wanted,shafts:S.count,
  reach:E.reach,escUnits:E.units.length?Math.ceil(E.units.length*2):0,notes};
}
