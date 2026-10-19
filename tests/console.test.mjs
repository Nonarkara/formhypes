import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CONSOLE_TEXT,WORKSPACES,workspaceForTarget,siteLedger} from '../dist/console.js';
import {FACADE_TEXT,facadeFrame,facadeDiagram} from '../dist/facade.js';
import {defaults,families,grossOf} from '../dist/model.js';
import {getBriefStudy,setBriefInputs} from '../dist/brief.js';

/* Every module's source, for the guards that must span all of dist rather than
   the one file they happen to be written next to. */
const jsSources=()=>readdirSync(new URL('../dist/',import.meta.url)).filter(f=>f.endsWith('.js')).map(f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8'));
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
 // The count is derived, never typed: a hardcoded 9 stopped covering the
 // workspaces added after it was written, which is how two tools end up
 // sharing one mark without anybody noticing.
 assert.deepEqual(WORKSPACES,['form','brief','core','detail','facade','place','feng','walk','compare','studies']);
 for(const [id,workspace]of [['briefPanel','brief'],['contextPanel','place'],['locationDesk','place'],['walkPanel','walk'],['exploreTitle','compare'],['savedStudies','studies'],['atlas','form'],['coreFigure','core'],['detailFigure','detail']])assert.equal(workspaceForTarget(id),workspace);
 for(const l of ['en','th','zh']){assert.deepEqual(Object.keys(CONSOLE_TEXT[l]),Object.keys(CONSOLE_TEXT.en));assert.equal(CONSOLE_TEXT[l].work.length,WORKSPACES.length);assert.deepEqual(Object.keys(FACADE_TEXT[l]),Object.keys(FACADE_TEXT.en));assert.equal(FACADE_TEXT[l].parts.length,8);
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

test('every id in index.html is unique and every local module import carries a valid content stamp',()=>{
 const html=read('index.html');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 const seen=new Set(),dups=[];
 for(const id of ids){if(seen.has(id))dups.push(id);seen.add(id)}
 assert.deepEqual(dups,[],`duplicate id attributes in index.html: ${dups.join(', ')}`);
 // Every ES module import in dist/*.js must carry a 10-hex content stamp
 // matching the target file's sha256 — no unstamped imports (which cause double
 // module execution) and no @CITYSCAPE@ placeholder tokens.
 //
 // THE FILE LIST IS READ FROM THE DIRECTORY, NOT TYPED IN. It was a literal
 // list of thirty-one names, which is a guard that stops guarding the moment
 // anything is added: module thirty-two is not checked, and the failure is
 // silent because the loop simply never visits it. That is the same shape as
 // the bug this very guard was written for — a second, unstamped copy of a
 // module arriving because nobody's list knew about it.
 //
 // Read from disk, the guard cannot go stale. The only way to skip a file is to
 // take it out of dist, which is the thing you were trying to do.
 const jsFiles=readdirSync(new URL('../dist/',import.meta.url)).filter(f=>f.endsWith('.js')).sort();
 assert.ok(jsFiles.length>25,`only ${jsFiles.length} modules found in dist — the directory read is wrong`);
 for(const f of jsFiles){
  const src=read(f);
  assert.doesNotMatch(src,/@[A-Z_]+@/,`${f} still contains an unstamped @PLACEHOLDER@ token`);
  for(const [,spec] of src.matchAll(/\bfrom\s*['"](\.[^'"]+)['"]/g)){
   const m=/^\.\/([\w./-]+\.js)\?v=([a-f0-9]{10})$/.exec(spec);
   assert.ok(m,`${f} imports '${spec}' without a 10-char sha256 ?v= stamp`);
   const actual=createHash('sha256').update(readFileSync(new URL('../dist/'+m[1],import.meta.url))).digest('hex').slice(0,10);
   assert.equal(m[2],actual,`${f} stamps ${m[1]} as ${m[2]}, actual sha256 is ${actual}`);
  }
 }
 // The stamp is only worth something if it is derived from the bytes that will
 // actually be served. Two files hashing to the same ten hex characters would
 // pass every check above while the browser fetched a stale copy.
 for(const f of jsFiles.filter(f=>f.endsWith('.data.js'))){
  const stamped=read(f);
  assert.ok(stamped.length>0,`${f} is empty`);
 }
});

test('every metric row in a rail group is counted, and every output is written to',()=>{
 /* Two defects of the same family, both of which look fine on screen because
    the browser does not complain about either.

    A `<details class="railgroup">` carries a badge saying how many rows it
    holds. That number is typed into the markup by hand and it drifted: the
    group said 6 and held 7. Nothing counts it, so it is a fact about the page
    that nobody maintains.

    And a metric `<dd>` or a note `<p>` that nothing writes to is not an error
    at all — it is an empty element that was always empty. The `ledNote`
    collision hid exactly this: two elements shared one id, the writer reached
    the first, and the second sat permanently blank with nothing to report it.

    So: the badge must equal the rows, and every output element must have
    something in the code that writes to it. */
 const html=read('index.html');
 const groups=[...html.matchAll(/<details class="railgroup" id="(\w+)">([\s\S]*?)<\/details>/g)];
 assert.ok(groups.length>=5,`only ${groups.length} rail groups in the markup — the pattern is wrong`);
 for(const [,id,body] of groups){
  const badge=/<span class="cnt">(\d+)<\/span>/.exec(body);
  assert.ok(badge,`${id} has no count badge`);
  const rows=(body.match(/<dd id=/g)||[]).length;
  assert.equal(+badge[1],rows,
   `${id} says it holds ${badge[1]} rows and holds ${rows} — the badge is a claim, not a count`);
 }
 // Every LEAF output must be written by something. Leaf, because a container is
// written through its children — `<p id="phoneReadout">` holds three spans and
// nothing writes to the `<p>` itself, which is correct, and a guard that flagged
// it would be crying wolf on the first element it met.
 const all=jsSources().join('\n');
 const outs=[...html.matchAll(/<(dd|p)\b[^>]*\bid="([\w-]+)"[^>]*>([\s\S]*?)<\/\1>/g)]
  .filter(m=>!/<[a-z]/i.test(m[3]))
  .map(m=>m[2]);
 assert.ok(outs.length>40,`only ${outs.length} leaf output elements found — the pattern is wrong`);
 const unwritten=outs.filter(id=>
  !new RegExp(`\\$\\('${id}'\\)|getElementById\\('${id}'\\)|#${id}\\b`).test(all));
 assert.deepEqual(unwritten,[],
  `these output elements are declared but nothing ever writes to them, so they are permanently blank: ${unwritten.join(', ')}`);
});

/* The Z-axis of a facade joint is invisible until it is wrong: a horizontal
   joint that drifts in z looks like a slightly crooked line on a small panel,
   not like an error. And the 3D canvas draws it, so no amount of looking at the
   DOM finds it. The expression is asserted instead — the second endpoint of a
   horizontal run must keep the same storey height as the first, because a
   horizontal line by definition does not climb.

   The version that shipped added an X COORDINATE to the z component, which
   tilted every horizontal joint diagonally across the panel. */
test('a horizontal facade joint stays at one storey height',()=>{
 const src=read('app.js');
 const call=/seg\[0\]==='h'\)line\(([\s\S]*?),mat\.edge/.exec(src);
 assert.ok(call,'no horizontal joint line call found');
 // Split the two endpoints at bracket depth zero. A regex like \[([^\]]+)\]
 // cannot do this: the coordinates contain seg[1], so the first bracket closes
 // the capture inside the first term and the pattern never matches at all.
 const arg=call[1],ends=[];
 let depth=0,start=-1;
 for(let i=0;i<arg.length;i++){
  if(arg[i]==='['){if(depth===0)start=i;depth++}
  else if(arg[i]===']'){depth--;if(depth===0&&start>=0){ends.push(arg.slice(start,i+1));start=-1}}
 }
 assert.equal(ends.length,2,`a joint line takes two points; found ${ends.length}`);
 // The storey height of a point is the term beginning o[2], up to the next
 // top-level comma.
 const zOf=end=>{
  const i=end.indexOf('o[2]');
  if(i<0)return null;
  let d=0;
  for(let j=i;j<end.length;j++){
   if(end[j]==='[')d++;
   else if(end[j]===']')d--;
   else if(end[j]===','&&d===0)return end.slice(i,j);
  }
  return end.slice(i);
 };
 const [a,b]=ends.map(zOf);
 assert.ok(a&&b,'a joint endpoint has no explicit storey height');
 assert.equal(a,b,
  `the two ends of a horizontal joint are at ${a} and ${b} — a horizontal line that climbs is a tilted one`);
 // And nothing in-plane may reach the height slot.
 for(const z of [a,b])
  assert.doesNotMatch(z,/px\[|py\[[01]\]\*/,`a horizontal joint mixes an in-plane vector into its storey height: ${z}`);
});


test('every module in dist is reachable from the page, so nothing is orphaned',()=>{
 /* A module can sit in dist and be perfectly valid — it parses, it carries a
    correct stamp, nothing in it is broken — while no page ever loads it. The
    importer of module 32 is the importer of module 31, and when someone adds a
    file and forgets the line above it, nothing fails. The file is then dead
    code that reads as live code, which is the worst kind of both.

    So the graph is walked for real: from the one <script type="module"> in the
    markup, following every relative import transitively, and every file in
    dist must be reached. A dynamic import() would escape the walk, so the walk
    collects those too and fails loudly rather than silently under-counting. */
 const html=read('index.html');
 const dist=new URL('../dist/',import.meta.url);
 const all=readdirSync(dist).filter(f=>f.endsWith('.js')).sort();
 const entries=[...html.matchAll(/<script[^>]*\ssrc="\.?\/?([\w.-]+\.js)/g)].map(m=>m[1]);
 assert.ok(entries.length>=1,'no module entry point in index.html');
 const seen=new Set(),queue=[...entries],dynamic=[];
 while(queue.length){
  const f=queue.pop();
  if(seen.has(f)||!all.includes(f))continue;
  seen.add(f);
  const src=readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');
  for(const [,spec] of src.matchAll(/\bfrom\s*['"]\.\/([\w./-]+\.js)/g))queue.push(spec);
  for(const [,spec] of src.matchAll(/\bimport\(\s*['"]\.\/([\w./-]+\.js)/g))dynamic.push(f+' -> '+spec);
 }
 assert.deepEqual(dynamic,[],
  `these load through a dynamic import, which this reachability walk does not follow: ${dynamic.join(', ')}`);
 const orphans=all.filter(f=>!seen.has(f));
 assert.deepEqual(orphans,[],
  `these modules sit in dist but nothing on the page can reach them, so they are dead code wearing a valid stamp: ${orphans.join(', ')}`);
});

/* The top switch is two drawings, and both halves of that are fragile.

   The glyphs live inside the anchor, next to a <span> carrying the label. The
   i18n pass writes textContent over every [data-i18n] node, so putting the key
   back on the anchor would delete the drawing on the first language switch —
   in Thai, at the second click, and never in the English build anyone checks
   first. The key belongs on the child.

   And the active marker is a 2px rule in the accent, not an inset box-shadow.
   This stylesheet spends no shadows anywhere, so one here is both a style
   violation and evidence that the line was drawn by a different hand than the
   rest of the header. */
test('the section switch is drawn, and survives the language pass',()=>{
 const html=read('index.html');
 const nav=/<nav class="tabs"([\s\S]*?)<\/nav>/.exec(html);
 assert.ok(nav,'the .tabs nav is missing from index.html');
 const links=[...nav[1].matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)];
 assert.equal(links.length,2,`the switch declares ${links.length} destinations, expected 2`);
 for(const [,attrs,inner] of links){
  assert.match(inner,/<svg[^>]*class="ic"/,
   'a section switch entry has no drawing — the menu is text again');
  assert.match(inner,/<span data-i18n="nav\./,
   'the label must live in its own span, beside the drawing rather than under it');
  assert.ok(!/data-i18n=/.test(attrs),
   'data-i18n sits on the anchor itself: the i18n pass writes textContent and '+
   'will delete the glyph the first time the language changes');
  // The glyph is decorative. The link's accessible name comes from the label,
  // so a screen reader announces "Studio" rather than "graphic".
  assert.match(inner,/aria-hidden="true"/,
   'the drawing must be hidden from assistive tech; the label carries the name');
 }
 const app=read('app.js');
 assert.match(app,/\[data-i18n\]'\)\.forEach\(n=>\{n\.textContent=/,
  'the i18n pass no longer writes textContent — re-derive whether the glyph '+
  'survives a language switch before trusting this guard');
});

test('the active section is marked with a rule, not a shadow',()=>{
 const css=read('style.css');
 const tab=/\.tabs a\.on\{([^}]*)\}/.exec(css);
 assert.ok(tab,'the .tabs a.on rule is missing');
 assert.match(tab[1],/border-bottom-color:\s*var\(--accent\)/,
  `the active section is not marked with the accent rule, got: ${tab[1].trim()}`);
 assert.ok(!/box-shadow/.test(tab[1]),
  'the active section uses a box-shadow; this stylesheet has none, and a rule '+
  'is what the rest of the header is drawn with');
});

/* The workspace switcher, and the value ladder under the city.

   The strip used to clip every label to nothing — `clip:rect(0 0 0 0)` on a 1px
   box — and leave nine 18px marks to carry nine meanings alone. Two of the
   marks were the same picture at that size. A mark earns its place by being
   legible; hiding the word is not how you make it legible, and the reader was
   left hovering nine buttons to find out what they did.

   So: every entry carries its name, and no two marks are the same drawing. */
test('every workspace in the switcher shows its name, not just a mark',()=>{
 const css=read('console.css');
 const blocks=[...css.matchAll(/@media\(max-width:(\d+)px\)\{((?:[^{}]|\{[^{}]*\})*)\}/g)];
 // The label is shown at every width.
 const desktopRule=/\.console-nav \.wt\{([^}]*)\}/.exec(css.replace(/@media[^}]*\{(?:[^{}]|\{[^{}]*\})*\}/g,''));
 assert.ok(desktopRule,'there is no .console-nav .wt rule outside a media query');
 assert.ok(!/clip\s*:\s*rect/.test(desktopRule[1])&&!/width:\s*1px/.test(desktopRule[1]),
  `the workspace label is clipped away on a desktop sheet: ${desktopRule[1].trim()}`);
 const narrow=blocks.filter(b=>parseInt(b[1],10)<=600).map(b=>b[2]).join('\n');
 // 2026-10-19: ten unlabelled marks did not fit either and the tenth was cut
 // off. The phone now keeps every name and scrolls the strip sideways.
 assert.doesNotMatch(narrow,/\.console-nav \.wt\{[^}]*clip\s*:\s*rect/,
  'the phone drops the workspace names again: an unlabelled mark is a guess');
 assert.match(narrow,/\.console-nav\{[^}]*overflow-x:auto/,'the phone strip must scroll, not clip');
 const js=read('console.js');
 const glyphs=/WORK_GLYPHS=\{([\s\S]*?)\};/.exec(js);
 assert.ok(glyphs,'WORK_GLYPHS is missing from console.js');
 const entries=[...glyphs[1].matchAll(/(\w+)\s*:\s*'([^']*)'/g)];
 assert.equal(entries.length,WORKSPACES.length,`the switcher declares ${entries.length} marks, one per workspace`);
 const seen=new Map();
 for(const [,k,v] of entries){
  assert.ok(!seen.has(v),`"${k}" and "${seen.get(v)}" are the same drawing; at 18px they were one mark`);
  seen.set(v,k);
 }
 // And the button must actually carry both halves. Compared within the single
 // statement that builds it — a distance limit between the two halves would
 // break the first time an attribute was added to the svg.
 const build=js.split('\n').find(l=>l.includes('class="wg"'));
 assert.ok(build,'nothing in console.js builds the workspace mark');
 assert.ok(build.includes('<span class="wt">'),
  'the workspace button drops its label span, so the visible name and the '+
  'accessible name can drift apart or the label can disappear on its own');
});
