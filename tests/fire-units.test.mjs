import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../dist/model.js';
import {renderFireLab,fireRead,FIRE_TEXT} from '../dist/fire.js';
import {readFileSync} from 'node:fs';
const fireURL=new URL('../dist/fire.js',import.meta.url);
const prefEdge=readFileSync(fireURL,'utf8').match(/from ['"](.\/preferences.js[^'"]*)['"]/)[1];
const {getPreferences,setPreferences}=await import(new URL(prefEdge,fireURL).href);
import {withDom,walk} from './desk-dom.mjs';

test('rendered fire references preserve multipliers, reciprocal width and uncertainty in every imperial language',()=>{
 const old=getPreferences();
 const state={...defaults,program:'custom',floors:12};
 const r=fireRead(state);
 try{
  setPreferences({units:'imperial'});
  for(const lang of ['en','th','zh']){
   const dom=withDom(['fire']),host=dom.hosts.fire;
   try{
    renderFireLab({host,state,lang,active:true});
    assert.ok(host.textContent.length>500,`${lang}: renderer must finish`);
    const hint=id=>{
     const control=walk(host).find(n=>n.id===id);assert.ok(control,`${lang}: ${id}`);
     const node=control.parent.childNodes.find(n=>n.className==='fe-hint');
     assert.ok(node,`${lang}: hint for ${id}`);return node.textContent;
    };
    assert.match(hint('fe-width'),/2 × 0\.49 ft/,'the count of boundary layers stays dimensionless');
    assert.match(hint('fe-width'),/2\.95 ft/,'effective width converts once');
    assert.match(hint('fe-prmSpeed'),/1\.02–1\.08 ft\/s/,'both range endpoints convert');
    assert.match(hint('fe-prmSpeed'),/1\.02 ± 0\.52 ft\/s/,'mean and uncertainty both convert');
    assert.match(hint('fe-tread'),/3\.54 ft\/s/,'speed constant converts');
    assert.match(hint('fe-tread'),/0\.31 .*\(s·ft\)/,'specific flow is per foot, not per metre');
    const label=walk(host).find(n=>n.tagName==='DT'&&n.textContent===FIRE_TEXT[lang].k.pauls);
    assert.ok(label,`${lang}: Pauls row`);
    const value=label.parent.childNodes.find(n=>n.tagName==='DD').textContent;
    assert.ok(value.includes(Math.round(r.paulsP).toLocaleString(lang==='th'?'th-TH':lang==='zh'?'zh-CN':'en-US')));
    assert.ok(value.includes('(SI)'),'Pauls density retains its canonical SI formula unit');
    assert.doesNotMatch(value,/ft/);
    assert.doesNotMatch(host.textContent,/\{(?:boundary|lengthUnit|speedUnit|mean|sd|lo|hi|about)\}/);
   }finally{dom.restore()}
  }
 }finally{setPreferences(old)}
});
