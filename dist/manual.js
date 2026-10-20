/* The manual.

   Two jobs, and the second is the reason this file exists.

   1. Print the control table. Every row is read out of schema.js at render
      time — the same table buildRanges() builds the sliders from — so the
      manual cannot drift from the model. A control added to the rail with no
      manual row makes the self-check fail, which is the point.

   2. Check itself against the live page. A manual is only useful if it is
      true, and a manual that describes controls which were renamed in a
      commit is worse than no manual, because it is trusted. So the manual
      asks the document what is actually there and reports the difference.

   Every assertion below corresponds to a way this instrument has actually
   broken. A check that cannot fail is worse than no check, because it
   converts unknown into "verified" — so nothing here is written defensively. */

import {SCHEMA,GROUPS,RELATIVE,ASSUMPTION} from './schema.js?v=fd56569c48';
import {MANUAL} from './manual-text.js?v=e72529eba9';
import {families,profile,defaults} from './model.js?v=4739b9a107';

export const manualSections=lang=>MANUAL[lang].sections;

/* The rail, in the order it is shown. Orientation first on purpose: it is the
   one control that moves the sun, and the reader meets it before the shape. */
export function controlGroups(){
  return [
   {key:'orientationControl',label:1,keys:GROUPS.orientationControl},
   {key:'geometryControls',label:0,keys:GROUPS.geometryControls},
   {key:'constraintControls',label:2,keys:GROUPS.constraintControls},
   {key:'rentControls',label:3,keys:GROUPS.rentControls}];
}

const onRail=k=>Object.values(GROUPS).some(g=>g.includes(k));

/* The table, built rather than written. `kind` is one of assumption / derived /
   relative, and the manual says so per row instead of implying a rent
   assumption is the same kind of claim as a floor count. */
export function controlRows(lang,tt){
  const t=MANUAL[lang].table;
  return controlGroups().flatMap(g=>g.keys.map(id=>{
   const [key,min,max,step,unit]=SCHEMA[id];
   const kind=RELATIVE.has(id)?'relative':ASSUMPTION.has(id)?'assumption':'derived';
   return {id,key,group:g.label,kind,
    range:RELATIVE.has(id)?t.relative:`${min} – ${max}${unit?' '+unit:''}`,
    step:String(step),label:tt(key),readAs:t[kind]};
  }));
}

/* Figures that are always printed. Each is written by app.js on every render
   with no "off" state, so an empty one is a real fault and not a design. */
const ALWAYS_FILLED=['contribution','grossArea','rentable','efficiency','corners',
 'annualRent','yield','distinct','clearHeight','heightTotal','capex','modelName',
 'heightLabel','floorStats'];

/* Anything rendered into a slot the app fills. NaN, undefined and Infinity are
   never a legitimate output in any language, so scanning the whole document for
   them is safe: it cannot produce a false failure, and it catches the class of
   bug where one branch of an if divides by nothing. */
function numericFaults(doc){
  const hits=[];
  for(const el of doc.querySelectorAll('.results *, .console-workspace *, .viewport *, header *')){
   const text=el.textContent;
   // Only leaf-ish nodes: a parent inherits its child's text and would report
   // the same fault once per ancestor, turning one bug into five.
   if(el.children.length)continue;
   if(text&&/(NaN|undefined|Infinity)/.test(text))hits.push(el.id||el.className||el.tagName);
  }
  return hits;
}

export function runSelfCheck(doc,lang,{tt,workspaces,keys,defaults:baseState,builtLabels}){
  const t=MANUAL[lang].checks;
  const state=baseState||defaults;
  const out=[];
  const add=(id,ok,detail)=>out.push({id,label:t.labels[id],ok:!!ok,detail});

  const L=t.words,list=a=>a.join(', ');

  // 1. Every tool opens a drawing. A workspace with no panel renders an empty
  //    right-hand side, and the reader cannot tell that from a bug.
  const noPanel=workspaces.filter(k=>k!=='form'&&!doc.getElementById('workspace-'+k));
  const noTab=workspaces.filter(k=>!doc.getElementById('console-tab-'+k));
  add('workspaces',!noPanel.length&&!noTab.length,
   workspaces.length+' '+L.tools+' · '+(noPanel.length?L.noPanel+' '+list(noPanel):L.everyPanel)+
   (noTab.length?' · '+L.noButton+' '+list(noTab):''));

  // 2. Every tool is named in all three languages. A glyph with no accessible
  //    name is announced as "button" — found on the form atlas, not theorised.
  const unnamed=workspaces.filter(k=>{const b=doc.getElementById('console-tab-'+k);return !b||!b.title});
  add('glyphs',!unnamed.length,
   unnamed.length?L.unnamed+' '+list(unnamed):workspaces.length+' '+L.toolsNamed);

  // 3. Every control is on a rail and carries a label. A control in the model
  //    but in no group would be unreachable, and would still compute.
  //    The label is built at runtime by buildRanges() from the schema key, so
  //    the check asks for the list it actually produced. Scraping static markup
  //    would pass on an empty rail, which is the failure this exists to catch.
  const onNoRail=Object.keys(SCHEMA).filter(k=>!onRail(k));
  const orphanLabels=(builtLabels||[]).filter(k=>!SCHEMA[k]);
  const notBuilt=builtLabels&&builtLabels.length!==Object.keys(SCHEMA).length
   ?Object.keys(SCHEMA).filter(k=>!builtLabels.includes(k)):[];
  const unlabelled=builtLabels?orphanLabels:Object.keys(SCHEMA).filter(k=>{
   const el=doc.getElementById(k);
   return el&&!doc.querySelector(`label[for="${k}"]`)&&!el.getAttribute('aria-label')});
  const parts=[];
  if(onNoRail.length)parts.push(L.onNoRail+' '+list(onNoRail));
  if(notBuilt.length)parts.push(L.notBuilt+' '+list(notBuilt));
  if(unlabelled.length)parts.push(L.unlabelled+' '+list(unlabelled));
  add('controls',!onNoRail.length&&!unlabelled.length&&!notBuilt.length,
   Object.keys(SCHEMA).length+' '+L.controls+' · '+
   (parts.length?parts.join(' · '):L.everyControl));

  // 4. The range the manual prints is the range the input enforces right now.
  //    Both directions count: bounds reaching further than the model allows are
  //    the fault, and so are bounds clamped tighter, because the manual would
  //    then advertise a range the reader cannot reach.
  //    span is exempt on purpose: its live bounds follow the scheme, which is
  //    the one place a manual table would otherwise be wrong.
  const drifted=Object.entries(SCHEMA).filter(([k,[,min,max]])=>{
   if(RELATIVE.has(k))return false;
   const el=doc.getElementById(k);
   if(!el||el.min===''||el.max==='')return false;
   return Number(el.min)!==min||Number(el.max)!==max;
  }).map(([k])=>k);
  add('ranges',!drifted.length,
   drifted.length?L.drifted+' '+list(drifted)
    :Object.keys(SCHEMA).length+' '+L.rangesAgree);

  // 5. Always-printed figures are filled; nothing anywhere prints NaN.
  //    NaN, undefined and Infinity are never legitimate in any language, so
  //    scanning for them cannot produce a false failure — and it catches the
  //    class of bug where one branch of an if divides by nothing.
  const empty=ALWAYS_FILLED.filter(id=>{
   const el=doc.getElementById(id);
   return el&&!String(el.textContent||'').trim()});
  const badNumber=numericFaults(doc);
  add('figures',!empty.length&&!badNumber.length,
   (empty.length?empty.length+' '+L.empty+': '+list(empty):ALWAYS_FILLED.length+' '+L.filled)+
   (badNumber.length?' · '+L.notANumber+': '+list([...new Set(badNumber)].slice(0,6)):' · '+L.noNan));

  // 6. Three languages, one key set. The fallback this catches was real: a
  //    Thai slot once rendered Chinese, and the Thai UI read it back in Chinese.
  const sameKeys=keys.en===keys.th&&keys.th===keys.zh;
  add('i18n',sameKeys,keys.en+' '+L.keysTimes3+(sameKeys?'':' · '+L.keyMismatch));

  // 7. Every form family draws a finite plan. Eleven families; one that throws
  //    takes the atlas down with it, and the atlas is the first thing a reader
  //    touches. profile() really is called here — an empty try block that only
  //    increments a counter would pass on every input.
  const broke=[];
  for(const family of Object.keys(families)){
   try{
    const plan=profile({...state,family},0);
    if(!Array.isArray(plan)||plan.length<3)broke.push(family);
    else if(!plan.every(([x,y])=>Number.isFinite(x)&&Number.isFinite(y)))broke.push(family);
   }catch{broke.push(family)}
  }
  add('forms',!broke.length,
   broke.length?L.notDrawn+' '+list(broke):Object.keys(families).length+' '+L.formsDraw);

  return {checks:out,pass:out.every(c=>c.ok),count:out.length,ok:t.ok,bad:t.bad,
   title:t.title,lede:t.lede,run:t.run,passWord:t.pass,failWord:t.fail};}
