import {test} from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
import{defaults,massingRings}from'../dist/model.js';import{heightOf}from'../scripts/building-height.mjs';
import*as E from'../dist/environment.js';import{sceneSVG,ENV_I18N}from'../dist/environment-desk.js';
const near=(a,b,tol=1e-6)=>assert.ok(Math.abs(a-b)<=tol,`${a} != ${b}`),square=[[-10,-10],[10,-10],[10,10],[-10,10]];
const sun=(east,north,up)=>({aboveHorizon:up>0,vector:{east,north,up},altitude:Math.asin(up)*180/Math.PI,azimuth:0});
test('OSM storeys cannot enter the city as metres or a measured height',()=>{
 assert.deepEqual(heightOf({'building:levels':'40'}),{h:128,src:'levels × 3.2 m'});
 assert.deepEqual(heightOf({height:'120 m','building:levels':'40'}),{h:120,src:'height'});
 assert.deepEqual(heightOf({'building:height':'110','building:levels':'40'}),{h:110,src:'building:height'});
 assert.equal(heightOf({height:'60 ft'}),null);assert.equal(heightOf({'building:levels':'no'}),null);
 assert.deepEqual(heightOf({'building:height':'bad','building:levels':'10'}),{h:32,src:'levels × 3.2 m'});
});
test('a box presents the correct visible walls through a complete orbit',()=>{
 for(let degrees=0;degrees<360;degrees++){const yaw=degrees*Math.PI/180,faces=E.extrude(square,30,0);const visible=faces.filter(f=>!f.roof&&E.visibleWall(f.pts[0],f.pts[1],yaw));assert.ok(visible.length>=1&&visible.length<=2);for(const f of visible)assert.ok(f.normal[0]*Math.sin(yaw)+f.normal[1]*Math.cos(yaw)>0)}
 assert.deepEqual(E.extrude([...square].reverse(),30,0),E.extrude(square,30,0));
 const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');assert.match(app,/if\(!visibleWall\(a,d,yaw\)\)continue/);assert.match(app,/cityNear.sort\(\(a,b\)=>depth\(a\)-depth\(b\)\)/);
});
test('static wind matches independent uniform prism forces, moment and cantilever deflection',()=>{
 const s={...defaults,family:'box',program:'custom',height:3,floors:20,span:40,aspect:1,taper:1,twist:0,orientation:0,crown:'flat'};
 const H=massingRings(s).at(-1).z,b=40,v=20,rho=1.2,cd=1.3,EI=80000e9,w=.5*rho*v*v*cd*b;
 const r=E.windStudy(s,{speed:v,density:rho,cd,ei:80000,mass:300,acceleration:.4});near(r.height,H);near(r.shear,w*H);near(r.moment,w*H*H/2);near(r.drift,w*H**4/(8*EI),1e-6);
 const doubled=E.windStudy(s,{speed:40,density:rho,cd,ei:80000});near(doubled.shear,4*r.shear);near(doubled.drift,4*r.drift);
 near(r.inertia.shear,300000*H*.4);near(r.inertia.moment,300000*.4*H*H/2);near(r.inertia.drift,300000*.4*H**4/(8*EI));
 assert.equal(E.windStudy(s,{speed:20}),null);assert.equal(E.windStudy(s,{speed:0,cd:1}).shear,0);assert.equal(E.windStudy(s,{speed:20,cd:1}).drift,null);
 const stiff=E.windStudy(s,{speed:v,density:rho,cd,ei:160000});near(stiff.drift,r.drift/2);
});
test('mirror law conserves angle and length and traces first opaque receiver',()=>{
 const S=[Math.SQRT1_2,0,Math.SQRT1_2],n=[1,0,0],r=E.reflectedDirection(S,n);near(r[0],S[0]);near(r[2],-S[2]);near(Math.hypot(...r),1);
 const face={pts:[[0,-1,9],[0,1,9],[0,0,12]],normal:n,id:-1};
 const receiver=E.extrude([[4,-4],[6,-4],[6,4],[4,4]],8,3);
 let rays=E.traceReflections([face],receiver,sun(...S));assert.equal(rays.length,1);assert.equal(rays[0].id,3);near(rays[0].end[0],4);
 assert.equal(E.traceReflections([face],receiver,sun(...S),0).length,0);
 assert.equal(E.traceReflections([face],receiver,sun(0,0,-1)).length,0);
 // A high obstacle also blocks incoming sunlight, so it cannot receive a ray emitted in shadow.
 assert.equal(E.traceReflections([face],E.extrude([[1,-4],[2,-4],[2,4],[1,4]],40,9),sun(...S)).length,0);
});
test('ray intersection and concave roof area do not invent occluders',()=>{
 near(E.rayTriangle([0,0,2],[0,0,-1],[-1,-1,0],[1,-1,0],[0,1,0]),2);
 assert.equal(E.rayTriangle([3,0,2],[0,0,-1],[-1,-1,0],[1,-1,0],[0,1,0]),null);
 const ring=[[0,0],[4,0],[4,1],[1,1],[1,4],[0,4]],tri=E.triangles({pts:ring.map(p=>[...p,5]),roof:true});
 const area=tri.reduce((s,[a,b,c])=>s+Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))/2,0);near(area,7);
});
test('shadow receivers use actual outlines, reverse with sun direction, and vanish at night',()=>{
 const s={...defaults,family:'box',span:20,aspect:1,taper:1,twist:0,orientation:0,crown:'flat'},blocks=[{ring:[[-2,-100],[2,-100],[2,-90],[-2,-90]]},{ring:[[-2,90],[2,90],[2,100],[-2,100]]}];
 const north=E.shadowReceivers(s,blocks,sun(0,Math.SQRT1_2,Math.SQRT1_2));assert.deepEqual(north,[true,false]);assert.deepEqual(E.shadowReceivers(s,blocks,sun(0,-Math.SQRT1_2,Math.SQRT1_2)),[false,true]);assert.deepEqual(E.shadowReceivers(s,blocks,sun(0,0,-1)),[false,false]);
});
test('environment inputs restore atomically and omit unsafe or unknown values',()=>{
 E.setEnvironmentInputs({speed:25,cd:1.4,ei:80000},true);const saved=E.getEnvironmentStudy();E.setEnvironmentInputs({speed:10});assert.equal(E.restoreEnvironmentStudy(saved),true);assert.deepEqual(E.getEnvironmentStudy(),saved);
 assert.equal(E.restoreEnvironmentStudy({inputs:{speed:Infinity}}),false);assert.deepEqual(E.getEnvironmentStudy(),saved);assert.equal(E.validateEnvironment({speed:25,secret:1}),null);E.restoreEnvironmentStudy();assert.equal(E.getEnvironmentStudy().inputs.speed,'');
});
test('six-city scenes contain elevated roofs and side walls at recorded heights',()=>{
 for(const city of ['bangkok','tokyo','kl','jakarta','hcmc','shenzhen']){const scene=E.environmentScene({...defaults,city});assert.ok(scene.buildings.length>10);assert.ok(scene.tower.height>0);const b=scene.buildings[0],faces=E.extrude(b.ring,b.h,0);assert.equal(faces.filter(f=>!f.roof).length,b.ring.length);assert.ok(faces.at(-1).pts.every(p=>p[2]===b.h));
 const svg=sceneSVG({...scene,state:{...defaults,city},yaw:-.65,mode:1});assert.match(svg,/data-block="0"/);assert.match(svg,/envArrow/);assert.ok(!svg.includes('NaN'))}
 for(const c of Object.values(ENV_I18N)){assert.equal(c.modes.length,3);for(const value of Object.values(c))assert.ok(value.length)}
});

test('partial edits keep teaching provenance and mass-only lateral response needs no wind',()=>{
 E.setEnvironmentInputs({speed:30,cd:1.2,ei:90000,mass:400,acceleration:.5},true);E.setEnvironmentInputs({bearing:90});assert.equal(E.getEnvironmentStudy().teaching,true);
 const r=E.windStudy(defaults,{mass:400,acceleration:.5,ei:90000});assert.ok(r.inertia.shear>0);assert.equal(r.shear,null);assert.equal(r.drift,null);E.restoreEnvironmentStudy();
});
