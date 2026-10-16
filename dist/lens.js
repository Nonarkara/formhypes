/* What each city is FOR.

   Six cities sit in the city list, and before this module they were six copies
   of the same desk: the same four cards, the same neighbour table, the same
   shadow strips, with the numbers changing underneath. Choosing Bangkok over
   Jakarta changed the coordinates and nothing else — which makes the choice
   meaningless, and a chooser nobody can feel the difference of is not a chooser.

   Each city here carries one published constant and one formula built from it.
   The constant is real and cited. The formula is computed, not typed, and it
   is fed by the model where the model has something to say: the settlement
   bands are drawn against the tower's OWN storey height, so moving the
   storey-height slider moves the year the ground floor is lost.

   The 60-year life is the one assumption in the file. It is not published by
   anyone; it is a study period, and it is printed on the drawing as such. Every
   other number here is either measured, published, or clearly marked as
   arithmetic on a published number.

   Density is the point. Three facts per city, one shared drawing per kind, one
   source line for the whole lens. Spreading four items across four equal cells
   to fill a band is how a small amount of information gets made to look
   careless — the space is not the information. */

export const LIFE_YEARS=60;

const SRC_BKK=[
 ['Aobpaet et al. 2013, Int. J. Remote Sensing — InSAR, Oct 2005–Mar 2010','https://www.tandfonline.com/doi/full/10.1080/01431161.2012.756596'],
 ['Chula.ac.th thesis — InSAR time series, Bangkok and vicinity','https://digital.car.chula.ac.th/chulaetd/68931/']];

/* Central Bangkok east of the Chao Phraya settles at about 10 mm/yr; the outer
   districts at 20–30 mm/yr. The 2011 and 1983 floods are named in the same
   abstract, so the two facts belong to the same measurement. */
export const LENSES={
 bangkok:{
  kind:'settle',rate:{v:10,lo:10,hi:30},
  rows:[['rate','10 mm/yr'],['floods','1983 · 2011']],
  src:SRC_BKK
 },

 /* Abidin et al. give 3–10 cm/yr as the typical band and 4 cm/yr as the
    northern average; the 2024 SBAS study puts the coastal North Jakarta sites
    at 8.47 cm/yr over 2017–2022. The 2007 Kali Baru breach is the clearest
    published consequence anyone has measured, because the fix is recorded. */
 jakarta:{
  kind:'settle',rate:{v:40,lo:30,hi:85},
  rows:[['rate','40 mm/yr'],['tidal','2007 → +1.5–2.0 m']],
  src:[
   ['Abidin et al., geodetic record — 3–10 cm/yr typical, 4 cm/yr north','https://link.springer.com/article/10.1007/s11069-010-9599-1'],
   ['SBAS InSAR 2017–2022, Int. J. Remote Sensing — North Jakarta 8.47 cm/yr','https://www.tandfonline.com/doi/full/10.1080/10106049.2024.2364726']]
 },

 /* JICA puts the city at 2–5 cm/yr and 7–8 cm/yr where high-rises cluster.
    The low-lying share is the reason subsidence matters here rather than in a
    city that could simply flood less. */
 hcmc:{
  kind:'settle',rate:{v:35,lo:20,hi:80},
  rows:[['rate','20–80 mm/yr'],['lowland','65% below 1.5 m']],
  src:[
   ['JICA / VIGMR — 2–5 cm/yr, 7–8 cm/yr in high-rise clusters','https://e.vnexpress.net/news/news/hcmc-sinks-by-2cm-per-year-study-4504213.html'],
   ['Thu Duc / District 2 tidal-flooding survey — ~65% of the city under 1.5 m','https://vjol.info.vn/TCtongcuckhituongthuyvan/article/download/92874/78560/']]
 },

 /* The groundwater answer, in the operator's own published dimensions. Tokyo
    did not solve flooding by leaving room for it; it solved it by putting the
    river somewhere else, 50 m down, out of sight. */
 tokyo:{
  kind:'subgrade',
  rows:[['diaDepth','Ø 10 m at −50 m'],['discharge','200 m³/s'],['prob','60–90% in 30 yr']],
  src:[
   ['Metropolitan Outer Discharge Channel — operator’s published dimensions','https://gaikaku.jp/'],
   ['Earthquake Research Committee, Nov 2025 — M8–9 Nankai Trough, 30-yr probability 60–90%','https://sj.jst.go.jp/stories/2025/s1126-01p.html'],
   ['Prime Minister’s press conference, Jan 2025 — 70% directly beneath Tokyo','https://japan.kantei.go.jp/103/statement/202501/17kaiken.html']]
 },

 /* The tunnel was at full capacity and the city still flooded — because the
    2022 water was in the Gombak, Bunus and Kuyoh catchments, which SMART does
    not serve. Capacity was never the binding constraint; coverage was. */
 kl:{
  kind:'coverage',
  rows:[['diverted','5,000,000 m³'],['dischRate','≈ 227,000 m³/h'],['uncovered','Gombak · Bunus · Kuyoh']],
  src:[
   ['Environment & Water Ministry — record 5 M m³ diverted in 22 h, Dec 2021','https://www.malaymail.com/news/malaysia/2021/12/19/smart-tunnel-diverted-five-million-cubic-metres-of-flood-water/2029695'],
   ['SMART Sdn Bhd — March 2022 floods lay outside the diversion catchment','https://www.thestar.com.my/news/nation/2022/03/10/minimal-flood-impact-for-areas-within-smart-tunnel-coverage']]
 },

 /* The one city where the question is not the building. Five firms disagree on
    the vacancy number by seven points, which is the honest answer and is
    printed as a range rather than as whichever figure is most alarming. */
 shenzhen:{
  kind:'market',
  rows:[['vacancy','24.6–31.6%'],['rent','−11% year on year'],['pipeline','3.91 M m² to 2027']],
  src:[
   ['Caixin, Nov 2025 — ~30% Grade A vacancy, rents −11% YoY to ¥153.4/m²/month','https://www.caixinglobal.com/2025-11-28/in-depth-shenzhen-gorged-on-skyscrapers-now-it-faces-a-commercial-property-glut-102388051.html'],
   ['Cushman & Wakefield Q2 2025 — stock 8.60 M m², vacancy 27.8%, 3.91 M m² pipeline','https://www.cushmanwakefield.com/en/greater-china/news/2025/08/grade-a-offices-tenant-advantages-deepen-greater-china-top-office-supply-demand-trends'],
   ['Knight Frank Q4 2025 — vacancy 24.6%; Savills Q3 2025 — 31.6%; JLL/Colliers — ~27%','https://content.knightfrank.com/research/1934/documents/en/shenzhen-office-market-report-q4-2025-12663.pdf']]
 }
};
export const LENS_ORDER=['bangkok','tokyo','kl','jakarta','hcmc','shenzhen'];
/* City key → translation key suffix. The city keys are the ones in the solar
   set and in the OSM data; the suffixes are the short ones already used by the
   site for city names. Deriving one from the other by string surgery is how
   `lx.singapore` silently renders as undefined. */
export const LENS_KEY={bangkok:'bkk',tokyo:'tky',kl:'kl',jakarta:'jak',hcmc:'hcmc',shenzhen:'sz'};

/* Published constants used by the formulas. Kept beside the rows that cite
   them so a reader can see which number came from where. */
export const CONSTANTS={
 tokyo:{tunnelDia:10,tunnelDepth:50,tunnelLength:6.5,pump:200,probLo:60,probHi:90,tokyoBeneath:70},
 kl:{diversion:5000000,hours:22,capacity:3000000,tunnelLength:9.7},
 shenzhen:{vacLo:24.6,vacHi:31.6,rent:153.4,rentDrop:11,pipeline:3.91,stock:8.60,ownerOcc:18},
 jakarta:{tidalRaiseLo:1500,tidalRaiseHi:2000},
 hcmc:{lowland:65,lowlandM:1.5}
};

/* The formula, computed. `storeyM` is the model's OWN storey height, so the
   settlement bands below grade are measured against the building this site
   actually proposes rather than against an average floor-to-floor. */
export function lensOf(city,ctx={}){
 const L=LENSES[city];if(!L)return null;
 const storeyM=Number.isFinite(ctx.storeyM)&&ctx.storeyM>0?ctx.storeyM:0;
 const out={city,kind:L.kind,rows:L.rows.map(r=>[r[0],r[1]]),src:L.src,storeyM};
 if(L.kind==='settle'){
  const rate=L.rate.v;
  const lo=L.rate.lo*LIFE_YEARS,hi=L.rate.hi*LIFE_YEARS;               // mm
  out.settle={lo,hi,v:rate*LIFE_YEARS};
  out.settleM={lo:lo/1000,hi:hi/1000,v:rate*LIFE_YEARS/1000};
  // How much of a storey the ground gives up over the study period. This is the
  // line the drawing is about: at 40 mm/yr a 4.1 m storey loses 59% of itself.
  // The central figure is rate × LIFE_YEARS ÷ 1000 — the ×LIFE_YEARS belongs
  // in all three of these, and dropping it made every "central" value read as a
  // single year's settlement.
  out.storeys=storeyM>0?{lo:lo/1000/storeyM,hi:hi/1000/storeyM,v:rate*LIFE_YEARS/1000/storeyM}:null;
  out.cityRate=rate;
  out.rate=L.rate;
  // Years until the ground has dropped one full storey.
  out.years=storeyM>0&&rate>0?{lo:storeyM*1000/L.rate.hi,hi:storeyM*1000/L.rate.lo}:null;
  out.scale=2.6;
 }else if(L.kind==='subgrade'){
  const C=CONSTANTS.tokyo;
  out.infra={dia:C.tunnelDia,depth:C.tunnelDepth,length:C.tunnelLength,pump:C.pump};
  out.prob={lo:C.probLo,hi:C.probHi,beneath:C.tokyoBeneath};
  // The tower's own height against the depth the city has already claimed.
  out.ratio=Number.isFinite(ctx.heightM)&&ctx.heightM>0?C.tunnelDepth/ctx.heightM*100:null;
  out.heightM=ctx.heightM;
 }else if(L.kind==='coverage'){
  const C=CONSTANTS.kl;
  out.kl={volume:C.diversion,hours:C.hours,capacity:C.capacity,length:C.tunnelLength};
  out.dischRate=C.diversion/C.hours;
  // Ran past its own storage capacity to do it. This is the whole argument.
  out.overCap=(C.diversion/C.capacity-1)*100;
 }else if(L.kind==='market'){
  const C=CONSTANTS.shenzhen;
  out.market={vacLo:C.vacLo,vacHi:C.vacHi,rent:C.rent,rentDrop:C.rentDrop,pipeline:C.pipeline,stock:C.stock,ownerOcc:C.ownerOcc};
  // The model's own rentable area, discounted by the market's own vacancy.
  // This is the only lens in the file that takes the schedule's headline and
  // then tells you how much of it will actually find a tenant.
  if(Number.isFinite(ctx.netArea)&&ctx.netArea>0){
   const mid=(C.vacLo+C.vacHi)/2;
   out.let={net:ctx.netArea,mid:ctx.netArea*(1-mid/100),lo:ctx.netArea*(1-C.vacHi/100),hi:ctx.netArea*(1-C.vacLo/100)};
  }else out.let=null;
 }
 return out;
}

/* ── drawings ──────────────────────────────────────────────────────────────
   One per kind, and each one carries a single idea rather than a decoration for
   the facts beside it. Everything is derived from `out` above, so the drawing
   cannot disagree with the formula.

   These are drawn with FILL, not outline. The first pass outlined everything in
   1px ink, which made the ground, the tower and the page the same value — a
   picture with no mass in it reads as a second caption, and a caption beside a
   caption is worse than no picture. So the earth is solid, the bore is a solid
   hole in it, and the line work is left to carry the dimensions. */
const INK='var(--ink)',MUT='var(--muted)',LINE='var(--line)',ACC='var(--accent)';
const EARTH='var(--dark)',ONDARK='var(--dim)',FAINT='var(--faint)';
const f=(n,d=0)=>Number.isFinite(n)?n.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';

/* Axis ticks on a 1 / 2 / 5 sequence, capped at four so the axis never becomes
   the densest thing on the drawing. */
function niceTicks(max){
 const raw=max/3,p=Math.pow(10,Math.floor(Math.log10(Math.max(1e-6,raw))));
 const step=[1,2,2.5,5,10].map(k=>k*p).find(k=>k>=raw-1e-9)||p*10;
 const out=[];for(let v=step;v<max-1e-9;v+=step)out.push(+v.toFixed(6));
 return out;
}

/* Settlement over the study period, with the building's own storey drawn across
   it. The solid area is the part the sources agree on; the pale area above it
   is the disagreement between them. That split is the reason to draw a band
   rather than print one number. */
export function settleSVG(L,t){
 const W=300,H=152,L0=48,R0=14,T0=28,B0=30;
 const pw=W-L0-R0,ph=H-T0-B0;
 const storey=Number.isFinite(L.storeyM)&&L.storeyM>0?L.storeyM:0;
 /* The axis is set by the SETTLEMENT, not by the storey. Sizing the plot to
    fit the storey as well left seventy per cent of it empty above a band that
    never left the floor — the same failure as a spread-out legend, only inside
    the drawing. When the storey is off the top of this axis it is marked as
    off the top, with its number, rather than paid for in whitespace. */
 const band=Math.max(L.settle.hi/1000,L.settleM.v,0.05);
 const ymax=band*1.32;
 const off=storey>ymax;
 const X=v=>L0+pw*v/LIFE_YEARS,Y=v=>T0+ph-ph*(v/ymax);
 const x2=X(LIFE_YEARS),base=T0+ph;
 let g='';
 for(const s of[0.25,0.5,0.75,1])g+=`<line x1="${X(LIFE_YEARS*s)}" y1="${T0}" x2="${X(LIFE_YEARS*s)}" y2="${base}" stroke="${LINE}" stroke-width="1"/>`;
 /* Settlement IS rate × time, so the drawing plots rate × t and starts at the
    origin. It used to plot two END-POINT values — the central figure and the top
    of the band — straight across a time axis, which drew a solid slab already
    0.6 m deep at year zero: the ground reading as settled on the day the
    building opened. Every guard was green, because the numbers in the path were
    the numbers the renderer was handed. The fix is the wedge a rate actually
    makes: nothing at t=0, and a straight edge to each published rate at t=60. */
 const lo=L.rate.lo,mid=L.rate.v,hi=L.rate.hi;
 g+=`<path d="M${X(0)} ${Y(0)} L${x2} ${Y(hi*LIFE_YEARS/1000)} L${x2} ${base} L${X(0)} ${base} Z" fill="${ACC}" fill-opacity=".26"/>`;
 g+=`<path d="M${X(0)} ${Y(0)} L${x2} ${Y(mid*LIFE_YEARS/1000)} L${x2} ${base} L${X(0)} ${base} Z" fill="${ACC}"/>`;
 /* The storey number sits in a RESERVED LANE under the axis head, whether or not
    its rule fits on the chart. It used to ride above its own dashed line, which
    meant the label's position moved with the storey slider and could walk into
    the title row — and in three languages at once, because the Chinese tag is
    wider than the English one and nobody checks the other two. The lane is empty
    by construction: the axis title is above T0, the ticks are left of L0, and
    the years are below the base. Only this one label is ever in it. */
 if(storey>0){
  const tag=`${t.storey} ${f(storey,2)} m${off?' ↑':''}`;
  const y=Y(off?ymax:storey);
  g+=`<line x1="${L0}" y1="${y}" x2="${x2}" y2="${y}" stroke="${MUT}" stroke-width="1" stroke-dasharray="4 3"/>`;
  if(!off&&y>T0+13)g+=`<line x1="${x2}" y1="${T0+12}" x2="${x2}" y2="${y}" stroke="${MUT}" stroke-width="1"/>`;
  g+=`<text x="${x2}" y="${T0+9}" class="lx-s" text-anchor="end">${tag}</text>`;
 }
 g+=`<line x1="${L0}" y1="${base}" x2="${x2}" y2="${base}" stroke="${INK}" stroke-width="1.2"/>`;
 g+=`<line x1="${L0}" y1="${T0}" x2="${L0}" y2="${base}" stroke="${INK}" stroke-width="1.2"/>`;
 for(const v of niceTicks(ymax)){
  g+=`<line x1="${L0-4}" y1="${Y(v)}" x2="${L0}" y2="${Y(v)}" stroke="${MUT}" stroke-width="1"/>`;
  g+=`<text x="${L0-7}" y="${Y(v)+3}" class="lx-s" text-anchor="end">${f(v,1)}</text>`;
 }
 g+=`<text x="${L0}" y="${base+14}" class="lx-s">0</text>`;
 g+=`<text x="${x2}" y="${base+14}" class="lx-s" text-anchor="end">${LIFE_YEARS}</text>`;
 g+=`<text x="${x2}" y="${base+25}" class="lx-s" text-anchor="end">${t.years}</text>`;
 g+=`<text x="${L0}" y="${T0-8}" class="lx-s">${t.settle}</text>`;
 return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${t.aria}">${g}</svg>`;
}

/* Tokyo, at two scales on one axis — the way a section draws a tower and the
   thing fifty metres under it. The break is marked, because a drawing that
   silently changes scale is a lie.

   The soil is a NARROW COLUMN, not a full-width slab. A 264-unit-wide black
   rectangle holding one 10-unit circle reads as a bar with a dot in it; a
   100-unit column holding the same circle reads as ground, and the circle's
   smallness becomes the point — that is the whole of this, at this scale. The
   bore keeps a leader out to its annotation, because a small mark with a label
   beside it is two things, and a small mark with a leader is one thing.

   Both panels share one left edge. A section whose halves do not line up is
   two drawings pretending to be one. */
export function subgradeSVG(L,t){
 const W=216,H=176,ML=16,MW=100;
 const tY=16,tH=60;
 const sY=92,sH=80,MAXD=80;
 const DY=v=>sY+sH*(v/MAXD);
 const Hm=Number.isFinite(L.heightM)&&L.heightM>0?L.heightM:400;
 const D=L.infra.depth,ANN=ML+MW+10;
 const cx0=()=>ML+MW/2;
 let g='';
 /* The tower is FILLED, not outlined. It was a 1px rectangle of the same value as
    the page with seven grey lines in it, which is the wireframe-box version of
    the same failure the flat pie was: a picture that carries no more weight than
    the caption under it. A grey mass with the storeys cut into it separates from
    the paper without competing with the black earth below it. */
 g+=`<rect x="${ML}" y="${tY}" width="${MW}" height="${tH}" fill="${LINE}" stroke="${INK}" stroke-width="1.2"/>`;
 for(let i=1;i<8;i++){const y=tY+tH-tH*i/8;g+=`<line x1="${ML}" y1="${y}" x2="${ML+MW}" y2="${y}" stroke="${FAINT}" stroke-width="1"/>`}
 g+=`<line x1="${ML+MW+5}" y1="${tY}" x2="${ML+MW+5}" y2="${tY+tH}" stroke="${MUT}" stroke-width="1"/>`;
 g+=`<line x1="${ML+MW+3}" y1="${tY}" x2="${ML+MW+7}" y2="${tY}" stroke="${MUT}" stroke-width="1"/>`;
 g+=`<line x1="${ML+MW+3}" y1="${tY+tH}" x2="${ML+MW+7}" y2="${tY+tH}" stroke="${MUT}" stroke-width="1"/>`;
 g+=`<text x="${ML+MW+10}" y="${tY+tH/2+3}" class="lx-s">${f(Hm,0)} m</text>`;
 g+=`<text x="${ML}" y="${tY-5}" class="lx-s">${t.model}</text>`;
 /* The scale break, inside the sixteen units of gap between the panels. It used
    to start at y=85 and climb to y=70, which put its top four units INSIDE the
    tower — the one thing a break mark must never do, because it reads as damage
    to the building rather than as an admission about the drawing. */
 const bx=cx0(),by=sY-4;
 g+=`<path d="M${bx-13} ${by} l4 -4 l-4 -4 M${bx+13} ${by} l-4 -4 l4 -4" fill="none" stroke="${MUT}" stroke-width="1"/>`;
 // Soil panel. Solid, because outlined earth on a cream page is the same value
 // as the page, and a drawing with no mass in it is a second caption.
 g+=`<rect x="${ML}" y="${sY}" width="${MW}" height="${sH}" fill="${EARTH}"/>`;
 g+=`<line x1="${ML}" y1="${sY}" x2="${ML+MW}" y2="${sY}" stroke="${ACC}" stroke-width="1.5"/>`;
 // Grade is where the amber line is, so it gets named — inside the ground, under
 // the line, because the space above it belongs to the break marks and a word
 // sitting beside a chevron reads as though the chevron were pointing at it.
 g+=`<text x="${ML+MW-3}" y="${sY+14}" class="lx-s lx-on" text-anchor="end">${t.ground}</text>`;
 // Every printed depth carries a mark, and every label sits ABOVE its mark: −80
 // is the floor of the panel, so a label hung below its own tick fell off the
 // drawing. Above is inside the ground for all four, which is the only place
 // they can all live.
 for(const d of [20,40,60,80]){
  g+=`<line x1="${ML}" y1="${DY(d)}" x2="${ML+7}" y2="${DY(d)}" stroke="${ONDARK}" stroke-width="1"/>`;
  g+=`<text x="${ML+10}" y="${DY(d)-4}" class="lx-s lx-on">−${d}</text>`;
 }
 const cx=ML+MW/2,cy=DY(D),rr=(L.infra.dia/2)/MAXD*sH;
 g+=`<circle cx="${cx}" cy="${cy}" r="${rr.toFixed(2)}" fill="${ACC}"/>`;
 g+=`<line x1="${(cx+rr).toFixed(1)}" y1="${cy}" x2="${ANN-4}" y2="${cy}" stroke="${ACC}" stroke-width="1"/>`;
 /* The leader ends level with the MIDDLE line, so the middle line has to be the
    thing the circle actually is. It used to land between two of the three, which
    is the same as labelling nothing. */
 g+=`<text x="${ANN}" y="${cy-12}" class="lx-s">${f(L.infra.length,1)} km</text>`;
 g+=`<text x="${ANN}" y="${cy}" class="lx-s">Ø ${L.infra.dia} m</text>`;
 g+=`<text x="${ANN}" y="${cy+12}" class="lx-s">${f(L.infra.pump)} m³/s</text>`;
 return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${t.aria}">${g}</svg>`;
}

/* One bar that runs out of its own container. SMART was at full capacity and
   the city still flooded, so the capacity rule is the thing worth drawing —
   not the capacity itself. The overflow is solid so the eye finds it first. */
export function coverageSVG(L,t){
 const W=300,H=76,L0=14,R0=14,T0=26,barH=26;
 const pw=W-L0-R0;
 const full=L.kl.capacity,div=L.kl.volume;
 const xOver=L0+pw*(full/div);
 const yOf=v=>T0+barH*(1-v/div);
 void yOf;
 let g='';
 g+=`<rect x="${xOver}" y="${T0}" width="${L0+pw-xOver}" height="${barH}" fill="${ACC}"/>`;
 g+=`<rect x="${L0}" y="${T0}" width="${xOver-L0}" height="${barH}" fill="none" stroke="${INK}" stroke-width="1.2"/>`;
 g+=`<line x1="${xOver}" y1="${T0-9}" x2="${xOver}" y2="${T0+barH+9}" stroke="${INK}" stroke-width="1.6"/>`;
 g+=`<text x="${xOver+5}" y="${T0-13}" class="lx-s">${f(L.kl.capacity)} m³</text>`;
 g+=`<text x="${L0}" y="${T0-13}" class="lx-s">0</text>`;
 g+=`<text x="${L0+pw}" y="${T0+barH+17}" class="lx-s" text-anchor="end">${f(div)} m³ in ${L.kl.hours} h</text>`;
 g+=`<text x="${L0}" y="${T0+barH+17}" class="lx-s">${t.overflow}</text>`;
 return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${t.aria}">${g}</svg>`;
}

/* Shenzhen: what the schedule calls rentable, and what the market will
   actually lease. The solid bar is the part that finds a tenant; the outline
   behind it is the part that does not. Computed from the model, not from a
   Shenzhen average, so moving the form moves both bars. */
export function marketSVG(L,t){
 /* The box is sized to the drawing. It was 134 units tall holding content that
   ended at 85, so 49 units of it were blank paper — the same complaint as a
   spread-out legend, only inside the SVG. Without a let-able bar the drawing is
   only the vacancy axis, and the box shrinks with it. */
 const H=L.let?90:26;
 const W=300,L0=14,R0=14,T0=32,barH=18;
 const pw=W-L0-R0;
 let g='';
 const AX=40,vX=v=>L0+pw*v/AX;
 g+=`<rect x="${vX(L.market.vacLo)}" y="${T0-11}" width="${vX(L.market.vacHi)-vX(L.market.vacLo)}" height="11" fill="${ACC}"/>`;
 g+=`<line x1="${L0}" y1="${T0}" x2="${L0+pw}" y2="${T0}" stroke="${INK}" stroke-width="1.2"/>`;
 g+=`<line x1="${vX(20)}" y1="${T0-16}" x2="${vX(20)}" y2="${T0+5}" stroke="${MUT}" stroke-width="1" stroke-dasharray="3 3"/>`;
 g+=`<text x="${L0}" y="${T0-21}" class="lx-s">${f(L.market.vacLo,1)}–${f(L.market.vacHi,1)}%</text>`;
 g+=`<text x="${L0+pw}" y="${T0-21}" class="lx-s" text-anchor="end">${t.bench} 20%</text>`;
 const top=T0+18;
 if(L.let){
  g+=`<rect x="${L0}" y="${top}" width="${pw}" height="${barH}" fill="none" stroke="${MUT}" stroke-width="1.2"/>`;
  g+=`<rect x="${L0}" y="${top}" width="${pw*(L.let.mid/L.let.net)}" height="${barH}" fill="${ACC}"/>`;
  g+=`<text x="${L0}" y="${top-5}" class="lx-s">${f(L.let.net)} m²</text>`;
  g+=`<text x="${L0+pw}" y="${top+barH+15}" class="lx-s" text-anchor="end">${f(L.let.mid)} m² ${t.let}</text>`;
 }
 return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${t.aria}">${g}</svg>`;
}

export function lensSVG(L,t){
 if(!L)return '';
 if(L.kind==='settle')return settleSVG(L,t);
 if(L.kind==='subgrade')return subgradeSVG(L,t);
 if(L.kind==='coverage')return coverageSVG(L,t);
 return marketSVG(L,t);
}
export function lensFormula(L){
 if(!L)return null;
 if(L.kind==='settle')
  return {expr:`${f(L.cityRate)} mm/yr × ${LIFE_YEARS} yr = ${f(L.settle.v)} mm`,
   gloss:'fSettle',value:L.settle.v};
 if(L.kind==='subgrade')
  return {expr:`P(M8–9, 30 yr) = ${L.prob.lo}–${L.prob.hi}% · ${L.prob.beneath}% beneath Tokyo`,
   gloss:'fSubgrade',value:L.prob.hi};
 if(L.kind==='coverage')
  return {expr:`${f(L.kl.volume)} m³ ÷ ${L.kl.hours} h = ${f(Math.round(L.dischRate))} m³/h`,
   gloss:'fCoverage',value:L.dischRate};
 if(L.let)
  return {expr:`${f(Math.round(L.let.net))} m² × (1 − ${f((L.market.vacLo+L.market.vacHi)/2,1)}%) = ${f(Math.round(L.let.mid))} m²`,
   gloss:'fMarket',value:L.let.mid};
 return null;
}