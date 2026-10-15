// A contained Studio shell. Existing desks, ids and event listeners are moved,
// not recreated; their calculations and drawings remain the working product.
import {profile,stack,grossOf} from './model.js?v=83bfd6e335';
import {renderFacade} from './facade.js?v=4e43517af7';
export const CONSOLE_TEXT={
 en:{capacity:'Model gross / area allowance',crosses:'Building crosses the assumed plot boundary',land:'Land · m²',far:'FAR',city:'City',assumption:'Illustrative square plot · FAR assumption',work:['Form','Brief','Place','Walk-in','Façade','Compare','Studies'],rail:['Design','Performance'],site:['Ground & culture','Neighbours & sun'],tools:'Workspaces',open:'Parameters',close:'Close',briefTabs:['Land & brief','Schemes & corners','Thesis controls']},
 th:{capacity:'พื้นที่โมเดล / พื้นที่ที่สมมติให้สร้างได้',crosses:'อาคารเลยขอบที่ดินสมมติ',land:'ที่ดิน · ตร.ม.',far:'อัตราส่วนพื้นที่',city:'เมือง',assumption:'ที่ดินสี่เหลี่ยมสมมติ · อัตราส่วนพื้นที่เป็นสมมติฐาน',work:['รูปทรง','โจทย์','ที่ตั้ง','มุมมอง','เปลือก','เปรียบเทียบ','แบบที่เก็บ'],rail:['ออกแบบ','ผลคำนวณ'],site:['ดินและวัฒนธรรม','เพื่อนบ้านและแดด'],tools:'พื้นที่ทำงาน',open:'พารามิเตอร์',close:'ปิด',briefTabs:['ที่ดินและโจทย์','ทางเลือกและมุม','ตัวควบคุมจากวิทยานิพนธ์']},
 zh:{capacity:'模型总面积 / 面积额度',crosses:'建筑超出假设地块边界',land:'用地 · m²',far:'容积率',city:'城市',assumption:'假设正方形地块 · 容积率为情景输入',work:['形体','任务书','场地','视角','幕墙','比较','存档'],rail:['设计','表现'],site:['地基与文化','邻里与日照'],tools:'工作区',open:'参数',close:'关闭',briefTabs:['用地与任务书','方案与转角','论文参数']}
};
export function siteLedger(state,inputs){
 const st=stack(state),height=st.at(-1).z+st.at(-1).h,half=Math.sqrt(inputs.plot)/2;
 const fits=[0,...st.map(l=>l.z/height),1].every(t=>profile(state,t).every(([x,y])=>Math.abs(x)<=half+1e-8&&Math.abs(y)<=half+1e-8));
 const gross=grossOf(state),allowance=inputs.plot*inputs.far;
 return {gross,allowance,remaining:allowance-gross,fits};
}
export const WORKSPACES=['form','brief','place','walk','facade','compare','studies'];
export function workspaceForTarget(id){return ({briefPanel:'brief',walkPanel:'walk',contextPanel:'place',locationDesk:'place',exploreTitle:'compare',searchResults:'compare',savedStudies:'studies',facadeDesk:'facade'})[id]||'form'}
const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
export function mountConsole({getData,getBrief,setBrief,onStudyChange,onLevel,onLayout}){
 const $=id=>document.getElementById(id),studio=$('studio'),shell=studio.querySelector('.studio');shell.id='consoleShell';
 let selected='form',rail=0,place=0;
 const bar=node('div','console-site');bar.id='siteBar';const field=(id,type)=>{const l=node('label','console-field'),name=node('span'),input=node('input');input.id=id;input.type=type;l.append(name,input);bar.append(l);return {name,input}};
 const land=field('siteArea','number'),far=field('siteFar','number');land.input.min='1';land.input.max='1000000';land.input.step='any';far.input.min='.1';far.input.max='100';far.input.step='any';
 const cityWrap=node('div','console-field'),cityName=document.querySelector('label[for="city"]');cityWrap.append(cityName,$('city'));bar.append(cityWrap);
 const capacity=node('output','console-capacity'),note=node('span','console-site-note');bar.append(capacity,note);studio.insertBefore(bar,shell);
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
 function syncSite(){const {lang}=getData(),c=CONSOLE_TEXT[lang],inputs=getBrief().inputs;land.name.textContent=c.land;far.name.textContent=c.far;cityName.textContent=c.city;const ledger=siteLedger(getData().state,inputs),fmt=n=>Math.round(n).toLocaleString(lang);capacity.textContent=fmt(ledger.gross)+' / '+fmt(ledger.allowance)+' m²';capacity.setAttribute('aria-label',c.capacity+': '+capacity.textContent);capacity.title=c.capacity;capacity.classList.toggle('console-flag',ledger.remaining<0);note.textContent=ledger.fits?c.assumption:c.crosses;note.classList.toggle('console-flag',!ledger.fits);for(const [f,v]of [[land.input,inputs.plot],[far.input,inputs.far]])if(document.activeElement!==f)f.value=String(v)}
 for(const [input,key]of [[land.input,'plot'],[far.input,'far']])input.onchange=()=>{if(!input.checkValidity()||!Number.isFinite(input.valueAsNumber)){input.reportValidity();input.value=String(getBrief().inputs[key]);return}if(setBrief({[key]:input.valueAsNumber}))onStudyChange();syncSite()};
 function render(){
  const {lang,state,level}=getData(),c=CONSOLE_TEXT[lang];syncSite();nav.setAttribute('aria-label',c.tools);
  buttons.forEach((b,i)=>{b.textContent=c.work[i];b.setAttribute('aria-selected',String(selected===WORKSPACES[i]));b.tabIndex=selected===WORKSPACES[i]?0:-1});
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
 return {render,show,active,openForTarget(id){if(id==='contextPanel')place=1;show(workspaceForTarget(id))}};
}
