import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CONSOLE_TEXT,WORKSPACES,workspaceForTarget,siteLedger} from '../dist/console.js';
import {FACADE_TEXT,facadeFrame,facadeDiagram} from '../dist/facade.js';
import {defaults,families,grossOf} from '../dist/model.js';
import {getBriefStudy,setBriefInputs} from '../dist/brief.js';
const near=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const read=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');
test('land/FAR setters validate atomically and preserve the actual geometry ledger',()=>{
 const old=getBriefStudy(defaults).inputs;
 assert.ok(setBriefInputs({plot:8000,far:7.5}));const l=siteLedger(defaults,getBriefStudy(defaults).inputs);near(l.allowance,60000);near(l.gross,grossOf(defaults));near(l.remaining,60000-l.gross);assert.ok(l.fits);
 for(const patch of [{plot:0},{far:Infinity},{plot:5000,far:'8'},{plot:5000,wrong:1},{plot:NaN}]){assert.equal(setBriefInputs(patch),false);assert.equal(getBriefStudy(defaults).inputs.plot,8000)}
 assert.equal(siteLedger(defaults,{plot:100,far:8}).fits,false);
 assert.ok(setBriefInputs({plot:old.plot,far:old.far}));
});
test('workspace navigation keeps every existing desk addressable',()=>{
 assert.equal(WORKSPACES.length,7);
 for(const [id,workspace]of [['briefPanel','brief'],['contextPanel','place'],['locationDesk','place'],['walkPanel','walk'],['exploreTitle','compare'],['savedStudies','studies'],['atlas','form']])assert.equal(workspaceForTarget(id),workspace);
 for(const l of ['en','th','zh']){assert.deepEqual(Object.keys(CONSOLE_TEXT[l]),Object.keys(CONSOLE_TEXT.en));assert.equal(CONSOLE_TEXT[l].work.length,7);assert.deepEqual(Object.keys(FACADE_TEXT[l]),Object.keys(FACADE_TEXT.en));assert.equal(FACADE_TEXT[l].parts.length,8);
  if(l!=='en')for(const p of FACADE_TEXT[l].parts)assert.match(p,l==='th'?/[ก-๙]/:/[\u3400-\u9fff]/);
 }
});
test('local curtain-wall lean comes from the chosen face and actual slab programme',()=>{
 const straight=facadeFrame({...defaults,taper:1,twist:0},10,0);near(straight.lean,0);near(straight.tangent,0);
 const taper=facadeFrame({...defaults,taper:.6,twist:0},10,0);assert.ok(taper.lean<0);
 const twist=facadeFrame({...defaults,taper:1,twist:90},10,0);assert.ok(Math.abs(twist.tangent)>.01);
 near(facadeFrame({...defaults,program:'custom',height:4.65},10,0).height,4.65);
 for(const family of Object.keys(families))for(const level of [1,24,70])for(const face of [0,100]){
  const f=facadeFrame({...defaults,family,twist:120},level,face);assert.ok(Number.isFinite(f.lean));assert.ok(f.face>=0&&f.face<f.faces);
  for(const tab of [0,1])assert.doesNotMatch(facadeDiagram(f,{tab}),/NaN|Infinity/);
 }
 const f=facadeFrame(defaults,10);assert.notEqual(facadeDiagram(f,{joint:10}),facadeDiagram(f,{joint:35}));assert.notEqual(facadeDiagram(f,{slab:.2}),facadeDiagram(f,{slab:.4}));
});
test('facade references locate the supplied book and separate schematics from project engineering',()=>{
 for(const l of ['en','th','zh'])assert.match(FACADE_TEXT[l].source,/142–144/);
 assert.match(FACADE_TEXT.en.source,/2\.435–2\.437/);assert.match(FACADE_TEXT.en.note,/manufacturer testing/);
 const b=readFileSync(new URL('../dist/research/artifacts/ags-anchorage-2436.png',import.meta.url));assert.equal(b.subarray(1,4).toString(),'PNG');assert.ok(b.length>10000);
});
test('new console, facade and book excerpt take part in the release dependency graph',()=>{
 for(const file of ['app.js','console.js','facade.js','index.html'])for(const [,ref,id]of read(file).matchAll(/["']((?:\.\/)?[\w./-]+\.(?:js|css|png))\?v=([a-f0-9]{10})["']/g))assert.equal(createHash('sha256').update(readFileSync(new URL('../dist/'+ref.replace(/^\.\//,''),import.meta.url))).digest('hex').slice(0,10),id,ref);
 const css=read('console.css');assert.match(css,/body\.is-console\{height:100dvh;overflow:hidden\}/);assert.match(css,/body\.is-console header\{height:40px/);assert.doesNotMatch(css,/gradient\(|box-shadow|border-radius/);
 assert.match(read('console.js'),/step='any'/);assert.match(read('brief.js'),/br-plot[\s\S]{0,40}'any'/);
});
