/* FormHypes — assembly instructions.

   The landing page is an assembly manual for a skyscraper, in the visual
   grammar of a flat-pack instruction booklet: black line drawings on white,
   almost no words, numbered steps, a parts inventory, a figure with the tools
   it needs, and ✕ / ✓ panels. The joke is the honest one: Chen's 2006 thesis
   is the flat pack, and this page shows how it goes together.

   Every tower and plan here is drawn by the model itself — profile() at each
   level, projected axonometrically with back faces removed — so the manual
   cannot show a building the studio would not make. Nothing is clip art. The
   one amber mark is the last step: enter. */
import {profile,stackHeight,families,defaults,evaluate} from './model.js?v=67662478b8';
import {WORK_GLYPHS,WORKSPACES,CONSOLE_TEXT} from './console.js?v=53152fcba5';

const NS='http://www.w3.org/2000/svg';
const C30=Math.cos(Math.PI/6),S30=Math.sin(Math.PI/6);
const f1=v=>Math.round(v*10)/10;

export const ASSEMBLY_TEXT={
 en:{
  product:'FORMHYPES',credit:'Dr Non · depa + Axiom',after:'after Shouheng Chen, MIT 2006',
  skip:'Skip to the studio',enter:'Enter the studio',read:'Read the research',
  tools:'You will need',toolsList:['an idea','a ruler','a screen'],
  notFor:'Concept prototype — not for construction',noBuild:'Not for construction',ask:'Read the research',alone:'One person',
  parts:'Parts',plans:'Plans',desks:'Desks',
  steps:['Choose a plan','Stack the floors','Taper and twist','Fit the core','Test it','Read the value','Keep the best one','Enter'],
  floorsLabel:'{n} floors · {h} m',
  value:'per year · scenario',valueNote:'Rent minus reserves. Not a valuation.',
  index:'Index',groups:{structure:'Structure',services:'Services',form:'Shape',place:'Site',decide:'Decide',read:'Read'},
  research:'Research',page:'p.',
  colophon:'Shouheng Chen, Embedding Methods for Massing and Detail Design in Computer Generated Design of Skyscrapers, MIT SMArchS, 2006. FormHypes is a 2026 extension by Dr Non at depa + Axiom: every drawing in this booklet is drawn by the studio’s own model.',
  doc:'AA-2006-2026'},
 th:{
  product:'FORMHYPES',credit:'Dr Non · depa + Axiom',after:'ต่อยอดจาก Shouheng Chen, MIT 2006',
  skip:'ข้ามไปที่สตูดิโอ',enter:'เข้าสู่สตูดิโอ',read:'อ่านงานวิจัย',
  tools:'สิ่งที่ต้องใช้',toolsList:['ความคิด','ไม้บรรทัด','หน้าจอ'],
  notFor:'ต้นแบบเชิงแนวคิด ไม่ใช่แบบก่อสร้าง',noBuild:'ไม่ใช่แบบก่อสร้าง',ask:'อ่านงานวิจัย',alone:'คนเดียวพอ',
  parts:'ชิ้นส่วน',plans:'ผังพื้น',desks:'โต๊ะทำงาน',
  steps:['เลือกผังพื้น','ซ้อนชั้น','เรียวและบิด','ใส่แกนอาคาร','ทดสอบ','อ่านมูลค่า','เก็บแบบที่ดีที่สุด','เข้าสตูดิโอ'],
  floorsLabel:'{n} ชั้น · {h} ม.',
  value:'ต่อปี · สมมติฐาน',valueNote:'ค่าเช่าหักเงินสำรอง ไม่ใช่การประเมินมูลค่า',
  index:'สารบัญ',groups:{structure:'โครงสร้าง',services:'งานระบบ',form:'ทรงอาคาร',place:'ทำเล',decide:'ตัดสินใจ',read:'อ่าน'},
  research:'งานวิจัย',page:'น.',
  colophon:'Shouheng Chen, Embedding Methods for Massing and Detail Design in Computer Generated Design of Skyscrapers, MIT SMArchS, 2006 · FormHypes เป็นงานต่อยอดปี 2026 โดย Dr Non ที่ depa + Axiom ภาพทุกภาพในคู่มือเล่มนี้วาดโดยแบบจำลองของสตูดิโอเอง',
  doc:'AA-2006-2026'},
 zh:{
  product:'FORMHYPES',credit:'Dr Non · depa + Axiom',after:'源自陈寿恒，MIT 2006',
  skip:'直接进入工作室',enter:'进入工作室',read:'阅读研究',
  tools:'所需工具',toolsList:['一个想法','一把尺','一块屏幕'],
  notFor:'概念原型——不可用于施工',noBuild:'不可用于施工',ask:'阅读研究',alone:'一人即可',
  parts:'零件',plans:'平面',desks:'工作台',
  steps:['选择平面','叠加楼层','收分与扭转','放入核心筒','测试','读取价值','保留最佳方案','进入'],
  floorsLabel:'{n} 层 · {h} 米',
  value:'每年 · 情景',valueNote:'租金减去储备，不是估值。',
  index:'目录',groups:{structure:'结构',services:'设备',form:'造型',place:'基地',decide:'决策',read:'阅读'},
  research:'研究',page:'第',
  colophon:'陈寿恒，《Embedding Methods for Massing and Detail Design in Computer Generated Design of Skyscrapers》，MIT SMArchS，2006。FormHypes 是 Dr Non 于 depa + Axiom 在 2026 年的延伸：本手册中的每一幅图都由工作室自身的模型绘制。',
  doc:'AA-2006-2026'}
};

// Workspace groups for the index. Every console workspace appears exactly once.
export const INDEX_GROUPS=[
 ['structure',['core','lifts','fire','wind','carbon']],
 ['services',['water','glare']],
 ['form',['form','brief','detail','facade']],
 ['place',['place','feng','walk']],
 ['decide',['compare','studies']]
];

/* ── drawing ─────────────────────────────────────────────────────────────── */
const axo=(x,y,z)=>[(x-y)*C30,(x+y)*S30-z];

/* An axonometric line drawing of a tower: floor lines and vertical edges on the
   faces that look toward the reader, and the whole roof. A face is visible when
   its outward normal points at the viewer, who stands on the (+x,+y) side; the
   plans are counter-clockwise, so an edge (dx,dy) faces out along (dy,−dx). */
export function towerLines(s,{every=4,floorsEvery=every}={}){
 const H=stackHeight(s),n=s.floors,steps=[];
 for(let f=0;f<=n;f+=every)steps.push(f);
 if(steps[steps.length-1]!==n)steps.push(n);
 const levels=steps.map(f=>{const t=f/n;return {z:H*t,p:profile(s,t)}});
 const vis=p=>p.map((a,j)=>{const b=p[(j+1)%p.length],dx=b[0]-a[0],dy=b[1]-a[1];return dy-dx>1e-9});
 const floors=[],edges=[],top=[];
 levels.forEach((L,i)=>{
  const v=vis(L.p),k=L.p.length;
  if(i<levels.length-1&&steps[i]%floorsEvery===0)for(let j=0;j<k;j++)if(v[j])floors.push([axo(...L.p[j],L.z),axo(...L.p[(j+1)%k],L.z)]);
  if(i<levels.length-1){const N=levels[i+1];for(let j=0;j<k;j++)if(v[j]||v[(j-1+k)%k])edges.push([axo(...L.p[j],L.z),axo(...N.p[j],N.z)])}
 });
 const T=levels[levels.length-1];for(let j=0;j<T.p.length;j++)top.push([axo(...T.p[j],T.z),axo(...T.p[(j+1)%T.p.length],T.z)]);
 return {floors,edges,top,H};
}

function fit(segs,w,h,pad=8){
 let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
 for(const s of segs)for(const [x,y]of s){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}
 const k=Math.min((w-2*pad)/Math.max(1e-9,x1-x0),(h-2*pad)/Math.max(1e-9,y1-y0));
 const ox=(w-(x1-x0)*k)/2-x0*k,oy=(h-(y1-y0)*k)/2-y0*k;
 return ([x,y])=>[f1(x*k+ox),f1(y*k+oy)];
}
const path=(segs,T)=>segs.map(([a,b])=>{const p=T(a),q=T(b);return `M${p[0]} ${p[1]}L${q[0]} ${q[1]}`}).join('');

export function towerSVG(s,{w=200,h=320,every=4,floorsEvery=every,label=''}={}){
 const L=towerLines(s,{every,floorsEvery}),T=fit([...L.floors,...L.edges,...L.top],w,h);
 return `<svg viewBox="0 0 ${w} ${h}" class="am-tw" role="img" aria-label="${label}">`
  +`<path d="${path(L.floors,T)}" class="am-thin"/><path d="${path(L.edges,T)}" class="am-line"/><path d="${path(L.top,T)}" class="am-line"/></svg>`;
}

export function planSVG(s,{w=80,h=80,core=false,label=''}={}){
 const p=profile({...s,taper:1,twist:0,orientation:0},0);
 const R=Math.max(...p.map(([x,y])=>Math.max(Math.abs(x),Math.abs(y))));
 const k=(Math.min(w,h)/2-6)/R,cx=w/2,cy=h/2;
 const pts=p.map(([x,y])=>`${f1(cx+x*k)},${f1(cy-y*k)}`).join(' ');
 const c=core?Math.min(s.core*k/2,R*k*.45):0;
 return `<svg viewBox="0 0 ${w} ${h}" class="am-pl" role="img" aria-label="${label}"><polygon points="${pts}" class="am-line"/>`
  +(core?`<rect x="${f1(cx-c)}" y="${f1(cy-c)}" width="${f1(2*c)}" height="${f1(2*c)}" class="am-solid"/>`:'')+'</svg>';
}

// The figure: a plain outline person, the way the booklets draw one.
const FIGURE='<circle cx="30" cy="12" r="8" class="am-line"/><path d="M18 76V36c0-8 6-14 12-14s12 6 12 14v40M24 76V52M36 76V52" class="am-line"/>';
export function figureSVG(extra='',{w=120,h=90,label=''}={}){
 return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}"><g transform="translate(4 8)">${FIGURE}</g>${extra}</svg>`;
}
const TOOLS={
 idea:'<path d="M0 9a7 7 0 1 1 10 6v4H4v-4A7 7 0 0 1 0 9zM4 22h6" class="am-line" transform="translate(4 2)"/>',
 ruler:'<path d="M2 18 18 2l4 4L6 22zM8 12l2 2M11 9l2 2M14 6l2 2" class="am-line"/>',
 screen:'<path d="M2 4h20v13H2zM9 21h6M12 17v4" class="am-line"/>'
};
const glyph=(k,cls='am-glyph')=>`<svg viewBox="0 0 20 20" class="${cls}" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="miter">${WORK_GLYPHS[k]||''}</g></svg>`;
const READ_GLYPH='<path d="M4 2h9l3 3v13H4z"/><path d="M7 8h6M7 11h6M7 14h4"/>';
const CHECK='<svg viewBox="0 0 30 24" class="am-check" aria-hidden="true"><path d="M3 13l8 8L27 3" class="am-x"/></svg>';
const ARROW='<svg viewBox="0 0 40 16" class="am-arrow" aria-hidden="true"><path d="M2 8h32M28 3l6 5-6 5" class="am-line"/></svg>';

/* ── page assembly ───────────────────────────────────────────────────────── */
const el=(tag,cls,html)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(html!=null)n.innerHTML=html;return n};
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function page(n,c,cls=''){
 const p=el('article','am-page '+cls);p.setAttribute('aria-label',c.page+' '+n);
 const foot=el('footer','am-foot',`<span>${esc(c.doc)}</span><span class="am-pn">${n}</span>`);
 return {p,foot,done(){p.append(foot);return p}};
}
function step(n,title,body){
 const s=el('section','am-step');
 s.append(el('div','am-step-n',String(n)),el('h3','am-step-t',esc(title)),body);
 return s;
}

export function renderAssembly({host,lang='en',onEnter,onWorkspace,onLang,langs=['en','th','zh'],langLabel=l=>l}){
 if(!host)return;
 const c=ASSEMBLY_TEXT[lang]||ASSEMBLY_TEXT.en,work=(CONSOLE_TEXT[lang]||CONSOLE_TEXT.en).work;
 const name=k=>work[WORKSPACES.indexOf(k)]||k;
 const s={...defaults};const H=stackHeight(s);
 let m;try{m=evaluate(s)}catch{m=null}
 host.replaceChildren();
 const book=el('div','am-book');

 // 1 · cover
 const p1=page(1,c,'am-cover');
 const bar=el('div','am-bar');
 const lb=el('div','am-langs');lb.setAttribute('role','group');
 for(const l of langs){const b=el('button',l===lang?'on':'',esc(langLabel(l)));b.type='button';b.setAttribute('aria-pressed',String(l===lang));b.onclick=()=>onLang?.(l);lb.append(b)}
 const skip=el('a','am-go am-go-sm',esc(c.enter)+' →');skip.href='#studio';skip.onclick=e=>{e.preventDefault();onEnter?.()};
 bar.append(lb,skip);
 // Two variants, as a catalogue cover shows them: the default, and a slim tapered octagon.
 const twisted={...s,family:'octagon',span:36,taper:.7,floors:66};
 const pair=el('div','am-cover-art');
 pair.innerHTML=towerSVG(s,{w:150,h:330,every:6,label:families[s.family]})+towerSVG(twisted,{w:150,h:330,every:6,label:families.octagon});
 p1.p.append(bar,el('h1','am-title',esc(c.product)),pair,
  el('p','am-credit',`<b>${esc(c.credit)}</b> — ${esc(c.after)}`));
 book.append(p1.done());

 // 2 · before you start
 const p2=page(2,c,'am-before');
 const tools=el('div','am-tools');
 const bubble=`<path d="M58 30C58 14 72 4 90 4s32 10 32 26-14 26-32 26h-8l-10 10v-12c-8-4-14-12-14-24z" class="am-line"/>`;
 const inBubble=Object.values(TOOLS).map((t,i)=>`<g transform="translate(${68+i*18} 16) scale(.62)">${t}</g>`).join('');
 tools.innerHTML=figureSVG(bubble+inBubble,{w:130,h:92,label:c.tools});
 const panels=el('div','am-panels');
 const crane='<path d="M64 80V14h40M64 22l32-8M96 14v20M92 34h8v8h-8z" class="am-line"/>';
 const no=el('div','am-panel am-no',figureSVG(crane+'<path d="M2 2l116 84M118 2 2 86" class="am-x"/>',{w:120,h:88,label:c.notFor})+`<p>${esc(c.noBuild)}</p>`);
 const yes=el('div','am-panel am-yes',figureSVG('<path d="M70 44h40v28H70zM76 52h28M76 58h28M76 64h18" class="am-line"/><path d="M88 18l8 10 18-22" class="am-x"/>',{w:120,h:88,label:c.alone})+`<p>${esc(c.alone)}</p>`);
 const ask=el('a','am-panel am-ask',figureSVG('<path d="M58 30C58 16 70 6 86 6s28 10 28 24-12 24-28 24h-6l-9 9v-11c-8-4-13-11-13-22z" class="am-line"/><path d="M80 24a6 6 0 1 1 9 5c-2 1-3 2-3 5M86 40v1" class="am-x"/>',{w:120,h:88,label:c.ask})+`<p>${esc(c.ask)}</p>`);
 ask.href='#research';
 panels.append(no,yes,ask);
 p2.p.append(el('h2','am-h',esc(c.tools)),tools,panels);
 book.append(p2.done());

 // 3 · parts
 const p3=page(3,c,'am-parts');
 const plans=el('div','am-plans');
 Object.keys(families).forEach((f,i)=>{
  const d=el('figure','am-part');
  d.innerHTML=planSVG({...s,family:f},{w:64,h:64,label:families[f]})+`<figcaption><b>1×</b> ${String(101+i)}</figcaption>`;
  plans.append(d);
 });
 const desks=el('div','am-desks');
 for(const [,keys]of INDEX_GROUPS)for(const k of keys){const d=el('figure','am-part am-desk');d.innerHTML=glyph(k)+`<figcaption>${esc(name(k))}</figcaption>`;desks.append(d)}
 p3.p.append(el('h2','am-h',esc(c.parts)),el('h3','am-sub',`${esc(c.plans)} <b>${Object.keys(families).length}×</b>`),plans,
  el('h3','am-sub',`${esc(c.desks)} <b>${WORKSPACES.length}×</b>`),desks);
 book.append(p3.done());

 // 4 · steps 1–4
 const p4=page(4,c,'am-steps');
 const grid4=el('div','am-grid');
 const s1=el('div','am-art');s1.innerHTML=planSVG({...s,family:'box'},{w:70,h:70})+ARROW+planSVG(s,{w:110,h:110,label:families[s.family]})+CHECK;
 const low={...s,floors:12,taper:1};
 const s2=el('div','am-art');s2.innerHTML=towerSVG(low,{w:90,h:150,every:3})+ARROW+towerSVG({...s,taper:1},{w:110,h:240,every:6})
  +`<span class="am-note">${esc(c.floorsLabel.replace('{n}',s.floors).replace('{h}',Math.round(H)))}</span>`;
 const s3=el('div','am-art');s3.innerHTML=towerSVG({...s,taper:1},{w:90,h:220,every:8})+ARROW+towerSVG({...s,family:'box',taper:.75,twist:35},{w:110,h:240,every:2,floorsEvery:8});
 const s4=el('div','am-art');s4.innerHTML=planSVG(s,{w:110,h:110})+ARROW+planSVG(s,{w:130,h:130,core:true});
 grid4.append(step(1,c.steps[0],s1),step(2,c.steps[1],s2),step(3,c.steps[2],s3),step(4,c.steps[3],s4));
 p4.p.append(grid4);book.append(p4.done());

 // 5 · steps 5–8
 const p5=page(5,c,'am-steps');
 const grid5=el('div','am-grid');
 const s5=el('div','am-art am-test');
 s5.innerHTML=towerSVG(s,{w:110,h:230,every:8})+`<div class="am-ring">${['wind','water','glare','lifts','fire','carbon'].map(k=>`<span>${glyph(k)}<i>${esc(name(k))}</i></span>`).join('')}</div>`;
 const s6=el('div','am-art am-value');
 // A balance, not a dashboard figure: the tower in one pan, what it earns in the
 // other. The number is a part label, the size of every other label.
 const coins=[0,1,2,3,4].map(i=>`<ellipse cx="104" cy="${f1(60-i*5)}" rx="11" ry="3.5" class="am-line"/>`).join('');
 s6.innerHTML=`<svg viewBox="0 0 140 92" class="am-scale" role="img" aria-label="${esc(c.steps[5])}"><path d="M70 88V22M50 88h40M30 22h80M70 22l-3-6h6z" class="am-line"/><path d="M30 22 18 62h24zM110 22 92 62h24z" class="am-line"/><path d="M14 62h32M88 62h32" class="am-line"/>`
  +`<path d="M24 62V36h12v26M24 44h12M24 52h12" class="am-line"/>${coins}</svg>`
  +`<span class="am-note">${m?esc('$'+(m.contribution/1e6).toFixed(1)+'M '+c.value):''}</span>`
  +`<div class="am-warn"><svg viewBox="0 0 24 22" aria-hidden="true"><path d="M12 2 22 20H2zM12 8v6M12 16v2" class="am-line"/></svg><span>${esc(c.noBuild)}</span></div>`; const s7=el('div','am-art');
 s7.innerHTML=towerSVG({...s,family:'octagon'},{w:70,h:160,every:12})+towerSVG(s,{w:70,h:160,every:12})+towerSVG({...s,family:'hexagon'},{w:70,h:160,every:12})
  +ARROW+`<span class="am-shelf">${glyph('studies','am-glyph am-big')}<i>✓</i></span>`;
 const s8=el('div','am-art am-enter');
 const go=el('button','am-go',esc(c.enter)+' →');go.type='button';go.onclick=()=>onEnter?.();
 s8.innerHTML=figureSVG('<path d="M44 40 70 30" class="am-line"/><path d="M76 8h36v76H76zM102 46h4" class="am-line"/>',{w:120,h:92,label:c.enter});
 s8.append(go);
 grid5.append(step(5,c.steps[4],s5),step(6,c.steps[5],s6),step(7,c.steps[6],s7),step(8,c.steps[7],s8));
 p5.p.append(grid5);book.append(p5.done());

 // 6 · index
 const p6=page(6,c,'am-index');
 const idx=el('div','am-idx');
 for(const [g,keys]of INDEX_GROUPS){
  const sec=el('section','am-idx-g');sec.append(el('h3',null,esc(c.groups[g])));
  const row=el('div','am-idx-row');
  for(const k of keys){const a=el('a','am-idx-i',glyph(k,'am-glyph am-big')+`<span>${esc(name(k))}</span>`);a.href='#ws-'+k;a.onclick=e=>{e.preventDefault();onWorkspace?.(k)};row.append(a)}
  sec.append(row);idx.append(sec);
 }
 const rs=el('section','am-idx-g');rs.append(el('h3',null,esc(c.groups.read)));
 const ra=el('a','am-idx-i',`<svg viewBox="0 0 20 20" class="am-glyph am-big" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.2">${READ_GLYPH}</g></svg><span>${esc(c.research)}</span>`);ra.href='#research';
 const rr=el('div','am-idx-row');rr.append(ra);rs.append(rr);idx.append(rs);
 const colo=el('section','am-colophon');
 colo.append(el('p','am-cite',esc(c.colophon)));
 const go2=el('button','am-go',esc(c.enter)+' →');go2.type='button';go2.onclick=()=>onEnter?.();
 colo.append(go2);
 p6.p.append(el('h2','am-h',esc(c.index)),idx,colo);book.append(p6.done());

 host.append(book);
}
