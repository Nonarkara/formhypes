import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WORKSPACES} from '../dist/console.js';
import {READER} from '../dist/reader-content.js';

const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const guide=read('EXTENDING.md');
const release=read('scripts/release-id.mjs');
const drafting=read('dist/drafting.js');

/* A guide is only worth having if it is true. Every claim in it that CAN go
   stale — the workspace list, the release graph, the language list, the
   drawing vocabulary — is checked against the code it describes here, so the
   guide cannot quietly describe a system that no longer exists.

   This is the shiftability deliverable with teeth: a system nobody can safely
   change is not a shiftable one. */

test('the extending guide names every workspace that actually exists',()=>{
 // Sixteen workspaces today. If one is added and the guide is not updated, the
 // guide is telling the next person to edit six files when it is seven.
 for(const w of WORKSPACES)
  assert.ok(guide.includes(w),`the guide does not mention the "${w}" workspace`);
 assert.equal(WORKSPACES.length,16,'the workspace count moved; update the guide and this guard together');
});

test('the extending guide names every module in the release graph',()=>{
 // The DESKS list is the set of files the stamper treats as desks. A module in
 // it that the guide does not mention is a module nobody knows how to touch.
 const m=/const DESKS=\[([^\]]*)\]/.exec(release);
 assert.ok(m,'the release graph has no DESKS list');
 const desks=m[1].split(',').map(s=>s.trim().replace(/^'|'$/g,'')).filter(Boolean);
 assert.ok(desks.length>=13);
 for(const d of desks)
  assert.ok(guide.includes(d),`the guide does not mention ${d}, which is in the release graph`);
 // And the other lists, because the guide tells people which list to put a file in.
 assert.ok(/DESKS/.test(guide)&&/SHARED/.test(guide),'the guide must say which release list is which');
 assert.ok(/IN_APP/.test(guide),'the guide must mention IN_APP');
});

test('the extending guide lists exactly the languages the system actually has',()=>{
 const langs=Object.keys(READER);
 assert.deepEqual(langs,['en','th','zh']);
 const line=guide.split('\n').find(l=>/exactly three keys/i.test(l));
 assert.ok(line,'the guide no longer states the language rule');
 for(const l of langs)
  assert.ok(line.includes('`'+l+'`'),`the guide does not name ${l} as a language`);
 // The three rules that actually break the build, in the guide.
 assert.ok(/CJK/.test(guide),'the guide must state the CJK rule');
 assert.ok(/Sarabun/.test(guide),'the guide must state the Thai font ban');
 assert.ok(/IBM Plex Sans Thai/.test(guide),'the guide must name the Thai face');
 assert.ok(/PROPER_NOUN/.test(guide),'the guide must name the Chinese allowlist');
});

test('the extending guide names every primitive the drawing vocabulary exports',()=>{
 // A guide that lists a vocabulary that has since been renamed is worse than no
 // guide: it sends the next person to import a function that does not exist.
 //
 // The comparison is a SET EQUALITY in both directions, not a membership test.
 // Checking only that every export is mentioned passes a guide that also
 // mentions a name which no longer exists -- and that is exactly the case
 // worth catching, because it is the one that produces an import error.
 const names=[...drafting.matchAll(/export (?:function|const) ([A-Za-z_][A-Za-z0-9_]*)/g)].map(m=>m[1]);
 assert.ok(names.length>=10,'the drafting vocabulary is smaller than the guide claims');
 // The list is markdown, so it wraps across lines. Read the whole paragraph.
 const lines=guide.split('\n');
 const at=lines.findIndex(l=>/The exports, in full/.test(l));
 assert.ok(at>=0,'the guide no longer carries the vocabulary list');
 let para=lines[at];
 for(let i=at+1;i<lines.length&&lines[i].trim()&&!/^\s*[-*]/.test(lines[i]);i++)para+=' '+lines[i];
 const listed=para.replace(/.*?:/,'').match(/`([A-Za-z_][A-Za-z0-9_]*)`/g).map(s=>s.replace(/`/g,''));
 for(const n of names)
  assert.ok(listed.includes(n),`the guide's vocabulary list omits "${n}", which drafting.js still exports`);
 for(const n of listed)
  assert.ok(names.includes(n),`the guide lists "${n}", which drafting.js no longer exports`);
});

test('the extending guide gives the commands in the order they must run',()=>{
 // Stamp, test, deploy, push. The stamper must come first or the site serves
 // stale bytes; the push must come last because the deployer does not push.
 const at=s=>{const i=guide.indexOf(s);assert.ok(i>=0,`the guide does not mention ${s}`);return i};
 const stamp=at('node scripts/release-id.mjs'),test=at('npm test'),
       deploy=at('node scripts/deploy.mjs'),push=at('git push origin main');
 assert.ok(stamp<test&&test<deploy&&deploy<push,'the guide lists the commands in the wrong order');
 // And it says the two things people get wrong.
 assert.ok(/does NOT push|does not push/i.test(guide),'the guide must say that deploy does not push');
 assert.ok(/dirty/i.test(guide),'the guide must say the deployer refuses a dirty tree');
 // A hard-coded test-file count is a claim that starts rotting the moment
 // somebody adds a test file, and nobody notices until it is wrong.
 assert.doesNotMatch(guide,/\d+\s+test files?/,'the guide states a test-file count that will go stale');
});

test('the extending guide keeps the traps that have actually bitten',()=>{
 // Each of these is a real incident, not a hypothetical. A guide that drops
 // them is how they happen again.
 for(const t of ['heredoc','stamp','dirty','PNG','Sarabun'])
  assert.ok(new RegExp(t,'i').test(guide),`the guide has dropped the "${t}" trap`);
});
