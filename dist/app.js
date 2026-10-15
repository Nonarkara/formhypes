// FormHypes — controller
import{defaults,families,profile,area,perimeter,cornerZones,evaluate,objectives,searchPlan,scoreCandidate,rank,baseline,meshOBJ,stack,levelPrograms,facadeFamilies,systems,regimes,econ,distinctiveness,columnDensity,isConvex,RUB_INNER_RATIO,glazingSchedule,stackHeight}from'./model.js?v=83bfd6e335';
import{t,langs,langMeta,translator}from'./i18n.js?v=128aef9b56';
import{SECTIONS,MOVED,REGIME_ORDER,PREMIUM_LABELS,RESEARCH_T}from'./research.js?v=b90562ebdd';

import {renderLocation,getLocationStudy} from './location.js?v=d7f98850a2';
import {renderPlay,getFengStudy} from './play.js?v=a75307527e';
import {renderReader} from './reader.js?v=273c83572f';

// The three desks added in 2026 after Chapter 6.2. Each is a self-contained
// module that injects its own prefixed CSS, so nothing here owns their styling.
import {BRIEF_I18N, renderBrief,getBriefStudy} from './brief.js?v=7ace9762af';
import {WALK_I18N, renderWalk,getWalkStudy} from './walk.js?v=8a31f6ea1d';
import {CONTEXT_I18N, renderContext} from './context.js?v=a36e8e6fe5';

import {cities,solarDefaults,solarPosition,validSolar} from './solar.js?v=76931110a7';
const $=id=>document.getElementById(id);
let lang='en',tt=translator('en');
const money=v=>new Intl.NumberFormat(lang==='th'?'th-TH':lang==='zh'?'zh-CN':'en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v);
const num=v=>Math.round(v).toLocaleString(lang==='th'?'th-TH':lang==='zh'?'zh-CN':'en-US');

let state={...defaults},metrics,alternatives=[],yaw=-.65,zoom=1,wireframe=false,studies=[],knowledgePack;
let drawn={w:0,h:0},pendingRaf=false;

// [i18n key, min, max, step, unit] — the label is resolved per language in
// buildRanges(); nothing here is English-only.
const schema={
 height:['c.height',3,6,.05,'m'],orientation:['c.orientation',0,360,5,'°'],span:['c.span',32,62,.01,'m'],aspect:['c.aspect',.65,1.5,.05,'×'],floors:['c.floors',12,70,1,''],
 taper:['c.taper',.6,1.2,.02,'×'],twist:['c.twist',0,180,5,'°'],
 core:['c.core',12,26,1,'m'],common:['c.common',8,22,1,'%'],
 site:['c.site',40,100,2,'m'],maxHeight:['c.maxHeight',100,350,5,'m'],frontage:['c.frontage',4,9,.5,'m'],
 rent:['c.rent',100,1400,25,'$'],premium:['c.premium',0,80,5,'%'],
 occupancy:['c.occupancy',50,100,1,'%'],reserve:['c.reserve',0,60,2,'$']};
const groups={orientationControl:['orientation'],geometryControls:['span','aspect','floors','height','taper','twist'],constraintControls:['core','common','site','maxHeight','frontage'],rentControls:['rent','premium','occupancy','reserve']};

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
 renderResearch();renderMethod();renderStudies();
 update();
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
 const sysL={};for(const k of Object.keys(systems))sysL[k]=tri('g.system.'+k);
 fillSelect('system',systems,sysL,state.system);
 const regL={};for(const k of Object.keys(regimes))regL[k]=tt('regime.'+k+'.label');
 fillSelect('regime',regimes,regL,state.regime);
 $('regime').onchange=()=>{state.regime=$('regime').value;changed()};
 const obj=$('objective');obj.replaceChildren();
 for(const k of ['contribution','rent','yieldOnCost','corners','facade','silhouette'])opt(obj,k,tt('s.objective.'+k));
 obj.value='contribution';
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
 $('systemNote').textContent=systems[state.system].columnFree?tt('sys.free'):tt('sys.grid');
 $('regimeNote').textContent=tt('regime.'+state.regime+'.reads')+' — '+tt('regime.'+state.regime+'.note');
}

/* ── toast ────────────────────────────────────────────────────────────── */
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>$('toast').classList.remove('on'),4200)}
function changed(){
 searchToken++; // a search still running was computed for the old state; drop it
 alternatives=[];
 $('searchResults').innerHTML=`<div class="empty"><span class="data">${tt('s.sum')} ${searchPlan(state).examined}</span><p>${tt('s.changed')}</p></div>`;
 update();
}

/* ── update ───────────────────────────────────────────────────────────── */
const DESKS=[['brief',BRIEF_I18N,renderBrief],['walk',WALK_I18N,renderWalk],['context',CONTEXT_I18N,renderContext]];
function renderDesks(){for(const [id,dict,render]of DESKS){$(id+'Title').textContent=dict[lang].title;if($(id+'Panel').open)render({lang,state,changed:applyDeskPatch})}}
for(const [id]of DESKS)$(id+'Panel').addEventListener('toggle',()=>{if($(id+'Panel').open)renderDesks()});
function applyDeskPatch(patch){
 for(const [key,value]of Object.entries(patch)){
  if(key==='span'&&Number.isFinite(value)&&value>0&&value<300){state.span=value}
  else if(key in schema){const[,min,max,step]=schema[key];if(Number.isFinite(value)){const bounded=Math.max(min,Math.min(max,value));state[key]=Math.round((min+Math.round((bounded-min)/step)*step)*1e6)/1e6}}

  else if(['family','program','skin','system','city'].includes(key)){
   const allowed={family:families,program:levelPrograms,skin:facadeFamilies,system:systems,city:cities};
   if(Object.hasOwn(allowed[key],value))state[key]=value;
  }
 }
 if('height'in patch)state.program='custom';changed();
}

function update(){
 metrics=evaluate(state);sync();
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
 $('modelName').textContent=tt('f.'+state.family)+' / '+state.floors;
 $('heightLabel').textContent=metrics.height.toFixed(1)+' m';
 // Sheet identification, in the sense the U.S. National CAD Standard gives it:
 // the drawing names itself so it can be referred to unambiguously.
 $('tbRef').textContent='A-101 · '+tt('f.'+state.family).toUpperCase()+' · '+state.floors+'L';

 const bm=baseline(state);
 const d=bm.contribution>0?(metrics.contribution/bm.contribution-1)*100:NaN;
 $('delta').textContent=Number.isFinite(d)?`${d>=0?'+':''}${d.toFixed(1)}% ${tt('m.delta')}${bm.valid?'':' ('+tt('m.deltaBad')+')'}`:tt('m.deltaBad');

 $('feasibility').className=metrics.valid?'valid':'invalid';
 $('feasibility').textContent=metrics.valid?tt('m.feasible'):metrics.reasons.map(r=>tt('m.reason.'+r)).join(' · ');

 renderPremiums();
 $('floor').max=state.floors;
 $('floor').value=Math.min(Number($('floor').value),state.floors);
 drawPlan();
}

/* ── where the rent comes from ────────────────────────────────────────── */
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
  const row=document.createElement('div');row.className='bar'+(neg?' neg':'');
  const lbl=document.createElement('span');lbl.textContent=PREMIUM_LABELS[key][lang]||key;
  const val=document.createElement('span');val.textContent=(neg?'−':'')+money(Math.abs(v));
  const track=document.createElement('div');track.className='track';
  const fill=document.createElement('div');fill.className='fill';fill.style.width=(Math.abs(v)/peak*100).toFixed(1)+'%';
  track.append(fill);row.append(lbl,val,track);host.append(row);
 }
}

/* ── plan ─────────────────────────────────────────────────────────────── */
/* A plan is not a picture of a floor, it is a drawing: it carries a north
   arrow, an overall dimension, a graphic scale and a core, in the conventions a
   draughtsman expects, so that someone who has never seen this site can size it
   in their head before reading a single number. That is also why it works for
   a reader who cannot tell a chamfer from a setback. */
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
     +`<text x="${nx}" y="${ny-11.5}" text-anchor="middle" fill="#585e5b" font-family="IBM Plex Mono,monospace" font-size="8">N</text></g>`;

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
  bar+=`<text x="${tx.toFixed(1)}" y="${by+14}" text-anchor="${anch}" fill="#585e5b" font-family="IBM Plex Mono,monospace" font-size="8">${i===4?i*u+' m':i*u}</text>`;
 }
 svg+=bar;

 $('plan').innerHTML=svg;
 $('floorValue').textContent=floor;
 $('floorStats').textContent=`${LANGS.plan[lang]} ${floor} · ${num(area(p))} ${tt('m.perSqM')} · ${zones.length} ${tt('m.cornerOffices')}`;
 drawHuman();
 drawTower();
}
$('floor').oninput=drawPlan;

/* ── tower ────────────────────────────────────────────────────────────── */
const canvas=$('tower'),ctx=canvas.getContext('2d');
function drawTower(){
 if(!metrics)return;
 const st=stack(state),total=st[st.length-1].z+st[st.length-1].h;
 const W=canvas.clientWidth,H=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2);
 if(W<2||H<2)return;
 drawn={w:Math.round(W),h:Math.round(H)};
 canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
 const scale=Math.min((H-145)/(total*.96+state.span*.4),(W-65)/(state.span*2))*zoom;
 const c=Math.cos(yaw),s=Math.sin(yaw);
 const project=(x,y,z)=>{const rx=x*c-y*s,ry=x*s+y*c;return[W*.54+rx*scale,H*.80-(z*.96-ry*.36)*scale,ry-z*.04]};
 function path(pts,fill,stroke,width=1){ctx.beginPath();pts.forEach((v,i)=>{const p=project(...v);if(i)ctx.lineTo(p[0],p[1]);else ctx.moveTo(p[0],p[1])});ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}}
 function line(a,b,col,width=.6){ctx.beginPath();const p=project(...a),q=project(...b);ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.strokeStyle=col;ctx.lineWidth=width;ctx.stroke()}

 for(let i=-120;i<=120;i+=12){line([i,-120,0],[i,120,0],'#293136',.5);line([-120,i,0],[120,i,0],'#293136',.5)}
 const site=state.site/2;path([[-site,-site,0],[site,-site,0],[site,site,0],[-site,site,0]],null,'#a2aca9',1);
 for(const[x,y,w,h]of[[-65,34,20,38],[48,53,22,62],[63,-42,19,27],[-50,-52,24,21]]){
  path([[x-w/2,y-w/2,0],[x+w/2,y-w/2,0],[x+w/2,y-w/2,h],[x-w/2,y-w/2,h]],'#151b1e','#354046',.6);
  path([[x-w/2,y-w/2,h],[x+w/2,y-w/2,h],[x+w/2,y+w/2,h],[x-w/2,y+w/2,h]],'#1b2326','#354046',.6);
  line([x+w/2,y+w/2,0],[x+w/2,y+w/2,h],'#354046')}

 const n=profile(state,0).length;
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
 for(const f of faces){
  let base=f.voided?20:f.retail?44:36;
  base+=Math.round(((f.i%4)/3)*13);
  const fill=f.voided?'#2a3236':f.retail?`rgb(${base+14},${base+9},${base})`:`rgb(${base},${base+9},${base+12})`;
  path(f.pts,wireframe?null:fill,wireframe?(f.voided?'#4a5459':'#6a797e'):(f.voided?'#4a5459':'#6c7c8260'),wireframe?.4:.45);
 }

 // level lines: the stored schedule, drawn where the schedule puts them
 for(const l of st){
  const p=profile(state,l.z/total);
  path(p.map(v=>[...v,l.z]),null,l.gfa?'#a2aca960':'#f59e0b99',l.gfa?.6:1.4);
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

 // Height dimension on the right, graduated every 50 m — the convention every
 // elevation in the world already uses. It sits in a gutter clear of the view
 // tools rather than under them. The overall figure is not repeated here: the
 // head of the viewport already states it, and saying it twice is the same
 // duplication a drawing is supposed to prevent.
 const gut=W>900?92:70;
 const rX=W-gut,rY=H*.80;ctx.strokeStyle='#59666b';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(rX,rY);ctx.lineTo(rX,rY-total*.96*scale);ctx.stroke();
 ctx.font='11px "IBM Plex Mono",monospace';ctx.fillStyle='#a2aca9';ctx.textAlign='right';
 for(let m=0;m<=total;m+=50){const y=rY-m*.96*scale;ctx.beginPath();ctx.moveTo(rX-5,y);ctx.lineTo(rX+4,y);ctx.stroke();ctx.fillText(m+' m',rX-9,y-4)}
 const yTop=rY-total*.96*scale;
 ctx.strokeStyle='#a2aca9';ctx.beginPath();ctx.moveTo(rX,yTop);ctx.lineTo(rX+9,yTop);ctx.stroke();
 ctx.textAlign='left';ctx.fillStyle='#f59e0b';
 const pp=project(...slab.reduce((a,v)=>v[0]>a[0]?v:a,slab[0]),lvl.z);
 ctx.fillRect(pp[0],pp[1],5,5);
 ctx.fillText(LANGS.plan[lang]+(fi+1)+' · +'+(lvl.z+state.height*0).toFixed(1)+' m',Math.min(pp[0]+12,W-92),pp[1]-5);

 const origin=[W-60,H-65];ctx.strokeStyle='#a2aca9';ctx.fillStyle='#a2aca9';
 for(const[dx,dy,label]of[[25,8,'X'],[-18,12,'Y'],[0,-26,'Z']]){ctx.beginPath();ctx.moveTo(...origin);ctx.lineTo(origin[0]+dx,origin[1]+dy);ctx.stroke();ctx.fillText(label,origin[0]+dx-4,origin[1]+dy+(dy<0?-4:13))}
}
let drag=null;
canvas.onpointerdown=e=>{drag={x:e.clientX};canvas.setPointerCapture(e.pointerId)};
canvas.onpointermove=e=>{if(!drag)return;yaw+=(e.clientX-drag.x)*.01;drag={x:e.clientX};drawTower()};
canvas.onpointerup=canvas.onpointercancel=()=>drag=null;
canvas.onkeydown=e=>{if(['ArrowLeft','ArrowRight','+','-'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')yaw-=.1;if(e.key==='ArrowRight')yaw+=.1;if(e.key==='+')zoom=Math.min(1.7,zoom+.1);if(e.key==='-')zoom=Math.max(.5,zoom-.1);drawTower()}};
$('zoomIn').onclick=()=>{zoom=Math.min(1.7,zoom+.1);drawTower()};
$('zoomOut').onclick=()=>{zoom=Math.max(.5,zoom-.1);drawTower()};
$('homeView').onclick=()=>{yaw=-.65;zoom=1;drawTower()};
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
$('reset').onclick=()=>{state={...defaults};yaw=-.65;zoom=1;$('floor').value=24;changed();toast(tt('s.reset'))};

/* ── search ───────────────────────────────────────────────────────────── */
/* The search is ~160 full evaluations. Run it in slices that yield to the
   browser between batches so the tab stays responsive and the progress is
   visible — a frozen page is worse than a slow one. */
let searchToken=0;
const BATCH=12;
function runSearch(){
 const objective=$('objective').value;
 const token=++searchToken;
 const started=performance.now();
 const plan=searchPlan(state);
 const results=[];let i=0;
 const progress=document.createElement('div');progress.className='empty';
 $('searchResults').replaceChildren(progress);
 // Results are shareable: the rules that produced them go in the query string.
 try{history.replaceState(null,'','?regime='+encodeURIComponent(state.regime)+'&objective='+encodeURIComponent(objective)+location.hash)}catch{}
 const slice=()=>{
  if(token!==searchToken)return;
  const end=Math.min(i+BATCH,plan.list.length);
  for(;i<end;i++)results.push(scoreCandidate(plan.list[i],objective));
  const done=i/plan.list.length;
  progress.innerHTML=`<span class="data">${Math.round(done*100)}%</span><p>${i} / ${plan.list.length} ${tt('s.tested')}</p>`;
  progress.style.setProperty('--done',(done*100).toFixed(1)+'%');
  if(i<plan.list.length){setTimeout(slice,0);return}
  finishSearch(results,plan,objective,performance.now()-started);
 };
 slice();
}

function finishSearch(results,plan,objective,elapsed){
 alternatives=rank(results);
 const seen=new Set();
 const rows=alternatives.filter(r=>{if(seen.has(r.state.family))return false;seen.add(r.state.family);return true}).slice(0,5);
 if(!rows.length){$('searchResults').innerHTML=`<div class="empty"><p>${tt('s.none')}</p></div>`;toast(tt('s.none'));return}
 const best=rows[0];
 let html='<div class="tablewrap"><table><thead><tr>'
  +[tt('s.col.candidate'),tt('s.col.roof'),tt('s.col.gross'),tt('s.col.rentable'),tt('s.col.corners'),tt('s.col.height'),tt('s.col.contribution'),tt('s.col.delta'),'']
  .map(h=>`<th scope="col">${h}</th>`).join('')+'</tr></thead><tbody>';
 rows.forEach((r,i)=>{
  const d=r.metrics.contribution-metrics.contribution;
  html+=`<tr class="${r===best?'win':''}"><td>${i+1} / ${families[r.state.family]}</td>`
   +`<td class="numeric">${r.state.taper.toFixed(2)} / ${r.state.twist}°</td>`
   +`<td class="numeric">${num(r.metrics.gross)}</td>`
   +`<td class="numeric">${num(r.metrics.rentable)}</td>`
   +`<td class="numeric">${r.metrics.corners}</td>`
   +`<td class="numeric">${r.metrics.height.toFixed(0)} m</td>`
   +`<td class="numeric">${money(r.metrics.contribution)}</td>`
   +`<td class="numeric">${d>=0?'+':''}${money(d)}</td>`
   +`<td><button data-candidate="${i}">${tt('s.col.apply')} ↗</button></td></tr>`;
 });
 html+=`</tbody></table></div><p class="searchsummary">${plan.examined} ${tt('s.tested')} / ${alternatives.length} ${tt('s.feasible')} / ${plan.examined-alternatives.length} ${tt('s.rejected')}. ${tt('s.target')} ${num(plan.target)} m². ${tt('s.best')} “${$('objective').selectedOptions[0].textContent}”${plan.heightVariants>1?' · 2 '+tt('s.heightVariant'):''} · ${elapsed.toFixed(0)} ms</p>`;
 $('searchResults').innerHTML=html;
 document.querySelectorAll('[data-candidate]').forEach(b=>b.onclick=()=>{
  state={...rows[Number(b.dataset.candidate)].state};update();toast(tt('s.applied'));
  $('studio').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 });
};

/* ── studies ──────────────────────────────────────────────────────────── */
// Own keys only: an inherited name such as 'constructor' would otherwise pass and turn every metric into NaN.
const own=(o,k)=>typeof k==='string'&&Object.hasOwn(o,k);
function validState(x){return x&&own(families,x.family)&&own(levelPrograms,x.program)&&own(facadeFamilies,x.skin)&&own(systems,x.system)&&own(regimes,x.regime)
 &&validSolar({...solarDefaults,...x})&&Object.keys(schema).every(k=>Number.isFinite(k==='orientation'?(x[k]??0):x[k])&&(k==='span'?x[k]>0&&x[k]<300:(x[k]??0)>=schema[k][1]&&(x[k]??0)<=schema[k][2]))}
// The rebrand renamed both keys. Fall back to the old ones so a language
// choice and a study shelf saved under the previous name survive it.
const readStore=k=>{try{return localStorage.getItem(k)}catch{return null}};
try{const data=JSON.parse(readStore('formHypesStudies')??readStore('formYieldStudies')??'[]');studies=Array.isArray(data)?data.filter(x=>x&&validState(x.state)).slice(0,8):[]}catch{studies=[]}
function persist(){try{localStorage.setItem('formHypesStudies',JSON.stringify(studies));return true}catch{return false}}
function renderStudies(){
 $('savedStudies').replaceChildren();
 if(!studies.length){const p=document.createElement('p');p.className='note';p.textContent=tt('s.emptyStudies');$('savedStudies').append(p)}
 studies.forEach((study,i)=>{
  const d=document.createElement('div');d.className='saved';
  const b=document.createElement('button');
  b.textContent=`${i+1}. ${tt('f.'+study.state.family)} / ${tt('regime.'+study.state.regime+'.label')} / ${money(evaluate(study.state).contribution)}`;
  b.onclick=()=>{state={...defaults,...study.state};changed();toast(tt('s.restored'))};
  const del=document.createElement('button');del.textContent='×';
  del.setAttribute('aria-label','Delete saved study '+(i+1));
  del.onclick=()=>{studies.splice(i,1);persist();renderStudies()};
  d.append(b,del);$('savedStudies').append(d);
 });
}
$('save').onclick=()=>{
 if(studies.length>=8){toast(tt('s.full'));return}
 studies.push({state:{...state},savedAt:new Date().toISOString()});
 if(!persist()){studies.pop();toast(tt('s.saveFail'));return}
 renderStudies();toast(tt('s.saved'));
};

/* ── chrome height ─────────────────────────────────────────────────────────
   The canvas is sized as 100vh minus the header and masthead, so that figure
   has to be measured rather than assumed: the masthead wraps to two lines in
   Thai and three in Chinese, and a hard-coded constant silently pushed the
   tower below the fold in both. Written into a custom property so the CSS can
   keep using it, and re-run whenever the language changes the wrapping. */
function measureChrome(){
 const h=document.querySelector('header'),m=document.querySelector('.masthead');
 const vh=Math.max(window.innerHeight,320);
 document.documentElement.style.setProperty('--chrome',
  (h?h.offsetHeight:46)+(m&&m.offsetHeight?m.offsetHeight:50)+4+'px');
 const vp=$('tower')?.parentElement;
 if(vp)vp.style.minHeight=Math.max(320,vh-(h?h.offsetHeight:46)-(m?m.offsetHeight:50)-4)+'px';
}
addEventListener('resize',measureChrome);
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
 renderReader(lang);
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
 for(const t of T){
  const ns=svgEl('svg',{viewBox:'0 0 220 232'});
  for(let i=20;i<200;i+=20)ns.appendChild(svgEl('path',{d:`M${i} 14 V196 M14 ${i} H206`,stroke:'#dcdeda','stroke-width':'.5'}));
  const defs=svgEl('defs');
  const pat=svgEl('pattern',{id:'hatch3',width:'5',height:'5',patternUnits:'userSpaceOnUse'});
  pat.appendChild(svgEl('path',{d:'M0,5 L5,0',stroke:'#8b918d','stroke-width':'.7'}));
  defs.appendChild(pat);ns.appendChild(defs);

  ns.appendChild(svgEl('polygon',{points:pts(t.outline),fill:'#eef0ec',stroke:'#191c1b','stroke-width':'1.4'}));
  if(t.grid)for(const g of t.grid)
   ns.appendChild(svgEl('path',{d:`M${g[0]} ${g[1]} L${g[2]} ${g[3]}`,stroke:'#8b918d','stroke-width':'.6'}));
  if(t.core)ns.appendChild(svgEl('polygon',{points:pts(t.core),fill:'url(#hatch3)',stroke:'#585e5b','stroke-width':'.8'}));
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
 wrap.append(el('p','note source',tt('r.timeline.note')));
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
 const V=Math.min(26,150/f2f);
 const X0=30, XM=8.5, X1=X0+XM*V, YF=172, YN=YF-f2f*V;   // floor line, slab above
 const yc=YF-clear*V;                            // ceiling, i.e. clear height
 const VW=X1+86, VH=206;
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

 // a person, 1.75 m, with an eye at 1.60 m and the sight line it produces
 const px=X1-46,ey=YF-1.6*V,hd=YF-1.75*V;
 add('circle',{cx:px,cy:hd-5,r:5.5,fill:'none',stroke:'#191c1b','stroke-width':'1.3'});
 add('path',{d:`M${px} ${hd+1} V${hd+34} M${px} ${hd+18} L${px-9} ${hd+30} M${px} ${hd+18} L${px+9} ${hd+30}`,
   fill:'none',stroke:'#191c1b','stroke-width':'1.3','stroke-linecap':'round'});
 add('path',{d:`M${px-13} ${YF} H${px+13}`,stroke:'#191c1b','stroke-width':'1.2'});
 add('circle',{cx:px,cy:ey,r:1.8,fill:'#191c1b'});
 add('path',{d:`M${px} ${ey} L${X1} ${ey-4}`,stroke:'#f59e0b','stroke-width':'.9'});
 add('path',{d:`M${X1} ${ey-4} l-6 -2 v4 Z`,fill:'#f59e0b'});
 add('text',{x:px+16,y:ey+3,fill:'#585e5b','font-size':'7.5','font-family':'IBM Plex Mono,monospace'},'1.60 m eye');

 // dimensions, right-hand side, in the drafting manner
 const dim=(y1,y2,label,off)=>{
  add('path',{d:`M${X1+off-4} ${y1} H${X1+off+4} M${X1+off} ${y1} V${y2}`,stroke:DIM,'stroke-width':'.5'});
  add('path',{d:`M${X1+off} ${y1} l-2 4 h4 Z M${X1+off} ${y2} l-2 -4 h4 Z`,fill:DIM});
  add('text',{x:X1+off+7,y:(y1+y2)/2+2.5,fill:'#191c1b','font-size':'7.5','font-family':'IBM Plex Mono,monospace'},label);
 };
 dim(YN,YF,f2f.toFixed(2)+' m',8);
 dim(yc,YF,clear.toFixed(2)+' m clear',22);
 add('text',{x:X0+40,y:YN+24,fill:'#585e5b','font-size':'7.5','font-family':'IBM Plex Sans,Arial'},
   tt('h.services'));
 add('text',{x:X0+40,y:YN+34,fill:'#8b918d','font-size':'7.5','font-family':'IBM Plex Sans,Arial'},
   tt('h.hidden'));
 wrap.append(ns);

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
 version:3,units:{length:'m',area:'m²',currency:'USD',rent:'USD/m²/year'},tier:'conceptual scenario',
 author:'Dr Non',affiliation:'depa + Axiom',anniversary:'2006–2026',
 source:'Inspired by Dr Non’s MIT classmate Shouheng Chen. Embedded design knowledge after Shouheng Chen, MIT SMArchS 2006. Financial and political readings are extensions.',
 contextStudies:{ground:getLocationStudy(),fengShui:getFengStudy(),brief:getBriefStudy(state),walk:getWalkStudy()},
 regime:regimes[state.regime].label,state,metrics,createdAt:new Date().toISOString()},null,2),'application/json');
$('exportCsv').onclick=()=>download('formhypes-alternatives.csv',[
 'family,regime,structure,floors,span_m,roof_scale,twist_deg,gross_m2,rentable_m2,corner_offices,height_m,distinctiveness,annual_rent_usd,envelope_reserve_usd,structure_reserve_usd,annual_contribution_usd',
 ...alternatives.map(r=>[r.state.family,r.state.regime,r.state.system,r.state.floors,r.state.span.toFixed(4),r.state.taper,r.state.twist,
  r.metrics.gross.toFixed(2),r.metrics.rentable.toFixed(2),r.metrics.corners,r.metrics.height.toFixed(2),r.metrics.distinctiveness.toFixed(4),
  r.metrics.rent.toFixed(2),r.metrics.facadeCost.toFixed(2),r.metrics.structureCost.toFixed(2),r.metrics.contribution.toFixed(2)].join(','))
].join('\n'),'text/csv');

/* ── tabs ─────────────────────────────────────────────────────────────── */
// The hash is the tab, so a link to #research is a link to the research and a
// screenshot of it can be taken without driving the UI.
function showTab(t,push=true,behavior='smooth'){
 document.querySelectorAll('.tabpane').forEach(p=>p.classList.toggle('on',p.id===t));
 document.querySelectorAll('[data-tab]').forEach(x=>{
  const on=x.dataset.tab===t;
  x.classList.toggle('on',on);
  x.setAttribute('aria-selected',String(on));
 });
 if(push&&location.hash.slice(1)!==t)history.replaceState(null,'','#'+t);
 window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':behavior});
 if(t==='studio')drawTower();
 if(t==='research')renderResearch();
}
document.querySelector('.tabs').addEventListener('click',e=>{
 const btn=e.target.closest('[data-tab]');
 if(btn)showTab(btn.dataset.tab);
});
addEventListener('hashchange',()=>{const h=location.hash.slice(1);showTab(h==='research'?h:'studio',false)});
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
 if(Object.hasOwn(regimes,q.get('regime')??''))state.regime=q.get('regime');
 if(Object.hasOwn(objectives,q.get('objective')??''))state.objective=q.get('objective');
 deepRun=q.get('run')==='1';
}catch{}
setLang(lang);
if(state.objective)$('objective').value=state.objective;
renderStudies();update();measureChrome();
// Both tab hashes are also element ids, so the browser jumps to the anchor on
// load and leaves the sticky header sitting on top of the masthead. Always run
// the tab switch on boot — it resets the scroll and, with an instant behaviour,
// does so before the first paint rather than animating into it.
const firstTab=['studio','research'].includes(location.hash.slice(1))?location.hash.slice(1):'studio';
showTab(firstTab,false,'auto');
if(deepRun)runSearch();