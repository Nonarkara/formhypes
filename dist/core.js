/* ── the core, in section, with its services running ───────────────────────
   A plan shows where the core is. A section shows what it does, and the answer
   is that almost everything in it moves: cars up and down, clean water up,
   wastewater down, air up the vent, fire water up to the sprinklers. Drawing it
   still is a lie of omission — it looks like a cupboard.

   So this is a SECTION, at the model's own rise and floor count, with the
   moving parts actually moving. Every quantity comes from a published method
   and the method is named on the figure. Where something is an assumption it
   says so rather than borrowing authority it has not got.

   THE LIFTS — CIBSE Guide D, and ISO 8100-32:2020 Table 2 which restates it:
   an office is sized on the up-peak, at 12% of the building population moving
   in five minutes, against an up-peak interval of no more than 30 seconds.
   CIBSE Guide D puts an office population at 10–12 m² of net area per person;
   11 is the midpoint used here. Round trip time follows the classical
   RTT = 2·H·tv + (S+1)·ts + 2·P·tp, with UPPHC = 300·L·P / RTT and
   UPPINT = RTT / L. One group cannot serve forty-eight floors: its round trip
   alone would blow the 30 second interval, which is why real towers divide the
   shafts into vertical zones, each with its own group. The zones are computed
   here, not drawn as decoration, and a car never leaves the zone it belongs to
   — because it cannot.

   THE WATER — a fixture may not be fed more than about 80 psi, and standing
   head changes 0.433 psi per foot of rise (ASPE and the model plumbing codes;
   Steele gives 70 psi as a prudent working maximum). Hold a workable residual
   at the top of each zone and the zone height follows. That is the
   break-pressure tank on the drawing, and the number of them is arithmetic.

   THE DRAINS — BS EN 12056-2 and CIB W062: a DN 100 stack runs about 19 storeys
   of two bathrooms, and practice commonly limits one stack to somewhere between
   15 and 20 levels. A stack over 30 storeys needs velocity breakers — four 45°
   bends — every 10 floors, or the flow separates inside it. Vent stacks are
   required wherever there are five or more branch intervals, and every floor is
   one. Stack size is then set from discharge units (NBC 2016 Part 9 gives
   WC 6, urinal 2, washbasin 1; a 150 mm high-rise commercial stack carries
   about 960 discharge units).

   The cars move at the rated speed liftSpeed() gives for the rise, and the
   figure states the travel time, so what the drawing shows and what the
   numbers say are the same car.

   THE ESCALATORS — EN 115-1. A section that showed only lifts would quietly
   imply that lifts are how everybody gets in. They are not: an escalator serves
   the podium and nothing above it, and where its reach stops is a fact about
   the size of the core. See escalatorDesign(). */

import {podiumReach,escRun} from './core3d.js?v=702aed5396';
import {sheet,cut,beyond,leader,head,dim,rule,txt,ground,flow} from './drafting.js?v=895b148bec';

export const CORE_METHOD={
 // CIBSE Guide D, restated in ISO 8100-32:2020 Table 2 — office up-peak
 upPeakShare:0.12, intervalMax:30, areaPerPerson:11,
 carSpeed:1.6, carAccel:1.0, doorTime:2.0, carLoad:0.8, carRated:13, transferTime:1.2,
 // ASPE / UPC — pressure at a fixture, and static head per foot of rise
 maxFixturePsi:80, minFixturePsi:15, psiPerFoot:0.433,
 // CIB W062 / BS EN 12056-2 / NBC 2016 Part 9 — drainage
 stackStoreys:19, velocityBreakFloors:10, velocityBreakOver:30,
 du:{wc:6,urinal:2,basin:1}, du150:960, highRiseStackMM:150,
 // EN 115-1 — escalators. Inclination is capped at 30°, and 35° is allowed only
 // where the rise does not exceed 6 m at no more than 0.5 m/s. Capacity is the
 // EN 115-1 planning figure for a 1000 mm step at 0.5 m/s, which the KONE and
 // Schindler planning guides both reproduce as 6,000 persons/hour.
 escInclMax:30, escRiseAtMaxIncl:6, escPerMin:100, escSpeed:0.5, escStepMM:1000
};

export const CORE_SRC={
 lifts:'CIBSE Guide D; ISO 8100-32:2020',
 water:'ASPE / UPC — fixture pressure, static head 0.433 psi/ft',
 drains:'BS EN 12056-2; CIB W062; NBC 2016 Part 9',
 escalators:'EN 115-1 — 30° inclination, 6 m rise at 35°; 1000 mm step at 0.5 m/s = 100 persons/min'
};

const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

/* ── the calculations ───────────────────────────────────────────────────── */

/* One lift group sized on the CIBSE up-peak. `zoneFloors` is how many floors
   this group serves; the interval it achieves decides whether the zone is
   allowed to exist at all. */
function group(pop,zones,zoneFloors,tv,M,ts=M.doorTime){
 const P=M.carLoad*M.carRated;
 const H=zoneFloors/2, S=zoneFloors/2;
 const rt=2*H*tv+(S+1)*ts+2*P*M.transferTime;
 const perCar=300*P/rt;                      // persons per 5 min, one car
 const required=M.upPeakShare*pop/zones;    // persons per 5 min, this zone
 let cars=Math.max(1,Math.ceil(required/perCar));
 // Handling capacity alone gives the fewest cars that can carry the peak, and
 // therefore the worst possible interval. The guide asks for both, so keep
 // adding cars until the interval is met as well. Every extra car shortens it.
 while(rt/cars>M.intervalMax&&cars<40)cars++;
 return{zoneFloors,cars,rt,interval:rt/cars,perCar,required,P};
}

/* Rated speed for the rise. The Core desk used 1.6 m/s at every height, which is
   a low-rise speed: a 200 m tower sized that way needs twice the cars a real one
   has, and the Lifts lab disagreed with it. Rule of thumb, stated as such: a car
   reaches the top of its run in about 30 s, rounded to 0.5 m/s, never below the
   1.6 m/s low-rise floor and never above 10 m/s. One rule for the Core desk, its
   drawings, the evacuation lifts and the Lifts lab. */
export const SPEED_TOP_RUN=30;
export function liftSpeed(rise){return clamp(Math.round((Number.isFinite(rise)?rise:0)/SPEED_TOP_RUN*2)/2,CORE_METHOD.carSpeed,10)}
export function liftDesign(s,netArea){
 const M=CORE_METHOD;
 const pop=(netArea||0)/M.areaPerPerson;
 const v=liftSpeed(s.floors*s.height);
 // CIBSE Guide D split: t_v is one floor at rated speed; acceleration belongs to
 // the stop, so t_s is a one-floor flight minus t_v, plus the doors. Charging
 // v/a on every floor travelled (as before) was harmless at 1.6 m/s and
 // doubled the round trip at 6 m/s.
 const tv=s.height/v;
 const flight=s.height>=v*v/M.carAccel?s.height/v+v/M.carAccel:2*Math.sqrt(s.height/M.carAccel);
 const ts=flight-tv+M.doorTime;
 // The zone count is a choice, not a derivation: about sixteen floors a group,
 // never more than four, never a zone under six floors. Bounding it matters —
 // an unbounded search will happily invent nine groups of one floor each to
 // chase an interval, and that is a core nobody could build.
 const maxZones=Math.max(1,Math.min(4,Math.floor(s.floors/6)));
 const zones=clamp(Math.round(s.floors/16),1,maxZones);
 const g=group(pop,zones,Math.ceil(s.floors/zones),tv,M,ts);
 return{
  population:Math.round(pop),areaPerPerson:M.areaPerPerson,upPeakShare:M.upPeakShare,
  zones,zoneFloors:Math.ceil(s.floors/zones),carsPerZone:g.cars,cars:g.cars*zones,
  interval:+g.interval.toFixed(1),intervalMax:M.intervalMax,rt:Math.round(g.rt),
  handlePerCar:+g.perCar.toFixed(1),handleRequired:Math.round(g.required),
  carSpeed:v,carRated:M.carRated,tv:+tv.toFixed(3),ts:+ts.toFixed(3),
  // The one-way run at the drawn speed. tv is the stop-to-stop time used for
  // the traffic calculation; the car crosses a zone at full speed, and the
  // figure must not quote one number while the drawing shows another.
  travelTime:Math.round(g.zoneFloors*s.height/v)
 };
}

export function servicesDesign(s){
 const M=CORE_METHOD;
 const rise=s.floors*s.height;
 // The zone height is the pressure window converted to metres. Not a round
 // number, because the pressure window is not a round number.
 const headWindow=(M.maxFixturePsi-M.minFixturePsi)/M.psiPerFoot*0.3048;
 const zones=Math.max(1,Math.ceil(rise/headWindow));
 const stacks=Math.max(1,Math.ceil(s.floors/M.stackStoreys));
 // Two WCs and two basins a floor at the office fixture rates, summed over the
 // building. Discharge units are what size the stack, not floor count.
 const duPerFloor=M.du.wc*2+M.du.basin*2;
 return{
  rise:+rise.toFixed(1),zoneHead:+headWindow.toFixed(1),zones,
  zoneFloors:Math.ceil(s.floors/zones),
  stacks,stackMM:s.floors>M.velocityBreakOver?M.highRiseStackMM:100,
  velocityBreakers:s.floors>M.velocityBreakOver
   ? Math.max(0,Math.floor(s.floors/M.velocityBreakFloors)-1):0,
  ventStacks:stacks,duPerFloor,duTotal:duPerFloor*s.floors,stackDU:M.du150
 };
}

export function coreOf(s,netArea,occupied){
 return{lift:liftDesign(s,netArea),services:servicesDesign(s),
        escalator:escalatorDesign(s,netArea,occupied)};
}

/* ── the escalators ──────────────────────────────────────────────────────────
   An escalator is not a lift that happens to be inclined, and the difference is
   the whole point of drawing them. A lift can be bought for any rise. An
   escalator runs at 30° (EN 115-1), so a 6 m rise already costs 10.39 m of
   escalator laid end to end — and because flights stack in plan they do not
   overlap. The core is square. So the reach of an escalator bank is decided by
   the core's own size: a 14 m core reaches one level, not two.

   That is a finding about the building rather than about the drawing, and it is
   the answer to the question people actually ask of a core, which is not "how
   many lifts" but "how do people get from the street to the lobby and the first
   amenity floor without queuing". Above the escalator's reach there is nothing
   but the lift groups — which is why they are divided into zones at all.

   The count is then arithmetic on the up-peak, on the same population and the
   same 12% that sized the lifts: the bank moves the people going up to the
   podium it reaches, and each unit moves escPerMin of them in the same five
   minutes. Units are counted in pairs, because an escalator runs one way and a
   bank with no down unit is a mistake, not a saving. */
export function escalatorDesign(s,netArea,occupied){
 const M=CORE_METHOD,reach=podiumReach(s);
 const levels=Math.max(1,reach.reach);
 // netArea is the WHOLE building's rentable, so the podium's share has to come
 // from a per-floor figure. Treating the total as one floor's area overstated the
 // podium population by the floor count and produced a bank six times too big —
 // which is the arithmetic equivalent of drawing a lift hall for a skyscraper on
 // the strength of its annual footfall.
 const served=Math.max(1,occupied||s.floors||1);
 const perFloor=(netArea||0)/served;
 const population=perFloor*Math.min(levels,Math.max(1,served))/M.areaPerPerson;
 const demand=M.upPeakShare*population;          // persons, in the 5-minute up-peak
 const capacity=M.escPerMin*5;                    // one unit, over the same 5 minutes
 const up=Math.max(1,Math.ceil(demand/capacity));
 return{
  levels,rise:+(levels*s.height).toFixed(1),
  population:Math.round(population),demand:Math.round(demand),
  perUnit:capacity,up,down:up,units:up*2,handled:up*capacity,
  stepMM:M.escStepMM,speed:M.escSpeed,incl:M.escInclMax,
  flights:reach.flights,run:reach.runOne,available:reach.available,
  coreForNext:reach.coreForNext,nextLevels:reach.nextLevels,blocked:reach.blocked
 };
}

/* ── the drawing ──────────────────────────────────────────────────────────
   Rebuilt on the same vocabulary as the Assembly details, because it is the
   same kind of drawing and the old one failed for the same reason: no poché, so
   the shaft walls, the stair and the risers were all the same hairline in the
   same grey, and the sheet read as a set of parallel lines rather than a core
   you could read the construction off.

   Each of these is a standard rather than a preference:
     · the walls the section CUTS are poched as concrete; everything seen PAST
       the cut plane is outline only. That distinction is the whole difference
       between a section and a diagram, and it is why poché has to exist.
     · the ground line is drawn, with earth below it. The core goes below grade;
       the old sheet stopped dead at 0 m and implied the building was founded on
       nothing.
     · the risers are annotated on leaders with dot terminators, staggered,
       rather than tagged in a row of bare capitals.
     · zone heights are dimensioned with slash terminators, on the distance the
       dimension actually measures.
     · the escalator is drawn, because a core showing only lifts quietly implies
       that lifts are how everybody gets in. They are not, and where the
       escalator's reach stops is a fact about the size of THIS core. */
export const VB={w:240,h:336,top:24,base:312};
const SHAFT=[14,58],SHAFT_W=40,STAIR=102,STAIR_W=30,BAY=142;
const PIPE={cw:150,drain:172,vent:194,fire:216};
const CAR_W=SHAFT_W-6;

/* Riser names stay in Latin in every language, because that is what is etched on
   the pipe. Everything a reader has to understand is translated. */
const SEC={
 en:{esc:'Escalator',shaft:'Lift shaft',stair:'Escape stair',car:'Lift car',
     cw:'cold water up',dr:'drainage down',ve:'vent',fi:'fire main',
     grade:'ground',tank:'break-pressure tank',brk:'velocity breaker',plate:'floor beyond'},
 th:{esc:'บันไดเลื่อน',shaft:'ช่องลิฟต์',stair:'บันไดหนีไฟ',car:'รถลิฟต์',
     cw:'น้ำดันขึ้น',dr:'ระบายลง',ve:'ระบายอากาศ',fi:'ท่อดับเพลิง',
     grade:'ระดับดิน',tank:'ถังลดความดัน',brk:'ตัวหักความเร็ว',plate:'พื้นนอกแกน'},
 zh:{esc:'自动扶梯',shaft:'电梯井',stair:'疏散楼梯',car:'电梯轿厢',
     cw:'冷水上行',dr:'排水下行',ve:'通气',fi:'消防立管',
     grade:'地面',tank:'减压水箱',brk:'消能弯',plate:'核心筒外楼板'}
};

const f2=v=>(+v).toFixed(2);

/* ── geometry the drawing is measured from ───────────────────────────────
   The field is 240 wide and the core has to fill it, so the wall thicknesses
   here are the SAME 0.3 m the model charges area to and measures daylight from,
   converted through the same scale as everything else. A section that drew its
   walls at a different thickness from the model would be a drawing of a
   different building. */
const WALL=0.30;
export function coreSVG(s,core,{floor=1,lang='en'}={}){
 const L=SEC[lang]||SEC.en;
 const rise=core.services.rise||s.floors*s.height;
 const k=(VB.base-VB.top)/rise;                 // drawing units per metre
 const y=z=>f2(VB.base-z*k);
 const topY=+y(rise);
 const E=core.escalator||{levels:1,units:2,up:1,down:1,rise:4};
 const tracks=carTracks(s,core);
 let g='';

 /* The horizontal layout, stated once so the walls and the voids cannot drift
    apart. This is not a to-scale section across: a 14 m core and a 129 m tower
    cannot share one horizontal scale. What IS to scale is the ESCALATOR, whose
    inclination the sheet claims and therefore has to draw honestly — see below.
    Left to right: outer wall, shaft, wall, shaft, wall, stair, wall, bay. */
 const X={w0:6,w1:12,s1:52,w2:58,s2:98,w3:104,st:104,stEnd:132,w4:136,
        eb:136,eEnd:184,w5:188,bay:188,far:232};
 const VOID=[[X.w1,X.s1],[X.w2,X.s2],[X.st,X.stEnd],[X.eb,X.eEnd]];
 g+=ground(X.w0,VB.base,X.far-X.w0);

 /* ── poché ──────────────────────────────────────────────────────────────
    The walls this section CUTS, poched as concrete. The single strongest cue in
    the discipline: it is how the eye separates "a 300 mm wall" from "a void you
    could put a car in", without reading a word. Everything PAST the cut plane
    stays outline-only, because filling it would be a lie about what is beyond. */
 const wall=(a,b)=>cut(`M${a} ${topY} H${b} V${VB.base} H${a} Z`,'conc');
 g+=wall(X.w0,X.w1)+wall(X.s1,X.w2)+wall(X.s2,X.w3)+wall(X.stEnd,X.w4)+wall(X.eEnd,X.w5);
 for(const [a,b] of VOID)g+=beyond(`M${a} ${topY} H${b} V${VB.base} H${a} Z`,.7);

 // Level lines. The plate is beyond the cut and stays an outline.
 // A level is drawn every `step` floors, and the step is chosen so two numbers
 // can never be closer than they are tall. Fixing it at eight reads at 29
 // levels and collides at 129 — where eight floors are four and a half units
 // apart, and the resolver responds by stacking the labels into a tidy column
 // that no longer points at the line it names.
 const step=Math.max(4,Math.ceil(14/(Math.max(s.height,.5)*k)/2)*2);
 for(let f=0;f<=s.floors;f+=step){
  const yy=y(f*s.height);
  g+=beyond(`M${X.bay-4} ${yy} H${X.far}`,.5);
  // A level number is a DATUM, not annotation: it belongs beside its own line,
  // and it is fixed for the same reason a dimension label is. Letting the
  // collision pass move one is how a stack of tidy, evenly-spaced numbers ends
  // up printed across the head of the drawing, none of them beside the line it
  // names. The step is chosen so two numbers can never be closer than they are
  // tall, which is what makes fixing them safe rather than merely tidy.
  g+=txt(X.w0-3,yy+3,String(f),{anchor:'end',size:7.5,fixed:true});
 }
 g+=beyond(`M${X.w0} ${topY} H${X.far}`,.8);

 /* ── the escape stair ──────────────────────────────────────────────────
    Flights running one way with a landing at every level. Drawing both
    diagonals made a scissor stair, and a scissor stair in a high-rise core is
    a thing that does not exist — the whole reason the second core was invented. */
 // Flights are drawn where the stair is READ, which is not every level. At 129
 // levels a sawtooth of 129 flights is a texture, not a stair, and it hides the
 // thing the section is actually about. Every other level keeps the pitch and
 // the rhythm without burying the drawing in ink.
 // Same rule as the level numbers: the pitch comes from the geometry, so a
 // flight can never be closer to the one below it than the drawing can resolve.
 const every=Math.max(1,Math.ceil(13/(Math.max(s.height,.5)*k)));
 for(let f=0;f<s.floors;f+=every){
  const y0=+y(f*s.height),y1=+y(Math.min(s.floors,(f+1)*every)*s.height);
  g+=beyond(`M${X.st+2} ${f2(y0)} L${X.stEnd-2} ${f2(y1)}`,.4);
  g+=beyond(`M${X.st+2} ${f2(y1)} H${X.stEnd-2}`,.4);        // the landing
 }

 /* ── the escalator, at the angle the sheet claims ───────────────────────
    EN 115-1 allows 30°. The run is computed in METRES from the rise and then
    converted through the VERTICAL scale, so the angle the reader measures off
    the sheet is the angle the standard permits. An escalator drawn to the
    sheet's own horizontal proportions would come out near vertical, and would
    be claiming an inclination that cannot be built.

    The comb plate — the flat run of treads where the incline meets the floor —
    is what makes it read as an escalator rather than as a ramp. */
 const escM=Math.max(0.5,E.levels*s.height),escU=escRun(escM)*k;
 const nUnits=Math.max(1,Math.min(4,E.units));
 const lanes=Math.min(4,(X.eEnd-X.eb-6)/nUnits);
 const ey0=VB.base,ey1=+y(escM);
 const runU=Math.min(escU,X.eEnd-X.eb-lanes*nUnits);
 for(let i=0;i<nUnits;i++){
  const x0=X.eb+2+i*lanes;
  if(x0+lanes+runU>X.eEnd-2)break;
  g+=beyond(`M${f2(x0)} ${f2(ey0)} H${f2(x0+lanes)} L${f2(x0+lanes+runU)} ${f2(ey1)} H${f2(x0+runU)} Z`,1.1);
  g+=beyond(`M${f2(x0+lanes)} ${f2(ey0)} L${f2(x0+lanes+runU)} ${f2(ey1)}`,.7);   // the handrail
  g+=beyond(`M${f2(x0)} ${f2(ey0)} H${f2(x0+lanes*.8)}`,.55);
  g+=beyond(`M${f2(x0+runU)} ${f2(ey1)} H${f2(x0+lanes+runU)}`,.55);
  g+=head(x0+lanes+runU*.5,(ey0+ey1)/2,'u',false);
 }
 g+=leader(X.eb+lanes,ey0-1,X.eb-6,VB.base+14,L.esc);
 // The inclination is dimensioned at the angle it is drawn, because that is the
 // number EN 115-1 actually caps and the one a reviewer will check.
 if(E.levels>0)
  g+=dim(X.eb+1,ey0,X.eb+1+runU,ey1,E.incl+'\u00b0',0);

 /* ── the lift zones ────────────────────────────────────────────────────
    The bracket IS the group; the car inside it never crosses it, because its
    own group cannot reach there. */
 const zf=core.lift.zoneFloors,zn=core.lift.zones;
 const band=z=>{const f0=z*zf,f1=Math.min(s.floors,(z+1)*zf);
  return{ya:+y(f1*s.height),yb:+y(f0*s.height)}};
 for(let z=0;z<zn;z++){
  const{ya,yb}=band(z);
  g+=rule(X.w0-4,yb,X.w0-4,ya,{c:'var(--accent)',w:1})
   +rule(X.w0-4,ya,X.w1-1,ya,{c:'var(--accent)',w:1})
   +rule(X.w0-4,yb,X.w1-1,yb,{c:'var(--accent)',w:1});
 }
 // Two shafts are drawn, so two cars — one per group, which is why they sit at
 // different heights. The motion is declarative: no loop to crash, no frames
 // burned while the drawing is scrolled away.
 const still=motionOff();
 for(let i=0;i<2;i++){
  const{yb:yBot}=band(clamp(i,0,zn-1)),t=tracks[i],x=X.w1+i*(X.s2-X.s1);
  g+=`<g id="core-car-${i}" transform="translate(0,${f2(yBot)})">`
   +beyond(`M${x+4} -6.5 h${CAR_W} v6.5 h${-CAR_W} Z`,.8)
   +cut(`M${x+4} -1.4 h${CAR_W} v1.4 h${-CAR_W} Z`,'seal')
   +(still?'':carMotion(t.yBot,t.yTop,t.travel,t.dwell,i*7))
   +`</g>`;
 }

 /* ── the services bay ──────────────────────────────────────────────────
    Annotated on leaders with dot terminators, staggered by the layout pass,
    rather than tagged in a row of bare capitals — a row of capitals is a
    legend, and a legend is not annotation. */
 const pb=topY+3,pbe=VB.base-3;
 for(const x of [PIPE.cw,PIPE.drain,PIPE.vent,PIPE.fire])g+=flow(`M${x} ${f2(pb)} V${f2(pbe)}`,x===PIPE.vent?"core-flow-air":x===PIPE.drain?"core-flow-down":"core-flow-up");
 g+=head(PIPE.cw,pbe,'u',true)+head(PIPE.fire,pbe,'u',true)+head(PIPE.drain,pb,'d',true);
 for(const[x,t]of[[PIPE.cw,'CWS'],[PIPE.drain,'DRAIN'],[PIPE.vent,'VENT'],[PIPE.fire,'FIRE']])
  g+=leader(x,pb+8,x+2,pb-1,t,{size:7.5});

 const svc=core.services,zw=svc.zoneFloors;
 for(let z=1;z<svc.zones;z++){
  const f=z*zw; if(f>=s.floors)break;
  const yy=+y(f*s.height);
  g+=cut(`M${PIPE.cw-4} ${f2(yy-3.5)} h8 v3.5 h-8 Z`,'metal');
  g+=rule(PIPE.cw,yy,X.far,yy,{c:'var(--accent)',w:.5,dash:'1 2'});
  if(z===1)g+=leader(PIPE.cw,yy-1,X.far+8,yy-14,L.tank);
 }
 if(svc.velocityBreakers){
  const vbf=CORE_METHOD.velocityBreakFloors;
  for(let j=1;j<=svc.velocityBreakers;j++){
   const yy=+y(Math.min(s.floors,j*vbf)*s.height);
   g+=cut(`M${PIPE.drain-2.5} ${f2(yy-4.5)} h5 v9 h-5 Z`,'metal');
  }
  g+=leader(PIPE.drain,topY+(VB.base-topY)*.60,X.far+8,topY+(VB.base-topY)*.60+12,L.brk);
 }
 g+=leader(PIPE.drain,pbe-10,X.far+8,pbe-4,L.dr);
 g+=leader(X.st+(X.stEnd-X.st)/2,topY+(VB.base-topY)*.40,X.far+8,topY+(VB.base-topY)*.40+26,L.stair);
 g+=leader(X.w1+4,topY+(VB.base-topY)*.55,X.far+8,topY+(VB.base-topY)*.55-6,L.shaft,{on:true});
 g+=leader(X.w2+4,topY+(VB.base-topY)*.30,X.far+8,topY+(VB.base-topY)*.30-6,L.car,{on:true});

 // The selected level, from the same slider that drives the plan above.
 const fy=+y(clamp(floor-1,0,s.floors-1)*s.height);
 g+=`<g id="core-marker">`
  +rule(X.w0-5,fy,X.far,fy,{c:'var(--accent)',w:1.2})
  +cut(`M${X.bay+8} ${f2(fy-4)} h20 v8 h-20 Z`,'seal')
  +txt(X.bay+18,fy+2.4,String(floor),{on:true,anchor:'middle',size:7.5})
  +`</g>`;

 // Zone heights dimensioned with slash terminators, on the distance measured.
 if(zn>1){
  const b0=band(0);
  g+=dim(X.far+10,b0.ya,X.far+10,b0.yb,Math.round(zf*s.height)+' m');
 }

 /* The label goes into sheet(), not in as a string replace afterwards.

    The replace version produced `<svg role="img" aria-label="…" role="img"
    aria-hidden="true">` — two roles, and the long description hidden by the very
    attribute that was supposed to suppress a redundant node. It read fine, it
    validated fine, and the description no screen reader could reach. Which is
    the same lesson as the fixed viewBox, one attribute later. */
 return sheet(g,VB.w,VB.h,(CORE_ARIA[lang]||CORE_ARIA.en).replace(/"/g,'&quot;'))
  .replace('class="dsec"','class="dsec coresec"')
  .replace('<svg ','<svg id="section" ');
}

/* ── the motion ────────────────────────────────────────────────────────────
   Declarative, on purpose. An earlier version drove the cars from a
   requestAnimationFrame loop: correct on paper, and it failed silently in the
   browser — one throw inside the loop killed the chain for good, nothing
   restarted it, and the cars sat at the lobby while the drawing looked fine.
   The risers already animate in CSS. The cars now animate the same way, in the
   markup, with <animateTransform>: no loop to die, no work while the drawing
   is scrolled away, and the motion is exactly the one computed above — run up,
   dwell, run down, dwell, at the rated speed for the rise.

   The two phases are the honest ones. keyTimes carries the door dwells flat,
   so a car waits at each end instead of gliding through it. */

function carMotion(yBot,yTop,travel,dwell,begin){
 const c=2*travel+2*dwell,f=v=>(+v).toFixed(5);
 // Five stops, not six. The cycle closes exactly at c, so the last keyTime
 // would be 1 twice — and keyTimes must increase strictly. A duplicate there
 // makes the whole animation silently invalid: the cars simply sit still and
 // the drawing looks perfectly fine, which is the worst way for it to fail.
 const values=['0 '+f(yBot),'0 '+f(yBot),'0 '+f(yTop),'0 '+f(yTop),'0 '+f(yBot)].join(';');
 const keyTimes=[0,dwell/c,(dwell+travel)/c,(2*dwell+travel)/c,1].map(f).join(';');
 return '<animateTransform attributeName="transform" type="translate"'
  +' values="'+values+'"'
  +' keyTimes="'+keyTimes+'"'
  +' dur="'+f(c)+'s" begin="'+begin+'s" repeatCount="indefinite"/>';
}

/* Where a car may go, in drawing units, and how fast it gets there. */
export function carTracks(s,core){
 const rise=core.services.rise||s.floors*s.height,k=(VB.base-VB.top)/rise;
 const speed=(core.lift.carSpeed||CORE_METHOD.carSpeed)*k,zf=core.lift.zoneFloors;
 const dwell=CORE_METHOD.doorTime*2;
 return SHAFT.map((_,i)=>{
  const z=clamp(i,0,core.lift.zones-1);
  const f0=z*zf,f1=Math.min(s.floors,(z+1)*zf);
  const yTop=VB.base-f1*s.height*k,yBot=VB.base-f0*s.height*k;
  return{z,yTop,yBot,travel:Math.abs(yBot-yTop)/speed,dwell};
 });
}

/* A reader who has asked for less motion gets a section, not a loop: the cars
   sit at the floor they serve and the risers stop. The media query is read once
   at render time rather than watched, because the drawing is rebuilt whenever
   the model moves anyway. */
export const motionOff=()=>typeof matchMedia==="function"
 && matchMedia("(prefers-reduced-motion: reduce)").matches;

export const CORE_ARIA={
 en:'Vertical section through the building core: two lift shafts with cars running inside their own zoned group, a stair, and the services bay — cold water rising, drainage falling, vent and fire riser rising. Level lines every eight floors.',
 th:'ห้องแกนกลางในภาคตัดแนวตั้ง: ช่องลิฟต์สองช่อง รถลิฟต์วิ่งอยู่ในกลุ่มของตัวเอง บันได และช่องระบบ ท่อน้ำดันไปขึ้น ท่อระบายลง ท่อระบายอากาศและท่อดับเพลิงไปขึ้น เส้นระดับทุกแปดชั้น',
 zh:'建筑核心筒竖向剖面：两个电梯井，轿厢各在自己的分组内运行；楼梯；以及设备竖井——冷水上行、排水下行、通气和消防立管上行，每八层一道楼层线。'
};