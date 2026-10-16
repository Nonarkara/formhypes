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

   The cars move at the stated 1.6 m/s. A car really does take forty-odd seconds
   to cross a zone, and showing that is more use than a fast car would be — the
   figure states the travel time, so the slowness reads as true and not broken. */

export const CORE_METHOD={
 // CIBSE Guide D, restated in ISO 8100-32:2020 Table 2 — office up-peak
 upPeakShare:0.12, intervalMax:30, areaPerPerson:11,
 carSpeed:1.6, carAccel:1.0, doorTime:2.0, carLoad:0.8, carRated:13, transferTime:1.2,
 // ASPE / UPC — pressure at a fixture, and static head per foot of rise
 maxFixturePsi:80, minFixturePsi:15, psiPerFoot:0.433,
 // CIB W062 / BS EN 12056-2 / NBC 2016 Part 9 — drainage
 stackStoreys:19, velocityBreakFloors:10, velocityBreakOver:30,
 du:{wc:6,urinal:2,basin:1}, du150:960, highRiseStackMM:150
};

export const CORE_SRC={
 lifts:'CIBSE Guide D; ISO 8100-32:2020',
 water:'ASPE / UPC — fixture pressure, static head 0.433 psi/ft',
 drains:'BS EN 12056-2; CIB W062; NBC 2016 Part 9'
};

const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

/* ── the calculations ───────────────────────────────────────────────────── */

/* One lift group sized on the CIBSE up-peak. `zoneFloors` is how many floors
   this group serves; the interval it achieves decides whether the zone is
   allowed to exist at all. */
function group(pop,zones,zoneFloors,tv,M){
 const P=M.carLoad*M.carRated;
 const H=zoneFloors/2, S=zoneFloors/2;
 const rt=2*H*tv+(S+1)*M.doorTime+2*P*M.transferTime;
 const perCar=300*P/rt;                      // persons per 5 min, one car
 const required=M.upPeakShare*pop/zones;    // persons per 5 min, this zone
 let cars=Math.max(1,Math.ceil(required/perCar));
 // Handling capacity alone gives the fewest cars that can carry the peak, and
 // therefore the worst possible interval. The guide asks for both, so keep
 // adding cars until the interval is met as well. Every extra car shortens it.
 while(rt/cars>M.intervalMax&&cars<40)cars++;
 return{zoneFloors,cars,rt,interval:rt/cars,perCar,required,P};
}

export function liftDesign(s,netArea){
 const M=CORE_METHOD;
 const pop=(netArea||0)/M.areaPerPerson;
 const tv=s.height/M.carSpeed+M.carSpeed/M.carAccel;
 // The zone count is a choice, not a derivation: about sixteen floors a group,
 // never more than four, never a zone under six floors. Bounding it matters —
 // an unbounded search will happily invent nine groups of one floor each to
 // chase an interval, and that is a core nobody could build.
 const maxZones=Math.max(1,Math.min(4,Math.floor(s.floors/6)));
 const zones=clamp(Math.round(s.floors/16),1,maxZones);
 const g=group(pop,zones,Math.ceil(s.floors/zones),tv,M);
 return{
  population:Math.round(pop),areaPerPerson:M.areaPerPerson,upPeakShare:M.upPeakShare,
  zones,zoneFloors:Math.ceil(s.floors/zones),carsPerZone:g.cars,cars:g.cars*zones,
  interval:+g.interval.toFixed(1),intervalMax:M.intervalMax,rt:Math.round(g.rt),
  handlePerCar:+g.perCar.toFixed(1),handleRequired:Math.round(g.required),
  carSpeed:M.carSpeed,carRated:M.carRated,
  // The one-way run at the drawn speed. tv is the stop-to-stop time used for
  // the traffic calculation; the car crosses a zone at full speed, and the
  // figure must not quote one number while the drawing shows another.
  travelTime:Math.round(g.zoneFloors*s.height/M.carSpeed)
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

export function coreOf(s,netArea){return{lift:liftDesign(s,netArea),services:servicesDesign(s)}}

/* ── the drawing ────────────────────────────────────────────────────────── */
export const VB={w:240,h:336,top:24,base:312};
const SHAFT=[14,58],SHAFT_W=40,STAIR=102,STAIR_W=30,BAY=142;
const PIPE={cw:150,drain:172,vent:194,fire:216};
const CAR_W=SHAFT_W-6;

const f2=v=>(+v).toFixed(2);

export function coreSVG(s,core,{floor=1,lang='en'}={}){
 const rise=core.services.rise||s.floors*s.height;
 const k=(VB.base-VB.top)/rise;                 // drawing units per metre
 const y=z=>f2(VB.base-z*k);
 const topY=+y(rise),shaftH=f2(VB.base-topY);
 let g='';
 const tracks=carTracks(s,core);

 g+=`<path d="M10 ${VB.base} H230" stroke="#191c1b" stroke-width="1.1"/>`;

 // Floor lines every eighth floor. The plate is not drawn: a section taken
 // through the core cuts no floor area, only the things standing inside it.
 for(let f=0;f<=s.floors;f+=8){
  const yy=y(f*s.height);
  g+=`<path d="M12 ${yy} H230" stroke="#cdd2ce" stroke-width=".5"/>`;
  g+=`<text x="9" y="${f2(+yy+3)}" text-anchor="end" fill="#7d8783" font-family="IBM Plex Mono,monospace" font-size="6.5">${f}</text>`;
 }
 g+=`<path d="M12 ${topY} H230" stroke="#191c1b" stroke-width=".8"/>`;

 // ── two shafts, and the stair beside them ───────────────────────────────
 for(const x of SHAFT)
  g+=`<rect x="${x}" y="${topY}" width="${SHAFT_W}" height="${shaftH}" fill="#f4f5f2" stroke="#8b918d" stroke-width=".6"/>`;
 g+=`<rect x="${STAIR}" y="${topY}" width="${STAIR_W}" height="${shaftH}" fill="none" stroke="#8b918d" stroke-width=".6"/>`;
 for(let f=1;f<s.floors;f++)
  g+=`<path d="M${STAIR+2} ${y(f*s.height)} L${STAIR+STAIR_W-2} ${y((f+1)*s.height)}" stroke="#c6ccc8" stroke-width=".45"/>`;

 // ── lift zones: a bracket per group, and a car that stays inside it ─────
 const zf=core.lift.zoneFloors, zn=core.lift.zones;
 const zoneBand=z=>{
  const f0=z*zf, f1=Math.min(s.floors,(z+1)*zf);
  return{ya:+y(f1*s.height), yb:+y(f0*s.height)};
 };
 for(let z=0;z<zn;z++){
  const {ya,yb}=zoneBand(z);
  g+=`<path d="M10 ${f2(yb)} V${f2(ya)} M10 ${f2(ya)} H13 M10 ${f2(yb)} H13" stroke="#f59e0b" stroke-width="1"/>`;
 }
 // Two shafts are drawn, so two cars, and each belongs to its own zone —
 // which is why they sit at different heights. The motion lives in the markup:
 // no loop to crash, no frames burned while the drawing is scrolled away.
 const still=motionOff();
 for(let i=0;i<SHAFT.length;i++){
  // zoneBand returns {ya,yb} — top and bottom of the zone in viewBox units,
  // where y grows downward, so yb is the bottom. It used to destructure a key
  // called `yBot` that the function does not return: the group was written as
  // translate(0,NaN), which SVG discards silently. The car then rendered at the
  // untransformed origin with no error anywhere, and the animateTransform ran
  // perfectly on a group that was never in its zone.
  const {yb:yBot}=zoneBand(clamp(i,0,zn-1));
  const t=tracks[i];
  g+=`<g id="core-car-${i}" transform="translate(0,${f2(yBot)})">`
   // The car sits ON its level, not across it: the rect was centred on the
   // anchor, so the ground-floor car hung half below the ground line.
   +`<rect x="${SHAFT[i]+3}" y="-7" width="${CAR_W}" height="7" fill="#fde9c4" stroke="#f59e0b" stroke-width=".9"/>`
   +`<path d="M${SHAFT[i]+6} -3.5 H${SHAFT[i]+SHAFT_W-6}" stroke="#f59e0b" stroke-width=".45"/>`
   +(still?'':carMotion(t.yBot,t.yTop,t.travel,t.dwell,i*7))
   +`</g>`;
 }

 // ── the services bay ────────────────────────────────────────────────────
 g+=`<rect x="${BAY}" y="${topY}" width="86" height="${shaftH}" fill="none" stroke="#c6ccc8" stroke-width=".5" stroke-dasharray="2 2"/>`;
 const pb=topY+6, pbe=VB.base-6;
 const flow=(x,cls)=>`<line x1="${x}" y1="${f2(pb)}" x2="${x}" y2="${f2(pbe)}" class="${cls}"/>`;
 g+=flow(PIPE.cw,'core-flow-up')+flow(PIPE.drain,'core-flow-down')
  +flow(PIPE.vent,'core-flow-air')+flow(PIPE.fire,'core-flow-up');
 const tag=(x,y,t)=>`<text x="${x+4}" y="${f2(y+2.4)}" fill="#585e5b" font-family="IBM Plex Mono,monospace" font-size="6">${t}</text>`;
 g+=tag(PIPE.cw,pb+10,'CWS')+tag(PIPE.drain,pb+10,'DRAIN')
  +tag(PIPE.vent,pb+10,'VENT')+tag(PIPE.fire,pb+10,'FIRE');

 // Break-pressure tanks: the CWS is re-pressurised at the head of each zone,
 // which is why a tall building has more than one pump set.
 const svc=core.services,zw=svc.zoneFloors;
 for(let z=1;z<svc.zones;z++){
  const f=z*zw; if(f>=s.floors)break;
  const yy=+y(f*s.height);
  g+=`<path d="M${PIPE.cw-4} ${f2(yy)} h8 l-4 -4.5 Z" fill="#191c1b"/>`;
  g+=`<path d="M${PIPE.cw} ${f2(yy)} H230" stroke="#f59e0b" stroke-width=".5" stroke-dasharray="1 2"/>`;
 }
 // Velocity breakers: four 45° bends every ten floors on a tall stack, drawn as
 // the offset they actually are rather than as a note in the schedule.
 if(svc.velocityBreakers){
  const vb=CORE_METHOD.velocityBreakFloors;
  for(let k=1;k<=svc.velocityBreakers;k++){
   const yy=+y(Math.min(s.floors,k*vb)*s.height);
   // A fitting, not an arrowhead. The first attempt drew a chevron pointing
   // into the pipe; on a line whose flow already animates downward that read
   // as a flow arrow, and told the reader the wrong thing twice over.
   g+=`<rect x="${PIPE.drain-3}" y="${f2(yy-6)}" width="6" height="12" fill="#f4f5f2" stroke="#8b918d" stroke-width=".6"/>`;
  }
 }

 // The selected level, from the same slider that drives the plan above.
 const zf2=clamp(floor-1,0,s.floors-1)*s.height, fy=+y(zf2);
 // The level tag rides in the stair box, not at the right edge: at x=214 it
 // sat directly on the FIRE riser and hid it exactly when it mattered.
 g+=`<g id="core-marker">`
  +`<path d="M10 ${f2(fy)} H230" stroke="#f59e0b" stroke-width="1.2"/>`
  +`<rect x="${STAIR+6}" y="${f2(fy-4)}" width="18" height="8" fill="#f59e0b"/>`
  +`<text x="${STAIR+15}" y="${f2(fy+2.2)}" text-anchor="middle" fill="#191c1b" font-family="IBM Plex Mono,monospace" font-size="6">${floor}</text>`
  +`</g>`;

 return `<svg id="section" viewBox="0 0 ${VB.w} ${VB.h}" role="img" aria-label="${CORE_ARIA[lang]||CORE_ARIA.en}" class="coresec">${g}</svg>`;
}

/* ── the motion ────────────────────────────────────────────────────────────
   Declarative, on purpose. An earlier version drove the cars from a
   requestAnimationFrame loop: correct on paper, and it failed silently in the
   browser — one throw inside the loop killed the chain for good, nothing
   restarted it, and the cars sat at the lobby while the drawing looked fine.
   The risers already animate in CSS. The cars now animate the same way, in the
   markup, with <animateTransform>: no loop to die, no work while the drawing
   is scrolled away, and the motion is exactly the one computed above — run up,
   dwell, run down, dwell, at the stated 1.6 m/s.

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
 const speed=CORE_METHOD.carSpeed*k,zf=core.lift.zoneFloors;
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