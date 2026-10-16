// Stamps a content-derived version onto every asset reference in dist/.
//
// Why: Cloudflare Pages serves index.html with `max-age=0, must-revalidate`
// but every asset with `max-age=14400`. Without a version token a returning
// visitor revalidates the HTML, gets the new shell, and then serves four-hour-old
// JS from their own cache — new markup driving old code. The query string makes
// the asset URL change whenever the bytes change, so the freshness window stops
// being load-bearing.
//
// How the id is derived: each file's id is the sha256 of its own bytes, taken
// BEFORE that file is rewritten. The dependency chain is
//
//     index.html       ->  app.js, style.css, knowledge/*
//     app.js           ->  model.js, i18n.js, research.js, knowledge/*
//     model.js         ->  geometry.js
//     research.js      ->  research/media/*
//
// which has no cycle, so no id can depend on its own output. Running this twice
// on an unchanged tree rewrites identical bytes and reports identical ids.

import {createHash} from 'node:crypto';
import {researchProtocol} from '../dist/research-reader.js';
import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

const read = async f => (await readFile(join(DIST, f))).toString('utf8');
const write = (f, s) => writeFile(join(DIST, f), s, 'utf8');
const sha = b => createHash('sha256').update(b).digest('hex').slice(0, 10);
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Rewrites `ref` and any already-stamped `ref?v=…` to `ref?v=<id>`, so a second
// run over an already-stamped tree is a no-op rather than a second token. The
// consumed tail is "anything that isn't a quote or bracket" so a token written
// by an earlier buggy run is cleaned up rather than compounded.
const stamp = (src, refs, ids) => refs.reduce(
  (acc, ref) => acc.replace(
    new RegExp(`${esc(ref)}(\\?v=[^"'\\s)]*)?`, 'g'),
    `${ref}?v=${ids[ref.replace(/^\.\//, '')]}`),
  src);

const SHARED = ['console.css','modulor.js','model.js', 'geometry.js', 'solar.js', 'vendor/suncalc.js', 'vendor/SUNCALC-LICENSE.txt', 'i18n.js', 'style.css', 'play.js', 'location.js',
  'knowledge/designon-knowledge.json', 'knowledge/DESIGNON-LICENSE.txt'];
// The photographs are referenced from research.js, so they are stamped there
// first and research.js is hashed afterwards — otherwise app.js would pin an id
// for a research.js that then changed underneath it.
const MEDIA = ['research/artifacts/ags-anchorage-2436.png','research/media/office-2023.jpg', 'research/media/house-2006.jpg',
  'research/media/lab-0506.jpg', 'research/media/lab-0507.jpg',
  'research/media/lab-0508.jpg', 'research/artifacts/chen-fig34.png',
  'research/artifacts/chen-fig36.png', 'research/artifacts/chen-fig76-detail.png', 'research/artifacts/chen-fig38.png',
  'research/artifacts/chen-fig40.png', 'research/artifacts/chen-fig49.png',
  'research/protocol-en.txt','research/protocol-th.txt','research/protocol-zh.txt'];
const DESKS=['facade.js','brief.js','walk.js','context.js'];
const IN_APP = ['./console.js','./modulor.js','./research-reader.js','./brief.js','./walk.js','./context.js', './reader.js', './play.js', './location.js', './solar.js', './model.js', './geometry.js', './i18n.js', './research.js', 'knowledge/designon-knowledge.json'];
const IN_HTML = ['console.css','style.css', 'app.js', 'knowledge/designon-knowledge.json', 'knowledge/DESIGNON-LICENSE.txt'];

for(const lang of ['en','th','zh'])await write(`research/protocol-${lang}.txt`,researchProtocol(lang));
const ids = {};
// Hash raw bytes: a UTF-8 decode of a PNG/JPG collapses invalid runs to U+FFFD,
// so some image edits would keep the same stamp.
for (const f of [...SHARED, ...MEDIA]) ids[f] = sha(await readFile(join(DIST, f)));

const solar = stamp(await read('solar.js'), ['./vendor/suncalc.js'], ids);
await write('solar.js', solar);ids['solar.js']=sha(solar);
const model = stamp(await read('model.js'), ['./geometry.js','./solar.js'], ids);
await write('model.js', model);ids['model.js']=sha(model);

for(const f of DESKS){const src=stamp(await read(f), ['./modulor.js','./model.js','./solar.js','./geometry.js',...MEDIA], ids);await write(f,src);ids[f]=sha(src)}

const consoleSrc=stamp(await read('console.js'), ['./facade.js','./model.js'],ids);
await write('console.js',consoleSrc);ids['console.js']=sha(consoleSrc);

const research = stamp(await read('research.js'), MEDIA, ids);
await write('research.js', research);
ids['research.js'] = sha(research);

const content = stamp(await read('reader-content.js'), [...MEDIA, 'knowledge/designon-knowledge.json'], ids);
await write('reader-content.js', content);ids['reader-content.js']=sha(content);
const reader = stamp(await read('reader.js'), ['./reader-content.js'], ids);
await write('reader.js', reader);ids['reader.js']=sha(reader);

const tracks=stamp(await read('research-tracks.js'), ['./reader-content.js',...MEDIA], ids);
await write('research-tracks.js',tracks);ids['research-tracks.js']=sha(tracks);
const guided=stamp(await read('research-reader.js'), ['./research-tracks.js','./reader.js','./model.js'], ids);
await write('research-reader.js',guided);ids['research-reader.js']=sha(guided);

// app.js is stamped against its imports, then hashed in its rewritten form so
// index.html points at the bytes that actually ship.
const app = stamp(await read('app.js'), IN_APP, ids);
await write('app.js', app);
ids['app.js'] = sha(app);

await write('index.html', stamp(await read('index.html'), IN_HTML, ids));

console.log(`release-id: stamped ${SHARED.length + MEDIA.length + 2} assets`);
for (const [f, id] of Object.entries(ids)) console.log(`  ${f.padEnd(40)} ${id}`);