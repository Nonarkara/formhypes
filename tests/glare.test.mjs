import test from 'node:test';import assert from 'node:assert/strict';
import {reflect,dot,groundHit,reflectance,facadeFacets,facetLean,glareStep,glareDay,sunAt,leanOffset,yearAdd,yearSummary,YEAR_DAYS,GLARE_TEXT,GLARE_DNI,renderGlareLab} from '../dist/glare.js';
import {defaults,families} from '../dist/model.js';
import {cities,solarPosition} from '../dist/solar.js';
const near=(a,b,tol=1e-9,msg='')=>assert.ok(Math.abs(a-b)<=tol,`${msg} ${a} vs ${b}`);
const unit=v=>{const l=Math.hypot(...v);return v.map(x=>x/l)};

test('reflection keeps length and mirrors the angle about the normal',()=>{
 const cases=[[[1,-2,-3],[0,1,0]],[[-.3,.4,-.8],unit([.2,-.7,.1])],[[0,0,-1],unit([1,1,1])]];
 for(const [d0,n]of cases){const d=unit(d0),r=reflect(d,n);
  near(Math.hypot(...r),Math.hypot(...d),1e-12,'|r|=|d|');
  near(dot(r,n),-dot(d,n),1e-12,'angle in = angle out');
  // r lies in the plane of d and n: (d × n)·r = 0
  const c=[d[1]*n[2]-d[2]*n[1],d[2]*n[0]-d[0]*n[2],d[0]*n[1]-d[1]*n[0]];near(dot(c,r),0,1e-12,'coplanar');
  near(Math.hypot(...reflect(r,n).map((x,i)=>x-d[i])),0,1e-12,'involution')}
});

test('a vertical south-facing facet at noon in Bangkok lands where the hand calculation says',()=>{
 const p=solarPosition({city:'bangkok',solarDate:'2026-12-21',solarTime:'12:00'});
 // Dec solstice: 90 − 13.76 − 23.44 ≈ 52.8° at solar noon; civil noon is ~16 min earlier.
 assert.ok(p.altitude>50&&p.altitude<54,'altitude '+p.altitude);
 assert.ok(p.azimuth>150&&p.azimuth<200,'sun in the south '+p.azimuth);
 const h=100,a=p.altitude*Math.PI/180,A=p.azimuth*Math.PI/180;
 const r=reflect([-p.vector.east,-p.vector.north,-p.vector.up],[0,-1,0]),g=groundHit([0,0,h],r);
 // Mirror in the plane y = 0: x keeps going the way the sun's ray went, y flips back south.
 near(g[0],-h*Math.sin(A)/Math.tan(a),1e-9,'x');
 near(g[1],h*Math.cos(A)/Math.tan(a),1e-9,'y');
 near(Math.hypot(...g),h/Math.tan(a),1e-9,'distance = h / tan(altitude)');
 assert.ok(g[1]<-70&&g[1]>-85,'about 76 m south of the face '+g[1]);
 // The same through the full facet pipeline: an untapered box, south face.
 const s={...defaults,family:'box',taper:1,twist:0,orientation:0};
 const geom=facadeFacets(s),beams=glareStep(geom,sunAt('bangkok','2026-12-21','12:00'),{rhoN:.13});
 const south=beams.filter(b=>b.kind==='ground'&&Math.abs(b.f.n[1]+1)<1e-9);
 assert.ok(south.length>=geom.K-1,'south face reflects to the ground');
 for(const b of south){const c=b.f.c;near(b.x,c[0]-c[2]*Math.sin(A)/Math.tan(a),1e-6);near(b.y,c[1]+c[2]*Math.cos(A)/Math.tan(a),1e-6)}
 assert.equal(groundHit([0,0,10],[0,.5,.1]),null,'rising rays never reach the ground');
});

test('a convex box never overlaps beams; a concave cross does',()=>{
 const box={...defaults,family:'box',taper:1,twist:0};
 for(const date of ['2026-03-20','2026-06-21','2026-12-21']){const r=glareDay(box,{city:'bangkok',date,frames:false});assert.ok(r.maxOverlap<=1,date+' box overlap '+r.maxOverlap);assert.equal(r.focus,null)}
 const cross=glareDay({...defaults,family:'cross'},{city:'bangkok',date:'2026-06-21',frames:false});
 assert.ok(cross.maxOverlap>1,'cross overlap '+cross.maxOverlap);
 assert.ok(cross.focus&&cross.focus.count>1&&Math.abs(cross.focus.W-GLARE_DNI*cross.focus.rho)<1e-6);
 assert.ok(cross.worst.W>=cross.focus.W,'peak is the brightest cell, overlapping or not');
 // A crown that leans outward (20 Fenchurch Street) focuses the box too.
 const lean=glareDay(box,{city:'bangkok',date:'2026-06-21',lean:15,frames:false});
 assert.ok(lean.maxOverlap>1,'overhang overlap '+lean.maxOverlap);
});

test('reflectance: frit and ρv scale proportionally; glancing angles rise to the City of London figures',()=>{
 near(reflectance(.2,1,0),.2,1e-12);near(reflectance(.2,1,.5),.1,1e-12);near(reflectance(.4,1,.25),.3,1e-12);
 for(const c of [1,.7,.3,.05])near(reflectance(.3,c,.4),.6*reflectance(.3,c,0),1e-12);
 const at=deg=>reflectance(.13,Math.cos(deg*Math.PI/180));
 near(at(45),.15,1e-9);near(at(60),.22,1e-9);near(at(75),.49,1e-9);near(at(90),1,1e-9);
 let prev=0;for(let d=0;d<=90;d+=5){const v=at(d);assert.ok(v>=prev-1e-12);prev=v}
 assert.ok(reflectance(.08,1)<reflectance(.4,1));
 assert.equal(reflectance(.2,1,2),0);assert.equal(reflectance(-1,1,0),0);
});

test('lean geometry: an overhang tilts the upper facets down, a taper tilts them up',()=>{
 const s={...defaults,family:'box',taper:1,twist:0};
 const out=facadeFacets(s,{lean:12}),top=out.facets.filter(f=>f.level===out.K-1),bot=out.facets.filter(f=>f.level===0);
 for(const f of top)assert.ok(facetLean(f)>9&&facetLean(f)<12.5,'top lean '+facetLean(f));
 for(const f of bot)assert.ok(facetLean(f)<1.5,'base lean '+facetLean(f));
 for(const f of facadeFacets({...s,taper:.7}).facets)assert.ok(facetLean(f)<0,'taper leans back');
 near(leanOffset(0,200,10),0);assert.ok(leanOffset(200,200,10)>0&&leanOffset(200,200,-10)<0);
 near(leanOffset(200,200,10),-Math.log(Math.cos(10*Math.PI/180))/(10*Math.PI/180/200),1e-9);
});

test('finite outputs for every family in every city',()=>{
 for(const city of Object.keys(cities))for(const family of Object.keys(families)){
  const r=glareDay({...defaults,family,city},{city,date:'2026-09-23',frames:false,stepMin:30});
  for(const v of [r.maxOverlap,r.reach,r.beyond,r.sky,r.anyGround])assert.ok(Number.isFinite(v),`${city}/${family}`);
  if(r.worst)for(const v of [r.worst.W,r.worst.x,r.worst.y,r.worst.count])assert.ok(Number.isFinite(v),`${city}/${family} worst`);
  for(const f of r.faces)assert.ok(Number.isFinite(f.ground)&&Number.isFinite(f.bearing));
  assert.ok(r.hours.every(Number.isFinite));
 }
});

test('a frame-producing day and a sampled year stay consistent',()=>{
 const s={...defaults,family:'petal'},d=glareDay(s,{city:'jakarta',date:'2026-06-21'});
 assert.ok(d.frames.length>40&&d.frames.length<100);
 for(const f of d.frames){assert.ok(/^\d\d:\d\d$/.test(f.time));for(const b of f.beams)assert.ok(Number.isFinite(b.x)&&Number.isFinite(b.y))}
 const t=yearAdd({},d);assert.equal(t.days,1);const y=yearSummary(t);
 assert.ok(Number.isFinite(y.ground)&&y.ground>=0&&Number.isFinite(y.area));assert.equal(YEAR_DAYS.length,24);
});

test('GLARE_TEXT has identical keys in English, Thai and Chinese',()=>{
 const shape=o=>Object.keys(o).sort().map(k=>Array.isArray(o[k])?k+'['+o[k].length+']':typeof o[k]==='object'?k+'{'+shape(o[k])+'}':k).join(',');
 const en=shape(GLARE_TEXT.en);
 for(const lang of ['th','zh'])assert.equal(shape(GLARE_TEXT[lang]),en,lang);
 const walk=o=>{for(const v of Object.values(o))typeof v==='object'?walk(v):assert.ok(typeof v==='string'&&v.length)};walk(GLARE_TEXT);
 for(const k of Object.keys(cities))assert.ok(GLARE_TEXT.en.cityNames[k]);
 // The template slots must survive translation.
 const slots=s=>(s.match(/\{\w+\}/g)||[]).sort().join();
 for(const k of Object.keys(GLARE_TEXT.en))if(typeof GLARE_TEXT.en[k]==='string')for(const lang of ['th','zh'])assert.equal(slots(GLARE_TEXT[lang][k]),slots(GLARE_TEXT.en[k]),lang+'.'+k);
 assert.ok(!/ฉัน|เรา|ข้าพเจ้า|ผม/.test(JSON.stringify(GLARE_TEXT.th)),'Thai copy has no first person');
});

test('the renderer never throws, with or without a DOM',()=>{
 assert.doesNotThrow(()=>renderGlareLab());
 assert.doesNotThrow(()=>renderGlareLab({host:null,state:defaults,lang:'xx',active:true}));
 assert.doesNotThrow(()=>renderGlareLab({host:{},state:defaults,lang:'th',active:true}));
});
