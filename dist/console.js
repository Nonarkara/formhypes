import {toDisplay,fromDisplay,unitLabel,displayText} from './preferences.js?v=48652b12d9';
// A contained Studio shell. Existing desks, ids and event listeners are moved,
// not recreated; their calculations and drawings remain the working product.
import {profile,stack,grossOf} from './model.js?v=67662478b8';
import {renderCarbonLab} from './carbon.js?v=d90e397524';
import {renderLiftsLab} from './lifts.js?v=a839f5889c';
import {renderFireLab} from './fire.js?v=2fe91fc6df';
import {renderWindLab} from './wind.js?v=188de29185';
import {renderWaterLab} from './water.js?v=7fe945a8bd';
import {renderGlareLab} from './glare.js?v=e488300d4d';
import {renderFacade} from './facade.js?v=a6f7de2b5e';
export const CONSOLE_TEXT={
 en:{capacity:'Model gross / area allowance',capacityShort:'Area / allowance',crosses:'Building crosses the assumed plot boundary',land:'Land · m²',far:'FAR',city:'City',assumption:'Illustrative square plot · FAR assumption',work:[ 'Form','Brief','Core','Lifts','Evacuation','Wind','Water','Glare','Carbon','Assembly','Façade','Place','Feng Shui','Walk-in','Explore','Studies' ],rail:['Design','Performance'],site:['Ground & culture','Neighbours & sun','Stand here','Effects'],tools:'Workspaces',open:'Parameters',close:'Close',briefTabs:['Land & brief','Schemes & corners','Thesis controls']},
 th:{capacity:'พื้นที่โมเดล / พื้นที่ที่สมมติให้สร้างได้',capacityShort:'พื้นที่ / ที่ให้สร้างได้',crosses:'อาคารเลยขอบที่ดินสมมติ',land:'ที่ดิน · ตร.ม.',far:'อัตราส่วนพื้นที่',city:'เมือง',assumption:'ที่ดินสี่เหลี่ยมสมมติ · อัตราส่วนพื้นที่เป็นสมมติฐาน',work:[ 'รูปทรง','โจทย์','แกนกลาง','ลิฟต์','อพยพหนีไฟ','อุโมงค์ลม','ระบบน้ำ','แสงสะท้อน','คาร์บอน','การประกอบ','เปลือก','ที่ตั้ง','ฮวงจุ้ย','มุมมอง','สำรวจ','แบบที่เก็บ' ],rail:['ออกแบบ','ผลคำนวณ'],site:['ดินและวัฒนธรรม','เพื่อนบ้านและแดด','ตั้งตรงนี้','สิ่งแวดล้อม'],tools:'พื้นที่ทำงาน',open:'พารามิเตอร์',close:'ปิด',briefTabs:['ที่ดินและโจทย์','ทางเลือกและมุม','ตัวควบคุมจากวิทยานิพนธ์']},
 zh:{capacity:'模型总面积 / 面积额度',capacityShort:'面积 / 额度',crosses:'建筑超出假设地块边界',land:'用地 · m²',far:'容积率',city:'城市',assumption:'假设正方形地块 · 容积率为情景输入',work:[ '形体','任务书','核心筒','电梯','疏散','风洞','给排水','反光','碳排放','构造','幕墙','场地','风水','视角','探索','存档' ],rail:['设计','表现'],site:['地基与文化','邻里与日照','落位','环境'],tools:'工作区',open:'参数',close:'关闭',briefTabs:['用地与任务书','方案与转角','论文参数']}
};
export function siteLedger(state,inputs){
 const st=stack(state),height=st.at(-1).z+st.at(-1).h,half=Math.sqrt(inputs.plot)/2;
 const fits=[0,...st.map(l=>l.z/height),1].every(t=>profile(state,t).every(([x,y])=>Math.abs(x)<=half+1e-8&&Math.abs(y)<=half+1e-8));
 const gross=grossOf(state),allowance=inputs.plot*inputs.far;
 return {gross,allowance,remaining:allowance-gross,fits};
}
export const WORKSPACES=['form','brief','core','lifts','fire','wind','water','glare','carbon','detail','facade','place','feng','walk','compare','studies'];
/* Each workspace is named by a drawing, not a word. A strip of nine words is a
   menu; nine marks are an instrument panel, and they survive being read at a
   glance while the reader is looking at the tower. Drawn the way the rest of
   the sheet is drawn: 20-unit box, 1.2 stroke, no fill, no radius. The label
   stays in the accessibility tree and in the hover title, in all three
   languages — a glyph that cannot be named is a glyph that cannot be found. */
export const WORK_GLYPHS={
 // cruciform plan with its core: the form the model is currently on
 form:'<path d="M7.5 2h5v5.5H18v5h-5.5V18h-5v-5.5H2v-5h5.5z"/><rect x="8.5" y="8.5" width="3" height="3"/>',
 // a brief: sheet, plot square, and the headroom left at the top
 brief:'<path d="M4 2h8l4 4v12H4z"/><rect x="7" y="9" width="7" height="5"/><path d="M7 5.5h4"/>',
 // the core in section: two lift shafts, a car in one, the stair beside them
 core:'<path d="M4 2v16M10 2v16M16 2v16"/><rect x="4.6" y="5.5" width="4.8" height="3.4"/><path d="M16.6 15.4l2.8-1.3M16.6 11.8l2.8-1.3M16.6 8.2l2.8-1.3"/>',
 // a wall build-up in section: two leaves with a hatched cavity between them,
 // and the outside face marked. It used to be four verticals with two rungs —
 // which is, at 18px, the same picture `compare` draws. Two parallel leaves and
 // a diagonal hatch say "section through a wall" in a way four bars never do.
 detail:'<path d="M5.5 2.5v15M14.5 2.5v15"/><path d="M5.5 4.6h9M5.5 15.4h9"/><path d="M8.2 7.4l3.6 3.4M8.2 11.6l3.6-3.4"/>',
 // a site: the marker dropped on its own parcel
 place:'<path d="M10 17.6S4.4 10.5 4.4 7.3a5.6 5.6 0 1 1 11.2 0c0 3.2-5.6 10.3-5.6 10.3z"/><path d="M10 5.1a2.3 2.3 0 1 1 0 4.6 2.3 2.3 0 0 1 0-4.6z"/>',
 // one-point perspective from eye height: ground, a receding bay, a figure in it
 walk:'<path d="M1 16.5h18"/><path d="M4.5 16.5 10 9.5l5.5 7"/><circle cx="10" cy="7" r="2"/><path d="M10 9v7.5"/>',
 // a luopan: the ring divided, and a needle laid on a bearing that is not north —
 // pinned to 45 degrees because an upright needle reads as a target pin and this
 // is not one. The square at the centre is the plot, the only thing on the sheet
 // that is the building rather than the tradition.
 feng:'<circle cx="10" cy="10" r="7.8"/><circle cx="10" cy="10" r="3.2"/><path d="M10 2.2v2.1M10 15.7v2.1M2.2 10h2.1M15.7 10h2.1M4.5 4.5l1.5 1.5M15.5 15.5l-1.5-1.5M15.5 4.5l-1.5 1.5M4.5 15.5l1.5-1.5"/><path d="M10 10 15.4 5.2"/><rect x="8.6" y="8.6" width="2.8" height="2.8"/>',
 // curtain wall: two mullions, one transom
 // lifts: two shafts, a car in each, one going up and one coming down
 lifts:'<rect x="3" y="2" width="6" height="16"/><rect x="11" y="2" width="6" height="16"/><rect x="4.2" y="4" width="3.6" height="4"/><rect x="12.2" y="12" width="3.6" height="4"/><path d="M6 11.5l-1.4 2h2.8zM14 8.5l-1.4-2h2.8z"/>',
 // evacuation: a stair in section and the way out at its foot
 fire:'<path d="M2 18h4v-4h4v-4h4V6h4"/><path d="M14 18h5M16.5 15.5l2.5 2.5-2.5 2.5"/>',
 // carbon: a tower drawn as stacked material, heavier toward the base, and the cloud above it
 carbon:'<path d="M7 18V8h6v10M5 18h10"/><path d="M8 12h4M8 15h4"/><path d="M6.5 6.2a2.4 2.4 0 0 1 3.3-2.6 2.8 2.8 0 0 1 5.2 1.4 1.8 1.8 0 0 1-.4 3.5H6.8a1.6 1.6 0 0 1-.3-2.3z"/>',
 // a wind tunnel: flow lines bending round a plan, the wake shed behind it
 wind:'<path d="M1 5.5h6.5M1 14.5h6.5M1 10h4"/><rect x="8" y="7" width="5" height="6"/><path d="M13 7.5c2.5-1 3.5 1 5.5 0M13 12.5c2.5 1 3.5-1 5.5 0"/><circle cx="16.5" cy="10" r="1.3"/>',
 // water: the tank on the roof, the rising main, a drop at the tap below
 water:'<rect x="5" y="2" width="10" height="4"/><path d="M10 6v8M6 18h8"/><path d="M10 14.2c-1.4 1.8-1.4 3.8 0 3.8s1.4-2 0-3.8z"/>',
 // glare: the sun, a glass face, and the ray it throws onto the ground
 glare:'<circle cx="4" cy="4" r="2.2"/><path d="M12 2v13"/><path d="M5.8 5.6 12 10l6 7.5"/><path d="M14.5 18h5"/>',
 facade:'<rect x="3" y="4" width="14" height="12"/><path d="M7.7 4v12M12.3 4v12M3 10h14"/>',
 // alternatives held to one area: four bars off one baseline, each stepped off
 // the last so the set reads as a ranking rather than a fence
 compare:'<path d="M2 17h16"/><path d="M4 17V10M8 17V6M12 17v-3.5M16 17V8"/>',
 // the shelf: two studies, one behind the other
 studies:'<rect x="2.5" y="10" width="12" height="7"/><rect x="5.5" y="3" width="12" height="7"/>'};
export function workspaceForTarget(id){return ({briefPanel:'brief',fengshuiPanel:'feng',walkPanel:'walk',contextPanel:'place',environmentPanel:'place',sitePanel:'place',locationDesk:'place',exploreTitle:'compare',searchResults:'compare',savedStudies:'studies',facadeDesk:'facade',coreFigure:'core',coreFacts:'core',detailFigure:'detail',detailSpec:'detail'})[id]||'form'}
const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
/* Move a desk that already exists in the markup into a workspace panel rather
   than rebuilding it. Rebuilding is how one id ends up living in two places,
   and getElementById then returns whichever happens to be first — a bug that
   only appears on whichever language was edited last. */
function moveDesk(host,panel){if(host)panel.append(...host.childNodes)}
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
 // Feng Shui was never moved here, so it hung as a bar under every workspace
 // and opened as a page with no tower beside the ring it turns.
 panels.feng.append($('fengshuiPanel'));
 // The core section and the wall assembly are drawings, and a drawing that
 // lives in a 300px rail is a drawing nobody scrolls to. Both are moved here
 // whole — element ids, event listeners and computed rows intact — so each has
 // exactly one home. Leaving a copy behind would mean two elements with one id.
 moveDesk($('coreDesk'),panels.core);moveDesk($('detailDesk'),panels.detail);
 const placeNav=node('div','console-subnav');panels.place.append(placeNav,$('locationDesk'),$('contextPanel'),$('sitePanel'),$('environmentPanel'));
 // One button per panel in `site`, and the count is read from the panels rather
 // than typed as [0,1]: a label array that grew to three while this said two
 // deployed cleanly, passed every test, and shipped a third tab with no button to
 // open it. The panels list is the source of truth.
 const placePanels=[$('locationDesk'),$('contextPanel'),$('sitePanel'),$('environmentPanel')];
 const placeButtons=placePanels.map((_,i)=>{const b=node('button');b.type='button';b.onclick=()=>{place=i;show('place')};placeNav.append(b);return b});
 const facade=node('div');facade.id='facadeDesk';panels.facade.append(facade);
 // Labs: live instruments, each owning its host and its animation loop.
 const labs={carbon:[renderCarbonLab,'carbonLab'],lifts:[renderLiftsLab,'liftsLab'],fire:[renderFireLab,'fireLab'],wind:[renderWindLab,'windLab'],water:[renderWaterLab,'waterLab'],glare:[renderGlareLab,'glareLab']};
 for(const [k,[,id]]of Object.entries(labs)){const h=node('div','lab-host');h.id=id;panels[k].append(h)}
 panels.compare.append(studio.querySelector('.explore'));panels.studies.append(studio.querySelector('.studies'));
 // The existing atlas is already wired to the real model. Make it the chooser.
 $('family').hidden=true;document.querySelector('label[for="family"]').hidden=true;
 $('formAtlas').open=true;$('formAtlas').classList.add('console-atlas');
 const controls=shell.querySelector('.controls');controls.insertBefore($('formAtlas'),controls.firstElementChild.nextSibling);
 const buttons=WORKSPACES.map((k,i)=>{const b=node('button');b.type='button';b.id='console-tab-'+k;b.setAttribute('role','tab');b.setAttribute('aria-controls','consoleShell');b.onclick=()=>show(k);b.onkeydown=e=>{let n;if(e.key==='ArrowRight')n=(i+1)%WORKSPACES.length;if(e.key==='ArrowLeft')n=(i+WORKSPACES.length-1)%WORKSPACES.length;if(e.key==='Home')n=0;if(e.key==='End')n=WORKSPACES.length-1;if(n!==undefined){e.preventDefault();show(WORKSPACES[n]);buttons[n].focus()}};nav.append(b);return b});
 function syncSite(){const {lang}=getData(),c=CONSOLE_TEXT[lang],inputs=getBrief().inputs;land.name.textContent=displayText(c.land,lang);land.input.min=toDisplay(1,'m²');land.input.max=toDisplay(1000000,'m²');far.name.textContent=c.far;cityName.textContent=c.city;const ledger=siteLedger(getData().state,inputs),fmt=n=>Math.round(n).toLocaleString(lang);capacity.textContent=fmt(toDisplay(ledger.gross,'m²'))+' / '+fmt(toDisplay(ledger.allowance,'m²'))+' '+unitLabel('m²');capacity.setAttribute('aria-label',c.capacity+': '+capacity.textContent);capacity.title=c.capacity;capacity.dataset.short=c.capacityShort||'';capacity.classList.toggle('console-flag',ledger.remaining<0);note.textContent=ledger.fits?c.assumption:c.crosses;note.title=note.textContent;note.classList.toggle('console-flag',!ledger.fits);if(credit)credit.title=credit.textContent;for(const [f,v]of [[land.input,inputs.plot],[far.input,inputs.far]])if(document.activeElement!==f)f.value=String(f===land.input?Math.round(toDisplay(v,'m²')*10)/10:v)}
 for(const [input,key]of [[land.input,'plot'],[far.input,'far']])input.onchange=()=>{if(!input.checkValidity()||!Number.isFinite(input.valueAsNumber)){input.reportValidity();input.value=String(key==='plot'?toDisplay(getBrief().inputs[key],'m²'):getBrief().inputs[key]);return}if(setBrief({[key]:key==='plot'?fromDisplay(input.valueAsNumber,'m²'):input.valueAsNumber}))onStudyChange();syncSite()};
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
  for(const [k,id]of [['brief','briefPanel'],['feng','fengshuiPanel'],['walk','walkPanel']])$(id).open=selected===k;
  placeButtons.forEach((b,i)=>{b.textContent=c.site[i];b.setAttribute('aria-pressed',String(place===i))});
  $('locationDesk').hidden=place!==0;$('contextPanel').hidden=place!==1;$('contextPanel').open=selected==='place'&&place===1;
  $('sitePanel').hidden=place!==2;$('sitePanel').open=selected==='place'&&place===2;
  $('environmentPanel').hidden=place!==3;$('environmentPanel').open=selected==='place'&&place===3;
  if(selected==='facade')renderFacade({host:facade,lang,state,level,onLevel});
  // Every lab is told whether it is on screen, so a hidden lab stops animating.
  for(const [k,[render,id]]of Object.entries(labs))render({host:$(id),state,metrics:getData().metrics,changed:getData().changed,lang,active:selected===k});
 }
 function show(key){if(!WORKSPACES.includes(key))return;selected=key;render();onLayout();buttons[WORKSPACES.indexOf(key)].scrollIntoView?.({inline:'nearest',block:'nearest'})}
 function active(on){document.body.classList.toggle('is-console',on);if(on){render();onLayout()}}
 return {render,show,active,openForTarget(id){if(id==='contextPanel')place=1;if(id==='locationDesk')place=0;if(id==='sitePanel')place=2;if(id==='environmentPanel')place=3;show(workspaceForTarget(id))}};
}
