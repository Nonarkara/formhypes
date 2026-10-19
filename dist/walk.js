import {modulorPath} from './modulor.js?v=3431f62913';
// Human-eye views: two perspective constructions projected from live geometry.
// Not renders — no perspective-correct texture, no refraction through glass, no
// lighting or shadows, no occupants beyond the scale figure, and no interior
// partition beyond the one that is cut.
import {profile, stackHeight,stack,massingRings} from './model.js?v=b84188fae5';

const EYE=1.60,SV=.95,DTR=Math.PI/180;
const num=(v,d=2)=>String(Math.round(v*Math.pow(10,d))/Math.pow(10,d));
const ph=(k,v={})=>String(k).replace(/\{(\w+)\}/g,(_,n)=>(v[n]??'').toString());
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const poly=pts=>pts.map(q=>q.join(',')).join(' ');
const seg=(a,b,cls)=>`<path class="${cls}" d="M${a.join(' ')}L${b.join(' ')}"/>`;
const tri=(x,y,s=6)=>`<path class="wk-a" stroke-width="2" d="M${num(x-s,1)} ${num(y+s,1)}L${num(x+s,1)} ${num(y-s,1)}"/>`;

// ── A · walk-in interior, one-point perspective section ──────────────────────
// Camera on the plate centreline at EYE, axis down the plate, glazing at depth
// D. The lens is solved rather than chosen: the tightest of three fits — far
// wall width, near cut floor, near cut soffit — wins, so the drawing holds for
// any span or floor-to-floor the model can produce.
export function interior(state,t){
 const W=1000,H=560,cx=W/2,cy=Math.round(H*.52);
 const occupied=stack(state).filter(l=>l.gfa),level=occupied[Math.floor(occupied.length/2)];
 const floorPlan=profile(state,level.z/stackHeight(state));
 const span=Math.max(...floorPlan.map(p=>p[0]))-Math.min(...floorPlan.map(p=>p[0])),ff=level.h,cl=Math.max(.5,ff-SV);
 const D=Math.min(24,Math.max(10,span*.5));
 const z0=Math.max(2.5,Math.min(6,D*.22)),cut=Math.max(z0+.8,D*.34);
 const f=Math.min(.45*W*D/(span/2),(H-14-cy)*z0/EYE,(cy-6)*z0/Math.max(.4,ff-EYE));
 const X=(x,z)=>cx+f*x/z,Y=(y,z)=>cy-f*(y-EYE)/z;
 const P=(x,y,z)=>[num(X(x,z),1),num(Y(y,z),1)];
 const q4=(x0,x1,y0,y1,za,zb,cls)=>`<polygon class="${cls}" points="${poly([P(x0,y0,za),P(x1,y0,za),P(x1,y1,zb),P(x0,y1,zb)])}"/>`;
 const run=(x0,x1,y0,y1,za,zb,cls)=>{
  const c=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
  return `<path class="${cls}" fill="none" d="${c.map(q=>`M${P(q[0],q[1],za).join(' ')}L${P(q[0],q[1],zb).join(' ')}`).join('')}"/>`+
   `<path class="${cls}" fill="none" d="M${P(x0,y1,zb).join(' ')}L${P(x1,y1,zb).join(' ')}"/>`;
 };
 const o=[];
 o.push(`<rect class="wk-sky" width="${W}" height="${H}"/>`);
 o.push(q4(-span/2,span/2,0,ff,D,D,'wk-glass'));
 const bays=Math.max(4,Math.round(span/1.5));
 for(let i=0;i<=bays;i++)o.push(seg(P(-span/2+span*i/bays,0,D),P(-span/2+span*i/bays,ff,D),'wk-l'));
 [cl,ff].forEach(y=>o.push(seg(P(-span/2,y,D),P(span/2,y,D),'wk-l')));
 [-1,1].forEach(k=>{ // side walls run true to the vanishing point
  const X0=k*span/2;
  o.push(q4(X0,X0,0,ff,z0,D,'wk-wall'));
  for(let i=1;i<4;i++){const z=z0+(D-z0)*i/4;o.push(seg(P(X0,0,z),P(X0,ff,z),'wk-faint'))}
  [0,ff].forEach(y=>o.push(seg(P(X0,y,z0),P(X0,y,D),'wk-l')));
  o.push(seg(P(X0,cl,z0),P(X0,cl,D),'wk-faint'));
 });
 o.push(q4(-span/2,span/2,0,0,z0,D,'wk-floor'));
 o.push(q4(-span/2,span/2,-.30,0,z0,z0,'wk-hatch'));
 o.push(seg(P(-span/2,-.3,z0),P(-span/2,-.3,D),'wk-l'),seg(P(-span/2,ff,z0),P(span/2,ff,z0),'wk-l2'));
 o.push(q4(-span/2,span/2,ff,ff+.30,z0,D,'wk-hatch')); // slab over, bounds the plenum
 o.push(q4(-span/2,span/2,cl,cl,cut,D,'wk-ceil'));      // soffit solid only past the cut
 o.push(seg(P(-span/2,cl,cut),P(span/2,cl,cut),'wk-l2'));
 o.push(`<path class="wk-a" fill="none" d="${Array.from({length:15},(_,i)=>{const x=-span/2+span*i/14;return `M${P(x,cl,cut).join(' ')}L${P(x+span*.025,cl-.11,cut+.12).join(' ')}`}).join('')}"/>`);
 // Services. Inside the cut band they are solid; past it they are dashed,
 // because from the floor the soffit is in the way.
 const svc=(x0,x1,y0,y1,round=false)=>{
  o.push(run(x0,x1,y0,y1,z0,cut,'wk-svc'));
  o.push(`<path class="wk-svc wk-ghost" fill="none" stroke-dasharray="5 4" d="M${P(x0,y1,cut).join(' ')}L${P(x0,y1,D).join(' ')}M${P(x1,y1,cut).join(' ')}L${P(x1,y1,D).join(' ')}"/>`);
  if(round)o.push(`<circle class="wk-svc" cx="${num(X((x0+x1)/2,z0),1)}" cy="${num(Y((y0+y1)/2,z0),1)}" r="${num(f*(x1-x0)/2/z0,1)}"/>`);
 };
 svc(-1.5,-.8,cl+.48,cl+.88);
 svc(-.3,-.22,cl+.31,cl+.39,true);
 svc(.3,.75,cl+.1,cl+.22);
 svc(.95,1.05,cl+.31,cl+.41,true);
 const fz=Math.min(D*.6,z0+7.2),fx=-span*.16;
 const FP=(x,y)=>[X(fx+x,fz),Y(y,fz)];
 o.push(`<path class="wk-fig" data-scale-figure="modulor" fill-rule="evenodd" d="${modulorPath(FP)}"/>`);
 o.push(`<path class="wk-a" fill="none" stroke-dasharray="6 5" d="M0 ${num(cy,1)}H${W}"/>`);
 const hit=Math.min(D,z0+(cl-EYE)/Math.tan(18*DTR));
 o.push(seg(P(0,EYE,z0),P(0,Math.min(cl,EYE+(hit-z0)*Math.tan(18*DTR)),hit),'wk-a').replace('class="wk-a"','class="wk-a" stroke-dasharray="7 5"'));

 o.push(`<circle class="wk-a" cx="${cx}" cy="${num(cy,1)}" r="7"/>`);
 // Dimension strings sit on the near cut plane; their depth is solved from the
 // screen x they occupy, so they measure the same planes the drawing shows.
 const dx=112,sz=z0*(dx-cx)/f,D1=y=>Y(y,z0);
 const vdim=(y1,y2,label,dx)=>{
  const a=D1(y1),b=D1(y2),m=(a+b)/2;
  return `<path class="wk-a" fill="none" d="M${dx} ${num(a,1)}V${num(b,1)}"/>${tri(dx,a)}${tri(dx,b)}`+
   `<path class="wk-faint" fill="none" d="M${dx} ${num(a,1)}H${dx+18}M${dx} ${num(b,1)}H${dx+18}"/>`+
   `<text x="${dx-7}" y="${num(m,1)}" text-anchor="middle" transform="rotate(-90 ${dx-7} ${num(m,1)})">${esc(label)}</text>`;
 };
 o.push(vdim(0,ff,num(ff)+' m',32),vdim(0,cl,num(cl)+' m',64),vdim(cl,ff,num(SV)+' m',96));
 o.push(`<path class="wk-faint" fill="none" stroke-dasharray="4 4" d="M${dx+18} ${num(D1(0),1)}V${num(D1(ff),1)}"/>`);
 const by=H-26;
 o.push(`<path class="wk-a" fill="none" d="M28 ${by}H${W-28}"/>`,tri(28,by),tri(W-28,by));
 o.push(`<path class="wk-faint" fill="none" stroke-dasharray="4 4" d="M28 ${by-9}V${num(D1(0),1)}M${W-28} ${by-9}V${num(D1(0),1)}"/>`);
 o.push(`<rect class="wk-bg" x="${cx-118}" y="${by-11}" width="236" height="22"/>`,
  `<text x="${cx}" y="${by+4}" text-anchor="middle">${esc(num(span)+' m '+t('plate'))}</text>`);
 o.push(seg(P(0,0,z0),P(0,0,D),'wk-a'),tri(X(0,z0),Y(0,z0)),tri(X(0,D),Y(0,D)));
 const mx=(X(0,z0)+X(0,D))/2,my=(Y(0,z0)+Y(0,D))/2-9;
 o.push(`<path class="wk-a" fill="none" d="M${num(X(0,z0)+14,1)} ${num(Y(0,z0)-8,1)}L${num(X(0,D)-14,1)} ${num(Y(0,D)-8,1)}"/>`,
  `<rect class="wk-bg" x="${num(mx-40,1)}" y="${num(my-11,1)}" width="80" height="20"/>`,
  `<text x="${num(mx,1)}" y="${num(my+3,1)}" text-anchor="middle">${esc(num(D)+' m')}</text>`);
 [[P(-span*.34,0,z0+(D-z0)*.18),1],[P(-span*.10,cl,cut+.4),2],[P(-span*.30,cl+.85,z0+.5),3],
  [P(-span*.19,cl+.80,(z0+cut)/2),4],[P(-span*.02,cl+.42,z0+.6),5],[P(span*.27,cl+.20,(z0+cut)/2),6],
  [P(span*.34,cl*.55,D),7],[FP(-.34,1.78),8],[[cx+36,cy+6],9],[P(span*.30,cl,cut+.2),10]]
  .forEach(([at,n])=>o.push(`<circle class="wk-pin" cx="${num(at[0],1)}" cy="${num(at[1],1)}" r="10"/>`,
   `<text class="wk-pin-t" x="${num(at[0],1)}" y="${num(at[1]+4,1)}" text-anchor="middle">${n}</text>`));
 return {svg:o.join(''),ff,span,lens:2*Math.atan(H/2/f)/DTR,depth:D};
}

// ── B · pedestrian view ───────────────────────────────────────────────────────
// Two-point perspective with a vertical vanishing point: the camera is pitched
// up, so the horizontal faces converge on two VPs left and right of the
// principal point and the verticals converge above the tower.
function prism(levels,cam,clsFill,clsAlt,clsLine){
 const b=levels[0].pts;let ar=0;
 for(let i=0;i<b.length;i++){const p=b[i],q=b[(i+1)%b.length];ar+=p[0]*q[1]-q[0]*p[1]}
 const sgn=ar>0?1:-1;
 const front=(a,q)=>{
  const dx=q[0]-a[0],dz=q[1]-a[1],l=Math.hypot(dx,dz)||1;
  return sgn*(dz*(cam.z-(a[1]+q[1])/2)-dx*(cam.x-(a[0]+q[0])/2))/l>0;
 };
 let o='',vis=levels[0].pts.map((_,i)=>front(levels[0].pts[i],levels[0].pts[(i+1)%b.length]));
 levels.forEach((l,i)=>{
  const nx=levels[i+1];if(!nx)return;
  const A=cam.P(l.pts[0][0],l.z,l.pts[0][1]),B=cam.P(nx.pts[0][0],nx.z,nx.pts[0][1]);
  if(!A||!B||Math.max(A[1],B[1])-Math.min(A[1],B[1])<1.4)return;
  const v=l.pts.map((_,k)=>front(l.pts[k],l.pts[(k+1)%l.pts.length]));
  for(let k=0;k<l.pts.length;k++)if(v[k]){
   const a=l.pts[k],q=l.pts[(k+1)%l.pts.length],u=nx.pts[k],w=nx.pts[(k+1)%nx.pts.length];
   const pa=cam.P(a[0],l.z,a[1]),pb=cam.P(q[0],l.z,q[1]),pc=cam.P(w[0],nx.z,w[1]),pd=cam.P(u[0],nx.z,u[1]);
   if(pa&&pb&&pc&&pd)o+=`<polygon class="${i%2?clsAlt:clsFill}" points="${poly([pa,pb,pc,pd])}"/>`;
   if(pd&&pc)o+=`<path class="${clsLine}" fill="none" d="M${pd.join(' ')}L${pc.join(' ')}"/>`;
  }
  if(i===0)v.forEach((ok,k)=>{
   if(!ok)return;
   const lo=cam.P(l.pts[k][0],l.z,l.pts[k][1]),hi=cam.P(nx.pts[k][0],nx.z,nx.pts[k][1]);
   if(lo&&hi&&Math.abs(hi[1]-lo[1])>.8)o+=`<path class="${clsLine}" fill="none" d="M${lo.join(' ')}L${hi.join(' ')}"/>`;
  });
 });
 const top=levels[levels.length-1];
 return o+`<polygon class="${clsFill}" points="${poly(top.pts.map(q=>cam.P(q[0],top.z,q[1])).filter(Boolean))}"/>`;
}
export function street(state,t,view){
 const W=1000,H=620,cx=W/2,cy=Math.round(H*.46);
 const n=Math.max(1,state.floors|0),bodyHeight=stackHeight(state,n)||1,total=massingRings(state).at(-1).z;
 const d=view.d,look=view.look*DTR,cs=Math.cos(look),sn=Math.sin(look);
 // Walking in means two things beyond standing still and looking up: where you
 // are standing across the road, and which way you are facing. Without them the
 // street view had one reachable place in the world — the axis, dead centre.
 // So the camera takes a lateral offset and a heading, and every point passes
 // through ONE projector, because the auto-fit and the drawing have to agree
 // about where things are: a fit computed on a different camera than the one
 // that draws produces a correctly-projected drawing inside a wrongly-placed
 // frame, which looks like a lens bug and is not one.
 const ox=view.across||0,yaw=(view.turn||0)*DTR,cyw=Math.cos(yaw),syw=Math.sin(yaw);
 const proj=(X,Y,Z,minF)=>{
  const px=X-ox,pz=Z+d;
  const rx=px*cyw+pz*syw,rz=-px*syw+pz*cyw;
  const ry=Y-EYE,fw=ry*sn+rz*cs;
  return fw<minF?null:[rx/fw,(ry*cs-rz*sn)/fw];
 };
 const p0=profile(state,0),len=p0.length;
 const c0=[0,1].map(k=>p0.reduce((a,p)=>a+p[k],0)/len);
 // The corner to stand opposite is the one whose two faces both recede most
 // from the view axis — that is what makes the view two-point rather than flat.
 let vi=0,bs=-Infinity;
 p0.forEach((q,k)=>{
  const u=[q[0]-c0[0],q[1]-c0[1]],lu=Math.hypot(u[0],u[1])||1;
  const sc=Math.min(...[1,-1].map(s=>{const r=p0[(k+s+len)%len];return -((r[0]-q[0])*u[0]+(r[1]-q[1])*u[1])/lu}));
  if(sc>bs){bs=sc;vi=k}
 });
 const V=p0[vi],ux=V[0]-c0[0],uy=V[1]-c0[1],lu=Math.hypot(ux,uy)||1;
 const ca=ux/lu,sa=-uy/lu;
 // Rotate the site frame so this corner sits at the origin and the axis away
 // from the viewer is +Z; the camera then sits at exactly (0,-d).
 const TP=q=>{const x=q[0]-V[0],z=q[1]-V[1],ax=-ux/lu,az=-uy/lu;return [x*az-z*ax,x*ax+z*az]};
 const raw=(X,Y,Z)=>proj(X,Y,Z,3);
 const fit=[];
 const see=(X,Y,Z)=>{const r=raw(X,Y,Z);if(r)fit.push(r)};
 const levels=[{z:0,pts:p0.map(TP)}];
 for(let i=1;i<=n;i++){const z=Math.min(stackHeight(state,i),total);levels.push({z,pts:profile(state,z/bodyHeight).map(TP)})}
 for(const r of massingRings(state).filter(r=>r.kind==='crown'))levels.push({z:r.z,pts:r.poly.map(TP)});
 levels.forEach(l=>l.pts.forEach(q=>{see(q[0],0,q[1]);see(q[0],l.z,q[1])}));
 const R=V0=>V0.pts.map(TP);
 const A=[levels[0].pts[vi],levels[0].pts[(vi+1)%len]],Bz=[levels[0].pts[vi],levels[0].pts[(vi+len-1)%len]];
 const unit=(a,b)=>{const l=Math.hypot(b[0]-a[0],b[1]-a[1])||1;return [(b[0]-a[0])/l,(b[1]-a[1])/l]};
 const uA=unit(A[0],A[1]),uB=unit(Bz[0],Bz[1]);
 const out=(a,u,w)=>[a[0]+u[1]*w,a[1]-u[0]*w]; // outward normal = u rotated −90°
 const FOOT=3.2,ROAD=14;
 const kn=[out(A[0],uA,FOOT),out(A[1],uA,FOOT)],kf=[out(A[0],uA,FOOT+ROAD),out(A[1],uA,FOOT+ROAD)];
 const box=(a,u,w,dep,h)=>{const o=[a,[a[0]+u[0]*w,a[1]+u[1]*w],[a[0]+u[0]*w+u[1]*dep,a[1]+u[1]*w-u[0]*dep],[a[0]+u[1]*dep,a[1]-u[0]*dep]];
  return [{z:0,pts:o},{z:h,pts:o}]};
 const nhA=Math.min(total*.72,Math.max(16,total*.30)),nhB=Math.min(total*.86,Math.max(24,total*.46));
 const nA=box(A[1],uA,Math.max(15,(+state.span||40)*.62),20,nhA);
 const nB=box(Bz[1],uB,Math.max(13,(+state.span||40)*.46),18,nhB);
 [...kn,...kf,...nA.flatMap(l=>l.pts),...nB.flatMap(l=>l.pts)].forEach(q=>{see(q[0],0,q[1]);see(q[0],Math.max(nhA,nhB),q[1])});
 const rm=Math.max(...fit.map(r=>Math.abs(r[0])))||1,um=Math.max(...fit.map(r=>Math.abs(r[1])))||1;
 const minX=Math.min(...fit.map(r=>r[0])),maxX=Math.max(...fit.map(r=>r[0])),minY=Math.min(...fit.map(r=>r[1])),maxY=Math.max(...fit.map(r=>r[1]));
 // Fitting to whatever the turn throws into frame produced a 166° lens — wider
 // than a fisheye, and a number no drawing can justify. So the frame is fitted
 // but never wider than a real architectural wide angle; past that the scene
 // leaves the sheet instead of distorting to stay on it. The cap is stated in
 // the note, because a lens angle you cannot see is a claim, not a measurement.
 const LENS_CAP=110*DTR;
 const f=Math.max(Math.min(.92*W/Math.max(.001,maxX-minX),.9*H/Math.max(.001,maxY-minY)),(H/2)/Math.tan(LENS_CAP/2));
 const frameX=W/2-f*(maxX+minX)/2,frameY=H/2+f*(maxY+minY)/2;
 const cam={x:ox,z:-d,P:(X,Y,Z)=>{const r=proj(X,Y,Z,.6);
  return r?[frameX+r[0]*f,frameY-r[1]*f]:null}};
 const segment=(a,b,cls)=>{const A=cam.P(...a),B=cam.P(...b);return A&&B?`<path class="${cls}" fill="none" d="M${A.join(' ')}L${B.join(' ')}"/>`:''};
 let o='';
 o+=`<rect class="wk-sky" width="${W}" height="${H}"/>`;
 const gp=pts=>poly(pts.map(q=>cam.P(q[0],0,q[1])).filter(Boolean));
 o+=`<polygon class="wk-ground" points="${gp([kn[0],kn[1],kf[1],kf[0]])}"/>`;
 for(let i=1;i<7;i++){const m=i/7;
  o+=segment([kn[0][0]+(kf[0][0]-kn[0][0])*m,0,kn[0][1]+(kf[0][1]-kn[0][1])*m],[kn[1][0]+(kf[1][0]-kn[1][0])*m,0,kn[1][1]+(kf[1][1]-kn[1][1])*m],'wk-faint');
 }
 [[kn,.15],[kf,.15]].forEach(([k,h])=>{ // kerbs are 0.15 m faces, not stripes
  k.forEach(q=>{const lo=cam.P(q[0],0,q[1]),hi=cam.P(q[0],h,q[1]);if(lo&&hi)o+=`<path class="wk-kerb" fill="none" d="M${lo.join(' ')}L${hi.join(' ')}"/>`});
  o+=segment([k[0][0],0,k[0][1]],[k[1][0],0,k[1][1]],'wk-l');
 });
 o+=prism(nA,cam,'wk-nb','wk-nb','wk-nb-l')+prism(nB,cam,'wk-nb','wk-nb','wk-nb-l');
 o+=prism(levels,cam,'wk-tw','wk-tw2','wk-l');
 const fp=out(out(A[1],uA,FOOT+ROAD*.6),uA,5.5),FP=(x,y)=>cam.P(fp[0]+x,y,fp[1]);
 o+=`<path class="wk-fig" data-scale-figure="modulor" fill-rule="evenodd" d="${modulorPath(FP)}"/>`;
 const hc=levels[0].pts[vi],ha=cam.P(hc[0],0,hc[1]),hb=cam.P(hc[0],total,hc[1]);
 if(ha&&hb){
  const dx=ha[0]<cx?-18:18,mx=(ha[0]+hb[0])/2+dx,my=(ha[1]+hb[1])/2;
  o+=`<path class="wk-a" fill="none" d="M${num(ha[0]+dx,1)} ${num(ha[1],1)}L${num(hb[0]+dx,1)} ${num(hb[1],1)}"/>`+
   tri(ha[0]+dx,ha[1])+tri(hb[0]+dx,hb[1])+
   `<rect class="wk-bg" x="${num(mx-34,1)}" y="${num(my-11,1)}" width="68" height="20"/>`+
   `<text x="${num(mx,1)}" y="${num(my+3,1)}" text-anchor="middle">${num(total,1)} m</text>`;
 }
 const tp=levels[levels.length-1].pts[vi],th=cam.P(tp[0],total,tp[1]);
 if(th)o+=`<circle class="wk-pin" cx="${num(th[0],1)}" cy="${num(th[1],1)}" r="10"/><text class="wk-pin-t" x="${num(th[0],1)}" y="${num(th[1]+4,1)}" text-anchor="middle">1</text>`;
 [[out(A[1],uA,FOOT),2],[out(A[1],uA,FOOT+ROAD*.5),3],[nA[0].pts[2],4],[nB[0].pts[2],5],[fp,6]]
  .forEach(([q,k])=>{const r=cam.P(q[0],0,q[1]);if(!r)return;
   o+=`<circle class="wk-pin" cx="${num(r[0],1)}" cy="${num(r[1],1)}" r="10"/><text class="wk-pin-t" x="${num(r[0],1)}" y="${num(r[1]+4,1)}" text-anchor="middle">${k}</text>`});
 // The angle to the top and the scale at the near corner both depend on how far
 // the reader actually is from the corner being measured. Standing off the axis
 // makes that distance hypot(off, d), not d — and a figure that keeps reporting
 // the on-axis distance after you have walked sideways is a wrong number, not a
 // rounded one. Turning does not enter here: it rotates the view, it does not
 // move the reader.
 const hd=Math.hypot(ox,d)||1;
 return {svg:o,elev:Math.atan2(total-EYE,hd)/DTR,lens:2*Math.atan(H/2/f)/DTR,mpp:(hd*cs-EYE*sn)/f,total};
}

export const WALK_I18N={
en:{title:'Human-eye view',tier:'Two perspective constructions projected from the live model · drawings, not renders',
 interior:'Walk-in interior · one-point perspective section',street:'Street view · two-point perspective, verticals converging',
 isWhat:'What these drawings are',notModel:'What they do not model',noProof:'They are not evidence that a scheme is habitable, buildable or approvable.',
 two:'Both drawings are perspective projections computed from the current model geometry: the plan at every level, the real level stack, the live span, taper and twist. Nothing is hand-placed.',
 none:'No perspective-correct texture, no refraction through glass, no lighting or shadows, no occupants beyond the scale figure, and no interior partition beyond the one that is cut. Ceiling, duct, pipe and tray sizes are diagrammatic.',
 eye:'Eye height',f2f:'floor to floor',clear:'clear height',services:'services zone',plate:'plate span',depth:'depth shown',lens:'Lens',
 figure:'Le Corbusier · Modulor · 1.83 / 2.26 m',eyeLine:'Occupant eye line at 1.60 m',blocked:'The sight line reaches the ceiling plane; the services sit above it',
 cut:'Ceiling cut away here only so the plenum can be drawn. There is no opening.',
 svNote:'The 0.95 m services zone is a diagrammatic allowance, not a coordinated services design.',
 slab:'Floor slab',ceiling:'Ceiling',plenum:'Plenum',duct:'Supply duct',pipes:'Sprinkler and drainage',tray:'Cable tray',glazing:'Curtain wall',
 bays:'Mullion bays across the plate at a 1.5 m module',beyond:'Services continue past the cut and are not visible from the floor',
 dist:'Distance from facade',look:'Look-up angle',across:'Where you stand across the road',turn:'Turn from the corner',reset:'Reset view',towerH:'Tower height',levels:'Levels drawn',scale:'Scale at the near corner',
 kerb:'Kerb',road:'Road edge',flank:'Flanking buildings',subtend:'Angle to the top above the horizon',
 flankNote:'Neighbouring heights and the 17.2 m footway plus road are diagrammatic, not surveyed.',
 pitchNote:'Look-up tilts the camera about its own axis; the principal point stays at the centre of the sheet.',
 benchmark:'Benchmark',
 benchmarkText:'Empire Tower, Bangkok — a published clear height of 2.60 m. That is a measured figure belonging to a different building, cited here as a benchmark only. It is not a result of this model.'},
th:{title:'มุมมองระดับสายตา',tier:'ภาพทัศนียภาพสองภาพ ฉายจากโมเดลที่ใช้งานอยู่ · เป็นภาพเขียน ไม่ใช่ภาพเรนเดอร์',
 interior:'มุมมองภายในออฟฟิศ · ทัศนียภาพแบบจุดรวมสายตาหนึ่งจุด',street:'มุมมองจากถนน · ทัศนียภาพแบบจุดรวมสายตาสองจุด เส้นแนวตั้งรวมสู่จุดหายเหนือขึ้น',
 isWhat:'ภาพเหล่านี้คืออะไร',notModel:'สิ่งที่ภาพไม่ได้จำลอง',noProof:'ภาพเหล่านี้ไม่ใช่หลักฐานว่าแบบนี้อาศัยได้ ก่อสร้างได้ หรือขออนุมัติได้',
 two:'ทั้งสองภาพเป็นการฉายเชิงมุมมองที่คำนวณจากเรขาคณิตของโมเดลปัจจุบัน คือผังทุกชั้น โครงสร้างชั้นจริง ความกว้าง ความลาด และการบิดตามค่าที่ใช้งานอยู่ ไม่มีการจัดวางด้วยมือ',
 none:'ไม่มีพื้นผิวที่แก้การเปรียบเสียบเชิงมุมมอง ไม่มีการหักเหของแก้ว ไม่มีแสงหรือเงา ไม่มีคนนอกจากหุ่นมาตรฐาน และไม่มีผนังภายในนอกจากผนังที่ถูกตัดไว้หนึ่งผนัง ขนาดฝ้าเพดาน ท่อลม ท่อน้ำ และรางสายเป็นค่าสมมติเชิงแผนภาพ',
 eye:'ระดับสายตา',f2f:'พื้นถึงพื้น',clear:'ความสูงใส',services:'โซนงานระบบ',plate:'ความกว้างพื้นที่ชั้น',depth:'ความลึกที่แสดง',lens:'เลนส์',
 figure:'Le Corbusier · Modulor · 1.83 / 2.26 ม.',eyeLine:'ระดับสายตาผู้ใช้อาคารที่ 1.60 ม.',blocked:'สายตาถึงระดับฝ้าเพดาน และงานระบบอยู่เหนือระดับนั้น',
 cut:'ฝ้าเพดานถูกตัดตรงนี้เพียงเพื่อให้เห็นโซนงานระบบ ไม่ใช่ช่องเปิดจริง',
 svNote:'โซนงานระบบ 0.95 ม. เป็นค่าสมมติเชิงแผนภาพ ไม่ใช่งานระบบที่ออกแบบประสานกันแล้ว',
 slab:'พื้นคอนกรีต',ceiling:'ฝ้าเพดาน',plenum:'ช่องเหนือฝ้าเพดาน',duct:'ท่อส่งลม',pipes:'ท่อสปริงเกลอร์และท่อระบาย',tray:'รางสาย',glazing:'ผนังกระจก',
 bays:'ช่องกระจกตามความกว้างพื้นที่ชั้น ขนาดมาตรฐาน 1.5 ม.',beyond:'งานระบบยื่นผ่านแนวตัดไป และมองไม่เห็นจากระดับพื้น',
 dist:'ระยะจากแนวอาคาร',look:'มุมที่เงยหน้าขึ้น',across:'ตำแหน่งที่ยืนข้ามถนน',turn:'หมุนจากมุมอาคาร',reset:'คืนค่ามุมมอง',towerH:'ความสูงอาคาร',levels:'จำนวนชั้นที่แสดง',scale:'มาตราส่วนที่มุมใกล้',
 kerb:'ขอบทาง',road:'ขอบถนน',flank:'อาคารข้างเคียง',subtend:'มุมถึงยอดอาคารเหนือเส้นขอบฟ้า',
 flankNote:'ความสูงอาคารข้างเคียงและความกว้างทางเดินร่วมถนนรวม 17.2 ม. เป็นค่าสมมติเชิงแผนภาพ ไม่ได้สำรวจจริง',
 pitchNote:'การเงยหน้าขึ้นจะหมุนกล้องรอบแกนตัวเอง ขณะที่จุดหลักยังคงอยู่กลางกระดาษ',
 benchmark:'ค่าอ้างอิง',
 benchmarkText:'อาคารอิมพีเรียร์ทาวเวอร์ กรุงเทพฯ — ความสูงใสที่เผยแพร่ไว้ 2.60 ม. เป็นค่าที่วัดจริงของอาคารอีกหลังหนึ่ง ใช้เป็นค่าอ้างอิงเท่านั้น ไม่ใช่ผลลัพธ์ของโมเดลนี้'},
zh:{title:'人视视角',tier:'两幅由实时模型几何投影得出的透视图 · 是图，不是渲染',
 interior:'室内步行视角 · 一点透视剖面',street:'街景视角 · 两点透视，竖直边线向上收敛',
 isWhat:'这些图是什么',notModel:'它们不模拟什么',noProof:'它们不能证明方案可居住、可建造或可获批准。',
 two:'两幅图都是由当前模型几何计算出的透视投影：各层平面、真实层叠，以及当前的跨度、收分与扭转。没有任何一处是手工摆放的。',
 none:'没有透视正确的贴图，没有玻璃折射，没有光照与阴影，除比例人形外没有人物，除所剖切的一道隔墙外没有室内隔墙。天花、风管、水管与桥架的尺寸均为图示假设。',
 eye:'视高',f2f:'层高',clear:'净高',services:'设备区',plate:'楼层宽度',depth:'所示进深',lens:'镜头',
 figure:'勒·柯布西耶 · 模度人 · 1.83 / 2.26 米',eyeLine:'使用者视高 1.60 米',blocked:'视线止于吊顶面，设备位于其上方',
 cut:'此处剖切吊顶，仅为画出设备区，并非真实开口。',
 svNote:'0.95 米的设备区是图示预留，不是协调完成的服务设计。',
 slab:'楼板',ceiling:'吊顶',plenum:'吊顶上方夹层',duct:'送风管',pipes:'喷淋管与排水管',tray:'电缆桥架',glazing:'幕墙',
 bays:'楼层宽度上的幕墙分格，采用 1.5 米模数',beyond:'设备在剖切面之外继续，站在地面看不见',
 dist:'距外墙距离',look:'仰角',across:'你在路对面的位置',turn:'相对角点的转向',reset:'复位视角',towerH:'塔楼高度',levels:'所绘层数',scale:'近角处比例',
 kerb:'路缘',road:'路缘线',flank:'相邻建筑',subtend:'塔顶高出地平线的角度',
 flankNote:'相邻建筑高度与人行道加路面合计 17.2 米均为图示假设，并非实测。',
 pitchNote:'仰角只让镜头绕自身轴线旋转，主点仍固定在图纸中央。',
 benchmark:'参照基准',
 benchmarkText:'曼谷帝国大厦 — 公布的净高为 2.60 米。那是另一栋建筑的实测数据，仅作基准引用，并非本模型的结果。'}
};

const view={d:46,look:16,across:0,turn:0};
export function renderWalk({lang,state,changed}){
 const c=WALK_I18N[lang]||WALK_I18N.en,t=k=>ph(c[k]);
 const host=document.getElementById('walkDesk');
 if(!host)return;
 host.classList.add('wk');host.replaceChildren();
 // One number and one label per pair. Appending the number only on every
 // second pair put labels into the 11px number column, one letter per line.
 const key=pairs=>{const d=el('div',undefined,'wk-key');pairs.forEach(([n,l])=>d.append(el('b',n),el('i',l)));return d};
 const figure=(svg,aria,cap)=>{
  const w=el('div');w.className='wk-figwrap';
  const s=document.createElementNS('http://www.w3.org/2000/svg','svg');
  s.setAttribute('viewBox','0 0 1000 '+(svg.includes('wk-ground')?620:560));
  s.setAttribute('preserveAspectRatio','xMidYMid meet');
  s.setAttribute('role','img');s.setAttribute('aria-label',aria);s.setAttribute('class','wk-svg');
  s.innerHTML=svg;w.append(s);
  const f=el('figure',undefined,'wk-fig');f.append(w,el('figcaption',cap,'wk-cap'));
  return f;
 };
 // A · interior
 const ia=interior(state,t),total=stackHeight(state,state.floors),sa=street(state,t,view);
 const A=el('section',undefined,'wk-sec');
 A.append(el('h3',t('interior'),'wk-h'),el('p',t('tier'),'wk-note'),el('p',t('two'),'wk-note'),
  el('p',t('none'),'wk-note'),el('p',t('svNote'),'wk-note'));
 A.append(figure(ia.svg,t('interior')+' · '+t('blocked'),
  `${t('eye')} 1.60 m · ${num(ia.ff)} m ${t('f2f')} · ${num(ia.ff-SV)} m ${t('clear')} · ${num(SV)} m ${t('services')} · ${num(ia.span)} m ${t('plate')} × ${num(ia.depth)} m ${t('depth')} · ${t('lens')} ${num(ia.lens,0)}°`));
 A.append(key([['1',t('slab')],['2',t('ceiling')],['3',t('plenum')],['4',t('duct')],['5',t('pipes')],['6',t('tray')],['7',t('glazing')],['8',t('figure')],['9',t('eyeLine')],['10',t('cut')]]));
 A.append(el('p',t('bays')+' · '+t('beyond'),'wk-note'));
 // B · street
 let currentStreet=sa;
 const capB=()=>`${t('subtend')} ${num(currentStreet.elev,1)}° · ${t('dist')} ${num(view.d,0)} m · ${t('across')} ${num(view.across,0)} m · ${t('turn')} ${num(view.turn,0)}° · ${t('towerH')} ${num(currentStreet.total,1)} m · ${t('levels')} ${state.floors} · ${t('kerb')} 0.15 m · ${t('road')} 14.0 m · ${t('scale')} 1 px ≈ ${num(currentStreet.mpp,3)} m · ${t('lens')} ${num(currentStreet.lens,0)}°`;
 const B=el('section',undefined,'wk-sec');
 B.append(el('h3',t('street'),'wk-h'),el('p',t('two'),'wk-note'),el('p',t('none'),'wk-note'));
 const ctl=el('div');ctl.className='wk-ctl';
 const slider=(id,label,key,min,max,step,unit,set)=>{
  const l=el('label',label);l.htmlFor='wk-'+id;
  const i=el('input');i.id='wk-'+id;i.type='range';i.min=min;i.max=max;i.step=step;i.value=view[key];
  i.setAttribute('aria-label',label+' ('+unit+')');
  const o=el('output',num(view[key],step<1?1:0)+unit);o.htmlFor='wk-'+id;
  const paint=()=>{currentStreet=street(state,t,view);fig.querySelector('svg').innerHTML=currentStreet.svg;fig.querySelector('figcaption').textContent=capB()};
  i.oninput=()=>{set(+i.value);o.textContent=num(+i.value,step<1?1:0)+unit;paint()};
  ctl.append(l,i,o);
 };
 const fig=figure(sa.svg,t('street')+' · '+t('flank'),capB());
 slider('dist',t('dist'),'d',20,140,2,' m',v=>view.d=v);
 slider('look',t('look'),'look',0,42,1,'°',v=>view.look=v);
 // Where you stand and which way you face. Together with distance and look-up
 // these four are the whole of standing somewhere: two sliders let you only
 // ever be on the axis, which is a section drawing wearing a perspective's
 // clothes. The lateral offset runs across the carriageway, so its range is the
 // footway plus the road, not an arbitrary number.
 //
 // The turn stops at 25°, and that is a measurement rather than a preference.
 // The frame is fitted to the whole scene, so rotating hard swings the tower
 // off the sheet entirely: at 70° it sits 2714 units to one side of a 1000-wide
 // viewBox, and by 35° the subject is already at the frame edge. Twenty-five
 // degrees is where the drawing still reads as a building you are standing
 // across the road from. A control that can drive its own drawing off the page
 // is not a control, it is a way to produce an empty rectangle.
 slider('across',t('across'),'across',-24,24,1,' m',v=>view.across=v);
 slider('turn',t('turn'),'turn',-25,25,1,'°',v=>view.turn=v);
 const reset=el('button',t('reset'),'wk-btn');reset.type='button';
 reset.onclick=()=>{view.d=46;view.look=16;view.across=0;view.turn=0;renderWalk({lang,state,changed})};
 ctl.append(reset,el('p',t('pitchNote')+' '+t('flankNote')));
 B.append(ctl,fig);
 B.append(key([['1',t('towerH')],['2',t('kerb')],['3',t('road')],['4',t('flank')],['5',t('levels')],['6',t('figure')]]));
 // Shared honesty block, stated once for both drawings.
 const H=el('section',undefined,'wk-sec');
 H.append(el('h3',t('isWhat'),'wk-h'),el('p',t('two'),'wk-note'),
  el('h3',t('notModel'),'wk-h'),el('p',t('none'),'wk-note'),el('p',t('noProof'),'wk-note'));
 const bm=el('p',undefined,'wk-src');
 bm.append(el('b',t('benchmark')+': '),document.createTextNode(t('benchmarkText')));
 H.append(bm);
 host.append(A,B,H);
}
Object.assign(WALK_I18N.en,{two:'The street view projects the current tower profiles and slab stack. The interior is a schematic rectangular bay sized from the middle occupied profile and its actual storey height; partitions and services are illustrative.',benchmarkText:'Reference only: a 2.60 m clear-height example. This figure has not been verified in the owner source and is not used to size this model.'});
Object.assign(WALK_I18N.th,{two:'ภาพถนนฉายจากผังและชุดชั้นจริง ภายในเป็นห้องช่วงสี่เหลี่ยมสมมติ ใช้ขนาดจากผังชั้นใช้งานกลางตึกและความสูงชั้นจริง ผนังกั้นและระบบเป็นภาพอธิบาย',benchmarkText:'ตัวอย่างอ้างอิงเท่านั้น: ความสูงใส 2.60 ม. ยังไม่ยืนยันจากเอกสารเจ้าของอาคาร และไม่ได้ใช้กำหนดขนาดโมเดลนี้'});
Object.assign(WALK_I18N.zh,{two:'街道视图投影当前塔楼轮廓和楼层栈。室内是示意矩形开间，尺寸取自中部使用楼层轮廓及实际层高，隔墙和设备仅作说明。',benchmarkText:'仅供对照：2.60 米净高示例，尚未由业主资料核实，也未用于确定本模型尺寸。'});
Object.assign(WALK_I18N.en,{pitchNote:'Distance, look-up, where you stand across the road and which way you face are four independent placements, and framing and lens adapt to all four so the drawing stays on the sheet. The frame is recomputed to fit what is in view, so this is not a fixed-lens photograph, and it is never wider than 110° — turn far enough and part of the scene leaves the sheet rather than distorting to stay on it.',scale:'Horizontal scale at near corner'});
Object.assign(WALK_I18N.th,{pitchNote:'ระยะ มุมเงยหน้า ตำแหน่งที่ยืนข้ามถนน และทิศที่หันหน้า เป็นการวางตำแหน่งที่อิสระสี่แบบ การจัดกรอบและเลนส์จึงปรับตามทั้งสี่ค่าเพื่อให้ภาพอยู่บนกระดาษ และเพราะกรอบภาพคำนวณใหม่ตามสิ่งที่อยู่ในสายตา จึงไม่ใช่ภาพถ่ายด้วยเลนส์คงที่ โดยกรอบจะกว้างไม่เกิน 110° หมุนมากเกินไปภาพบางส่วนจะออกนอกกระดาษ แทนที่จะบิดเพื่อยัดอยู่',scale:'มาตราส่วนแนวนอนที่มุมใกล้'});
Object.assign(WALK_I18N.zh,{pitchNote:'距离、仰角、你在路对面的位置、以及面朝的方向，是四个互相独立的取景位置；取景与镜头会随四者一起调整，使图形始终留在图纸上。画框按视野内内容重新计算，因此这不是固定镜头的照片；画框最宽不超过 110°，转得过头时部分场景会移出图纸，而不是扭曲以留在图上。',scale:'近端转角的水平比例'});

export function getWalkStudy(){return {view:{...view},eyeHeight:EYE,servicesZone:SV,tier:'schematic perspective, not coordinated interior or surveyed context'}}
