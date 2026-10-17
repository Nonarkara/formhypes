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
 assert.equal(WORKSPACES.length,9);
 assert.deepEqual(WORKSPACES,['form','brief','core','detail','facade','place','walk','compare','studies']);
 for(const [id,workspace]of [['briefPanel','brief'],['contextPanel','place'],['locationDesk','place'],['walkPanel','walk'],['exploreTitle','compare'],['savedStudies','studies'],['atlas','form'],['coreFigure','core'],['detailFigure','detail']])assert.equal(workspaceForTarget(id),workspace);
 for(const l of ['en','th','zh']){assert.deepEqual(Object.keys(CONSOLE_TEXT[l]),Object.keys(CONSOLE_TEXT.en));assert.equal(CONSOLE_TEXT[l].work.length,9);assert.deepEqual(Object.keys(FACADE_TEXT[l]),Object.keys(FACADE_TEXT.en));assert.equal(FACADE_TEXT[l].parts.length,8);
  if(l!=='en')for(const p of FACADE_TEXT[l].parts)assert.match(p,l==='th'?/[ก-๙]/:/[㐀-鿿]/);
 }
});
test('the core and the assembly are drawings, so they are tools and not rail furniture',()=>{
 // A drawing buried in a 300px rail is a drawing nobody scrolls to. Both were
 // promoted to the bar, so their markup has to travel with them.
 const html=read('index.html'),js=read('console.js');
 assert.match(html,/id="coreDesk"/);assert.match(html,/id="detailDesk"/);
 assert.match(js,/moveDesk\(\$\('coreDesk'\),panels\.core\)/);
 assert.match(js,/moveDesk\(\$\('detailDesk'\),panels\.detail\)/);
 // One home each. A copy left behind means getElementById returns whichever
 // is first and the other renders but never updates.
 const desk=html.slice(html.indexOf('id="coreDesk"'),html.indexOf('id="detailDesk"'));
 assert.ok(desk.includes('id="coreFigure"'),'coreFigure must live inside coreDesk');
 const rail=html.slice(html.indexOf('<aside class="controls"'),html.indexOf('<!-- 02'));
 assert.ok(!rail.includes('id="coreFigure"'),'coreFigure must not stay in the rail');
 // The chooser stays in the rail: a select is a control, not a drawing.
 assert.ok(html.indexOf('id="detailBasis"')<html.indexOf('id="detailDesk"'),'the detail select stays in the rail');
});
test('every tool glyph is drawn in the 20-unit house vocabulary, and none is a copy',()=>{
 const src=read('console.js');
 const table=src.slice(src.indexOf('const WORK_GLYPHS='),src.indexOf('export function workspaceForTarget'));
 const seen=new Map();
 for(const k of WORKSPACES){
  const g=new RegExp("\\n\\s*"+k+":'([^']+)'").exec(table);
  assert.ok(g,k+' has no glyph');
  assert.match(g[1],/^<(path|rect|circle)/,k+' glyph must be drawn, not typed');
  const key=g[1].replace(/\s+/g,'');
  assert.ok(!seen.has(key),k+' is a pixel-copy of the '+seen.get(key)+' glyph');
  seen.set(key,k);
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

test('every sub-tab has a button, in all three languages, and no panel is orphaned',()=>{
 /* The stand-here desk shipped with three labels in every language and TWO
    buttons, because the button count was a hard-coded [0,1] while the panel list
    had grown to three. Nothing failed: the extra panel was appended, hidden by
    `place!==2`, and unreachable because no button set `place=2`. It deployed,
    it passed 222 tests, and it was invisible.

    So this reads the COUNT off the panels and compares it with the label
    arrays in the shipped strings — the two things that have to agree. */
 const src=readFileSync(new URL('../dist/console.js',import.meta.url),'utf8');
 const panels=[...src.matchAll(/\$\('(\w+)'\)/g)].map(m=>m[1]);
 const placePanels=/placePanels=\[([^\]]+)\]/.exec(src);
 assert.ok(placePanels,'the Place desk no longer declares its panel list');
 const declared=[...placePanels[1].matchAll(/\$\('(\w+)'\)/g)].map(m=>m[1]);
 const buttons=/placeButtons=placePanels\.map/.test(src)
  ?declared.length
  :+/placeButtons=\[([^\]]+)\]/.exec(src)[1].split(',').length;
 assert.equal(buttons,declared.length,
  `${buttons} button(s) for ${declared.length} panel(s): ${declared.join(', ')}`);
 for(const l of['en','th','zh']){
  const labels=CONSOLE_TEXT[l].site;
  assert.ok(Array.isArray(labels),`${l}: the Place desk has no sub-tab labels`);
  assert.equal(labels.length,declared.length,
   `${l} names ${labels.length} sub-tabs for ${declared.length} panels`);
  for(const s of labels)assert.ok(String(s).trim().length>1,`${l} has an unnamed sub-tab`);
 }
 // Every panel must also be reachable by id, or it renders but never opens.
 for(const p of declared)assert.match(src,new RegExp(`hidden=place!==${declared.indexOf(p)}`),`${p} is never unhidden`);
});
