import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const url=new URL('../dist/preferences.js',import.meta.url);
const P=await import(url);
const fixture=()=>({source:'Reference fixture',date:'2026-10-24',rates:{USD:1,CNY:7,THB:34},dates:{CNY:'2026-10-24',THB:'2026-10-23'}});

test('rate dates must be real calendar dates and provenance must describe the quoted currency',()=>{
 for(const date of ['2026-02-30','2026-99-99','2026-1-01','not-a-date',null])assert.equal(P.validateRateBook({...fixture(),date}),false,String(date));
 for(const dates of [[],null,{CNY:'2026-02-30'},{CNY:'2026-10-25'},{EUR:'2026-10-24'}])assert.equal(P.validateRateBook({...fixture(),dates}),false);
 assert.equal(P.validateRateBook({...fixture(),source:'   '}),false);
 assert.equal(P.validateRateBook(fixture()),true);
 assert.equal(P.validateRateBook({...fixture(),date:'2024-02-29',dates:{CNY:'2024-02-29'}}),true);
 assert.equal(P.validateRateBook({...fixture(),rates:[]}),false);
});

test('successful refresh replaces rates and provenance together; malformed followups leave both untouched',async()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),saved=new Map();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)}});
 try{
  const fresh=await import(url.href+'?boundary-refresh');fresh.setPreferences({currency:'CNY'});
  const rows=[{base:'USD',quote:'CNY',rate:7,date:'2026-10-24'},{base:'USD',quote:'THB',rate:34,date:'2026-10-23'}];
  await fresh.refreshRates({fetcher:async()=>({ok:true,json:async()=>rows})});
  assert.equal(fresh.toDisplay(10,'USD'),70);assert.equal(fresh.getRateBook().dates.CNY,'2026-10-24');
  const before=fresh.getRateBook(),stored=saved.get('formHypesExchangeRates');
  for(const bad of [[null,rows[1]],[{...rows[0],date:'2026-02-30'},rows[1]],[rows[0],{...rows[0],rate:8}], [{...rows[0],rate:Infinity},rows[1]]]){
   await assert.rejects(fresh.refreshRates({fetcher:async()=>({ok:true,json:async()=>bad})}));
   assert.deepEqual(fresh.getRateBook(),before);assert.equal(saved.get('formHypesExchangeRates'),stored);assert.equal(fresh.getPreferences().currency,'CNY');
  }
  const reloaded=await import(url.href+'?boundary-refresh-reloaded');assert.equal(reloaded.toDisplay(10,'USD'),70);assert.deepEqual(reloaded.getRateBook(),before);
 }finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage}
});

test('a malformed saved rate book falls back before it reaches Settings and money formatting',async()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>key==='formHypesExchangeRates'?JSON.stringify({...fixture(),dates:[]}):JSON.stringify({units:'imperial',currency:'CNY'}),setItem(){}}});
 try{
  const fresh=await import(url.href+'?boundary-corrupt-startup');
  assert.equal(fresh.getRateBook().source,'Frankfurter daily reference rates');
  assert.ok(Number.isFinite(fresh.toDisplay(10,'USD')));assert.equal(fresh.getPreferences().units,'imperial');
 }finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage}
});
