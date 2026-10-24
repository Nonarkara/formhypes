let displayLang='en';
import {displayText} from './preferences.js?v=48652b12d9';
/* Structure, read from the geometry.

   Every figure here is computed from the model's own form — height, plan,
   taper, system — by a published rule of thumb, and each one says which rule.
   None of them is a structural design. They answer the questions an engineer
   asks first about a massing, before any analysis exists: how slender is it,
   roughly how long does it take to sway, at what wind speed would vortices
   lock on, is the chosen system inside the range where it is usually built,
   and how much of the floor does the core take.

   Sources (also printed under the figures):
   - Period: EN 1991-1-4:2005 Annex F, F.2, n1 = 46/h Hz for buildings over 50 m;
     ASCE 7 Table 12.8-2 approximate period Ta = Ct·h^x ("all other systems",
     Ct 0.0488, x 0.75 in metres) as the lower bound of the band.
   - Vortex shedding: EN 1991-1-4 Annex E, E.1.3.1 v_crit = b·n1/St, St from
     Table E.1 (0.11 sharp-cornered square, 0.18 circle). The St given to the
     faceted families in between is an interpolation and is labelled as one.
   - Slenderness: 432 Park Avenue 1:15 and 111 West 57th 1:24 (Guinness World
     Records); about 1:7 is described as slender by practising engineers. The
     band edges at 1:10 and 1:15 are read from those exemplars, not a code.
   - Systems: Khan via Lehigh (frames inefficient from about 20 storeys);
     diagrids built at about 20–100 storeys (Boake); diagrid angle optimum about
     55–75° (Moon; EASEC-13 G-4-6).
   - Core share: 135 supertall office towers, mean core 24% of GFA (Tampere
     University, Space Efficiency in Contemporary Supertall Office Buildings).
   - Lifts: CIBSE Guide D practice of about 16 floors per lift group. */
import {profile,stackHeight,evaluate} from './model.js?v=9531c58c62';
import {convexHull} from './geometry.js?v=eb7a621ab9';

export const STRUCTURE_BANDS=[[7,'conventional'],[10,'slender'],[15,'damped'],[Infinity,'super']];
export const EXEMPLARS=[{name:'432 Park Ave',ratio:15},{name:'111 W 57th',ratio:24}];
export const DIAGRID_OPTIMUM=[55,75];
export const CORE_BENCHMARK=0.24;
export const FLOORS_PER_LIFT_GROUP=16,MAX_LIFT_GROUPS=4;
// Table E.1: sharp square 0.11, circle 0.18. Faceted plans sit between; the
// value for them is an interpolation by corner count, not a tabulated number.
const ST={box:.11,chamfer:.12,cross:.11,star:.11,rub:.11,pinwheel:.11,triangle:.11,hexagon:.13,octagon:.14,petal:.15,oval:.16};
export const ST_TABULATED=new Set(['box','cross','star','rub','pinwheel','triangle']);

/* Least width of a plan: the smallest distance between two parallel lines
   that enclose it, found on the convex hull (rotating calipers). A triangle or
   a cruciform is narrower in its weakest direction than its nominal span, and
   slenderness is governed by the weakest direction. */
export function leastWidth(poly){
 const h=convexHull(poly).filter((p,i,a)=>i===0||p[0]!==a[i-1][0]||p[1]!==a[i-1][1]);
 let best=Infinity;
 for(let i=0;i<h.length;i++){
  const a=h[i],b=h[(i+1)%h.length],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
  if(len<1e-9)continue;
  let far=0;for(const p of h)far=Math.max(far,Math.abs((p[0]-a[0])*dy-(p[1]-a[1])*dx)/len);
  best=Math.min(best,far);
 }
 return best;
}

export function structureRead(s,m=evaluate(s)){
 const H=stackHeight(s),bBase=leastWidth(profile(s,0)),bMid=leastWidth(profile(s,2/3));
 const lambda=H/bBase,band=STRUCTURE_BANDS.find(([edge])=>lambda<edge)[1];
 const tEC=H/46,tASCE=0.0488*Math.pow(H,0.75),n1=46/H;
 const st=ST[s.family]??.11,vCrit=bMid*n1/st;
 const coreShare=m.gross>0?m.core/m.gross:0;
 const diagridAngle=s.system==='diagrid'?Math.atan2(8*s.height,6)*180/Math.PI:null;
 const groups=Math.ceil(s.floors/FLOORS_PER_LIFT_GROUP);
 return {H,bBase,bMid,lambda,band,tEC,tASCE,n1,st,stTabulated:ST_TABULATED.has(s.family),vCrit,coreShare,
  diagridAngle,diagridInBand:diagridAngle==null?null:diagridAngle>=DIAGRID_OPTIMUM[0]&&diagridAngle<=DIAGRID_OPTIMUM[1],
  diagridFloorsInRange:s.system==='diagrid'?s.floors>=20&&s.floors<=100:null,
  liftGroups:groups,skyLobby:groups>MAX_LIFT_GROUPS};
}

export const STRUCT_TEXT={
 en:{title:'Structure, read from the geometry',
  verdict:{conventional:'Conventional proportion',slender:'Slender',damped:'Very slender — damping and a wind tunnel are likely',super:'Super-slender'},
  lede:'{h} m tall on a {b} m least base width.',
  axis:'Height ÷ least base width',here:'this tower',
  k:{lambda:'Slenderness',period:'First sway period, band',vcrit:'Vortex lock-in wind speed',core:'Core share of gross area',diagrid:'Diagrid angle',lifts:'Lift groups at 16 floors each'},
  periodV:'{a}–{b} s',coreV:'{p}% · towers average 24%',vcritV:'{v} m/s{est}',est:' · St interpolated',
  diagridV:'{a}° · efficient about 55–75°',liftsV:'{n}',skyLobby:' · above four groups: shuttles and a sky lobby, not modelled',
  vcritNote:'EN 1991-1-4 lets vortex effects be ignored when this speed is above 1.25 × the site mean wind at this height. The site wind is not modelled.',
  sys:{'column-grid':'Column grid and core: the core carries the wind. Khan found frames inefficient from about 20 storeys, which is why tall towers add outriggers or a perimeter tube.',outrigger:'Outriggers tie the core to perimeter columns; it is the system of the tallest towers, Taipei 101 and Shanghai Tower among them.',diagrid:'Perimeter diagrid: built at about 20–100 storeys.'},
  diagridOut:' This tower is outside that range.',
  limits:'Rules of thumb from the form alone. They do not include mass, stiffness, the site wind or soil, and they are not a structural design.',
  src:'Sources: EN 1991-1-4 Annex E and F · ASCE 7 Table 12.8-2 · Khan (Lehigh) · Boake, diagrids · Moon, diagrid angle · Tampere University, supertall core share · CIBSE Guide D · Guinness World Records (432 Park, 111 W 57th).'},
 th:{title:'โครงสร้าง อ่านจากรูปทรง',
  verdict:{conventional:'สัดส่วนทั่วไป',slender:'ชะลูด',damped:'ชะลูดมาก มักต้องมีตัวหน่วงและทดสอบอุโมงค์ลม',super:'ชะลูดพิเศษ'},
  lede:'สูง {h} ม. บนฐานกว้างด้านแคบสุด {b} ม.',
  axis:'ความสูง ÷ ความกว้างฐานด้านแคบสุด',here:'อาคารนี้',
  k:{lambda:'ความชะลูด',period:'คาบการโยกตัวแรก (ช่วง)',vcrit:'ความเร็วลมที่กระแสวนล็อกตัว',core:'สัดส่วนแกนกลางต่อพื้นที่รวม',diagrid:'มุมไดอะกริด',lifts:'กลุ่มลิฟต์ กลุ่มละ 16 ชั้น'},
  periodV:'{a}–{b} วินาที',coreV:'{p}% · ตึกสูงเฉลี่ย 24%',vcritV:'{v} ม./วินาที{est}',est:' · ค่า St ประมาณช่วงกลาง',
  diagridV:'{a}° · ช่วงที่มีประสิทธิภาพราว 55–75°',liftsV:'{n}',skyLobby:' · เกินสี่กลุ่ม ต้องมีลิฟต์ด่วนและสกายล็อบบี้ ซึ่งยังไม่ได้จำลอง',
  vcritNote:'EN 1991-1-4 ยอมให้ไม่ต้องพิจารณาผลของกระแสวน เมื่อความเร็วนี้สูงกว่า 1.25 เท่าของความเร็วลมเฉลี่ยของที่ตั้งที่ระดับความสูงนี้ ระบบนี้ยังไม่ได้จำลองลมของที่ตั้ง',
  sys:{'column-grid':'ระบบเสาและแกนกลาง แกนกลางรับแรงลม Khan พบว่าโครงข้อแข็งเริ่มไม่คุ้มตั้งแต่ราว 20 ชั้น ตึกสูงจึงเพิ่มเอาท์ริกเกอร์หรือท่อรอบนอก',outrigger:'เอาท์ริกเกอร์ยึดแกนกลางเข้ากับเสารอบนอก เป็นระบบของตึกที่สูงที่สุด เช่น ไทเป 101 และเซี่ยงไฮ้ทาวเวอร์',diagrid:'ไดอะกริดรอบนอก สร้างจริงราว 20–100 ชั้น'},
  diagridOut:' อาคารนี้อยู่นอกช่วงดังกล่าว',
  limits:'เป็นหลักคิดเบื้องต้นจากรูปทรงเท่านั้น ไม่รวมมวล ความแข็ง ลมและดินของที่ตั้ง และไม่ใช่การออกแบบโครงสร้าง',
  src:'แหล่งอ้างอิง: EN 1991-1-4 ภาคผนวก E และ F · ASCE 7 ตาราง 12.8-2 · Khan (Lehigh) · Boake ว่าด้วยไดอะกริด · Moon ว่าด้วยมุมไดอะกริด · มหาวิทยาลัยตัมเปเร สัดส่วนแกนกลางตึกซูเปอร์ทอล · CIBSE Guide D · Guinness World Records (432 Park, 111 W 57th)'},
 zh:{title:'结构，从形体读出',
  verdict:{conventional:'常规比例',slender:'细长',damped:'很细长，通常需要阻尼器和风洞试验',super:'超细长'},
  lede:'高 {h} 米，底部最窄宽度 {b} 米。',
  axis:'高度 ÷ 底部最窄宽度',here:'本塔楼',
  k:{lambda:'高宽比',period:'第一阶摆动周期（区间）',vcrit:'涡激锁定风速',core:'核心筒占总建筑面积',diagrid:'斜交网格角度',lifts:'电梯分区，每区 16 层'},
  periodV:'{a}–{b} 秒',coreV:'{p}% · 超高层平均 24%',vcritV:'{v} 米/秒{est}',est:' · St 为插值',
  diagridV:'{a}° · 高效区间约 55–75°',liftsV:'{n}',skyLobby:' · 超过四个分区：需穿梭电梯和空中大堂，未建模',
  vcritNote:'按 EN 1991-1-4，当此风速高于该高度处场地平均风速的 1.25 倍时，可不考虑涡激效应。场地风况未建模。',
  sys:{'column-grid':'柱网加核心筒：由核心筒承担风荷载。Khan 发现框架约从 20 层起就不再经济，所以高楼会加伸臂桁架或外框筒。',outrigger:'伸臂桁架把核心筒和外围柱连成一体，是最高一批塔楼的体系，例如台北 101 和上海中心。',diagrid:'外围斜交网格：实际建成约 20–100 层。'},
  diagridOut:' 本塔楼在此范围之外。',
  limits:'只是从形体得出的经验估算，不含质量、刚度、场地风况和土质，也不是结构设计。',
  src:'来源：EN 1991-1-4 附录 E、F · ASCE 7 表 12.8-2 · Khan（理海大学）· Boake 论斜交网格 · Moon 论斜交网格角度 · 坦佩雷大学 超高层核心筒占比 · CIBSE Guide D · 吉尼斯世界纪录（432 Park、111 W 57th）'}
};

const SVGNS='http://www.w3.org/2000/svg';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=cls?.split(' ').includes('source')?String(text):displayText(String(text),displayLang);return n};
const fill=(t,v)=>t.replace(/\{(\w+)\}/g,(_,k)=>v[k]??'');

/* The slenderness scale. One axis, 1:0 to 1:25; the band edges are ticks with
   their ratio, the two exemplars sit under the line, and this tower is the one
   amber mark. A length on a line reads faster than a sentence about a ratio. */
export function slendernessSVG(lambda,c){
 const max=25,x=v=>8+284*Math.min(v,max)/max,me=x(lambda);
 let s=`<line x1="8" y1="22" x2="292" y2="22" stroke="currentColor" stroke-width="1"/>`;
 for(const [edge] of STRUCTURE_BANDS)if(Number.isFinite(edge))s+=`<line x1="${x(edge)}" y1="16" x2="${x(edge)}" y2="28" stroke="currentColor" stroke-width="1"/><text x="${x(edge)}" y="12" text-anchor="middle" font-size="8" fill="currentColor">1:${edge}</text>`;
 for(const e of EXEMPLARS)s+=`<line x1="${x(e.ratio)}" y1="24" x2="${x(e.ratio)}" y2="34" stroke="currentColor" stroke-width="1.4"/><text x="${x(e.ratio)}" y="44" text-anchor="middle" font-size="8" fill="currentColor">${e.name}</text>`;
 s+=`<line x1="8" y1="22" x2="${me.toFixed(1)}" y2="22" stroke="#f59e0b" stroke-width="3"/><path d="M${me.toFixed(1)} 22l-4 -7h8z" fill="#f59e0b"/>`;
 return `<svg viewBox="0 0 300 50" role="img" aria-label="${c.axis}: 1:${lambda.toFixed(1)}">${s}</svg>`;
}

export function renderStructure({host,state,metrics,lang}){
 displayLang=lang;
 if(!host)return;
 const c=STRUCT_TEXT[lang]||STRUCT_TEXT.en,r=structureRead(state,metrics);
 const loc=lang==='th'?'th-TH':lang==='zh'?'zh-CN':'en-US',f=(v,d=0)=>v.toLocaleString(loc,{minimumFractionDigits:d,maximumFractionDigits:d});
 host.replaceChildren();
 const head=el('h2','sd-title',c.title);
 const verdict=el('p','sd-verdict'+(r.band==='conventional'?'':' sd-flag'),c.verdict[r.band]+' · 1:'+f(r.lambda,1));
 const lede=el('p','sd-lede',fill(c.lede,{h:f(r.H),b:f(r.bBase,1)}));
 const fig=el('figure','sd-scale');fig.innerHTML=slendernessSVG(r.lambda,c);
 const cap=el('figcaption','sd-axis',c.axis);fig.append(cap);
 const dl=el('dl','sd-facts');
 const row=(k,v)=>{const d=el('div');d.append(el('dt',null,c.k[k]),el('dd',null,v));dl.append(d)};
 row('period',fill(c.periodV,{a:f(r.tASCE,1),b:f(r.tEC,1)}));
 row('vcrit',fill(c.vcritV,{v:f(r.vCrit),est:r.stTabulated?'':c.est}));
 row('core',fill(c.coreV,{p:f(r.coreShare*100,1)}));
 if(r.diagridAngle!=null)row('diagrid',fill(c.diagridV,{a:f(r.diagridAngle)}));
 row('lifts',fill(c.liftsV,{n:r.liftGroups})+(r.skyLobby?c.skyLobby:''));
 const sys=el('p','sd-note',(c.sys[state.system]||'')+(r.diagridFloorsInRange===false?c.diagridOut:''));
 host.append(head,verdict,lede,fig,dl,sys,el('p','sd-note',c.vcritNote),el('p','sd-note sd-limits',c.limits),el('p','note source',c.src));
}
