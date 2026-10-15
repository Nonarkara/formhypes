// 2026 design prompts. Cultural interpretation never enters the rent model.
export const PLAY={
 en:{atlas:'Form atlas · 11 profiles',feng:'Feng Shui playground',facing:'Entrance faces',water:'Water / open outlook',back:'Mountain / taller neighbour',none:'Not placed',note:'An invented site, a real design conversation. Place an outlook and a backing mass; turn the entrance and see the relationship. These are contemporary design prompts, not a traditional consultation or a luck prediction. No effect on rent.',source:'Cultural context: Chiou & Krishnamurti, “Unraveling fêng-shui” (1997), pp. 549–572.',front:'Entrance → outlook',rear:'Rear → backing mass',degree:'angular separation',empty:'Place both site features to compare their alignment.',prompts:['Quiet centre','Dragon turns','Petals to the water','Four winds'],apply:'Apply form',applied:'Changes the actual tower; explore the consequences in its metrics.',legend:'N ↑ · dashed: entrance · waves: water · chevrons: backing mass',reset:'Restore the current tower orientation'},
 th:{atlas:'สมุดรูปทรง · 11 แบบ',feng:'สนามทดลองฮวงจุ้ย',facing:'ทางเข้าหันไปทาง',water:'น้ำ / มุมมองเปิด',back:'ภูเขา / อาคารสูงด้านหลัง',none:'ยังไม่วาง',note:'พื้นที่สมมติ ชวนคุยเรื่องการออกแบบ วางมุมมองเปิดและมวลด้านหลัง แล้วหมุนทางเข้าเพื่อดูความสัมพันธ์ เป็นโจทย์ออกแบบร่วมสมัย ไม่ใช่การดูฮวงจุ้ยตามตำราหรือทำนายโชคลาภ และไม่เปลี่ยนค่าเช่า',source:'บริบททางวัฒนธรรม: Chiou & Krishnamurti, “Unraveling fêng-shui” (1997), หน้า 549–572',front:'ทางเข้า → มุมมองเปิด',rear:'ด้านหลัง → มวลรองรับ',degree:'มุมที่คลาดกัน',empty:'วางองค์ประกอบทั้งสองเพื่อเปรียบเทียบทิศทาง',prompts:['ศูนย์กลางสงบ','มังกรหมุนตัว','กลีบหันหาน้ำ','สี่สายลม'],apply:'ใช้รูปทรง',applied:'เปลี่ยนอาคารจริงในโมเดล แล้วดูผลในตัวชี้วัด',legend:'N ↑ · เส้นประ: ทางเข้า · คลื่น: น้ำ · ยอดแหลม: มวลด้านหลัง',reset:'ใช้ทิศของอาคารปัจจุบัน'},
 zh:{atlas:'形态图谱 · 11 种平面',feng:'风水试验场',facing:'入口朝向',water:'水体 / 开阔视野',back:'山体 / 较高邻楼',none:'尚未设置',note:'场地是假设，设计讨论是真实的。设置开阔视野与背靠体量，转动入口，观察彼此关系。这是当代设计提示，并非传统风水咨询或运势预测，不影响租金。',source:'文化背景：Chiou 与 Krishnamurti，《Unraveling fêng-shui》（1997），549–572 页。',front:'入口 → 开阔视野',rear:'背面 → 背靠体量',degree:'夹角偏差',empty:'设置两项场地要素后比较朝向。',prompts:['静心居中','游龙转身','花瓣向水','四面来风'],apply:'采用形态',applied:'会改变实际塔楼，请在指标中查看后果。',legend:'N ↑ · 虚线：入口 · 波纹：水体 · 折线：背靠体量',reset:'采用当前塔楼朝向'}
};
export const PROMPTS=[{family:'octagon',taper:1,twist:0},{family:'pinwheel',taper:.8,twist:90},{family:'petal',taper:.88,twist:30},{family:'hexagon',taper:.7,twist:60}];
export const angularGap=(a,b)=>Math.abs(((a-b+540)%360)-180);
let site={facing:180,water:180,back:0};
export function getFengStudy(){return {site:{...site},tier:'invented-site design prompt; no rent or safety effect'}}
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n};
const compass=['N','NE','E','SE','S','SW','W','NW'];
const point=(a,r)=>[100+Math.sin(a*Math.PI/180)*r,100-Math.cos(a*Math.PI/180)*r];
export function fengDiagram(plan,settings=site){
 const pts=plan.map(([x,y])=>`${100+x*110},${100-y*110}`).join(' ');
 const face=point(settings.facing,74),a=point(settings.water,80),b=point(settings.back,80);
 return `<svg viewBox="0 0 200 200" role="img"><circle cx="100" cy="100" r="86" fill="none" stroke="currentColor" opacity=".2"/><path d="M100 10V20 M100 180V190 M10 100H20 M180 100H190" stroke="currentColor"/><text x="100" y="9" text-anchor="middle">N</text><text x="193" y="104" text-anchor="middle">E</text><text x="100" y="199" text-anchor="middle">S</text><text x="6" y="104" text-anchor="middle">W</text><polygon points="${pts}" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="92" y="92" width="16" height="16" fill="currentColor" opacity=".3"/><path d="M100 100L${face}" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4 3"/><circle cx="${face[0]}" cy="${face[1]}" r="3" fill="#f59e0b"/>${settings.water!==null?`<path d="M${a[0]-9} ${a[1]}q3 -6 6 0t6 0t6 0m-18 5q3 -6 6 0t6 0t6 0" fill="none" stroke="currentColor"/>`:''}${settings.back!==null?`<path d="M${b[0]-12} ${b[1]+5}l6 -11 6 11 6 -11 6 11" fill="none" stroke="currentColor" stroke-width="2"/>`:''}</svg>`;
}
export function renderPlay({lang,state,families,profile,label,onChange}){
 const c=PLAY[lang],atlas=document.getElementById('atlas'),feng=document.getElementById('feng');
 const focus=document.activeElement?.closest('#feng,#atlas')?document.activeElement.id:null;
 document.getElementById('atlasTitle').textContent=c.atlas;document.getElementById('fengTitle').textContent=c.feng;
 atlas.replaceChildren();const grid=el('div');grid.className='form-atlas';
 for(const f of Object.keys(families)){
  const b=el('button');b.type='button';b.id='atlas-'+f;b.title=label(f);b.setAttribute('aria-label',label(f));b.setAttribute('aria-pressed',String(f===state.family));
  const p=profile({...state,family:f,span:1,aspect:1,orientation:0},0);
  b.innerHTML=`<svg viewBox="-0.6 -0.6 1.2 1.2" aria-hidden="true"><polygon points="${p.map(([x,y])=>[x,-y].join(',')).join(' ')}" fill="none" stroke="currentColor" stroke-width=".035"/></svg>`;
  const text=el('span',label(f).split(' /')[0]);b.append(text);b.onclick=()=>onChange({family:f});grid.append(b);
 }
 atlas.append(grid);
 feng.replaceChildren();feng.append(el('p',c.note));const prompts=el('div');prompts.className='feng-prompts';
 for(const [i,p]of PROMPTS.entries()){const b=el('button',c.prompts[i]);b.type='button';b.id='feng-prompt-'+i;b.title=c.applied;b.onclick=()=>onChange(p);prompts.append(b)}feng.append(prompts);
 feng.append(el('p',c.applied));
 const drawing=el('div');drawing.className='feng-drawing';drawing.innerHTML=fengDiagram(profile({...state,span:1},0));drawing.firstElementChild.setAttribute('aria-label',c.legend);feng.append(drawing);
 for(const [key,title]of [['facing',c.facing],['water',c.water],['back',c.back]]){
  const l=el('label',title);l.htmlFor='feng-'+key;const sel=el('select');sel.id=l.htmlFor;
  if(key!=='facing'){const o=el('option',c.none);o.value='none';sel.append(o)}
  compass.forEach((v,i)=>{const o=el('option',`${v} · ${i*45}°`);o.value=String(i*45);sel.append(o)});
  sel.value=site[key]===null?'none':String(site[key]);sel.onchange=()=>{site[key]=sel.value==='none'?null:Number(sel.value);renderPlay({lang,state,families,profile,label,onChange})};feng.append(l,sel);
 }
 const out=el('p');out.className='feng-reading';out.setAttribute('role','status');
 out.textContent=site.water===null||site.back===null?c.empty:`${c.front}: ${angularGap(site.facing,site.water)}° · ${c.rear}: ${angularGap((site.facing+180)%360,site.back)}° (${c.degree})`;feng.append(out,el('p',c.legend));
 const a=el('a',c.source);a.href='https://www.andrew.cmu.edu/course/48-747/subFrames/readings/Chiou%26Krishnamurti.UnravelingFengShui.pdf';a.target='_blank';a.rel='noopener noreferrer';feng.append(a);
 if(focus)document.getElementById(focus)?.focus({preventScroll:true});
}
