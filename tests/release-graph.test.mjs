/* The release graph.

   The stamp exists so a changed byte moves a version token. That apparatus
   only works if two things are true, and neither is true by accident:

     1. every module that ships is hashed by the stamper, so its bytes can
        move a token at all;
     2. every import edge carries a token, so a changed dependency cannot
        hide behind an unchanged importer.

   A module that shipped without being hashed would change without moving any
   stamp. An import edge without a token would let the browser serve a cached
   importer against a fresh dependency — new markup driving old code, which is
   the exact failure the stamp was built to stop.

   The guard reads the stamper and the emitted tree, and computes both
   properties from them. It does not trust a list of names. */

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {moduleFiles,moduleImports,withoutComments,edgeTarget} from '../scripts/release-graph.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const DIST = join(ROOT, 'dist');
const stamper = withoutComments(readFileSync(join(ROOT, 'scripts/release-id.mjs'), 'utf8'));
const modules = moduleFiles(DIST);

const literal = name => {
  const at = stamper.search(new RegExp(`const\\s+${name}\\s*=\\s*\\[`));
  assert.ok(at >= 0, `the stamper has no ${name} list`);
  const from = stamper.indexOf('[', at);
  let depth = 0, end = -1;
  for (let i = from; i < stamper.length; i++) {
    if (stamper[i] === '[') depth++;
    else if (stamper[i] === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  return [...stamper.slice(from + 1, end).matchAll(/'([^']+)'/g)].map(m => m[1]);
};

test('every module that ships is hashed by the stamper', () => {
  const hashed = new Set([...literal('SHARED'), ...literal('MEDIA'), ...literal('DESKS')]);
  for (const m of stamper.matchAll(/stamp\(await read\('([^']+)'/g)) hashed.add(m[1]);
  const missing = modules.filter(f => !hashed.has(f));
  assert.deepEqual(missing, [],
    `these modules ship but the stamper never hashes them, so their bytes cannot move a version token:\n${missing.join('\n')}`);
});

test('every import edge carries a version token, and points at a file that exists', () => {
  const edges = [];
  for (const f of modules) {
    const src = readFileSync(join(DIST, f), 'utf8');
    for (const ref of moduleImports(src)) edges.push({from: f, ref});
  }
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const ref = m[1];
    if (ref.startsWith('http') || ref.startsWith('#') || ref.startsWith('data:')) continue;
    edges.push({from: 'index.html', ref});
  }
  assert.ok(edges.length > 100, 'the edge count collapsed — the reader is probably not finding them');
  const bare = edges.filter(e => !/\?v=[0-9a-f]{6,}/.test(e.ref))
    .map(e => `${e.from} -> ${e.ref}`);
  assert.deepEqual(bare, [],
    `these edges carry no version token, so a changed dependency can hide behind an unchanged importer:\n${bare.join('\n')}`);
  const dangling = [...new Set(edges.map(e => edgeTarget(e.from,e.ref)))]
    .filter(t => !existsSync(join(DIST, t)));
  assert.deepEqual(dangling, [], `these edges point at files that are not there:\n${dangling.join('\n')}`);
});

test('the stamper covers every edge of every module it stamps', () => {
  // This is the law the graph exists to enforce: a new import must enter the
  // release graph. A module the stamper hashes but never stamps against may
  // not import anything at all, because nothing would put a token on that
  // edge — and an edge without a token is a stale-cache hole waiting for the
  // next edit.
  const perModule = new Map();
  for (const m of stamper.matchAll(/stamp\(await read\('([^']+)'\),\s*\[([^\]]*)\]/g))
    perModule.set(m[1], [...m[2].matchAll(/'([^']+)'/g)].map(x => x[1].replace(/^\.\//, '')));
  // The desk loop, the environment trio, the research module and the shell
  // are stamped against named lists rather than literals.
  const desks = /for\(const f of DESKS\)\{const src=stamp\(await read\(f\),\s*\[([^\]]*)\]/.exec(stamper);
  assert.ok(desks, 'the desk stamping loop moved');
  const deskRefs = [...desks[1].matchAll(/'([^']+)'/g)].map(x => x[1].replace(/^\.\//, ''));
  for (const f of literal('DESKS')) perModule.set(f, deskRefs);
  const trio = /for\(const f of \['environment\.js','environment-desk\.js','decisions\.js'\]\)\{const src=stamp\(await read\(f\),\s*\[([^\]]*)\]/.exec(stamper);
  assert.ok(trio, 'the environment stamping loop moved');
  const trioRefs = [...trio[1].matchAll(/'([^']+)'/g)].map(x => x[1].replace(/^\.\//, ''));
  for (const f of ['environment.js', 'environment-desk.js', 'decisions.js']) perModule.set(f, trioRefs);
  perModule.set('research.js', literal('MEDIA').map(x => x.replace(/^\.\//, '')));
  perModule.set('app.js', literal('IN_APP').map(x => x.replace(/^\.\//, '')));
  perModule.set('index.html', literal('IN_HTML').map(x => x.replace(/^\.\//, '')));

  const uncovered = [], orphanImports = [];
  for (const f of modules) {
    const src = readFileSync(join(DIST, f), 'utf8');
    const imports = moduleImports(src).map(ref=>ref.split('?')[0].replace(/^\.\//, ''));
    const list = perModule.get(f);
    if (!list) {
      if (imports.length) orphanImports.push(`${f} imports ${imports.join(', ')} but the stamper never stamps it`);
      continue;
    }
    for (const imp of imports) {
      if (!list.includes(imp)) uncovered.push(`${f} -> ${imp}`);
    }
  }
  assert.deepEqual(orphanImports, [],
    `these modules import something but the stamper never stamps them:\n${orphanImports.join('\n')}`);
  assert.deepEqual(uncovered, [],
    `these import edges are not in the stamper's list for the module that owns them:\n${uncovered.join('\n')}`);
});

test('the stamp is content-derived: every token is the hash of the bytes it points at', () => {
  // A hand-written token rots the moment either file is edited. The stamper
  // derives each token from the bytes it ships, so a token that does not
  // match its file is a token somebody typed.
  const sha = b => createHash('sha256').update(b).digest('hex').slice(0, 10);
  const edges = [];
  for (const f of modules) {
    const src = readFileSync(join(DIST, f), 'utf8');
    for (const ref of moduleImports(src)) edges.push({from: f, ref});
  }
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const ref = m[1];
    if (ref.startsWith('http') || ref.startsWith('#') || ref.startsWith('data:')) continue;
    edges.push({from: 'index.html', ref});
  }
  const wrong = [];
  for (const e of edges) {
    const [file, raw] = e.ref.split('?');
    const token = (raw || '').replace(/^v=/, '');
    const target = join(DIST, edgeTarget(e.from,e.ref));
    if (!existsSync(target)) continue;
    const actual = sha(readFileSync(target));
    if (token !== actual) wrong.push(`${e.from} -> ${e.ref} (the bytes hash to ${actual})`);
  }
  assert.ok(edges.length > 100, 'the edge count collapsed — the reader is probably not finding them');
  assert.deepEqual(wrong, [],
    `a version token does not match the bytes it points at. Stamp the tree before testing it —\nnode scripts/release-id.mjs\n${wrong.join('\n')}`);
});
