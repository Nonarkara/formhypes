/* Glare lab — reflected sunlight from the curtain wall, followed to the ground.

   What it computes, and only this:
   - The tower's skin is cut into flat facets: every plan edge, between twelve
     levels. Each facet's normal comes from the actual 3D quad between
     profile(s,t0) and profile(s,t1), so taper leans it back and twist turns it.
   - The sun is solar.js's own vector (SunCalc). The incoming ray is d = −sun;
     a facet is lit when d·n < 0, and reflects specularly: r = d − 2(d·n)n.
   - A reflected beam keeps the irradiance ρ·DNI per unit area normal to the
     beam: a flat mirror redirects light, it does not concentrate it. Heat
     concentrates only where beams from SEVERAL facets land on the same ground —
     a concave plan corner, or a façade whose lean grows with height, as at
     20 Fenchurch Street. So the ground is rasterised and the beams per cell are
     counted; the peak is DNI·Σρ over the beams that overlap.
   - Self-shading and self-blocking are tested in plan against the tower's own
     outline at the facet's level; neighbour shading and neighbour hits are
     tested against the OpenStreetMap prisms harvested around the plot.

   Reflectance rises at glancing angles. The rise is taken from the City of
   London's figures for clear double glazing (13 % at normal incidence; 15 % at
   45°, 22 % at 60°, 49 % at 75°) and applied to any normal-incidence ρv as
   ρ(θ) = ρn + (1 − ρn)·w(θ), which reproduces those figures exactly at ρn = 13 %.

   DNI is the 0.8 kW/m² transparent reference used everywhere else here. */
import {solarPosition,cities} from './solar.js?v=9279efc6dc';
import {profile,stackHeight} from './model.js?v=d6152aaa85';
import {cityData,ringsIntersect} from './cityscape.js?v=dcc15cb0df';
import {sheet,cut,leader,head,dim,rule,txt,flow,layout,cl} from './drafting.js?v=895b148bec';

export const GLARE_DNI=800;               // W/m², the project's reference beam
export const GLARE_LEVELS=12;
const RAD=Math.PI/180;
// w(θ) from City of London PAN Solar Glare (2017): (ρ(θ) − 0.13)/(1 − 0.13).
const ANG=[[0,0],[45,(0.15-0.13)/0.87],[60,(0.22-0.13)/0.87],[75,(0.49-0.13)/0.87],[90,1]];

/* ── pure vector optics ─────────────────────────────────────────────────── */
export const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export function reflect(d,n){const k=2*dot(d,n);return [d[0]-k*n[0],d[1]-k*n[1],d[2]-k*n[2]]}
/** Ground point (z = 0) reached by a ray from p along r, or null if it rises. */
export function groundHit(p,r){if(!(r[2]<0))return null;const s=p[2]/-r[2];return [p[0]+s*r[0],p[1]+s*r[1]]}
/** Specular reflectance at incidence cosine cosI, after frit coverage. */
export function reflectance(rhoN,cosI=1,frit=0){
 const r=Math.min(1,Math.max(0,+rhoN||0)),f=Math.min(1,Math.max(0,+frit||0));
 const th=Math.acos(Math.min(1,Math.max(0,cosI)))/RAD;
 let w=1;for(let i=1;i<ANG.length;i++)if(th<=ANG[i][0]){const [a0,w0]=ANG[i-1],[a1,w1]=ANG[i];w=w0+(w1-w0)*(th-a0)/(a1-a0);break}
 return (r+(1-r)*w)*(1-f);
}
const signedArea=p=>{let a=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];a+=p[i][0]*q[1]-q[0]*p[i][1]}return a/2};
export function pointInRing(x,y,ring){let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [xi,yi]=ring[i],[xj,yj]=ring[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c}return c}
export function distToRing(x,y,ring){let m=Infinity;for(let i=0;i<ring.length;i++){const [ax,ay]=ring[i],[bx,by]=ring[(i+1)%ring.length],dx=bx-ax,dy=by-ay,L=dx*dx+dy*dy,t=L?Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/L)):0;m=Math.min(m,Math.hypot(x-ax-t*dx,y-ay-t*dy))}return pointInRing(x,y,ring)?0:m}
// Segment–segment parameter on the first segment, or -1.
function segParam(ax,ay,bx,by,cx,cy,dx,dy){const rx=bx-ax,ry=by-ay,sx=dx-cx,sy=dy-cy,den=rx*sy-ry*sx;if(Math.abs(den)<1e-12)return -1;const qx=cx-ax,qy=cy-ay,u=(qx*sy-qy*sx)/den,v=(qx*ry-qy*rx)/den;return u>=0&&u<=1&&v>=0&&v<=1?u:-1}
function crossesRing(ax,ay,bx,by,ring,skip){for(let i=0;i<ring.length;i++){if(i===skip)continue;const [cx,cy]=ring[i],[dx,dy]=ring[(i+1)%ring.length];if(segParam(ax,ay,bx,by,cx,cy,dx,dy)>1e-6)return true}return false}
/** Horizontal outward offset at height z of a façade whose lean grows linearly
 *  from 0 at grade to `lean` degrees at H: ∫ tan(a·ζ) dζ = −ln cos(a·z) / a. */
export function leanOffset(z,H,lean){const a=lean*RAD/Math.max(H,1e-9);return Math.abs(a)<1e-12?0:-Math.log(Math.cos(a*z))/a}

/* ── façade facets ──────────────────────────────────────────────────────── */
export function towerHeight(s){try{const h=stackHeight(s);if(Number.isFinite(h)&&h>0)return h}catch{}return Math.max(1,(+s.floors||1)*(+s.height||4))}
/** lean: null → the model's own taper/twist geometry; a number (degrees) →
 *  the plan keeps its twist but not its taper, and leans by that amount at
 *  the crown, growing linearly from the base (positive = overhang). */
export function facadeFacets(s,{levels=GLARE_LEVELS,lean=null}={}){
 const H=towerHeight(s),K=Math.max(2,levels|0),rings=[];
 // The override flares the plan by a uniform scale, as the model's own taper
 // does, so no outline can turn inside out. The stated lean is exact for a face
 // at the plan's inradius (2·area/perimeter); faces farther out lean more.
 let rIn=1;if(lean!=null){const b=profile({...s,taper:1},0);let per=0;for(let i=0;i<b.length;i++){const q=b[(i+1)%b.length];per+=Math.hypot(q[0]-b[i][0],q[1]-b[i][1])}rIn=Math.max(1,2*Math.abs(signedArea(b))/Math.max(per,1e-9))}
 for(let k=0;k<=K;k++){
  const t=k/K,z=t*H;
  let p;
  if(lean==null)p=profile(s,t);
  else{const q=profile({...s,taper:1},t),k=Math.max(.15,1+leanOffset(z,H,lean)/rIn);p=q.map(([x,y])=>[x*k,y*k])}
  rings.push(p.map(([x,y])=>[x,y,z]));
 }
 const n=rings[0].length,sg=signedArea(rings[0])>=0?1:-1,facets=[],mid=[];
 for(let k=0;k<K;k++)mid.push(rings[k].map((v,i)=>[(v[0]+rings[k+1][i][0])/2,(v[1]+rings[k+1][i][1])/2]));
 const edgeBearing=[];
 for(let i=0;i<n;i++){const a=rings[0][i],b=rings[0][(i+1)%n];edgeBearing.push(((Math.atan2(sg*(b[1]-a[1]),-sg*(b[0]-a[0]))/RAD)+360)%360)}
 for(let k=0;k<K;k++)for(let i=0;i<n;i++){
  const q=[rings[k][i],rings[k][(i+1)%n],rings[k+1][(i+1)%n],rings[k+1][i]];
  let N=[0,0,0];
  for(let j=0;j<4;j++){const u=q[j],v=q[(j+1)%4];N[0]+=(u[1]-v[1])*(u[2]+v[2]);N[1]+=(u[2]-v[2])*(u[0]+v[0]);N[2]+=(u[0]-v[0])*(u[1]+v[1])}
  const hx=sg*(q[1][1]-q[0][1]),hy=-sg*(q[1][0]-q[0][0]);
  if(N[0]*hx+N[1]*hy<0)N=N.map(x=>-x);
  const L=Math.hypot(...N);if(!(L>1e-9))continue;N=N.map(x=>x/L);
  const hl=Math.hypot(hx,hy)||1;
  facets.push({edge:i,level:k,quad:q,n:N,nh:[hx/hl,hy/hl],c:[(q[0][0]+q[1][0]+q[2][0]+q[3][0])/4,(q[0][1]+q[1][1]+q[2][1]+q[3][1])/4,(q[0][2]+q[2][2])/2]});
 }
 return {H,K,n,rings,mid,facets,edgeBearing,base:rings[0].map(v=>[v[0],v[1]])};
}
/** Lean of each face from the vertical, degrees (positive = overhang). */
export const facetLean=f=>-Math.asin(Math.max(-1,Math.min(1,f.n[2])))/RAD;

/* ── neighbours ─────────────────────────────────────────────────────────── */
export function neighboursFor(city,geom){
 let c=null;try{c=cityData(city)}catch{c=null}
 if(!c||!Array.isArray(c.buildings))return {list:[],maxH:0,label:'',radius:700};
 const top=geom.rings[geom.K].map(v=>[v[0],v[1]]),list=[];let maxH=0;
 c.buildings.forEach((b,i)=>{
  if(!b||!Array.isArray(b.ring)||b.ring.length<3||!(b.h>0))return;
  if(ringsIntersect(b.ring,geom.base)||ringsIntersect(b.ring,top)||pointInRing(0,0,b.ring))return;
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity,sx=0,sy=0;
  for(const [x,y]of b.ring){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);sx+=x;sy+=y}
  list.push({id:i,ring:b.ring,h:b.h,box:[x0,y0,x1,y1],cx:sx/b.ring.length,cy:sy/b.ring.length});maxH=Math.max(maxH,b.h);
 });
 return {list,maxH,label:c.label||'',radius:c.radius||700};
}
// First neighbour prism met by the 3D segment a→b: {u, nb} or null.
function firstPrism(a,b,nbs){
 const bx0=Math.min(a[0],b[0]),bx1=Math.max(a[0],b[0]),by0=Math.min(a[1],b[1]),by1=Math.max(a[1],b[1]);
 let best=null;
 for(const nb of nbs){
  const q=nb.box;if(q[0]>bx1||q[2]<bx0||q[1]>by1||q[3]<by0)continue;
  if(Math.min(a[2],b[2])>nb.h)continue;
  const r=nb.ring;
  for(let i=0;i<r.length;i++){
   const [cx,cy]=r[i],[dx,dy]=r[(i+1)%r.length],u=segParam(a[0],a[1],b[0],b[1],cx,cy,dx,dy);
   if(u<=1e-6||(best&&u>=best.u))continue;
   if(a[2]+u*(b[2]-a[2])<=nb.h)best={u,nb};
  }
 }
 return best;
}

/* ── one instant ────────────────────────────────────────────────────────── */
/** Every facet's fate at one sun position. kind: ground | sky | neighbour |
 *  self (reflected into the tower's own other wing) | shaded | dark. */
export function glareStep(geom,sun,{rhoN=.13,frit=0,nbs=[],maxNbH=0,reach=900}={}){
 const out=[];if(!sun||!(sun.up>0))return out;
 const d=[-sun.east,-sun.north,-sun.up],sh=Math.hypot(sun.east,sun.north);
 for(const f of geom.facets){
  const dn=dot(d,f.n);if(dn>=0){continue}
  const c=f.c,ox=c[0]+f.nh[0]*.05,oy=c[1]+f.nh[1]*.05,ring=geom.mid[f.level];
  // Toward the sun: own outline until the ray clears the roof, then neighbours.
  if(sh>1e-6){
   const L=Math.min(reach,(geom.H-c[2])*sh/sun.up);
   if(L>0&&crossesRing(ox,oy,ox+sun.east/sh*L,oy+sun.north/sh*L,ring,f.edge)){out.push({f,kind:'shaded'});continue}
   if(maxNbH>c[2]){const s=Math.min(reach/sh,(maxNbH-c[2])/sun.up);if(firstPrism([ox,oy,c[2]],[ox+sun.east*s,oy+sun.north*s,c[2]+sun.up*s],nbs)){out.push({f,kind:'shaded'});continue}}
  }
  const r=reflect(d,f.n),rho=reflectance(rhoN,-dn,frit),rh=Math.hypot(r[0],r[1]);
  let end,s;
  if(r[2]<0){s=c[2]/-r[2];if(s*rh>reach)s=reach/Math.max(rh,1e-9)}
  else s=rh>1e-6?reach/rh:Math.max(geom.H,maxNbH);
  end=[ox+r[0]*s,oy+r[1]*s,c[2]+r[2]*s];
  // Into the tower's own other wing (a second bounce, not followed).
  if(rh>1e-6){const Ls=r[2]>0?Math.min(s*rh,(geom.H-c[2])*rh/r[2]):s*rh;if(crossesRing(ox,oy,ox+r[0]/rh*Ls,oy+r[1]/rh*Ls,ring,f.edge)){out.push({f,kind:'self',r,rho});continue}}
  const hit=nbs.length?firstPrism([ox,oy,c[2]],end,nbs):null;
  if(hit){out.push({f,kind:'neighbour',r,rho,nb:hit.nb,x:ox+(end[0]-ox)*hit.u,y:oy+(end[1]-oy)*hit.u,z:c[2]+(end[2]-c[2])*hit.u});continue}
  if(r[2]<0){
   const g=groundHit(c,r),foot=f.quad.map(p=>{const k=p[2]/-r[2];return [p[0]+k*r[0],p[1]+k*r[1]]});
   out.push({f,kind:'ground',r,rho,x:g[0],y:g[1],foot,far:Math.hypot(g[0],g[1])>reach});
  }else out.push({f,kind:'sky',r,rho,x:end[0],y:end[1]});
 }
 return out;
}

/* ── ground raster ─────────────────────────────────────────────────────── */
export function makeGrid(radius=600,cell=5){const n=Math.ceil(2*radius/cell);return {R:n*cell/2,cell,n}}
export function cellCentre(g,idx){const i=idx%g.n,j=(idx/g.n)|0;return [-g.R+(i+.5)*g.cell,-g.R+(j+.5)*g.cell]}
/** Calls cb(idx) for every grid cell whose centre lies inside the polygon. */
export function rasterPolygon(poly,g,cb){
 let y0=Infinity,y1=-Infinity;for(const p of poly){y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1])}
 const j0=Math.max(0,Math.ceil((y0+g.R)/g.cell-.5)),j1=Math.min(g.n-1,Math.floor((y1+g.R)/g.cell-.5)),xs=[];
 for(let j=j0;j<=j1;j++){
  const y=-g.R+(j+.5)*g.cell;xs.length=0;
  for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];if((a[1]>y)!==(b[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]))}
  xs.sort((p,q)=>p-q);
  for(let k=0;k+1<xs.length;k+=2){const i0=Math.max(0,Math.ceil((xs[k]+g.R)/g.cell-.5)),i1=Math.min(g.n-1,Math.floor((xs[k+1]+g.R)/g.cell-.5));for(let i=i0;i<=i1;i++)cb(j*g.n+i)}
 }
}
/** Beams per cell at one instant. The peak is the cell with the most reflected
 *  irradiance (Σρ); the focus is the strongest cell where two or more beams
 *  overlap. They differ: one beam at a glancing angle can out-shine two at
 *  normal incidence, because reflectance rises steeply past 60°. */
export function overlapAt(beams,g,mask){
 const count=new Map(),rs=new Map();
 for(const b of beams){if(b.kind!=='ground')continue;rasterPolygon(b.foot,g,idx=>{if(mask&&mask[idx])return;count.set(idx,(count.get(idx)||0)+1);rs.set(idx,(rs.get(idx)||0)+b.rho)})}
 let maxCount=0,maxRho=0,maxIdx=-1,focusRho=0,focusIdx=-1;
 for(const [idx,c]of count){const r=rs.get(idx);if(c>maxCount)maxCount=c;if(r>maxRho+1e-12){maxRho=r;maxIdx=idx}if(c>=2&&r>focusRho+1e-12){focusRho=r;focusIdx=idx}}
 return {count,rhoSum:rs,maxCount,maxRho,maxIdx,focusRho,focusIdx,focusCount:focusIdx>=0?count.get(focusIdx):0};
}

/* ── one day ────────────────────────────────────────────────────────────── */
const hhmm=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(Math.floor(m%60)).padStart(2,'0');
export function sunAt(city,date,time){try{const p=solarPosition({city,solarDate:date,solarTime:time,orientation:0});return p.aboveHorizon?{...p.vector,altitude:p.altitude,azimuth:p.azimuth}:null}catch{return null}}
export function glareDay(s,{city=s.city,date=s.solarDate,rhoN=.13,frit=0,lean=null,stepMin=10,radius=600,cell=5,neighbours=true,frames=true,geom=null,near=50}={}){
 geom=geom||facadeFacets(s,{lean});
 const nb=neighbours?neighboursFor(city,geom):{list:[],maxH:0,label:'',radius:700};
 const g=makeGrid(radius,cell),N=g.n*g.n,dt=stepMin/60;
 const hours=new Float32Array(N),maxOv=new Uint8Array(N),mask=new Uint8Array(N);
 {let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const [x,y]of geom.base){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}
  rasterPolygon([[x0,y0],[x1,y0],[x1,y1],[x0,y1]],g,idx=>{const [x,y]=cellCentre(g,idx);if(pointInRing(x,y,geom.base))mask[idx]=1})}
 const faces=geom.edgeBearing.map((bearing,edge)=>({edge,bearing,ground:0,neighbour:0,sky:0}));
 const nbHours=new Map(),out=[];
 let worst=null,focus=null,reach=0,reachBeyond=false,beyond=0,sky=0,anyGround=0,maxOverlap=0;
 for(let m=stepMin/2;m<1440;m+=stepMin){
  const time=hhmm(m),sun=sunAt(city,date,time);if(!sun)continue;
  const beams=glareStep(geom,sun,{rhoN,frit,nbs:nb.list,maxNbH:nb.maxH,reach:radius*1.5});
  const ov=overlapAt(beams,g,mask),faceG=new Set(),faceN=new Set(),faceS=new Set(),nbSet=new Set();
  let far=false;
  for(const b of beams){
   if(b.kind==='ground'){faceG.add(b.f.edge);const dist=Math.hypot(b.x,b.y);if(dist>reach)reach=Math.min(dist,radius);if(dist>radius)reachBeyond=true;if(distToRing(b.x,b.y,geom.base)>near)far=true}
   else if(b.kind==='neighbour'){faceN.add(b.f.edge);nbSet.add(b.nb.id)}
   else if(b.kind==='sky')faceS.add(b.f.edge);
  }
  for(const e of faceG)faces[e].ground+=dt;for(const e of faceN)faces[e].neighbour+=dt;for(const e of faceS)faces[e].sky+=dt;
  for(const id of nbSet)nbHours.set(id,(nbHours.get(id)||0)+dt);
  if(faceS.size)sky+=dt;if(far)beyond+=dt;if(faceG.size)anyGround+=dt;
  const cells=new Int32Array(ov.count.size),hot=[];let k=0;
  for(const [idx,c]of ov.count){hours[idx]+=dt;if(c>maxOv[idx])maxOv[idx]=Math.min(255,c);cells[k++]=idx;if(c>=2)hot.push(idx)}
  maxOverlap=Math.max(maxOverlap,ov.maxCount);
  const at=(idx,rho)=>{const [x,y]=cellCentre(g,idx),edges=new Set();for(const b of beams)if(b.kind==='ground'&&pointInRing(x,y,b.foot))edges.add(b.f.edge);return {time,count:ov.count.get(idx),rho,W:GLARE_DNI*rho,x,y,edges:[...edges],frame:out.length}};
  if(ov.maxIdx>=0&&(!worst||ov.maxRho>worst.rho+1e-9))worst=at(ov.maxIdx,ov.maxRho);
  if(ov.focusIdx>=0&&(!focus||ov.focusRho>focus.rho+1e-9))focus=at(ov.focusIdx,ov.focusRho);
  if(frames)out.push({time,sun,beams:beams.filter(b=>b.kind==='ground'||b.kind==='sky'||b.kind==='neighbour').map(b=>({e:b.f.edge,k:b.f.level,cx:b.f.c[0],cy:b.f.c[1],x:b.x,y:b.y,kind:b.kind,foot:b.foot||null,nb:b.nb?b.nb.id:-1,rho:b.rho})),cells,hot:Int32Array.from(hot),peakIdx:ov.focusIdx,count:ov.focusCount,W:GLARE_DNI*ov.maxRho});
  else out.push(null);
 }
 const nbs=nb.list.filter(n=>nbHours.has(n.id)).map(n=>({...n,hours:nbHours.get(n.id)})).sort((a,b)=>b.hours-a.hours);
 return {city,date,rhoN,frit,lean,stepMin,grid:g,hours,maxOv,mask,frames:frames?out:[],faces,neighbours:nb,hitNeighbours:nbs,worst,focus,maxOverlap,reach,reachBeyond,beyond,sky,anyGround,geom,dt};
}

/* ── a year, sampled ────────────────────────────────────────────────────── */
export const YEAR_DAYS=Array.from({length:24},(_,i)=>[String((i>>1)+1).padStart(2,'0'),i&1?'16':'01']);
/** Accumulate one sampled day into a year tally (each day stands for 365/24 days). */
export function yearAdd(tally,day){
 const w=365/YEAR_DAYS.length;
 if(!tally.hours)tally.hours=new Float32Array(day.hours.length);
 for(let i=0;i<day.hours.length;i++)if(day.hours[i])tally.hours[i]+=day.hours[i]*w;
 tally.nb=tally.nb||new Map();for(const n of day.hitNeighbours)tally.nb.set(n.id,(tally.nb.get(n.id)||0)+n.hours*w);
 tally.days=(tally.days||0)+1;tally.cell=day.grid.cell;return tally;
}
export function yearSummary(t,limit=50){
 let g=0,over=0;if(t.hours)for(const h of t.hours){if(h>g)g=h;if(h>limit)over++}
 let nh=0;if(t.nb)for(const v of t.nb.values())nh=Math.max(nh,v);
 return {ground:g,area:over*(t.cell||5)**2,neighbour:nh,days:t.days||0};
}

/* ── text ───────────────────────────────────────────────────────────────── */
export const GLARE_TEXT={
 en:{
  title:'Glare lab',
  lede:'Sunlight off the glass, followed to the ground. Each face is cut into flat facets at twelve levels; every facet that sees the sun throws a mirror beam, and the plan counts where the beams land, for how long, and where several land on the same spot.',
  plan:'Plan, north up',planAria:'Animated plan of reflected sunlight around the tower',
  section:'Section through face {f}',sectionAria:'Section through the selected face, with sun rays and their reflections',
  play:'Play',pause:'Pause',time:'Time',date:'Date',city:'City',quick:'Key dates',
  mar:'Mar equinox',jun:'Jun solstice',sep:'Sep equinox',dec:'Dec solstice',
  rho:'Glass visible reflectance ρv',rhoHint:'Clear float about 8 %; low-e double glazing about 13 % at normal incidence; solar-control glass 15–40 %. Reflectance rises at glancing angles.',
  frit:'Frit / ceramic-dot coverage',fritHint:'Treated as removing that share of the mirror reflection. A simplification: real frit also scatters light.',
  leanOn:'Override façade lean',lean:'Lean at crown',leanHint:'Grows from 0° at grade to this value at the top. Positive overhangs, as the top of 20 Fenchurch Street does; negative leans back.',
  leanModel:'Model taper and twist: lean {v}°',
  matNote:'ρv starts from the model material, {m}.',matOther:'The model material is not clear glass; ρv applies to the glazed areas.',
  legend:'Hours of reflection so far today',radius:'Plan radius',
  bars:'Hours each face reflects to the ground',barsNone:'No face reflects the sun to the ground on this date.',
  barHint:'Select a face to draw its section.',
  peak:'Peak reflected irradiance',single:'×1, no overlap',conc:'Strongest convergence',beyond:'Hours of ground reflection beyond 50 m',
  reach:'Farthest reach from tower centre',worst:'Worst time',faces:'Faces responsible',nb:'Neighbour façades hit',sky:'Hours with beams rising to the sky',
  none:'none',beyondR:'beyond {r} m',
  nbFmt:'{n} buildings; worst {h} h ({ht} m tall, {d} m {dir})',
  vNone:'No face reflects the sun to the ground on {date}.',
  vDiverge:'Beams diverge: {n} faces reflect to the ground, but no two beams land on the same spot. Peak about {w} W/m², a single beam.',
  vConverge:'{c} beams converge at {time} on {date}, {d} m {dir} of the tower centre: about {w} W/m² on a surface facing them.',
  year:'Estimate the year',yearRun:'Computing {p} %',
  yearOut:'Year, from 24 sampled days: worst ground point {g} h/yr; {a} m² of ground over 50 h/yr; worst neighbour façade {nh} h/yr.',
  yearNote:'The City of London treats under 50 hours a year of reflected sun as unlikely to cause serious discomfort glare, except at sensitive locations.',
  howHead:'How to read it',
  how:'Amber lines are sun reflected from each lit facet, drawn from the face to where it lands. The ground tint adds up the hours of reflection as the day runs, and a ring marks a spot where two or more beams overlap. That overlap, not the brightness of one pane, is what concentrates heat. Flat and convex faces spread their beams apart; concave corners and a top that curves outward bring them together. A face leaning back throws high summer sun far along the street, where drivers meet it; a face leaning out throws it steeply down at the foot of the tower.',
  precHead:'Why it matters',
  prec:'In 2013 the concave south face of 20 Fenchurch Street, London, was reported to focus sunlight onto the street strongly enough to warp parts of a parked car; a sunshade of horizontal fins was later fitted. Guests at Vdara, Las Vegas, reported burning heat on the pool deck below its curved glass, and a film was applied to cut the reflection. At the Walt Disney Concert Hall, Los Angeles, polished steel panels reflected into nearby flats and pavements, and were dulled in 2005. The City of London has asked for solar glare assessment at planning stage since its 2017 advice note, and the London Plan 2021 (Policy D9) asks tall buildings to avoid adverse reflected glare.',
  cannotHead:'Cannot claim',
  cannot:'Mirror reflection from flat facets, traced from facet centres; the sun as a point with no 0.5° disc spread; no sky or diffuse light, no atmospheric loss, no second bounces. No disability-glare metric (no DGP, no driver sightlines), no neighbour windows or occupants; neighbour heights are as mapped or inferred. A screening sketch only: a formal solar glare and convergence study is required for planning.',
  m1:'One facet, at the angle the sun meets it: the ray in, the normal, the ray out at the same angle to the normal. The bar is the peak on the ground, split in proportion into the beams that land on one cell.',
  mth:{aria:'Method drawing: the reflection at one facet — the sun ray in, the facet normal, the mirror beam out — and the peak reflected irradiance on the ground, split in proportion into the beams that land on one cell.',
   title:'peak {w} W/m², {t}',
   cell:'{n} beams on one {c} {u} cell, {d} {u} {b}°',
   seg:'{f} · ρ {r} · {w} W/m²',
   total:'DNI {d} · Σρ {s}',
   inc:'{a}° in, {a}° out',
   sunUp:'sun {a}° up',
   normal:'normal',
   law1:'r = d − 2(d·n)n',
   law2:'ρ(θ)=ρn+(1−ρn)·w(θ)',
   law3:'peak = DNI · Σρ'},
  sourcesHead:'Sources',
  sources:'City of London, Planning Advice Note: Solar Glare, July 2017 (with P. Littlefair) · BRE IP 3/87, Solar dazzle reflected from sloping glazed facades · Mayor of London, The London Plan 2021, Policy D9 · 20 Fenchurch Street: National Geographic, 4 Sep 2013 · Vdara: NBC News and ENR, 2010 · Disney Hall: Playbill, 2004; Texas Tech Architecture Library archive · Sun: SunCalc 2.1.0 · DNI reference 0.8 kW/m², as elsewhere in FormHypes · Neighbours © OpenStreetMap contributors, ODbL',
  compass:['N','NE','E','SE','S','SW','W','NW'],
  cityNames:{tokyo:'Tokyo',bangkok:'Bangkok',kl:'Kuala Lumpur',jakarta:'Jakarta',hcmc:'Ho Chi Minh City',shenzhen:'Shenzhen'},
  mats:{'float':'clear float glass','low-e':'low-e insulated glazing','reflective':'reflective coated glass','pv':'photovoltaic glass'},
  h:'h',m:'m',w:'W/m²'
 },
 th:{
  title:'ห้องทดลองแสงสะท้อน',
  lede:'ติดตามแสงแดดที่สะท้อนจากกระจกลงสู่พื้นดิน ผิวอาคารแต่ละด้านถูกแบ่งเป็นแผ่นเรียบสิบสองระดับ แผ่นที่รับแดดจะสะท้อนลำแสงแบบกระจกเงา ผังจะนับว่าลำแสงตกที่ใด นานเท่าใด และจุดใดที่ลำแสงหลายลำตกซ้อนกัน',
  plan:'ผัง ทิศเหนืออยู่ด้านบน',planAria:'ผังเคลื่อนไหวของแสงแดดสะท้อนรอบอาคาร',
  section:'รูปตัดผ่านด้าน {f}',sectionAria:'รูปตัดผ่านด้านที่เลือก แสดงรังสีแดดและแสงสะท้อน',
  play:'เล่น',pause:'หยุด',time:'เวลา',date:'วันที่',city:'เมือง',quick:'วันสำคัญ',
  mar:'วิษุวัต มี.ค.',jun:'ครีษมายัน มิ.ย.',sep:'วิษุวัต ก.ย.',dec:'เหมายัน ธ.ค.',
  rho:'ค่าการสะท้อนแสงที่มองเห็นของกระจก ρv',rhoHint:'กระจกใสธรรมดาประมาณ 8 % กระจกสองชั้น low-e ประมาณ 13 % ที่มุมตกกระทบตั้งฉาก กระจกควบคุมความร้อน 15–40 % ค่าการสะท้อนจะสูงขึ้นเมื่อแสงตกกระทบเฉียง',
  frit:'สัดส่วนลายเซรามิก (frit)',fritHint:'คิดเป็นการลดแสงสะท้อนแบบกระจกเงาตามสัดส่วนนั้น เป็นการประมาณอย่างง่าย เพราะลายเซรามิกจริงยังกระจายแสงด้วย',
  leanOn:'กำหนดความเอียงของผนังเอง',lean:'ความเอียงที่ยอดอาคาร',leanHint:'เพิ่มจาก 0° ที่ระดับพื้นจนถึงค่านี้ที่ยอด ค่าบวกคือยื่นออก เช่นส่วนบนของ 20 Fenchurch Street ค่าลบคือเอนเข้า',
  leanModel:'ความสอบและการบิดของแบบ: เอียง {v}°',
  matNote:'ρv เริ่มจากวัสดุของแบบ คือ {m}',matOther:'วัสดุของแบบไม่ใช่กระจกใส ค่า ρv ใช้กับส่วนที่เป็นกระจก',
  legend:'ชั่วโมงที่ได้รับแสงสะท้อนถึงขณะนี้',radius:'รัศมีผัง',
  bars:'ชั่วโมงที่แต่ละด้านสะท้อนแสงลงพื้น',barsNone:'ไม่มีด้านใดสะท้อนแสงแดดลงพื้นในวันนี้',
  barHint:'เลือกด้านเพื่อแสดงรูปตัด',
  peak:'ความเข้มแสงสะท้อนสูงสุด',single:'×1 ไม่มีการซ้อนกัน',conc:'จุดที่ลำแสงรวมกันแรงที่สุด',beyond:'ชั่วโมงที่แสงสะท้อนตกไกลเกิน 50 ม.',
  reach:'ระยะไกลสุดจากศูนย์กลางอาคาร',worst:'ช่วงเวลาที่รุนแรงที่สุด',faces:'ด้านที่เป็นต้นเหตุ',nb:'ผนังอาคารข้างเคียงที่โดนแสง',sky:'ชั่วโมงที่ลำแสงพุ่งขึ้นฟ้า',
  none:'ไม่มี',beyondR:'เกิน {r} ม.',
  nbFmt:'{n} อาคาร หนักสุด {h} ชม. (สูง {ht} ม. ห่าง {d} ม. ทาง{dir})',
  vNone:'ไม่มีด้านใดสะท้อนแสงแดดลงพื้นในวันที่ {date}',
  vDiverge:'ลำแสงกระจายออก: มี {n} ด้านที่สะท้อนลงพื้น แต่ไม่มีลำแสงใดตกซ้อนกัน ความเข้มสูงสุดประมาณ {w} W/m² จากลำแสงเดียว',
  vConverge:'ลำแสง {c} ลำรวมกันเวลา {time} วันที่ {date} ห่างจากศูนย์กลางอาคาร {d} ม. ทาง{dir} ความเข้มประมาณ {w} W/m² บนพื้นผิวที่หันรับ',
  year:'ประเมินทั้งปี',yearRun:'กำลังคำนวณ {p} %',
  yearOut:'ทั้งปี จาก 24 วันตัวอย่าง: จุดบนพื้นที่หนักสุด {g} ชม./ปี พื้นที่ {a} ตร.ม. เกิน 50 ชม./ปี ผนังอาคารข้างเคียงที่หนักสุด {nh} ชม./ปี',
  yearNote:'City of London ถือว่าแสงสะท้อนน้อยกว่า 50 ชั่วโมงต่อปีไม่น่าก่อปัญหาแสงจ้ารบกวนอย่างร้ายแรง ยกเว้นในตำแหน่งที่อ่อนไหว',
  howHead:'วิธีอ่าน',
  how:'เส้นสีอำพันคือแสงแดดที่สะท้อนจากแต่ละแผ่น ลากจากผนังไปยังจุดที่ตก สีบนพื้นสะสมชั่วโมงที่ได้รับแสงสะท้อนตามเวลาที่เดินไป วงกลมระบุจุดที่ลำแสงตั้งแต่สองลำตกซ้อนกัน การซ้อนกันนี้เองที่ทำให้ความร้อนรวมตัว ไม่ใช่ความสว่างของกระจกบานเดียว ผนังเรียบและผนังนูนทำให้ลำแสงแยกออกจากกัน มุมเว้าและส่วนบนที่โค้งยื่นออกทำให้ลำแสงมารวมกัน ผนังที่เอนเข้าส่งแดดสูงช่วงฤดูร้อนไปไกลตามถนน ซึ่งเป็นจุดที่ผู้ขับขี่เผชิญ ส่วนผนังที่ยื่นออกส่งแสงดิ่งลงที่โคนอาคาร',
  precHead:'เหตุใดจึงสำคัญ',
  prec:'ปี 2013 มีรายงานว่าผนังเว้าด้านใต้ของ 20 Fenchurch Street กรุงลอนดอน รวมแสงแดดลงบนถนนจนชิ้นส่วนของรถที่จอดอยู่บิดเสียรูป ภายหลังจึงติดแผงบังแดดแบบครีบแนวนอน แขกของโรงแรม Vdara ในลาสเวกัสรายงานความร้อนแผดเผาบนลานสระว่ายน้ำใต้ผนังกระจกโค้ง จึงมีการติดฟิล์มเพื่อลดแสงสะท้อน ที่ Walt Disney Concert Hall ในลอสแอนเจลิส แผ่นเหล็กขัดเงาสะท้อนแสงเข้าห้องพักและทางเท้าใกล้เคียง และถูกทำให้ด้านลงในปี 2005 City of London กำหนดให้ประเมินแสงสะท้อนตั้งแต่ขั้นขออนุญาตตามเอกสารแนะนำปี 2017 และ London Plan 2021 (นโยบาย D9) ให้อาคารสูงหลีกเลี่ยงแสงสะท้อนที่ก่อผลกระทบ',
  cannotHead:'สิ่งที่สรุปไม่ได้',
  cannot:'คิดเฉพาะการสะท้อนแบบกระจกเงาจากแผ่นเรียบ ลากจากจุดกึ่งกลางแผ่น ถือดวงอาทิตย์เป็นจุดโดยไม่มีการกระจายของจานสุริยะ 0.5° ไม่มีแสงจากท้องฟ้าหรือแสงกระจาย ไม่คิดการสูญเสียในบรรยากาศ ไม่ติดตามการสะท้อนซ้ำ ไม่มีตัวชี้วัดแสงจ้าบดบังการมองเห็น (ไม่มี DGP ไม่มีแนวสายตาผู้ขับขี่) ไม่มีหน้าต่างหรือผู้ใช้อาคารข้างเคียง ความสูงอาคารข้างเคียงมาจากข้อมูลแผนที่หรือการอนุมาน เป็นเพียงการคัดกรองเบื้องต้น การขออนุญาตต้องมีการศึกษาแสงสะท้อนและการรวมแสงอย่างเป็นทางการ',
  m1:'หนึ่งแผ่นเรียบ ณ มุมที่แสงเข้ามา: ลำแสงเข้า เส้นปกติ ลำแสงออกที่ทำมุมกับเส้นปกติเท่ากัน แถบคือค่าสูงสุดบนพื้น แบ่งตามสัดส่วนเป็นลำแสงที่ตกบนช่องเดียวกัน',
  mth:{aria:'ภาพวิธีคำนวณ: การสะท้อนที่แผ่นเรียบหนึ่งแผ่น คือลำแสงที่เข้ามา เส้นปกติของแผ่น และลำแสงที่สะท้อนออก พร้อมค่าความเข้มแสงสะท้อนสูงสุดบนพื้น แบ่งตามสัดส่วนเป็นลำแสงที่ตกบนช่องเดียวกัน',
   title:'ค่าสูงสุด {w} W/m² เวลา {t}',
   cell:'{n} ลำแสงตกบนช่อง {c} {u} ห่างจากศูนย์กลางอาคาร {d} {u} ทิศ {b}°',
   seg:'ลำแสง {f} · ρ {r} · {w} W/m²',
   total:'รังสีตรง {d} · Σρ {s}',
   inc:'{a}° เข้า {a}° ออก',
   sunUp:'แสดดสูง {a}°',
   normal:'เส้นปกติ',
   law1:'สะท้อน: r = d − 2(d·n)n',
   law2:'การสะท้อนแสง: ρ(θ)=ρn+(1−ρn)·w(θ)',
   law3:'ค่าสูงสุด = DNI · Σρ'},
  sourcesHead:'แหล่งอ้างอิง',
  sources:'City of London, Planning Advice Note: Solar Glare, กรกฎาคม 2017 (ร่วมกับ P. Littlefair) · BRE IP 3/87, Solar dazzle reflected from sloping glazed facades · Mayor of London, The London Plan 2021, นโยบาย D9 · 20 Fenchurch Street: National Geographic, 4 ก.ย. 2013 · Vdara: NBC News และ ENR, 2010 · Disney Hall: Playbill, 2004; คลังเอกสาร Texas Tech Architecture Library · ดวงอาทิตย์: SunCalc 2.1.0 · ค่าอ้างอิง DNI 0.8 kW/m² เช่นเดียวกับส่วนอื่นของ FormHypes · อาคารข้างเคียง © OpenStreetMap contributors, ODbL',
  compass:['เหนือ','ตะวันออกเฉียงเหนือ','ตะวันออก','ตะวันออกเฉียงใต้','ใต้','ตะวันตกเฉียงใต้','ตะวันตก','ตะวันตกเฉียงเหนือ'],
  cityNames:{tokyo:'โตเกียว',bangkok:'กรุงเทพฯ',kl:'กัวลาลัมเปอร์',jakarta:'จาการ์ตา',hcmc:'นครโฮจิมินห์',shenzhen:'เซินเจิ้น'},
  mats:{'float':'กระจกใสธรรมดา','low-e':'กระจกฉนวน low-e','reflective':'กระจกเคลือบสะท้อนแสง','pv':'กระจกเซลล์แสงอาทิตย์'},
  h:'ชม.',m:'ม.',w:'W/m²'
 },
 zh:{
  title:'反光实验室',
  lede:'追踪玻璃反射的阳光落到地面的位置。每个立面在十二个高度上被切分成平面单元；每个受晒的单元都像镜子一样反射出一束光，平面图统计光束落在哪里、持续多久，以及哪些位置有多束光叠加。',
  plan:'平面图，上为北',planAria:'塔楼周边反射阳光的动态平面图',
  section:'剖面：{f} 立面',sectionAria:'所选立面的剖面，显示入射阳光及其反射',
  play:'播放',pause:'暂停',time:'时间',date:'日期',city:'城市',quick:'关键日期',
  mar:'三月春分',jun:'六月夏至',sep:'九月秋分',dec:'十二月冬至',
  rho:'玻璃可见光反射率 ρv',rhoHint:'普通透明浮法玻璃约 8%；Low-E 中空玻璃在法向入射时约 13%；阳光控制玻璃 15–40%。入射角越斜，反射率越高。',
  frit:'釉点（彩釉）覆盖率',fritHint:'按比例扣除镜面反射。这是简化处理：实际釉点还会散射光线。',
  leanOn:'自定义立面倾角',lean:'顶部倾角',leanHint:'从地面的 0° 逐渐增加到顶部的设定值。正值为外挑，如 20 Fenchurch Street 的上部；负值为后仰。',
  leanModel:'模型的收分与扭转：倾角 {v}°',
  matNote:'ρv 初值取自模型材料：{m}。',matOther:'模型材料并非透明玻璃；ρv 适用于玻璃部分。',
  legend:'截至此刻的累计反射小时数',radius:'平面范围',
  bars:'各立面向地面反射的小时数',barsNone:'当天没有立面把阳光反射到地面。',
  barHint:'选择一个立面以绘制其剖面。',
  peak:'峰值反射辐照度',single:'×1，无叠加',conc:'最强汇聚点',beyond:'反射落在 50 米以外的小时数',
  reach:'距塔楼中心的最远距离',worst:'最不利时刻',faces:'造成影响的立面',nb:'被照射的相邻建筑立面',sky:'光束射向天空的小时数',
  none:'无',beyondR:'超过 {r} 米',
  nbFmt:'{n} 栋建筑；最严重 {h} 小时（高 {ht} 米，位于{dir} {d} 米）',
  vNone:'{date} 没有立面把阳光反射到地面。',
  vDiverge:'光束发散：{n} 个立面向地面反射，但没有两束光落在同一处。峰值约 {w} W/m²，仅单束。',
  vConverge:'{date} {time}，{c} 束光汇聚于塔楼中心{dir} {d} 米处：迎光表面约 {w} W/m²。',
  year:'估算全年',yearRun:'计算中 {p}%',
  yearOut:'全年（24 个采样日）：地面最不利点 {g} 小时/年；超过 50 小时/年的地面面积 {a} 平方米；最不利相邻立面 {nh} 小时/年。',
  yearNote:'伦敦金融城认为，每年少于 50 小时的反射阳光不太可能造成严重的不适眩光，敏感位置除外。',
  howHead:'如何解读',
  how:'琥珀色线条是每个受晒单元反射的阳光，从立面画到落点。地面色调随时间推移累计反射小时数，圆圈标出两束或更多光叠加的位置。造成热量集中的正是这种叠加，而不是单块玻璃有多亮。平直和外凸的立面让光束彼此分散；内凹的转角和向外弯出的顶部则让光束汇聚。后仰的立面会把夏季高角度阳光远远投向街道，迎面而来的驾驶者首当其冲；外挑的立面则把光陡直地投到塔楼脚下。',
  precHead:'为何重要',
  prec:'2013 年，据报道伦敦 20 Fenchurch Street 内凹的南立面把阳光聚焦到街上，致使一辆停放汽车的部分部件变形，后来加装了水平遮阳百叶。拉斯维加斯 Vdara 酒店的住客反映，弧形玻璃下方的泳池平台热得灼人，酒店随后贴膜以减少反射。洛杉矶华特·迪士尼音乐厅的抛光不锈钢板把光反射进附近住宅和人行道，这些板材于 2005 年做了消光处理。伦敦金融城自 2017 年的规划指引起要求在规划阶段评估反光，《伦敦规划 2021》（D9 政策）也要求高层建筑避免造成不良反射眩光。',
  cannotHead:'不能据此断言',
  cannot:'仅计算平面单元的镜面反射，从单元中心追踪；把太阳视为点光源，不计 0.5° 日盘扩散；不含天空光或漫射光，不计大气衰减，不追踪二次反射。没有失能眩光指标（无 DGP，无驾驶视线），不含相邻建筑的窗户或使用者；相邻建筑高度取自地图标注或推断。这只是初步筛查：规划报批需要正式的反光与聚光研究。',
  m1:'一个立面单元在阳光入射角下的反射：入射、法线、与法线成等角的出射。条形图为地面峰值，按落在同一网格的光束比例拆分。',
  mth:{aria:'方法图示：一个立面单元的反射——入射阳光、单元法线、镜面反射光束，以及地面上的峰值反射辐照度，按落在同一网格的光束比例拆分。',
   title:'峰值 {w} W/m²，{t}',
   cell:'{n} 束 {c} {u} {d} {u} {b}°',
   seg:'立面 {f} · ρ {r} · {w} W/m²',
   total:'直射 {d} · Σρ {s}',
   inc:'角 {a}°',
   sunUp:'日 {a}°',
   normal:'法线',
   law1:'反射: r = d − 2(d·n)n',
   law2:'反射率: ρ(θ)=ρn+(1−ρn)·w(θ)',
   law3:'峰值 = DNI · Σρ'},
  sourcesHead:'资料来源',
  sources:'City of London, Planning Advice Note: Solar Glare，2017 年 7 月（与 P. Littlefair 合作）· BRE IP 3/87, Solar dazzle reflected from sloping glazed facades · Mayor of London, The London Plan 2021，D9 政策 · 20 Fenchurch Street：National Geographic，2013 年 9 月 4 日 · Vdara：NBC News 与 ENR，2010 · 迪士尼音乐厅：Playbill，2004；Texas Tech Architecture Library 档案 · 太阳位置：SunCalc 2.1.0 · DNI 参考值 0.8 kW/m²，与 FormHypes 其他部分一致 · 相邻建筑 © OpenStreetMap contributors，ODbL',
  compass:['北','东北','东','东南','南','西南','西','西北'],
  cityNames:{tokyo:'东京',bangkok:'曼谷',kl:'吉隆坡',jakarta:'雅加达',hcmc:'胡志明市',shenzhen:'深圳'},
  mats:{'float':'透明浮法玻璃','low-e':'Low-E 中空玻璃','reflective':'镀膜反射玻璃','pv':'光伏玻璃'},
  h:'小时',m:'米',w:'W/m²'
 }
};

/* ── the method, drawn ──────────────────────────────────────────────────────
   The paragraph this replaces explained, in one long breath, how a flat facet
   turns sunlight into a mirror beam and how a mirror beam becomes heat on the
   ground. A paragraph cannot show an ANGLE, and it cannot show a PROPORTION.

   The sheet does both. On the left, the reflection at one facet: the ray in,
   the normal, the ray out — the ray out at the same angle to the normal as
   the ray in, which is what makes a mirror a mirror and not a lamp. On the
   right, the peak on the ground as a bar split in proportion into the beams
   that land on the same cell. That sum is the whole argument of the lab: one
   beam only moves light around, and it is several beams on one square metre
   that add up.

   Every number on the sheet is a number the lab has already computed. The
   payload comes from glareMethodPayload(), which reads the SAME glareDay()
   result the lab reports from — the same peak cell, the same beams, the same
   reflectance for each — so the drawing and the arithmetic cannot drift apart.
   Nothing here is drawn from a constant.

   Every WORD on the sheet comes out of GLARE_TEXT[lang]. */
const MW=330,MH=240;
/* One material per beam: two beams are two materials, so the eye can count
   them without reading the labels. */
const PMAT=['conc','wool','earth','board'];

/* One instant of the lab, taken apart: the peak cell, the beams that land on
   it, and the geometry of the reflection that threw each of them. */
export function glareMethodPayload(day){
 if(!day||!day.geom||!Array.isArray(day.frames)||!day.frames.length)return null;
 const src=day.focus||day.worst;          // the strongest cell, overlapped if it is
 if(!src)return null;
 const fr=day.frames[src.frame];
 if(!fr||!fr.sun||!Array.isArray(fr.beams))return null;
 /* The beams that land on that cell: the same test the raster used, so the
    split of the bar is the lab's own arithmetic and not a second opinion. */
 const hits=fr.beams.filter(b=>b.kind==='ground'&&b.foot&&pointInRing(src.x,src.y,b.foot));
 if(!hits.length)return null;
 const F=day.geom.facets,d=[-fr.sun.east,-fr.sun.north,-fr.sun.up];
 const parts=hits.map(b=>{
  const f=F.find(x=>x.edge===b.e&&x.level===b.k);
  if(!f)return null;
  const rho=Number.isFinite(b.rho)?b.rho:0;
  return {edge:b.e,level:b.k,rho,W:GLARE_DNI*rho,
   theta:Math.acos(Math.max(-1,Math.min(1,-dot(d,f.n))))/RAD,
   bearing:day.geom.edgeBearing[b.e],n:f.n,c:f.c,x:b.x,y:b.y};
 }).filter(Boolean).sort((a,b)=>b.rho-a.rho||a.edge-b.edge||a.level-b.level);
 if(!parts.length)return null;
 return {peak:src.W,count:src.count,time:src.time,x:src.x,y:src.y,
  dist:Math.hypot(src.x,src.y),bearing:(Math.atan2(src.y,src.x)/RAD+360)%360,
  cell:day.grid?day.grid.cell:0,rhoN:day.rhoN,frit:day.frit,dni:GLARE_DNI,
  sun:{east:fr.sun.east,north:fr.sun.north,up:fr.sun.up,altitude:fr.sun.altitude},
  parts,rhoSum:parts.reduce((a,b)=>a+b.rho,0),main:parts[0]};
}

export function glareMethodSVG(p,{lang='en'}={}){
 const c=GLARE_TEXT[lang]||GLARE_TEXT.en,M=c.mth;
 if(!p)return sheet('',MW,MH,'');
 const f0=v=>Number.isFinite(v)?v.toFixed(0):'—';
 const f1=v=>Number.isFinite(v)?v.toFixed(1):'—';
 const f2=v=>Number.isFinite(v)?v.toFixed(2):'—';
 const dirWord=b=>(c.compass[Math.round(((b%360)+360)%360/45)%8]||'');
 const faceLabel=(i,b)=>String(i+1).padStart(2,'0')+' · '+dirWord(b)+' '+Math.round(b)+'°';
 /* The house's own ruler: a note is centred under its segment, and the width
    it is centred by has to be the width the layout engine reserved for it. */
 const wOf=t=>layout([{k:'txt',x:0,y:0,tx:0,ty:0,text:t,o:{}}]).out[0].w;
 const m=p.main;
 /* The section: the horizontal axis is the face's own outward normal, so the
    normal, the two rays and the facet's lean are the lab's real angles. */
 const nl=Math.hypot(m.n[0],m.n[1])||1;
 const u=[m.n[0]/nl,m.n[1]/nl];          // the face's outward normal, horizontal
 const n2=[nl,m.n[2]],fd=[-m.n[2],nl];   // the normal in the section, and up the face
 const d=[-p.sun.east,-p.sun.north,-p.sun.up];
 const d2=[d[0]*u[0]+d[1]*u[1],d[2]];    // the ray in, in the section
 const r=reflect(d,m.n);
 const r2=[r[0]*u[0]+r[1]*u[1],r[2]];    // the ray out
 const FX=100,FY=76,RAY=72,NRM=46,HALF=13,EXT=30,BACK=40;
 const S=(x,y)=>[FX+x,FY-y];
 const poly=pts=>'M'+pts.map(q=>`${q[0].toFixed(2)} ${q[1].toFixed(2)}`).join(' L')+' Z';
 /* An arrowhead on a ray that is not vertical: the vocabulary's own head,
    turned to the ray's direction, the way the fire lab turns it to a stair. */
 const headOn=(x,y,v,on)=>{
  const L=Math.hypot(v[0],v[1])||1,ux=v[0]/L,uy=v[1]/L;
  const th=Math.atan2(-ux,uy),ax=x-2.6*Math.cos(th),ay=y-2.6*Math.sin(th);
  return `<g transform="rotate(${th.toFixed(4)} ${ax.toFixed(2)} ${ay.toFixed(2)})">${head(ax,ay,'d',on)}</g>`;
 };
 let g='';
 /* The tower's mass, cut: hatched concrete, and the facet is a part of it. */
 const b0=[-fd[0]*HALF,-fd[1]*HALF],b1=[fd[0]*HALF,fd[1]*HALF];
 const m0=[-fd[0]*(HALF+EXT),-fd[1]*(HALF+EXT)],m1=[fd[0]*(HALF+EXT),fd[1]*(HALF+EXT)];
 const P2=(x,y)=>S(x,y);
 g+=cut(poly([P2(m0[0],m0[1]),P2(m1[0],m1[1]),
  P2(m1[0]-u[0]*BACK,m1[1]-u[1]*BACK),P2(m0[0]-u[0]*BACK,m0[1]-u[1]*BACK)]),'conc');
 /* The glazing: glass is drawn as an outline, never as a poché — a cut pane
    of glass would be a lie about what glass looks like. */
 const G=2.6,off=(v,o)=>[v[0]+u[0]*o,v[1]+u[1]*o];
 g+=cut(poly([P2(m0[0],m0[1]),P2(m1[0],m1[1]),
  P2(off(m1,G)[0],off(m1,G)[1]),P2(off(m0,G)[0],off(m0,G)[1])]),'glass');
 /* The facet itself: the pane that does the reflecting, marked as a solid
    bead in the face, the way a detail marks the unit it is talking about. */
 g+=cut(poly([P2(b0[0],b0[1]),P2(b1[0],b1[1]),
  P2(off(b1,G)[0],off(b1,G)[1]),P2(off(b0,G)[0],off(b0,G)[1])]),'seal');
 /* The normal, and the two rays: the ray in travels along d, the ray out
    along r = d − 2(d·n)n, which is the same length and the same angle. */
 const nrm=[n2[0]*NRM,-n2[1]*NRM];
 g+=cl(FX-nrm[0],FY-nrm[1],FX+nrm[0],FY+nrm[1]);
 const inc=[-d2[0]*RAY,d2[1]*RAY],out=[r2[0]*RAY,-r2[1]*RAY];
 g+=flow(`M${FX} ${FY} L${(FX+inc[0]).toFixed(2)} ${(FY+inc[1]).toFixed(2)}`,false);
 g+=headOn(FX,FY,[d2[0],-d2[1]],false);
 g+=flow(`M${FX} ${FY} L${(FX+out[0]).toFixed(2)} ${(FY+out[1]).toFixed(2)}`,true);
 g+=headOn(FX+out[0],FY+out[1],[r2[0],-r2[1]],true);

 /* ── the bar: the peak on the ground, split in proportion ───────────────── */
 const BX0=196,BX1=316,BY0=48,BY1=72,BW=BX1-BX0;
 const tot=p.parts.reduce((a,b)=>a+b.W,0)||1;
 let bx=BX0;const mids=[];
 p.parts.forEach((part,i)=>{
  const w=Math.max(0,BW*part.W/tot);
  mids.push(bx+w/2);
  g+=cut(`M${bx.toFixed(2)} ${BY0} H${(bx+w).toFixed(2)} V${BY1} H${bx.toFixed(2)} Z`,PMAT[i%PMAT.length]);
  bx+=w;
 });
 g+=txt(BX0-3,24,fill(M.title,{w:f0(p.peak),t:p.time}),{anchor:'start'});
 /* The total, dimensioned over the bar. It sits ABOVE the bar so that the
    leaders to the segments below it never cross it. */
 g+=dim(BX0,40,BX1,40,fill(M.total,{d:f0(p.dni),s:f2(p.rhoSum)}));
 /* The beams, each named: which face it came from, how much of the light it
    carried back, and how much of the peak it is. */
 for(let i=0;i<p.parts.length;i++){
  const part=p.parts[i];
  const text=fill(M.seg,{f:faceLabel(part.edge,part.bearing),r:f2(part.rho),w:f0(part.W)});
  g+=leader(mids[i],BY1,mids[i]+wOf(text)/2,112+i*24,text,{anchor:'end'});
 }
 /* Where the peak is: how many beams, on one cell of the raster, how far out.
    It captions the bar it belongs to, so it sits under it and not in a margin. */
 g+=txt(BX0-3,202,fill(M.cell,{n:p.count,c:p.cell,u:c.m,d:f0(p.dist),b:f0(p.bearing)}),{anchor:'start'});

 /* ── the laws, in the sheet's own free space ────────────────────────────── */
 g+=txt(6,160,M.law1,{anchor:'start'});
 g+=txt(6,186,M.law2,{anchor:'start'});
 g+=txt(6,212,M.law3,{anchor:'start'});

 /* ── the annotation, in the margin columns ──────────────────────────────── */
 const LM=-4;
 g+=leader(FX+inc[0]*0.34,FY+inc[1]*0.34,LM,54,fill(M.inc,{a:f1(p.main.theta)}));
 g+=leader(FX+inc[0]*0.76,FY+inc[1]*0.76,LM,104,fill(M.sunUp,{a:f0(p.sun.altitude)}));
 g+=leader(FX-nrm[0]*0.62,FY-nrm[1]*0.62,LM,154,M.normal);
 return sheet(g,MW,MH,M.aria);
}

/* ── the lab ────────────────────────────────────────────────────────────── */
const MAT_RHO={'float':.08,'low-e':.13,'reflective':.30,'pv':.08};
const AMBER='#f59e0b',SHEET='#111416',PAPER='#e9eae7',DIM='#a2aca9';
const HEAT=[.16,.28,.42,.58,.76],HEAT_EDGES=[.25,.5,1,2];
const L={built:false,lang:'',host:null,els:null,ctrl:{city:null,date:null,rho:null,frit:0,leanOn:false,lean:12,face:null,view:300},
 result:null,key:'',frame:0,playing:true,raf:0,last:0,active:false,state:null,acc:null,accTo:-1,img:null,off:null,ro:null,year:null,yearJob:0,dirty:true};
const reduced=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const fill=(s,o)=>String(s).replace(/\{(\w+)\}/g,(_,k)=>o[k]??'');
const T=()=>GLARE_TEXT[L.lang]||GLARE_TEXT.en;
const compass=b=>T().compass[Math.round(((b%360)+360)%360/45)%8];
// Faces are numbered round the plan: a cruciform has three faces looking east.
const faceLabel=(i,b)=>String(i+1).padStart(2,'0')+' · '+compass(b)+' '+Math.round(b)+'°';
const fmt=(n,d=0)=>{try{return Number(n).toLocaleString(L.lang==='zh'?'zh-CN':L.lang==='th'?'th-TH':'en-GB',{maximumFractionDigits:d,minimumFractionDigits:d})}catch{return Number(n).toFixed(d)}};
function fmtDate(iso){try{return new Date(iso+'T12:00:00Z').toLocaleDateString(L.lang==='zh'?'zh-CN':L.lang==='th'?'th-TH':'en-GB',{day:'numeric',month:'short',timeZone:'UTC'})}catch{return iso}}
function node(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}
const effCity=()=>L.ctrl.city||(cities[L.state?.city]?L.state.city:'bangkok');
const effDate=()=>L.ctrl.date||(/^\d{4}-\d{2}-\d{2}$/.test(L.state?.solarDate||'')?L.state.solarDate:'2026-06-21');
const effRho=()=>L.ctrl.rho!=null?L.ctrl.rho:(MAT_RHO[L.state?.material]??.13);

function build(host){
 const t=T();host.textContent='';
 const root=node('div','gl');root.setAttribute('lang',L.lang);
 const fig=node('div','gl-fig'),planBox=node('figure','gl-plan'),secBox=node('figure','gl-sec');
 const plan=node('canvas','gl-canvas');plan.setAttribute('role','img');plan.setAttribute('aria-label',t.planAria);
 const sec=node('canvas','gl-canvas');sec.setAttribute('role','img');sec.setAttribute('aria-label',t.sectionAria);
 const planCap=node('figcaption','gl-cap',t.plan),secCap=node('figcaption','gl-cap');
 planBox.append(plan,planCap);secBox.append(sec,secCap);fig.append(planBox,secBox);
 const legend=node('div','gl-legend');legend.append(node('span','gl-legend-k',t.legend));
 ['0–¼','¼–½','½–1','1–2','2+'].forEach((s,i)=>{const w=node('span','gl-sw-wrap');w.append(node('span','gl-sw gl-sw-'+(i+1)),node('span','',s+' '+t.h));legend.append(w)});
 const zoom=node('div','gl-zoom');zoom.setAttribute('role','group');zoom.setAttribute('aria-label',t.radius);zoom.append(node('span','gl-legend-k',t.radius));
 const zoomBtns=[150,300,600].map(v=>{const b=node('button','',v+' '+t.m);b.type='button';b.onclick=()=>{L.ctrl.view=v;syncZoom();draw()};zoom.append(b);return b});
 // transport
 const tr=node('div','gl-transport'),play=node('button','gl-play');play.type='button';
 const scrubId='glScrub';const scrubL=node('label','gl-label',t.time);scrubL.htmlFor=scrubId;
 const scrub=node('input','gl-range');scrub.type='range';scrub.id=scrubId;scrub.min='0';scrub.step='1';
 const clock=node('output','gl-clock');clock.htmlFor=scrubId;
 const scrubWrap=node('div','gl-scrub');scrubWrap.append(scrubL,scrub);
 tr.append(play,scrubWrap,clock);
 // controls
 const ctl=node('div','gl-controls');
 const field=(label,input,hint)=>{const f=node('div','gl-field'),l=node('label','gl-label',label);input.id=input.id||('gl-'+Math.random().toString(36).slice(2,8));l.htmlFor=input.id;f.append(l,input);if(hint)f.append(node('p','gl-hint',hint));ctl.append(f);return f};
 const city=node('select','gl-select');city.id='glCity';for(const k of Object.keys(cities)){const o=node('option','',t.cityNames[k]||k);o.value=k;city.append(o)}
 field(t.city,city);
 const date=node('input','gl-date');date.type='date';date.id='glDate';date.min='2000-01-01';date.max='2100-12-31';
 const df=field(t.date,date),quick=node('div','gl-quick');quick.setAttribute('role','group');quick.setAttribute('aria-label',t.quick);
 const quickBtns=[['mar','03-20'],['jun','06-21'],['sep','09-23'],['dec','12-21']].map(([k,md])=>{const b=node('button','',t[k]);b.type='button';b.dataset.md=md;quick.append(b);return b});
 df.append(quick);
 const rho=node('input','gl-range');rho.type='range';rho.id='glRho';rho.min='8';rho.max='40';rho.step='1';
 const rhoF=field(t.rho,rho,t.rhoHint),rhoV=node('output','gl-val');rhoV.htmlFor='glRho';rhoF.querySelector('label').append(' ',rhoV);const matP=node('p','gl-hint');rhoF.append(matP);
 const frit=node('input','gl-range');frit.type='range';frit.id='glFrit';frit.min='0';frit.max='80';frit.step='5';
 const fritF=field(t.frit,frit,t.fritHint),fritV=node('output','gl-val');fritV.htmlFor='glFrit';fritF.querySelector('label').append(' ',fritV);
 const lean=node('input','gl-range');lean.type='range';lean.id='glLean';lean.min='-10';lean.max='20';lean.step='1';
 const leanF=field(t.lean,lean,t.leanHint),leanV=node('output','gl-val');leanV.htmlFor='glLean';leanF.querySelector('label').append(' ',leanV);
 const leanOnL=node('label','gl-check'),leanOn=node('input');leanOn.type='checkbox';leanOn.id='glLeanOn';leanOnL.append(leanOn,node('span','',t.leanOn));
 const leanModel=node('p','gl-hint');leanF.insertBefore(leanOnL,leanF.firstChild);leanF.append(leanModel);
 // bars, readouts, prose
 const barsBox=node('section','gl-bars'),barsH=node('h3','gl-h',t.bars),barsList=node('div','gl-bar-list');barsList.setAttribute('role','group');barsList.setAttribute('aria-label',t.bars);
 barsBox.append(barsH,barsList,node('p','gl-hint',t.barHint));
 const verdict=node('p','gl-verdict');verdict.setAttribute('aria-live','polite');
 const dl=node('dl','gl-read'),dd={};
 for(const k of ['peak','conc','worst','faces','reach','beyond','nb','sky']){dl.append(node('dt','',t[k]));dd[k]=node('dd','');dl.append(dd[k])}
 const yearBox=node('div','gl-year'),yearBtn=node('button','',t.year);yearBtn.type='button';const yearOut=node('p','gl-year-out');yearOut.setAttribute('aria-live','polite');
 yearBox.append(yearBtn,yearOut,node('p','gl-hint',t.yearNote));
 const prose=node('div','gl-prose');
 for(const [h,p]of [['howHead','how'],['precHead','prec'],['cannotHead','cannot'],['sourcesHead','sources']]){const s=node('section','gl-note'+(p==='sources'?' gl-sources':''));s.append(node('h3','gl-h',t[h]),node('p','',t[p]));prose.append(s)}
 /* The method is a drawing now, not a paragraph. The prose that stood in for
    it explained the reflection and the summation; the sheet is what those
    words mean. */
 const methodFig=node('figure','gl-method'),methodBox=node('div','gl-methodsvg');
 methodFig.append(methodBox,node('figcaption','gl-cap',t.m1));
 root.append(fig,legend,zoom,tr,ctl,verdict,dl,barsBox,yearBox,methodFig,prose);host.append(root);
 L.els={zoomBtns,root,plan,sec,secCap,play,scrub,clock,city,date,quickBtns,rho,rhoV,matP,frit,fritV,lean,leanV,leanOn,leanModel,barsList,verdict,dd,yearBtn,yearOut,methodBox};
 // events
 play.onclick=()=>{L.playing=!L.playing;syncTransport();loop()};
 scrub.oninput=()=>{L.playing=false;setFrame(+scrub.value);syncTransport();loop()};
 city.onchange=()=>{L.ctrl.city=city.value;recompute()};
 date.onchange=()=>{if(/^\d{4}-\d{2}-\d{2}$/.test(date.value)&&date.value>='2000-01-01'&&date.value<='2100-12-31'){L.ctrl.date=date.value;recompute()}};
 quickBtns.forEach(b=>b.onclick=()=>{L.ctrl.date=effDate().slice(0,4)+'-'+b.dataset.md;recompute()});
 rho.oninput=()=>{L.ctrl.rho=+rho.value/100;syncControls();scheduleRecompute()};
 frit.oninput=()=>{L.ctrl.frit=+frit.value/100;syncControls();scheduleRecompute()};
 lean.oninput=()=>{L.ctrl.lean=+lean.value;syncControls();scheduleRecompute()};
 leanOn.onchange=()=>{L.ctrl.leanOn=leanOn.checked;syncControls();recompute()};
 yearBtn.onclick=runYear;
 if(typeof ResizeObserver==='function'){L.ro?.disconnect();L.ro=new ResizeObserver(()=>{sizeCanvases();draw()});L.ro.observe(plan);L.ro.observe(sec)}
 L.built=true;
}
let pending=0;
function scheduleRecompute(){clearTimeout(pending);pending=setTimeout(recompute,120)}
function syncControls(){
 const e=L.els,t=T();if(!e)return;syncZoom();
 e.city.value=effCity();e.date.value=effDate();
 e.quickBtns.forEach(b=>b.setAttribute('aria-pressed',String(effDate().slice(5)===b.dataset.md)));
 e.rho.value=String(Math.round(Math.min(40,Math.max(8,effRho()*100))));e.rhoV.textContent=Math.round(effRho()*100)+' %';
 const m=L.state?.material;e.matP.textContent=MAT_RHO[m]!=null?fill(t.matNote,{m:t.mats[m]||m}):t.matOther;
 e.frit.value=String(Math.round(L.ctrl.frit*100));e.fritV.textContent=Math.round(L.ctrl.frit*100)+' %';
 e.leanOn.checked=L.ctrl.leanOn;e.lean.disabled=!L.ctrl.leanOn;e.lean.value=String(L.ctrl.lean);
 e.leanV.textContent=L.ctrl.leanOn?(L.ctrl.lean>0?'+':'')+L.ctrl.lean+'°':'—';
 let ml=0;try{const g=facadeFacets(L.state,{levels:2,lean:null}),f=g.facets.filter(f=>f.level===0);ml=f.reduce((a,x)=>a+facetLean(x),0)/Math.max(1,f.length)}catch{}
 e.leanModel.textContent=fill(t.leanModel,{v:fmt(ml,1)});
}
function syncZoom(){L.els?.zoomBtns.forEach((b,i)=>b.setAttribute('aria-pressed',String([150,300,600][i]===L.ctrl.view)))}
function syncTransport(){
 const e=L.els,t=T();if(!e)return;
 const n=L.result?.frames.length||0;e.scrub.max=String(Math.max(0,n-1));e.scrub.value=String(L.frame);e.scrub.disabled=!n;
 const fr=L.result?.frames[L.frame];e.clock.textContent=fr?fr.time+' · '+fmtDate(effDate()):'—';
 e.play.hidden=reduced();e.play.disabled=!n;e.play.textContent=(L.playing?'❚❚ ':'▶ ')+(L.playing?t.pause:t.play);
 e.play.setAttribute('aria-pressed',String(L.playing));
}
function keyOf(){const s=L.state||{};return JSON.stringify([s.family,s.span,s.aspect,s.taper,s.twist,s.orientation,towerHeight(s),effCity(),effDate(),effRho(),L.ctrl.frit,L.ctrl.leanOn?L.ctrl.lean:null])}
function recompute(){
 try{
  syncControls();const k=keyOf();if(k===L.key&&L.result)return;
  L.key=k;L.yearJob++;L.year=null;
  L.result=glareDay(L.state,{city:effCity(),date:effDate(),rhoN:effRho(),frit:L.ctrl.frit,lean:L.ctrl.leanOn?L.ctrl.lean:null});
  L.acc=null;L.accTo=-1;L.off=null;
  const w=L.result.focus||L.result.worst;L.frame=w?w.frame:Math.floor(L.result.frames.length/2);
  if(!L.ctrl.facePicked||L.ctrl.face==null||L.ctrl.face>=L.result.geom.n){L.ctrl.facePicked=false;L.ctrl.face=w&&w.edges.length?w.edges[0]:null}
  /* The sheet is drawn from the SAME result the lab reports from, so the
     numbers on it cannot drift from the numbers on the page. It is drawn
     before the readouts, so a readout that throws cannot take the drawing
     down with it. */
  try{
   const pay=glareMethodPayload(L.result);
   L.els.methodBox.innerHTML=pay?glareMethodSVG(pay,{lang:L.lang}):'';
  }catch{L.els.methodBox.innerHTML=''}
  readouts();bars();syncTransport();setFrame(L.frame);
  L.els.yearOut.textContent='';L.els.yearBtn.disabled=false;
 }catch(err){if(L.els)L.els.verdict.textContent='—'}
}
function readouts(){
 const r=L.result,t=T(),e=L.els,d=e.dd,w=r.worst,fc=r.focus,date=fmtDate(r.date);
 d.peak.textContent=w?fmt(w.W)+' '+t.w:t.none;
 d.conc.textContent=fc?'×'+fc.count+' · '+fmt(fc.W)+' '+t.w+' · '+fc.time:w?t.single:t.none;
 d.worst.textContent=w?w.time+' · '+date:t.none;
 const src=fc||w;
 d.faces.textContent=src?src.edges.map(i=>faceLabel(i,r.geom.edgeBearing[i])).join(', '):t.none;
 d.reach.textContent=r.anyGround?(r.reachBeyond?fill(t.beyondR,{r:r.grid.R}):fmt(r.reach)+' '+t.m):t.none;
 d.beyond.textContent=fmt(r.beyond,1)+' '+t.h;
 d.sky.textContent=fmt(r.sky,1)+' '+t.h;
 const nb=r.hitNeighbours[0];
 d.nb.textContent=nb?fill(t.nbFmt,{n:r.hitNeighbours.length,h:fmt(nb.hours,1),ht:fmt(nb.h),d:fmt(Math.hypot(nb.cx,nb.cy)),dir:compass(Math.atan2(nb.cx,nb.cy)/RAD)}):t.none;
 const facesG=r.faces.filter(f=>f.ground>0).length;
 e.verdict.textContent=!w?fill(t.vNone,{date}):!fc?fill(t.vDiverge,{n:facesG,w:fmt(w.W)}):fill(t.vConverge,{c:fc.count,time:fc.time,date,d:fmt(Math.hypot(fc.x,fc.y)),dir:compass(Math.atan2(fc.x,fc.y)/RAD),w:fmt(fc.W)});
}
function bars(){
 const r=L.result,t=T(),list=L.els.barsList;list.textContent='';
 const rows=r.faces.filter(f=>f.ground>0).sort((a,b)=>b.ground-a.ground).slice(0,10);
 if(!rows.length){list.append(node('p','gl-hint',t.barsNone));return}
 const max=rows[0].ground;
 if(L.ctrl.face==null||!r.faces[L.ctrl.face])L.ctrl.face=rows[0].edge;
 for(const f of rows){
  const b=node('button','gl-bar');b.type='button';b.setAttribute('aria-pressed',String(f.edge===L.ctrl.face));
  const lab=node('span','gl-bar-k',faceLabel(f.edge,f.bearing)),track=node('span','gl-bar-t'),bar=node('span','gl-bar-v'),v=node('span','gl-bar-n',fmt(f.ground,1)+' '+t.h);
  bar.style.width=(100*f.ground/max).toFixed(1)+'%';track.append(bar);b.append(lab,track,v);
  b.onclick=()=>{L.ctrl.face=f.edge;L.ctrl.facePicked=true;bars();draw()};list.append(b);
 }
}
function setFrame(i){
 const r=L.result;if(!r)return;const n=r.frames.length;L.frame=n?Math.max(0,Math.min(n-1,i|0)):0;
 const to=reduced()?n-1:L.frame;accumulate(to);syncTransport();draw();
}
function accumulate(to){
 const r=L.result,g=r.grid,N=g.n*g.n;
 if(!L.acc||to<L.accTo){L.acc=new Float32Array(N);L.accTo=-1;L.img=null}
 if(!L.off&&typeof document!=='undefined'){L.off=document.createElement('canvas');L.off.width=g.n;L.off.height=g.n}
 const ctx=L.off?.getContext('2d');if(!ctx)return;
 if(!L.img)L.img=ctx.createImageData(g.n,g.n);
 const px=L.img.data,rgb=[245,158,11];
 for(let k=L.accTo+1;k<=to;k++){const fr=r.frames[k];if(!fr)continue;for(const idx of fr.cells){const h=(L.acc[idx]+=r.dt);let b=0;while(b<HEAT_EDGES.length&&h>HEAT_EDGES[b])b++;const i=idx%g.n,j=(idx/g.n)|0,p=((g.n-1-j)*g.n+i)*4;px[p]=rgb[0];px[p+1]=rgb[1];px[p+2]=rgb[2];px[p+3]=Math.round(HEAT[b]*255)}}
 L.accTo=to;ctx.putImageData(L.img,0,0);
}
function sizeCanvases(){
 const dpr=Math.min(3,globalThis.devicePixelRatio||1);
 for(const c of [L.els?.plan,L.els?.sec]){if(!c)continue;const w=c.clientWidth,h=c.clientHeight;if(!w||!h)continue;const W=Math.round(w*dpr),H=Math.round(h*dpr);if(c.width!==W||c.height!==H){c.width=W;c.height=H}}
}
// Plex Mono has no Thai or Han glyphs; name the non-looped Thai face and the
// Chinese face explicitly so the canvas never falls back to a looped system font.
const canvasFont=()=>"12px 'IBM Plex Mono','IBM Plex Sans Thai','Noto Sans SC',ui-monospace,monospace";
function draw(){try{drawPlan();drawSection()}catch{}}
function drawPlan(){
 const c=L.els?.plan,r=L.result;if(!c||!r)return;const ctx=c.getContext('2d');if(!ctx)return;
 const dpr=Math.min(3,globalThis.devicePixelRatio||1),w=c.width/dpr,h=c.height/dpr;if(!w||!h)return;
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=SHEET;ctx.fillRect(0,0,w,h);
 const geom=r.geom,fr=r.frames[L.frame];
 let span=0;for(const [x,y]of geom.base)span=Math.max(span,Math.hypot(x,y));
 const viewR=Math.min(r.grid.R,Math.max(L.ctrl.view,span*2.5));
 const cx=w/2,cy=h/2,k=(Math.min(w,h)/2-18)/viewR,X=x=>cx+x*k,Y=y=>cy-y*k;
 ctx.save();ctx.beginPath();ctx.rect(0,0,w,h);ctx.clip();
 // rings
 const step=viewR<=200?50:100;ctx.font=canvasFont(c);
 ctx.lineWidth=1;
 for(let d=step;d<=viewR;d+=step){ctx.strokeStyle='rgba(162,172,169,.22)';ctx.beginPath();ctx.arc(cx,cy,d*k,0,Math.PI*2);ctx.stroke();ctx.fillStyle='rgba(162,172,169,.75)';ctx.fillText(d+' '+T().m,cx+d*k*.7071+3,cy-d*k*.7071-3)}
 // heat
 if(L.off){ctx.imageSmoothingEnabled=false;ctx.drawImage(L.off,X(-r.grid.R),Y(r.grid.R),2*r.grid.R*k,2*r.grid.R*k)}
 // neighbours
 const hitNow=new Set(fr?fr.beams.filter(b=>b.kind==='neighbour').map(b=>b.nb):[]),hitDay=new Set(r.hitNeighbours.map(n=>n.id));
 for(const nb of r.neighbours.list){
  ctx.beginPath();nb.ring.forEach(([x,y],i)=>i?ctx.lineTo(X(x),Y(y)):ctx.moveTo(X(x),Y(y)));ctx.closePath();
  if(hitNow.has(nb.id)){ctx.fillStyle='rgba(245,158,11,.55)';ctx.fill()}
  ctx.strokeStyle=hitDay.has(nb.id)?'rgba(245,158,11,.7)':'rgba(162,172,169,.4)';ctx.stroke();
 }
 if(fr){
  ctx.fillStyle='rgba(245,158,11,.16)';
  for(const b of fr.beams)if(b.kind==='ground'&&b.foot){ctx.beginPath();b.foot.forEach(([x,y],i)=>i?ctx.lineTo(X(x),Y(y)):ctx.moveTo(X(x),Y(y)));ctx.closePath();ctx.fill()}
  for(const b of fr.beams){
   ctx.strokeStyle=b.kind==='sky'?'rgba(162,172,169,.35)':'rgba(245,158,11,.6)';ctx.setLineDash(b.kind==='sky'?[3,4]:[]);
   ctx.beginPath();ctx.moveTo(X(b.cx),Y(b.cy));ctx.lineTo(X(b.x),Y(b.y));ctx.stroke();
  }
  ctx.setLineDash([]);
  // hot cells now
  const g=r.grid;ctx.fillStyle='rgba(245,158,11,.85)';
  for(const idx of fr.hot){const [x,y]=cellCentre(g,idx);ctx.fillRect(X(x-g.cell/2),Y(y+g.cell/2),Math.max(1,g.cell*k),Math.max(1,g.cell*k))}
 }
 // tower: base filled, crown outlined
 ctx.beginPath();geom.base.forEach(([x,y],i)=>i?ctx.lineTo(X(x),Y(y)):ctx.moveTo(X(x),Y(y)));ctx.closePath();ctx.fillStyle=PAPER;ctx.fill();
 ctx.beginPath();geom.rings[geom.K].forEach(([x,y],i)=>i?ctx.lineTo(X(x),Y(y)):ctx.moveTo(X(x),Y(y)));ctx.closePath();ctx.strokeStyle=DIM;ctx.stroke();
 // the strongest overlap now, ringed above everything else
 if(fr&&fr.count>=2&&fr.peakIdx>=0){const [x,y]=cellCentre(r.grid,fr.peakIdx);ctx.strokeStyle=AMBER;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(X(x),Y(y),9,0,Math.PI*2);ctx.stroke();ctx.lineWidth=1}
 // sun bearing
 if(fr){const a=fr.sun.azimuth*RAD,R0=Math.min(w,h)/2-10,sx=cx+Math.sin(a)*R0,sy=cy-Math.cos(a)*R0;
  ctx.strokeStyle=PAPER;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(cx+Math.sin(a)*(R0-28),cy-Math.cos(a)*(R0-28));ctx.stroke();
  ctx.fillStyle=PAPER;ctx.beginPath();ctx.arc(sx,sy,5,0,Math.PI*2);ctx.fill();
  ctx.fillText(Math.round(fr.sun.altitude)+'°',sx+(Math.sin(a)>0?-34:9),sy+(Math.cos(a)>0?16:-6))}
 ctx.fillStyle=PAPER;ctx.fillText(T().compass[0],cx-4,12);
 ctx.fillText(fr?fr.time+' · '+fmtDate(r.date):fmtDate(r.date),8,h-8);
 ctx.restore();
}
function drawSection(){
 const c=L.els?.sec,r=L.result;if(!c||!r)return;const ctx=c.getContext('2d');if(!ctx)return;
 const dpr=Math.min(3,globalThis.devicePixelRatio||1),w=c.width/dpr,h=c.height/dpr;if(!w||!h)return;
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=SHEET;ctx.fillRect(0,0,w,h);
 const t=T(),geom=r.geom,e=L.ctrl.face??0,fr=r.frames[L.frame],bearing=geom.edgeBearing[e]??0;
 L.els.secCap.textContent=fill(t.section,{f:faceLabel(e,bearing)});
 const n=geom.n,mid=k=>{const a=geom.rings[k][e],b=geom.rings[k][(e+1)%n];return [(a[0]+b[0])/2,(a[1]+b[1])/2,a[2]]};
 const f0=geom.facets.find(f=>f.edge===e&&f.level===0);if(!f0)return;const nh=f0.nh,o=mid(0);
 const pts=[];for(let k=0;k<=geom.K;k++){const p=mid(k);pts.push([(p[0]-o[0])*nh[0]+(p[1]-o[1])*nh[1],p[2]])}
 const reachX=Math.max(geom.H*.9,...(fr?fr.beams.filter(b=>b.e===e&&b.kind==='ground').map(b=>(b.x-o[0])*nh[0]+(b.y-o[1])*nh[1]):[0]));
 const x0=Math.min(-geom.H*.25,...pts.map(p=>p[0]))-6,x1=Math.min(reachX,geom.H*3)+10;
 const k=Math.min((w-24)/(x1-x0),(h-40)/(geom.H*1.08)),gy=h-22,X=x=>12+(x-x0)*k,Y=z=>gy-z*k;
 ctx.font=canvasFont(c);ctx.lineWidth=1;
 ctx.strokeStyle='rgba(162,172,169,.6)';ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(w,gy);ctx.stroke();
 // tower body behind the face
 ctx.fillStyle='rgba(233,234,231,.12)';ctx.beginPath();ctx.moveTo(X(x0),gy);pts.forEach(([x,z])=>ctx.lineTo(X(x),Y(z)));ctx.lineTo(X(x0),Y(geom.H));ctx.closePath();ctx.fill();
 ctx.strokeStyle=PAPER;ctx.lineWidth=1.5;ctx.beginPath();pts.forEach(([x,z],i)=>i?ctx.lineTo(X(x),Y(z)):ctx.moveTo(X(x),Y(z)));ctx.stroke();ctx.lineWidth=1;
 if(fr){
  const s=fr.sun,d=[-s.east,-s.north,-s.up];
  for(const f of geom.facets){
   if(f.edge!==e)continue;const dn=dot(d,f.n);if(dn>=0)continue;
   const cxs=(f.c[0]-o[0])*nh[0]+(f.c[1]-o[1])*nh[1],cz=f.c[2];
   const sh=s.east*nh[0]+s.north*nh[1],sl=Math.hypot(sh,s.up)||1,L0=geom.H*.35;
   ctx.strokeStyle='rgba(233,234,231,.35)';ctx.beginPath();ctx.moveTo(X(cxs+sh/sl*L0),Y(cz+s.up/sl*L0));ctx.lineTo(X(cxs),Y(cz));ctx.stroke();
   const rv=reflect(d,f.n),rx=rv[0]*nh[0]+rv[1]*nh[1],rz=rv[2],rl=Math.hypot(rx,rz)||1;
   let tt=rz<0?cz/-rz:geom.H*.5/rl;const ex=cxs+rx*tt,ez=cz+rz*tt;
   ctx.strokeStyle='rgba(245,158,11,.75)';ctx.beginPath();ctx.moveTo(X(cxs),Y(cz));ctx.lineTo(X(ex),Y(ez));ctx.stroke();
  }
  ctx.fillStyle=DIM;ctx.fillText(Math.round(s.altitude)+'° · '+fr.time,8,14);
 }
 const lean=r.lean!=null?r.lean:facetLean(f0);
 ctx.fillStyle=DIM;ctx.fillText(t.lean+' '+(lean>0?'+':'')+fmt(lean,1)+'°',8,h-6);
}
function loop(){
 cancelAnimationFrame?.(L.raf);L.raf=0;
 if(!L.active||!L.playing||reduced()||!L.result?.frames.length)return;
 const tick=now=>{
  if(!L.active||!L.playing){L.raf=0;return}
  if(now-L.last>140){L.last=now;const n=L.result.frames.length;setFrame(L.frame+1>=n?0:L.frame+1)}
  L.raf=requestAnimationFrame(tick);
 };
 L.raf=requestAnimationFrame(tick);
}
function runYear(){
 const job=++L.yearJob,e=L.els,t=T(),s=L.state,tally={},city=effCity(),y=effDate().slice(0,4);
 e.yearBtn.disabled=true;let geom;try{geom=facadeFacets(s,{lean:L.ctrl.leanOn?L.ctrl.lean:null})}catch{e.yearBtn.disabled=false;return}
 let i=0;const next=()=>{
  if(job!==L.yearJob)return;
  if(i>=YEAR_DAYS.length){const sum=yearSummary(tally);L.year=sum;e.yearOut.textContent=fill(T().yearOut,{g:fmt(sum.ground),a:fmt(sum.area),nh:fmt(sum.neighbour)});e.yearBtn.disabled=false;return}
  try{const [mm,dd]=YEAR_DAYS[i];yearAdd(tally,glareDay(s,{city,date:y+'-'+mm+'-'+dd,rhoN:effRho(),frit:L.ctrl.frit,lean:L.ctrl.leanOn?L.ctrl.lean:null,stepMin:15,frames:false,geom}))}catch{}
  i++;e.yearOut.textContent=fill(t.yearRun,{p:Math.round(100*i/YEAR_DAYS.length)});setTimeout(next,0);
 };next();
}

/** Called on every model update and workspace switch. Never throws. */
export function renderGlareLab({host,state,metrics,lang,active}={}){
 try{
  if(!host||typeof document==='undefined')return;
  L.state=state&&typeof state==='object'?state:L.state;if(!L.state)return;
  const lg=GLARE_TEXT[lang]?lang:'en',wasActive=L.active;L.active=!!active;
  if(!L.built||L.host!==host||L.lang!==lg||!host.contains(L.els?.root)){L.lang=lg;L.host=host;build(host);L.key='';if(L.result){/* rebuild DOM around the existing result */}}
  if(!L.active){cancelAnimationFrame?.(L.raf);L.raf=0;return}
  recompute();
  if(!L.els.verdict.textContent&&L.result)readouts();
  if(!wasActive||!L.els.barsList.childElementCount){bars();syncTransport()}
  requestAnimationFrame?.(()=>{sizeCanvases();setFrame(L.frame)});
  if(!wasActive&&!reduced())L.playing=true;
  syncTransport();loop();
 }catch{}
}
