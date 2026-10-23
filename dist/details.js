import {displayText,quantity,getPreferences} from './preferences.js?v=e134c381e7';
let drawingLang='en';
const txt=(x,y,text,...rest)=>rawTxt(x,y,displayText(text,drawingLang),...rest);
const leader=(x,y,tx,ty,text,...rest)=>rawLeader(x,y,tx,ty,displayText(text,drawingLang),...rest);
const dim=(x1,y1,x2,y2,text,...rest)=>rawDim(x1,y1,x2,y2,getPreferences().units==='imperial'&&/^\d+(?:\.\d+)?$/.test(String(text))?quantity(Number(text),'mm',drawingLang,2):displayText(text,drawingLang),...rest);
import {sheet,cut,beyond,leader as rawLeader,flow,head,dim as rawDim,brkV,cl,ground,txt as rawTxt,rule} from './drafting.js?v=5dc3f3c796';
/* ── how the wall is put together, as distinct from what it is made of ───────
   The material library answers "what is this face?". It cannot answer "how is
   this face held on, drained, fire-stopped and got to when it fails?" — and
   those are separate decisions with separate prices.

   So a DETAIL is not a third kind of cladding. A detail is an assembly: the
   slab edge, the drained cavity, the firestop, the threshold where a floor
   meets open air. Details are charged on their own named area, at their own
   rate, for their own reasons — assembly labour, cyclic testing and the access
   a maintenance team needs to reach the thing. They never multiply the material
   coefficient: that is already in the envelope reserve, and charging the same
   square metre twice under two headings would be exactly the kind of quiet
   arithmetic this file exists to prevent.

   THE STANDARDS NAMED BELOW ARE REAL AND CITED.
     ISO 9050:2003 / EN 410   light and solar transmittance of glazing
     ISO 10292 / EN 673       thermal transmittance of windows (U-factor)
     ASTM E2357              air leakage of air barrier assemblies.
                              Schedule ±25 Pa to ±300 Pa. Current codes set an
                              average air barrier limit of 0.2 L/(s·m²) @ 75 Pa.
     ASTM E2178              air permeance of materials; < 0.02 L/(s·m²) @ 75 Pa
                              is the threshold for qualifying AS an air barrier.
     ASTM E331               water penetration by uniform static air pressure
     ASTM E330               structural performance by uniform static air
                              pressure difference. Specified at 1.5× the design
                              wind, with permanent deformation of main framing
                              limited to 0.2 % of span.
     ASTM E2307              perimeter fire barrier continuity
     NFRC 100                fenestration U-factor rating

   The deflection convention stated here — L/175 for spans up to about 4.1 m,
   L/240 plus 6.4 mm beyond it, twice that for cantilevers, L/360 where a
   plaster or dry-wall finish is being bent — is the published curtain-wall
   practice that accompanies ASTM E330, not a limit the standard itself sets.

   IBC 2021 §504.3 governs the crown and is quoted in crowns.js, because it is
   the one rule in this set that can make a tower illegal.

   These are performance targets a manufacturer is asked to test to. They are
   not this project's specification, and no assembly here is a tested design. */

export const DETAILS={
 /* ── envelope · charged on the integrated skin area ───────────────────── */
 'drained-cavity':{label:'Pressure-equalised drained cavity',system:'envelope',
  standard:'ASTM E331 water penetration; ASTM E2357 air leakage',
  precedent:'the drained pressure plate, since the 1960s',
  air:0.15,uFactor:3.92,access:1.0,carbon:6,cycle:25,cost:1.00,
  draw:'cavity',
  reads:'The air seal is continuous on the inside and the pressure is held equal across it; water that gets past the outer seal is collected and drained out. Air that leaks is a heating and cooling bill, so the number is reported against the 0.2 L/(s·m²) code limit.'},
 'thermal-break':{label:'Thermally broken mullion',system:'envelope',
  standard:'ISO 10292 / EN 673 thermal transmittance; NFRC 100 rating',
  precedent:'the aluminium thermal break, standard practice since the 1970s',
  air:0.12,uFactor:1.85,access:0.8,carbon:9,cycle:30,cost:1.28,
  draw:'break',
  reads:'A low-conductivity isolator breaks the metal path from the outside pressure plate to the inside mullion frame. It roughly halves the U-factor against the same curtain wall without it, and it is the single largest thermal decision available on this wall.'},
 'slab-edge':{label:'Slab edge with slip restraint',system:'envelope',
  standard:'ASTM E330 deflection; the L/175 · L/240+6.4 mm convention',
  precedent:'Architectural Graphic Standards, slab-edge assemblies',
  air:0.18,uFactor:3.92,access:1.4,carbon:11,cycle:35,cost:1.12,
  draw:'slab',
  reads:'The weight-bearing bracket and the slip connection are different connections doing different jobs. The floor plate deflects, the frame drifts and the metal moves with temperature; the anchor has to permit all three while still carrying the wall. Beyond about 4.1 m the deflection allowance is L/240 plus 6.4 mm, not L/175.'},
 'firestop':{label:'Perimeter fire containment',system:'envelope',
  standard:'ASTM E2307 fire barrier continuity; NFPA 93 smoke control',
  precedent:'the tested slab-edge system, coordinated at every floor',
  air:0.20,uFactor:3.92,access:0.3,carbon:4,cycle:40,cost:0.86,
  draw:'fire',
  reads:'The gap between floors is the path a fire uses to climb the building. A tested system fills it without stopping the slab from moving, and it has to be coordinated with insulation, the backpan and the smoke seal. It costs almost nothing to maintain and a great deal to get wrong once.'},
 'diagrid-node':{label:'Diagrid node and glass bracket',system:'envelope',
  standard:'ASTM E330 at 1.5× design wind; Chen §3.2.2 on the Hearst tower',
  precedent:'Hearst Tower, San Francisco, 2002',
  air:0.16,uFactor:3.20,access:2.2,carbon:14,cycle:45,cost:1.34,
  draw:'node',
  reads:'The diagonal is both the frame and the grid, so the node is where the structure, the glass bracket and the fire line all meet in one place. Chen records that the diagrid eliminates the normal column grid inside — and that eliminating it has a price, which is why the frame rate is the figure to read beside this one.'},
 'outrigger-joint':{label:'Outrigger and mega-column',system:'envelope',
  standard:'ASTM E330 at 1.5× design wind; Chen §5.2.1 embedded systems',
  precedent:'Hong Kong and Shanghai Bank, 1985; John Hancock, Boston, 1970',
  air:0.17,uFactor:3.40,access:1.6,carbon:13,cycle:50,cost:1.18,
  draw:'outrigger',
  reads:'The outrigger is the compromise: take the column away from the plate and give the floor a wider clear span, by paying for a very deep element at three or four levels. It is the one detail in this library that is entirely structural, and it is why the column-free premium is a number the model can put a price on.'},

 /* ── crown · charged on the crown's own plan area ─────────────────────── */
 'parapet-coping':{label:'Parapet, coping and counterflashing',system:'crown',
  standard:'the drainage detail behind the face, not a single standard',
  precedent:'every roof edge in the trade',
  air:0.22,uFactor:1.10,access:0.9,carbon:7,cycle:40,cost:0.72,
  draw:'parapet',
  reads:'Water gets behind every wall face eventually. The coping is the part that decides whether it goes down the drain or into the structure, and the counterflashing is what stops it travelling sideways into the wall instead.'},
 'plant-screen':{label:'Louvred plant enclosure',system:'crown',
  standard:'free area for the equipment it has to serve',
  precedent:'louvre, Paris, 1983–89, carried into every plant screen since',
  air:0.30,uFactor:1.40,access:1.8,carbon:8,cycle:25,cost:0.88,
  draw:'screen',
  reads:'The enclosure is a heat exchanger. Blades cut the sun and the noise and let the equipment breathe; the free area they leave is the whole argument, and a screen specified for its look rather than its free area cooks the plant behind it.'},
 'mast-base':{label:'Crown post base',system:'crown',
  standard:'IBC 2021 §504.3 — a spire is not used for habitation or storage',
  precedent:'Petronas Towers, Kuala Lumpur, 1998',
  air:0.25,uFactor:1.20,access:2.6,carbon:15,cycle:60,cost:1.05,
  draw:'mast',
  reads:'The base of a post carries every load the post carries, plus wind from every direction with nothing behind it to break it. It is also the least accessible steelwork on the building, which is what the access figure is for.'},
 'aviation-mount':{label:'Obstruction light mount',system:'crown',
  standard:'aviation marking and obstruction lighting, applied per authority',
  precedent:'mandated wherever a tower is a hazard to aircraft',
  air:0.25,uFactor:1.20,access:4.0,carbon:2,cycle:12,cost:0.58,
  draw:'aviation',
  reads:'A light on the highest point and on the corners of the roof, on a bracket that survives being serviced by a roped technician in a wind. Four visits a year is not optimism; it is the reason the access rate on this row is the highest in the library.'},

 /* ── terrace · charged on the area given to open air ──────────────────── */
 'terrace-threshold':{label:'Threshold and waterproofing upstand',system:'terrace',
  standard:'the transition where an interior floor becomes an exterior one',
  precedent:'setback terraces, Burj Khalifa and after',
  air:0.24,uFactor:1.60,access:2.0,carbon:10,cycle:18,cost:0.94,
  draw:'threshold',
  reads:'The detail that decides whether the floor below stays dry for fifty years. Waterproofing continuity, an upstand, a drainage path and a movement joint that allows the slab and the façade to move independently — all four, or the water finds the one that is missing.'},
 'balustrade':{label:'Setback edge protection',system:'terrace',
  standard:'edge protection and guard loading, applied per authority',
  precedent:'every open floor in a tall building',
  air:0.30,uFactor:1.20,access:0.6,carbon:5,cycle:30,cost:0.66,
  draw:'guard',
  reads:'The most expensive safety requirement on the building per metre, because it is a guard that must not look like a guard, must not obstruct the view you paid for, and must be fixed through a waterproofing layer that was already finished.'}};

export const DETAIL_KEYS=Object.keys(DETAILS);
export const detailOf=s=>DETAILS[s&&s.detail]||DETAILS['drained-cavity'];

/* Rates for the detail. Assembly labour and the first qualification test are
   paid ONCE; the requalification that follows and the access a maintenance team
   needs are paid every year. Splitting them is not bookkeeping pedantry — it is
   the same stock-and-flow discipline the capital block in the model uses, and
   adding a one-off assembly cost to a yearly reserve would inflate the wall by
   a figure that means nothing. USD, per the model's convention.
     assembly  USD/m² of detail area, paid once: assembly plus first test
     retest    fraction of assembly spent per year on requalification, spread
               over the detail's own `cycle`
     access    USD/m²/yr per unit of the detail's access index */
export const DETAIL_RATES={assembly:38,retest:0.34,access:2.6};

/* Which area each detail is charged on. This is the whole discipline of the
   file in one table: a name per detail, and nothing charged on an area it is
   not named after. */
export const DETAIL_BASIS={envelope:'facade',crown:'crownPlan',terrace:'gardenArea'};

/* The detail's two figures. Deliberately NOT multiplied by the material
   coefficient — the fabric is already in the envelope reserve, and a second
   multiplier on the same square metre would inflate the wall by exactly the
   product of two numbers the reader already has on screen. */
export function detailCost(areas,s){
 const d=detailOf(s),basis=DETAIL_BASIS[d.system];
 const area=Math.max(0,areas[basis]||0);
 const capital=area*DETAIL_RATES.assembly*d.cost;
 const reserve=area*(DETAIL_RATES.assembly*d.cost*DETAIL_RATES.retest/Math.max(1,d.cycle)+DETAIL_RATES.access*d.access);
 return {area,capital,reserve,basis};
}

/* The deflection convention, in one table.

   This is the published curtain-wall practice that accompanies ASTM E330 — the
   standard asks the manufacturer to demonstrate a figure, it does not set the
   number itself, and the distinction is stated wherever the figure appears.

   It lives here as ONE table rather than as two fields on each of the twelve
   details because that is exactly how the first version got it wrong: with a
   per-detail denominator and a per-detail add-on, the code took L/175 plus
   6.4 mm on the far side of the threshold, where the convention says L/240.
   Both halves were in the same file, quoted correctly, and still disagreed. */
export const DEFLECTION={near:175,far:240,add:6.4,threshold:4100,cantilever:2,finished:360,
  note:'L/175 to about 4.1 m, L/240 plus 6.4 mm beyond, twice that for a cantilever, L/360 where a finish is bent — published practice accompanying ASTM E330, not a limit the standard sets'};

/* Deflection allowance for a given clear span, in millimetres. */
export function deflectionAllowance(spanMetres,cantilever=false){
 const mm=spanMetres*1000;
 const base=mm<=DEFLECTION.threshold?mm/DEFLECTION.near:mm/DEFLECTION.far+DEFLECTION.add;
 return cantilever?base*DEFLECTION.cantilever:base;
}

/* Whether this building's envelope meets the cited code air-barrier limit, and
   whether it clears the ASTM E2178 threshold for a material to be an air
   barrier at all. Reported, never priced: whether air is worth paying for is a
   market decision the reader's own climate makes, not the model's. */
export function airBarrier(s){
 const d=detailOf(s);
 return {rate:d.air,limit:0.20,meets:d.air<=0.20,
  permeance:d.air<0.02,standard:'ASTM E2357 @ 75 Pa'};
}

/* ── the assembly, drawn ──────────────────────────────────────────────────
   Twelve sections, in the house vocabulary: 1px rules, sharp corners, no fill
   gradients, no rounded anything. Each one is drawn to show the thing the cost
   is paid for — the cavity that drains, the isolator that breaks the heat path,
   the slot that lets the slab move, the gap that is filled. The amber is spent
   only on the element the detail is actually about; everything else stays ink,
   so the eye lands on the decision and not on the alphabet.

   Data-driven for the same reason crownPlates() is: a hand-drawn section that
   can drift away from the table above it is a second, lying source of truth. */
const S=(body,w=250,h=150)=>`<svg class="dsec" viewBox="0 0 ${w} ${h}" role="img" aria-hidden="true" `
 +`xmlns="http://www.w3.org/2000/svg" fill="none" stroke-linecap="square">${body}</svg>`;
// One path, one stroke width, one colour. Used for every line in the file so a
// stroke can never end up 1.4px because one assembly wanted it slightly heavier.
const L=(d,sw=1)=>`<path d="${d}" stroke="var(--ink)" stroke-width="${sw}"/>`;
const A=(d,sw=1)=>`<path d="${d}" stroke="var(--accent)" stroke-width="${sw}"/>`;
const D=(d,sw=1)=>`<path d="${d}" stroke="var(--faint)" stroke-width="${sw}"/>`;
const T=(x,y,s)=>`<text x="${x}" y="${y}" font-family="var(--mono)" font-size="8.5" fill="var(--faint)"`
 +`stroke="none">${s}</text>`;
// A small solid arrowhead. Amber when it is the point of the detail, ink when
// it is only showing that something is moving.
const AR=(x,y,dir,on=false)=>{const p={u:'M0,3 l3,-3 l3,3',d:'M0,-3 l3,3 l3,-3',l:'M3,0 l-3,3 l3,3',r:'M-3,0 l3,3 l-3,3'}[dir];
 return `<path d="${p}" transform="translate(${x},${y})" stroke="${on?'var(--accent)':'var(--faint)'}" stroke-width="1"/>`};

const DRAWINGS={
 /* Outer pressure plate, drained cavity, continuous inner air seal. Water gets
    past the first seal and is told where to go; air does not get past the second.

    A horizontal section at 1:1 on the wall's own depth, ~1 px to the mm. Cut
    material is poched: the aluminium plates are solid, the mineral wool is
    hatched, the two seals are beads. The cavity is the one thing that is NOT
    drawn, because a cavity is the absence of material — that is the whole
    reason the poché convention exists, and without it the wool and the plate
    were the same line and the drawing said nothing. Both ends are broken
    because the wall continues. */
 cavity:()=>sheet(
  brkV(34,52,56,4)+brkV(176,52,44,4)
  // the two plates, cut
  +cut('M40,52 H47 V108 H40 Z','metal')
  +cut('M95,52 H112 V108 H95 Z','metal')
  // the wool, hatched, set back from the outer face so the cavity can breathe
  +cut('M51,60 H95 V100 H51 Z','wool')
  // the seals: a bead, solid, because that is what a bead of sealant looks like
  +cut('M47,66 H52 V80 H47 Z','seal')
  +cut('M90,52 H96 V64 H90 Z','seal')
  // the glazing, BEYOND the cut plane, so an outline and never a fill
  +beyond('M112,64 H168 V96 H112 Z',.6)
  +beyond('M118,68 H168',.5)+beyond('M118,92 H168',.5)
  // interior, beyond
  +beyond('M180,52 H232',.5)
  // water: driven rain reaches the outer seal, is shed, and whatever gets past
  // runs down the cavity and leaves through the drain at the bottom
  +flow('M6,72 H44')+head(46,72,'r',true)
  +flow('M56,76 V98 H36')+head(34,98,'l',true)
  // pressure equalisation: the outer seal is a labyrinth, not a plug
  +flow('M44,86 H50',true)+head(52,86,'r',true)
  // air: from the conditioned side, and it stops at the inner seal
  +flow('M196,58 H99')+head(97,58,'l',true)
  +txt(200,64,'air')
  +txt(4,68,'rain')
  // leaders, staggered so none of them cross
  +leader(43,58,22,30,'outer pressure plate')
  +leader(49,73,20,45,'outer weather seal',{on:true})
  +leader(78,100,120,126,'mineral wool')
  +leader(62,100,40,114,'drained cavity',{on:true})
  +leader(93,58,128,26,'continuous air seal')
  +leader(104,80,150,40,'inner frame')
  +leader(140,80,178,104,'glazing, set back')
  +dim(40,136,112,136,'70'),
 ),
 /* The isolator. Heat wants to run straight through aluminium from the outer
    pressure plate to the inner mullion frame; this is the 40 mm that refuses.

    Section through the head of a mullion: two aluminium extrusions, a polyamide
    bar between them poched as its own material, and the heat path that is
    stopped, drawn as a path so it can be seen failing. */
 break:()=>sheet(
  cut('M28,30 H96 V120 H28 Z','metal')
  +cut('M140,30 H216 V120 H140 Z','metal')
  +cut('M96,30 H140 V120 H96 Z','seal')
  +beyond('M28,30 H216',.5)
  // the thermal path that is refused
  +flow('M8,64 H30')+head(32,64,'r',true)
  +flow('M52,64 H94 V104 H204')+head(206,104,'r',true)
  +flow('M12,64 H94 V112 H216')+head(218,112,'r')
  +txt(6,58,'heat path')
  +leader(60,32,60,16,'outside plate')
  +leader(118,44,140,18,'polyamide isolator',{on:true})
  +leader(178,60,196,40,'inside frame')
  +leader(118,108,86,132,'no metallic path across',{on:true})
  +dim(96,128,140,128,'44')
  +txt(150,142,'44 mm of nothing metallic')
 ),
 /* Weight-bearing bracket plus slip connection. The plate deflects, the frame
    drifts, the metal moves with temperature — the anchor permits all three.

    A vertical section through the head fixing. The slab edge is cut concrete
    beyond the plane; the bracket is cut steel; the slot it slips in is the one
    void in the drawing, and the whole detail exists to keep that slot open. */
 slab:()=>sheet(
  cut('M150,44 H244 V84 H150 Z','conc')
  +beyond('M150,44 H244 V44',.6)
  +cut('M58,96 H152 V106 H58 Z','steel')
  +cut('M58,84 H86 V96 H58 Z','steel')
  // the slip slot, drawn as a void with a leader — the detail's whole purpose
  +beyond('M96,84 H150',.55)+beyond('M96,84 V106',.55)
  +cut('M86,84 H96 V106 H86 Z','steel')
  // movement, which is what the slot permits
  +flow('M112,74 V64')+head(112,62,'u',true)
  +flow('M132,120 V126')+head(132,128,'d',true)
  +txt(106,58,'frame drift',{anchor:'end'})
  +txt(134,136,'plate deflection')
  +leader(74,90,58,68,'bracket, cut steel')
  +leader(122,84,172,22,'slip slot, kept open',{on:true})
  +leader(196,64,200,34,'slab edge, beyond')
  +dim(58,118,152,118,'horizontal load path')
  +cl(118,52,118,132)
 ),
 /* The gap between floors, filled so the slab can still move. This is the path
    a fire climbs; the detail exists to close it without freezing the frame.

    Vertical section at the slab edge. The tested system is poched between two
    slabs; the smoke seal bead is drawn at its own scale because it is the only
    part of this detail that is allowed to be too small to see. */
 fire:()=>sheet(
  cut('M40,58 H244 V70 H40 Z','conc')
  +cut('M40,82 H244 V94 H40 Z','conc')
  +beyond('M40,52 H244',.6)+beyond('M40,100 H244',.6)
  // the tested system, hatched, with the smoke seal bead solid inside it
  +cut('M98,58 H186 V94 H98 Z','wool')
  +cut('M132,62 H152 V70 H132 Z','seal')
  // the gap the detail exists to close
  +beyond('M96,70 H188 V82 H96 Z',.55)
  +flow('M28,32 V58')+head(28,60,'d',true)
  +flow('M28,58 V48 H60')+head(62,48,'r',true)
  +txt(20,28,'rise')
  +leader(60,64,50,18,'slab, poched concrete')
  +leader(120,66,104,116,'tested system')
  +leader(142,66,142,26,'smoke seal',{on:true})
  +leader(176,88,200,116,'slab still moves')
  +dim(96,126,188,126,'the gap'),
 ),
 /* Hearst, 2002. Diagonal is frame and grid at once, so structure, glass
    bracket and fire line all meet in one node. Nothing else does all three.

    Plan through the node. The outrigger diagonals are poched steel because the
    section passes through them; the glazing beyond the node is outline. */
 node:()=>sheet(
  cut('M20,126 L236,42','steel')
  +cut('M20,42 L236,126','steel')
  +cut('M108,66 H152 V98 H108 Z','steel')
  +cut('M120,74 H140 V90 H120 Z','void')
  +beyond('M108,98 H152 V112 H108 Z',.55)
  +cl(128,50,128,118)
  +flow('M124,98 V116',true)+head(124,118,'d',true)
  +txt(124,132,'fire stops here',{anchor:'end'})
  +leader(74,84,62,40,'outrigger, cut steel')
  +leader(130,82,130,26,'node',{on:true})
  +leader(130,106,166,132,'glass bracket')
  +beyond('M18,84 H246',.5)
 ),
 /* The compromise: take the column away from the plate, pay for a very deep
    element three floors up. A wider clear span, bought with steel.

    Elevation of the transfer, and it is an elevation rather than a section so
    the diagonals are seen in elevation and poched lightly. */
 outrigger:()=>sheet(
  cut('M58,18 H196 V132 H58 Z','beyond')
  // perimeter columns, poched
  +cut('M58,38 H74 V128 H58 Z','metal')
  +cut('M180,38 H196 V128 H180 Z','metal')
  // outrigger trusses at two levels
  +rule(74,58,180,58,{c:'var(--ink)',w:.9})+rule(74,70,180,70,{c:'var(--ink)',w:.9})
  +rule(74,58,180,70,{c:'var(--ink)',w:.8})+rule(74,70,180,58,{c:'var(--ink)',w:.8})
  // mega-column, poched, because the section cuts it
  +cut('M96,44 H110 V96 H96 Z','steel')
  +cut('M150,44 H164 V96 H150 Z','steel')
  +beyond('M110,44 H150',.5)
  +rule(6,52,246,52,{c:'var(--faint)',w:.5})+rule(6,98,246,98,{c:'var(--faint)',w:.5})
  +txt(8,48,'transfer level')
  +txt(8,110,'perimeter column')
  +leader(103,70,103,26,'mega-column',{on:true})
  +leader(127,64,132,136,'outrigger truss')
  +leader(187,80,210,110,'column held off the plate')
 ),
 /* Water gets behind every face eventually. Coping and counterflashing decide
    whether it goes down the drain or into the structure.

    Vertical section at the parapet. The ground line and earth hatch are the
    point of the drawing: below grade is shown as ground, above grade it is not. */
 parapet:()=>sheet(
  cut('M62,48 H204 V122 H62 Z','conc')
  +cut('M50,40 H128 V48 H50 Z','metal')
  +cut('M56,48 H110 V56 H56 Z','metal')
  // the roof build-up, drawn beyond the cut
  +beyond('M128,108 H206',.55)
  +beyond('M134,114 H200',.5)
  +cut('M70,64 H96 V122 H70 Z','conc')
  // water down and out
  +flow('M98,60 V112 H60')+head(58,112,'l',true)
  +flow('M140,102 H200')+head(202,102,'r',true)
  +txt(102,60,'water')
  +txt(144,92,'to the gutter')
  +ground(20,130,216)
  +leader(88,44,44,24,'coping, poched metal',{on:true})
  +leader(82,52,50,74,'counterflashing')
  +leader(150,114,176,128,'drainage path')
  +txt(224,140,'ground')
 ),
 /* The enclosure is a heat exchanger. Blades cut sun and noise and leave the
    free area the equipment needs; specified for looks, it cooks the plant. */
 screen:()=>sheet(
  cut('M38,30 H96 V126 H38 Z','metal')
  +rule(38,38,96,48,{c:'var(--ink)',w:.8})+rule(38,54,96,64,{c:'var(--ink)',w:.8})
  +rule(38,70,96,80,{c:'var(--ink)',w:.8})+rule(38,86,96,96,{c:'var(--ink)',w:.8})
  +rule(38,102,96,112,{c:'var(--ink)',w:.8})
  // free area, measured because it is the number that is specified
  +beyond('M100,36 H144',.5)+beyond('M100,56 H144',.5)+beyond('M100,76 H144',.5)+beyond('M100,96 H144',.5)
  // the plant, poched
  +cut('M148,48 H232 V104 H148 Z','metal')
  +cut('M164,62 H216 V90 H164 Z','void')
  +flow('M100,36 H144',true)+head(146,36,'r',true)
  +flow('M100,96 H144',true)+head(146,96,'r',true)
  +txt(2,26,'louvred screen')
  +leader(85,62,100,16,'blades, poched')
  +leader(122,56,120,140,'free area',{on:true})
  +leader(190,76,200,30,'plant, behind the screen')
 ),
 /* Every load the post carries, plus wind from everywhere with nothing behind
    it. Also the least accessible steelwork on the building — hence the rate. */
 mast:()=>sheet(
  // base plate and holding-down bolts, poched
   cut('M92,108 H158 V120 H92 Z','steel')
  +rule(104,120,104,130,{c:'var(--ink)',w:1.2})+rule(146,120,146,130,{c:'var(--ink)',w:1.2})
  +beyond('M88,130 H162',.6)
  // the post, tapered, poched
  +cut('M112,24 L122,108 L138,108 L128,24 Z','steel')
  +cl(125,18,125,132)
  // wind from both sides
  +flow('M18,46 H106')+head(108,46,'r',true)
  +flow('M18,74 H106')+head(108,74,'r',true)
  +flow('M232,46 H144')+head(142,46,'l',true)
  +flow('M232,74 H144')+head(142,74,'l',true)
  +txt(10,40,'wind')
  +leader(120,40,156,16,'post')
  +leader(104,114,64,110,'base plate')
  +leader(105,128,68,132,'holding-down bolts',{on:true})
  +leader(125,66,176,132,'taper')
 ),
 /* A light on the highest point, on a bracket that survives a roped technician.
    Four visits a year is not optimism. */
 aviation:()=>sheet(
  cut('M34,118 H212 V130 H34 Z','steel')
  +beyond('M34,112 H212',.6)
  +cut('M122,86 H132 V118 H122 Z','steel')
  +rule(112,86,142,86,{c:'var(--ink)',w:.9})
  // the luminaire, poched
  +cut('M116,58 H136 V76 H116 Z','metal')
  +cut('M112,76 H140 V86 H112 Z','metal')
  +rule(112,66,140,66,{c:'var(--ink)',w:.6})
  // the obstruction envelope, which is the whole reason the light exists
  +beyond('M126,46 A46 46 0 0 1 126,-2',.5)
  +beyond('M126,58 A58 58 0 0 1 126,-18',.5)
  +flow('M126,50 V34')+head(126,32,'u',true)
  +txt(44,46,'light envelope')
  +leader(126,66,182,44,'luminaire')
  +leader(127,100,182,96,'bracket')
  +leader(126,124,60,136,'roof, poched steel',{on:true})
  +txt(60,104,'roped access')
 ),
 /* The detail that decides whether the floor below stays dry for fifty years.
    Continuity, upstand, drainage and a joint that lets slab and wall move apart.

    Vertical section at the threshold, and it is the only one of the twelve that
    has to show ground: the failure mode is water from inside tracking under the
    finish and out under the slab, so both sides of the joint are drawn. */
 threshold:()=>sheet(
  cut('M18,62 H116 V132 H18 Z','conc')
  +cut('M120,62 H132 V104 H220 V132 H120 Z','conc')
  // waterproofing, drawn as a continuous line because continuity IS the detail
   +rule(14,58,116,58,{c:'var(--accent)',w:.9})
  +rule(14,50,108,50,{c:'var(--accent)',w:.6,dash:'4 2'})
  +rule(124,108,220,108,{c:'var(--accent)',w:.9})
  // the upstand, and the water that has to leave
  +flow('M150,100 H216')+head(218,100,'r',true)
  +flow('M160,70 V96 H216')+head(218,96,'r',true)
  +txt(168,88,'drainage')
  // movement joint: the gap that lets slab and wall move apart
  +beyond('M116,62 H132 V132',.7)
  +flow('M124,72 V58')+head(124,56,'u',true)
  +txt(124,54,'movement',{anchor:'end'})
  +leader(60,90,52,40,'slab, poched')
  +leader(124,82,164,52,'upstand',{on:true})
  +leader(140,66,140,26,'waterproofing, continuous')
  +leader(196,120,214,142,'drain')
  +txt(18,26,'inside')
 ),
 /* The most expensive safety requirement on the building per metre: a guard
    that must not look like a guard, anchored through a finished waterproofing. */
 guard:()=>sheet(
  // upstand and its finished waterproofing, poched
   cut('M22,80 H232 V134 H22 Z','conc')
  +rule(22,80,232,80,{c:'var(--accent)',w:.9})
  +rule(22,86,232,86,{c:'var(--faint)',w:.5,dash:'3 1.5'})
  // glass, beyond the cut plane, in its channel
  +beyond('M42,30 H198 V80',.6)
  +beyond('M42,34 H198',.5)+beyond('M42,76 H198',.5)
  // the posts, poched, carrying the anchor through the membrane
  +cut('M58,46 H68 V118 H58 Z','metal')
  +cut('M188,46 H198 V118 H188 Z','metal')
  // the anchor, drawn long because it must land in structure, not in the screed
  +rule(63,60,63,126,{c:'var(--ink)',w:1.1})
  +cut('M56,120 H70 V128 H56 Z','steel')
  +leader(63,124,110,142,'anchor into structure',{on:true})
  +leader(63,52,110,22,'glass, beyond the cut')
  +leader(193,60,206,32,'post, poched metal')
  +leader(150,83,198,58,'waterproofing already continuous')
  +dim(22,140,232,140,'1000')
 )};
export function detailSVG(key,lang='en'){drawingLang=lang;return (DRAWINGS[key]||DRAWINGS.cavity)()}
export const DETAIL_DRAWS=Object.keys(DRAWINGS);

/* The three figures a specifier asks for, with the standard each is measured
   against, so the number is never shown without the thing that bounds it.

   The span used is the FLOOR-TO-FLOOR HEIGHT, which is a real span of the wall
   and a number this model already owns. It is emphatically not `state.span`,
   which is the plate's plan dimension — a 48 m plate is not a 48 m curtain wall,
   and L/240 of it is 206 mm of nonsense. The horizontal span between anchors is
   the figure that would really govern, and the model does not have it; saying so
   is better than borrowing a slider that means something else. */
export function detailSpec(s){
 const d=detailOf(s),a=airBarrier(s),span=Number(s&&s.height)||4.1;
 return {air:d.air,airStandard:a.standard,meetsAir:a.meets,
  uFactor:d.uFactor,uStandard:'ISO 10292 / EN 673',
  span,deflection:deflectionAllowance(span),deflectStandard:'ASTM E330 at 1.5× design wind',
  access:d.access,cycle:d.cycle,carbon:d.carbon};
}