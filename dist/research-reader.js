import {TRACKS,RESEARCH_UI,RESEARCH_SOURCES,THESIS_EXCERPTS,HISTORY_PHOTO,PROTOCOL_FILES} from './research-tracks.js?v=111b4431ba';
import {renderReader as renderEarlierReader} from './reader.js?v=038b0f658e';
import {defaults,evaluate,grossOf,profile,families} from './model.js?v=83bfd6e335';
const N=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
let selected=0,pages=[0,0,0],initialised=false;
export function readingSelection(search=''){
 const q=new URLSearchParams(search),track=Math.max(0,TRACKS.en.findIndex(x=>x.id===q.get('reading')));
 return {track,page:Math.max(0,TRACKS.en[track].pages.findIndex(x=>x.id===q.get('chapter')))};
}
export function researchComparison(state=defaults){
 const target=grossOf(state);
 return ['box','cross','oval'].map(family=>{
  const s={...state,family};s.span*=Math.sqrt(target/grossOf(s));
  return {family,state:s,metrics:evaluate(s)};
 });
}
export function researchProtocol(lang){
 const c=RESEARCH_UI[lang],track=TRACKS[lang][2];
 return [c.protocolTitle,c.by,c.protocolState,...track.pages.flatMap(p=>[p.title,p.stand,...p.paras.map(s=>s.replace(/\[([a-z]+)\]/g,(_,id)=>{const s=RESEARCH_SOURCES.find(x=>x.id===id);return `(${s.author}, ${s.year})`})),p.table.head.join(' | '),...p.table.rows.map(r=>r.join(' | '))]),c.source,...RESEARCH_SOURCES.filter(s=>['chen','non','urban','agency'].includes(s.id)).map(s=>`${s.author} (${s.year}). ${s.title}. ${s.url}`),c.unsupported].join('\n\n');
}
const F='fill="none" stroke="currentColor"';
function tower(cx,base,scale=1,twist=0,family='box'){
 let lines='',prev;
 for(let i=0;i<6;i++){
  const p=profile({...defaults,family,span:68*scale,taper:.65,twist},i/5).map(([x,y])=>[cx+x,base-i*22*scale+y*.32]);
  if(prev)lines+=p.map((v,j)=>`<path d="M${prev[j]}L${v}" ${F} stroke-width=".8" opacity=".55"/>`).join('');
  lines+=`<polygon points="${p.map(v=>v.join(',')).join(' ')}" ${F} stroke-width="${i===0||i===5?2:1}"/>`;prev=p;
 }return lines;
}
function circle(x,y,i){return `<circle cx="${x}" cy="${y}" r="12" fill="var(--paper)" stroke="currentColor" stroke-width="1.5"/><text x="${x}" y="${y+4}" text-anchor="middle">${i}</text>`}
function illustration(kind,labels,lang){
 const fig=N('figure',undefined,'research-illustration');let d='';
 if(kind==='chapters'){
  d=`<path d="M45 150H665" ${F} stroke-width="3"/>`;
  for(let i=0;i<6;i++){
   const x=55+i*120;d+=circle(x,150,i+1);
   if(i===0)d+=`<path d="M${x-22} 45h44v66h-44zM${x-14} 62h28m-28 12h28m-28 12h19" ${F} stroke-width="2"/>`;
   if(i===1)d+=`<path d="M${x-28} 51h56v40h-56zM${x} 91v20m-18 0h36" ${F} stroke-width="2"/><path d="M${x-15} 65h30m-30 10h22" ${F}/>`;
   if(i===2)d+=[-26,-7,13].map((a,j)=>`<rect x="${x+a}" y="${65-j*12}" width="15" height="${48+j*12}" ${F} stroke-width="1.5"/>`).join('');
   if(i===3)d+=tower(x,112,.55,20);
   if(i===4)d+=tower(x-17,112,.45,0,'cross')+tower(x+20,112,.45,45,'cross');
   if(i===5)d+=`<path d="M${x-23} 45v68h46V45M${x-12} 60h24m-24 16h24m-24 16h12" ${F} stroke-width="2"/>`;
  }
 }
 if(kind==='loft'){
  for(let i=0;i<4;i++){const x=90+i*175;
   if(i===0)d+=`<path d="M${x-38} 105l38-20 38 20-38 20z" ${F} stroke-width="2"/>`;
   else d+=tower(x,145,.85,i===1?0:35,i===3?'cross':'box');
   if(i<3)d+=`<path d="M${x+52} 93h49l-7-5m7 5-7 5" ${F} stroke-width="1.5"/>`;
   d+=circle(x,181,i+1);
  }
 }
 if(kind==='evidence'){
  d=tower(85,150,.9,0,'cross')+tower(270,150,.9,60,'cross')+tower(450,150,.9,-20,'cross');
  d+=`<path d="M400 162h100v-118h-100zM410 34h80m-40 0v19M570 66h110v82H570zM580 141l20-20 23 6 27-36 18 6" ${F} stroke-width="1.5" stroke-dasharray="5 4"/>`;
  [85,270,450,625].forEach((x,i)=>d+=circle(x,181,i+1));
 }
 if(kind==='bridge'){
  d=`<path d="M60 125H660" ${F} stroke-width="3"/>`;
  ['2006','2007','2008–2016','2026'].forEach((y,i)=>{const x=70+i*185;d+=circle(x,125,i+1)+`<text x="${x}" y="159" text-anchor="middle">${y}</text>`});
  d+=tower(70,92,.55,20,'cross')+tower(625,96,.7,45,'oval');
  d+=`<path d="M238 40h34v52h-34zM247 51h16m-16 10h16m-16 10h12M423 92V62h9V45h13v47m4 0V70h20V54h12v38" ${F} stroke-width="1.7"/>`;
 }
 if(kind==='stack'){
  const ys=[22,62,102,142,182],names=['brief.js','geometry.js + model.js','model.js','solar.js / context.js / location.js','OBJ / JSON / CSV'];
  ys.forEach((y,i)=>{d+=`<path d="M75 ${y}H122m-47 0v${i===4?0:40}" ${F} stroke-width="2"/>`+circle(75,y,i+1)+`<text x="133" y="${y+5}">${names[i]}</text>`});
  d+=tower(590,154,.9,35,'cross')+`<path d="M480 25h-18v130h18M470 102H425" ${F} stroke-width="1.2"/>`;
 }
 if(kind==='city'){
  d=tower(360,135,.7,30,'oval')+`<path d="M285 153h150" ${F} stroke-width="3"/>`;
  [[100,38],[360,25],[620,38],[100,155],[360,188],[620,155]].forEach(([x,y],i)=>d+=`<path d="M${x} ${y}L360 100" ${F} stroke-width="1"/>`+circle(x,y,i+1));
 }
 if(kind==='market'){
  d=`<path d="M90 95H620" ${F} stroke-width="2"/>`;
  [90,270,450,630].forEach((x,i)=>{d+=circle(x,164,i+1);d+=i===0?tower(x,125,.55,0,'cross'):`<path d="M${x-31} 48h62v76h-62zM${x-20} 65h40m-40 15h40m-40 15h26" ${F} stroke-width="${i===3?3:1.5}"/>`});
 }
 if(kind==='experiment'){
  ['box','cross','oval'].forEach((family,i)=>{d+=tower(105+i*185,143,.85,0,family);d+=`<path d="M${60+i*185} 163h90" ${F} stroke-width="3"/>`+circle(105+i*185,190,i+1)});
  d+=`<path d="M598 48h65v100h-65zM611 65h39m-39 18h39m-39 18h24M598 128h65" ${F} stroke-width="1.5"/>`+circle(630,190,4);
 }
 if(kind==='paper'){
  [80,265,450,635].forEach((x,i)=>{d+=`<path d="M${x-35} 40h70v100h-70zM${x-22} 58h44m-44 12h44m-44 12h35" ${F} stroke-width="${i===3?3:1.5}"/>`+circle(x,173,i+1);
   if(i===0)d+=`<text x="${x}" y="123" text-anchor="middle" font-size="30">?</text>`;
   if(i===1)d+=`<path d="M${x-20} 123l12-20 16 8 12-13" ${F} stroke-width="2"/>`;
   if(i===2)d+=`<path d="M${x-20} 126v-25m16 25v-16m16 16v-31" ${F} stroke-width="6"/>`;
   if(i===3)d+=`<path d="M${x-18} 115l12 12 25-29" ${F} stroke-width="2"/>`;
  });
 }
 const svg=N('div');svg.innerHTML=`<svg viewBox="0 0 720 210" aria-hidden="true">${d}</svg>`;fig.append(svg);
 const caption=N('figcaption');caption.append(N('p',RESEARCH_UI[lang].drawing,'note'));const list=N('ol');labels.forEach(l=>list.append(N('li',l)));caption.append(list);fig.append(caption);return fig;
}
function paragraph(text,sourceIds){
 const p=N('p');for(const part of text.split(/(\[[a-z]+\])/g)){
  const id=part.slice(1,-1),s=RESEARCH_SOURCES.find(s=>s.id===id);
  if(s&&part.startsWith('[')){sourceIds.add(id);const a=N('a',`[${s.author}, ${s.year}]`);a.href='#research-source-'+id;a.onclick=e=>{e.preventDefault();const details=document.getElementById('research-sources');details.open=true;const target=document.getElementById('research-source-'+id);target.scrollIntoView({block:'center'});target.querySelector('a').focus({preventScroll:true})};p.append(a)}else p.append(document.createTextNode(part));
 }return p;
}
function table(data,caption){
 const wrap=N('div',undefined,'research-table-wrap'),t=N('table');wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',caption);t.append(N('caption',caption));const head=N('thead'),hr=N('tr');data.head.forEach(h=>{const th=N('th',h);th.scope='col';hr.append(th)});head.append(hr);t.append(head);const body=N('tbody');data.rows.forEach(row=>{const tr=N('tr');row.forEach((v,i)=>{const cell=N(i===0?'th':'td',v);if(i===0)cell.scope='row';tr.append(cell)});body.append(tr)});t.append(body);wrap.append(t);return wrap;
}
function artifact(item,lang){
 const c=RESEARCH_UI[lang],a=THESIS_EXCERPTS[item.id],fig=N('figure',undefined,'research-excerpt'+(a.width/a.height<.8?' research-excerpt-portrait':''));
 const link=N('a');link.href=a.src;link.target='_blank';link.rel='noopener';const img=N('img');img.src=a.src;img.alt=item.caption;img.loading='lazy';img.width=a.width;img.height=a.height;img.style.width=Math.min(a.width,520*a.width/a.height)+'px';img.style.aspectRatio=a.width+' / '+a.height;link.append(img);
 const cap=N('figcaption');cap.append(N('p',`${c.original} · ${c.fig} ${a.figure} · ${c.page} ${a.page}`,'note'),N('p',item.caption));const source=N('a',c.open);source.href=RESEARCH_SOURCES[0].url;source.target='_blank';source.rel='noopener';cap.append(source);fig.append(link,cap);return fig;
}
function atlas(lang){
 const c=RESEARCH_UI[lang],fig=N('figure',undefined,'research-atlas');fig.append(N('figcaption',c.atlasTitle));
 const grid=N('div');Object.keys(families).forEach((family,i)=>{
  const item=N('figure'),p=profile({...defaults,family,span:1,aspect:1,orientation:0},0),r=Math.max(...p.flat().map(Math.abs)),s=38/r;
  const pts=p.map(([x,y])=>[50+x*s,50-y*s]),drawing=N('div');
  drawing.innerHTML=`<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 3V97M3 50H97" ${F} opacity=".18" stroke-width=".5"/><polygon points="${pts.map(v=>v.join(',')).join(' ')}" ${F} stroke-width="1.5"/>${pts.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.6" fill="#f59e0b"/>`).join('')}</svg>`;
  item.append(drawing,N('figcaption',`${i+1} · ${c.atlasLabels[i]}`));grid.append(item);
 });fig.append(grid,N('p',c.atlasNote,'note'));return fig;
}
function comparisonPlot(rows,lang){
 const c=RESEARCH_UI[lang],fig=N('figure',undefined,'research-tradeoff'),x=rows.map(r=>r.metrics.facade),y=rows.map(r=>r.metrics.contribution);
 const loX=Math.min(...x),hiX=Math.max(...x),loY=Math.min(...y),hiY=Math.max(...y),dx=hiX-loX||Math.max(1,Math.abs(loX)*.1),dy=hiY-loY||Math.max(1,Math.abs(loY)*.1),sx=v=>80+560*(v-loX)/dx,sy=v=>210-170*(v-loY)/dy;
 let d=`<path d="M80 40V210H640" ${F} stroke-width="1.5"/>`;
 const compact=v=>new Intl.NumberFormat(lang,{notation:'compact',maximumFractionDigits:1}).format(v);
 for(const fraction of [0,.5,1]){const px=80+560*fraction,py=210-170*fraction;
  d+=`<path d="M${px} 210v5M75 ${py}h5" ${F}/><text x="${px}" y="237" text-anchor="middle">${compact(loX+dx*fraction)}</text><text x="68" y="${py+4}" text-anchor="end">${compact(loY+dy*fraction)}</text>`;
 }
 rows.forEach((r,i)=>{const px=sx(x[i]),py=sy(y[i]);d+=`<path d="M${px} 210V${py}H80" ${F} stroke-width=".7" stroke-dasharray="4 4" opacity=".5"/>`+circle(px,py,i+1)});
 const wrap=N('div');wrap.innerHTML=`<svg viewBox="0 0 720 260" aria-hidden="true">${d}</svg>`;
 fig.append(N('figcaption',c.plotTitle),N('p',`↑ ${c.plotY} · → ${c.plotX}`,'note'),wrap);
 const legend=N('ol');rows.forEach((r,i)=>legend.append(N('li',c.shapes[i])));fig.append(legend);return fig;
}
export function renderReader(lang,options={}){
 const c=RESEARCH_UI[lang],tracks=TRACKS[lang],host=document.getElementById('reader');
 if(!initialised){const s=readingSelection(location.search);selected=s.track;pages[selected]=s.page;initialised=true}
 const track=tracks[selected],index=pages[selected],page=track.pages[index];host.replaceChildren();
 document.getElementById('dedicationTitle').textContent={en:'Dedication · MIT classmates, twenty years later',th:'แด่เพื่อนร่วมรุ่น MIT · ยี่สิบปีต่อมา',zh:'献给 MIT 同窗 · 二十年后'}[lang];
 // The old six-page reader stays reachable in its own disclosure, with its
 // original drawings, sources and captions. The longer appendix also remains.
 const navigate=(ti,pi,focus)=>{
  selected=ti;pages[ti]=pi;const url=new URL(location.href);url.searchParams.set('reading',tracks[ti].id);url.searchParams.set('chapter',tracks[ti].pages[pi].id);history.replaceState(null,'',url);
  renderReader(lang,options);const target=host.querySelector(focus);target?.focus({preventScroll:true});if(focus==='#research-reading-title')target?.scrollIntoView({block:'start'});
 };
 function tablist(items,active,label,idPrefix,onSelect){
  const nav=N('div',undefined,idPrefix==='path'?'research-paths':'research-chapters');nav.setAttribute('role','tablist');nav.setAttribute('aria-label',label);
  items.forEach((text,i)=>{const b=N('button',idPrefix==='path'?undefined:text);b.type='button';b.id=`research-${idPrefix}-${i}`;b.setAttribute('role','tab');b.setAttribute('aria-selected',String(active===i));b.setAttribute('aria-controls',idPrefix==='path'?'research-path-panel':'research-reading-panel');b.tabIndex=active===i?0:-1;
   if(idPrefix==='path'){const short={en:['Thesis · 2006','System · 2026','Commercial'],th:['วิทยานิพนธ์ · 2006','ระบบ · 2026','เชิงพาณิชย์'],zh:['论文 · 2006','系统 · 2026','商业研究']}[lang];b.setAttribute('aria-label',text);b.append(N('span',text,'research-path-full'),N('span',short[i],'research-path-short'))}
   b.onclick=()=>onSelect(i);b.onkeydown=e=>{let n;if(e.key==='ArrowRight')n=(i+1)%items.length;if(e.key==='ArrowLeft')n=(i+items.length-1)%items.length;if(e.key==='Home')n=0;if(e.key==='End')n=items.length-1;if(n!==undefined){e.preventDefault();onSelect(n)}};nav.append(b)});return nav;
 }
 host.append(tablist(tracks.map(t=>t.label),selected,c.tracks,'path',i=>navigate(i,pages[i],`#research-path-${i}`)));
 const path=N('section');path.id='research-path-panel';path.setAttribute('role','tabpanel');path.setAttribute('aria-labelledby',`research-path-${selected}`);path.append(N('p',track.intro,'research-path-intro'),N('p',c.minutes,'note'));
 path.append(tablist(track.pages.map(p=>p.tab),index,c.sections,'chapter',i=>navigate(selected,i,`#research-chapter-${i}`)));
 const article=N('article',undefined,'research-reading');article.id='research-reading-panel';article.setAttribute('role','tabpanel');article.setAttribute('aria-labelledby',`research-chapter-${index}`);
 article.append(N('p',`${selected*3+index+1} / 9 · ${page.stand}`,'note'));const title=N('h2',page.title);title.id='research-reading-title';title.tabIndex=-1;article.append(title);
 const sourceIds=new Set();article.append(paragraph(page.paras[0],sourceIds),illustration(page.diagram,page.labels,lang));page.paras.slice(1).forEach(p=>article.append(paragraph(p,sourceIds)));
 if(track.id==='system'&&page.id==='history'){const f=N('figure',undefined,'research-history-photo'),img=N('img');img.src=HISTORY_PHOTO.src;img.alt=HISTORY_PHOTO.caption[lang];img.width=HISTORY_PHOTO.width;img.height=HISTORY_PHOTO.height;img.loading='lazy';f.append(img,N('figcaption',HISTORY_PHOTO.caption[lang]));article.append(f)}
 if(page.table)article.append(table(page.table,page.tab));
 if(track.id==='system'&&page.id==='architecture')article.append(atlas(lang));
 if(page.comparison){
  article.append(N('h3',c.comparison),N('p',c.comparisonNote));const fmt=n=>new Intl.NumberFormat(lang,{maximumFractionDigits:1}).format(n);
  const results=researchComparison(options.state||defaults),rows=results.map((r,i)=>[c.shapes[i],fmt(r.metrics.gross),fmt(r.metrics.cornerArea/Math.max(1,r.metrics.rentable)*100),fmt(r.metrics.facade),fmt(r.metrics.contribution),r.metrics.valid?c.yes:c.no]);
  article.append(comparisonPlot(results,lang),table({head:[c.family,c.gross,c.corner,c.skin,c.contribution,c.feasible],rows},c.comparison),N('p',c.comparisonFoot,'note'));
 }
 if(page.artifacts){sourceIds.add('chen');page.artifacts.forEach(a=>article.append(artifact(a,lang)))}
 if(page.action&&options.onNavigate){const b=N('button',`${page.action.label} →`, 'research-try');b.type='button';b.onclick=()=>options.onNavigate(page.action.desk);article.append(b)}
 if(page.download){article.append(N('p',c.protocolState,'research-status'));const a=N('a',`${c.protocol} ↓`,'research-download');a.download=`formhypes-research-protocol-${lang}.txt`;a.href=PROTOCOL_FILES[lang];article.append(a)}
 const refs=N('details');refs.id='research-sources';refs.append(N('summary',c.source));const list=N('ol');for(const id of sourceIds){const s=RESEARCH_SOURCES.find(s=>s.id===id),li=N('li'),a=N('a',`${s.author} (${s.year}). ${s.title}.`);li.id='research-source-'+id;a.href=s.url;a.target='_blank';a.rel='noopener';li.append(a);list.append(li)}refs.append(list,N('p',c.unsupported,'note'));article.append(refs);
 const pager=N('nav',undefined,'reader-pager');pager.setAttribute('aria-label',c.progress);
 for(const [d,label]of [[-1,c.previous],[1,c.next]]){const linear=selected*3+index+d,b=N('button',`${d<0?'← ':''}${label}${d>0?' →':''}`);b.type='button';b.disabled=linear<0||linear>8;b.onclick=()=>navigate(Math.floor(linear/3),linear%3,'#research-reading-title');pager.append(b)}article.append(pager);path.append(article);host.append(path);
 const legacy=N('details',undefined,'research-legacy');legacy.append(N('summary',c.legacy));const earlier=N('div');earlier.id='legacyReader';legacy.append(earlier);host.append(legacy);renderEarlierReader(lang,earlier);
}
