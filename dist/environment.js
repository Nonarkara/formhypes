// Local concept studies. East, north, up; SI internally. No weather/design-code inputs inferred.
import {massingRings} from './model.js?v=a07152d203';
import {ringArea,cityData} from './cityscape.js?v=02b4579819';
import {solarPosition,solarDefaults,studyDay} from './solar.js?v=9279efc6dc';
import {projectedShadow} from './context.js?v=d521ae15b8';
const sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const length=a=>Math.hypot(...a),unit=a=>{const l=length(a);return l?a.map(x=>x/l):[0,0,0]};
const ccw=p=>ringArea(p)<0?[...p].reverse():p;
export const ENV_DEFAULTS={speed:'',bearing:0,cd:'',density:1.225,ei:'',mass:'',acceleration:'',reflectance:0.2};
export const ENV_BOUNDS={speed:[0,100],bearing:[0,360],cd:[0,5],density:[0.5,2],ei:[0.001,1e9],mass:[0.001,1e6],acceleration:[0,20],reflectance:[0,1]};
export function validateEnvironment(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!Object.hasOwn(ENV_BOUNDS,k)))return null;
 const out={...ENV_DEFAULTS,...input};for(const[k,[lo,hi]]of Object.entries(ENV_BOUNDS)){const v=out[k];if(v===''&&['speed','cd','ei','mass','acceleration'].includes(k))continue;if(!Number.isFinite(v)||v<lo||v>hi)return null}return out;
}
// Walls have explicit outward normals. Both data windings give the same solid.
export function extrude(ring,h,id){
 const p=ccw(ring),faces=[];for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];faces.push({pts:[[...a,0],[...b,0],[...b,h],[...a,h]],normal:unit([b[1]-a[1],a[0]-b[0],0]),id})}
 faces.push({pts:p.map(q=>[...q,h]),normal:[0,0,1],id,roof:true});return faces;
}
// View depth increases toward the camera for the tower's orthographic projection.
export function visibleWall(a,b,yaw){return (b[1]-a[1])*Math.sin(yaw)-(b[0]-a[0])*Math.cos(yaw)>1e-9}
export function shell(s,bands=24){
 const rings=massingRings(s,bands),faces=[];
 for(let i=0;i<rings.length-1;i++)for(let j=0;j<rings[i].poly.length;j++){
  const k=(j+1)%rings[i].poly.length,a=[...rings[i].poly[j],rings[i].z],b=[...rings[i].poly[k],rings[i].z],c=[...rings[i+1].poly[k],rings[i+1].z],d=[...rings[i+1].poly[j],rings[i+1].z];
  for(const pts of [[a,b,c],[a,c,d]])faces.push({pts,normal:unit(cross(sub(pts[1],pts[0]),sub(pts[2],pts[0]))),id:-1});
 }
 // Roof triangles are needed as occluders, but reflection samples use side facets only.
 const top=rings.at(-1);faces.push({pts:top.poly.map(p=>[...p,top.z]),normal:[0,0,1],id:-1,roof:true});return {rings,faces,height:top.z};
}
export function rayTriangle(origin,dir,a,b,c){
 const e1=sub(b,a),e2=sub(c,a),p=cross(dir,e2),det=dot(e1,p);if(Math.abs(det)<1e-10)return null;
 const t=sub(origin,a),u=dot(t,p)/det;if(u<0||u>1)return null;const q=cross(t,e1),v=dot(dir,q)/det,d=dot(e2,q)/det;return v>=0&&u+v<=1&&d>1e-5?d:null;
}
// Ear clipping for roofs; a fan would invent roof area across concave courtyards/notches.
export function triangles(face){
 const p=face.pts;if(p.length===3)return [p];const out=[],ix=p.map((_,i)=>i),turn=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 while(ix.length>3){let found=false;for(let k=0;k<ix.length;k++){const a=ix[(k+ix.length-1)%ix.length],b=ix[k],c=ix[(k+1)%ix.length];
 // Vertical quads are convex; use their natural diagonal. Roofs need a 2D ear test.
 if(!face.roof){for(let j=1;j<p.length-1;j++)out.push([p[0],p[j],p[j+1]]);return out}
 if(turn(p[a],p[b],p[c])<=1e-9)continue;
 if(ix.some(j=>j!==a&&j!==b&&j!==c&&turn(p[a],p[b],p[j])>=-1e-9&&turn(p[b],p[c],p[j])>=-1e-9&&turn(p[c],p[a],p[j])>=-1e-9))continue;
 out.push([p[a],p[b],p[c]]);ix.splice(k,1);found=true;break}if(!found)break;
 }if(ix.length===3)out.push(ix.map(i=>p[i]));return out;
}
export function reflectedDirection(sun,normal){const n=unit(normal),d=dot(sun,n);return sun.map((v,i)=>-v+2*d*n[i])}
export function traceReflections(faces,obstacles,sun,reflectance=0.2){
 const rays=[];if(!sun.aboveHorizon||reflectance<=0)return rays;const S=[sun.vector.east,sun.vector.north,sun.vector.up];
 const obs=obstacles.flatMap(f=>triangles(f).map(pts=>({pts,id:f.id}))),self=faces.flatMap(f=>triangles(f).map(pts=>({pts,id:-1})));
 const all=[...obs,...self];
 for(const face of faces){if(face.roof)continue;const incidence=dot(S,face.normal);if(incidence<=1e-6)continue;
 const origin=face.pts.reduce((a,p)=>a.map((v,i)=>v+p[i]/face.pts.length),[0,0,0]);
 if(all.some(t=>rayTriangle(origin,S,...t.pts)!==null))continue;
 const dir=reflectedDirection(S,face.normal);let distance=dir[2]<-1e-9?-origin[2]/dir[2]:Infinity,id=null;
 for(const t of all){const d=rayTriangle(origin,dir,...t.pts);if(d!==null&&d<distance){distance=d;id=t.id}}
 const escaped=!Number.isFinite(distance)||distance>1400;if(escaped)distance=1400;
 rays.push({origin,end:origin.map((v,i)=>v+dir[i]*distance),direction:dir,id:escaped?null:id,escaped,weight:reflectance*incidence});
 }return rays;
}
const inside=(p,q)=>{let v=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>q[1])!==(b[1]>q[1])&&q[0]<(b[0]-a[0])*(q[1]-a[1])/(b[1]-a[1])+a[0])v=!v}return v};
const bounds=p=>[Math.min(...p.map(q=>q[0])),Math.min(...p.map(q=>q[1])),Math.max(...p.map(q=>q[0])),Math.max(...p.map(q=>q[1]))];
const boxesMeet=(a,b)=>a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];
export function polygonsMeet(a,b){
 if(!boxesMeet(bounds(a),bounds(b)))return false;if(a.some(p=>inside(b,p))||b.some(p=>inside(a,p)))return true;
 const turn=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
 for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){const p=a[i],q=a[(i+1)%a.length],r=b[j],s=b[(j+1)%b.length];if(turn(p,q,r)*turn(p,q,s)<0&&turn(r,s,p)*turn(r,s,q)<0)return true}return false;
}
export function shadowReceivers(s,buildings,sun){const polys=projectedShadow(s,sun),bs=polys.map(bounds);return buildings.map(b=>{const bb=bounds(b.ring);return polys.some((p,i)=>boxesMeet(bs[i],bb)&&polygonsMeet(p,b.ring))})}
export function shadowDay(s,buildings){const rows=buildings.map((_,id)=>({id,hours:0}));let daylight=0;for(const sun of studyDay({...solarDefaults,...s})){if(!sun.aboveHorizon)continue;daylight+=.25;shadowReceivers(s,buildings,sun).forEach((hit,i)=>{if(hit)rows[i].hours+=.25})}return {rows,daylight}}
// Static drag on horizontal projected breadth. Constant speed at all heights is an explicit scenario.
export function windStudy(s,input){
 const v=validateEnvironment(input);if(!v)return null;const hasWind=v.speed!==''&&v.cd!=='';if(!hasWind&&(v.mass===''||v.acceleration===''))return null;
 const {rings,height:H}=shell(s,64),rad=v.bearing*Math.PI/180,crosswind=[Math.cos(rad),-Math.sin(rad)];
 const width=p=>{const q=p.map(a=>a[0]*crosswind[0]+a[1]*crosswind[1]);return Math.max(...q)-Math.min(...q)};
 const q=hasWind?.5*v.density*v.speed*v.speed:null,loads=[];let area=0,shear=0,moment=0;
 for(let i=0;i<rings.length-1;i++){const a=rings[i],b=rings[i+1],dz=b.z-a.z,w=(width(a.poly)+width(b.poly))/2,z=(a.z+b.z)/2,force=q*v.cd*w*dz;area+=w*dz;shear+=force;moment+=force*z;loads.push({z,force,width:w})}
 const ei=v.ei===''?null:v.ei*1e9;
 const deflection=z=>ei&&hasWind?loads.reduce((sum,l)=>sum+l.force*(z<=l.z?z*z*(3*l.z-z):l.z*l.z*(3*z-l.z))/(6*ei),0):null;
 const curve=Array.from({length:33},(_,i)=>({z:H*i/32,x:deflection(H*i/32)}));
 const inertia=v.mass!==''&&v.acceleration!==''?{shear:v.mass*1000*H*v.acceleration,moment:v.mass*1000*v.acceleration*H*H/2,drift:ei?v.mass*1000*v.acceleration*H**4/(8*ei):null}:null;
 return {height:H,pressure:q,area,shear:hasWind?shear:null,moment:hasWind?moment:null,drift:deflection(H),curve,loads,inertia};
}
let assumptions={...ENV_DEFAULTS},teaching=false;
export function getEnvironmentStudy(){return {version:1,inputs:{...assumptions},teaching,tier:'geometric screening / user-input static sensitivity',methods:{shadow:'opaque loft, footprint overlap, 15-minute midpoint day',wind:'uniform-speed drag, band loads, fixed-base constant EI',reflection:'one specular centroid ray per sunlit loft triangle, first opaque hit; no glare intensity'}}}
export function restoreEnvironmentStudy(study){const v=validateEnvironment(study?.inputs??ENV_DEFAULTS);if(!v)return false;assumptions=v;teaching=study?.teaching===true;return true}
export function setEnvironmentInputs(patch,demo=teaching){const v=validateEnvironment({...assumptions,...patch});if(!v)return false;assumptions=v;teaching=demo;return true}
export function environmentScene(s){const city=cityData(s.city),buildings=(city?.buildings??[]).filter(b=>!inside(b.ring,[0,0]));return {city,buildings,tower:shell(s,16),sun:solarPosition({...solarDefaults,...s})}}
