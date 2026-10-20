import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {families,defaults} from '../dist/model.js';
import {WORKSPACES} from '../dist/console.js';
import {ASSEMBLY_TEXT,INDEX_GROUPS,towerLines,towerSVG,planSVG} from '../dist/assembly.js';
import {entryTab} from '../dist/research-reader.js';

test('the bare address opens the manual; every deep link skips it',()=>{
 assert.equal(entryTab('',''),'manual');
 assert.equal(entryTab('','#manual'),'manual');
 assert.equal(entryTab('','#research'),'research');
 assert.equal(entryTab('','#studio'),'studio');
 assert.equal(entryTab('?regime=yield&objective=contribution',''),'studio');
 assert.equal(entryTab('?reading=value',''),'research');
 assert.equal(entryTab('','#ws-wind'),'studio');
 assert.equal(entryTab('?utm_source=line&fbclid=x',''),'manual','tracking parameters still land on the manual');
});

test('the index lists every studio workspace exactly once',()=>{
 const listed=INDEX_GROUPS.flatMap(([,k])=>k);
 assert.deepEqual([...listed].sort(),[...WORKSPACES].sort());
 assert.equal(new Set(listed).size,listed.length);
});

test('the manual draws every plan family with the model, with finite coordinates',()=>{
 for(const family of Object.keys(families))for(const floors of [12,48,70]){
  const s={...defaults,family,floors,twist:60,taper:.8},L=towerLines(s);
  assert.ok(L.edges.length>0&&L.top.length>2,family);
  for(const seg of [...L.floors,...L.edges,...L.top])for(const [x,y]of seg)assert.ok(Number.isFinite(x)&&Number.isFinite(y));
  assert.ok(!/NaN|undefined/.test(towerSVG(s)+planSVG(s,{core:true})),family);
 }
});

test('manual text exists in all three languages with the same keys and eight steps',()=>{
 const keys=o=>Object.entries(o).flatMap(([k,v])=>v&&typeof v==='object'&&!Array.isArray(v)?keys(v).map(x=>k+'.'+x):[k]).sort();
 for(const l of ['th','zh'])assert.deepEqual(keys(ASSEMBLY_TEXT[l]),keys(ASSEMBLY_TEXT.en));
 for(const l of ['en','th','zh'])assert.equal(ASSEMBLY_TEXT[l].steps.length,8);
 assert.ok(!/ฉัน|เรา|ข้าพเจ้า/.test(JSON.stringify(ASSEMBLY_TEXT.th)),'no first person in Thai');
});

test('the manual keeps the house law: CSS in a file, one accent, no radius, shadow or gradient',()=>{
 const js=readFileSync(new URL('../dist/assembly.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../dist/assembly.css',import.meta.url),'utf8');
 assert.ok(!/style="|createElement\(['"]style/.test(js),'no inline styles under the CSP');
 assert.ok(!/border-radius:\s*[1-9]|box-shadow|gradient\(/.test(css));
 assert.equal((css.match(/var\(--accent\)/g)||[]).length,1,'amber appears once: the enter button');
 assert.match(readFileSync(new URL('../dist/index.html',import.meta.url),'utf8'),/<section id="assembly"/);
});

test('every module in dist parses: a duplicate declaration cannot ship green',async()=>{
 const {execFileSync}=await import('node:child_process');const {readdirSync}=await import('node:fs');
 for(const f of readdirSync(new URL('../dist/',import.meta.url)).filter(f=>f.endsWith('.js'))){
  try{execFileSync(process.execPath,['--check',new URL('../dist/'+f,import.meta.url).pathname],{stdio:'pipe'})}
  catch(e){assert.fail(f+': '+String(e.stderr||e.message).split('\n').slice(0,5).join(' '))}
 }
});
