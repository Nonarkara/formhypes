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
const T=(x,y,s)=>`<text x="${x}" y="${y}" font-family="var(--mono)" font-size="7" fill="var(--faint)"`
 +`stroke="none">${s}</text>`;
// A small solid arrowhead. Amber when it is the point of the detail, ink when
// it is only showing that something is moving.
const AR=(x,y,dir,on=false)=>{const p={u:'M0,3 l3,-3 l3,3',d:'M0,-3 l3,3 l3,-3',l:'M3,0 l-3,3 l3,3',r:'M-3,0 l3,3 l-3,3'}[dir];
 return `<path d="${p}" transform="translate(${x},${y})" stroke="${on?'var(--accent)':'var(--faint)'}" stroke-width="1"/>`};

const DRAWINGS={
 /* Outer weather plate, drained cavity, continuous inner air seal. Water gets
    past the first seal and is told where to go; air does not get past the second. */
 cavity:()=>S(L('M40,26 V120')+L('M64,26 V120')+L('M86,26 V120')+L('M150,26 V120')
  +L('M40,120 H216')
  +D('M14,36 H32')+D('M14,52 H32')+D('M14,68 H32')+D('M14,84 H32')   // rain outside
  +A('M12,60 H38')+AR(38,60,'r',true)                      // stopped by the first seal
  +A('M52,108 V118 H38')+AR(38,118,'l',true)                // collected at the base
  +A('M52,108 V134 H16')+AR(16,134,'l',true)                // and drained out
  +A('M98,60 H148')+AR(146,60,'r',true)                      // air stops at the inner seal
  +D('M160,60 H210')+AR(210,60,'r')
  +T(10,147,'out')+T(28,147,'drain')+T(62,147,'cavity')+T(98,147,'insulation')
  +T(154,147,'air seal')+T(196,147,'in')),
 /* The isolator. Heat wants to run straight through aluminium from the outer
    pressure plate to the inner mullion frame; this is the 40 mm that refuses. */
 break:()=>S(L('M30,26 H108 V124 H30 Z')+L('M142,26 H220 V124 H142 Z')
  +L('M108,26 V124')+L('M142,26 V124')
  +A('M112,26 H138 V124 H112 Z')                              // the thermal break
  +A('M14,58 H30')+AR(30,58,'r',true)
  +A('M14,58 H112 V124 H220')                                // blocked: the break
  +AR(218,58,'r',true)
  +D('M20,44 H104 M20,44 V96')+D('M226,44 H148 M226,44 V96')
  +T(30,140,'outside plate · isolator · inside frame')+T(30,12,'heat path stops')),
 /* Weight-bearing bracket plus slip connection. The plate deflects, the frame
    drifts, the metal moves with temperature — the anchor permits all three. */
 slab:()=>S(L('M150,52 H240')+L('M150,84 H240')+L('M150,52 V84')
  +L('M150,52 V44 H96 V52')+L('M96,44 V30 H58 V44')+L('M58,30 V52')
  +A('M104,30 H140 V52 H104 Z')                              // the slip slot, open
  +A('M58,20 H104')
  +A('M122,18 V8')+AR(122,8,'u',true)+A('M122,62 V72')+AR(122,72,'d',true)
  +D('M150,96 H240')+D('M12,96 H240')
  +T(50,142,'bracket · slip · anchor')+T(154,44,'slab')+T(154,112,'structure')),
 /* The gap between floors, filled so the slab can still move. This is the path
    a fire climbs; the detail exists to close it without freezing the frame. */
 fire:()=>S(L('M40,20 V130')+L('M210,20 V130')+L('M40,58 H210')+L('M40,80 H210')
  +L('M96,58 V80')+L('M154,58 V80')
  +A('M100,58 H150 V80 H100 Z')                              // the tested system
  +A('M96,64 H154')
  +D('M104,50 l8,-8 l8,8 l-8,8 Z')                           // smoke seal
  +D('M112,92 H138')
  +A('M28,44 V94')+AR(28,44,'d',true)+A('M28,94 H96')
  +T(40,144,'fire stops · slab still moves')+T(44,12,'rise')),
 /* Hearst, 2002. Diagonal is frame and grid at once, so structure, glass
    bracket and fire line all meet in one node. Nothing else does all three. */
 node:()=>S(A('M18,124 L232,44')+A('M18,44 L232,124')
  +L('M110,64 H150 V96 H110 Z')+L('M118,72 H142 V88 H118 Z')
  +A('M130,96 V118')+L('M112,118 H148')
  +L('M110,96 H150')
  +D('M18,84 H250')
  +T(18,144,'diagonal · node · glass bracket')+T(196,36,'OOP')),
 /* The compromise: take the column away from the plate, pay for a very deep
    element three floors up. A wider clear span, bought with steel. */
 outrigger:()=>S(L('M60,20 V130')+L('M190,20 V130')
  +A('M60,56 H190')+A('M60,68 H190')
  +A('M60,56 L82,68 L104,56 L126,68 L148,56 L170,68 L190,56')
  +A('M60,68 L82,56 L104,68 L126,56 L148,68 L170,56 L190,68')
  +L('M60,40 H190')+L('M60,84 H190')
  +A('M96,44 V92')+A('M154,44 V92')
  +D('M6,52 H250')+D('M6,96 H250')
  +T(60,144,'mega-column · outrigger · perimeter column')+T(6,44,'outrigger floor')),
 /* Water gets behind every face eventually. Coping and counterflashing decide
    whether it goes down the drain or into the structure. */
 parapet:()=>S(L('M60,44 V120 H200 V44')+L('M60,44 H110 V120')
  +A('M52,38 H124 V44 H52 Z')                                // coping
  +A('M56,48 H108 V56 H56 Z')                                // counterflashing
  +A('M96,58 V116 H76')+AR(76,116,'d',true)                  // down and out
  +D('M130,100 H200')+A('M136,110 H196')+AR(196,110,'r',true)
  +L('M60,120 H200')
  +T(60,142,'coping · counterflashing · drainage path')+T(60,30,'roof')),
 /* The enclosure is a heat exchanger. Blades cut sun and noise and leave the
    free area the equipment needs; specified for looks, it cooks the plant. */
 screen:()=>S(L('M40,26 H96 V124 H40 Z')
  +A('M40,34 L96,44')+A('M40,50 L96,60')+A('M40,66 L96,76')+A('M40,82 L96,92')+A('M40,98 L96,108')
  +L('M150,44 H230 V104 H150 Z')+L('M166,60 H214 V88 H166 Z')
  +D('M104,40 H150')+D('M104,60 H150')+D('M104,80 H150')+D('M104,100 H150')
  +A('M104,40 H150')+AR(104,40,'r',true)+A('M104,100 H150')+AR(104,100,'r',true)
  +T(40,142,'louvres · free area · plant')+T(40,18,'screen')),
 /* Every load the post carries, plus wind from everywhere with nothing behind
    it. Also the least accessible steelwork on the building — hence the rate. */
 mast:()=>S(A('M108,124 L118,44 H132 L142,124')
  +A('M84,124 H166')+L('M96,124 V132')+L('M154,124 V132')
  +L('M88,132 H162')
  +A('M20,52 l16,-6M20,84 h18M20,116 l16,6')+AR(38,52,'r',true)+AR(38,84,'r',true)+AR(38,116,'r',true)
  +A('M230,52 l-16,-6M230,84 h-18M230,116 l-16,6')+AR(212,52,'l',true)+AR(212,84,'l',true)+AR(212,116,'l',true)
  +T(84,146,'post base · bolts · wind')+T(118,34,'post')),
 /* A light on the highest point, on a bracket that survives a roped technician.
    Four visits a year is not optimism. */
 aviation:()=>S(L('M40,116 H210 V128 H40 Z')
  +A('M124,116 V72')+A('M112,72 H136')+L('M124,72 V60')
  +A('M118,60 H130 V48 H118 Z')
  +A('M124,40 V28')+AR(124,28,'u',true)
  +D('M124,40 m-30,0 a30,30 0 0,1 60,0')+D('M124,40 m44,0 a44,44 0 0,1 -88,0')
  +L('M40,116 V96')+L('M60,116 V102')
  +A('M50,96 V88')+AR(50,88,'u',true)
  +T(40,142,'obstruction light · roped access')+T(112,20,'highest point')),
 /* The detail that decides whether the floor below stays dry for fifty years.
    Continuity, upstand, drainage and a joint that lets slab and wall move apart. */
 threshold:()=>S(L('M20,60 H120 V130')+L('M20,60 V130')
  +A('M120,60 V104 H210 V130')+A('M120,110 H210')
  +D('M20,52 H116')+D('M20,44 H108')
  +A('M124,116 H206')+AR(206,116,'r',true)
  +A('M124,122 V130')
  +L('M132,104 V86')+L('M148,104 V92')
  +A('M128,94 H150')+AR(150,94,'l',true)
  +T(20,146,'inside · upstand · drainage · movement joint')+T(20,36,'inside')),
 /* The most expensive safety requirement on the building per metre: a guard
    that must not look like a guard, anchored through a finished waterproofing. */
 guard:()=>S(L('M24,78 H226')+L('M24,78 V128')+L('M24,128 H226')
  +L('M44,44 H206 V78')+L('M44,44 V78')                   // the glass, in its frame
  +A('M48,48 H202')
  +A('M60,78 V112')+A('M190,78 V112')+L('M52,112 H198')    // posts into the upstand
  +A('M24,112 H226')+D('M24,120 H226')                     // waterproofing, already finished
  +A('M74,78 V120')+AR(74,120,'d',true)                    // the anchor driven through it
  +T(24,146,'glass guard · post · anchor')+T(24,36,'guard'))};

export function detailSVG(key){return (DRAWINGS[key]||DRAWINGS.cavity)()}
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