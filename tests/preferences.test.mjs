import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const prefRef=readFileSync(new URL('../dist/core.js',import.meta.url),'utf8').match(/from ['"](.\/preferences.js[^'"]*)['"]/)[1];
const P=await import(new URL('../dist/'+prefRef.replace('./',''),import.meta.url));
const {getPreferences,setPreferences,resetPreferences,toDisplay,fromDisplay,quantity,displayText,refreshRates,getRateBook,validateRateBook}=P;
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(b)),`${a} != ${b}`);

test('metric and imperial display conversions round trip, including compound rates',()=>{
 try{
  setPreferences({units:'imperial',currency:'THB'});
  close(toDisplay(.3048,'m'),1);close(toDisplay(.09290304,'m²'),1);close(toDisplay(.028316846592,'m³'),1);
  close(toDisplay(25.4,'mm'),1);close(toDisplay(6.894757293168,'kPa'),1);
  for(const unit of ['kg/m³','GN·m²','t/m','m','m²','m³','mm','m/s','kg','t','kPa','MN','MN·m','L','L/s','kg/m²','kgCO₂e/m²','W/m²K','people/m²','USD','USD/m²','USD/m³','USD/kg'])close(fromDisplay(toDisplay(17.23,unit),unit),17.23);
  close(toDisplay(100,'USD/m²'),100*getRateBook().rates.THB*.09290304);
  assert.match(quantity(10,'m²','en',1),/107\.6 ft²/);
 }finally{resetPreferences()}
});

test('translated unit tokens convert without corrupting formula identifiers or explicit SI controls',()=>{
 try{
  setPreferences({units:'imperial'});
  for(const [text,label]of [['25.4 มม.','in'],['25.4 毫米','in'],['3.785411784 ลิตร','US gal'],['1 巴','psi'],['100 千帕','psi'],['10 兆牛·米','kip·ft'],['10 ตร.ม.','ft²']])assert.ok(displayText(text).includes(label),text);
  assert.equal(displayText('t_v = 0.91 s · t_s = 7.36 s'),'t_v = 0.91 s · t_s = 7.36 s');
  assert.equal(displayText('Stiffness · GN·m² (SI)'),'Stiffness · GN·m² (SI)');
  assert.match(displayText('40–50 m'),/131\.2–164\.0 ft/);
  for(const unit of ['kgCO₂e/ตร.ม.','kgCO₂e/平方米'])assert.match(displayText('25 '+unit),/^5\.1 lbCO₂e\/ft²$/);
  assert.equal(displayText('1.60 m eye'),'5.25 ft eye');
  assert.match(displayText('100 米处：迎光表面约 800 W/m²。','zh'),/^328\.1 ft处/);
  assert.match(displayText('1,400米追踪范围','zh'),/4,593\.2 ft追踪范围/);
 }finally{resetPreferences()}
});

test('failed or malformed reference-rate refresh preserves both the selected currency and its last rate',async()=>{
 try{
  setPreferences({currency:'CNY'});const before=getRateBook();
  await assert.rejects(refreshRates({fetcher:async()=>({ok:false})}));
  await assert.rejects(refreshRates({fetcher:async()=>({ok:true,json:async()=>[{base:'USD',quote:'CNY',rate:NaN,date:'bad'}]})}));
  assert.deepEqual(getRateBook(),before);assert.equal(getPreferences().currency,'CNY');
  assert.equal(validateRateBook({...before,rates:{USD:1,CNY:-1}}),false);
  assert.throws(()=>setPreferences({currency:'__proto__'}));
 }finally{resetPreferences()}
});

test('temperature conversion distinguishes absolute values from temperature differences',()=>{
 assert.equal(P.temperatureToDisplay(0,'F'),32);assert.equal(P.temperatureToDisplay(100,'F'),212);
 close(P.temperatureFromDisplay(68,'F'),20);assert.equal(P.temperatureDifference(10,'F'),18);
});

test('display preferences survive a module reload and ignore corrupt saved values',async()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),data=new Map();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)}});
 try{
  const url=new URL('../dist/preferences.js',import.meta.url);
  const first=await import(url.href+'?storage-fixture=first');first.setPreferences({units:'imperial',currency:'THB'});
  const reloaded=await import(url.href+'?storage-fixture=second');assert.deepEqual(reloaded.getPreferences(),{units:'imperial',currency:'THB'});
  data.set('formHypesPreferences',JSON.stringify({units:'invalid',currency:'bad'}));
  const repaired=await import(url.href+'?storage-fixture=third');assert.deepEqual(repaired.getPreferences(),{units:'metric',currency:'USD'});
 }finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage}
});

test('alternatives CSV declares converted units and dated currency without changing the candidate',async()=>{
 const app=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
 const ref=app.match(/from ['"](.\/display-exports.js[^'"]*)['"]/)[1];
 const {alternativesCsv}=await import(new URL('../dist/'+ref.replace('./',''),import.meta.url));
 const model=await import(new URL('../dist/model.js',import.meta.url));
 const state={...model.defaults},metrics=model.evaluate(state),row={state,metrics,score:2};
 const original=structuredClone(row);
 try{
  setPreferences({units:'imperial',currency:'THB'});
  const [header,line]=alternativesCsv([row],'facade').split('\n'),keys=header.split(','),values=line.split(',');
  const data=Object.fromEntries(keys.map((key,i)=>[key,values[i]]));
  assert.equal(Number(data.span_ft),Number(toDisplay(state.span,'m').toFixed(4)));
  assert.equal(Number(data.gross_ft2),Number(toDisplay(metrics.gross,'m²').toFixed(2)));
  assert.equal(Number(data.annual_contribution_thb),Number(toDisplay(metrics.contribution,'USD').toFixed(2)));
  assert.equal(Number(data.capex_thb_per_gross_ft2),Number(toDisplay(metrics.capexPerM2,'USD/m²').toFixed(2)));
  assert.equal(data.display_currency,'THB');assert.equal(data.exchange_date,getRateBook().dates.THB);
  assert.deepEqual(row,original);
 }finally{resetPreferences()}
});
