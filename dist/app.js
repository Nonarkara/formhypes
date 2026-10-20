import {DECISION_I18N,renderDecision,cleanStudyName,cleanStudyNote,parseStudyPackage} from './decisions.js?v=b4aa051593';
import {ENV_I18N,renderEnvironment} from './environment-desk.js?v=dd10822a6f';
import {getEnvironmentStudy,restoreEnvironmentStudy,validateEnvironment,visibleWall} from './environment.js?v=85e0177a9d';
import {renderAssembly} from './assembly.js?v=b0d86f34a7';
import {renderStructure} from './structure.js?v=5b4dff40fe';
import {mountConsole} from './console.js?v=9e3f98c612';
import {modulorPath} from './modulor.js?v=3431f62913';
// FormHypes — controller
import{defaults,families,profile,area,perimeter,cornerZones,evaluate,objectives,searchPlan,scoreCandidate,rank,rerank,baseline,meshOBJ,stack,levelPrograms,facadeFamilies,systems,regimes,distinctiveness,columnDensity,isConvex,RUB_INNER_RATIO,glazingSchedule,stackHeight,objectiveInert}from'./model.js?v=4739b9a107';
import{familyResponse,lattice}from'./explore.js?v=74ce85cc3a';
import{t,langs,langMeta,translator}from'./i18n.js?v=27230efac0';
import{SECTIONS,MOVED,REGIME_ORDER,PREMIUM_LABELS,RESEARCH_T}from'./research.js?v=ff3c45bc79';

import {MATERIALS,MATERIAL_KEYS,materialOf,surfacePattern} from './materials.js?v=be1c7d7582';
import {CROWNS,CROWNS_KEYS,GARDENS,GARDENS_KEYS,crownOf,gardenOf,crownPlates} from './crowns.js?v=6daba4a8ca';
import {cityData,skyline,visibleMassings,ringArea,splitByPlot} from './cityscape.js?v=dcc15cb0df';
import {sweptHull,reachSteps,reachLabelled,contactOffset} from './reach.js?v=3742398937';
import {parseGround} from './site.js?v=7cb1769785';
import {GROUND,GROUND_ROAD_M} from './ground.data.js?v=f889d5bab6';
import {DETAILS,DETAIL_KEYS,detailOf,detailSVG,detailSpec,DETAIL_BASIS} from './details.js?v=9b027e20b8';
import {coreOf,coreSVG,CORE_SRC,motionOff} from './core.js?v=7612d67571';
import {coreScene} from './core3d.js?v=702aed5396';
import {renderLocation,getLocationStudy} from './location.js?v=d7f98850a2';
import {renderPlay,getFengStudy as getFengPlayStudy} from './play.js?v=578d890470';
import {renderReader,entryTab,resolveRegimeQuery} from './research-reader.js?v=57c3bbc32a';

// The three desks added in 2026 after Chapter 6.2. Each is a self-contained
// module that injects its own prefixed CSS, so nothing here owns their styling.
import {BRIEF_I18N, renderBrief,getBriefStudy,setBriefInputs,resetBrief,restoreBriefInputs} from './brief.js?v=f50bd7649b';
import {WALK_I18N, renderWalk,getWalkStudy} from './walk.js?v=01cf6c9f9f';
import {FENG_I18N, renderFeng,getFengStudy} from './feng.js?v=e7627211f7';
import {CONTEXT_I18N, SITE_I18N, renderContext, renderSite} from './context.js?v=515365175f';

import {cities,solarDefaults,solarPosition,validSolar} from './solar.js?v=9279efc6dc';
import {SCHEMA as schema,GROUPS as groups} from './schema.js?v=fd56569c48';
import {splitOf,splitSVG,AREA_SPLIT,KEYS} from './areasplit.js?v=7506bcd419';
import {MANUAL} from './manual-text.js?v=e72529eba9';
import {manualSections,controlRows,controlGroups,runSelfCheck} from './manual.js?v=46436947b4';
import {WORKSPACES} from './console.js?v=9e3f98c612';
const $=id=>document.getElementById(id);
let lang='en',tt=translator('en'),consoleUI;
const money=v=>new Intl.NumberFormat(lang==='th'?'th-TH':lang==='zh'?'zh-CN':'en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v);
const num=v=>Math.round(v).toLocaleString(lang==='th'?'th-TH':lang==='zh'?'zh-CN':'en-US');

let state={...defaults},metrics,alternatives=[],yaw=-.65,zoom=1,wireframe=false,neighbourhood=false,view='orbit',panX=0,panY=0,studies=[],knowledgePack,unknownRegime=null;

/* The core view runs its own clock and its own zoom, and both are separate from
   the orbit's for the same reason the camera is: a zoom range that can reach the
   top of a 600 m column does not belong on a zoom range that has to keep a whole
   building legible. The loop runs only while the core view is on screen —
   a requestAnimationFrame that never stops is a battery, and a battery that is
   running to animate something nobody is looking at. */
let coreZoom=1,coreRAF=0,coreClock=0,corePan=0;
const coreStart=()=>coreClock||(coreClock=performance.now());
const coreT=()=>motionOff()?0:(performance.now()-coreStart())/1000;
/* How much of the core's height the sheet is actually showing, in metres. The
   projection lifts a metre by 0.96 of a scale unit, so the field divided by
   scale is not the answer and using it put the locator window a few per cent
   high on every drawing. */
const coreVisibleM=(scale,fieldH)=>fieldH/(scale*0.96);

/* Storeys that are actually let. The escalator bank is sized on the podium's
   share of the population, and the podium's share has to come from a per-floor
   area — see escalatorDesign(). A mechanical or transfer level carries nobody,
   so counting them would size the bank on floors that have no people on them. */
const occupiedOf=s=>stack(s).filter(l=>l.gfa).length||s.floors;

function coreLoop(){
 if(view!=='core'){coreRAF=0;return}
 coreRAF=requestAnimationFrame(coreLoop);
 drawTower();
}
function startCoreLoop(){if(!coreRAF)coreRAF=requestAnimationFrame(coreLoop)}
function stopCoreLoop(){if(coreRAF){cancelAnimationFrame(coreRAF);coreRAF=0}coreClock=0}
// The run is kept, not just its rows, so a language change can redraw the
// result in place instead of leaving the table in whichever language the
// search happened to be launched in.
let searchRun=null,exploreFamily=null;
const groundCache=new Map();
function groundOf(city){
 if(groundCache.has(city))return groundCache.get(city);
 const g=parseGround(city,GROUND,GROUND_ROAD_M);
 groundCache.set(city,g||null);return g;
}

let drawn={w:0,h:0},pendingRaf=false;

// [i18n key, min, max, step, unit] lives in schema.js now — the manual
// documents the same table, and a copied table lies the first time a slider
// moves. schema/groups are imported at the top of this file.

/* ── language ─────────────────────────────────────────────────────────── */
// Short stamps drawn into the plan SVG and the tower canvas. Every language
// gets a real word here — an English fallback in the Thai slot once made the
// plan label render as Chinese inside the Thai UI.
const LANGS={
 core:{en:'CORE',th:'แกนกลาง',zh:'核心筒'},
 plan:{en:'PLAN',th:'ผัง',zh:'平面'},
 skyscraper:{en:'TOWER',th:'ตึกสูง',zh:'高塔'},
 globe:{en:'GLOBE',th:'โลก',zh:'地球'},
 phd:{en:'RESEARCH',th:'งานวิจัย',zh:'研究'},
 pencil:{en:'WRITE',th:'เขียน',zh:'写作'}
};

function buildLangButtons(){
 const box=document.querySelector('.langs');box.replaceChildren();
 for(const l of langs){
  const b=document.createElement('button');
  b.textContent=langMeta[l].label;
  b.setAttribute('aria-pressed',String(l===lang));
  b.onclick=()=>setLang(l);
  box.append(b);
 }
}
function setLang(l){
 lang=l;tt=translator(l);
 document.documentElement.lang=langMeta[l].htmlLang;
 document.querySelectorAll('[data-i18n]').forEach(n=>{n.textContent=tt(n.dataset.i18n)});
 document.title='FormHypes — '+tt('tag.line');
 for(const id of ['reset','save','export'])$(id).setAttribute('aria-label',tt(id));
 buildLangButtons();buildSelectors();buildRanges();sync();
 renderResearch();renderMethod();renderStudies();renderDecisionStudy();
 if(document.body.dataset.tab==='manual')renderAssemblyPage();
 update();
 // The search result is DOM built from tt(), so it has to be redrawn when tt()
 // changes. Redraw, never re-run: the numbers are language-independent and
 // re-running would make a language click look like a new study.
 if(searchRun)renderSearch();
 measureChrome(); // Thai and Chinese wrap the masthead differently; re-measure.
 try{localStorage.setItem('formHypesLang',l)}catch{}
}

/* ── selects ──────────────────────────────────────────────────────────── */
function opt(sel,value,label){const o=document.createElement('option');o.value=value;o.textContent=typeof label==='object'?(label[lang]??label.en):label;sel.append(o)}
function fillSelect(id,obj,labels,current){
 const sel=$(id);sel.replaceChildren();
 for(const k of Object.keys(obj))opt(sel,k,labels?labels[k]:obj[k].label);
 sel.value=current;sel.onchange=()=>{state[id]=sel.value;changed()};
}
// Built per call, not once at module load: opt() picks label[lang], so all three
// languages have to be present and correct at the moment the select is drawn.
// An earlier version captured the then-current translator into en/th/zh alike,
// which froze every option to English for the life of the page.
const tri = p => Object.fromEntries(langs.map(l => [l, t[l][p]]));
// …and the same, with a language-independent suffix appended to all three.
const triAs = (p, suffix) => Object.fromEntries(langs.map(l => [l, t[l][p] + suffix]));

/* The detail list is grouped by the area each detail is charged on, not listed
   flat. A flat list of twelve hides the one fact that matters most about it:
   six of these are priced against the skin, four against the crown and two
   against the terrace, so picking "obstruction light mount" on a tower with no
   crown costs nothing at all — and the reader should see that from the list,
   not discover it in a figure. */
const DETAIL_GROUPS=['envelope','crown','terrace'];
function buildDetailSelect(){
 const sel=$('detail');sel.replaceChildren();
 for(const g of DETAIL_GROUPS){
  const keys=DETAIL_KEYS.filter(k=>DETAILS[k].system===g);
  if(!keys.length)continue;
  const og=document.createElement('optgroup');og.label=tt('dt.grp.'+g);
  for(const k of keys)opt(og,k,tt('dt.'+k));
  sel.append(og);
 }
 sel.value=state.detail;
 sel.onchange=()=>{state.detail=sel.value;changed()};
}
function buildSelectors(){
 const city=$('city');city.replaceChildren();for(const id of Object.keys(cities))opt(city,id,tt('sun.'+id));city.value=state.city;city.onchange=()=>{state.city=city.value;changed()};
 for(const id of ['solarDate','solarTime'])$(id).onchange=()=>{const next={...state,[id]:$(id).value};if(!validSolar(next)){sync();toast(tt('sun.invalid'));return}state=next;changed()};
 const famL={};for(const k of Object.keys(families))famL[k]=tri('f.'+k);
 fillSelect('family',families,famL,state.family);
 const progL={};for(const k of Object.keys(levelPrograms))progL[k]=tri('g.prog.'+k);
 fillSelect('program',levelPrograms,progL,state.program);
 // The thesis tag is a building name — Latin in every language, by convention.
 const facL={};for(const k of Object.keys(facadeFamilies))facL[k]=triAs('g.facade.'+k,' — '+facadeFamilies[k].thesis);
 fillSelect('skin',facadeFamilies,facL,state.skin);
 const matL={};for(const k of MATERIAL_KEYS)matL[k]=MATERIALS[k].label;
 fillSelect('material',MATERIALS,matL,state.material);
 buildDetailSelect();
 const sysL={};for(const k of Object.keys(systems))sysL[k]=tri('g.system.'+k);
 fillSelect('system',systems,sysL,state.system);
 const regL={};for(const k of Object.keys(regimes))regL[k]=tt('regime.'+k+'.label');
 fillSelect('regime',regimes,regL,state.regime);
 // The crown is named after the building it is being read against, the way the
 // façade families are — a precedent is a precedent even when it is far away.
 const crL={};for(const k of CROWNS_KEYS)crL[k]=triAs('crown.'+k,' — '+CROWNS[k].thesis);
 fillSelect('crown',CROWNS,crL,state.crown);
 const gdL={};for(const k of GARDENS_KEYS)gdL[k]=tt('garden.'+k);
 fillSelect('garden',GARDENS,gdL,state.garden);
 const led=$('led');led.checked=!!state.led;led.onchange=()=>{state.led=led.checked;changed()};
 $('regime').onchange=()=>{state.regime=$('regime').value;changed()};
 const obj=$('objective');obj.replaceChildren();
 for(const k of ['contribution','rent','yieldOnCost','corners','facade','silhouette'])opt(obj,k,tt('s.objective.'+k));
 obj.value=state.objective??'contribution';
 obj.onchange=()=>{
  state.objective=obj.value;
  // An in-flight run reads this choice on completion. A completed run already
  // owns every metric; changing its ranking needs no new geometry or plan.
  if(searchRun){alternatives=rerank(searchRun.results,obj.value);searchRun.objective=obj.value;shareSearch(obj.value);renderSearch()}
 };
}

/* ── ranges ───────────────────────────────────────────────────────────── */
function controlValue(k){return `${Math.round(state[k]*100)/100}${schema[k][4]?' '+schema[k][4]:''}`}
function buildRanges(){
 for(const[g,keys]of Object.entries(groups)){
  const host=$(g);host.replaceChildren();
  for(const k of keys){
   const[key,min,max,step]=schema[k];
   const label=tt(key);
   const div=document.createElement('div');div.className='control';
   div.innerHTML=`<div class="controlhead"><label for="${k}">${label}</label><output id="${k}Value" for="${k}">${controlValue(k)}</output></div><input type="range" id="${k}" min="${min}" max="${max}" step="${step}" value="${state[k]}">`;
   host.append(div);
   $(k).addEventListener('input',()=>{state[k]=Number($(k).value);if(k==='height')state.program='custom';changed()});
  }
 }
}
function sync(){
 for(const k of Object.keys(schema)){
  if(k==='span'){$(k).min=Math.min(schema[k][1],state[k]);$(k).max=Math.max(schema[k][2],state[k])}
  $(k).value=state[k];$(k+'Value').textContent=controlValue(k);
 }
 $('city').value=state.city;$('solarDate').value=state.solarDate;$('solarTime').value=state.solarTime;
 $('family').value=state.family;$('skin').value=state.skin;$('program').value=state.program;
 $('system').value=state.system;$('regime').value=state.regime;
 $('programNote').textContent=tt('prog.'+state.program+'.note')+' — '+tt('prog.'+state.program+'.src');
 const f=facadeFamilies[state.skin];
 $('skinNote').textContent=tt('skin.reads',{t:f.thesis,e:f.envelope.toFixed(2),i:(f.identity*100).toFixed(0)});
 // The material says what it does to the one figure it is allowed to move,
 // and names the figures it is not allowed to move. Silence would let the
 // reader assume concrete makes the tower quieter or bigger. It does neither.
 const mt=materialOf(state);
 if($('materialNote'))$('materialNote').textContent=tt('mat.reads',{name:mt.label,t:mt.thesis,e:mt.envelope.toFixed(2),c:mt.carbon,u:mt.upkeep.toFixed(2)});
 if($('matStrip')){
  const strip=$('matStrip');strip.replaceChildren();
  for(const k of MATERIAL_KEYS){
   const m=MATERIALS[k],b=document.createElement('button');
   b.type='button';b.className='sw'+(k===state.material?' on':'');b.title=m.label;
   b.setAttribute('aria-label',m.label);b.setAttribute('aria-pressed',String(k===state.material));
   b.style.background=m.fill;b.style.borderColor=m.edge;
   b.onclick=()=>{state.material=k;$('material').value=k;changed()};
   strip.append(b);
  }
 }
 // The detail is the other half of the wall and not a restatement of the
// material. It is charged on its own named area — skin, crown plan or terrace —
// and the note says which, because a reader who cannot tell why a line item is
// zero cannot tell whether the line item is wrong.
 const d=detailOf(state),sp=detailSpec(state),basis=DETAIL_BASIS[d.system];
 if($('detail')){$('detail').value=state.detail}
 if($('detailNote'))$('detailNote').textContent=tt('dt.note.'+state.detail);
 if($('detailFigure'))$('detailFigure').innerHTML=detailSVG(d.draw);
 if($('detailBasis'))$('detailBasis').textContent=tt('dt.basis',{a:tt('area.'+basis),r:d.standard});
 if($('detailSpec')&&$('detailSpec').replaceChildren){
  const rows=[
   ['dt.f.air',sp.air.toFixed(2)+' L/(s·m²)',sp.meetsAir?'ok':'warn'],
   ['dt.f.u',sp.uFactor.toFixed(2)+' W/m²K',''],
   ['dt.f.defl',sp.deflection.toFixed(1)+' mm @ '+sp.span.toFixed(1)+' m',''],
   ['dt.f.access',sp.access.toFixed(1)+'×','']];
  const dl=$('detailSpec');
  // sync() runs on every slider tick and on every language change. Appending
  // without clearing stacked four copies of the list on the first pass.
  dl.replaceChildren();
  for(const [k,v,mark]of rows){
   const dt2=document.createElement('dt');dt2.textContent=tt(k);
   const dd=document.createElement('dd');dd.textContent=v;if(mark)dd.className=mark;
   dl.append(dt2,dd);
  }
 }
 $('systemNote').textContent=systems[state.system].columnFree?tt('sys.free'):tt('sys.grid');
 $('regimeNote').textContent=tt('regime.frame')+' '+tt('regime.'+state.regime+'.reads')+' — '+tt('regime.'+state.regime+'.note');
 const alias=$('regimeAlias');
 if(alias){alias.hidden=!unknownRegime;alias.textContent=unknownRegime?tt('regime.unknown',{name:unknownRegime}):'';}
}

/* ── toast ────────────────────────────────────────────────────────────── */
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>$('toast').classList.remove('on'),4200)}
function changed(){
 searchToken++;searchActive=false; // a search still running was computed for the old state; drop it
 alternatives=[];searchRun=null;
 $('searchResults').innerHTML=`<div class="empty"><p>${tt('s.changed')}</p></div>`;
 update();
}

/* ── update ───────────────────────────────────────────────────────────── */
const DESKS=[['brief',BRIEF_I18N,renderBrief],['fengshui',FENG_I18N,renderFeng],['walk',WALK_I18N,renderWalk],['context',CONTEXT_I18N,renderContext],['site',SITE_I18N,renderSite],['environment',ENV_I18N,renderEnvironment]];
function renderDesks(){for(const [id,dict,render]of DESKS){$(id+'Title').textContent=dict[lang].title;if($(id+'Panel').open)render({lang,state,changed:applyDeskPatch,onInputs:()=>{consoleUI?.render();drawTower()}})}}
for(const [id]of DESKS)$(id+'Panel').addEventListener('toggle',()=>{if($(id+'Panel').open)renderDesks()});
function applyDeskPatch(patch){
 for(const [key,value]of Object.entries(patch)){
  if(key in schema){const[,min,max,step]=schema[key];if(Number.isFinite(value)){const bounded=Math.max(min,Math.min(max,value));state[key]=Math.round((min+Math.round((bounded-min)/step)*step)*1e6)/1e6}}

  else if(key==='solarTime'||key==='solarDate'){if(validSolar({...state,[key]:value}))state[key]=value}
  else if(['family','program','skin','system','city','material','crown','garden','detail'].includes(key)){
   const allowed={family:families,program:levelPrograms,skin:facadeFamilies,system:systems,city:cities,material:MATERIALS,crown:CROWNS,garden:GARDENS,detail:DETAILS};
   if(Object.hasOwn(allowed[key],value))state[key]=value;
  }
  else if(key==='led')state.led=!!value;
 }
 if('height'in patch)state.program='custom';changed();
}

function update(){
 metrics=evaluate(state);sync();renderDecisionStudy();
 // A regime that ranks by height and silhouette gives the objective no weight
 // at all. Say so rather than leaving a six-option control that cannot move.
 const inert=objectiveInert(state),note=$('objectiveNote');
 if(note){note.hidden=!inert;if(inert)note.textContent=tt('s.objectiveInert')}
 $('objective').disabled=inert;
 renderLocation({lang,state,metrics,cities,cityLabel:k=>tt("sun."+k),stackHeight,onCity:city=>{state={...state,city};changed()}});
 renderPlay({lang,state,families,profile,label:f=>tt("f."+f),onChange:patch=>{applyDeskPatch(patch)}});
 renderDesks();
 const sun=solarPosition(state);$('sunPosition').textContent=(sun.aboveHorizon?tt('sun.position',{alt:sun.altitude.toFixed(1),az:sun.azimuth.toFixed(1),zone:sun.zone}):tt('sun.night')+' · '+sun.zone);
 $('contribution').textContent=money(metrics.contribution);
 $('contributionLabel').textContent=metrics.valid?tt('m.contribution'):tt('m.contributionBad');
 $('annualRent').textContent=money(metrics.rent);
 $('grossArea').textContent=num(metrics.gross)+' '+tt('m.perSqM');
 $('rentable').textContent=num(metrics.rentable)+' '+tt('m.perSqM');
 $('efficiency').textContent=metrics.efficiency.toFixed(1)+'%';
 $('corners').textContent=num(metrics.corners);
 $('cornerArea').textContent=num(metrics.cornerArea)+' '+tt('m.perSqM');
 $('distinct').textContent=(metrics.distinctiveness*100).toFixed(0)+'/100';
 $('clearHeight').textContent=metrics.clearHeight.toFixed(2)+' m';
 $('daylight').textContent=metrics.daylightDepth.toFixed(1)+' m';
 // Derived quantities. These are computed from geometry, not chosen: the sky
 // reach follows from the CIE overcast angle, the envelope is a surface
 // integral rather than a triangle count, and the frame rate follows the plate's
 // own perimeter-to-area ratio. None of them is an opinion.
 $('skyReach').textContent=metrics.skyReach.toFixed(2)+' m';
 $('daylit').textContent=(metrics.daylitFraction*100).toFixed(1)+' %';
 $('facadeArea').textContent=num(metrics.facade)+' '+tt('m.perSqM');
 $('volume').textContent=num(metrics.volume)+' '+tt('m.cubicMetres');
 $('frameRate').textContent='×'+metrics.structureMultiplier.toFixed(3);
 $('voidLevels').textContent=metrics.voidLevels+' · '+num(metrics.voidArea)+' '+tt('m.perSqM');
 $('headroom').textContent=Math.max(0,metrics.heightHeadroom).toFixed(1)+' m';
 $('yield').textContent=money(metrics.yieldOnCost);
 $('facadeCost').textContent=money(metrics.facadeCost);
 $('structureCost').textContent=money(metrics.structureCost);
 // The capital stock. Deliberately not styled as a second headline: it is paid
 // once and the contribution is a yearly flow, so putting them side by side as
 // equals would invite the reader to add them. The ratio carries a year in it.
 $('capex').textContent=money(metrics.capex);
 $('capexPerM2').textContent=num(metrics.capexPerM2)+' '+tt('m.perSqM');
 $('capexRatio').textContent=Number.isFinite(metrics.payback)?metrics.payback.toFixed(1)+' '+tt('m.yr'):tt('m.capexRatioNone');
 // The crown and the terrace. Printed separately from the rent lines because
 // neither is rent: one is a structure that costs money and occupies height, the
 // other is area that stopped earning. Only the LED line is income, and it is
 // labelled as advertising where it is shown.
 $('crownHeight').textContent=metrics.crownHeight.toFixed(1)+' m';
 $('towerHeight').textContent=metrics.heightTotal.toFixed(1)+' m';
 $('crownReserve').textContent=money(metrics.crownReserve);
 $('crownCapital').textContent=money(metrics.crownCapital);
 $('gardenArea').textContent=num(metrics.gardenArea)+' '+tt('m.perSqM');
 $('gardenReserve').textContent=money(metrics.gardenReserve);
 $('ledIncome').textContent=metrics.ledArea>0?money(metrics.ledRent):tt('m.ledOff');
 if($('crownNote'))$('crownNote').textContent=tt('crown.reads.'+state.crown)+(metrics.crownHeight>0?' '+tt('crown.areaBasis',{a:num(metrics.crownPlan)}):'');
 if($('gardenNote'))$('gardenNote').textContent=tt('garden.reads.'+state.garden);
 const ledTxt=metrics.ledArea>0?tt('m.ledNote'):tt('m.ledOffNote');
 if($('ledNote'))$('ledNote').textContent=ledTxt;
 if($('ledRailNote'))$('ledRailNote').textContent=ledTxt;
 $('modelName').textContent=tt('f.'+state.family)+' / '+state.floors;
 // The header states the building's height, and the building includes its crown.
 // Reading the occupied height here while the allowance is tested on the total
 // would put two different heights under one label.
 $('heightLabel').textContent=metrics.heightTotal.toFixed(1)+' m';
 // The question the cityscape answers, stated in a number: where this tower
 // ranks against the buildings actually standing around this plot. Not a claim
 // about the world's skylines — only about what OpenStreetMap has mapped inside
 // the harvested radius, which the sentence says out loud.
 if($('skylineReadout')){
  const sk=skyline(state.city,metrics.heightTotal,profile(state,0));
  const el=$('skylineReadout');
  el.hidden=!sk;
  if(sk){
   const vars={where:tt('sun.'+state.city),rank:sk.rank,total:sk.count,
    tall:sk.localMax.toFixed(0),measured:Math.round(sk.measuredFraction*100)};
   const first=document.createElement('span');first.textContent=tt('v.skyline',vars);
   const cred=document.createElement('span');cred.className='sky-credit';
   cred.textContent=tt('v.skycredit',vars);
   el.replaceChildren(first,cred);
   // Stated, not hidden: a massing the drawing drops is a massing the reader
   // cannot check, and a rank they cannot audit is worth nothing.
   if(sk.replaced>0){
    const rp=document.createElement('span');rp.className='sky-credit';
    rp.textContent=tt('v.replaced',{n:sk.replaced});
    el.append(rp);
   }
  }
 }
 // Sheet identification, in the sense the U.S. National CAD Standard gives it:
 // the drawing names itself so it can be referred to unambiguously.
 $('tbRef').textContent='A-101 · '+tt('f.'+state.family).toUpperCase()+' · '+state.floors+'L';

 const bm=baseline(state);
 const d=bm.contribution>0?(metrics.contribution/bm.contribution-1)*100:NaN;
 $('delta').textContent=Number.isFinite(d)?`${d>=0?'+':''}${d.toFixed(1)}% ${tt('m.delta')}${bm.valid?'':' ('+tt('m.deltaBad')+')'}`:tt('m.deltaBad');
 if($('phoneContribution')){$('phoneContributionLabel').textContent=$('contributionLabel').textContent;$('phoneContribution').textContent=$('contribution').textContent;$('phoneDelta').textContent=Number.isFinite(d)?`${d>=0?'+':''}${d.toFixed(1)}%`:'';}

 $('feasibility').className=metrics.valid?'valid':'invalid';
 // Two different checks answer to "does this fit the plot". This one is the
 // form: the generated geometry against envelope, height, core and levels.
 // The Brief desk measures area against the FAR allowance. Both name their
 // subject, so agreement between them is never mistaken for a single verdict.
 $('feasibility').textContent=tt('m.chk.form')+' · '+(metrics.valid?tt('m.feasible'):metrics.reasons.map(r=>tt('m.reason.'+r)).join(' · '));

 renderPremiums();
 $('floor').max=state.floors;
 $('floor').value=Math.min(Number($('floor').value),state.floors);
 drawPlan();
 consoleUI?.render();
}

/* ── where the rent comes from ────────────────────────────────────────── */
/* A dimension line, not a filled bar: a faint full-width base and a drawn
   line whose length is this stream's share of the largest one, with an end
   tick at each end the way a dimension string is drawn. Each row used to carry
   the same ten-tick ruler with one mark, so every row looked identical and the
   eye had to hunt for the mark; a length reads at a glance. */
function ruleMark(fraction){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('viewBox','0 0 160 10');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
 const x=(1+158*Math.max(0,Math.min(1,fraction))).toFixed(1);
 svg.innerHTML=`<path d="M1 5H159" fill="none" stroke="currentColor" stroke-width="1" opacity=".22" vector-effect="non-scaling-stroke"/><path d="M1 5H${x}" fill="none" stroke="currentColor" stroke-width="3" vector-effect="non-scaling-stroke"/><path d="M1 1V9M${x} 1V9" fill="none" stroke="currentColor" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
 return svg;
}
function renderPremiums(){
 const b=metrics.breakdown,rows=[
  ['ordinary',b.rentOrdinary,false],
  ['corner',b.rentCorner,false],
  ['identity',b.rentIdentity,false],
  ['columnFree',b.rentColumnFree,false],
  ['height',b.rentHeight,false],
  ['penalty',-b.rentPenalty,true]];
 const peak=Math.max(...rows.map(r=>Math.abs(r[1])),1);
 const host=$('premiumBars');host.replaceChildren();
 for(const[key,v,neg]of rows){
  if(Math.abs(v)<1)continue;
  const row=document.createElement('div');row.className='staff'+(neg?' neg':'');
  const lbl=document.createElement('span');lbl.textContent=PREMIUM_LABELS[key][lang]||key;
  const val=document.createElement('span');val.className='amt';val.textContent=(neg?'−':'')+money(Math.abs(v));
  row.append(lbl,val,ruleMark(Math.abs(v)/peak));host.append(row);
 }
}

/* ── plan ─────────────────────────────────────────────────────────────── */
/* A plan is not a picture of a floor, it is a drawing: it carries a north
   arrow, an overall dimension, a graphic scale and a core, in the conventions a
   draughtsman expects, so that someone who has never seen this site can size it
   in their head before reading a single number. That is also why it works for
   a reader who cannot tell a chamfer from a setback. */
/* The section. Everything here is computed from the model's own rise and floor
   count by the published methods in core.js — CIBSE for the lifts, ASPE for
   the pressure zones, BS EN 12056-2 for the stacks — and the method is named
   under the drawing, because a section that cannot say how it was sized is a
   drawing. The same floor slider marks the level in both. */
/* The plate split: core, circulation and net usable. Built from the same
   evaluated metrics the schedule prints, so the pie cannot disagree with the
   gross and rentable lines above it. */
function drawAreaSplit(){
 const host=$('areaFigure');if(!host)return;
 const sp=splitOf(metrics||{});
 const names={core:tt('as.core'),circulation:tt('as.circ'),net:tt('as.net')};
 host.innerHTML=splitSVG(sp.slices.map(s=>({...s,label:names[s.key]})),
  {total:sp.gross,legend:sp.legend.map((g,i)=>({...g,label:names[KEYS[i]],value:num(sp.slices[i].value)+' '+tt('m.perSqM')}))});
 host.setAttribute('aria-label',AREA_SPLIT.aria);
 // Both numbers on the note, not one. The pie's net and the schedule's net are
 // computed from different deductions — 30% circulation against a 12% common
 // allowance — so quoting only the pie's figure invites the reader to treat the
 // schedule's efficiency line as an error.
 if($('areaNote'))$('areaNote').textContent=tt('as.note')+' '+tt('as.total')+' '+
  num(sp.gross)+' '+tt('m.perSqM')+' · '+num(sp.modelRentable)+' '+tt('m.perSqM')+' '+tt('m.rentable')+'.';
}

function drawCore(){
 const box=$('coreFigure');if(!box)return;
 renderStructure({host:$('structureDesk'),state,metrics,lang});
 const net=metrics?.rentable??0;
 const core=coreOf(state,net,occupiedOf(state));
 box.innerHTML=coreSVG(state,core,{floor:Number($('floor').value),lang});
 const L=core.lift,V=core.services,E=core.escalator;
 const rows=[
  ['cx.k.pop',num(L.population)],
  ['cx.k.cars',L.cars],
  ['cx.k.zones',L.zones+' × '+L.zoneFloors+'L'],
  ['cx.k.interval',L.interval+' s < '+L.intervalMax+' s'],
  ['cx.k.handle',L.handleRequired+' / 5 min'],
  ['cx.k.esc',E.up+' ↑ '+E.down+' ↓ = '+E.units],
  ['cx.k.escreach',E.levels+'L · '+E.rise+' m'],
  ['cx.k.esccore',E.coreForNext+' m'],
  ['cx.k.wzones',V.zones+' × '+V.zoneHead+' m'],
  ['cx.k.stacks',V.stacks+' × '+V.stackMM+' mm'],
  ['cx.k.vent',V.ventStacks],
  ['cx.k.travel',L.travelTime+' s'],
  ['cx.k.vb',V.velocityBreakers]
 ];
 const f=$('coreFacts');f.replaceChildren();
 for(const [k,v] of rows){
  const d=document.createElement('div');
  const dt=document.createElement('dt');dt.textContent=tt(k);
  const dd=document.createElement('dd');dd.textContent=String(v);
  d.append(dt,dd);f.append(d);
 }
 $('coreSrc').textContent=tt('cx.src')+' '+CORE_SRC.lifts+' · '+CORE_SRC.water+' · '+CORE_SRC.drains+' · '+CORE_SRC.escalators;
 $('coreShown').textContent=tt('cx.shown');
}
function drawPlan(){
 const floor=Number($('floor').value);
 const st=stack(state),total=st[st.length-1].z+st[st.length-1].h;
 const lvl=st[Math.min(floor-1,st.length-1)];
 const t=lvl.z/total,p=profile(state,t),zones=cornerZones(p,state);
 const CX=120,CY=96;
 const bound=Math.max(...p.flat().map(Math.abs),state.core/2)*1.24,sc=100/bound;
 const pt=([x,y])=>`${(CX+x*sc).toFixed(2)},${(CY+y*sc).toFixed(2)}`;
 let svg='<defs><pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0,5 L5,0" stroke="#8b918d" stroke-width=".7"/></pattern></defs>';
 for(let i=20;i<220;i+=20)svg+=`<path d="M${i} 6 V204 M20 ${i} H220" stroke="#dcdeda" stroke-width=".5"/>`;
 svg+=`<polygon points="${p.map(pt).join(' ')}" fill="#eef0ec" stroke="#191c1b" stroke-width="1.4"/>`;
 for(const z of zones)svg+=`<polygon points="${z.map(pt).join(' ')}" fill="#f59e0b" stroke="#191c1b" stroke-width=".5"/>`;
 const core=state.core*sc;
 svg+=`<rect x="${(CX-core/2).toFixed(1)}" y="${(CY-core/2).toFixed(1)}" width="${core.toFixed(1)}" height="${core.toFixed(1)}" fill="url(#hatch)" stroke="#585e5b" stroke-width=".8"/>`;
 svg+=`<text x="${CX}" y="${CY+3.5}" text-anchor="middle" fill="#191c1b" font-family="IBM Plex Sans,Arial" font-size="10.5">${LANGS.core[lang]}</text>`;

 // north — a reference symbol, UDS Symbols module, "reference" classification
 const nx=221,ny=19;
 svg+=`<g><circle cx="${nx}" cy="${ny}" r="8.5" fill="none" stroke="#a8aeaa" stroke-width=".6"/>`
     +`<path d="M${nx} ${ny-8.5} L${nx+3.1} ${ny+7} L${nx} ${ny+4.2} L${nx-3.1} ${ny+7} Z" fill="#191c1b"/>`
     +`<text x="${nx}" y="${ny-12.5}" text-anchor="middle" fill="#585e5b" font-family="IBM Plex Mono,monospace" font-size="10">N</text></g>`;

 // overall dimension — witness lines off the plate, arrowed line between them
 const xs=p.map(v=>v[0]),ys=p.map(v=>v[1]);
 const x0=CX+Math.min(...xs)*sc,x1=CX+Math.max(...xs)*sc;
 const yBot=CY+Math.max(...ys)*sc,yd=yBot+17;
 svg+=`<path d="M${x0.toFixed(1)} ${(yBot+4).toFixed(1)} V${(yd+4).toFixed(1)} M${x1.toFixed(1)} ${(yBot+4).toFixed(1)} V${(yd+4).toFixed(1)}" stroke="#a8aeaa" stroke-width=".5"/>`
     +`<path d="M${x0.toFixed(1)} ${yd.toFixed(1)} H${x1.toFixed(1)}" stroke="#191c1b" stroke-width=".7"/>`
     +`<path d="M${x0.toFixed(1)} ${yd} l7 -2.5 v5 Z M${x1.toFixed(1)} ${yd} l-7 -2.5 v5 Z" fill="#191c1b"/>`
     +`<text x="${((x0+x1)/2).toFixed(1)}" y="${(yd-5).toFixed(1)}" text-anchor="middle" fill="#191c1b" font-family="IBM Plex Mono,monospace" font-size="10">${(x1-x0).toFixed(1)} m</text>`;

 // graphic scale — graduated in metres, drawn in drawing units so it stays true
 const NICE=[1,2,5,10,20,50,100,200,500,1000];
 const u=NICE.find(v=>v*sc>=26&&v*sc<=48)??NICE.find(v=>v*sc<=48)??NICE[0];
 const seg=u*sc,bx=20,by=234;
 let bar='';
 for(let i=0;i<4;i++)bar+=`<rect x="${(bx+i*seg).toFixed(1)}" y="${by}" width="${seg.toFixed(1)}" height="4.5" fill="${i%2?'#191c1b':'none'}" stroke="#191c1b" stroke-width=".6"/>`;
 for(let i=0;i<=4;i++){
  const tx=bx+i*seg,anch=i===0?'start':i===4?'end':'middle';
  bar+=`<text x="${tx.toFixed(1)}" y="${by+15}" text-anchor="${anch}" fill="#585e5b" font-family="IBM Plex Mono,monospace" font-size="10">${i===4?i*u+' m':i*u}</text>`;
 }
 svg+=bar;

 $('plan').innerHTML=svg;
 $('floorValue').textContent=floor;
 $('floorStats').textContent=`${LANGS.plan[lang]} ${floor} · ${num(area(p))} ${tt('m.perSqM')} · ${zones.length} ${tt('m.cornerOffices')}`;
 drawCore();
 drawAreaSplit();
 drawHuman();
 drawTower();
}
$('floor').oninput=()=>{drawPlan();consoleUI?.render()};

/* ── tower ────────────────────────────────────────────────────────────── */
const canvas=$('tower'),ctx=canvas.getContext('2d');
function drawTower(){
 if(!metrics)return;
 const st=stack(state),total=st[st.length-1].z+st[st.length-1].h;
 const crown=crownOf(state),chH=crown.h,ext=total+chH;
 const W=canvas.clientWidth,H=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2);
 if(W<2||H<2)return;
 drawn={w:Math.round(W),h:Math.round(H)};
 canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
 /* The sheet is a field with a margin at the top and a title band at the foot,
    and the model is fitted into the field — not into the viewport and then hung
    from 80% of the whole thing.

    That distinction was the headroom bug. Reserving the foot and anchoring to
    H*.80 of the FULL height put the crown 24px below the top edge on a 924px
    sheet, so it read as cramped, and on a short sheet the crown ran off the top
    entirely — the ground plate reaches y=0 at every column, because it is the
    disc, not the sky, that fills the upper sheet. Two margins that never met:
    the fit thought it had H-145 to work in and the composition spent the
    difference on a gap under the base that the band then covers anyway.

    So the field is stated, the model is scaled to fill exactly that field, and
    the base is placed from the top margin rather than from a fraction of the
    sheet. baseY is derived, not chosen: it is the head margin plus however much
    height the model actually occupies above the ground. */
 const HEAD=Math.max(30,Math.round(H*.10));
 const FOOT=150;
 const fieldH=Math.max(120,H-HEAD-FOOT);
 /* CORE is the third view, and it is the only one that answers "where is the
    core and what is in it".

    A 14 m core inside a 599 m tower is ten pixels wide at any scale that fits
    the building. That is the whole reason the core used to live in a sidebar as
    a section drawing beside the model — because there was nowhere to put it in
    the model itself. But that is a fact about one framing, not about the core:
    the core view drops the framing. It fits the CORE across the field, the tower
    behind it becomes a wire cage, and the sheet crops the height it cannot show.
    Zooming out walks the window up the column, which is why the zoom range is
    wide here and the sheet carries a locator saying where in the core you are.

    So it is not a zoom preset on the orbit — it is a different camera, its own
    zoom law, and its own early return below. Keeping it inside drawTower() is
    deliberate: it shares this `project`, this `path` and this model state, so
    the core cannot be drawn at a different scale or from a different angle than
    the building that contains it. */
 const coreView=view==='core';
 /* PLAN is not another camera angle on the same problem. In the orbit the
   ground plane is edge-on — at a 599 m Shenzhen skyline the street grid is a
   sliver in the corner no matter how the plate is valued, because the plane
   is being viewed at a grazing angle through a forest. A plan is the view in
   which a floor is the subject rather than the thing hiding under the
   buildings, and it is the view a person actually reads a map in.

   It is a true top-down orthographic, not a steep perspective: yaw is ignored
   so north is up, and the scale is chosen by fitting the harvested radius to
   the field so the whole plot of streets lands on the sheet. */
 const city=cityData(state.city);
 const planView=view==='plan';
 const planScale=city?Math.min((W-90)/(city.radius*2.15),fieldH/(city.radius*2.15))*zoom:1;
 /* The core view fits the CORE, and it fits it to about a third of the sheet so
    there is ground either side of it to read the tower's own section against.
    CORE_WINDOW is the height of core that should be legible at zoom 1 — chosen
    as a round number of storeys rather than a nice fraction of the field, so
    that the number of storeys visible does not change when the window does. */
 const CORE_WINDOW=34;
 /* The core view looks DOWN into the core rather than across it.

    Everything that makes a core a core — which shaft is beside which, where the
    bank sits, how deep the stair is — is in PLAN. The orbit's elevation is about
    twenty degrees, chosen so a 600 m tower reads as a tower, and at twenty
    degrees a 14 m square of plan projects to a sliver two pixels deep. The core
    came out as a flat grey slab with four vertical bands: correct geometry, and
    none of it legible, because the view angle was the orbit's and the subject was
    not the orbit's.

    Forty-one degrees opens the plan without tipping the storey plates past
    legibility. It is the same axonometric the section drawing is drawn on. */
 const CORE_ELEV=0.86;
 const coreFit=Math.min((W-110)/(state.core*2.9),fieldH/(CORE_WINDOW+CORE_ELEV*state.core));
 const scale=coreView?coreFit*coreZoom:planView?planScale:(neighbourhood?Math.min((W-65)/1450,fieldH/(700*.72+ext*.96)):Math.min(fieldH/(ext*.96+state.span*.4),(W-65)/(state.span*2)))*zoom;
 const planCY=HEAD+fieldH/2;
 /* The core view's window is clamped to the column. Without the clamp you can
    drag the ground line clean off the top of the sheet and be left looking at
    196 m of empty sky with a locator saying you are at the top of it — which is
    the same class of bug as the fixed-offset footer: the drawing is correct and
    anchored to nothing. corePan is a height in metres, and the clamp is in
    metres too, so it holds at every zoom. */
 const coreVis=coreView?coreVisibleM(scale,fieldH):0;
 const coreMaxPan=coreView?Math.max(0,total-coreVis):0;
 if(coreView)corePan=Math.min(coreMaxPan,Math.max(0,corePan));
 const baseY=coreView?HEAD+fieldH+corePan*scale:planView?planCY:neighbourhood?HEAD+Math.max(0,fieldH-(ext*.96+700*.72)*scale)/2+(ext*.96+700*.36)*scale:HEAD+ext*.96*scale;
 const c=Math.cos(yaw),s=Math.sin(yaw);
 /* One projection for the whole sheet, with the elevation angle as the one
    thing the core view changes. A second project() for the core would be a
    second camera that could drift from the first, and "the core is drawn at a
    different scale than the building it is inside" is exactly the bug this view
    was built to remove. */
 const elev=coreView?CORE_ELEV:0.36;
 const project=(x,y,z)=>{if(planView)return[W*.5+x*scale+panX,planCY-y*scale+panY,z];const rx=x*c-y*s,ry=x*s+y*c;return[W*.54+rx*scale,baseY-(z*.96-ry*elev)*scale,ry-z*.04]};
 function path(pts,fill,stroke,width=1){ctx.beginPath();pts.forEach((v,i)=>{const p=project(...v);if(i)ctx.lineTo(p[0],p[1]);else ctx.moveTo(p[0],p[1])});ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}}
 function line(a,b,col,width=.6){ctx.beginPath();const p=project(...a),q=project(...b);ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.strokeStyle=col;ctx.lineWidth=width;ctx.stroke()}

 // Fetched here, above every use, rather than where it is first drawn. Declared
 // at the point of use it reads as a local convenience; declared before the grid
 // it is what the whole drawing is measured against.
 /* Whatever stands on the plot is the site, not the context. A harvested
    building whose footprint covers the origin is standing exactly where the
    tower is drawn, and painting it in front made the tower rise from inside
    another building — which is what read as floating. Removed, counted, and
    the count printed on the sheet. */
 let massings=city?visibleMassings(city,scale,1.4):[];
 let onPlot=0;
 if(city&&massings.length){const split=splitByPlot(massings,profile(state,0));massings=split.context;onPlot=split.onPlot.length}

 /* The bottom band is in flow now, so its height is whatever the language, the
    width and the current figures make it. Canvas annotations are positioned in
    pixels, so they are positioned against that measured edge rather than a
    constant: a fixed offset prints the land area and the axis triad straight
    through the title block the moment the sheet gets short.

    "In flow" means not absolutely or fixed positioned — not "static". The band
    has to be position:relative to paint above the out-of-flow canvas, and
    relative is still in flow. Testing for static here quietly returned an empty
    list and dropped footInset to zero, so the annotations would have landed on
    top of the band they were written to clear. */
 const bandEl=document.querySelector('.viewport');
 const vpRect=bandEl.getBoundingClientRect();
 const bandTop=[...bandEl.children]
  .filter(c=>!['absolute','fixed'].includes(getComputedStyle(c).position))
  .map(c=>c.getBoundingClientRect())
  .filter(b=>b.height>0)
  .map(b=>b.top-vpRect.top);
 const footInset=bandTop.length?Math.max(0,H-Math.min(...bandTop)):0;

 /* The band is in flow, so the footer is laid out over the bottom of the canvas
    box. The stylesheet lifts it above the drawing — which makes the text
    readable and does nothing else. Nothing stopped the *ink* at the band: the
    ground plate, the city and the tower all painted straight through it. So the
    footer was clean only until you touched the model. Dragging the orbit put the
    tower's base behind the credit line, and zooming out put it behind the title
    block; on a phone, where the band is tall and so is the tower, they collided
    outright with no interaction at all.

    Two halves of one bug, and only one of them was ever fixed. Lifting solves the
    z-order. Clipping solves the ink, and the clip has to be bounded by the same
    measured edge, or it reintroduces the fixed-offset bug the measurement exists
    to prevent. A sheet has a drawing field and a title band; the band is paper. */
 ctx.save();
 ctx.beginPath();
 ctx.rect(0,0,W,H-footInset);
 ctx.clip();

 /* One measurement of the sheet, taken once. The axis triad and the plan's
   scale bar both have to clear the view-foot labels, and the reason that
   measurement moved up here is that the plan returns before the triad is
   drawn — a second copy of this logic would have been free to drift. */
 const fieldBottom=H-footInset;
 const footEl=document.querySelector('.viewfoot');
 const footShown=footEl&&getComputedStyle(footEl).display!=='none';
 const footLabel=footShown?[...footEl.querySelectorAll('span')].pop():null;
 const labelLeft=footLabel?footLabel.getBoundingClientRect().left:vpRect.left+24;
 const origin=[Math.max(24,labelLeft-vpRect.left-40),Math.max(40,fieldBottom-26)];

 /* ── the core view ────────────────────────────────────────────────────────
    Returns from here. It is not the orbit with a different zoom: the tower
    becomes a cage, the core becomes the subject, and none of the city drawing
    runs — a 300 m neighbour at the core's scale is 4500 px wide and would fill
    the sheet with one grey wall, which is the opposite of a legible drawing.

    Everything painted below comes out of coreScene() in model metres. Nothing
    here decides a dimension; it decides what is solid and what is void. */
 if(coreView){
  ctx.fillStyle='#0b0e11';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#141a20';ctx.fillRect(0,baseY,W,H-baseY);
  ctx.strokeStyle='#39434a';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(0,baseY+.5);ctx.lineTo(W,baseY+.5);ctx.stroke();
  // Earth hatch below grade, so the core is founded rather than sitting on the
  // plate. The section drawing does the same thing; two drawings of one building
  // that disagree about whether it has a basement is not two drawings.
  ctx.strokeStyle='#232c33';ctx.lineWidth=.5;
  for(let x=-W;x<W*2;x+=9){ctx.beginPath();ctx.moveTo(x,baseY+4);ctx.lineTo(x+7,H);ctx.stroke()}

  /* The tower, as a cage. Grade outline, roof outline and the four corner
     arrises between them: enough to say "the core is inside this" and no more.
     Filled, it would hide the thing the view exists to show. */
  const cage='#2f3940', ring0=profile(state,0), ring1=profile(state,1);
  path(ring0.map(v=>[...v,0]),null,cage,.7);
  path(ring1.map(v=>[...v,total]),null,cage,.7);
  for(const [x,y] of ring0)line([x,y,0],[x,y,total],cage,.5);
  /* Storey lines, thinned hard. At the core view's forty-one degrees a 48 m
     tower plate projects to a parallelogram a hundred pixels deep, so a plate
     every other storey turns the cage into diagonal hatching that buries the
     core — the thing the cage exists to give context to. Every eighth storey is
     enough to say "there is a building here, this storey spacing, this many of
     them" and leaves the sheet for the subject. */
  const every=Math.max(4,Math.round(st.length/6));
  st.forEach((l,i)=>{if(i%every)return;path(ring0.map(v=>[...v,l.z]),null,'#1d242a',.3)});
  // The storey the reader has selected, on the plan view's own index.
  const fiC=Math.min(Number($('floor').value)-1,st.length-1);
  path(profile(state,st[fiC].z/total).map(v=>[...v,st[fiC].z]),null,'#f59e0b',1.6);

  /* The core.

     One sorted list, one painter's algorithm. Walls, shafts, stair, bank, cars,
     storey plates and stair flights all go in together and are drawn back to
     front by the same depth term the tower's own faces use.

     They did not used to share one list. The plates and the flights were drawn
     in a separate pass after everything, which is correct for a plate and
     wrong for a flight: a flight at the back of the core painted over the
     shafts in front of it, so the stair floated in front of the lifts at every
     storey. Depth is not a property of a category of thing, it is a property of
     where the thing is.

     Faces that ENCLOSE space are culled when they turn toward the camera —
     walls, shafts, stair. You look into those. Faces that ARE a machine are not
     culled: the cars and the bank keep all their sides, because a car drawn as
     five faces reads as a broken box rather than as a cabin. Culling only the
     walls, which was the first attempt, leaves the stair standing across the
     whole core as an unbroken slab hiding every shaft behind it — a cutaway is
     not one wall removed, it is every enclosure opened on the same side. */
  const core=coreOf(state,metrics?.rentable??0,occupiedOf(state));
  const sc0=coreScene(state,core,coreT());
  const zLo=Math.max(0,corePan),zHi=Math.min(total,corePan+coreVisibleM(scale,fieldH));
  const vn=(p,q,r)=>{const ux=q[0]-p[0],uy=q[1]-p[1],uz=q[2]-p[2],vx=r[0]-p[0],vy=r[1]-p[1],vz=r[2]-p[2];
   return [uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx]};
  const camX=Math.sin(yaw),camY=Math.cos(yaw);      // the direction the sheet looks from
  const quads=[];
  /* The outward normal is taken from the box's own centre, not from the winding
     of the four points.

     Winding is not a safe source. The six faces of a box written as six
     separate literals do not all wind the same way round, so a cross product
     comes out pointing inward on some faces and outward on others — and then
     culling removes the faces you can see and keeps the ones you cannot. The
     symptom is a core that has gone opaque: the far wall, which should have been
     culled, is drawn in front of everything inside it. Subtracting the face's
     own centroid from the box's centre and flipping the normal to agree with it
     is immune to how the points happen to be listed. */
  const emit=(pts,kind,mid=null)=>{
   let n=vn(pts[0],pts[1],pts[2]);
   if(mid){
    const c=[pts.reduce((v,q)=>v+q[0],0)/4-mid[0],pts.reduce((v,q)=>v+q[1],0)/4-mid[1],pts.reduce((v,q)=>v+q[2],0)/4-mid[2]];
    if(n[0]*c[0]+n[1]*c[1]+n[2]*c[2]<0)n=[-n[0],-n[1],-n[2]];
   }
   if(kind!=='car'&&kind!=='escalator'&&n[0]*camX+n[1]*camY>0)return;
   quads.push({p:pts,k:kind,d:pts.reduce((v,q)=>v+project(...q)[2],0)/pts.length});
  };
  const six=(b,kind,omitTop=false)=>{
   const mid=[(b.x0+b.x1)/2,(b.y0+b.y1)/2,(b.z0+b.z1)/2];
   emit([[b.x0,b.y0,b.z0],[b.x1,b.y0,b.z0],[b.x1,b.y0,b.z1],[b.x0,b.y0,b.z1]],kind,mid);
   emit([[b.x0,b.y1,b.z0],[b.x1,b.y1,b.z0],[b.x1,b.y1,b.z1],[b.x0,b.y1,b.z1]],kind,mid);
   emit([[b.x0,b.y0,b.z0],[b.x0,b.y1,b.z0],[b.x0,b.y1,b.z1],[b.x0,b.y0,b.z1]],kind,mid);
   emit([[b.x1,b.y0,b.z0],[b.x1,b.y1,b.z0],[b.x1,b.y1,b.z1],[b.x1,b.y0,b.z1]],kind,mid);
   emit([[b.x0,b.y0,b.z0],[b.x1,b.y0,b.z0],[b.x1,b.y1,b.z0],[b.x0,b.y1,b.z0]],kind,mid);
   if(!omitTop)emit([[b.x0,b.y0,b.z1],[b.x1,b.y0,b.z1],[b.x1,b.y1,b.z1],[b.x0,b.y1,b.z1]],kind,mid);
  };
  for(const it of sc0.solids){
   const b=it.b;
   if(b.deep!==undefined){
    /* An incline: soffit, two flanks, and the tread face on the slope. Not a
       box — a box draws a 4.1 m slab lying flat, which is a ramp on its side
       and the one thing an escalator never is. */
    emit([[b.x0,b.y0,b.z1b],[b.x1,b.y0,b.z1b],[b.x1,b.y0,b.z1],[b.x0,b.y0,b.z1]],'escalator');
    emit([[b.x0,b.y1,b.z1b],[b.x1,b.y1,b.z1b],[b.x1,b.y1,b.z1],[b.x0,b.y1,b.z1]],'escalator');
    emit([[b.x0,b.y0,b.z1b],[b.x0,b.y1,b.z1b],[b.x0,b.y1,b.z1],[b.x0,b.y0,b.z1]],'escalator');
    emit([[b.x0,b.y0,b.z1],[b.x0,b.y1,b.z1],[b.x1,b.y1,b.z1],[b.x1,b.y0,b.z1]],'escalator');
   }else six(b,it.kind,it.kind==='shaft');
  }
  for(const car of sc0.cars)six(car.b,'car');

  /* Storey plates. Without them the core is four vertical bands and the eye has
     no way to read a height — forty-eight metres of drawing looks exactly like
     two hundred. These are the storeys the schedule actually holds, from stack()
     at their real z, so the reader can count them and the selected level lands
     on one. Hairlines and nothing more: a slab with any weight turns the core
     into a stack of solid floors and hides the thing it is there to measure. */
  {
   const cc=state.core/2;
   for(const l of st){
    if(l.z<zLo||l.z>zHi||l.index%2)continue;
    const sel=l.index===fiC;
    emit([[-cc,-cc,l.z],[cc,-cc,l.z],[cc,cc,l.z],[-cc,cc,l.z]],sel?'plateSel':'plate');
   }
  }

  /* The stair, as flights rather than a box. A stair drawn as a solid reads as
     a wall in a different grey, which is what it was. Two flights side by side
     across the stairwell rather than one plate the full width of the core —
     one full-width plate is a shelf, and a shelf stacked to the roof is a
     bookcase, not a stair. */
  {
   const t=sc0.stair,w=(t.x1-t.x0)/2,mid=(t.x0+t.x1)/2;
   for(const l of st){
    if(l.z<zLo||l.z>zHi)continue;
    const hz=l.z+l.h/2;
    emit([[t.x0,t.y0,l.z],[mid,t.y0,l.z],[mid,t.y0,hz],[t.x0,t.y0,hz]],'flight');
    emit([[mid,t.y1,hz],[t.x1,t.y1,hz],[t.x1,t.y1,l.z+l.h],[mid,t.y1,l.z+l.h]],'flight');
    void w;
   }
  }

quads.sort((a,b2)=>a.d-b2.d);
  /* What is filled and what is not.

     The core's walls, its shafts and its stair are VOIDS. A cutaway axonometric
     draws them as an outline and leaves the space inside them open, and that is
     not a style preference — it is what makes the drawing work. Filled with dark
     greys they came out as one black mass from the first metre to the last, with
     the storey plates invisible on it and the amber car apparently floating in a
     void rather than running inside a shaft. Outlined, the plates read as a
     ladder up the core, the shafts read as slots, and the car reads as a car in a
     shaft because there is a slot around it.

     The bank and the cars keep their fills: they are machines, not spaces. */
  for(const q of quads){
   const fill=q.k==='car'?'#f59e0b':q.k==='escalator'?'#3b4750':null;
   const stroke=q.k==='car'?'#fbbf24':q.k==='wall'?'#93a3aa':q.k==='escalator'?'#85939c'
     :q.k==='stair'?'#6d7c84':q.k==='flight'?'#8a99a1':q.k==='shaft'?'#8a99a1'
     :q.k==='plateSel'?'#f59e0b':'#6d7b84';
   path(q.p,fill,stroke,q.k==='car'?.9:q.k==='plate'||q.k==='plateSel'?.6:.5);
  }

  /* What each part IS.

     Four bands of different greys is a texture, not a drawing: the reader can
     see that something is in there and cannot tell what. A leader and a label
     per element is the whole difference, and it costs one line of text each —
     the same convention, and the same four words in the same three languages,
     as the section drawing beside it. A reader moving between the two views is
     not learning two vocabularies for the same building. */
  {
   const zMid=(zLo+zHi)/2;
   const anchorOf=kind=>{
    if(kind==='car')return sc0.cars.length?sc0.cars[0].b:null;
    if(kind==='escalator'){
     const e=sc0.solids.find(o=>o.kind==='escalator');
     return e?{x0:e.b.x0,x1:e.b.x1,y0:e.b.y0,y1:e.b.y1,z0:e.b.z0,z1:e.b.z1}:null;
    }
    if(kind==='stair')return{...sc0.stair,z0:zMid,z1:zMid};
    const sh=sc0.solids.find(o=>o.kind==='shaft');
    return sh?{...sh.b,z0:zMid,z1:zMid}:null;
   };
   const rows=[['cx.lgShaft','shaft'],['cx.lgCar','car'],['cx.lgStair','stair'],['cx.lgEsc','escalator']];
   const colX=22,step=Math.min(44,Math.max(28,(fieldH-90)/rows.length));
   let ly0=HEAD+26;
   ctx.font='11px "IBM Plex Sans",Arial,sans-serif';ctx.textAlign='left';
   for(const [key,kind] of rows){
    const a2=anchorOf(kind);
    if(!a2)continue;
    const p2=project((a2.x0+a2.x1)/2,(a2.y0+a2.y1)/2,(a2.z0+a2.z1)/2);
    if(p2[1]<HEAD-16||p2[1]>fieldBottom+8)continue;
    const ty=ly0+step/2,tx=colX+136;
    ctx.strokeStyle='#5b686f';ctx.lineWidth=.6;
    ctx.beginPath();ctx.moveTo(tx+4,ty);ctx.lineTo(p2[0],p2[1]);ctx.stroke();
    ctx.beginPath();ctx.arc(p2[0],p2[1],2.2,0,Math.PI*2);ctx.fillStyle='#f59e0b';ctx.fill();
    ctx.fillStyle='#a2aca9';ctx.fillText(tt(key),colX,ty+4);
    ly0+=step;
   }
  }

  /* The locator. A core 600 m tall shown through a 46 m window is a view of
     somewhere, not a view of the core — so the sheet says where. It is the same
     job as the key on a section drawing, and it is the only thing on the sheet
     that tells the reader that zooming out walks them up the column. */
  const lx=W-128,ly=HEAD+8,lb=Math.min(fieldH-16,Math.max(220,fieldH*.72)),lr=lx+96;
  ctx.fillStyle='#0d1114';ctx.fillRect(lx,ly,96,lb);
  ctx.strokeStyle='#39434a';ctx.strokeRect(lx+.5,ly+.5,95,lb-1);
  const zfC=core.lift.zoneFloors,hC=state.height;
  for(let z=0;z<core.lift.zones;z++){
   const a=ly+lb-(z*zfC*hC)/sc0.window.total*lb;
   const b2=ly+lb-(Math.min(st.length,(z+1)*zfC)*hC)/sc0.window.total*lb;
   ctx.strokeStyle='#3d484f';ctx.beginPath();ctx.moveTo(lx,Math.max(ly,b2));ctx.lineTo(lr,Math.max(ly,b2));ctx.stroke();
   ctx.fillStyle='#6d7b84';ctx.font='9px "IBM Plex Mono",monospace';ctx.textAlign='left';
   ctx.fillText(String(z+1),lx+4,Math.max(ly+10,b2-3));
  }
  const vis=Math.min(coreVis,sc0.window.total);
  const vy0=ly+lb-(corePan+vis)/sc0.window.total*lb;
  const vy1=ly+lb-corePan/sc0.window.total*lb;
  ctx.strokeStyle='#f59e0b';ctx.lineWidth=1.2;
  ctx.strokeRect(lx+2,Math.max(ly+1,vy0),92,Math.max(6,Math.min(vy1,ly+lb-1)-Math.max(ly+1,vy0)));
  ctx.lineWidth=.6;
  ctx.fillStyle='#8b918d';ctx.font='10px "IBM Plex Mono",monospace';ctx.textAlign='left';
  ctx.fillText(tt('v.coreKey'),lx+6,ly+13);
  ctx.fillStyle='#f59e0b';ctx.fillText(Math.round(sc0.window.total)+' m',lx+6,ly+lb-6);
  ctx.fillStyle='#8b918d';ctx.textAlign='right';
  ctx.fillText(tt('v.coreZone'),lr-6,ly+lb-6);

  /* One caption, bottom left, in the sheet's own idiom: what is on screen. */
  ctx.textAlign='left';ctx.fillStyle='#a2aca9';ctx.font='11px "IBM Plex Mono",monospace';
  ctx.fillText(tt('v.coreCaption'),24,fieldBottom-10);
  ctx.restore();
  return;
 }

 // Fine grid where the plot is read, coarse grid where the city is. A single
 // 12 m grid across 700 m would be 117 lines each way and would bury the tower
 // in ruling; a site plan gets this right by changing weight, not density.
 const gridR=city?city.radius:120;
 for(let i=-150;i<=150;i+=12){line([i,-150,0],[i,150,0],'#293136',.5);line([-150,i,0],[150,i,0],'#293136',.5)}
 if(gridR>150)for(let i=Math.ceil(-gridR/100)*100;i<=gridR;i+=100){
  if(i>-150&&i<150)continue;
  line([i,-gridR,0],[i,gridR,0],'#1d2429',.5);line([-gridR,i,0],[gridR,i,0],'#1d2429',.5);
 }
 const landArea=getBriefStudy(state).inputs.plot,landSide=Math.sqrt(landArea)/2;ctx.setLineDash([6,4]);path([[-landSide,-landSide,0],[landSide,-landSide,0],[landSide,landSide,0],[-landSide,landSide,0]],null,'#f59e0b',1.5);ctx.setLineDash([]);ctx.fillStyle='#f59e0b';ctx.font='11px "IBM Plex Mono",monospace';ctx.fillText(num(landArea)+' m²',16,H-footInset-14);
 const site=state.site/2;path([[-site,-site,0],[site,-site,0],[site,site,0],[-site,site,0]],null,'#a2aca9',1);

 /* The city. Real footprints and real heights from OpenStreetMap, harvested
    around this plot and baked into the release. The tower is not floating in a
    void any more: it stands on a surveyed ground with a surveyed skyline
    around it, which is the only way to read whether the thing is too big for
    its place.

    Depth-sorted back to front and split either side of the tower, so a block
    between the camera and the model correctly stands in front of it. The old
    four boxes were always behind, which is why no amount of orbiting ever made
    the composition read as a place. */

 const towerHalf=(state.span/2+8)*(Math.abs(c)+Math.abs(s));
 const cityFar=[],cityNear=[];
 for(const m of massings){
  const d=m.cx*s+m.cy*c;
  (d>towerHalf?cityNear:cityFar).push(m);
 }
 const depth=m=>m.cx*s+m.cy*c;
 cityFar.sort((a,b)=>depth(a)-depth(b));
 cityNear.sort((a,b)=>depth(a)-depth(b));
 // Stroke brightness carries height, so the skyline reads as a skyline: the tall
 // ones are the ones you see first. A height inferred from a level count is
 // drawn a shade dimmer than a surveyed one, because it is a weaker claim and
 // the reader is entitled to know which is which.
 // Brightness carries height, so a skyline reads as a skyline. The first ramp
 // was dark enough that the blocks vanished into the ground plate and the tower
 // looked like it was standing in a void again — which is the exact problem the
 // cityscape was added to solve.
 const inkFor=h=>h>=120?'#6c818c':h>=60?'#5a6b75':h>=25?'#495761':h>=12?'#3c4950':'#333e45';

 /* Extrude the real outline.

    The previous version drew three quads from a bounding box, so every
    building in the city was a rectangle whether or not it was one in the
    survey — an L, a cruciform or a notched podium arrived as a slab and the
    drawing read as a table. A wall is now one edge of the footprint: only the
    edges whose outward normal faces the camera are drawn, which is both the
    correct solid and roughly half the path data.

    The facing test is a normal test, not an edge test: a wall is visible when
    its OUTWARD NORMAL opposes the view direction. Testing the edge direction
    instead is the subtle one — for an axis-aligned box the edge is
    perpendicular to its normal, so half the visible walls are culled and the
    drawing quietly loses a side. The invariant: a box shows one or two walls
    at every one of the 360 headings.

    The normal of a counter-clockwise ring's edge is (ey, −ex), so the ring's
    handedness decides the sign. A clockwise ring would face every wall inwards
    and the cull would remove exactly the walls the reader can see — the
    building disappears rather than looking wrong. Normalise once per building. */
 /* The camera's view direction in world coordinates, read off project() rather
    than assumed. That projection is a rotation: ry = x·s + y·c is the depth
    axis, because screenY falls as ry rises. So "further away" is the gradient
    of ry, which is (s, c). Guessing the convention instead of deriving it puts
    the vector ninety degrees out, and a box then shows the wrong pair of walls
    — invisible on a symmetric shape, wrong on an L. */
 const viewDir=[s,c];
 /* Three things were wrong with a flat fill, and the third is why the context
    read as tables and chairs.

    One: every wall took the same tone, so a notched footprint drew as one black
    shape with lines on it and the plan shape was invisible.
    Two: that tone sat so close to the ground plate that the buildings read as
    holes cut in the drawing rather than solids standing on it.
    Three: the value ladder ran the wrong way. The shaded wall was #121920
    against a #0a0d10 plate — eight values — so half of every building dissolved
    into the ground, while the roof was the brightest thing in the scene. A lit
    horizontal rectangle floating in the dark with a dark mass beneath it is a
    table, and that is exactly what the city looked like.

    So the ladder runs the right way and is evenly stepped: three wall values,
    all clearly above the plate, and a roof that is a lid rather than the
    brightest object on the sheet. A building reads as a building when its
    silhouette sits clear of the ground and its faces step in value. No
    gradients — a step per orientation, which is drafting rather than airbrush,
    and the same three-tone treatment the tower itself uses. */
 const LIGHT=[-0.55,-0.84];                       // front-left, in world metres
 const WALL_LIT='#3c4a56',WALL_MID='#2b3742',WALL_SHADE='#1e262e';
 const ROOF_HI='#414e59',ROOF_LO='#333e47';
 const SHADOW='#10151a';
 const toneFor=dot=>dot>.18?WALL_LIT:dot<-.18?WALL_SHADE:WALL_MID;
 const roofTone=h=>h>=120?ROOF_HI:ROOF_LO;
 const BAND='#54626e';
 // Shrink a ring toward its own centroid by a distance that cannot invert it.
 // Used for the parapet: a roof edge with thickness, so the top of a building
 // is a lid and not a decal.
 const inset=(ring,d)=>{let cx=0,cy=0;for(const p of ring){cx+=p[0];cy+=p[1]}cx/=ring.length;cy/=ring.length;
  return ring.map(([x,y])=>{const dx=x-cx,dy=y-cy,l=Math.hypot(dx,dy)||1,k=Math.min(d,l*.2)/l;
   return[x-dx*k,y-dy*k]})};
 /* The harvested ground, on the plate the massings stand on.

   Order is areas first, then the network on top of them: green, water, the
   wide carriageways, then the streets. A road drawn under a park reads as a
   road through it, which is the opposite of what the data says.

   Hierarchy is carried by line weight, not by a second colour. GROUND_ROAD_M
   runs 22 m down to 5 m, so a six-lane road and a service lane differ by five
   times the width and need no extra value to be told apart — and every one of
   them stays below the shadowed wall, which a brighter "major road" would not. */
 /* One decode per city, kept: the ground is the same every time the tower is
   nudged, and re-splitting a few hundred records on every pointer move is the
   kind of cost that makes an orbit feel cheap and then not. */
const GROUND_GREEN='#1d2620',GROUND_WATER='#16232c',GROUND_ROAD='#2a3540';
 const ext_=()=>{const st=stack(state);return st[st.length-1].z+st[st.length-1].h+crownOf(state).h};
 function drawGround(){
  const g=groundOf(state.city);if(!g)return;
  const flat=poly=>poly.map(([x,y])=>[x,y,0]);
  // water and green arrive as {pts}, not as bare point lists.
  for(const p of g.green)path(flat(p.pts),GROUND_GREEN,null,0);
  for(const p of g.water)path(flat(p.pts),GROUND_WATER,null,0);
  // A way with a width tag in the harvest is a carriageway polygon, not a
  // line. Filling it is what puts the big boulevards in the drawing.
  for(const w of g.ways)path(flat(w.pts),GROUND_ROAD,null,0);
  ctx.strokeStyle=GROUND_ROAD;ctx.lineJoin='round';ctx.lineCap='round';
  for(const r of g.roads){
   const w=Math.max(.4,Math.min(3.2,(g.roadW[r.cls]??6)*scale));
   if(r.pts.length<2)continue;
   ctx.beginPath();
   for(let i=0;i<r.pts.length;i++){const p=project(r.pts[i][0],r.pts[i][1],0);i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])}
   ctx.lineWidth=w;ctx.stroke();
  }
  ctx.lineJoin='miter';ctx.lineCap='butt';
 }
 function drawCity(list){
  for(const b of list){
   const h=b.h,ink=inkFor(h);
   let ring=b.ring;
   if(ringArea(ring)<0)ring=[...ring].reverse();
   /* A contact shadow on the plate. Without it a mass meets the ground on a
      hard edge and hovers — the other half of what made the city look like
      furniture. The light direction is the same one that already decides which
      wall is lit, so the shadow agrees with the shading instead of being
      decoration laid on top of it. It is a drawing convention, not a solar
      calculation: the sun position in this model is the sun-study desk's, and
      this sheet has no date. */
   const lx=-LIGHT[0],ly=-LIGHT[1],ln=Math.hypot(lx,ly)||1;
   /* A CONTACT shadow, not a cast one. Offsetting by height meant Shenzhen's
      599 m tower threw a 96 m slab of #10151a — darker than the plate itself
      — straight across the street grid, and forty-odd neighbours did the same
      at smaller scale. That is a large part of why the floor read as a hole
      even after the plate was brought up to a visible value: the map was
      being painted over in black by the buildings standing on it. A contact
      shadow belongs to the building's own footprint and must never exceed it. */
   let bx0=Infinity,bx1=-Infinity,by0=Infinity,by1=-Infinity;
   for(const [x,y]of ring){if(x<bx0)bx0=x;if(x>bx1)bx1=x;if(y<by0)by0=y;if(y>by1)by1=y}
   const off=contactOffset(h,bx1-bx0,by1-by0);
   path(ring.map(([x,y])=>[x+lx/ln*off,y+ly/ln*off,0]),SHADOW,null,0);
   // Roof first, then the walls that meet it, so the parapet sits on the edge.
   const parapet=Math.min(1.6,state.span*.03);
   path(inset(ring,parapet).map(([x,y])=>[x,y,h]),roofTone(h),null,0);
   path(ring.map(([x,y])=>[x,y,h]),roofTone(h),ink,.7);
   for(let i=0;i<ring.length;i++){
    const a=ring[i],d=ring[(i+1)%ring.length];
    const ex=d[0]-a[0],ey=d[1]-a[1];
    const nx=ey,ny=-ex;                          // outward normal, ccw ring
    if(!visibleWall(a,d,yaw))continue;  // faces away: not drawn
    const lit=(nx*LIGHT[0]+ny*LIGHT[1])/(Math.hypot(nx,ny)||1);
    const tone=toneFor(lit);
    path([[a[0],a[1],0],[d[0],d[1],0],[d[0],d[1],h],[a[0],a[1],h]],tone,ink,.7);
    /* Storey texture. Spacing is taken from the building's own height so the
       bands are even on a 40 m shed and on a 200 m tower, which is what makes a
       wall read as a wall with depth rather than a filled polygon. It is a
       graphic texture, not a floor count: nothing in the harvested data carries
       storeys, and claiming a height in floors would be a number nobody sourced.
       Only on faces tall enough on screen to carry it. */
    if(h*scale>46){
     const step=Math.max(3,h/Math.max(1,Math.round(h/4)));
     ctx.strokeStyle=BAND;ctx.lineWidth=.5;
     for(let z=step;z<h;z+=step){
      const p=project(a[0],a[1],z),q=project(d[0],d[1],z);
      ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();
     }
    }
    /* Vertical articulation on a wide face. Horizontal banding alone leaves a
       130 m facade as one unmodulated plane, and a wide unmodulated plane with
       a light top is exactly a tabletop. Bays are spaced in metres like the
       bands, so a long block reads as a long building rather than a bench.
       Same caveat as the bands: a graphic rhythm, not a curtain-wall schedule. */
    const wlen=Math.hypot(ex,ey);
    if(wlen*scale>54){
     const bay=Math.max(6,wlen/Math.max(1,Math.round(wlen/9)));
     ctx.strokeStyle=BAND;ctx.lineWidth=.5;
     for(let s=bay;s<wlen;s+=bay){
      const t=s/wlen,mx=a[0]+ex*t,my=a[1]+ey*t;
      const p=project(mx,my,0),q=project(mx,my,h);
      ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();
     }
    }
   }
   /* Ground contact. Without it the wall runs into the plate with no edge and
      the building hovers; with it the building stands. */
   path(ring.map(([x,y])=>[x,y,0]),null,ink,.7);
   // A coping line on the tall ones, so a roof edge reads against the sky and
   // not as a smear of fill.
   if(h>=40)path(ring.map(([x,y])=>[x,y,h]),null,ink,.8);
  }
 }
 /* The plate boundary. Hoisted above both views because the plan clips its
    ground to exactly this edge — a plan that drew roads past the harvested
    radius would be drawing data it does not have. */
 const disc=()=>{ctx.beginPath();for(let i=0;i<=72;i++){const a=i/72*Math.PI*2,p=project(Math.cos(a)*city.radius,Math.sin(a)*city.radius,0);i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])}ctx.closePath()};

 /* ── PLAN ──────────────────────────────────────────────────────────────
   The whole reason this view exists. Everything below is in service of one
   claim: the floor should read as an OpenStreetMap of the place the user
   chose, at a scale a person can hold in their head.

   Three things carry that, and none of them is a colour value:

   1. The ground is drawn first and nothing is drawn over it that could hide
      it. In the orbit the neighbours' walls are what buried it.
   2. Neighbours are FLAT FOOTPRINTS, stepped by height. A plan does not draw
      the walls of a building that is not the subject, and the height step is
      enough to read the skyline from above.
   3. The tower's own reach is swept across the real streets as a contour
      diagram. That is the answer to "where does 214 m actually land" — a
      distance field measured off a surveyed grid, with the 50 m contours
      labelled where they cross, not a number in a panel. */
 const REACH=['#241d12','#2e2415','#382b18','#42321b','#4c3a1e'];
 const planTone=h=>h>=180?'#4d5c69':h>=100?'#45535f':h>=50?'#3d4a55':h>=20?'#35414b':'#2d3841';

 /* The sweep itself lives in reach.js rather than here, so it can be checked
    against a hand calculation instead of against its own source text. */
 /* The reach. Swept in the sheet's own drawing light, which is the same
    direction that already decides which wall is lit — so the wedge on the map
    agrees with the shading of the model instead of being a second, competing
    idea of where the sun is. This is a drawing convention, not a solar study:
    the sheet has no date, and the sun-study desk is where a date is asked
    for. Bands are nested convex hulls, so painting largest-first is exactly
    the stepping — no polygon boolean needed. */
 function drawReach(){
  const base=profile(state,0);if(ringArea(base)<0)base=[...base].reverse();
  const ln=Math.hypot(LIGHT[0],LIGHT[1])||1;
  const lx=LIGHT[0]/ln,ly=LIGHT[1]/ln;
  const ext=ext_();
  const band=d=>sweptHull(base,d,lx,ly);
  // Largest first: the bands are nested convex hulls, so painting from the
  // outside in IS the stepping. No polygon boolean needed.
  const steps=reachSteps(ext);
  for(let k=steps.length-1;k>=0;k--){
   path(band(steps[k]).map(([x,y])=>[x,y,0]),REACH[Math.min(k,REACH.length-1)],null,0);
  }
  ctx.font='10px "IBM Plex Mono",monospace';ctx.textAlign='left';
  for(let k=0;k<steps.length;k++){
   const d=steps[k],poly=band(d);
   path(poly.map(([x,y])=>[x,y,0]),null,'#f59e0b',1);
   /* The figure printed is the offset the band was ACTUALLY swept to, not the
      50 m multiple it was rounded from. A 214.4 m tower drew its last contour
      at 214.4 m and printed "250 m" — the drawing and the number disagreeing,
      which is the one thing a dimension may never do. Rounding the label up
      because it was easier to type is how a sheet starts lying.
      Only every second contour is lettered, and the outermost one suppresses
      any contour within 50 m of it: a 214 m tower drew its 200 m and 214 m
      contours 14 m apart, and the two labels landed on top of each other.
      The legend carries the stepping; the contours carry the distance. */
   if(!reachLabelled(d,ext))continue;
   // On the vertex furthest along the light: the only point of the contour
   // guaranteed to be on its own leading edge.
   let best=poly[0],bv=-1e9;
   for(const v of poly){const t=v[0]*lx+v[1]*ly;if(t>bv){bv=t;best=v}}
   const p=project(best[0],best[1],0);
   ctx.fillStyle='#f59e0b';ctx.fillText(Math.round(d)+' m',p[0]+4,p[1]+3);
  }
  ctx.textAlign='left';
 }

 function drawScaleBar(){
  // A round distance that lands near 150 px at the current zoom. Fixed
  // lengths are useless across a 0.5×–1.7× zoom range; this keeps the bar a
  // readable physical size and changes its printed length instead.
  let m=10;for(const q of[10,20,50,100,200,500,1000])if(q*scale<=170)m=q;
  // Pulled left far enough that the end figure and its " m" both fit. The bar
  // is anchored beside the view-foot label, which is the far right of the
  // sheet, so a long bar walked straight off the edge.
  const px=m*scale,x=Math.min(origin[0],W-24-px-24),y=origin[1];
  ctx.strokeStyle='#a2aca9';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(x,y-5);ctx.lineTo(x,y);ctx.lineTo(x+px,y);ctx.lineTo(x+px,y-5);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x+px/2,y);ctx.lineTo(x+px/2,y-3);ctx.stroke();
  ctx.font='10px "IBM Plex Mono",monospace';ctx.fillStyle='#a2aca9';ctx.textAlign='left';
  ctx.fillText('0',x-3,y+13);ctx.fillText(m+' m',x+px,y+13);
 }
 function drawNorth(){
  // North is up because the plan projection ignores yaw entirely — so this is
  // not a decorative compass, it is a statement about the projection, and it
  // would be a lie the moment the projection rotated.
  const x=origin[0],y=Math.max(30,origin[1]-34);
  ctx.strokeStyle='#a2aca9';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(x,y+14);ctx.lineTo(x,y);ctx.stroke();
  ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-3.5,y+6);ctx.moveTo(x,y);ctx.lineTo(x+3.5,y+6);ctx.stroke();
  ctx.font='10px "IBM Plex Mono",monospace';ctx.fillStyle='#a2aca9';ctx.textAlign='center';
  ctx.fillText('N',x,y+25);ctx.textAlign='left';
 }
 function drawPlanSheet(){
  ctx.fillStyle='#0b0e11';ctx.fillRect(0,0,W,H);
  disc();ctx.fillStyle='#1a212a';ctx.fill();
  ctx.save();disc();ctx.clip();
  drawGround();
  ctx.restore();
  disc();ctx.strokeStyle='#2b353d';ctx.lineWidth=1;ctx.stroke();
  for(const m of massings){
   let r=m.ring;if(ringArea(r)<0)r=[...r].reverse();
   path(r.map(([x,y])=>[x,y,0]),planTone(m.h),'#4a5862',.6);
  }
  drawReach();
  const side=state.site/2;
  path([[-side,-side,0],[side,-side,0],[side,side,0],[-side,side,0]],null,'#a2aca9',1);
  let fr=profile(state,0);if(ringArea(fr)<0)fr=[...fr].reverse();
  path(fr.map(v=>[v[0],v[1],0]),'#f59e0b','#f5c46a',1);
  drawScaleBar();drawNorth();
  /* The legend is the scale, stated. Without it four warm bands are a
     gradient the reader has to guess at — and a gradient is exactly what this
     drawing set is not allowed to be anywhere else.

     It sits top-left rather than beside the scale bar because the scale bar's
     anchor is pushed to the far right by the view-foot label, and there was
     not room for a 170 px key out there: both heading and note were being
     clipped by the canvas edge, which is how "Tower shadow on the ground"
     reached the user as "Tower shadow on t". */
  let ly=HEAD+26;const lx=16;
  ctx.font='10px "IBM Plex Mono",monospace';ctx.textAlign='left';
  ctx.fillStyle='#a2aca9';ctx.fillText(tt('v.reach'),lx,ly);ly+=12;
  for(let k=0;k<Math.min(4,REACH.length);k++){
   const lo=k*50,hi=(k+1)*50;
   ctx.fillStyle=REACH[k];ctx.fillRect(lx,ly+2,14,9);
   ctx.strokeStyle='#f59e0b';ctx.lineWidth=.6;ctx.strokeRect(lx+.5,ly+2.5,14,9);
   ctx.fillStyle='#a2aca9';
   ctx.fillText(lo+'–'+(k===3?'+':hi)+' m',lx+20,ly+10);
   ly+=13;
  }
  ctx.fillStyle='#8b918d';ctx.font='9px "IBM Plex Mono",monospace';
  // The note is the longest string on the sheet and the most likely to be
  // clipped, so it is clamped to the field rather than trusted to fit.
  const note=tt('v.reachNote');
  ctx.fillText(W-18>ctx.measureText(note).width?note:tt('v.reachShort'),lx,ly+10);
  ctx.textAlign='left';
 }

 if(city&&planView){
  drawPlanSheet();
  ctx.restore();
  if(footInset>0){ctx.fillStyle='#2c3438';ctx.fillRect(0,fieldBottom,W,1)}
  // The view foot names the gesture this sheet responds to. In plan the drag
  // pans, and a sheet that still says "orbit" is telling the reader to do
  // something that does nothing — the same failure as printing 250 m on a
  // line drawn at 214.
  syncDragHint();
  return;
 }
 if(city){
  /* The ground has to be a value between the sky and the walls, or the city
     floats. It was #0a0d10 against a #111416 page background — four values
     DARKER than the sky behind it, so the plate was invisible and every
     building stood on nothing. That is half of "tables and chairs": a lit slab
     in the dark with no ground to explain what holds it up.

     Sky first, then plate, then buildings, then the amber tower. Four steps,
     no gradients, and the tower the only thing on the sheet with any colour
     in it. */
  ctx.fillStyle='#0b0e11';
  ctx.fillRect(0,0,W,H);
  /* The plate was still only a disc of flat fill, which is the rest of the
     complaint: a black coin. The harvested ground was already in the bundle —
     207 streets, 27 carriageways, 11 water bodies and 96 green areas for
     Bangkok alone, decoded by the very parseGround the Place desk uses — and
     the tower sheet was simply not reading it. So it is drawn here, through
     the same projection the massings use, so the blocks they stand on are the
     blocks that were harvested rather than an invented ground.

     Values by measured relative luminance, not by eye. The first attempt held
     every ground tone under the shadowed wall, and that was the mistake: it
     starved the ground until #121820, which is RGB 18,24,32 — black on a
     monitor — and the plate came out 77% of the sheet with the three ground
     tones making up the rest between them. A ladder that keeps buildings from
     dissolving into the ground does not require the ground to be invisible, and
     optimising the ladder alone is what made the floor look like a hole.

     What is actually load-bearing: sky < plate < shadowed wall, so a massing
     silhouette still separates from the field it stands on. The streets are
     drawn features on a plane rather than the field itself, so they are free
     to be bright — and they have to be, or the map does not read.
     sky .0043, plate .0147, green .0175, water .0155, road .0341. */
  disc();ctx.fillStyle='#1a212a';ctx.fill();
  // Clipped to the plate, so a road that runs off the data ends at the data.
  ctx.save();disc();ctx.clip();
  drawGround();
  ctx.restore();
  disc();ctx.strokeStyle='#2b353d';ctx.lineWidth=1;ctx.stroke();
  drawCity(cityFar);
 }

 /* The tower's own contact shadow, and the reason the model is not floating.

    Every massing in drawCity gets one — a mass that meets the ground on a bare
    edge hovers — and the tower, the only building the sheet is about, was the
    one building that did not. It ended in mid-air with nothing under it while
    every neighbour wore a black hem, and the tower read as suspended over the
    city rather than standing in it.

    Bounded by its own footprint through the same contactOffset the city uses,
    so a 214 m tower lays a 24 m shadow rather than a 34 m one. Measured on the
    built height, not the storey count times the floor-to-floor, so it moves
    when the taper or the level programme does. Drawn before the body so the
    body covers all but the downwind sliver, which is what a contact shadow
    actually shows. */
 const baseRing=profile(state,0);if(ringArea(baseRing)<0)baseRing.reverse();
 if(city){
  const slx=-LIGHT[0],sly=-LIGHT[1],sln=Math.hypot(slx,sly)||1;
  let sx0=Infinity,sx1=-Infinity,sy0=Infinity,sy1=-Infinity;
  for(const [bx,by]of baseRing){if(bx<sx0)sx0=bx;if(bx>sx1)sx1=bx;if(by<sy0)sy0=by;if(by>sy1)sy1=by}
  const soff=contactOffset(total,sx1-sx0,sy1-sy0);
  path(baseRing.map(([bx,by])=>[bx+slx/sln*soff,by+sly/sln*soff,0]),SHADOW,null,0);
 }
 const n=baseRing.length;
 const faces=[];
 for(const l of st){
  const a=profile(state,l.z/total),b=profile(state,(l.z+l.h)/total);
  const retail=l.use==='retail';
  for(let i=0;i<n;i++){
   const j=(i+1)%n;
   const pts=[[...a[i],l.z],[...a[j],l.z],[...b[j],l.z+l.h],[...b[i],l.z+l.h]];
   const depth=pts.reduce((v,q)=>v+project(...q)[2]/4,0);
   faces.push({pts,depth,i,retail,voided:!l.gfa});
  }
 }
 faces.sort((a,b)=>a.depth-b.depth);
 // The face wears the material. It used to wear a computed grey that only
 // encoded which of the four walls it was, which made every choice of
 // cladding look identical from across the room.
 const mat=materialOf(state);
 for(const f of faces){
  const fill=f.voided?'#2a3236':mat.fill;
  path(f.pts,wireframe?null:fill,wireframe?(f.voided?'#4a5459':'#6a797e'):(f.voided?'#4a5459':mat.edge+'70'),wireframe?.4:.45);
 }
 // Material joints: drawn on the faces that are lit, in the material's own ink.
 if(!wireframe){
  const cols=6,rows=Math.max(2,Math.min(14,Math.round(st.length*8/48)));
  for(const f of faces){
   if(f.voided)continue;
   const o=f.pts[0],px=[f.pts[1][0]-o[0],f.pts[1][1]-o[1]],py=[f.pts[3][0]-o[0],f.pts[3][1]-o[1]];
   for(const seg of surfacePattern(state,cols,rows)){
    if(seg[0]==='v')line([o[0]+px[0]*seg[1],o[1]+px[1]*seg[1],o[2]],[o[0]+px[0]*seg[1]+py[0],o[1]+px[1]*seg[1]+py[1],o[2]+py[2]],mat.edge+'55',.4);
    else if(seg[0]==='h')line([o[0]+py[0]*seg[1],o[1]+py[1]*seg[1],o[2]+py[2]*seg[1]],[o[0]+py[0]*seg[1]+px[0],o[1]+py[1]*seg[1]+px[1],o[2]+py[2]*seg[1]],mat.edge+'55',.4);
    else line([o[0]+px[0]*seg[1],o[1]+px[1]*seg[1],o[2]],[o[0]+px[0]*seg[1]+py[0],o[1]+px[1]*seg[1]+py[1],o[2]+py[2]],mat.edge+'40',.35);
   }
  }
 }

 // level lines: the stored schedule, drawn where the schedule puts them
 for(const l of st){
  const p=profile(state,l.z/total);
  path(p.map(v=>[...v,l.z]),null,l.gfa?'#a2aca960':'#f59e0b99',l.gfa?.6:1.4);
 }

 // ── the sky terraces ──────────────────────────────────────────────────────
 // A level that gave part of its plate to open air is drawn as a floor plate
 // with the remainder hatched, so the reader can see which square metres were
 // taken out and which are still for sale. A whole-floor setback draws as an
 // empty band in the shaft with the deck edge on top of it.
 if(!wireframe)for(const l of st){
  if(!(l.garden>0))continue;
  const p=profile(state,l.z/total),kept=l.frac;
  path(p.map(v=>[...v,l.z]),'#1d2a24','#3f7d5e',.7);
  if(kept>0){
   // The plate that survives, inset by the share that was given away, hatched
   // at 45° so it reads as "kept" against the empty deck beside it.
   ctx.save();ctx.beginPath();
   p.forEach((v,i)=>{const q=project(v[0],v[1],l.z);i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1])});
   ctx.closePath();ctx.clip('evenodd');
   ctx.strokeStyle='#f59e0b70';ctx.lineWidth=.6;
   const R=Math.max(p.reduce((a,v,i)=>Math.max(a,Math.hypot(v[0]-p[0][0],v[1]-p[0][1])),0),1);
   for(let d=-R*2;d<R*2;d+=7){
    const A=project(-R+d,-R,l.z),B=project(R+d,R,l.z);
    ctx.beginPath();ctx.moveTo(A[0],A[1]);ctx.lineTo(B[0],B[1]);ctx.stroke()}
   ctx.restore();
  }
  path(p.map(v=>[...v,l.z]),null,'#4fae7d',1.1);
 }

 const sk=state.skin;
 if(sk==='vertical'||sk==='vertical-corner'){
  for(let i=0;i<n;i++)for(let part=1;part<4;part++)for(const l of st){
   if(!l.gfa)continue;
   const a=profile(state,l.z/total),b=profile(state,(l.z+l.h)/total),j=(i+1)%n,t=part/4;
   const skip=(sk==='vertical-corner'&&(part===1||part===3));
   line([a[i][0]*(1-t)+a[j][0]*t,a[i][1]*(1-t)+a[j][1]*t,l.z],
        [b[i][0]*(1-t)+b[j][0]*t,b[i][1]*(1-t)+b[j][1]*t,l.z+l.h],skip?'#6d7a7f50':'#8e9a9e80',.5);
  }
 }
 if(sk==='horizontal'){
  for(const l of st){
   if(!l.gfa)continue;
   const a=profile(state,l.z/total);
   const off=l.use==='retail'?0.35:0.62;
   path(a.map(v=>[...v,l.z+l.h*off]),null,'#9aa6aa66',.55);
  }
 }
 if(sk==='vertical-mech'){
  for(const l of st){
   const a=profile(state,l.z/total),b=profile(state,(l.z+l.h)/total);
   for(let i=0;i<n;i++){const j=(i+1)%n;
    const dim=l.gfa?'#7f8b9050':'#f59e0b90';
    line([...a[i],l.z],[...a[j],l.z],dim,l.gfa?.5:1.1)}
  }
 }
 if(sk==='diagrid'||state.system==='diagrid'){
  const step=8;
  for(let f=0;f<st.length;f+=step){
   const end=Math.min(st.length,f+step);
   const a=profile(state,st[f].z/total),b=profile(state,st[end-1].z/total);
   for(let i=0;i<n;i++){const j=(i+1)%n;
    line([...a[i],st[f].z],[...b[j],st[end-1].z],'#b6c1c7',.9);
    line([...a[j],st[f].z],[...b[i],st[end-1].z],'#a2aca9',.9)}
  }
 }

 const roof=profile(state,1);path(roof.map(v=>[...v,total]),'#758185','#cbd4d6',1);
 const fi=Math.min(Number($('floor').value)-1,st.length-1),lvl=st[fi];
 const slab=profile(state,lvl.z/total);
 path(slab.map(v=>[...v,lvl.z]),null,'#f59e0b',2);
 for(const zone of cornerZones(slab,state))path(zone.map(v=>[...v,lvl.z+.2]),'#f59e0b99','#f59e0b',1);

 const cc=state.core/2;
 path([[-cc,-cc,total+.2],[cc,-cc,total+.2],[cc,cc,total+.2],[-cc,cc,total+.2]],'#414d51','#a2aca9',.7);
 /* The core, ghosted, up the whole height of the orbit.

    Only the roof square was drawn, so the core existed on the building for
    eight pixels at the top and nowhere else — which is exactly why it could
    not be found and had to be explained in a sidebar. Four vertical arrises and
    a band at each lift-zone boundary cost eight lines and put it back: a reader
    can see the column run the full height before they ever press the core view,
    and can see where the groups change.

    Ghosted, not filled. At orbit scale a 14 m core is a few pixels wide; filling
    it would put a dark stripe up the middle of the facade that reads as a
    rendering fault rather than as a room. */
 ctx.save();
 ctx.globalAlpha=.42;
 for(const [gx,gy] of [[-cc,-cc],[cc,-cc],[cc,cc],[-cc,cc]])line([gx,gy,0],[gx,gy,total+.2],'#7d8f99',.6);
 const zfG=coreOf(state,metrics?.rentable??0,occupiedOf(state)).lift.zoneFloors;
 for(let z=0;z<=st.length;z++){
  if(z%zfG)continue;
  path([[-cc,-cc,z*state.height],[cc,-cc,z*state.height],[cc,cc,z*state.height],[-cc,cc,z*state.height]],null,'#7d8f99',.5);
 }
 ctx.restore();

 // ── the crown ─────────────────────────────────────────────────────────────
 // Drawn from crownPlates(), the same table the height and the reserve are
 // computed from. A renderer that drew its own approximation could disagree with
 // the arithmetic, and the whole value of a crown is that it spends real height.
 if(chH>0&&crownPlates(crown).length>1){
  const plates=crownPlates(crown);
  const ring=f=>profile(state,1).map(v=>[v[0]*f,v[1]*f]);
  const led=!!state.led;
  for(let k=0;k<plates.length-1;k++){
   const A=ring(plates[k].f),B=ring(plates[k+1].f);
   const z0=total+plates[k].t*chH,z1=total+plates[k+1].t*chH;
   for(let i=0;i<A.length;i++){
    const j=(i+1)%A.length;
    const pts=[[...A[i],z0],[...A[j],z0],[...B[j],z1],[...B[i],z1]];
    const depth=pts.reduce((v,q)=>v+project(...q)[2]/4,0);
    path(pts,led?'#5a4410':'#5a666b',led?'#f59e0b':'#aab4b7',led?1.3:.7);
   }
  }
  const top=ring(plates[plates.length-1].f);
  path(top.map(v=>[...v,total+chH]),led?'#5a4410':'#67737a',led?'#f59e0b':'#cbd4d6',led?1.6:1);
 }
 // An aviation mast carries obstruction lighting. It is drawn as a mark on the
 // sky, not as structure, because that is the only claim being made about it.
 if(crown.draw==='mast'&&chH>0){
  const top=profile(state,1).map(v=>[v[0]*crownPlates(crown).at(-1).f,v[1]*crownPlates(crown).at(-1).f]);
  const cx=top.reduce((a,v)=>[a[0]+v[0]/top.length,a[1]+v[1]/top.length],[0,0]);
  line([cx[0],cx[1],total+chH],[cx[0],cx[1],total+chH+chH*.22],'#f59e0b',1.8);
 }
 // The half of the city between the camera and the model, drawn last so it
 // stands in front of the tower rather than through it. Without this the whole
 // city would sit behind and every orbit would look identical.
 /* The ground contact itself: the footprint stroked where the walls meet the
    plate. The city already does this for every neighbour, which is why they all
    stand on the ground and the tower did not. Drawn after the body, so the line
    is the last thing laid over the wall foot, and before the near massings, so a
    building between the camera and the model still stands in front of it. */
 path(baseRing.map(([bx,by])=>[bx,by,0]),null,'#c6d0d4',1);

 if(city&&cityNear.length)drawCity(cityNear);

 // Height dimension on the right, graduated every 50 m — the convention every
 // elevation in the world already uses. It sits in a gutter clear of the view
 // tools rather than under them. The overall figure is not repeated here: the
 // head of the viewport already states it, and saying it twice is the same
 // duplication a drawing is supposed to prevent.
 //
 // It measures the crown. A drawing whose dimension stops at the roof while the
 // rail reports a taller building is a drawing that disagrees with its own
 // figures, and the crown is precisely the part of the tower a height allowance
 // is spent on. The roof is marked separately so the occupied height is still
 // readable without a second dimension line.
 const gut=W>900?92:70;
 const rX=W-gut,rY=baseY;ctx.strokeStyle='#59666b';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(rX,rY);ctx.lineTo(rX,rY-ext*.96*scale);ctx.stroke();
 ctx.font='11px "IBM Plex Mono",monospace';ctx.fillStyle='#a2aca9';ctx.textAlign='right';
 // The graduation step is chosen against the space that actually exists rather
 // than fixed at 50 m. On a short viewport 50 m ticks land 30 px apart and the
 // figures collide with each other, which is unreadable in a way a missing label
 // is not. Round the step up to the next 50/100/200 until the labels clear.
 const dimH=Math.max(1,ext*.96*scale);
 const step=dimH<190?200:dimH<420?100:50;
 for(let m=0;m<=ext;m+=step){const y=rY-m*.96*scale;ctx.beginPath();ctx.moveTo(rX-5,y);ctx.lineTo(rX+4,y);ctx.stroke();ctx.fillText(m+' m',rX-9,y-4)}
 const yTop=rY-ext*.96*scale;
 ctx.strokeStyle='#a2aca9';ctx.beginPath();ctx.moveTo(rX,yTop);ctx.lineTo(rX+9,yTop);ctx.stroke();
 if(chH>0){const yRoof=rY-total*.96*scale;
  ctx.strokeStyle='#f59e0b';ctx.beginPath();ctx.moveTo(rX-11,yRoof);ctx.lineTo(rX+4,yRoof);ctx.stroke();
  ctx.fillStyle='#f59e0b';ctx.fillText(total.toFixed(0)+' m roof',rX-9,yRoof+13);ctx.fillStyle='#a2aca9'}
 // The selected-storey label is drawn inside the gutter, never across it. It
 // used to start at a clamped x and run rightwards from there, which on a narrow
 // sheet put "PLAN24 · +100.8 m" straight through the height dimension.
 //
 // It also carries a knockout, the way a dimension is lettered on a real
 // drawing: the label sits over the tower, and amber text straight on a curtain
 // wall is not a label, it is noise. A solid plate in the sheet's own ground
 // colour keeps the datum legible without moving it off the storey it names.
 const label=LANGS.plan[lang]+(fi+1)+' · +'+(lvl.z+state.height*0).toFixed(1)+' m';
 const lw=ctx.measureText(label).width;
 const pp=project(...slab.reduce((a,v)=>v[0]>a[0]?v:a,slab[0]),lvl.z);
 const lx=pp[0]+12+lw<rX-14?pp[0]+12:Math.min(rX-14-lw,W-6);
 ctx.fillStyle='#111416';
 ctx.fillRect(lx-3,pp[1]-5-9,lw+6,13);
 ctx.fillStyle='#f59e0b';
 ctx.textAlign='left';ctx.fillText(label,lx,pp[1]-5);
 ctx.fillRect(pp[0],pp[1],5,5);

 /* The axis triad lives in the bottom-left of the drawing field — the field is
    what ends where the footer band begins, so "bottom" here means the same thing
    it means to the clip.

    Anchoring it to the view foot's row instead looked right in English and broke
    the moment that row was hidden. On a narrow screen the console hides it, its
    rect collapses to zero, `footR.top - vpRect.top - 26` goes negative, and the
    Math.max floor silently threw the triad into the top-left corner — where X
    printed straight across the View button. A floor substituted for a
    measurement that was not there, so nothing reported a problem: the numbers
    were valid, just anchored to nothing.

    The band is already measured for footInset, and it is measured across every
    in-flow child, so it is right whether or not any single row happens to be on
    screen. The right-hand label is still avoided when it exists and dropped for
    the left margin when it does not — the ruler owns the right edge, so guessing
    right is how the triad ends up under the scale. */
 ctx.strokeStyle='#a2aca9';ctx.fillStyle='#a2aca9';
 for(const[dx,dy,label]of[[25,8,'X'],[-18,12,'Y'],[0,-26,'Z']]){ctx.beginPath();ctx.moveTo(...origin);ctx.lineTo(origin[0]+dx,origin[1]+dy);ctx.stroke();ctx.fillText(label,origin[0]+dx-4,origin[1]+dy+(dy<0?-4:13))}
 ctx.restore();
 /* The rule where the drawing field ends. The sheet draws it rather than the
    footer, because the footer is sometimes hidden and the field edge never is. */
 if(footInset>0){ctx.fillStyle='#2c3438';ctx.fillRect(0,fieldBottom,W,1)}
}
let drag=null;
canvas.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);learned()};
// The gesture hint is a signifier for the first visit. Once the reader has
// dragged, it has done its job, and its band is drawing height given back.
function learned(){const v=document.querySelector('.viewport');if(v&&!v.classList.contains('handled')){v.classList.add('handled');requestAnimationFrame(drawTower)}}
canvas.onpointermove=e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag={x:e.clientX,y:e.clientY};
 // In plan the drag pans the sheet rather than orbiting it. Orbiting a top
 // -down drawing has no meaning, and leaving the drag live there would swing a
 // map nobody believes is rotating. In the core view the horizontal drag still
 // orbits, because the core is a solid in space and its plan reads at any angle;
 // the vertical drag walks the window up the column, which is the same gesture
 // as panning a tall drawing and is the only way to see the top of a 600 m core
 // without a scrollbar.
 if(view==='plan'){panX+=dx;panY+=dy}
 else{yaw+=dx*.01;if(view==='core')corePan-=dy}
 drawTower()};
canvas.onpointerup=canvas.onpointercancel=()=>drag=null;
canvas.onkeydown=e=>{
 if(view==='plan'&&e.key.startsWith('Arrow')){e.preventDefault();const k=34;
  if(e.key==='ArrowLeft')panX-=k;if(e.key==='ArrowRight')panX+=k;
  if(e.key==='ArrowUp')panY-=k;if(e.key==='ArrowDown')panY+=k;drawTower();return}
 if(view==='core'&&e.key.startsWith('Arrow')){e.preventDefault();const k=state.height*3;
  if(e.key==='ArrowLeft')yaw-=.1;if(e.key==='ArrowRight')yaw+=.1;
  if(e.key==='ArrowUp')corePan+=k;if(e.key==='ArrowDown')corePan-=k;drawTower();return}
 if(['ArrowLeft','ArrowRight','+','-'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')yaw-=.1;if(e.key==='ArrowRight')yaw+=.1;if(e.key==='+')zoom=Math.min(1.7,zoom+.1);if(e.key==='-')zoom=Math.max(.5,zoom-.1);drawTower()}};
$('zoomIn').onclick=()=>{if(view==='core'){coreZoom=Math.min(6,coreZoom*1.35)}else zoom=Math.min(1.7,zoom+.1);drawTower()};
$('zoomOut').onclick=()=>{if(view==='core'){coreZoom=Math.max(.05,coreZoom/1.35)}else zoom=Math.max(.5,zoom-.1);drawTower()};
$('homeView').onclick=()=>{yaw=-.65;zoom=1;neighbourhood=false;view='orbit';panX=0;panY=0;corePan=0;coreZoom=1;$('cityView').setAttribute('aria-pressed','false');$('planView').setAttribute('aria-pressed','false');$('coreView').setAttribute('aria-pressed','false');stopCoreLoop();syncDragHint();drawTower()};
/* Plan is a mode, not a modifier. Turning on the neighbourhood framing implies
   the orbit again, because those two answer different questions and stacking
   them produced a sheet that was neither a plan nor a perspective. */
function syncDragHint(){const h=document.querySelector('[data-i18n="v.drag"]');if(h)h.textContent=tt(view==='plan'?'v.pan':view==='core'?'v.coreDrag':'v.drag')}
$('planView').onclick=()=>{view=view==='plan'?'orbit':'plan';panX=0;panY=0;zoom=1;
 if(view==='plan')neighbourhood=false;
 $('planView').setAttribute('aria-pressed',String(view==='plan'));
 $('cityView').setAttribute('aria-pressed','false');stopCoreLoop();syncDragHint();drawTower()};
/* The core is a view, not a zoom preset. Pressing it releases the tower's skin
   and starts the cars; pressing it again puts the skin back, because a reader
   who has seen where the core is still wants to look at the building. The clock
   restarts with the view so the cars begin at grade rather than wherever the
   last orbit left them, and it stops on the way out rather than idling at 60
   frames a second behind a sheet nobody is reading. */
$('coreView').onclick=()=>{const on=view!=='core';
 view=on?'core':(neighbourhood?'orbit':'orbit');panX=0;panY=0;
 if(on){zoom=1;coreZoom=1;neighbourhood=false;$('cityView').setAttribute('aria-pressed','false');$('planView').setAttribute('aria-pressed','false')}
 $('coreView').setAttribute('aria-pressed',String(on));
 syncDragHint();
 if(on)startCoreLoop();else stopCoreLoop();
 drawTower()};
$('cityView').onclick=()=>{neighbourhood=!neighbourhood;zoom=1;
 if(neighbourhood&&view==='plan'){view='orbit';panX=0;panY=0;$('planView').setAttribute('aria-pressed','false')}
 $('cityView').setAttribute('aria-pressed',String(neighbourhood));syncDragHint();drawTower()};
$('wire').onclick=()=>{wireframe=!wireframe;$('wire').setAttribute('aria-pressed',wireframe);drawTower()};
/* Redraw on resize, comparing like with like: the observer watches the canvas
   and drawTower measures the same canvas, so the guard actually converges.
   Redraws are also coalesced into one animation frame. */
const ro=new ResizeObserver(entries=>{
 const box=entries[0].contentRect;
 const w=Math.round(box.width),h=Math.round(box.height);
 if(w===drawn.w&&h===drawn.h)return;
 if(pendingRaf)return;
 pendingRaf=true;
 requestAnimationFrame(()=>{pendingRaf=false;drawn={w:0,h:0};drawTower()});
});
ro.observe(canvas);
$('reset').onclick=()=>{$('studyName').value='';$('studyNote').value='';resetBrief();restoreEnvironmentStudy();state={...defaults};yaw=-.65;zoom=1;$('floor').value=24;changed();toast(tt('s.reset'))};

/* ── search ───────────────────────────────────────────────────────────── */
/* The search is ~160 full evaluations. Run it in slices that yield to the
   browser between batches so the tab stays responsive and the progress is
   visible — a frozen page is worse than a slow one. */
let searchToken=0,searchActive=false;
const SLICE_MS=8;
function shareSearch(objective){
 try{history.replaceState(null,'','?regime='+encodeURIComponent(state.regime)+'&objective='+encodeURIComponent(objective)+location.hash)}catch{}
}
function runSearch(){
 const objective=$('objective').value;
 const token=++searchToken;searchActive=true;
 searchRun=null;alternatives=[];
 const started=performance.now();
 const plan=searchPlan(state);
 const results=[];let i=0;
 const progress=document.createElement('div');progress.className='empty';
 $('searchResults').replaceChildren(progress);
 // Results are shareable: the rules that produced them go in the query string.
 shareSearch(objective);
 const slice=()=>{
  if(token!==searchToken)return;
  const sliceStart=performance.now();
  do{results.push(scoreCandidate(plan.list[i++],objective))}
  while(i<plan.list.length&&performance.now()-sliceStart<SLICE_MS);
  const done=i/plan.list.length;
  progress.replaceChildren();
  const pct=document.createElement('span');pct.className='data';pct.textContent=Math.round(done*100)+'%';
  const note=document.createElement('p');note.textContent=`${i} / ${plan.list.length} ${tt('s.tested')}`;
  progress.append(pct,note,ruleMark(done));
  if(i<plan.list.length){setTimeout(slice,0);return}
  finishSearch(results,plan,$('objective').value,performance.now()-started);
 };
 slice();
}

function applyCandidate(candidate){
 state={...candidate.state,objective:state.objective};update();
 if(searchRun){exploreFamily=state.family;renderSearch()}
 toast(tt('s.applied'));
 $('studio').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
}
function finishSearch(results,plan,objective,elapsed){
 searchActive=false;
 alternatives=rerank(results,objective);
 searchRun={plan,objective,elapsed,results};
 shareSearch(objective);
 renderSearch();
}
// Split from the run so a language change redraws exactly the same numbers
// instead of recomputing them: the candidates are language-independent, only
// the words around them are not.
function renderSearch(){
 const focus=studyFocus();
 const {plan,objective,elapsed}=searchRun;
 const ranking=objectiveInert(state)?tt('s.rankingCompetition'):tt('s.objective.'+objective);
 const blended=regimes[state.regime].heightPull>0&&regimes[state.regime].heightPull<1;
 const seen=new Set();
 const rows=alternatives.filter(r=>{if(seen.has(r.state.family))return false;seen.add(r.state.family);return true}).slice(0,5);
 if(!rows.length){$('searchResults').innerHTML=`<div class="empty"><p>${tt('s.none')}</p></div>`;toast(tt('s.none'));return}
 const best=rows[0];
 let html='<div class="tablewrap"><table><thead><tr>'
  +[tt('s.col.candidate'),tt('s.col.roof'),tt('s.col.gross'),tt('s.col.rentable'),tt('s.col.corners'),tt('s.col.height'),tt('s.col.contribution'),tt('s.col.delta'),...(blended?[tt('s.col.score')]:[]),'']
  .map(h=>`<th scope="col">${h}</th>`).join('')+'</tr></thead><tbody>';
 rows.forEach((r,i)=>{
  const d=r.metrics.contribution-metrics.contribution;
  html+=`<tr class="${r===best?'win':''}"><td>${i+1} / ${tt('fs.'+r.state.family)}</td>`
   +`<td class="numeric">${r.state.taper.toFixed(2)} / ${r.state.twist}°</td>`
   +`<td class="numeric">${num(r.metrics.gross)}</td>`
   +`<td class="numeric">${num(r.metrics.rentable)}</td>`
   +`<td class="numeric">${r.metrics.corners}</td>`
   +`<td class="numeric">${r.metrics.heightTotal.toFixed(0)} m</td>`
   +`<td class="numeric">${money(r.metrics.contribution)}</td>`
   +`<td class="numeric">${d>=0?'+':''}${money(d)}</td>`
   +(blended?`<td class="numeric">${r.score.toFixed(3)}</td>`:'')
   +`<td><button data-candidate="${i}" data-study-focus="ranked:${r.state.family}">${tt('s.col.apply')} ↗</button></td></tr>`;
 });
 html+=`</tbody></table></div><p class="searchsummary">${plan.examined} ${tt('s.tested')} / ${alternatives.length} ${tt('s.feasible')} / ${plan.examined-alternatives.length} ${tt('s.rejected')}. ${tt('s.target')} ${num(plan.target)} m². ${tt('s.best')} “${ranking}”${plan.heightVariants>1?' · 2 '+tt('s.heightVariant'):''} · ${elapsed.toFixed(0)} ms</p>`;
 if(blended)html+=`<p class="note">${tt('s.normalizedRanking',{o:Math.round((1-regimes[state.regime].heightPull)*100),h:Math.round(regimes[state.regime].heightPull*100)})}</p>`;
 $('searchResults').innerHTML=html;
 document.querySelectorAll('[data-candidate]').forEach(b=>b.onclick=()=>applyCandidate(rows[Number(b.dataset.candidate)]));
 drawStudy();restoreStudyFocus(focus);
}
// The table ranks five rows. These draw the whole run the table was selected
// from, so a reader can see how much of the spread is family and how much is
// roof scale — and can put a finger on any cell the search actually visited.
function studyFocus(){return $('searchResults').contains(document.activeElement)?document.activeElement.getAttribute('data-study-focus'):null}
function restoreStudyFocus(key){if(key){const el=[...$('searchResults').querySelectorAll('[data-study-focus]')].find(n=>n.getAttribute('data-study-focus')===key);el?.focus({preventScroll:true})}}
function drawStudy(){
 const focus=studyFocus();
 const host=$('searchResults');if(!host||!alternatives.length||!searchRun)return;
 [...host.querySelectorAll('.study-fig')].forEach(n=>n.remove());
 if(!Object.hasOwn(families,exploreFamily))exploreFamily=state.family;
 host.append(familyResponse(alternatives,{contribution:metrics.contribution,family:state.family},tt,lang,
  {width:Math.max(280,Math.min(720,host.clientWidth||720)),row:matchMedia('(max-width:600px), (pointer:coarse)').matches?44:30,selected:exploreFamily,onPick:f=>{exploreFamily=f;drawStudy()}}));
 host.append(lattice(alternatives,exploreFamily,tt,lang,applyCandidate));
 restoreStudyFocus(focus);
}

/* ── studies ──────────────────────────────────────────────────────────── */
// Own keys only: an inherited name such as 'constructor' would otherwise pass and turn every metric into NaN.
const own=(o,k)=>typeof k==='string'&&Object.hasOwn(o,k);
function validState(x){return x&&own(families,x.family)&&own(levelPrograms,x.program)&&own(facadeFamilies,x.skin)&&own(MATERIALS,x.material)&&own(CROWNS,x.crown)&&own(GARDENS,x.garden)&&own(DETAILS,x.detail)&&own(systems,x.system)&&own(regimes,x.regime)
 &&validSolar({...solarDefaults,...x})&&Object.keys(schema).every(k=>Number.isFinite(k==='orientation'?(x[k]??0):x[k])&&(k==='span'?x[k]>=1&&x[k]<300:(x[k]??0)>=schema[k][1]&&(x[k]??0)<=schema[k][2]&&onStep(k,x[k]??0)))}
// A stored value off the slider grid (floors 12.5) evaluates as a different
// building from the one it displays, so it is refused like any other junk.
const onStep=(k,v)=>{const[,min,,step]=schema[k];const n=(v-min)/step;return Math.abs(n-Math.round(n))<1e-6}
// The rebrand renamed both keys. Fall back to the old ones so a language
// choice and a study shelf saved under the previous name survive it.
const readStore=k=>{try{return localStorage.getItem(k)}catch{return null}};
// Studies saved before the crown and the terrace existed carry no record of
// either. Filling in the control values is the honest reading of such a study —
// it was made with a flat roof and no terrace — and rejecting it would throw
// away the reader's own work because the model grew two switches.
const withDefaults=x=>{const y={...defaults,...x};if(!own(CROWNS,y.crown))y.crown='flat';if(!own(GARDENS,y.garden))y.garden='none';if(!own(DETAILS,y.detail))y.detail='drained-cavity';if(typeof y.led!=='boolean')y.led=false;return y};
try{const data=JSON.parse(readStore('formHypesStudies')??readStore('formYieldStudies')??'[]');studies=Array.isArray(data)?data.map(s=>s&&s.state&&typeof s.state==='object'&&!Array.isArray(s.state)?{...s,state:withDefaults(s.state)}:s).filter(x=>x&&validState(x.state)).slice(0,8):[]}catch{studies=[]}
function persist(){try{localStorage.setItem('formHypesStudies',JSON.stringify(studies));return true}catch{return false}}
let referenceStudy=null;
function currentStudy(){return {version:2,name:cleanStudyName($('studyName')?.value),note:cleanStudyNote($('studyNote')?.value),state:{...state},brief:getBriefStudy(state).inputs,environment:getEnvironmentStudy()}}
function renderDecisionStudy(){
 const c=DECISION_I18N[lang],host=$('decisionDesk');if(!host)return;
 for(const [id,key]of [['studyNameLabel','name'],['studyNoteLabel','note'],['saveNamed','save'],['pinStudy','pin'],['importStudy','import'],['clearReference','removeReference']])$(id).textContent=c[key];
 $('importScope').textContent=c.importScope;$('referenceSession').textContent=c.session;
 $('clearReference').hidden=!referenceStudy;
 renderDecision({host,lang,reference:referenceStudy,current:currentStudy(),label:s=>tt('fs.'+s.family)+' / '+s.floors,checkStatus:m=>m.valid?tt('m.feasible'):m.reasons.map(r=>tt('m.reason.'+r)).join(' · '),inputLabel:(key,value)=>schema[key]?tt(schema[key][0])+': '+value+' '+schema[key][4]:key==='regime'?c.fieldRegime+': '+tt('regime.'+value+'.label'):key==='city'?c.fieldCity+': '+tt('sun.'+value):c.fieldLed+': '+(value?c.yes:c.no)});
}
function renderStudies(){
 $('savedStudies').replaceChildren();
 if(!studies.length){const p=document.createElement('p');p.className='note';p.textContent=tt('s.emptyStudies');$('savedStudies').append(p)}
 studies.forEach((study,i)=>{
  const d=document.createElement('div');d.className='saved';
  const b=document.createElement('button');
  b.textContent=`${i+1}. ${study.name?study.name+' / ':''} ${tt('f.'+study.state.family)} / ${tt('regime.'+study.state.regime+'.label')} / ${money(evaluate(study.state).contribution)}`;
  b.onclick=()=>{if(!validateEnvironment(study.environment?.inputs??{})||!restoreBriefInputs(study.brief??study.site??{})){toast(tt('s.restoreFail'));return}restoreEnvironmentStudy(study.environment);if($('studyName'))$('studyName').value=study.name||'';if($('studyNote'))$('studyNote').value=study.note||'';state={...defaults,...study.state};changed();toast(tt('s.restored'))};
  const del=document.createElement('button');del.textContent='×';
  del.setAttribute('aria-label',tt('s.delete')+' '+(i+1));
  del.onclick=()=>{const removed=studies.splice(i,1);if(!persist()){studies.splice(i,0,...removed);toast(tt('s.deleteFail'));return}renderStudies()};
  const compare=document.createElement('button');compare.textContent=DECISION_I18N[lang].compare;compare.setAttribute('aria-label',DECISION_I18N[lang].compare+' '+(study.name||tt('fs.'+study.state.family)));compare.onclick=()=>{referenceStudy=structuredClone(study);renderDecisionStudy();$('decisionDesk').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})};
  d.append(b,del,compare);if(study.note){const note=document.createElement('p');note.className='study-note';note.textContent=study.note;d.append(note)}$('savedStudies').append(d);
 });
}
$('save').onclick=()=>{
 if(studies.length>=8){toast(tt('s.full'));return}
 studies.push({version:1,name:cleanStudyName($('studyName')?.value),note:cleanStudyNote($('studyNote')?.value),brief:getBriefStudy(state).inputs,environment:getEnvironmentStudy(),state:{...state},site:{plot:getBriefStudy(state).inputs.plot,far:getBriefStudy(state).inputs.far},savedAt:new Date().toISOString()});
 if(!persist()){studies.pop();toast(tt('s.saveFail'));return}
 renderStudies();toast(tt('s.saved'));
};

$('saveNamed').onclick=()=>$('save').onclick();
$('pinStudy').onclick=()=>{referenceStudy=structuredClone(currentStudy());renderDecisionStudy();$('decisionDesk').scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})};
$('clearReference').onclick=()=>{referenceStudy=null;renderDecisionStudy()};
$('studyName').oninput=()=>renderDecisionStudy();
$('importStudy').onclick=()=>$('studyFile').click();
$('studyFile').onchange=async()=>{
 const file=$('studyFile').files?.[0];if(!file)return;
 try{if(file.size>1048576)throw Error('size');const study=parseStudyPackage(await file.text(),validState);if(studies.length>=8){toast(tt('s.full'));return}studies.push(study);if(!persist()){studies.pop();toast(tt('s.saveFail'));return}renderStudies();toast(DECISION_I18N[lang].imported)}catch{toast(DECISION_I18N[lang].invalid)}finally{$('studyFile').value=''}
};

/* ── chrome height ─────────────────────────────────────────────────────────
   The canvas is sized as 100vh minus the header and masthead, so that figure
   has to be measured rather than assumed: the masthead wraps to two lines in
   Thai and three in Chinese, and a hard-coded constant silently pushed the
   tower below the fold in both. Written into a custom property so the CSS can
   keep using it, and re-run whenever the language changes the wrapping. */
function measureChrome(){
 const h=document.querySelector('header'),m=document.querySelector('.masthead');
 document.documentElement.style.setProperty('--shell-header',(h?.offsetHeight||40)+'px');
 if(consoleUI){const vp=$('tower')?.parentElement;if(vp)vp.style.minHeight='0px';return}
 const vh=Math.max(window.innerHeight,320);
 document.documentElement.style.setProperty('--chrome',
  (h?h.offsetHeight:46)+(m&&m.offsetHeight?m.offsetHeight:50)+4+'px');
 const vp=$('tower')?.parentElement;
 if(vp)vp.style.minHeight=Math.max(320,vh-(h?h.offsetHeight:46)-(m?m.offsetHeight:50)-4)+'px';
}
addEventListener('resize',()=>{measureChrome();if(searchRun)drawStudy()});
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n}

/* ── the dedication ──────────────────────────────────────────────────────
   Inspired by is not the same sentence as dedicated to, and only one of the
   two was on the site. This is the second one, stated plainly, with the name
   in the script it is written in. Every standing listed here comes from the
   Shenzhen University lecture notice linked at the foot of the block — an
   institutional source, not a flattering one. */
const DED_URL='https://saup.szu.edu.cn/info/1022/1671.htm';
function renderDedication(){
 const box=$('dedication');if(!box)return;
 box.replaceChildren();
 box.append(el('h2',null,tt('r.dedHead')));
 box.append(el('p','ded-body',tt('r.dedBody')));
 box.append(el('p','ded-cred',tt('r.dedCred')));
 const src=el('p','ded-src',tt('r.dedSrc')+' ');
 const a=document.createElement('a');
 a.href=DED_URL;a.target='_blank';a.rel='noopener noreferrer';a.textContent='saup.szu.edu.cn/info/1022/1671';
 src.append(a);
 box.append(src);
}

function renderResearch(){
 $('rLede').textContent=tt('r.lede');
 $('rCredit').textContent=tt('r.credit');
 renderDedication();
 renderReader(lang,{state,onNavigate:desk=>{showTab('studio');consoleUI?.openForTarget(desk);const target=$(desk);if(!target)return;if(target.tagName==='DETAILS')target.open=true;if(!consoleUI)target.scrollIntoView({block:'start'});if(!target.hasAttribute('tabindex'))target.tabIndex=-1;target.focus({preventScroll:true})}});
 const body=$('rBody');body.replaceChildren();
 for(const sec of SECTIONS){
  const s=el('section');
  // 'cont' continues the previous heading instead of opening a new section,
  // which is how the Petronas argument keeps one number for the whole plate.
  if(sec.kind!=='cont')s.append(el('h2',null,tt(sec.key)));
  const paras=Array.isArray(sec.body)?sec.body:[sec.body];
  for(const p of paras)if(p)s.append(el('p',null,tt(p)));
  if(sec.then?.kind==='code'){const pre=el('pre');pre.textContent=sec.then.text;s.append(pre)}
  if(sec.then?.kind==='moved'){
   const tbl=el('table','rtable');const tb=el('tbody');
   for(const[a,b,c]of MOVED){
    const tr=el('tr');
    tr.append(el('td',null,tt(a)),el('td',null,tt(b)));
    const td=el('td');td.append(el('span','ctl-tag',tt(c)));tr.append(td);
    tb.append(tr);
   }
   tbl.append(tb);s.append(tbl);
  }
  if(sec.then?.kind==='regimes'){
   const grid=el('div','regimecards');
   for(const k of REGIME_ORDER){
    const d=el('div');
    d.append(el('h4',null,tt('regime.'+k+'.label')));
    d.append(el('span','reads',tt('regime.'+k+'.reads')));
    d.append(el('p',null,tt('regime.'+k+'.note')));
    grid.append(d);
   }
   s.append(grid);
   s.append(familyTable());
  }
  // A section may carry more than one plate; the order in SECTIONS is the order
  // on the page.
  for(const blk of (Array.isArray(sec.then)?sec.then:[sec.then])){
   if(blk?.kind==='petronas')s.append(petronasPlate());
   if(blk?.kind==='trio')s.append(trioPlate());
   if(blk?.kind==='cores')s.append(coresPlate());
   if(blk?.kind==='timeline')s.append(timelinePlate());
  }
  if(sec.then?.kind==='photos')s.append(photoPlate());
  if(sec.note)s.append(el('p','note',tt(sec.note)));
  body.append(s);
 }
 const src=el('p','srcnote',tt('r.source'));body.append(src);
}

/** The Rub el Hizb, measured by the kernel rather than quoted.
 *  Everything on this plate is read off geometry.js at render time. If the
 *  maths changes, the sentence under the plate changes with it. */
function petronasPlate(){
 const wrap=el('div');
 const SPAN=48;
 const s={...defaults,family:'rub',span:SPAN,aspect:1,system:'column-grid'};
 const m=evaluate(s);
 const rub=profile(s,0);
 const k=Math.sqrt(area(rub)/area(profile({...s,family:'box',span:1},0)));
 const slab={...s,family:'box',span:k};
 const ms=evaluate(slab),box=profile(slab,0);
 const zones=cornerZones(rub,s);

 const measure=p=>{
  const A=area(p);
  const z=cornerZones(p,s);
  const zA=z.reduce((a,q)=>a+area(q),0);
  return{A,P:perimeter(p),z,zA,cd:columnDensity(p,s),conv:isConvex(p),n:p.length};
 };
 const R=measure(rub),B=measure(box);
 const fmt=v=>v.toLocaleString('en-US',{maximumFractionDigits:1});
 const fx=v=>v.toFixed(4);

 // The figures grid — read as a plate schedule, one hairline between cells.
 const figs=el('dl','figs');
 const row=(k,v,sub,up)=>{
  const d=el('div');
  d.append(el('dt',null,RESEARCH_T.rows[k][lang]));
  d.append(el('dd',up?'v up':'v',v));
  if(sub)d.append(el('div','s',sub));
  figs.append(d);
 };
 row('area',fmt(R.A)+' m²',fmt(B.A)+' m² slab');
 row('perim',fmt(R.P)+' m',fmt(B.P)+' m slab',true);
 // Brackets matter here: R.P/R.A.toFixed(4) divides by the *string*, which
 // happens to land near the right number at full float precision and prints
 // ten ugly decimals. Four places, two decimal places.
 row('shape',fx(R.P/R.A),fx(B.P/B.A)+' slab');
 row('daylit',(m.daylitFraction*100).toFixed(1)+'%',(ms.daylitFraction*100).toFixed(1)+'% slab',true);
 row('frame','×'+R.cd.multiplier.toFixed(3),'×'+B.cd.multiplier.toFixed(3)+' slab');
 row('corners',String(R.z.length),String(B.z.length)+' slab');
 row('vertices',String(R.n),String(B.n)+' slab');
 row('convex',R.conv?'yes':'no',R.conv?'':RESEARCH_T.rows.convex[lang]);
 row('points','90° · 135°',RESEARCH_T.rows.edge48[lang]);
 row('ratio',RUB_INNER_RATIO.toFixed(7),RESEARCH_T.rows.closedArea[lang]);
 row('edge','(√2−1)/2',RESEARCH_T.rows.closedEdge[lang]);
 // The last cell is the honesty check: the engine's own plate against the
 // average floor area the published record implies for the real tower.
 row('real',fmt(218000/88)+' m²',RESEARCH_T.rows.realFloor[lang]);
 wrap.append(figs);
 wrap.append(el('p','note',RESEARCH_T.liveTag[lang]+' · '+RESEARCH_T.rubHead[lang]));

 // Two plans, one floor area. Drawn from the same kernel, at the same scale.
 const plates=el('div','plates');
 const draw=(p,cap)=>{
  const fig=el('figure');
  const b=Math.max(...p.flat().map(Math.abs))*1.14,sc=86/b;
  const pts=p.map(([x,y])=>`${(100+x*sc).toFixed(2)},${(96+y*sc).toFixed(2)}`).join(' ');
  const core=s.core*sc;
  const ns=svgEl('svg',{viewBox:'0 0 200 210'});
  for(let i=20;i<200;i+=20)ns.appendChild(svgEl('path',{d:`M${i} 10 V182 M10 ${i} H190`,stroke:'#dcdeda','stroke-width':'.5'}));
  ns.appendChild(svgEl('polygon',{points:pts,fill:'#eef0ec',stroke:'#191c1b','stroke-width':'1.4'}));
  for(const q of cornerZones(p,s))ns.appendChild(svgEl('polygon',{points:q.map(([x,y])=>`${(100+x*sc).toFixed(2)},${(96+y*sc).toFixed(2)}`).join(' '),fill:'#f59e0b',stroke:'#191c1b','stroke-width':'.5'}));
  ns.appendChild(svgEl('rect',{x:100-core/2,y:96-core/2,width:core,height:core,fill:'none',stroke:'#8b918d','stroke-width':'.8'}));
  const xs=p.map(v=>v[0]),x0=100+Math.min(...xs)*sc,x1=100+Math.max(...xs)*sc;
  const yBot=96+Math.max(...p.map(v=>v[1]))*sc,yd=yBot+15;
  ns.appendChild(svgEl('path',{d:`M${x0.toFixed(1)} ${(yBot+4).toFixed(1)} V${(yd+4).toFixed(1)} M${x1.toFixed(1)} ${(yBot+4).toFixed(1)} V${(yd+4).toFixed(1)}`,stroke:'#a8aeaa','stroke-width':'.5'}));
  ns.appendChild(svgEl('path',{d:`M${x0.toFixed(1)} ${yd.toFixed(1)} H${x1.toFixed(1)}`,stroke:'#191c1b','stroke-width':'.7'}));
  ns.appendChild(svgEl('text',{x:((x0+x1)/2).toFixed(1),y:(yd-5).toFixed(1),'text-anchor':'middle',fill:'#191c1b','font-size':'9','font-family':'IBM Plex Mono,monospace'},fmt(x1-x0)+' m'));
  fig.append(ns);
  const capn=el('figcaption');capn.innerHTML=cap;fig.append(capn);
  return fig;
 };
 plates.append(draw(rub,RESEARCH_T.rubCap[lang]));
 plates.append(draw(box,RESEARCH_T.slabCap[lang]));
 wrap.append(plates);
 return wrap;
}

/** Three towers, one common scale.
 *  The plates are schematic; the dimensions are cited, and the two figures we
 *  derive rather than quote are marked as derived. The point the plate makes
 *  is a single number: two of these buildings bought stability and height, and
 *  still land on four rentable corners. Only the star changed the plate. */
function trioPlate(){
 const wrap=el('div');
 wrap.append(el('p','note',RESEARCH_T.trioHead[lang]));

 // One scale for all three, so the plates can be compared instead of admired.
 const S=1.7333,CXc=110,CYc=104;
 const pts=a=>a.map(([x,y])=>`${(CXc+x*S).toFixed(2)},${(CYc+y*S).toFixed(2)}`).join(' ');

 // The star comes from the kernel, at the span that reproduces the floor area
 // the published record implies for the real tower. Nothing here is traced.
 const st={...defaults,family:'rub',span:60,aspect:1,system:'column-grid'};
 const rub=profile(st,0);

 // The square plate's corner zones: the piece of plate at each corner, which is
// the only part with two exposures.
 const fourCorners=(a,sz)=>{
  const q=[];
  for(const[sx,sy]of [[1,1],[-1,1],[-1,-1],[1,-1]])
   q.push([[sx*a, sy*(a-sz)],[sx*(a-sz), sy*a],[sx*(a-2*sz), sy*a],[sx*a, sy*(a-2*sz)]]);
  return q;
 };

 const T=[
  {cap:RESEARCH_T.trioCapWtc[lang], width:63, half:31.5,
   outline:[[31.5,31.5],[31.5,26.5],[26.5,31.5],[-26.5,31.5],[-31.5,26.5],[-31.5,-26.5],
            [-26.5,-31.5],[26.5,-31.5],[31.5,-26.5]],
   core:[[20.5,13.5],[-20.5,13.5],[-20.5,-13.5],[20.5,-13.5]],
   zones:null,
   coreLab:RESEARCH_T.trioCoreWtc[lang],
   corners:'4', system:RESEARCH_T.trioSysWtc[lang]},
  {cap:RESEARCH_T.trioCapWillis[lang], width:68.6, half:34.3,
   outline:[[34.3,34.3],[-34.3,34.3],[-34.3,-34.3],[34.3,-34.3]],
   core:[[11.45,11.45],[-11.45,11.45],[-11.45,-11.45],[11.45,-11.45]],
   zones:null,
   grid:[[11.45,-34.3,11.45,34.3],[-11.45,-34.3,-11.45,34.3],
         [-34.3,11.45,34.3,11.45],[-34.3,-11.45,34.3,-11.45]],
   coreLab:RESEARCH_T.trioCoreWillis[lang],
   corners:'4', system:RESEARCH_T.trioSysWillis[lang]},
  {cap:RESEARCH_T.trioCapPetronas[lang], width:120, half:60,
   outline:rub, core:null, zones:cornerZones(rub,st),
   coreLab:RESEARCH_T.trioCorePetronas[lang],
   corners:'8', system:RESEARCH_T.trioSysPetronas[lang]}
 ];
 // The two square plates get their corner zones here so all three rows read
 // through the same code path.
 for(const t of T)if(!t.zones)t.zones=fourCorners(t.half,12);

 const rows=el('div','trio');
 for(const [idx,t] of T.entries()){
  const patId=`hatch3-${idx}`;
  const ns=svgEl('svg',{viewBox:'0 0 220 232'});
  for(let i=20;i<200;i+=20)ns.appendChild(svgEl('path',{d:`M${i} 14 V196 M14 ${i} H206`,stroke:'#dcdeda','stroke-width':'.5'}));
  const defs=svgEl('defs');
  const pat=svgEl('pattern',{id:patId,width:'5',height:'5',patternUnits:'userSpaceOnUse'});
  pat.appendChild(svgEl('path',{d:'M0,5 L5,0',stroke:'#8b918d','stroke-width':'.7'}));
  defs.appendChild(pat);ns.appendChild(defs);

  ns.appendChild(svgEl('polygon',{points:pts(t.outline),fill:'#eef0ec',stroke:'#191c1b','stroke-width':'1.4'}));
  if(t.grid)for(const g of t.grid)
   ns.appendChild(svgEl('path',{d:`M${g[0]} ${g[1]} L${g[2]} ${g[3]}`,stroke:'#8b918d','stroke-width':'.6'}));
  if(t.core)ns.appendChild(svgEl('polygon',{points:pts(t.core),fill:`url(#${patId})`,stroke:'#585e5b','stroke-width':'.8'}));
  for(const z of t.zones)ns.appendChild(svgEl('polygon',{points:pts(z),fill:'#f59e0b',stroke:'#191c1b','stroke-width':'.5'}));

  // overall dimension, witness lines off the plate — AGS Appendix D practice
  const xs=t.outline.map(v=>v[0]);
  const x0=CXc+Math.min(...xs)*S,x1=CXc+Math.max(...xs)*S;
  const ys=t.outline.map(v=>v[1]);
  const yB=CYc+Math.max(...ys)*S,yd=yB+14;
  ns.appendChild(svgEl('path',{d:`M${x0.toFixed(1)} ${(yB+4).toFixed(1)} V${(yd+4).toFixed(1)} M${x1.toFixed(1)} ${(yB+4).toFixed(1)} V${(yd+4).toFixed(1)}`,stroke:'#a8aeaa','stroke-width':'.5'}));
  ns.appendChild(svgEl('path',{d:`M${x0.toFixed(1)} ${yd.toFixed(1)} H${x1.toFixed(1)}`,stroke:'#191c1b','stroke-width':'.7'}));
  ns.appendChild(svgEl('path',{d:`M${x0.toFixed(1)} ${yd} l7 -2.5 v5 Z M${x1.toFixed(1)} ${yd} l-7 -2.5 v5 Z`,fill:'#191c1b'}));
  ns.appendChild(svgEl('text',{x:((x0+x1)/2).toFixed(1),y:(yd-5).toFixed(1),'text-anchor':'middle',fill:'#191c1b','font-size':'9','font-family':'IBM Plex Mono,monospace'},t.width+' m'));

  // north — reference symbol, UDS Symbols module
  ns.appendChild(svgEl('circle',{cx:200,cy:24,r:8.5,fill:'none',stroke:'#a8aeaa','stroke-width':'.6'}));
  ns.appendChild(svgEl('path',{d:'M200 15.5 L203.1 30.5 L200 27.7 L196.9 30.5 Z',fill:'#191c1b'}));
  ns.appendChild(svgEl('text',{x:200,y:12.5,'text-anchor':'middle',fill:'#585e5b','font-size':'8','font-family':'IBM Plex Mono,monospace'},'N'));

  const fig=el('figure','trioFig');
  fig.append(ns);
  const cap=el('figcaption');cap.innerHTML=t.cap;fig.append(cap);

  const dl=el('dl','figs trioFigs');
  const row=(k,v)=>{const d=el('div');d.append(el('dt',null,RESEARCH_T[k][lang]));d.append(el('dd','v',v));dl.append(d)};
  row('trioWidth',t.width+' m');
  row('trioCorners',t.corners);
  row('trioCore',t.coreLab);
  row('trioSystem',t.system);

  const cell=el('div','trioCell');
  cell.append(fig);cell.append(dl);
  rows.append(cell);
 }
 wrap.append(rows);
 wrap.append(el('p','note',RESEARCH_T.trioVerdict[lang]));
 return wrap;
}

function svgEl(tag,attrs,text){
 const n=document.createElementNS('http://www.w3.org/2000/svg',tag);
 for(const k in attrs)n.setAttribute(k,attrs[k]);
 if(text!=null)n.textContent=text;
 return n;
}

/** His office, his house, his models. Filenames carry the dates; nothing here
 *  is captioned beyond what the frame and the filename actually support. */
/* ── the museum run ──────────────────────────────────────────────────────
   Seven dated stops, one row, chronological left to right because the order
   is the argument. Each drawing shows only the one idea that made the next
   possible: the frame coming out of the wall, the room made square for the
   tenant, the glass hung outside the piers, the slab leaving the column, the
   core arriving in the middle. Schematic throughout — these are not being
   compared by size, they are being read as a sequence of decisions. */
function timelinePlate(){
 const wrap=el('div','tl');
 const NODES=RESEARCH_T.timeline, AM='#f59e0b', GY='#b9bfbb', INK='#191c1b';
 const ax=el('div','tl-axis');
 const strip=el('div','tl-strip');

 // One node. The diagram is drawn in a 150x96 box with the same conventions as
 // the six-system strip: grey envelope, amber structure, hatching for bearing.
 const draw=(kind,ns)=>{
  const ln=(x1,y1,x2,y2,s,w)=>svgEl('line',{x1,y1,x2,y2,stroke:s||GY,'stroke-width':w||'.7'});
  const rect=(x,y,w,h,f,s)=>svgEl('rect',{x,y,width:w,height:h,fill:f||'none',stroke:s||GY,'stroke-width':'.7'});
  const hatch=(x,y,w,h,gap)=>{let d='';for(let i=-h;i<w;i+=gap||5)d+=`M${(x+i).toFixed(1)} ${y+h} L${(x+i+h).toFixed(1)} ${y} `;return svgEl('path',{d,stroke:GY,'stroke-width':'.5'})};
  const add=n=>ns.appendChild(n);

  if(kind==='skeleton'){                 // frame inside, masonry still holding on
   add(rect(14,16,122,64));
   add(hatch(14,16,16,64)); add(hatch(120,16,16,64));
   let g='';
   for(let i=1;i<5;i++)for(let j=1;j<3;j++)g+=`M${14+i*122/5} 16 V80 M14 ${16+j*64/3} H136 `;
   add(svgEl('path',{d:g,fill:'none',stroke:AM,'stroke-width':'.8'}));
   for(let i=1;i<5;i++)for(let j=1;j<3;j++)add(svgEl('rect',{x:14+i*122/5-1.6,y:16+j*64/3-1.6,width:3.2,height:3.2,fill:AM}));
  }
  if(kind==='daylight'){                 // a square room, two windows, one dark corner
   add(rect(24,14,102,66));
   add(rect(24,14,102,66,'none',INK));
   add(svgEl('rect',{x:24,y:38,width:34,height:9,fill:'#eef2f4',stroke:INK,'stroke-width':'.7'}));
   add(svgEl('rect',{x:70,y:38,width:34,height:9,fill:'#eef2f4',stroke:INK,'stroke-width':'.7'}));
   add(hatch(112,14,14,14));             // the corner nobody would pay rent for
   add(svgEl('path',{d:'M24 38 V47 M58 38 V47 M70 38 V47 M104 38 V47',stroke:'#e9eae7','stroke-width':'1.4'}));
  }
  if(kind==='essay'){                    // a printed page, in the year it was free to read
   add(rect(34,10,82,74,'#f4f4f1'));
   add(svgEl('path',{d:'M46 34 q0-12 12-12 q-8 2-8 7 q0 4 5 5 q-5 1-5 5 q0 4 4 6 q-8 0-8-11 Z',fill:AM}));
   let t='';
   for(let i=0;i<7;i++)t+=`M68 ${30+i*7} H${i===6?92:106} `;
   add(svgEl('path',{d:t,stroke:GY,'stroke-width':'1.5'}));
  }
  if(kind==='glass'){                    // brick piers behind, glass hung outside them
   add(hatch(26,10,20,74)); add(hatch(74,10,20,74)); add(hatch(112,10,20,74));
   add(rect(26,10,20,74)); add(rect(74,10,20,74)); add(rect(112,10,20,74));
   add(rect(14,10,122,74,'#eef2f4',AM));
   let g='';
   for(let i=1;i<4;i++)g+=`M${14+i*122/4} 10 V84 `;
   for(let j=1;j<4;j++)g+=`M14 ${10+j*74/4} H136 `;
   add(svgEl('path',{d:g,fill:'none',stroke:AM,'stroke-width':'.7'}));
  }
  if(kind==='frame'){                     // the whole wall is glass, and the frame IS the wall
   add(rect(14,10,122,74,'#eef2f4',AM));
   let g='';
   for(let i=1;i<4;i++)g+=`M${14+i*122/4} 10 V84 `;
   for(let j=1;j<4;j++)g+=`M14 ${10+j*74/4} H136 `;
   add(svgEl('path',{d:g,fill:'none',stroke:AM,'stroke-width':'.7'}));
   // the aluminium frame reads as a heavier edge, and there is no masonry
   // anywhere in this cell -- that absence is the difference from 1909
   add(svgEl('rect',{x:14,y:10,width:122,height:74,fill:'none',stroke:AM,'stroke-width':'2.2'}));
  }
  if(kind==='cantilever'){               // hexagonal columns; the slab runs past them
   // Slab first, columns second. The other way round the slab fill covers the
   // columns and the hexagon -- which is the whole point of this stop -- vanishes.
   add(svgEl('rect',{x:30,y:16,width:90,height:64,fill:'#eef2f4',stroke:AM,'stroke-width':'1.3'}));
   let t='';
   for(let x=38;x<114;x+=15)t+=`M${x} 16 V80 `;
   add(svgEl('path',{d:t,fill:'none',stroke:AM,'stroke-width':'.5'}));
   let cols='';
   for(const [x,y] of [[52,34],[98,34],[52,62],[98,62]])
    cols+=`M${x} ${y-6} L${x+5} ${y-3} L${x+5} ${y+3} L${x} ${y+6} L${x-5} ${y+3} L${x-5} ${y-3} Z `;
   add(svgEl('path',{d:cols,fill:'#eef2f4',stroke:'#191c1b','stroke-width':'1'}));
  }
  if(kind==='core'){                     // core in the middle, slabs cantilevered off it
   add(rect(14,10,122,74,'#eef2f4',AM));
   let g='';
   for(let i=1;i<5;i++)g+=`M${14+i*122/5} 10 V84 `;
   add(svgEl('path',{d:g,fill:'none',stroke:AM,'stroke-width':'.5'}));
   add(rect(61,32,28,32,'#cfd4d0',INK));
   add(hatch(61,32,28,32,4));
   for(const d of ['M61 32 L14 10','M89 32 L136 10','M89 64 L136 84','M61 64 L14 84'])
    add(svgEl('path',{d,fill:'none',stroke:INK,'stroke-width':'.9'}));
  }
 };

 for(const n of NODES){
  const cell=el('figure','tlCell');
  const ns=svgEl('svg',{viewBox:'0 0 150 96'});
  draw(n.kind,ns);
  cell.appendChild(ns);
  const cap=el('figcaption');
  cap.append(el('span','tlYear',n.year));
  cap.append(el('span','tlBld',n.bld));
  cap.append(el('span','tlWho',n.city+' · '+n.who));
  cap.append(el('span','tlSay',n.say[lang]));
  cell.appendChild(cap);
  strip.appendChild(cell);
  ax.appendChild(el('span','tlTick'));
 }
 wrap.append(ax);
 wrap.append(strip);
 return wrap;
}

/** Six systems, six plans.
 *  The isometric is schematic and says only one thing: where the structure sits
 *  in the volume. The plan underneath says the other thing — how much of the
 *  plate survives once the structure has taken its share. That ratio is the
 *  argument of this whole section, drawn rather than claimed. */
function coresPlate(){
 const wrap=el('div');
 wrap.append(el('p','note',RESEARCH_T.coresHead[lang]));
 const grid=el('div','cores');

 // K is the pixel size of one unit box, not a fraction: at 0.6 the whole
 // isometric collapsed to a single dot above the plan.
 const K=44,BY=94,OX=90;                           // iso scale and base line
 const iso=(x,y,z)=>[OX+(x-y)*0.866*K,BY+(x+y)*0.5*K-z*K];
 const P=(x,y,z)=>iso(x,y,z).map(v=>v.toFixed(1)).join(',');
 const ln=(a,b,c,d,e,f)=>`M${P(a,b,c)} L${P(d,e,f)}`;
 const S=64,PX=58,PY=152;                          // plan square
 const Q=(x,y)=>[(PX+x*S).toFixed(1),(PY+y*S).toFixed(1)];
 const pl=(a,b,c,d)=>`M${Q(a,b)} L${Q(c,d)}`;
 const AM='#f59e0b',GY='#b9bfbb';

 // the eight perimeter positions every modern system puts columns on
 const ring=[[0,0],[0.5,0],[1,0],[1,0.5],[1,1],[0.5,1],[0,1],[0,0.5]];
 const corners=[[0,0],[1,0],[1,1],[0,1]];

 const SYS={
  // every edge of the envelope is structure, so the envelope cannot be opened
  masonry:h=>corners.flatMap(([x,y])=>[ln(x,y,0,x,y,h)]).join(' '),
  // a skeleton: columns through the volume, beams across the top and middle
  frame:h=>ring.map(([x,y])=>ln(x,y,0,x,y,h)).join(' '),
  // one core, full height, with braces out to the corners
  braced:h=>ln(0.32,0.32,0,0.32,0.32,h)+' '+ln(0.68,0.32,0,0.68,0.32,h)+' '+
          ln(0.32,0.68,0,0.32,0.68,h)+' '+ln(0.68,0.68,0,0.68,0.68,h),
  // the perimeter is the structure; the core is left as a hole
  tube:h=>ring.map(([x,y])=>ln(x,y,0,x,y,h)).join(' '),
  // a concrete core carries it, the plate simply spans to it
  ccore:h=>ln(0.3,0.3,0,0.3,0.3,h)+' '+ln(0.7,0.3,0,0.7,0.3,h)+' '+
          ln(0.3,0.7,0,0.3,0.7,h)+' '+ln(0.7,0.7,0,0.7,0.7,h),
  // a core too slender to stand alone, reaching out at three levels
  outrigger:h=>ln(0.42,0.42,0,0.42,0.42,h)+' '+ln(0.58,0.42,0,0.58,0.42,h)+' '+
          ln(0.42,0.58,0,0.42,0.58,h)+' '+ln(0.58,0.58,0,0.58,0.58,h)
 };

 for(const e of RESEARCH_T.cores){
  const h=e.h, ns=svgEl('svg',{viewBox:'0 0 180 232'});

  // the envelope, always drawn, so every cell shares one frame of reference
  let wire='';
  for(const [x,y] of ring)wire+=ln(x,y,0,x,y,h)+' ';
  for(const z of [0,h])wire+=ln(0,0,z,1,0,z)+' '+ln(1,0,z,1,1,z)+' '+ln(1,1,z,0,1,z)+' '+ln(0,1,z,0,0,z);
  ns.appendChild(svgEl('path',{d:wire,fill:'none',stroke:GY,'stroke-width':'.55'}));

  let st=SYS[e.kind](h);
  if(e.kind==='braced')for(const [x,y] of corners)st+=` `+ln(0.32,0.32,h,x,y,h);
  if(e.kind==='ccore')for(const [x,y] of ring)st+=` `+ln(x,y,0,x,y,h);
  ns.appendChild(svgEl('path',{d:st,fill:'none',stroke:AM,'stroke-width':'1.7','stroke-linecap':'square'}));

  // horizontal structure, where the system has any
  let bands='';
  if(e.kind==='masonry')bands=ln(0,0,h,1,0,h)+ln(1,0,h,1,1,h)+ln(1,1,h,0,1,h)+ln(0,1,h,0,0,h);
  if(e.kind==='frame')for(const z of [h,h/2])bands+=ln(0,0,z,1,0,z)+ln(1,0,z,1,1,z)+ln(1,1,z,0,1,z)+ln(0,1,z,0,0,z);
  if(e.kind==='tube')for(const z of [h,0.75*h,0.5*h,0.25*h])bands+=ln(0,0,z,1,0,z)+ln(1,0,z,1,1,z)+ln(1,1,z,0,1,z)+ln(0,1,z,0,0,z);
  // outriggers: three levels, each arm reaching from the core to the edge
  if(e.kind==='outrigger')for(const f of [0.28,0.58,0.88]){
   const z=h*f;
   bands+=ln(0.42,0.5,z,0,0.5,z)+ln(0.58,0.5,z,1,0.5,z)+ln(0.5,0.42,z,0.5,0,z)+ln(0.5,0.58,z,0.5,1,z);
  }
  if(bands)ns.appendChild(svgEl('path',{d:bands,fill:'none',stroke:AM,'stroke-width':'1.1'}));

  // The plan. This is the half that carries the argument: what the structure
  // leaves of the plate.
  ns.appendChild(svgEl('rect',{x:PX,y:PY,width:S,height:S,fill:'#eef0ec',stroke:'#8b918d','stroke-width':'.7'}));
  let ps='';
  if(e.kind==='masonry'){
   ns.appendChild(svgEl('rect',{x:PX,y:PY,width:S,height:S,fill:'none',stroke:AM,'stroke-width':'7'}));
  }else{
   const cr=e.kind==='outrigger'?[0.42,0.58]:e.kind==='braced'?[0.32,0.68]:e.kind==='ccore'?[0.3,0.7]:[0.36,0.64];
   if(e.kind!=='tube')
    ns.appendChild(svgEl('rect',{x:PX+cr[0]*S,y:PY+cr[0]*S,width:(cr[1]-cr[0])*S,height:(cr[1]-cr[0])*S,
      fill:AM,stroke:'#191c1b','stroke-width':'.5'}));
   else
    ns.appendChild(svgEl('rect',{x:PX+cr[0]*S,y:PY+cr[0]*S,width:(cr[1]-cr[0])*S,height:(cr[1]-cr[0])*S,
      fill:'none',stroke:'#8b918d','stroke-width':'.6','stroke-dasharray':'2 2'}));
   const grid=e.kind==='frame';
   if(grid)for(const f of [0.25,0.5,0.75])ps+=pl(f,0,f,1)+pl(0,f,1,f);
   if(e.kind==='braced')for(const [x,y]of corners)ps+=pl(x,y,0.32,0.32);
   if(e.kind==='outrigger')ps+=pl(0.42,0.5,0,0.5)+pl(0.58,0.5,1,0.5)+pl(0.5,0.42,0.5,0)+pl(0.5,0.58,0.5,1);
   if(ps)ns.appendChild(svgEl('path',{d:ps,fill:'none',stroke:AM,'stroke-width':'1'}));
   const pts=e.kind==='tube'?ring.concat([[0.25,0],[0.25,1],[0.75,0],[0.75,1],[0,0.25],[0,0.75],[1,0.25],[1,0.75]]):ring;
   for(const [x,y] of pts)
    ns.appendChild(svgEl('rect',{x:PX+x*S-2.1,y:PY+y*S-2.1,width:4.2,height:4.2,fill:AM,stroke:'#191c1b','stroke-width':'.4'}));
  }
  ns.appendChild(svgEl('text',{x:PX,y:PY-6,fill:'#585e5b','font-size':'7.5','font-family':'IBM Plex Mono,monospace'},RESEARCH_T.coresPlan[lang]));

  const cell=el('div','coreCell');
  const fig=el('figure');fig.append(ns);
  const cap=el('figcaption');
  cap.append(el('b',null,lang==='zh'?e.sysZh:lang==='th'?e.sysTh:e.sys));
  cap.append(el('span','addr',e.addr+' · '+e.year));
  cap.append(el('span','bld',e.bld));
  cap.append(el('span','say',e.say[lang]));
  fig.append(cap);
  cell.append(fig);
  grid.append(cell);
 }
 wrap.append(grid);
 wrap.append(el('p','note',RESEARCH_T.coresNote[lang]));
 wrap.append(el('p','note source',RESEARCH_T.coresOutrNote[lang]));
 return wrap;
}

/* ── human scale ──────────────────────────────────────────────────────────
   The plan says what the floor area is worth. It does not say what it is like.
   This is a section through one bay, drawn to the level's own floor-to-floor
   height, so the ceiling, the plenum and the glass are at their real sizes. The
   services are drawn where they actually are — above the ceiling, where nobody
   standing on the floor can see them. */
const ECON={services:0.95,specClear:2.9,specFloorToFloor:4.0,lowCeilingPenalty:0.24};

function humanPlate(){
 const wrap=el('div','human');
 const level=stack(state)[Number($('floor').value)-1];
 const f2f=level?.h||state.height, svc=ECON.services, clear=f2f-svc;
 // Scale to the plate rather than the other way round: a 9.6 m storey must not
 // run off the top of the drawing, and the width follows the height so the
 // room keeps its proportions instead of stretching.
 // V capped at 20 (was 26) and a wider label margin, so the dimensions can be
 // set at 11 units and still read at 10 px in a 276 px rail.
 const V=Math.min(20,150/f2f);
 const X0=30, XM=8.5, X1=X0+XM*V, YF=172, YN=YF-f2f*V;   // floor line, slab above
 const yc=YF-clear*V;                            // ceiling, i.e. clear height
 const VW=X1+132, VH=206;
 const ns=svgEl('svg',{viewBox:`0 0 ${VW} ${VH}`});
 const add=(t,a,x)=>{const n=svgEl(t,a);if(x!=null)n.textContent=x;ns.appendChild(n);return n};
 const DIM='#585e5b';

 // the slab you stand on, and the soffit of the slab above
 add('rect',{x:X0,y:YF,width:X1-X0,height:9,fill:'#cfd4d0',stroke:'#585e5b','stroke-width':'.6'});
 add('rect',{x:X0,y:YN-9,width:X1-X0,height:9,fill:'#cfd4d0',stroke:'#585e5b','stroke-width':'.6'});

 // The plenum. Ducts, pipes and cable tray live up here, behind the ceiling,
 // which is the entire point of drawing them at all.
 add('rect',{x:X0,y:YN-8,width:X1-X0,height:yc-(YN-8),fill:'#f2f4f1'});
 const PW=X1-X0;
 add('rect',{x:X0+PW*0.14,y:YN+3,width:PW*0.54,height:11,rx:0,fill:'none',stroke:'#a8aeaa','stroke-width':'.7'});
 add('circle',{cx:X0+PW*0.76,cy:YN+8,r:5.5,fill:'none',stroke:'#a8aeaa','stroke-width':'.7'});
 add('circle',{cx:X0+PW*0.86,cy:YN+8,r:3.6,fill:'none',stroke:'#a8aeaa','stroke-width':'.7'});
 add('path',{d:`M${X0+6} ${YN+8} H${X1-6}`,stroke:'#c2c8c4','stroke-width':'.5','stroke-dasharray':'3 3'});

 // the ceiling: a solid line, and nothing above it visible from the floor
 add('line',{x1:X0,y1:yc,x2:X1,y2:yc,stroke:'#191c1b','stroke-width':'1.6'});
 for(let x=X0;x<X1;x+=7)add('line',{x1:x,y1:yc,x2:x-5,y2:yc+5,stroke:'#8b918d','stroke-width':'.5'});

 // The glass: two panes with a cavity, transoms at storey height, and the slab
 // edges arriving at it. A single heavy line does not read as a curtain wall.
 const GY=V*0.16;                                  // cavity between the panes
 add('rect',{x:X1-GY,y:YN,width:GY,height:YF-YN,fill:'#eef2f4'});
 add('line',{x1:X1-GY,y1:YN,x2:X1-GY,y2:YF,stroke:'#191c1b','stroke-width':'1.1'});
 add('line',{x1:X1,y1:YN,x2:X1,y2:YF,stroke:'#191c1b','stroke-width':'1.1'});
 for(let y=YF-V;y>YN;y-=V)                            // transoms, one per metre
  add('line',{x1:X1-GY,y1:y,x2:X1,y2:y,stroke:'#8b918d','stroke-width':'.6'});
 // the slab soffit meets the glass, and the ceiling too — that is the detail
 // that makes a cantilever possible in the first place.
 add('line',{x1:X1,y1:YF,x2:X1-V*0.34,y2:YF,stroke:'#585e5b','stroke-width':'.7'});
 add('line',{x1:X1,y1:yc,x2:X1-GY-4,y2:yc,stroke:'#585e5b','stroke-width':'.6'});

 // Le Corbusier's Modulor: a filled scale silhouette with the raised hand at 2.26 m.
 const px=X1-46,ey=YF-1.6*V;
 add('path',{d:modulorPath((x,y)=>[px+x*V,YF-y*V]),fill:'#191c1b','fill-rule':'evenodd','data-scale-figure':'modulor'});
 add('circle',{cx:px,cy:ey,r:1.8,fill:'#191c1b'});
 add('path',{d:`M${px} ${ey} L${X1} ${ey-4}`,stroke:'#f59e0b','stroke-width':'.9'});
 add('path',{d:`M${X1} ${ey-4} l-6 -2 v4 Z`,fill:'#f59e0b'});
 // Set in the open room to the left of the figure, clear of the wall and the dimensions.
 add('text',{x:px-8,y:ey+3.5,'text-anchor':'end',fill:'#585e5b','font-size':'11.5','font-family':'IBM Plex Mono,monospace'},'1.60 m eye');

 // dimensions, right-hand side, in the drafting manner
 const dim=(y1,y2,label,off,ly=(y1+y2)/2)=>{
  add('path',{d:`M${X1+off-4} ${y1} H${X1+off+4} M${X1+off} ${y1} V${y2}`,stroke:DIM,'stroke-width':'.5'});
  add('path',{d:`M${X1+off} ${y1} l-2 4 h4 Z M${X1+off} ${y2} l-2 -4 h4 Z`,fill:DIM});
  add('text',{x:X1+off+7,y:ly+3.5,fill:'#191c1b','font-size':'11.5','font-family':'IBM Plex Mono,monospace'},label);
 };
 // Floor-to-floor is labelled at its top, beside the services zone, so it
 // stacks above the clear-height label instead of printing over it.
 dim(YN,YF,f2f.toFixed(2)+' m',8,YN+9);
 dim(yc,YF,clear.toFixed(2)+' m clear',30);
 add('text',{x:X0+6,y:YN+(f2f-clear)*V/2+4,fill:'#585e5b','font-size':'11.5','font-family':'IBM Plex Sans,Arial'},
   tt('h.services'));
 wrap.append(ns);
 // The second line is a sentence; it reads better as text than squeezed into the zone.
 wrap.append(el('p','note',tt('h.hidden')+'. Le Corbusier · Modulor · 1.83 / 2.26 m'));

 // Solar screening uses the selected floor, city and date. Daily exposure
 // bands are geometric comparisons; glazing and rent are separate assumptions.
 const p=profile(state,(level?.z||0)/metrics.height),zones=cornerZones(p,state),gl=glazingSchedule(p,state);
 const list=el('div','glaze');
 let nVision=0,nSolar=0,nDark=0;
 for(const z of zones){
  // cornerZones puts the plate vertex first, so match the zone to its bearing
  const near=gl.reduce((a,b)=>
    Math.hypot(p[b.vertex][0]-z[0][0],p[b.vertex][1]-z[0][1])<
    Math.hypot(p[a.vertex][0]-z[0][0],p[a.vertex][1]-z[0][1])?b:a,gl[0]);
  if(near.key==='vision')nVision++;else if(near.key==='solar')nSolar++;else nDark++;
  const d=el('div','glazeRow');
  d.append(el('span','gz',near.faces.map(f=>f.compass).join(' · ')));
  d.append(el('span','gc '+near.key,tt('h.glass.'+near.key)));
  d.append(el('span','gv',near.equivalentHours.toFixed(2)+' h'));
  list.append(d);
 }
 wrap.append(el('p','note',tt('h.glaze')));
 wrap.append(list);
 if(zones.length)wrap.append(el('p','note source',tt('h.glassCount')
   .replace('{v}',String(nVision)).replace('{s}',String(nSolar)).replace('{d}',String(nDark))));
 return wrap;
}

/* The section depends on the level's clear height, which moves with the plate,
   so it is rebuilt whenever the plan is. */
function drawHuman(){
 const host=$('human');if(!host)return;
 host.replaceChildren(humanPlate());
}

function photoPlate(){
 const grid=el('div','photos');
 for(const[src,key]of RESEARCH_T.photos){
  const fig=el('figure');
  const img=document.createElement('img');
  img.src=src;img.loading='lazy';img.decoding='async';img.alt=tt(key);
  fig.append(img);
  fig.append(el('figcaption',null,tt(key)));
  grid.append(fig);
 }
 return grid;
}

/** The five families at equal floor area, computed live. */
function familyTable(){
 const wrap=el('div');
 wrap.append(el('p','note',RESEARCH_T.equalAreaNote[lang]));
 const base=evaluate(state).gross;
 const rows=Object.keys(families).map(k=>{
  const c={...state,family:k};
  c.span=state.span*Math.sqrt(base/Math.max(evaluate(c).gross,1));
  return{k,m:evaluate(c)};
 }).sort((a,b)=>b.m.contribution-a.m.contribution);
 const tbl=el('table','rtable');
 const head=el('thead'),hr=el('tr');
 for(const k of['familyHead','contributionHead','cornersHead','distinctHead'])hr.append(el('th',null,RESEARCH_T[k][lang]));
 head.append(hr);tbl.append(head);
 const tb=el('tbody');
 for(const{k,m}of rows){
  const tr=el('tr');
  tr.append(el('td',null,tt('f.'+k)));
  const c=el('td','numeric',money(m.contribution));tr.append(c);
  tr.append(el('td','numeric',String(m.corners)));
  const d=el('td','numeric',(m.distinctiveness*100).toFixed(0));tr.append(d);
  tb.append(tr);
 }
 tbl.append(tb);wrap.append(tbl);
 const winner=rows[0],loser=rows[rows.length-1];
 const gapUsd=winner.m.contribution-loser.m.contribution;
 const gapPct=loser.m.contribution>0?((winner.m.contribution/loser.m.contribution-1)*100).toFixed(0):'—';
 wrap.append(el('p','verdict',tt('r.verdict',{a:families[winner.k],b:families[loser.k],p:gapPct,g:money(gapUsd)})));
 return wrap;
}

/* ── the manual ─────────────────────────────────────────────────────────── */
/* The manual is not written down; most of it is read out of the running page.
   The control table comes from schema.js — the same table the sliders were
   built from — so it cannot drift from the model. The self-check asks the
   document what is actually there and prints the difference. */

function renderManual(){
 const M=MANUAL[lang];
 $('manualTitle').textContent=M.title;
 $('manualLede').textContent=M.lede;
 const host=$('manualBody');host.replaceChildren();

 for(const [,head,body] of manualSections(lang)){
  host.append(el('h3',null,head),el('p',null,body));
 }

 // The control table. Groups come from schema.js in rail order, so a control
 // added to the rail appears here on the next open, with its real range.
 // Three columns, not four: a "what it moves" column would need one label per
 // control, and the metric labels are not uniform across the rail — half the
 // figures have no i.m key at all. A column that is empty two thirds of the
 // way down is worse than no column, so the range and the reading of the
 // number are what the manual commits to.
 const t=M.table;
 host.append(el('h3',null,tt('rail.design')));
 const table=el('table','mn-table'),head=el('thead'),hrow=el('tr');
 for(const h of [t.head[0],t.head[1],t.head[2]]){const th=el('th',null,h);th.scope='col';hrow.append(th)}
 head.append(hrow);table.append(head);
 const body=el('tbody');
 for(const group of controlGroups()){
  const rows=controlRows(lang,tt).filter(r=>r.group===group.label);
  if(!rows.length)continue;
  const head2=el('tr','mn-group');
  const th2=el('th',null,t.groups[group.label]);th2.colSpan='3';th2.scope='colgroup';
  head2.append(th2);body.append(head2);
  for(const r of rows){
   const tr=el('tr');
   const name=el('td',null,r.label);
   if(r.kind==='assumption'||r.kind==='relative')name.append(el('span','mn-tag',r.kind==='relative'?t.relative:t.assumption));
   const val=el('td',null,r.range+' · '+r.step);
   tr.append(name,val,el('td',null,r.readAs));body.append(tr);
  }
 }
 table.append(body);host.append(table);

 const c=M.checks;
 $('checkTitle').textContent=c.title;
 $('checkLede').textContent=c.lede;
 $('runCheck').textContent=c.run;
}

function renderSelfCheck(){
 const out=$('checkOut');out.replaceChildren();
 const result=runSelfCheck(document,lang,{tt,workspaces:WORKSPACES,defaults:state,
  // buildRanges() writes one label per schema key at runtime, so the check is
  // handed the list it actually produced rather than scraping the markup.
  builtLabels:Object.keys(schema).filter(k=>document.querySelector(`label[for="${k}"]`)),
  keys:{en:Object.keys(t.en).length,th:Object.keys(t.th).length,zh:Object.keys(t.zh).length}});
 out.classList.toggle('mn-bad',!result.pass);
 for(const c of result.checks){
  const row=el('div','mn-check'+(c.ok?'':' mn-fail'));
  row.append(el('span','mn-mark',c.ok?result.passWord:result.failWord),
   el('span','mn-name',c.label),el('span','mn-detail',c.detail));
  out.append(row);
 }
 // One tally line, and it counts what actually passed. The version here first
 // printed `count / count` unconditionally, so a run with a failing check still
 // read "7 / 7" directly above the word "fail" — the one place a reader would
 // look for reassurance is the last place it may be wrong.
 const passed=result.checks.filter(c=>c.ok).length;
 out.append(el('p','note source',passed+' / '+result.count+' · '+(result.pass?result.ok:result.bad)));
}

$('manualBtn').onclick=()=>{renderManual();$('manualDialog').showModal()};
$('runCheck').onclick=()=>{$('runCheck').disabled=true;renderSelfCheck();$('runCheck').disabled=false};

/* ── method dialog ────────────────────────────────────────────────────── */
function renderMethod(){
 const host=$('methodBody');host.replaceChildren();
 const ps=[
  'r.ch1.b','r.ch3.b','r.ch4.b','r.ch6.b'];
 for(const k of ps)host.append(el('p',null,tt(k)));
 // Formulas mirror evaluate() in model.js; a test holds them to it.
 host.append(el('h3',null,tt('m.rent')),el('p','data',tt('meth.rent')));
 host.append(el('h3',null,tt('m.contribution')),el('p','data',tt('meth.contrib')));
 host.append(el('p','note',tt('meth.limits')));
}

/* ── knowledge dialog ─────────────────────────────────────────────────── */
function kn(tag,text){const n=document.createElement(tag);n.textContent=text;return n}
$('methodBtn').onclick=()=>{renderMethod();$('method').showModal()};
$('knowledgeBtn').onclick=async()=>{
 $('knowledgeDialog').showModal();
 const host=$('knowledgeContent');host.replaceChildren(kn('p',tt('k.loading')));
 try{
  if(!knowledgePack){
   const r=await fetch('knowledge/designon-knowledge.json?v=38eb5f372c');if(!r.ok)throw new Error('x');
   knowledgePack=await r.json();
   if(knowledgePack.schemaVersion!==1||!Array.isArray(knowledgePack.thresholds)||!Array.isArray(knowledgePack.models))throw new Error('y');
  }
  const p=knowledgePack;host.replaceChildren();
  const prov=kn('p',`Source: designon / luma-house, commit ${p.source.commit.slice(0,7)}. Extracted ${p.extractedOn}. ${p.references.length} catalogue entries; ${p.thresholds.length} stored thresholds.`);
  prov.className='note';host.append(prov);
  host.append(kn('h3','Drawing conventions'));
  host.append(kn('p',`${p.graphics.book.organization}, ${p.graphics.book.title} (${p.graphics.book.year}); reviewed pages ${p.graphics.book.reviewedPrintedPages.join(' and ')}.`));
  const ul=document.createElement('ul');p.graphics.rules.forEach(r=>ul.append(kn('li',r)));host.append(ul);
  host.append(kn('h3','Stored reference thresholds'));
  const table=document.createElement('table'),thead=document.createElement('thead'),tr=document.createElement('tr');
  for(const x of['Reference','Stored value','Source scope']){const th=kn('th',x);th.scope='col';tr.append(th)}
  thead.append(tr);table.append(thead);
  const body=document.createElement('tbody');
  for(const t of p.thresholds){const row=document.createElement('tr');row.append(kn('td',t.referenceId),kn('td',`${t.storedValue} ${t.unit}`),kn('td',t.scope));body.append(row)}
  table.append(body);host.append(table);
  host.append(kn('h3','Source discrepancies to resolve'));
  const fnd=document.createElement('ul');p.provenanceFindings.forEach(f=>fnd.append(kn('li',f.note)));host.append(fnd);
  host.append(kn('h3','Building-science methods'));
  for(const m of p.models){host.append(kn('h3',m.title+' / '+m.confidence));host.append(kn('p',m.equation));host.append(kn('p',m.limits));const tr2=kn('p',m.transfer);tr2.className='note';host.append(tr2)}
  host.append(kn('h3','Pinned sources'));
  for(const f of p.source.files){const a=kn('a',f.path+' ↗');a.href=f.url;a.target='_blank';a.rel='noopener';const l=document.createElement('div');l.append(a);host.append(l)}
  host.append(kn('p',p.credit));
 }catch{host.replaceChildren(kn('p',tt('k.fail')))}
};

/* ── exports ──────────────────────────────────────────────────────────── */
$('export').onclick=()=>{$('exportCsv').disabled=!alternatives.length;$('exportDialog').showModal()};
document.querySelectorAll('dialog .close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
function download(name,content,type){
 const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');
 a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 toast(tt('d.toast')+' '+name);
}
$('exportObj').onclick=()=>download('formhypes-'+state.family+'.obj',meshOBJ(state),'text/plain');
$('exportJson').onclick=()=>download('formhypes-study.json',JSON.stringify({
 version:4,study:{name:cleanStudyName($('studyName').value),note:cleanStudyNote($('studyNote').value)},units:{length:'m',area:'m²',currency:'USD',rent:'USD/m²/year',capex:'USD paid once'},tier:'conceptual scenario',
 author:'Dr Non',affiliation:'depa + Axiom',anniversary:'2006–2026',
 source:'Inspired by Dr Non’s MIT classmate Shouheng Chen. Embedded design knowledge after Shouheng Chen, MIT SMArchS 2006. Financial and political readings are extensions.',
 contextStudies:{environment:getEnvironmentStudy(),ground:getLocationStudy(),fengShui:getFengStudy(state),fengPlay:getFengPlayStudy(),brief:getBriefStudy(state),walk:getWalkStudy()},
 regime:regimes[state.regime].label,state,metrics,createdAt:new Date().toISOString()},null,2),'application/json');
$('exportCsv').onclick=()=>download('formhypes-alternatives.csv',[
 'family,regime,structure,floors,span_m,roof_scale,twist_deg,gross_m2,rentable_m2,corner_offices,height_m,total_height_m,distinctiveness,ranking_score,ranking_method,objective,annual_rent_usd,envelope_reserve_usd,structure_reserve_usd,annual_contribution_usd,capex_usd,capex_per_gross_m2,capital_over_contribution_years',
 ...alternatives.map(r=>[r.state.family,r.state.regime,r.state.system,r.state.floors,r.state.span.toFixed(4),r.state.taper,r.state.twist,
  r.metrics.gross.toFixed(2),r.metrics.rentable.toFixed(2),r.metrics.corners,r.metrics.height.toFixed(2),r.metrics.heightTotal.toFixed(2),r.metrics.distinctiveness.toFixed(4),r.score,r.ranking?.method??'raw',searchRun.objective,
  r.metrics.rent.toFixed(2),r.metrics.facadeCost.toFixed(2),r.metrics.structureCost.toFixed(2),r.metrics.contribution.toFixed(2),
  r.metrics.capex.toFixed(2),r.metrics.capexPerM2.toFixed(2),(Number.isFinite(r.metrics.payback)?r.metrics.payback.toFixed(2):'')].join(','))
].join('\n'),'text/csv');

/* ── tabs ─────────────────────────────────────────────────────────────── */
// The hash is the tab, so a link to #research is a link to the research and a
// screenshot of it can be taken without driving the UI. Reading params win over
// a stale #studio hash: that combination is a research link.
/* ── the assembly instructions (landing) ─────────────────────────────── */
function renderAssemblyPage(){
 renderAssembly({host:$('assembly'),lang,langs,langLabel:l=>langMeta[l].label,
  onLang:l=>setLang(l),
  // Entering pushes a history entry, so Back returns to the manual.
  onEnter:()=>{location.hash='studio'},
  onWorkspace:k=>{location.hash='ws-'+k}});
}
function showTab(t,push=true,behavior='smooth'){
 if(t!=='studio'&&t!=='research'&&t!=='manual')t='studio';
 if(t==='manual')renderAssemblyPage();
 document.body.dataset.tab=t;
 document.querySelectorAll('.tabpane').forEach(p=>p.classList.toggle('on',p.id===t));
 document.querySelectorAll('[data-tab]').forEach(x=>{
  const on=x.dataset.tab===t;
  x.classList.toggle('on',on);
  x.setAttribute('aria-selected',String(on));
 });
 const actions=document.querySelector('.actions');
 if(actions)actions.hidden=t!=='studio';
 if(push){
  const url=new URL(location.href);
  if(url.hash!=='#'+t){url.hash=t;history.replaceState(null,'',url);}
 }
 window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':behavior});
 consoleUI?.active(t==='studio');
 if(t==='studio')drawTower();
 if(t==='research')renderResearch();
}
function openFromLocation(behavior='auto'){
 const tab=entryTab(location.search,location.hash);
 if(location.hash.startsWith('#ws-')){showTab('studio',false,behavior);consoleUI?.show(location.hash.slice(4));return}
 const q=new URLSearchParams(location.search);
 if((q.has('reading')||q.has('chapter'))&&tab==='research'&&location.hash!=='#research'){
  const url=new URL(location.href);url.hash='research';history.replaceState(null,'',url);
 }
 showTab(tab,false,behavior);
}
// On a phone the header is one row: wordmark, Studio/Research, language.
// Reset/Save/Export move onto the study shelf so they do not stack over the tower.
function placeActions(){
 const actions=document.querySelector('.actions'),header=document.querySelector('header'),studies=document.querySelector('.studies');
 if(!actions||!header||!studies)return;
 const narrow=matchMedia('(max-width:600px)').matches;
 if(narrow){if(actions.parentElement!==studies)studies.prepend(actions);}
 else if(actions.parentElement!==header)header.append(actions);
}
document.querySelector('.tabs').addEventListener('click',e=>{
 const link=e.target.closest('[data-tab]');
 if(!link)return;
 e.preventDefault();
 showTab(link.dataset.tab);
});
addEventListener('hashchange',()=>{
 const h=location.hash.slice(1);
 // #ws-wind opens the studio on that workspace (the manual's index links here).
 if(h.startsWith('ws-')){showTab('studio',false);consoleUI?.show(h.slice(3));return}
 showTab(h==='research'||h==='manual'?h:(h?'studio':'manual'),false);
});
// Delegated so the binding survives any later markup change in the rail.
document.addEventListener('click',e=>{
 if(e.target.closest('#search'))runSearch();
});

/* ── boot ─────────────────────────────────────────────────────────────── */
try{const l=readStore('formHypesLang')??readStore('formYieldLang');if(langs.includes(l))lang=l}catch{}
// Deep links are applied before the first render, so ?regime=…&objective=…
// opens with the controls already showing the shared study.
let deepRun=false;
try{
 const q=new URLSearchParams(location.search);
 const resolved=resolveRegimeQuery(q.get('regime'));
 if(resolved.regime)state.regime=resolved.regime;
 else if(resolved.unknown)unknownRegime=resolved.unknown;
 if(Object.hasOwn(objectives,q.get('objective')??''))state.objective=q.get('objective');
 deepRun=q.get('run')==='1';
}catch{}
consoleUI=mountConsole({getData:()=>({lang,state,metrics,level:Number($('floor').value),changed:applyDeskPatch}),getBrief:()=>getBriefStudy(state),setBrief:setBriefInputs,onStudyChange:()=>update(),onLevel:level=>{$('floor').value=level;$('floor').oninput()},onLayout:()=>{measureChrome();requestAnimationFrame(()=>{drawTower();if(searchRun)drawStudy()});
 // Explore opened on an empty desk: a heading, a select, a button and a blank
 // panel. The search takes about a second, so it runs on arrival instead.
 if($('consoleShell')?.dataset.task==='compare'&&!searchRun&&!searchActive)runSearch()}});
setLang(lang);
placeActions();
matchMedia('(max-width:600px)').addEventListener('change',placeActions);
if(state.objective)$('objective').value=state.objective;
renderStudies();update();measureChrome();
// Both tab hashes are also element ids, so the browser jumps to the anchor on
// load and leaves the sticky header sitting on top of the masthead. Always run
// the tab switch on boot — it resets the scroll and, with an instant behaviour,
// does so before the first paint rather than animating into it.
openFromLocation('auto');
if(deepRun)runSearch();