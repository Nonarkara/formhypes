/* ── the top of the tower, and the holes punched through it ─────────────────
   Two features that look like decoration and are not.

   A CROWN sits above the last occupied level. It is structure, it is exposed to
   weather and to aircraft, and it is measured. The building's height is its
   occupied height PLUS its crown, so a crown spends the same height allowance
   the floors spend, and the model has to say so rather than draw it for free.
   The heights below are FormHypes' own set values, chosen to sit in the range
   of the buildings named as precedents. They are not measurements of those
   buildings and nothing here should be quoted as one.

   A SKY GARDEN is the opposite: area taken OUT of the tower and given to open
   air. It earns nothing as floor area, it costs real money every year to keep
   alive, and it cannot be both a terrace and leasable square metres in the same
   square metre. So the garden is modelled the way it is built — as levels
   surrendered from the rentable stack — and its amenity value is reported, not
   priced. Pricing an amenity would mean inventing the number that makes terraces
   look worthwhile, which is the one figure here nobody has evidence for.

   An LED surface is a marketing surface. It earns advertising income and costs
   power and maintenance. It changes no daylight, no envelope performance and no
   height, and it is labelled that way wherever it appears.                      */

export const CROWNS={
 flat:{label:'Flat roof',thesis:'the honest default',h:0,foot:1,
   draw:'flat',use:'plant',
   reads:'No crown. The roof is a roof. This is the control every other crown is measured against.'},
 stepped:{label:'Stepped setback',thesis:'tiered towers, Chicago school',h:22,foot:0.58,
   draw:'step',use:'plant',
   reads:'Enclosed plant on a reduced plate. Costs height and costs money; earns nothing.'},
 helipad:{label:'H-pad on outriggers',thesis:'rooftop helipads, Hong Kong',h:12,foot:0.78,
   draw:'hpad',use:'plant',
   reads:'A landing deck cantilevered past the parapet. The plate below must carry it, which is why the frame rate is the thing to watch.'},
 post:{label:'Tapered post',thesis:'after Petronas, Kuala Lumpur, 1998',h:73.5,foot:0.10,
   draw:'post',use:'observation',
   reads:'A slender post above an occupied deck. The deck earns a separate, much lower rate than office rent — visitors are not tenants.'},
 mast:{label:'Aviation mast',thesis:'obstruction lighting and masts',h:46,foot:0.05,
   draw:'mast',use:'aviation',
   reads:'A mast with obstruction lighting. It earns nothing on its own. Its only commercial use is as an advertising surface, which is a separate switch.'}};

export const CROWNS_KEYS=Object.keys(CROWNS);
export const crownOf=s=>CROWNS[s&&s.crown]||CROWNS.flat;

/* The setback options. `frac` is how much of that level's plate is given away —
   a quarter terrace keeps three quarters of the floor, a whole-floor setback
   stops the plate at that level and lets the tower above run on. */
export const GARDENS={
 none:{label:'No sky garden',frac:0,every:0,reads:'Every floor is leasable. The tower is a stack of income.'},
 quarter:{label:'Quarter floor open',frac:0.25,every:13,reads:'A quarter of one floor in thirteen becomes terrace. Those square metres stop earning and start costing.'},
 half:{label:'Half floor open',frac:0.50,every:13,reads:'Half a floor in thirteen. A bigger claim on the same height, and a bigger bill for keeping it alive.'},
 full:{label:'Whole floor setback',frac:1.00,every:13,reads:'A full floor stops. The tower steps back and resumes above it. The most area given away and the most sky gained.'}};

export const GARDENS_KEYS=Object.keys(GARDENS);
export const gardenOf=s=>GARDENS[s&&s.garden]||GARDENS.none;

/* Rates, stated here rather than in the model's econ block so this feature has
   one place to be argued with. USD, per the model's own convention.
     linear      annual upkeep per m² of crown plan per metre of crown height —
                 coating, inspection and access all cost more with altitude
     steel       capital cost per m² of crown plan
     observation deck rent per m²/yr, an order of magnitude below office rent
     advert      LED media income per m²/yr of illuminated face
     advertRun   LED power and maintenance per m²/yr of illuminated face
     garden      planted terrace upkeep per m²/yr — irrigation, drainage,
                 waterproofing, horticulture, replacement planting                */
export const CROWN_RATES={
 linear:4.2,
 steel:1450,
 observation:38,
 advert:210,
 advertRun:46,
 garden:78};

/* The crown's shape, as a stack of horizontal plates rather than a drawing
   instruction. `{t, foot}` is a height up the crown (0 = the roof, 1 = the top)
   and the share of the roof plate still standing there. Returning data instead
   of ink means the isometric view, the plan and a test can all read the same
   geometry, and a renderer cannot quietly disagree with the arithmetic. */
export function crownPlates(c){
 switch(c.draw){
  case 'step': return [{t:0,f:c.foot},{t:.55,f:c.foot*.72},{t:1,f:.26}];
  case 'hpad': return [{t:0,f:c.foot},{t:.30,f:1.14},{t:1,f:.20}];
  case 'post': return [{t:0,f:c.foot*1.7},{t:.30,f:c.foot},{t:.72,f:c.foot*.62},{t:1,f:.035}];
  case 'mast': return [{t:0,f:c.foot*3.2},{t:.22,f:c.foot},{t:1,f:.45}];
  default: return [{t:0,f:c.foot}]}
}

/* ── what a code says about the thing on top ───────────────────────────────
   IBC 2021 §504.3, Exception, quoted across every jurisdiction that adopts the
   2021 model code:

     "Towers, spires, steeples and other rooftop structures shall be constructed
      of materials consistent with the required type of construction of the
      building… Such structures shall not be used for habitation or storage. The
      structures shall be unlimited in height where of noncombustible materials
      and shall not extend more than 20 feet (6096 mm) above the allowable
      building height where of combustible materials."

   Two things follow, and the second is the one that matters here.

   A noncombustible spire can, in principle, be excluded from the allowable
   building height. But the same exception forbids habitation, and an
   OBSERVATION DECK IS HABITATION. So the crown on this model that carries
   visitors is counted in full against the allowance — which is the conservative
   reading, and is what the height arithmetic here already does.

   The model does not apply IBC. The six cities on offer do not all adopt it,
   and the adopted codes differ. This is quoted as the clearest published
   statement of the principle, which is general: a crown is part of the building
   until a code says otherwise, and the exception is narrower than it first
   looks. Local counsel sets the actual limit; this file sets the default,
   which is to count the whole thing. */
export const CROWN_CODE={
 source:'IBC 2021 §504.3, Exception',
 habitableProhibited:true,
 combustibleAllowanceM:6.096,
 note:'A noncombustible spire may be excluded from the allowable building height, but the same exception forbids habitation. An observation deck is habitation, so this crown is counted in full.'};

export function crownHeightTreatment(s){
 const c=crownOf(s);
 return {height:c.h,counted:c.h,habitable:c.use==='observation',
  excluded:false,reason:c.use==='observation'
   ?'The crown carries an occupied deck, so it is counted in full against the height allowance.'
   :'The crown is not occupied, but this model counts it anyway. A noncombustible spire may be excluded by code; that is a local ruling, not a default.'};
}

/* Where the setbacks fall. Mechanical and refuge levels already exist in the
   stored schedule and already surrender height; a garden wants to share those
   positions rather than compete with them, which is how the Burj Khalifa's
   stepped profile is actually built. Returns indices into the occupied stack. */
export function gardenIndices(s){
 const g=gardenOf(s);
 if(!g.every||g.frac<=0)return [];
 const out=[];const n=s.floors;
 // one terrace in three gaps of `every`, anchored above the lobby so the first
 // one is visible from the street and not buried at the bottom of the shaft
 for(let i=Math.max(12,g.every);i<n;i+=g.every)out.push(i);
 return out;
}

/* What a crown costs and earns, in the model's own units. Height is returned
   separately because it is the one figure that decides whether the tower is
   legal at all, and it must not be folded into a money number. */
export function crownMetrics(s,topPlateArea){
 const c=crownOf(s);
 const plan=Math.max(0,topPlateArea)*c.foot;
 const reserve=plan*c.h*CROWN_RATES.linear;
 const capital=plan*CROWN_RATES.steel;
 const observationArea=(c.use==='observation')?plan*0.62:0;
 const observationRent=observationArea*CROWN_RATES.observation;
 // The advertising surface is the crown's own plan when there is one, and the
 // roof plate itself when the crown is flat — because that is where the media
 // fabric would actually be hung.
 const adArea=s.led?Math.max(plan,topPlateArea*0.55):0;
 const advertRent=adArea*CROWN_RATES.advert;
 const advertCost=adArea*CROWN_RATES.advertRun;
 return {h:c.h,plan,area:adArea,observationArea,observationRent,advertRent,advertCost,
   reserve,capital,netRent:observationRent+advertRent-advertCost,kind:c.draw,use:c.use};
}