/* Wind lab — the tower in a wind tunnel, computed rather than drawn.

   Every number on this sheet comes from the model's own form and a published
   rule, and each rule is named where it is used and again in the sources line
   printed under the lab. The animation is a picture of those numbers: the
   vortices leave the plan at exactly the computed shedding frequency and the
   tower sways at exactly its first-mode frequency, both on one printed time
   scale. The flow field itself is a picture, not a simulation (see FLOW below).

   Sources:
   - EN 1991-1-4:2005 §4.3.2 Eq. 4.3–4.5, mean wind v_m = c_r(z)·c_o·v_b,
     c_r = k_r·ln(z/z0), k_r = 0.19·(z0/0.05)^0.07, c_o = 1; Table 4.1 terrain
     z0 and z_min. §4.4 Eq. 4.7 turbulence I_v = 1/(c_o·ln(z/z0)). §4.5 Eq. 4.8
     peak pressure q_p = (1 + 7·I_v)·½·ρ·v_m², ρ = 1.25 kg/m³.
   - §7.6 Fig. 7.23 c_f,0 of rectangular sections against d/b; §7.8 Table 7.11
     regular polygons (Re ≥ 3·10^5): hexagon 1.60, octagon 1.30. End-effect
     factor ψ_λ is taken as 1 (conservative) and the structural factor c_s·c_d
     as 1 (not computed).
   - Annex E, E.1.3.1 v_crit = b·n1/St, E.1.3.3 / Eq. E.4 Scruton number
     Sc = 2·δ_s·m_i,e/(ρ·b²), E.1.2(3) vortex effects need not be examined when
     v_crit > 1.25·v_m. St from structure.js (Table E.1, interpolated families
     labelled there).
   - Annex F, F.2 Eq. F.2 n1 = 46/h; Table F.1 mode exponent; Table F.2
     structural logarithmic decrement δ_s: reinforced-concrete buildings 0.10,
     mixed steel–concrete 0.08, steel 0.05; F.5 Eq. F.15 δ = δ_s + δ_a + δ_d,
     the last for special damping devices.
   - Occupant comfort: ISO 10137:2007; ISO 6897; NatHaz (Kareem), 10-year
     return peak acceleration about 10–15 milli-g residential, 20–25 milli-g
     office. Quoted, never computed here. */
import {profile,stackHeight,families,inside} from './model.js';
import {structureRead,STRUCT_TEXT} from './structure.js';

export const RHO=1.25;
// EN 1991-1-4 Table 4.1. Category I is omitted to keep four choices.
export const TERRAIN={'0':{z0:0.003,zmin:1},II:{z0:0.05,zmin:2},III:{z0:0.3,zmin:5},IV:{z0:1.0,zmin:10}};
export const TERRAIN_KEYS=['0','II','III','IV'];
// Table F.2 structural logarithmic decrement by the material the system implies.
export const SYSTEM_DELTA={'column-grid':0.10,outrigger:0.08,diagrid:0.05};
// Table F.1 mode exponent: central RC core 1.5; core plus peripheral columns 1.0.
export const SYSTEM_MODE={'column-grid':1.5,outrigger:1.0,diagrid:1.0};
// ASSUMPTION: storey mass per square metre of floor plate (t/m²). Typical
// range quoted for tall buildings 0.8–1.0; heavier for concrete. Not a source.
export const SYSTEM_MASS={'column-grid':1.0,outrigger:0.9,diagrid:0.8};
// ASSUMPTION: supplementary damping of a tuned-mass damper, as a fraction of
// critical. Device-dependent (mass ratio, tuning); 2% is an illustration.
export const TMD_ZETA=0.02;
export const N_STRIPS=48;

/* Force coefficient at d/b ≈ 1 and its basis. Sharp re-entrant plans have no
   tabulated value and are assumed equal to the sharp square; the rounded and
   faceted plans are interpolated toward a circle-like value of about 1.2. */
export const CF_FAMILY={
 box:[2.1,'tabulated'],cross:[2.1,'assumed'],star:[2.1,'assumed'],rub:[2.1,'assumed'],pinwheel:[2.1,'assumed'],
 triangle:[2.0,'assumed'],chamfer:[1.6,'interpolated'],petal:[1.5,'interpolated'],oval:[1.2,'interpolated'],
 hexagon:[1.6,'tabulated'],octagon:[1.3,'tabulated']
};
const REGULAR=new Set(['hexagon','octagon','triangle']);
// Fig. 7.23, c_f,0 against d/b, read at its published break points.
const FIG723=[[0.1,2.0],[0.2,2.0],[0.7,2.4],[1,2.1],[2,1.65],[5,1.0],[10,0.9],[50,0.9]];

const fin=(v,d=0)=>Number.isFinite(v)?v:d;
const terr=k=>TERRAIN[k]||TERRAIN.IV;

export const kr=z0=>0.19*Math.pow(z0/0.05,0.07);
export function cr(z,k){const t=terr(k);return kr(t.z0)*Math.log(Math.max(z,t.zmin)/t.z0)}
export const vm=(z,vb,k)=>cr(z,k)*vb;
export function Iv(z,k){const t=terr(k);return 1/Math.log(Math.max(z,t.zmin)/t.z0)}
export function qp(z,vb,k){const v=vm(z,vb,k);return (1+7*Iv(z,k))*0.5*RHO*v*v}

/* Width across the wind and depth along it, for a plan polygon and a wind
   direction in degrees measured from the plan's own x axis. */
export function projectedWidth(poly,deg){
 const a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 let lo=Infinity,hi=-Infinity,dlo=Infinity,dhi=-Infinity;
 for(const [x,y]of poly){const along=x*c+y*s,across=-x*s+y*c;lo=Math.min(lo,across);hi=Math.max(hi,across);dlo=Math.min(dlo,along);dhi=Math.max(dhi,along)}
 return {b:hi-lo,d:dhi-dlo};
}
export function rotatePlan(poly,deg){
 const a=-deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 return poly.map(([x,y])=>[x*c-y*s,x*s+y*c]);
}

export function cf0Rect(dOverB){
 const r=Math.min(50,Math.max(0.1,fin(dOverB,1)));
 for(let i=1;i<FIG723.length;i++){const [x0,y0]=FIG723[i-1],[x1,y1]=FIG723[i];if(r<=x1){const f=Math.log(r/x0)/Math.log(x1/x0);return y0+(y1-y0)*f}}
 return 0.9;
}
/* c_f for a family at a depth/width ratio. The rectangle uses Fig. 7.23
   directly; other non-regular plans take Fig. 7.23's d/b trend as a factor on
   their own value — an extension, and labelled interpolated when d/b ≠ 1. */
export function cfOf(family,dOverB=1,{normal=true,aspect=1}={}){
 const [base,basis0]=CF_FAMILY[family]||[2.1,'assumed'];
 if(REGULAR.has(family)){const ok=Math.abs(aspect-1)<1e-6;return {cf:base,basis:basis0==='tabulated'&&!ok?'interpolated':basis0}}
 const k=cf0Rect(dOverB)/2.1,cf=base*k;
 let basis=basis0;
 if(family==='box')basis=normal?'tabulated':'interpolated';
 else if(basis0==='tabulated'||Math.abs(k-1)>0.02)basis=basis0==='assumed'?'assumed':'interpolated';
 return {cf,basis};
}

export function defaultZeta(system){return (SYSTEM_DELTA[system]??0.10)/(2*Math.PI)}

/* Vortex reading. r = v_m(z_e)/v_crit, which is also f_s/n1.
   'clear'  : v_crit > 1.25·v_m (E.1.2(3)), r < 0.8
   'lockin' : r in [0.8, 1.25] — shedding at the tower's own frequency now
   'below'  : r > 1.25 — resonance happens at a lower, more frequent wind */
export function vortexState(r){if(!(r>=0.8))return 'clear';return r<=1.25?'lockin':'below'}
export function scBand(sc){return sc<10?'low':sc<20?'mid':'high'}

/* The whole read. Pure: no DOM, never throws for a model state. */
export function windRead(s,o={},m){
 const vb=Math.min(80,Math.max(1,fin(o.vb,30))),terrain=TERRAIN[o.terrain]?o.terrain:'IV';
 const dir=fin(o.dir,0),system=s.system in SYSTEM_DELTA?s.system:'column-grid';
 const zeta=Math.max(0.001,fin(o.zeta,defaultZeta(system)))+(o.tmd?TMD_ZETA:0);
 const delta=2*Math.PI*zeta;
 const sr=structureRead(s,m||{gross:0,core:0});
 const H=fin(stackHeight(s),1)||1,plan=t=>profile({...s,orientation:0},t);
 const normal=Math.abs(((dir%90)+90)%90)<5||Math.abs(((dir%90)+90)%90)>85;
 const dz=H/N_STRIPS;let F=0,M=0,cfSum=0;const strips=[];
 for(let i=0;i<N_STRIPS;i++){
  const z=(i+0.5)*dz,{b,d}=projectedWidth(plan(z/H),dir);
  const c=cfOf(s.family,d/b,{normal,aspect:s.aspect}),q=qp(z,vb,terrain),f=c.cf*q*b*dz;
  F+=f;M+=f*z;cfSum+=c.cf;strips.push({z,b,v:vm(z,vb,terrain),q});
 }
 const ze=2*H/3,sec=plan(2/3),{b:be,d:de}=projectedWidth(sec,dir);
 const cfE=cfOf(s.family,de/be,{normal,aspect:s.aspect});
 const st=sr.st,n1=46/H,vE=vm(ze,vb,terrain),fs=st*vE/be,vCrit=be*n1/st,ratio=vE/vCrit;
 const area=Math.abs(sec.reduce((a,p,i)=>{const q=sec[(i+1)%sec.length];return a+p[0]*q[1]-q[0]*p[1]},0))/2;
 const massPerM2=SYSTEM_MASS[system]*1000,mE=massPerM2*area/Math.max(0.5,fin(s.height,4));
 const sc=2*delta*mE/(RHO*be*be);
 const state=vortexState(ratio);
 return {H,vb,terrain,dir,zeta,delta,deltaS:SYSTEM_DELTA[system],tmd:!!o.tmd,
  vTop:vm(H,vb,terrain),qTop:qp(H,vb,terrain),shear:F/1e6,moment:M/1e6,cfMean:cfSum/N_STRIPS,
  cfE:cfE.cf,cfBasis:cfE.basis,ze,bE:be,dE:de,section:sec,vE,fs,n1,st,stTabulated:sr.stTabulated,vCrit,ratio,state,
  mE,sc,scBand:scBand(sc),lambda:sr.lambda,band:sr.band,mode:SYSTEM_MODE[system],strips};
}

/* Every plan family at this tower's span, height and wind, sorted by base shear. */
export function familyComparison(s,o={}){
 return Object.keys(families).map(family=>{const r=windRead({...s,family},o);return {family,shear:r.shear,vCrit:r.vCrit,ratio:r.ratio,state:r.state}}).sort((a,b)=>a.shear-b.shear);
}

/* A round time scale (real seconds per screen second) chosen so the reference
   wind of 40 m/s crosses half the canvas per second at the drawing's scale. */
const NICE=[0.5,1,1.5,2,2.5,3,4,5,6,8,10,12,15,20,25,30,40,50];
export function timeScale(pxPerMetre,widthPx){
 const raw=0.5*widthPx/(40*Math.max(1e-6,pxPerMetre));
 return NICE.reduce((a,b)=>Math.abs(Math.log(b/raw))<Math.abs(Math.log(a/raw))?b:a,NICE[0]);
}

export const WIND_TEXT={
 en:{title:'Wind tunnel',
  lede:'The tower in a steady wind: what the code formulas say it must carry, and whether its own sway frequency meets the vortices its plan sheds.',
  ctl:{vb:'Basic wind velocity v_b',vbNote:'An input. Take it from the national annex or local code for the site.',terrain:'Terrain category',dir:'Wind direction to the plan axis',damp:'Structural damping ζ',dampDefault:'Default for {mat}: δ {d} → ζ {z}%',tmd:'Tuned mass damper',tmdOn:'On · +2.0% ζ assumed',tmdOff:'Off',tmdNote:'Taipei 101 carries a 660 t pendulum damper. The added 2% is an illustrative assumption; a real device is tuned to its tower.'},
  terr:{'0':'0 · sea','II':'II · open','III':'III · suburb','IV':'IV · city'},
  mat:{'column-grid':'reinforced concrete','outrigger':'mixed steel–concrete','diagrid':'steel'},
  u:{ms:'m/s',kpa:'kPa',mn:'MN',mnm:'MN·m',hz:'Hz',deg:'°',pct:'%',m:'m'},
  k:{vTop:'Mean wind at the top',qTop:'Peak pressure at the top',shear:'Along-wind base shear',moment:'Overturning moment',ratio:'Shedding ÷ sway frequency',vcrit:'Lock-in wind speed v_crit',sc:'Scruton number',damping:'Damping',lambda:'Slenderness',cf:'Force coefficient c_f at z_e'},
  basis:{tabulated:'tabulated',interpolated:'interpolated',assumed:'assumed'},
  sc:{low:'low — vortex response can be large',mid:'moderate',high:'high — vortex response is suppressed'},
  scNote:'Reading bands are indicative, not code limits. Floor mass {m} t/m² assumed.',
  plan:'Plan at z_e = 2H/3 · {z} m',wind:'wind',time:'1 s on screen = {k} s real',freq:'f_s {fs} Hz · n1 {n1} Hz',
  status:{clear:'Clear: v_crit is above 1.25 × v_m',lockin:'Lock-in: shedding at the tower’s own frequency',below:'Lock-in at a lower wind, {v} m/s'},
  elev:'Elevation · true proportion 1:{l}',exag:'Sway exaggerated, relative, not a deflection',vLab:'v_m(z)',qLab:'q_p(z)',ze:'z_e',
  compare:'Every plan at this height and wind',compareNote:'Base shear, lowest first, with the lock-in wind. Change the plan in the Form tab.',
  cmp:{clear:'clear',lockin:'lock-in',below:'lock-in at a lower wind'},
  verdict:{clear:'Vortex shedding stays clear of the first sway mode at this wind.',lockin:'Lock-in: the plan sheds vortices at the tower’s own sway frequency at this wind.',below:'The tower passes through lock-in at {v} m/s, a lower and more frequent wind: a vortex-shedding check is required.'},
  hint:'Damping, a rounder or twisted plan, taper, or a stouter proportion move these numbers.',
  comfort:'Occupant comfort is judged on peak acceleration at a 10-year return: about 10–15 milli-g for residential and 20–25 milli-g for offices (ISO 10137, North American practice, NatHaz). It is not computed here.',
  cannot:'Cannot claim: no wind-tunnel test, no CFD, no site wind climate, no stiffness model, no acceleration. The flow picture is an illustration around an equivalent cylinder; the frequencies are computed. EN 1991-1-4 covers buildings up to 200 m; above that its profile is extrapolated. Codes require a specialist wind study for tall and slender buildings.',
  src:'Sources: EN 1991-1-4:2005 §4.3–4.5 (Eq. 4.3–4.8, Table 4.1), §7.6 Fig. 7.23, §7.8 Table 7.11, Annex E (E.1.2, E.1.3, Eq. E.4, Table E.1), Annex F (F.2, Tables F.1–F.2, F.5) · ψ_λ = 1, c_s·c_d = 1 · ISO 10137:2007 · NatHaz Modeling Laboratory (Kareem) · Taipei 101 damper (Thornton Tomasetti / Motioneering).',
  fam:{box:'Rectilinear',chamfer:'Chamfered',cross:'Cruciform',octagon:'Octagonal',star:'Eight-point',rub:'Rub el Hizb',triangle:'Triangular',hexagon:'Hexagonal',oval:'Faceted oval',petal:'Four-petal',pinwheel:'Pinwheel'}},
 th:{title:'อุโมงค์ลม',
  lede:'อาคารในกระแสลมคงที่ แรงที่สูตรตามมาตรฐานกำหนดให้รับ และความถี่การโยกตัวของอาคารตรงกับกระแสวนที่ผังหลุดออกมาหรือไม่',
  ctl:{vb:'ความเร็วลมพื้นฐาน v_b',vbNote:'เป็นค่าที่ต้องป้อนเอง ให้ใช้ค่าจากภาคผนวกแห่งชาติหรือมาตรฐานท้องถิ่นของที่ตั้ง',terrain:'ประเภทภูมิประเทศ',dir:'ทิศลมเทียบกับแกนผัง',damp:'อัตราการหน่วงของโครงสร้าง ζ',dampDefault:'ค่าเริ่มต้นของ{mat}: δ {d} → ζ {z}%',tmd:'ตัวหน่วงมวลปรับจูน',tmdOn:'เปิด · สมมติเพิ่ม ζ 2.0%',tmdOff:'ปิด',tmdNote:'ไทเป 101 ติดตั้งตัวหน่วงแบบลูกตุ้มหนัก 660 ตัน ค่าที่เพิ่ม 2% เป็นสมมติฐานเพื่อแสดงผล อุปกรณ์จริงต้องปรับจูนให้เข้ากับอาคารแต่ละหลัง'},
  terr:{'0':'0 · ทะเล','II':'II · ที่โล่ง','III':'III · ชานเมือง','IV':'IV · ใจกลางเมือง'},
  mat:{'column-grid':'คอนกรีตเสริมเหล็ก','outrigger':'โครงสร้างผสมเหล็กกับคอนกรีต','diagrid':'เหล็ก'},
  u:{ms:'ม./วินาที',kpa:'กิโลปาสกาล',mn:'เมกะนิวตัน',mnm:'เมกะนิวตัน·ม.',hz:'เฮิรตซ์',deg:'°',pct:'%',m:'ม.'},
  k:{vTop:'ความเร็วลมเฉลี่ยที่ยอดอาคาร',qTop:'แรงดันลมสูงสุดที่ยอดอาคาร',shear:'แรงเฉือนที่ฐานตามทิศลม',moment:'โมเมนต์พลิกคว่ำ',ratio:'ความถี่กระแสวน ÷ ความถี่การโยก',vcrit:'ความเร็วลมที่เกิดการล็อก v_crit',sc:'เลขสครูตัน',damping:'การหน่วง',lambda:'ความชะลูด',cf:'สัมประสิทธิ์แรง c_f ที่ z_e'},
  basis:{tabulated:'ค่าจากตาราง',interpolated:'ค่าประมาณช่วงกลาง',assumed:'ค่าสมมติ'},
  sc:{low:'ต่ำ การตอบสนองต่อกระแสวนอาจรุนแรง',mid:'ปานกลาง',high:'สูง การตอบสนองต่อกระแสวนถูกกดไว้'},
  scNote:'ช่วงการอ่านค่าเป็นแนวทาง ไม่ใช่ขีดจำกัดตามมาตรฐาน สมมติมวลพื้น {m} ตัน/ตร.ม.',
  plan:'ผังที่ z_e = 2H/3 · {z} ม.',wind:'ลม',time:'1 วินาทีบนจอ = {k} วินาทีจริง',freq:'f_s {fs} เฮิรตซ์ · n1 {n1} เฮิรตซ์',
  status:{clear:'ปลอดภัย: v_crit สูงกว่า 1.25 × v_m',lockin:'ล็อก: กระแสวนหลุดที่ความถี่ของอาคารเอง',below:'ล็อกที่ลมอ่อนกว่า {v} ม./วินาที'},
  elev:'รูปด้าน · สัดส่วนจริง 1:{l}',exag:'การโยกขยายเกินจริง เป็นค่าเปรียบเทียบ ไม่ใช่การแอ่นตัว',vLab:'v_m(z)',qLab:'q_p(z)',ze:'z_e',
  compare:'ผังทุกแบบที่ความสูงและลมนี้',compareNote:'แรงเฉือนที่ฐาน เรียงจากน้อยไปมาก พร้อมความเร็วลมที่เกิดการล็อก เปลี่ยนผังได้ที่แท็บรูปทรง',
  cmp:{clear:'ปลอดภัย',lockin:'ล็อก',below:'ล็อกที่ลมอ่อนกว่า'},
  verdict:{clear:'กระแสวนไม่ตรงกับโหมดการโยกแรกที่ความเร็วลมนี้',lockin:'ล็อก: ผังปล่อยกระแสวนที่ความถี่การโยกของอาคารเองที่ความเร็วลมนี้',below:'อาคารจะผ่านภาวะล็อกที่ {v} ม./วินาที ซึ่งเป็นลมที่อ่อนกว่าและเกิดบ่อยกว่า ต้องตรวจสอบผลของกระแสวน'},
  hint:'การหน่วง ผังที่มนขึ้นหรือบิดตัว การเรียวยอด หรือสัดส่วนที่ป้อมขึ้น ล้วนเปลี่ยนตัวเลขเหล่านี้',
  comfort:'ความสบายของผู้ใช้อาคารประเมินจากความเร่งสูงสุดที่คาบการกลับ 10 ปี ราว 10–15 มิลลิจี สำหรับที่พักอาศัย และ 20–25 มิลลิจี สำหรับสำนักงาน (ISO 10137 แนวปฏิบัติในอเมริกาเหนือ NatHaz) ระบบนี้ไม่ได้คำนวณค่านี้',
  cannot:'สิ่งที่อ้างไม่ได้: ไม่มีการทดสอบในอุโมงค์ลม ไม่มี CFD ไม่มีสถิติลมของที่ตั้ง ไม่มีแบบจำลองความแข็ง ไม่มีค่าความเร่ง ภาพการไหลเป็นภาพประกอบรอบทรงกระบอกเทียบเท่า ส่วนความถี่เป็นค่าคำนวณ EN 1991-1-4 ครอบคลุมอาคารสูงไม่เกิน 200 ม. ที่สูงกว่านั้นเป็นการต่อเส้นโปรไฟล์ออกไป มาตรฐานกำหนดให้อาคารสูงและชะลูดต้องศึกษาลมโดยผู้เชี่ยวชาญ',
  src:'แหล่งอ้างอิง: EN 1991-1-4:2005 ข้อ 4.3–4.5 (สมการ 4.3–4.8 ตาราง 4.1) ข้อ 7.6 รูป 7.23 ข้อ 7.8 ตาราง 7.11 ภาคผนวก E (E.1.2, E.1.3, สมการ E.4, ตาราง E.1) ภาคผนวก F (F.2, ตาราง F.1–F.2, F.5) · ψ_λ = 1, c_s·c_d = 1 · ISO 10137:2007 · NatHaz Modeling Laboratory (Kareem) · ตัวหน่วงไทเป 101 (Thornton Tomasetti / Motioneering)',
  fam:{box:'สี่เหลี่ยม',chamfer:'ลบมุม',cross:'กากบาท',octagon:'แปดเหลี่ยม',star:'ดาวแปดแฉก',rub:'รุบอัลฮิซบ์',triangle:'สามเหลี่ยม',hexagon:'หกเหลี่ยม',oval:'วงรีเหลี่ยม',petal:'สี่กลีบ',pinwheel:'กังหัน'}},
 zh:{title:'风洞',
  lede:'稳定风中的塔楼：规范公式要求它承受多少风荷载，以及它自身的摆动频率是否与平面脱落的旋涡相遇。',
  ctl:{vb:'基本风速 v_b',vbNote:'这是输入值，应按场地所在国家附录或当地规范取值。',terrain:'地面粗糙度类别',dir:'风向与平面轴线夹角',damp:'结构阻尼比 ζ',dampDefault:'{mat}默认值：δ {d} → ζ {z}%',tmd:'调谐质量阻尼器',tmdOn:'开 · 假定增加 ζ 2.0%',tmdOff:'关',tmdNote:'台北 101 装有 660 吨摆式阻尼器。此处增加的 2% 只是示意性假定，实际装置需针对具体塔楼调谐。'},
  terr:{'0':'0 · 海面','II':'II · 开阔地','III':'III · 郊区','IV':'IV · 市中心'},
  mat:{'column-grid':'钢筋混凝土','outrigger':'钢-混凝土混合结构','diagrid':'钢结构'},
  u:{ms:'米/秒',kpa:'千帕',mn:'兆牛',mnm:'兆牛·米',hz:'赫兹',deg:'°',pct:'%',m:'米'},
  k:{vTop:'顶部平均风速',qTop:'顶部峰值风压',shear:'顺风向基底剪力',moment:'倾覆力矩',ratio:'脱落频率 ÷ 摆动频率',vcrit:'锁定风速 v_crit',sc:'斯克鲁顿数',damping:'阻尼',lambda:'高宽比',cf:'z_e 处体型系数 c_f'},
  basis:{tabulated:'查表值',interpolated:'插值',assumed:'假定值'},
  sc:{low:'低：涡激响应可能很大',mid:'中等',high:'高：涡激响应受到抑制'},
  scNote:'分档仅供参考，不是规范限值。假定楼面质量 {m} 吨/平方米。',
  plan:'z_e = 2H/3 处平面 · {z} 米',wind:'风',time:'屏幕 1 秒 = 实际 {k} 秒',freq:'f_s {fs} 赫兹 · n1 {n1} 赫兹',
  status:{clear:'安全：v_crit 高于 1.25 × v_m',lockin:'锁定：旋涡以塔楼自身频率脱落',below:'在较低风速 {v} 米/秒 时锁定'},
  elev:'立面 · 真实比例 1:{l}',exag:'摆动经过放大，仅作相对比较，不是位移',vLab:'v_m(z)',qLab:'q_p(z)',ze:'z_e',
  compare:'同一高度与风况下的所有平面',compareNote:'基底剪力由小到大排列，并列出锁定风速。可在“形体”页更换平面。',
  cmp:{clear:'安全',lockin:'锁定',below:'低风速锁定'},
  verdict:{clear:'在此风速下，旋涡脱落避开了第一阶摆动模态。',lockin:'锁定：在此风速下，平面以塔楼自身的摆动频率脱落旋涡。',below:'塔楼会在 {v} 米/秒 这一较低且更常见的风速下经历锁定，需要进行涡激振动验算。'},
  hint:'增加阻尼、采用更圆润或扭转的平面、收分，或更粗壮的比例，都会改变这些数字。',
  comfort:'人员舒适度以 10 年重现期的峰值加速度评判：住宅约 10–15 毫重力加速度，办公约 20–25 毫重力加速度（ISO 10137、北美惯例、NatHaz）。此处不作计算。',
  cannot:'不能据此断言：没有风洞试验，没有 CFD，没有场地风气候，没有刚度模型，没有加速度计算。流场图是围绕等效圆柱的示意，频率为计算值。EN 1991-1-4 适用于 200 米以内的建筑，超出部分的风剖面为外推。规范要求高层和细长建筑进行专项风工程研究。',
  src:'来源：EN 1991-1-4:2005 第 4.3–4.5 节（式 4.3–4.8，表 4.1）、第 7.6 节图 7.23、第 7.8 节表 7.11、附录 E（E.1.2、E.1.3、式 E.4、表 E.1）、附录 F（F.2、表 F.1–F.2、F.5）· ψ_λ = 1，c_s·c_d = 1 · ISO 10137:2007 · NatHaz 实验室（Kareem）· 台北 101 阻尼器（Thornton Tomasetti / Motioneering）',
  fam:{box:'矩形',chamfer:'切角',cross:'十字',octagon:'八边形',star:'八芒星',rub:'鲁布·希兹布',triangle:'三角形',hexagon:'六边形',oval:'折面椭圆',petal:'四瓣',pinwheel:'风车'}}
};

/* ── DOM ──────────────────────────────────────────────────────────────── */
const fill=(t,v)=>t.replace(/\{(\w+)\}/g,(_,k)=>v[k]??'');
const ACC='#f59e0b',INK='#e6edf3',DIM='#a2aca9',DARK='#111416';
const ctl={vb:30,terrain:'IV',dir:0,zeta:null,tmd:false};
let ui=null,last=null,raf=0,sim=null;

function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n}
const reduced=()=>typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;

function build(host,lang){
 const c=WIND_TEXT[lang]||WIND_TEXT.en;
 if(ui&&ui.ro)ui.ro.disconnect();
 host.replaceChildren();
 const root=el('section','wl');
 const head=el('h2','wl-title',c.title),lede=el('p','wl-prose',c.lede);
 const views=el('div','wl-views');
 const planC=el('canvas','wl-canvas wl-plan'),elevC=el('canvas','wl-canvas wl-elev');
 for(const cv of [planC,elevC])cv.setAttribute('role','img');
 views.append(planC,elevC);
 const status=el('p','wl-status');status.setAttribute('aria-live','polite');
 const ctls=el('div','wl-controls');
 const range=(key,label,min,max,step,unit,note)=>{
  const w=el('div','wl-field'),id='wl-'+key,lab=el('label','wl-label',label),out=el('output','wl-out');
  lab.htmlFor=id;const inp=el('input');inp.type='range';inp.id=id;inp.min=min;inp.max=max;inp.step=step;
  const top=el('div','wl-fieldhead');top.append(lab,out);w.append(top,inp);
  let n=null;if(note!=null){n=el('p','wl-hint',note);w.append(n)}
  ctls.append(w);return {inp,out,note:n,unit};
 };
 const vb=range('vb',c.ctl.vb,15,55,1,c.u.ms,c.ctl.vbNote);
 vb.inp.oninput=()=>{ctl.vb=+vb.inp.value;refresh()};
 const tw=el('div','wl-field'),tl=el('span','wl-label',c.ctl.terrain),seg=el('div','wl-seg');seg.setAttribute('role','group');seg.setAttribute('aria-label',c.ctl.terrain);
 const terrB=TERRAIN_KEYS.map(k=>{const b=el('button',null,c.terr[k]);b.type='button';b.onclick=()=>{ctl.terrain=k;refresh()};seg.append(b);return [k,b]});
 const th=el('div','wl-fieldhead');th.append(tl);tw.append(th,seg);ctls.append(tw);
 const dir=range('dir',c.ctl.dir,0,180,5,'°');
 dir.inp.oninput=()=>{ctl.dir=+dir.inp.value;refresh(true)};
 const damp=range('zeta',c.ctl.damp,0.5,6,0.1,'%','');
 damp.inp.oninput=()=>{ctl.zeta=+damp.inp.value/100;refresh()};
 const mw=el('div','wl-field'),mh=el('div','wl-fieldhead'),tmdB=el('button','wl-toggle');tmdB.type='button';tmdB.id='wl-tmd';
 const tmdL=el('label','wl-label',c.ctl.tmd);tmdL.htmlFor='wl-tmd';
 tmdB.onclick=()=>{ctl.tmd=!ctl.tmd;refresh()};
 mh.append(tmdL);mw.append(mh,tmdB,el('p','wl-hint',c.ctl.tmdNote));ctls.append(mw);
 const dl=el('dl','wl-facts'),rows={};
 for(const k of ['vTop','qTop','shear','moment','ratio','vcrit','sc','damping','lambda','cf']){const d=el('div');const dd=el('dd');d.append(el('dt',null,c.k[k]),dd);dl.append(d);rows[k]=dd}
 const verdict=el('p','wl-verdict'),hint=el('p','wl-prose',c.hint);
 const cmpT=el('h3','wl-sub',c.compare),cmpN=el('p','wl-hint',c.compareNote),cmp=el('ol','wl-compare');
 const comfort=el('p','wl-prose',c.comfort),cannot=el('p','wl-prose wl-limits',c.cannot),src=el('p','wl-src',c.src);
 root.append(head,views,status,lede,ctls,verdict,dl,hint,cmpT,cmpN,cmp,comfort,cannot,src);
 host.append(root);
 const ro=typeof ResizeObserver==='function'?new ResizeObserver(()=>{size();if(!raf)drawStatic()}):null;
 if(ro){ro.observe(planC);ro.observe(elevC)}
 ui={host,lang,c,planC,elevC,status,vb,dir,damp,terrB,tmdB,rows,verdict,cmp,ro,font:'12px monospace'};
 try{const f=getComputedStyle(host).getPropertyValue('--mono').trim();if(f)ui.font='12px '+f}catch{}
 size();
}

function size(){
 if(!ui)return;const dpr=Math.min(3,globalThis.devicePixelRatio||1);
 for(const cv of [ui.planC,ui.elevC]){const w=Math.max(1,Math.round(cv.clientWidth)),h=Math.max(1,Math.round(cv.clientHeight));if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr)}cv._w=w;cv._h=h;cv._dpr=dpr}
 if(sim)sim.particles=null;
}

const loc=lang=>lang==='th'?'th-TH':lang==='zh'?'zh-CN':'en-US';
function fmt(v,d=0){return Number.isFinite(v)?v.toLocaleString(loc(ui.lang),{minimumFractionDigits:d,maximumFractionDigits:d}):'—'}

function refresh(geometryChanged){
 if(!ui||!last)return;
 const {state,metrics}=last,c=ui.c,system=state.system in SYSTEM_DELTA?state.system:'column-grid';
 const zeta=ctl.zeta??defaultZeta(system);
 let r;try{r=windRead(state,{...ctl,zeta},metrics)}catch{return}
 ui.r=r;
 ui.vb.inp.value=ctl.vb;ui.vb.out.textContent=fmt(ctl.vb)+' '+c.u.ms;
 ui.dir.inp.value=ctl.dir;ui.dir.out.textContent=fmt(ctl.dir)+'°';
 ui.damp.inp.value=(zeta*100).toFixed(1);ui.damp.out.textContent=fmt(zeta*100,1)+'%';
 ui.damp.note.textContent=fill(c.ctl.dampDefault,{mat:c.mat[system],d:fmt(SYSTEM_DELTA[system],2),z:fmt(defaultZeta(system)*100,1)});
 for(const [k,b]of ui.terrB)b.setAttribute('aria-pressed',String(ctl.terrain===k));
 ui.tmdB.setAttribute('aria-pressed',String(ctl.tmd));ui.tmdB.textContent=ctl.tmd?c.ctl.tmdOn:c.ctl.tmdOff;
 const R=ui.rows;
 R.vTop.textContent=fmt(r.vTop,1)+' '+c.u.ms;
 R.qTop.textContent=fmt(r.qTop/1000,2)+' '+c.u.kpa;
 R.shear.textContent=fmt(r.shear,1)+' '+c.u.mn;
 R.moment.textContent=fmt(r.moment)+' '+c.u.mnm;
 R.ratio.textContent=fmt(r.ratio,2)+' · '+fmt(r.fs,3)+' / '+fmt(r.n1,3)+' '+c.u.hz;
 R.vcrit.textContent=fmt(r.vCrit,1)+' '+c.u.ms+' · v_m(z_e) '+fmt(r.vE,1)+' '+c.u.ms+(r.stTabulated?'':' · St '+c.basis.interpolated);
 R.sc.textContent=fmt(r.sc,1)+' · '+c.sc[r.scBand];R.sc.title=fill(c.scNote,{m:fmt(SYSTEM_MASS[system],1)});
 R.damping.textContent='ζ '+fmt(r.zeta*100,1)+'% · δ '+fmt(r.delta,3)+(r.tmd?' · TMD':'');
 const sv=(STRUCT_TEXT[ui.lang]||STRUCT_TEXT.en).verdict[r.band];
 R.lambda.textContent='1:'+fmt(r.lambda,1)+' · '+sv;
 R.cf.textContent=fmt(r.cfE,2)+' · '+c.basis[r.cfBasis];
 ui.verdict.textContent=fill(c.verdict[r.state],{v:fmt(r.vCrit,1)});
 ui.verdict.classList.toggle('wl-flag',r.state!=='clear');
 const st=fill(c.status[r.state],{v:fmt(r.vCrit,1)});
 ui.status.textContent=st;ui.status.classList.toggle('wl-flag',r.state!=='clear');
 ui.planC.setAttribute('aria-label',fill(c.plan,{z:fmt(r.ze)})+'. '+st);
 ui.elevC.setAttribute('aria-label',fill(c.elev,{l:fmt(r.lambda,1)}));
 // comparison
 let rows;try{rows=familyComparison(state,{...ctl,zeta})}catch{rows=[]}
 const maxS=Math.max(1e-9,...rows.map(x=>x.shear));
 ui.cmp.replaceChildren(...rows.map(x=>{
  const li=el('li','wl-row'+(x.family===state.family?' wl-me':''));
  // A row is a way to try that plan: it sets the tower's family, and every
  // desk follows. The current family stays plain text.
  const label=c.fam[x.family]||x.family,canPick=pick&&x.family!==state.family;
  const name=el(canPick?'button':'span','wl-name',label),track=el('span','wl-track'),bar=el('span','wl-bar');
  if(canPick){name.type='button';name.onclick=()=>pick({family:x.family})}
  bar.style.width=(100*x.shear/maxS).toFixed(1)+'%';track.append(bar);
  const val=el('span','wl-val',fmt(x.shear)+' '+c.u.mn+' · v_crit '+fmt(x.vCrit)+' '+c.u.ms+' · '+c.cmp[x.state]);
  if(x.state!=='clear')val.classList.add('wl-flagtext');
  li.append(name,track,val);return li}));
 if(geometryChanged||!sim||sim.key!==keyOf(r))resetSim(r);
 else sim.r=r;
 if(!raf)drawStatic();
}
const keyOf=r=>r.section.length+':'+r.dir+':'+r.bE.toFixed(3)+':'+r.H.toFixed(2);

/* ── FLOW ─────────────────────────────────────────────────────────────────
   Potential flow round an equivalent cylinder of the projected width, plus
   point vortices shed alternately from the two flanks at the computed f_s and
   carried downstream at 0.85·U. It is a picture of the computed frequency, not
   a solution of the flow. Units: metres and real seconds; the screen shows
   `k` real seconds per screen second. */
function resetSim(r){sim={r,key:keyOf(r),vort:[],phase:0,side:1,particles:null,sway:0,tReal:0}}

function velocity(x,y,U,R,vort){
 const r2=x*x+y*y,R2=R*R;let u=U,v=0;
 if(r2>R2*0.25){const r4=r2*r2;u=U*(1-R2*(x*x-y*y)/r4);v=-U*2*R2*x*y/r4}
 if(x>0)u*=1-0.45*Math.exp(-(y*y)/(R2*1.2))*Math.exp(-x/(12*R));
 for(const w of vort){const dx=x-w.x,dy=y-w.y,d2=dx*dx+dy*dy+1e-6,rc2=w.rc*w.rc,g=w.g*(1-Math.exp(-d2/rc2))/(2*Math.PI*d2);u+=-g*dy;v+=g*dx}
 return [u,v];
}

function geom(cv,r){
 const W=cv._w||cv.clientWidth||300,H=cv._h||cv.clientHeight||200;
 const Rc=Math.max(1,...r.section.map(([x,y])=>Math.hypot(x,y)));
 const pxm=Math.min(W*0.12,H*0.26)/Rc,k=timeScale(pxm,W);
 return {W,H,pxm,k,cx:W*0.28,cy:H*0.5};
}

function step(dtScreen){
 const r=sim.r,cv=ui.planC,g=geom(cv,r),U=r.vE,R=r.bE/2,dt=dtScreen*g.k;
 sim.tReal+=dt;
 // shedding: one vortex every half period, alternating flanks
 sim.phase+=r.fs*dt*2;
 while(sim.phase>=1){sim.phase-=1;sim.side=-sim.side;
  sim.vort.push({x:R*0.7,y:sim.side*R*0.95,g:sim.side*-2.8*U*R,rc:R*0.55,age:0,lock:r.state==='lockin'})}
 const xmax=(g.W-g.cx)/g.pxm+R*2;
 for(const w of sim.vort){const [u,v]=velocity(w.x,w.y,U,R,[]);w.x+=Math.max(0.5*U,u*0.85)*dt;w.y+=v*0.3*dt;w.age+=dt}
 sim.vort=sim.vort.filter(w=>w.x<xmax).slice(-14);
 const sec=r.section.map(([x,y])=>rotXY(x,y,r.dir));
 if(!sim.particles){const n=Math.round(Math.min(520,Math.max(120,g.W*g.H/260)));sim.particles=Array.from({length:n},()=>spawn(g,true))}
 const ymax=g.H/2/g.pxm;
 for(const p of sim.particles){
  const [u,v]=velocity(p.x,p.y,U,R,sim.vort);
  p.px=p.x;p.py=p.y;p.x+=u*dt;p.y+=v*dt;
  if(p.x>(g.W-g.cx)/g.pxm||Math.abs(p.y)>ymax*1.05||inside(sec,[p.x,p.y])||!Number.isFinite(p.x+p.y)){Object.assign(p,spawn(g,false));p.px=p.x;p.py=p.y}
 }
 sim.sway+=r.n1*dt;
 return {g,sec};
}
function rotXY(x,y,deg){const a=-deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [x*c-y*s,x*s+y*c]}
function spawn(g,anywhere){
 const xmin=-g.cx/g.pxm,ymax=g.H/2/g.pxm;
 const x=anywhere?xmin+Math.random()*(g.W/g.pxm):xmin+Math.random()*2,y=(Math.random()*2-1)*ymax;
 return {x,y,px:x,py:y};
}

function ctx2d(cv){const x=cv.getContext&&cv.getContext('2d');if(!x)return null;x.setTransform(cv._dpr||1,0,0,cv._dpr||1,0,0);return x}

function drawPlan(g,sec,fade){
 const x=ctx2d(ui.planC);if(!x)return;const r=sim.r,c=ui.c,lock=r.state==='lockin';
 const sx=X=>g.cx+X*g.pxm,sy=Y=>g.cy-Y*g.pxm,R=r.bE/2;
 x.fillStyle=fade?'rgba(17,20,22,0.22)':DARK;x.fillRect(0,0,g.W,g.H);
 x.lineWidth=1;
 for(const p of sim.particles){
  const wake=p.x>R*0.6&&Math.abs(p.y)<R*1.6;
  x.strokeStyle=wake&&lock?ACC:wake?INK:DIM;x.globalAlpha=wake?0.9:0.55;
  x.beginPath();x.moveTo(sx(p.px),sy(p.py));x.lineTo(sx(p.x)+0.01,sy(p.y));x.stroke();
 }
 x.globalAlpha=1;
 // a mark on the flank each time a vortex leaves it: the computed f_s, seen
 for(const w of sim.vort){const life=Math.max(0,1-w.age/(g.k*0.35));if(life<=0)continue;x.globalAlpha=life;x.strokeStyle=w.lock?ACC:INK;x.lineWidth=2;const y0=sy(Math.sign(w.y)*R*1.15),y1=sy(Math.sign(w.y)*R*1.6);x.beginPath();x.moveTo(sx(R*0.2),y0);x.lineTo(sx(R*0.2),y1);x.stroke()}
 x.globalAlpha=1;x.lineWidth=1;
 x.fillStyle=DARK;x.strokeStyle=INK;x.beginPath();sec.forEach(([X,Y],i)=>i?x.lineTo(sx(X),sy(Y)):x.moveTo(sx(X),sy(Y)));x.closePath();x.fill();x.stroke();
 // labels: overwrite their bands so trails do not smear them
 const foot=[fill(c.time,{k:fmt(g.k,g.k%1?1:0)}),fill(c.freq,{fs:fmt(r.fs,3),n1:fmt(r.n1,3)})];
 x.font=ui.font;
 const lines=x.measureText(foot.join(' · ')).width>g.W-16?foot:[foot.join(' · ')];
 const band=16*(lines.length+1)+6;
 x.fillStyle=DARK;x.fillRect(0,0,g.W,22);x.fillRect(0,g.H-band,g.W,band);
 x.textBaseline='middle';x.fillStyle=DIM;
 x.fillText(fill(c.plan,{z:fmt(r.ze)})+' · '+c.wind+' →',8,12);
 lines.forEach((t,i)=>x.fillText(t,8,g.H-band+11+16*i));
 x.fillStyle=r.state==='clear'?INK:ACC;
 x.fillText(fill(c.status[r.state],{v:fmt(r.vCrit,1)}),8,g.H-band+11+16*lines.length);
}

function drawElev(){
 const cv=ui.elevC,x=ctx2d(cv);if(!x)return;const r=sim.r,c=ui.c;
 const W=cv._w||cv.clientWidth||300,Hh=cv._h||cv.clientHeight||300;
 x.fillStyle=DARK;x.fillRect(0,0,W,Hh);
 const top=34,bot=Hh-30,zpx=(bot-top)/r.H,gx=Math.max(70,W*0.42);
 const bmax=Math.max(...r.strips.map(s=>s.b));
 const scale=Math.min(zpx,(W-gx-16)/Math.max(1,bmax)),cx=gx+(W-gx)/2;
 const vmax=Math.max(1,...r.strips.map(s=>s.v)),qmax=Math.max(1,...r.strips.map(s=>s.q)),arm=gx-28;
 x.lineWidth=1;x.font=ui.font;x.textBaseline='middle';
 x.strokeStyle=DIM;x.beginPath();x.moveTo(8,bot+0.5);x.lineTo(W-8,bot+0.5);x.stroke();
 // wind arrows
 x.strokeStyle=DIM;x.fillStyle=DIM;
 for(let i=0;i<r.strips.length;i+=6){const s=r.strips[i],y=bot-s.z*zpx,l=arm*s.v/vmax;x.beginPath();x.moveTo(10,y);x.lineTo(10+l,y);x.stroke();x.beginPath();x.moveTo(10+l,y);x.lineTo(10+l-5,y-3);x.lineTo(10+l-5,y+3);x.closePath();x.fill()}
 // q_p curve
 x.strokeStyle=INK;x.setLineDash([3,3]);x.beginPath();
 r.strips.forEach((s,i)=>{const X=10+arm*s.q/qmax,Y=bot-s.z*zpx;i?x.lineTo(X,Y):x.moveTo(X,Y)});x.stroke();x.setLineDash([]);
 x.fillStyle=DIM;x.fillText(c.vLab+' →',10,top-20);x.fillStyle=INK;x.fillText(c.qLab+' '+fmt(r.qTop/1000,2)+' '+c.u.kpa,10,top-6);
 // tower, swaying in its first mode (exponent from Table F.1)
 const lockNear=Math.exp(-Math.pow((r.ratio-1)/0.25,2)),z0=0.016/Math.max(0.004,r.zeta);
 const amp=Math.min(W*0.06,(bot-top)*(0.004+0.02*Math.min(1,r.qTop/3000))*Math.sqrt(z0)+(bot-top)*0.035*lockNear*z0);
 const off=amp*Math.sin(2*Math.PI*sim.sway),lock=r.state==='lockin';
 const pts=r.strips.map(s=>[off*Math.pow(s.z/r.H,r.mode),bot-s.z*zpx,s.b*scale/2]);
 x.strokeStyle=lock?ACC:INK;x.beginPath();
 x.moveTo(cx-pts[0][2],bot);pts.forEach(([o,y,h])=>x.lineTo(cx+o-h,y));x.lineTo(cx+off-pts[pts.length-1][2],top);x.lineTo(cx+off+pts[pts.length-1][2],top);
 for(let i=pts.length-1;i>=0;i--){const [o,y,h]=pts[i];x.lineTo(cx+o+h,y)}x.lineTo(cx+pts[0][2],bot);x.stroke();
 // z_e
 const ye=bot-r.ze*zpx;x.strokeStyle=r.state==='clear'?DIM:ACC;x.setLineDash([2,4]);x.beginPath();x.moveTo(gx-12,ye);x.lineTo(W-8,ye);x.stroke();x.setLineDash([]);
 x.fillStyle=r.state==='clear'?DIM:ACC;x.fillText(c.ze,W-30,ye-8);
 x.fillStyle=DIM;x.fillText(fill(c.elev,{l:fmt(r.lambda,1)}),8,Hh-18);x.fillText(c.exag,8,Hh-4);
}

function frame(dt){const {g,sec}=step(dt);drawPlan(g,sec,true);drawElev()}
function drawStatic(){
 if(!ui||!sim||!ui.planC.isConnected)return;
 try{
  sim.particles=null;
  for(let i=0;i<70;i++){const s=step(1/30);if(i>40)drawPlan(s.g,s.sec,i>41)}
  drawElev();
 }catch{}
}

function loop(){
 let prev=0;
 const tick=t=>{if(!ui)return;const dt=prev?Math.min(1/20,(t-prev)/1000):1/60;prev=t;try{frame(dt)}catch{}raf=requestAnimationFrame(tick)};
 raf=requestAnimationFrame(tick);
}
function stop(){if(raf&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(raf);raf=0}

let pick=null;
export function renderWindLab({host,state,metrics,lang='en',active=false,changed=null}={}){
 if(!host||!state)return;
 pick=typeof changed==='function'?changed:null;
 lang=WIND_TEXT[lang]?lang:'en';
 last={state,metrics};
 if(!active){stop();return}
 if(typeof document==='undefined')return;
 try{
  if(!ui||ui.host!==host||ui.lang!==lang||!host.contains(ui.planC)){stop();sim=null;build(host,lang)}
  refresh();
  if(reduced()){stop();drawStatic()}
  else if(!raf&&typeof requestAnimationFrame==='function')loop();
 }catch(e){stop()}
}
