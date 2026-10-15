import {READER,SOURCES,ARTIFACTS} from './reader-content.js?v=ad40ee4cdd';
let current=0;
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
function diagram(kind,labels){
 const f=node('figure',undefined,'reader-diagram');
 const wrap=node('div');const line='fill="none" stroke="currentColor" stroke-width="2"';
 const shell=content=>`<svg viewBox="0 0 600 180" aria-hidden="true">${content}</svg>`;
 if(kind==='lineage')wrap.innerHTML=shell(`<path d="M75 65H230V115H390V65H525" ${line}/>${[75,225,385,525].map((x,i)=>`<rect x="${x-25}" y="${i%2?90:40}" width="50" height="50" fill="${i===3?'#f59e0b':'none'}" stroke="currentColor" stroke-width="${i===3?3:1}"/><text x="${x}" y="${i%2?122:72}" text-anchor="middle">${i+1}</text>`).join('')}`);
 if(kind==='loft'){
  const poly=(cx,cy,s,a)=>Array.from({length:4},(_,i)=>{const t=Math.PI/4+i*Math.PI/2+a;return[cx+Math.cos(t)*s,cy+Math.sin(t)*s*.38]});
  let drawing='';for(let col=0;col<4;col++){let prev;
   for(let k=0;k<(col===0?1:5);k++){
    const p=poly(75+col*150,150-k*29,45*(1-k*.08),col>0?k*.13:0);
    if(col>=2&&prev)drawing+=p.map((q,i)=>`<path d="M${prev[i]}L${q}" ${line} opacity=".4"/>`).join('');
    drawing+=`<polygon points="${p.map(q=>q.join(',')).join(' ')}" ${line} ${col===3?'stroke-dasharray="3 2"':''}/>`;prev=p;
   }
  }wrap.innerHTML=shell(drawing);
 }
 if(kind==='ledger')wrap.innerHTML=shell(`<rect x="30" y="22" width="540" height="42" fill="none" stroke="currentColor" stroke-width="2"/><rect x="30" y="22" width="150" height="42" fill="currentColor" opacity=".2"/><rect x="480" y="22" width="90" height="42" fill="#f59e0b"/><path d="M180 72V96H480V72M330 96V119M330 119H180M330 119H480" ${line}/><text x="105" y="49" text-anchor="middle">2</text><text x="325" y="49" text-anchor="middle">3</text><text x="525" y="49" text-anchor="middle">4</text><rect x="165" y="132" width="30" height="30" fill="none" stroke="currentColor"/><text x="180" y="153" text-anchor="middle">5</text><rect x="465" y="132" width="30" height="30" fill="#f59e0b"/><text x="480" y="153" text-anchor="middle">6</text>`);
 if(kind==='city')wrap.innerHTML=shell(`<path d="M300 90L75 35M300 90L300 25M300 90L525 35M300 90L75 145M300 90L300 155M300 90L525 145" ${line}/><path d="M286 110V65L300 50L314 65V110Z" fill="#f59e0b" stroke="currentColor"/>${[[75,35],[300,25],[525,35],[75,145],[300,155],[525,145]].map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="18" fill="var(--panel)" stroke="currentColor"/><text x="${x}" y="${y+5}" text-anchor="middle">${i+1}</text>`).join('')}`);
 f.append(wrap);const legend=node('ol');labels.forEach(l=>legend.append(node('li',l)));f.append(legend);return f;
}
function paragraph(text){
 const p=node('p');for(const part of text.split(/(\[[a-z]+\])/g)){
  const id=part.slice(1,-1),s=SOURCES.find(s=>s.id===id);
  if(s&&part.startsWith('[')){const a=node('a','['+s.author+' '+s.year+']');a.href='#source-'+id;a.onclick=e=>{e.preventDefault();const details=document.getElementById('reader-sources');details.open=true;document.getElementById('source-'+id).scrollIntoView({block:'center'})};p.append(a)}else p.append(document.createTextNode(part));
 }return p;
}
export function renderReader(lang){
 const c=READER[lang],host=document.getElementById('reader');host.replaceChildren();
 document.getElementById('dedicationTitle').textContent={en:'Dedication · MIT classmates, twenty years later',th:'แด่เพื่อนร่วมรุ่น MIT · ยี่สิบปีต่อมา',zh:'献给 MIT 同学 · 二十年后'}[lang];
 document.getElementById('appendixTitle').textContent=c.archive;document.getElementById('appendixNote').textContent=c.archiveNote;
 const nav=node('nav',undefined,'reader-nav');nav.setAttribute('aria-label',c.page);
 c.nav.forEach((title,i)=>{const b=node('button',`${i+1} · ${title}`);b.type='button';b.setAttribute('aria-current',i===current?'page':'false');b.onclick=()=>{current=i;renderReader(lang);host.querySelector('h2').focus({preventScroll:true});host.scrollIntoView({block:'start'})};nav.append(b)});host.append(nav);
 const page=c.pages[current],article=node('article',undefined,'reader-page');article.append(node('p',`${c.page} ${current+1} / 4 · ${page.stand}`,'note'));const h=node('h2',page.title);h.tabIndex=-1;article.append(h);
 page.paras.forEach((p,i)=>{article.append(paragraph(p));if(i===0){article.append(diagram(page.diagram,page.labels),node('p',c.newDiagram,'note'))}});
 if(page.artifact!==undefined){const a=ARTIFACTS[page.artifact],fig=node('figure',undefined,'thesis-artifact');const link=node('a');link.href=a.src;link.target='_blank';link.rel='noopener';const img=node('img');img.src=a.src;img.alt=page.caption;img.loading='lazy';img.width= a.figure===34?310:a.figure===36?267:430;img.height=a.figure===34?397:a.figure===36?543:697;link.append(img);fig.append(link,node('figcaption',`${c.original} · ${c.fig} ${a.figure}, ${c.p} ${a.page}. ${page.caption}`));const original=node('a',c.open);original.href=SOURCES[0].url;original.target='_blank';original.rel='noopener';fig.append(original);article.append(fig)}else article.append(node('p',page.caption,'reader-timeline'));
 const pager=node('div',undefined,'reader-pager');for(const[d,title]of [[-1,c.previous],[1,c.next]]){const b=node('button',title);b.type='button';b.disabled=current+d<0||current+d>3;b.onclick=()=>{current+=d;renderReader(lang);host.querySelector('h2').focus({preventScroll:true});host.scrollIntoView({block:'start'})};pager.append(b)}article.append(pager);host.append(article);
 const details=node('details');details.id='reader-sources';details.append(node('summary',c.source));const list=node('ol');for(const s of SOURCES){const li=node('li');li.id='source-'+s.id;const a=node('a',`${s.author} (${s.year}). ${s.title}.`);a.href=s.url;a.target='_blank';a.rel='noopener';li.append(a,node('p',s.where,'note'));list.append(li)}details.append(list);host.append(details);
}
