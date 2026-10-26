import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {controlFitFailures} from '../scripts/control-fit.mjs';

const fixture=()=>['en','th','zh'].flatMap(lang=>[390,1024,1440].flatMap(width=>['wind','lifts','fire','carbon'].map(key=>({
 lang,width,key,coarse:false,docOverflow:false,groups:({wind:[4],lifts:[3,2,2,2,2],fire:[3,4,3,3],carbon:[2,3,3]})[key].map(count=>({selected:1,buttons:Array.from({length:count},()=>({text:'On',width:37,height:32,textWidth:15,textHeight:17,padding:20,border:2,font:12,clipped:false}))}))
}))));

test('control receipt rejects stretched boxes, clipped words and lost selected state',()=>{
 const good=fixture();assert.deepEqual(controlFitFailures(good),[]);
 for(const patch of [{width:175},{clipped:true},{font:10},{height:44},{border:NaN},{width:0,textWidth:0,textHeight:0,text:''},{clipped:undefined}]){
  const bad=fixture();Object.assign(bad[0].groups[0].buttons[0],patch);
  assert.ok(controlFitFailures(bad).length,JSON.stringify(patch));
 }
 const touch=fixture();touch[0].coarse=true;touch[0].groups[0].buttons[0].height=28;assert.ok(controlFitFailures(touch).length);
 const pointer=fixture();delete pointer[0].coarse;assert.ok(controlFitFailures(pointer).length);
 const bad=fixture();bad[0].groups[0].selected=0;assert.ok(controlFitFailures(bad).length);
 const incomplete=fixture();delete incomplete[0].docOverflow;assert.ok(controlFitFailures(incomplete).length);
 const missing=fixture();missing[1].groups.pop();assert.ok(controlFitFailures(missing).length);
 assert.ok(controlFitFailures(good.filter(s=>s.lang!=='th')).length,'a subset cannot certify the matrix');
});

// A source-level regression guard supplements the browser receipt. It does
// not claim to render CSS: a separate measured mutation is required to prove the layout.
test('dense lab choices retain their intrinsic widths and touch-sized content',()=>{
 for(const [name,prefix]of [['wind','wl'],['lifts','lt'],['fire','fe'],['carbon','cb']]){
  const css=readFileSync(new URL(`../dist/${name}.css`,import.meta.url),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
  const rules=[...css.matchAll(new RegExp(`\\.${prefix}-seg button\\{([^}]*)\\}`,'g'))].map(m=>m[1]);
  const sizing=rules.find(r=>r.includes('flex:'));
  assert.match(sizing,/flex:\s*0\s+1\s+auto/);assert.match(sizing,/max-width:\s*100%/);
  assert.ok(rules.some(r=>/min-height:\s*32px/.test(r)),`${name}: dense touch target drifted`);
 }
});
