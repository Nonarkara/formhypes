// Presentation preferences never enter the building model or its calculations.
import {RATE_SNAPSHOT} from './exchange-rates.js?v=9ac5d16c82';
const PREF_KEY='formHypesPreferences',RATE_KEY='formHypesExchangeRates';
const read=key=>{try{return JSON.parse(localStorage.getItem(key))}catch{return null}};
const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}};
export const DEFAULT_PREFERENCES=Object.freeze({units:'metric',currency:'USD'});
export function validateRateBook(book){
 if(!book||typeof book.source!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(book.date)||!book.rates||book.rates.USD!==1)return false;
 return Object.entries(book.rates).length>1&&Object.entries(book.rates).every(([key,value])=>/^[A-Z]{3}$/.test(key)&&typeof value==='number'&&Number.isFinite(value)&&value>0&&value<1e12);
}
let book=read(RATE_KEY);if(!validateRateBook(book))book=structuredClone(RATE_SNAPSHOT);
const clean=p=>({units:p?.units==='imperial'?'imperial':'metric',currency:typeof p?.currency==='string'&&Object.hasOwn(book.rates,p.currency)?p.currency:'USD'});
let preferences=clean(read(PREF_KEY));
export function getPreferences(){return {...preferences}}
export function getRateBook(){return structuredClone(book)}
export function setPreferences(patch){
 const next={...preferences,...patch};
 if(!['metric','imperial'].includes(next.units)||!Object.hasOwn(book.rates,next.currency))throw Error('Invalid display preference');
 preferences=clean(next);write(PREF_KEY,preferences);return getPreferences();
}
export function resetPreferences(){return setPreferences(DEFAULT_PREFERENCES)}
export async function refreshRates({fetcher=globalThis.fetch}={}){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
 try{
  const response=await fetcher('https://api.frankfurter.dev/v2/rates?base=USD',{signal:controller.signal});
  if(!response.ok)throw Error('Reference rates unavailable');
  const rows=await response.json();
  if(!Array.isArray(rows)||rows.length<2)throw Error('Invalid reference rates');
  const rates={USD:1},dates={};
  for(const row of rows){if(row.base!=='USD'||!/^[A-Z]{3}$/.test(row.quote)||!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||!Number.isFinite(row.rate)||row.rate<=0)throw Error('Invalid reference rate');rates[row.quote]=row.rate;dates[row.quote]=row.date}
  const next={source:'Frankfurter daily reference rates',date:Object.values(dates).sort().at(-1),rates,dates};
  if(!validateRateBook(next)||!Object.hasOwn(rates,preferences.currency))throw Error('Selected currency unavailable');
  book=next;write(RATE_KEY,book);return getRateBook();
 }finally{clearTimeout(timer)}
}
const IMPERIAL={
 'kg/m³':[.028316846592/.45359237,'lb/ft³'],'t/m':[.3048/.90718474,'short tons/ft'],'GN·m²':[1e9/(4448.2216152605*.09290304)/1e6,'10⁶ kip·ft²'],
 'km':[1/1.609344,'mi'],'bar':[14.503773773,'psi'],'W/m²':[.3169983306,'Btu/(h·ft²)'],'m²/p':[1/.09290304,'ft²/p'],'m':[1/.3048,'ft'],'mm':[1/25.4,'in'],'m²':[1/.09290304,'ft²'],'m³':[1/.028316846592,'ft³'],
 'm/s':[1/.3048,'ft/s'],'km/h':[1/1.609344,'mph'],'kg':[1/.45359237,'lb'],'t':[1/.90718474,'short tons'],
 'kPa':[1/6.894757293168,'psi'],'Pa':[1/6894.757293168,'psi'],'MN':[1e6/4448.2216152605,'kip'],'MN·m':[1e6/1355.8179483314,'kip·ft'],
 'kN':[1000/4448.2216152605,'kip'],'kN/m²':[1/6.894757293168,'psi'],
 'L':[1/3.785411784,'US gal'],'L/s':[60/3.785411784,'US gal/min'],'mm/h':[1/25.4,'in/h'],
 'kg/m²':[.09290304/.45359237,'lb/ft²'],'kgCO₂e/m²':[.09290304/.45359237,'lbCO₂e/ft²'],
 'tCO₂e':[1/.90718474,'short tons CO₂e'],'W/m²K':[.1761101838,'Btu/(h·ft²·°F)'],
 'people/m²':[.09290304,'people/ft²'],'m²/person':[1/.09290304,'ft²/person'],
 'L/(s·m²)':[60*.09290304/3.785411784,'US gal/(min·ft²)'],
 'kgCO₂e':[1/.45359237,'lbCO₂e'],'m/s²':[1/.3048,'ft/s²']
};
const alias={'มม.':'mm','毫米':'mm','ลิตร':'L','升':'L','บาร์':'bar','巴':'bar','千帕':'kPa','兆牛':'MN','兆牛·米':'MN·m','ตร.ม./คน':'m²/p','平方米/人':'m²/p','กก./ตร.ม.':'kg/m²','กก.CO₂e/ตร.ม.':'kgCO₂e/m²','ดอลลาร์/ตร.ม.':'USD/m²','ลบ.ม.':'m³','ตันCO₂e':'tCO₂e','千克/平方米':'kg/m²','千克CO₂e/平方米':'kgCO₂e/m²','美元/平方米':'USD/m²','吨':'t','吨CO₂e':'tCO₂e','m2':'m²','m3':'m³','ตร.ม.':'m²','ตร.ม':'m²','ม.':'m','เมตร':'m','米':'m','平方米':'m²','立方米':'m³','ตัน':'t','ม./วินาที':'m/s','米/秒':'m/s','กิโลปาสกาล':'kPa','เมกะนิวตัน':'MN','เมกะนิวตัน·ม.':'MN·m'};
const canonical=u=>alias[u]||u;
function conversion(raw){
 const unit=canonical(raw),imperial=preferences.units==='imperial';
 if(unit==='USD'||unit.startsWith('USD/')){
  const denominator=unit.slice(4),factor=imperial?(IMPERIAL[denominator]?.[0]||1):1;
  return [book.rates[preferences.currency]/factor,preferences.currency+(denominator?'/'+(imperial?IMPERIAL[denominator]?.[1]||denominator:denominator):'')];
 }
 return imperial?(IMPERIAL[unit]||[1,raw]):[1,raw];
}
export const toDisplay=(value,unit)=>value*conversion(unit)[0];
export const fromDisplay=(value,unit)=>value/conversion(unit)[0];
export const unitLabel=unit=>conversion(unit)[1];
export const locale=lang=>lang==='th'?'th-TH':lang==='zh'?'zh-CN':'en-US';
export function formatNumber(value,lang='en',digits=1){return Number.isFinite(value)?new Intl.NumberFormat(locale(lang),{maximumFractionDigits:digits,minimumFractionDigits:digits}).format(value):'—'}
export function quantity(value,unit,lang='en',digits=1){return formatNumber(toDisplay(value,unit),lang,digits)+' '+unitLabel(unit)}
export function formatAmount(value,lang='en',digits=0){const amount=toDisplay(value,'USD');const compact=Math.abs(amount)>=(preferences.currency==='USD'?1e10:1e6);return new Intl.NumberFormat(locale(lang),{maximumFractionDigits:compact?1:digits,notation:compact?'compact':'standard'}).format(amount)}
export function formatMoney(value,lang='en',digits=0){
 return new Intl.NumberFormat(locale(lang),{style:'currency',currency:preferences.currency,currencyDisplay:preferences.currency==='USD'?'symbol':'code',maximumFractionDigits:digits}).format(value*book.rates[preferences.currency]);
}
export const temperatureToDisplay=(value,scale='C')=>scale==='F'?value*9/5+32:value;
export const temperatureFromDisplay=(value,scale='C')=>scale==='F'?(value-32)*5/9:value;
export const temperatureDifference=(value,scale='C')=>scale==='F'?value*9/5:value;
const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const units=[...Object.keys(IMPERIAL),...Object.keys(alias),'USD/m²','USD/m³','USD/kg','USD'].sort((a,b)=>b.length-a.length);
const number='[−+\\-]?\\d[\\d,]*(?:\\.\\d+)?';
const tokens=new RegExp('('+number+'(?:\\s*[–×/]\\s*'+number+')*)\\s*('+units.map(esc).join('|')+')(?![\\p{Script=Latin}\\d_²³/])','gu');
export function displayText(value,lang='en'){
 let text=String(value??'');
 if(/\(SI\)/.test(text))return text;
 if(preferences.units==='metric'&&preferences.currency==='USD')return text;
 text=text.replace(tokens,(all,values,u)=>{
  const [factor,label]=conversion(u);if(factor===1&&label===u)return all;
  return values.replace(new RegExp(number,'g'),n=>formatNumber(Number(n.replace(/,/g,'').replace('−','-'))*factor,lang,/\.\d/.test(n)?Math.min(3,n.split('.')[1].length):1))+' '+label;
 });
 if(preferences.currency!=='USD')text=text.replace(/(USD\s*|US\$|\$)([−+\-]?\d[\d,]*(?:\.\d+)?)/g,(_,prefix,n)=>formatMoney(Number(n.replace(/,/g,'')),lang));
 // Unit-only labels occur in control headings and graph axes.
 if(units.includes(text))return unitLabel(text);
 if(text.includes('='))return text;
 // Callers apply this to presentation labels, not quotations or citations.
 const labels=new RegExp('(?<![\\p{L}\\d_])('+units.map(esc).join('|')+')(?![\\p{L}\\d_²³/])','gu');
 return text.replace(labels,u=>unitLabel(u));
}
export function displaySVG(svg,lang='en'){
 return String(svg).replace(/(<text\b[^>]*>)([^<]*)(<\/text>)/g,(_,open,text,close)=>open+displayText(text,lang)+close);
}
export function displayContext(context,lang='en'){
 if(!context||typeof context.fillText!=='function')return context;
 // Proxy only the text operation; all geometric drawing stays canonical.
 return new Proxy(context,{get(target,key){if(key==='measureText')return text=>target.measureText(displayText(text,typeof lang==='function'?lang():lang));if(key==='fillText')return(text,...args)=>target.fillText(displayText(text,typeof lang==='function'?lang():lang),...args);const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value},set(target,key,value){target[key]=value;return true}});
}
