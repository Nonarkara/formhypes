// A contained Studio shell. Existing desks, ids and event listeners are moved,
// not recreated; their calculations and drawings remain the working product.
import {profile,stack,grossOf} from './model.js?v=e1aefac756';
import {renderFacade} from './facade.js?v=81743fe6ed';
export const CONSOLE_TEXT={
 en:{capacity:'Model gross / area allowance',crosses:'Building crosses the assumed plot boundary',land:'Land · m²',far:'FAR',city:'City',assumption:'Illustrative square plot · FAR assumption',work:['Form','Brief','Place','Walk-in','Façade','Explore','Studies'],rail:['Design','Performance'],site:['Ground & culture','Neighbours & sun'],tools:'Workspaces',open:'Parameters',close:'Close',briefTabs:['Land & brief','Schemes & corners','Thesis controls']},
 th:{capacity:'พื้นที่โมเดล / พื้นที่ที่สมมติให้สร้างได้',crosses:'อาคารเลยขอบที่ดินสมมติ',land:'ที่ดิน · ตร.ม.',far:'อัตราส่วนพื้นที่',city:'เมือง',assumption:'ที่ดินสี่เหลี่ยมสมมติ · อัตราส่วนพื้นที่เป็นสมมติฐาน',work:['รูปทรง','โจทย์','ที่ตั้ง','มุมมอง','เปลือก','สำรวจ','แบบที่เก็บ'],rail:['ออกแบบ','ผลคำนวณ'],site:['ดินและวัฒนธรรม','เพื่อนบ้านและแดด'],tools:'พื้นที่ทำงาน',open:'พารามิเตอร์',close:'ปิด',briefTabs:['ที่ดินและโจทย์','ทางเลือกและมุม','ตัวควบคุมจากวิทยานิพนธ์']},
 zh:{capacity:'模型总面积 / 面积额度',crosses:'建筑超出假设地块边界',land:'用地 · m²',far:'容积率',city:'城市',assumption:'假设正方形地块 · 容积率为情景输入',work:['形体','任务书','场地','视角','幕墙','探索','存档'],rail:['设计','表现'],site:['地基与文化','邻里与日照'],tools:'工作区',open:'参数',close:'关闭',briefTabs:['用地与任务书','方案与转角','论文参数']}
};
export function siteLedger(state,inputs){
 const st=stack(state),height=st.at(-1).z+st.at(-1).h,half=Math.sqrt(inputs.plot)/2;
 const fits=[0,...st.map(l=>l.z/height),1].every(t=>profile(state,t).every(([x,y])=>Math.abs(x)<=half+1e-8&&Math.abs(y)<=half+1e-8));
 const gross=grossOf(state),allowance=inputs.plot*inputs.far;
 return {gross,allowance,remaining:allowance-gross,fits};
}
export const WORKSPACES=['form','brief','place','walk','facade','compare','studies'];
/* Each workspace is named by a drawing, not a word. A strip of six words is a
   menu; six marks are an instrument panel, and they survive being read at a
   glance while the reader is looking at the tower. Drawn the way the rest of
   the sheet is drawn: 20-unit box, 1.2 stroke, no fill, no radius. The label
   stays in the accessibility tree and in the hover title, in all three
   languages — a glyph that cannot be named is a glyph that cannot be found. */
const WORK_GLYPHS={
 // cruciform plan with its core: the form the model is currently on
 form:'<path d="M7.5 2h5v5.5H18v5h-5.5V18h-5v-5.5H2v-5h5.5z"/><rect x="8.5" y="8.5" width="3" height="3"/>',
 // a brief: sheet, plot square, and the headroom left at the top
 brief:'<path d="M4 2h8l4 4v12H4z"/><rect x="7" y="9" width="7" height="5"/><path d="M7 5.5h4"/>',
 // a site: the marker dropped on its own parcel
 place:'<path d="M10 17.6S4.4 10.5 4.4 7.3a5.6 5.6 0 1 1 11.2 0c0 3.2-5.6 10.3-5.6 10.3z"/><path d="M10 5.1a2.3 2.3 0 1 1 0 4.6 2.3 2.3 0 0 1 0-4.6z"/>',
 // one-point perspective from eye height: ground, a receding bay, a figure in it
 walk:'<path d="M1 16.5h18"/><path d="M4.5 16.5 10 9.5l5.5 7"/><circle cx="10" cy="7" r="2"/><path d="M10 9v7.5"/>',
 // curtain wall: two mullions, one transom
 facade:'<rect x="3" y="4" width="14" height="12"/><path d="M7.7 4v12M12.3 4v12M3 10h14"/>',
 // alternatives held to one area: four bars off one baseline
 compare:'<path d="M2 16.5h16"/><path d="M4.5 16.5V9M8.5 16.5V5M12.5 16.5v-3M16.5 16.5V7"/>',
 // the shelf: two studies, one behind the other
 studies:'<rect x="2.5" y="10" width="12" height="7"/><rect x="5.5" y="3" width="12" height="7"/>'};
export function workspaceForTarget(id){return ({briefPanel:'brief',walkPanel:'walk',contextPanel:'place',locationDesk:'place',exploreTitle:'compare',searchResults:'compare',savedStudies:'studies',facadeDesk:'facade'})[id]||'form'}
const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
export function mountConsole({getData,getBrief,setBrief,onStudyChange,onLevel,onLayout}){
 const $=id=>document.getElementById(id),studio=$('studio'),shell=studio.querySelector('.studio');shell.id='consoleShell';
 let selected='form',rail=0,place=0;
 const bar=node('div','console-site');bar.id='siteBar';const field=(id,type)=>{const l=node('label','console-field'),name=node('span'),input=node('input');input.id=id;input.type=type;l.append(name,input);bar.append(l);return {name,input}};
 const land=field('siteArea','number'),far=field('siteFar','number');land.input.min='1';land.input.max='1000000';land.input.step='any';far.input.min='.1';far.input.max='100';far.input.step='any';
 const cityWrap=node('div','console-field'),cityName=document.querySelector('label[for="city"]');cityWrap.append(cityName,$('city'));bar.append(cityWrap);
 const capacity=node('output','console-capacity'),note=node('span','console-site-note');bar.append(capacity,note);
 const header=document.querySelector('header'),langs=header.querySelector('.langs'),credit=document.querySelector('.mastnote');
 header.insertBefore(bar,langs);header.insertBefore(credit,header.querySelector('.actions'));
 const nav=node('nav','console-nav');nav.setAttribute('role','tablist');studio.insertBefore(nav,shell);
 const railNav=node('div','console-rail-nav');const railButtons=[0,1].map(i=>{const b=node('button');b.type='button';b.onclick=()=>{rail=i;render()};railNav.append(b);return b});studio.insertBefore(railNav,shell);
 const dock=node('section','console-dock');dock.id='consoleDock';shell.append(dock);
 const panels={};
 for(const k of WORKSPACES.slice(1)){const p=node('section','console-workspace');p.id='workspace-'+k;p.dataset.workspace=k;panels[k]=p;dock.append(p)}
 panels.brief.append($('briefPanel'));panels.walk.append($('walkPanel'));
 const placeNav=node('div','console-subnav');panels.place.append(placeNav,$('locationDesk'),$('contextPanel'));
 const placeButtons=[0,1].map(i=>{const b=node('button');b.type='button';b.onclick=()=>{place=i;show('place')};placeNav.append(b);return b});
 const facade=node('div');facade.id='facadeDesk';panels.facade.append(facade);
 panels.compare.append(studio.querySelector('.explore'));panels.studies.append(studio.querySelector('.studies'));
 // The existing atlas is already wired to the real model. Make it the chooser.
 $('family').hidden=true;document.querySelector('label[for="family"]').hidden=true;
 $('formAtlas').open=true;$('formAtlas').classList.add('console-atlas');
 const controls=shell.querySelector('.controls');controls.insertBefore($('formAtlas'),controls.firstElementChild.nextSibling);
 const buttons=WORKSPACES.map((k,i)=>{const b=node('button');b.type='button';b.id='console-tab-'+k;b.setAttribute('role','tab');b.setAttribute('aria-controls','consoleShell');b.onclick=()=>show(k);b.onkeydown=e=>{let n;if(e.key==='ArrowRight')n=(i+1)%WORKSPACES.length;if(e.key==='ArrowLeft')n=(i+WORKSPACES.length-1)%WORKSPACES.length;if(e.key==='Home')n=0;if(e.key==='End')n=WORKSPACES.length-1;if(n!==undefined){e.preventDefault();show(WORKSPACES[n]);buttons[n].focus()}};nav.append(b);return b});
 function syncSite(){const {lang}=getData(),c=CONSOLE_TEXT[lang],inputs=getBrief().inputs;land.name.textContent=c.land;far.name.textContent=c.far;cityName.textContent=c.city;const ledger=siteLedger(getData().state,inputs),fmt=n=>Math.round(n).toLocaleString(lang);capacity.textContent=fmt(ledger.gross)+' / '+fmt(ledger.allowance)+' m²';capacity.setAttribute('aria-label',c.capacity+': '+capacity.textContent);capacity.title=c.capacity;capacity.classList.toggle('console-flag',ledger.remaining<0);note.textContent=ledger.fits?c.assumption:c.crosses;note.title=note.textContent;note.classList.toggle('console-flag',!ledger.fits);if(credit)credit.title=credit.textContent;for(const [f,v]of [[land.input,inputs.plot],[far.input,inputs.far]])if(document.activeElement!==f)f.value=String(v)}
 for(const [input,key]of [[land.input,'plot'],[far.input,'far']])input.onchange=()=>{if(!input.checkValidity()||!Number.isFinite(input.valueAsNumber)){input.reportValidity();input.value=String(getBrief().inputs[key]);return}if(setBrief({[key]:input.valueAsNumber}))onStudyChange();syncSite()};
 function render(){
  if(typeof matchMedia==='function'&&matchMedia('(max-width:600px)').matches&&selected==='form')rail=0;
  const {lang,state,level}=getData(),c=CONSOLE_TEXT[lang];syncSite();nav.setAttribute('aria-label',c.tools);
  buttons.forEach((b,i)=>{
   const k=WORKSPACES[i];
   b.innerHTML='<svg class="wg" viewBox="0 0 20 20" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="miter">'+WORK_GLYPHS[k]+'</svg><span class="wt">'+c.work[i]+'</span>';
   b.title=c.work[i];
   b.setAttribute('aria-selected',String(selected===WORKSPACES[i]));
   b.tabIndex=selected===WORKSPACES[i]?0:-1});
  railButtons.forEach((b,i)=>{b.textContent=c.rail[i];b.setAttribute('aria-pressed',String(rail===i))});
  railNav.hidden=selected!=='form';shell.dataset.task=selected;shell.dataset.rail=String(rail);dock.hidden=selected==='form';
  for(const [k,p]of Object.entries(panels))p.hidden=k!==selected;
  for(const [k,id]of [['brief','briefPanel'],['walk','walkPanel']])$(id).open=selected===k;
  placeButtons.forEach((b,i)=>{b.textContent=c.site[i];b.setAttribute('aria-pressed',String(place===i))});
  $('locationDesk').hidden=place!==0;$('contextPanel').hidden=place!==1;$('contextPanel').open=selected==='place'&&place===1;
  if(selected==='facade')renderFacade({host:facade,lang,state,level,onLevel});
 }
 function show(key){if(!WORKSPACES.includes(key))return;selected=key;render();onLayout()}
 function active(on){document.body.classList.toggle('is-console',on);if(on){render();onLayout()}}
 return {render,show,active,openForTarget(id){if(id==='contextPanel')place=1;if(id==='locationDesk')place=0;show(workspaceForTarget(id))}};
}
