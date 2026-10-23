import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {moduleFiles,moduleImports,withoutComments,edgeTarget} from '../scripts/release-graph.mjs';

test('release dependencies follow JavaScript syntax rather than quote style or nearby prose',()=>{
 const source=`
  // import './comment.js';
  const prose = "import './string.js'";
  import x from "./double.js";
  import './side-effect.js';
  export {x} from './named.js';
  export * from "../shared.js";
  const deferred=()=>import("./lazy.js");
  const location=import.meta.url;
 `;
 assert.deepEqual(moduleImports(source),['./double.js','./side-effect.js','./named.js','../shared.js','./lazy.js']);
});

test('computed module URLs fail closed instead of silently escaping the release graph',()=>{
 assert.throws(()=>moduleImports('const load=name=>import(name);'),/Computed dynamic import/);
});

test('commented registration names cannot count as hashed modules',()=>{
 const source="const SHARED=['actual.js',/* 'fake.js' */'kept.js']; // 'also-fake.js'\nconst s='// real text';";
 const clean=withoutComments(source);
 assert.ok(clean.includes("'actual.js'"));assert.ok(clean.includes("'kept.js'"));
 assert.ok(clean.includes("'// real text'"));
 assert.ok(!clean.includes('fake.js'));assert.ok(!clean.includes('also-fake.js'));
});

test('release discovery descends into shipped folders and resolves dependencies from their importer',()=>{
 const dir=mkdtempSync(join(tmpdir(),'shdt-module-discovery-'));
 try{
  mkdirSync(join(dir,'vendor'));mkdirSync(join(dir,'.cache'));
  writeFileSync(join(dir,'main.js'),'');writeFileSync(join(dir,'vendor','dep.js'),'');
  writeFileSync(join(dir,'.cache','ignored.js'),'');
  assert.deepEqual(moduleFiles(dir),['main.js','vendor/dep.js']);
  assert.equal(edgeTarget('vendor/main.js','./dep.js?v=abc'),'vendor/dep.js');
  assert.equal(edgeTarget('vendor/main.js','../model.js?v=abc'),'model.js');
  assert.throws(()=>edgeTarget('main.js','../outside.js'),/leaves dist/);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
