import {READER,SOURCES,ARTIFACTS} from './reader-content.js?v=be2235638b';
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
 if(kind==='gaps'){
  // Chapter 6.2 lists three things the 2006 system could not do. Each box is one
  // of them. The mark says what this extension does about it -- and the third is
  // deliberately NOT marked as solved, because instrumented is not certified.
  const S=[{m:false},{m:false},{m:false}];
  let d='';
  S.forEach((g,i)=>{
   const x=30+i*180,y=34,w=160,h=92;
   d+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="currentColor" stroke-width="1.5"/>`;
   d+=`<text x="${x+10}" y="${y+22}" font-size="12" fill="currentColor">${i+1}</text>`;
   d+=`<text x="${x+10}" y="${y+38}" font-size="9" fill="currentColor" opacity=".6">${String(i+1).padStart(2,'0')}</text>`;
   d+=`<text x="${x+10}" y="${y+56}" font-size="9.5" fill="currentColor" opacity=".75">§6.2</text>`;
   // A filled amber bar is a gap closed. An open bracket is a gap still open.
   if(g.m)d+=`<rect x="${x+10}" y="${y+68}" width="${w-20}" height="6" fill="#f59e0b"/>`;
   else d+=`<path d="M${x+10} ${y+74} v-6 h${w-20} v6" fill="none" stroke="currentColor" stroke-width="1.5"/>`;
  });
  d+=`<path d="M30 140H570" ${line}/>`;
  d+=`<text x="30" y="158" font-size="9" fill="currentColor" opacity=".6">2006 · Chapter 6.2</text>`;
  d+=`<text x="570" y="158" text-anchor="end" font-size="9" fill="currentColor" opacity=".6">2026 · this instrument</text>`;
  wrap.innerHTML=shell(d);
 }
 if(kind==='timeline'){
  // Seven stops on one axis, left to right, because the order is the argument.
  // Each glyph is a 40x40 schematic showing only the idea that made the next
  // stop possible — the frame leaving the wall, the square room, the glass hung
  // outside the piers, the slab leaving the column, the core arriving in the middle.
  // Every path here carries an explicit fill. An SVG path with no fill
  // defaults to black AND auto-closes, so "line work" written as a bare path
  // paints a solid block instead of drawing a line — which is what the first
  // version of this diagram did.
  const F='fill="none" stroke="currentColor"';
  const G=[
   // frame inside the wall, masonry still carrying the lower storeys
   `<g ${F} stroke-width="1.4"><rect x="1" y="1" width="38" height="38"/></g>
    <g ${F} stroke-width="1"><path d="M9 1V39M31 1V39M1 9H39M1 31H39M9 20H31M20 9V31"/></g>
    <g fill="currentColor" opacity=".55"><rect x="1" y="1" width="6" height="38"/><rect x="33" y="1" width="6" height="38"/></g>`,
   // a square room, two windows, and the corner nobody would pay rent for
   `<g ${F} stroke-width="1.6"><rect x="3" y="3" width="34" height="34"/></g>
    <g fill="none" stroke="currentColor" stroke-width="1.2"><rect x="5" y="16" width="13" height="8" fill="var(--paper,#e9eae7)"/><rect x="22" y="16" width="13" height="8" fill="var(--paper,#e9eae7)"/></g>
    <g fill="currentColor" opacity=".5"><rect x="30" y="3" width="7" height="7"/></g>`,
   // a printed page, free to read since 1896
   `<g ${F} stroke-width="1.4"><rect x="9" y="1" width="24" height="38"/></g>
    <g ${F} stroke-width="2"><path d="M15 9H27M15 16H27M15 23H27M15 30H22"/></g>
    <path d="M4 10q0-7 7-7q-4 1-4 4t4 4" fill="#f59e0b"/>`,
   // brick piers behind, glass hung outside them
   `<g fill="currentColor" opacity=".45"><rect x="6" y="1" width="8" height="38"/><rect x="17" y="1" width="8" height="38"/><rect x="28" y="1" width="8" height="38"/></g>
    <g ${F} stroke-width="1.2"><rect x="1" y="1" width="38" height="38"/></g>
    <g ${F} stroke-width=".9"><path d="M11 1V39M22 1V39M33 1V39M1 14H39M1 27H39"/></g>`,
   // slabs cantilevered clear of the columns, so the corner can be glass
   `<g fill="var(--paper,#e9eae7)" stroke="currentColor" stroke-width="1.3"><rect x="0" y="6" width="40" height="28"/></g>
    <g fill="none" stroke="#f59e0b" stroke-width="1.8"><path d="M12 16l5-3 5 3v6l-5 3-5-3zM24 16l5-3 5 3v6l-5 3-5-3z"/></g>
    <g ${F} stroke-width=".8"><path d="M0 6H40M0 34H40"/></g>`,
   // a whole wall of glass on an aluminium frame
   `<g fill="var(--paper,#e9eae7)" stroke="currentColor" stroke-width="2.4"><rect x="1" y="1" width="38" height="38"/></g>
    <g ${F} stroke-width="1"><path d="M11 1V39M21 1V39M31 1V39M1 11H39M1 21H39M1 31H39"/></g>`,
   // the core in the middle, and the slabs leaving the edges to reach it
   `<g fill="var(--paper,#e9eae7)" stroke="currentColor" stroke-width="1.3"><rect x="1" y="1" width="38" height="38"/></g>
    <g fill="currentColor" opacity=".35"><rect x="14" y="14" width="12" height="12"/></g>
    <g ${F} stroke-width="1.3"><rect x="14" y="14" width="12" height="12"/><path d="M14 14L1 1M26 14L39 1M26 26L39 39M14 26L1 39"/></g>
    <g ${F} stroke-width=".7"><path d="M8 1V39M32 1V39M1 8H39M1 32H39"/></g>`
  ];
  const Y=['1884','1894','1896','1909','1918','1928–31?','1952'];
  const N=G.length,w=(540-60)/N;
  let d=`<path d="M30 112H570" ${line}/>`;
  G.forEach((g,i)=>{
   const x=30+w*(i+.5);
   d+=`<g transform="translate(${(x-20).toFixed(1)},44)" opacity=".9">${g}</g>`;
   d+=`<text x="${x.toFixed(1)}" y="132" text-anchor="middle" font-size="9" fill="currentColor" opacity=".7">${Y[i]}</text>`;
   d+=`<circle cx="${x.toFixed(1)}" cy="112" r="11" fill="var(--paper,#e9eae7)" stroke="currentColor"/>`;
   d+=`<text x="${x.toFixed(1)}" y="116" text-anchor="middle" font-size="11" fill="currentColor">${i+1}</text>`;
  });
  wrap.innerHTML=shell(d);
 }
 f.append(wrap);const legend=node('ol');labels.forEach(l=>legend.append(node('li',l)));f.append(legend);return f;
}
function paragraph(text){
 const p=node('p');for(const part of text.split(/(\[[a-z]+\])/g)){
  const id=part.slice(1,-1),s=SOURCES.find(s=>s.id===id);
  if(s&&part.startsWith('[')){const a=node('a','['+s.author+' '+s.year+']');a.href='#source-'+id;a.onclick=e=>{e.preventDefault();const details=document.getElementById('reader-sources');details.open=true;document.getElementById('source-'+id).scrollIntoView({block:'center'})};p.append(a)}else p.append(document.createTextNode(part));
 }return p;
}
export function renderReader(lang,host=document.getElementById('reader')){
 const c=READER[lang];host.replaceChildren();
 document.getElementById('dedicationTitle').textContent={en:'Dedication · MIT classmates, twenty years later',th:'แด่เพื่อนร่วมรุ่น MIT · ยี่สิบปีต่อมา',zh:'献给 MIT 同学 · 二十年后'}[lang];
 document.getElementById('appendixTitle').textContent=c.archive;document.getElementById('appendixNote').textContent=c.archiveNote;
 const nav=node('nav',undefined,'reader-nav');nav.setAttribute('aria-label',c.page);
 c.nav.forEach((title,i)=>{const b=node('button',`${i+1} · ${title}`);b.type='button';b.setAttribute('aria-current',i===current?'page':'false');b.onclick=()=>{current=i;renderReader(lang,host);host.querySelector('h2').focus({preventScroll:true});host.scrollIntoView({block:'start'})};nav.append(b)});host.append(nav);
 const page=c.pages[current],article=node('article',undefined,'reader-page');article.append(node('p',`${c.page} ${current+1} / ${c.pages.length} · ${page.stand}`,'note'));const h=node('h2',page.title);h.tabIndex=-1;article.append(h);
 page.paras.forEach((p,i)=>{article.append(paragraph(p));if(i===0){article.append(diagram(page.diagram,page.labels),node('p',c.newDiagram,'note'))}});
 if(page.artifact!==undefined){const a=ARTIFACTS[page.artifact],fig=node('figure',undefined,'thesis-artifact');const link=node('a');link.href=a.src;link.target='_blank';link.rel='noopener';const img=node('img');img.src=a.src;img.alt=page.caption;img.loading='lazy';img.width= a.figure===34?310:a.figure===36?267:430;img.height=a.figure===34?397:a.figure===36?543:697;link.append(img);fig.append(link,node('figcaption',`${c.original} · ${c.fig} ${a.figure}, ${c.p} ${a.page}. ${page.caption}`));const original=node('a',c.open);original.href=SOURCES[0].url;original.target='_blank';original.rel='noopener';fig.append(original);article.append(fig)}else article.append(node('p',page.caption,'reader-timeline'));
 const pager=node('div',undefined,'reader-pager');for(const[d,title]of [[-1,c.previous],[1,c.next]]){const b=node('button',title);b.type='button';b.disabled=current+d<0||current+d>c.pages.length-1;b.onclick=()=>{current+=d;renderReader(lang,host);host.querySelector('h2').focus({preventScroll:true});host.scrollIntoView({block:'start'})};pager.append(b)}article.append(pager);host.append(article);
 const details=node('details');details.id='reader-sources';details.append(node('summary',c.source));const list=node('ol');for(const s of SOURCES){const li=node('li');li.id='source-'+s.id;const a=node('a',`${s.author} (${s.year}). ${s.title}.`);a.href=s.url;a.target='_blank';a.rel='noopener';li.append(a,node('p',s.where,'note'));list.append(li)}details.append(list);host.append(details);
}
