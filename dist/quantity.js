import {toDisplay,unitLabel,quantity,getPreferences} from './preferences.js?v=48652b12d9';
/* Per-level area and façade quantities.

   The rail prints gross floor area and integrated skin. The plate chart prints
   core, circulation and net. Those are the schedule. A level row that used a
   different rule — perimeter times height where the model integrates the loft,
   or the rentable deduction where the chart uses circulation — would disagree
   with the page the moment someone added the column up.

   Measured and order quantities are kept as two totals. The order total equals
   the measured total because this studio applies no waste allowance. Stating
   that, and stating how each figure was measured, follows the pattern of
   OpenTakeoff (https://github.com/Kentucky-ai/opentakeoff). No code is taken
   from that project. Its licence is AGPL.

   Import this module for the numbers. The page only downloads the file. */

import {stack, profile, area, evaluate, glazingAt, facadeFamilies} from './model.js?v=9531c58c62';
import {planLibrary, loftTable, lateralArea} from './geometry.js?v=eb7a621ab9';
import {splitOf, CIRCULATION_SHARE} from './areasplit.js?v=7506bcd419';
import {MATERIALS, materialOf} from './materials.js?v=be1c7d7582';
// The material's name is a common noun, so it is written in the language the
// reader is reading in. It used to live in a private map in this file, which
// meant the schedule and the studio could disagree about what a material is
// called; the one name now lives in the string table, like the crowns and the
// façade families.
import {t as I18N} from './i18n.js?v=bffcb73f5b';

const SHARE_PCT=Math.round(CIRCULATION_SHARE*100);

/* The on-screen schedule for the columns this file exports. Gross and façade
   are the rail. Core, circulation and net are the plate chart, which clamps
   the core to the plate. */
export function screenSchedule(state){
 const metrics=evaluate(state),split=splitOf(metrics);
 return {metrics,gross:metrics.gross,core:split.core,circulation:split.circulation,net:split.net,facade:metrics.facade};
}

function basePlan(s){
 const p=(planLibrary[s.family]||planLibrary.box)();
 const kx=s.span*Math.sqrt(s.aspect),ky=s.span/Math.sqrt(s.aspect);
 return p.map(([x,y])=>[x*kx,y*ky]);
}
function edgeBearing(a,b){
 const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
 if(!len)return 0;
 let az=Math.atan2(-dx,dy)*180/Math.PI;
 return az<0?az+360:az;
}

/* Spread a column so it sums to the target exactly. The last entry absorbs
   the rounding remainder, which is why the total can be compared to the
   schedule with no leftover. */
function scaleTo(rows,read,write,target){
 if(!rows.length)return;
 const weights=rows.map(read);
 const sum=weights.reduce((s,v)=>s+v,0);
 if(!(Math.abs(sum)>1e-12)){write(rows[rows.length-1],read(rows[rows.length-1])+target);return}
 // The remainder lands on the last row that already carries some of this
 // quantity, so a void whose gross is zero stays zero.
 let last=rows.length-1;
 for(let i=rows.length-1;i>=0;i--)if(Math.abs(weights[i])>1e-12){last=i;break}
 let acc=0;
 for(let i=0;i<rows.length;i++){
  if(i===last)continue;
  const v=target*(weights[i]/sum);
  write(rows[i],v);acc+=v;
 }
 write(rows[last],target-acc);
}
function scaleFacade(rows,target){
 const atoms=[];
 for(const r of rows)for(const k of Object.keys(r.facade))atoms.push([r,k,r.facade[k]]);
 if(!atoms.length)return;
 const sum=atoms.reduce((s,a)=>s+a[2],0);
 if(!(Math.abs(sum)>1e-12)){atoms[0][0].facade[atoms[0][1]]=target;return}
 let last=atoms.length-1;
 for(let i=atoms.length-1;i>=0;i--)if(Math.abs(atoms[i][2])>1e-12){last=i;break}
 let acc=0;
 atoms.forEach((a,i)=>{
  if(i===last)return;
  const v=target*(a[2]/sum);
  a[0].facade[a[1]]=v;acc+=v;
 });
 const host=atoms[last];
 host[0].facade[host[1]]=target-acc;
}

const SKIN={
 horizontal:{en:'Reinforced horizontality',th:'เน้นแนวนอน',zh:'强化水平线条'},
 vertical:{en:'Reinforced verticality',th:'เน้นแนวตั้ง',zh:'强化垂直线条'},
 'vertical-corner':{en:'Verticality at corner',th:'เน้นแนวตั้งที่มุม',zh:'转角处垂直线条'},
 'vertical-mech':{en:'Verticality at mechanical',th:'เน้นแนวตั้งที่ชั้นเครื่อง',zh:'机电层处垂直线条'},
 diagrid:{en:'Structural diagrid',th:'โครงข่ายเฉียง',zh:'结构斜交网架'}
};

function materialKey(s){return MATERIALS[s.material]?s.material:'float'}
function skinKey(s){return facadeFamilies[s.skin]?s.skin:'vertical'}

/* One level's skin, split by the material in force and by type. A clear
   material is split by the glazing class of each face. An opaque material is
   one type: the façade family. The parts are then scaled onto the same
   lateralArea() the model adds into the rail, so the split cannot invent area. */
function facadeParts(tab,poly,z0,z1,sAt,s0z,th0z,state,official){
 const opaque=materialOf(state).vt===0;
 const mat=materialKey(state),skin=skinKey(state);
 const add=(into,id,amount,typeName)=>{
  into.area[id]=(into.area[id]||0)+amount;
  if(!into.meta[id])into.meta[id]={mat,typeName};
 };
 const into={area:{},meta:{}};
 const edges=tab.edges;
 const aligned=edges.length===poly.length&&poly.length>0;
 if(!(official>0))return into;
 if(!aligned){
  const g=glazingAt(poly.length>1?edgeBearing(poly[0],poly[1]):0,state);
  const id=opaque?mat+'|skin:'+skin:mat+'|glass:'+g.key;
  const typeName=opaque?(SKIN[skin]||SKIN.vertical):{en:g.en,th:g.th,zh:g.zh};
  add(into,id,official,typeName);
  return into;
 }
 const raw=edges.map(edge=>lateralArea({edges:[edge]},z0,z1,sAt,s0z,()=>0,th0z));
 const rawSum=raw.reduce((s,v)=>s+v,0);
 let acc=0;
 raw.forEach((part,i)=>{
  const amount=i===raw.length-1?official-acc:(rawSum>0?official*(part/rawSum):0);
  acc+=amount;
  const g=glazingAt(edgeBearing(poly[i],poly[(i+1)%poly.length]),state);
  const id=opaque?mat+'|skin:'+skin:mat+'|glass:'+g.key;
  const typeName=opaque?(SKIN[skin]||SKIN.vertical):{en:g.en,th:g.th,zh:g.zh};
  add(into,id,amount,typeName);
 });
 return into;
}

export function levelRows(state){
 const screen=screenSchedule(state);
 const st=stack(state);
 const height=st.reduce((sum,l)=>sum+l.h,0)||1;
 const tab=loftTable(basePlan(state));
 const taperK=state.taper-1,twistK=state.twist*Math.PI/180;
 const sAt=z=>1+taperK*(z/height),s0z=()=>taperK/height,th0z=()=>twistK/height;
 const coreFoot=state.core**2;
 const meta={};
 const rows=st.map((l,i)=>{
  const p=profile(state,l.z/height);
  const frac=l.frac==null?1:l.frac;
  const official=lateralArea(tab,l.z,l.z+l.h,sAt,s0z,()=>0,th0z);
  const parts=facadeParts(tab,p,l.z,l.z+l.h,sAt,s0z,th0z,state,official);
  Object.assign(meta,parts.meta);
  return {level:i+1,elevation:l.z,gfa:!!l.gfa,use:l.use,
   gross:l.gfa?area(p)*frac:0,core:l.gfa?coreFoot:0,facade:parts.area};
 });
 scaleTo(rows,r=>r.gross,(r,v)=>{r.gross=v},screen.gross);
 scaleTo(rows,r=>r.core,(r,v)=>{r.core=v},screen.core);
 for(const r of rows){
  const usable=r.gross-r.core;
  r.circulation=usable*CIRCULATION_SHARE;
  r.net=usable-r.circulation;
 }
 scaleTo(rows,r=>r.circulation,(r,v)=>{r.circulation=v},screen.circulation);
 scaleTo(rows,r=>r.net,(r,v)=>{r.net=v},screen.net);
 scaleFacade(rows,screen.facade);
 const keys=Object.keys(meta).sort();
 return {rows,keys,meta,screen};
}

const COPY={
 en:{
  level:'Level',elevation:'Elevation (m)',gross:'Gross floor area (m²)',core:'Core area (m²)',
  circulation:'Circulation (m²)',net:'Net area (m²)',how:'How measured',facade:'Façade',unit:'m²',
  measured:'Measured total',order:'Order total',
  levelHow:'gross = outer slab outline × kept share, and zero on a level that earns no floor area; core = core footprint on occupied levels, otherwise zero; circulation = {pct}% of (gross − core); net = gross − core − circulation; façade = integrated loft skin between this level’s elevations (perimeter × floor-to-floor height on a vertical prism), split by material and type. Measured quantity is this geometry. Order quantity equals the measured quantity; no waste allowance is applied. The screen shows whole m². This file shows 2 decimal places.',
  measuredHow:'Measured total. The sum of the printed level rows. Gross, core, circulation, net and façade equal the on-screen schedule rounded to 2 decimal places: gross is the outer-slab sum, core is the core footprint, circulation and net are the plate split, and façade is the integrated skin. The screen shows whole m². This file shows 2 decimal places.',
  orderHow:'Order total. Each order quantity equals the measured total. This schedule adds no waste or cutting allowance, so the two totals match the on-screen schedule rounded to 2 decimal places. The screen shows whole m². This file shows 2 decimal places.'
 },
 th:{
  level:'ชั้น',elevation:'ระดับ (ม.)',gross:'พื้นที่รวม (ตร.ม.)',core:'พื้นที่แกนกลาง (ตร.ม.)',
  circulation:'พื้นที่ทางสัญจร (ตร.ม.)',net:'พื้นที่สุทธิ (ตร.ม.)',how:'วิธีวัด',facade:'เปลือก',unit:'ตร.ม.',
  measured:'รวมที่วัดได้',order:'รวมที่สั่ง',
  levelHow:'พื้นที่รวม = เส้นขอบพื้นชั้นนอก × สัดส่วนที่คงไว้ และเป็นศูนย์ในชั้นที่ไม่คิดพื้นที่; พื้นที่แกนกลาง = รอยแกนกลางในชั้นที่มีพื้นที่ นอกนั้นเป็นศูนย์; พื้นที่ทางสัญจร = {pct}% ของ (พื้นที่รวม − แกนกลาง); พื้นที่สุทธิ = พื้นที่รวม − แกนกลาง − ทางสัญจร; เปลือก = พื้นผิวที่อินทิเกรตระหว่างระดับของชั้นนี้ (เท่ากับเส้นรอบรูป × ความสูงชั้น เมื่อผนังตั้งตรง) แยกตามวัสดุและชนิด. ปริมาณที่วัดคือเรขาคณิตนี้. ปริมาณที่สั่งเท่ากับปริมาณที่วัด เพราะไม่ได้บวกเผื่อการสูญเสีย. บนจอแสดงเป็นตารางเมตรจำนวนเต็ม ไฟล์นี้แสดงทศนิยม 2 ตำแหน่ง',
  measuredHow:'รวมที่วัดได้ คือผลบวกของแถวที่พิมพ์ พื้นที่รวม แกนกลาง ทางสัญจร พื้นที่สุทธิ และเปลือก เท่ากับตารางบนจอเมื่อปัดเป็นทศนิยม 2 ตำแหน่ง: พื้นที่รวมคือผลบวกเส้นขอบพื้น แกนกลางคือรอยแกน ทางสัญจรกับพื้นที่สุทธิคือการแบ่งแผ่นพื้น และเปลือกคือผิวที่อินทิเกรต บนจอแสดงเป็นตารางเมตรจำนวนเต็ม ไฟล์นี้แสดงทศนิยม 2 ตำแหน่ง',
  orderHow:'รวมที่สั่ง แต่ละปริมาณที่สั่งเท่ากับรวมที่วัดได้ ตารางนี้ไม่บวกเผื่อการสูญเสียหรือการตัด ดังนั้นสองแถวนี้ตรงกับตารางบนจอเมื่อปัดเป็นทศนิยม 2 ตำแหน่ง บนจอแสดงเป็นตารางเมตรจำนวนเต็ม ไฟล์นี้แสดงทศนิยม 2 ตำแหน่ง'
 },
 zh:{
  level:'层',elevation:'标高 (m)',gross:'总建筑面积 (m²)',core:'核心筒面积 (m²)',
  circulation:'交通面积 (m²)',net:'净面积 (m²)',how:'测量方法',facade:'立面',unit:'m²',
  measured:'计算合计',order:'订购合计',
  levelHow:'总面积 = 外轮廓楼板 × 保留比例，不计面积的楼层为零；核心筒 = 有面积楼层的核心筒足迹，其余为零；交通 = （总面积 − 核心筒）的 {pct}%；净面积 = 总面积 − 核心筒 − 交通；立面 = 本层层间的放样侧面积（直壁时等于周长 × 层高），按材料与类型分开。实测数量是该几何量。订购数量等于实测数量，因为不加损耗。屏幕显示整平方米，本文件显示 2 位小数。',
  measuredHow:'计算合计，即各层印出值之和。总面积、核心筒、交通、净面积和立面等于屏幕上的表四舍五入到 2 位小数：总面积是外轮廓之和，核心筒是足迹，交通和净面积是平面划分，立面是积分侧面积。屏幕显示整平方米，本文件显示 2 位小数。',
  orderHow:'订购合计。每一项订购数量都等于计算合计。本表不加损耗或切割余量，因此两行合计与屏幕上的表按 2 位小数一致。屏幕显示整平方米，本文件显示 2 位小数。'
 }
};

function langOf(lang){return COPY[lang]?lang:'en'}
function fill(s){return s.replaceAll('{pct}',String(SHARE_PCT))}

function facadeHeader(id,meta,lang){
 const copy=COPY[lang],info=meta[id],table=I18N[lang]||I18N.en;
 const name=table['mat.'+(info.mat||'float')]||I18N.en['mat.float'];
 const type=(info.typeName&&info.typeName[lang])||info.typeName?.en||'';
 return copy.facade+' · '+name+' · '+type+' ('+copy.unit+')';
}

const AREA_DP=2;

/* Integer hundredths (or thousandths) of a value already passed through
   formatNum, so the printed text and the residue use one rounding. */
function units(v,digits){
 const s=formatNum(v,digits);
 const neg=s.startsWith('-');
 const [whole,frac='']= (neg?s.slice(1):s).split('.');
 const scale=10**digits;
 const n=Number(whole)*scale+Number((frac+'0'.repeat(digits)).slice(0,digits));
 return neg?-n:n;
}
function fromUnits(u,digits){
 const neg=u<0;
 const scale=10**digits;
 const a=Math.abs(u);
 const whole=Math.floor(a/scale);
 const s=digits?whole+'.'+String(a%scale).padStart(digits,'0'):String(whole);
 return neg?'-'+s:s;
}
function numExact(text,digits){return {n:true,v:Number(text),digits,exact:text}}

/* Round every level cell, then put the leftover hundredths on the last
   non-zero printed cell so the column adds up to the schedule at this
   precision. A void that prints as zero stays zero. */
function pinColumn(raw,target,digits){
 const cells=raw.map(v=>units(v,digits));
 let last=-1;
 for(let i=cells.length-1;i>=0;i--)if(cells[i]!==0){last=i;break}
 if(last<0){
  for(let i=raw.length-1;i>=0;i--)if(Math.abs(raw[i])>1e-9){last=i;break}
 }
 if(last<0)last=Math.max(0,raw.length-1);
 const targetU=units(target,digits);
 let others=0;
 for(let i=0;i<cells.length;i++)if(i!==last)others+=cells[i];
 cells[last]=targetU-others;
 return {cells,total:targetU,last};
}

export function quantityTable(state,lang='en'){
 const L=langOf(lang);
 const raw=levelRows(state),{keys,meta}=raw;
 // Convert before rounding and balancing: printed level rows must add to the printed selected-unit totals.
 const screen={...raw.screen},rows=raw.rows.map(r=>({...r,facade:{...r.facade}}));
 for(const key of ['gross','core','circulation','net','facade'])screen[key]=toDisplay(screen[key],'m²');
 for(const r of rows){r.elevation=toDisplay(r.elevation,'m');for(const key of ['gross','core','circulation','net'])r[key]=toDisplay(r[key],'m²');for(const key of keys)r.facade[key]=toDisplay(r.facade[key]||0,'m²')}
 const copy=COPY[L],imperial=getPreferences().units==='imperial';
 const headers=[copy.level,copy.elevation,copy.gross,copy.core,copy.circulation,copy.net,
  ...keys.map(k=>facadeHeader(k,meta,L)),copy.how];
 const gross=pinColumn(rows.map(r=>r.gross),screen.gross,AREA_DP);
 const core=pinColumn(rows.map(r=>r.core),screen.core,AREA_DP);
 const circulation=pinColumn(rows.map(r=>r.circulation),screen.circulation,AREA_DP);
 const net=pinColumn(rows.map(r=>r.net),screen.net,AREA_DP);
 const facadePins=keys.map(k=>pinColumn(rows.map(r=>r.facade[k]||0),rows.reduce((s,r)=>s+(r.facade[k]||0),0),AREA_DP));
 // Each material column is pinned to its own rounded sum. The leftover
 // hundredth, if the rounded columns no longer add up to the façade on the
 // schedule, goes on the last non-zero cell of the last non-zero column.
 const facadeWant=units(screen.facade,AREA_DP);
 const facadeGot=facadePins.reduce((s,p)=>s+p.total,0);
 if(facadePins.length&&facadeGot!==facadeWant){
  let col=facadePins.length-1;
  for(let c=facadePins.length-1;c>=0;c--)if(facadePins[c].cells.some(u=>u!==0)){col=c;break}
  facadePins[col].cells[facadePins[col].last]+=facadeWant-facadeGot;
  facadePins[col].total+=facadeWant-facadeGot;
 }
 const cell=(text,digits)=>numExact(text,digits);
 const body=rows.map((r,i)=>[
  cell(formatNum(r.level,0),0),cell(formatNum(r.elevation,3),3),
  cell(fromUnits(gross.cells[i],AREA_DP),AREA_DP),
  cell(fromUnits(core.cells[i],AREA_DP),AREA_DP),
  cell(fromUnits(circulation.cells[i],AREA_DP),AREA_DP),
  cell(fromUnits(net.cells[i],AREA_DP),AREA_DP),
  ...facadePins.map(p=>cell(fromUnits(p.cells[i],AREA_DP),AREA_DP)),
  fill(copy.levelHow)
 ]);
 const totalRow=(label,how)=>[
  label,'',
  cell(fromUnits(gross.total,AREA_DP),AREA_DP),
  cell(fromUnits(core.total,AREA_DP),AREA_DP),
  cell(fromUnits(circulation.total,AREA_DP),AREA_DP),
  cell(fromUnits(net.total,AREA_DP),AREA_DP),
  ...facadePins.map(p=>cell(fromUnits(p.total,AREA_DP),AREA_DP)),
  how
 ];
 body.push(totalRow(copy.measured,copy.measuredHow),totalRow(copy.order,copy.orderHow));
 if(imperial){for(let i=1;i<headers.length-1;i++)headers[i]=headers[i].replace(/m²|ตร\.ม\.|平方米/g,unitLabel('m²')).replace(/\(m\)|\(ม\.\)|\(米\)/g,'('+unitLabel('m')+')');for(const row of body)row[row.length-1]=row[row.length-1].replaceAll('m²','ft²').replaceAll('ตร.ม.','ft²').replaceAll('ตารางเมตร','ft²').replaceAll('平方米','ft²')+' '+({en:'Display: ft and ft², converted from canonical SI geometry; totals balanced after rounding.',th:'แสดง ft และ ft² แปลงจากเรขาคณิต SI และปรับผลรวมหลังปัดเศษ',zh:'显示 ft 和 ft²，由标准 SI 几何换算，舍入后校准合计。'})[L]}
 return {headers,rows:body,keys,screen,labels:{measured:copy.measured,order:copy.order}};
}

/* Only a string is a formula risk. A numeric cell is written by formatNum, so
   a negative area such as -12.50 keeps its sign. A string that starts with
   = + - @ or a tab, CR or LF is prefixed before it is quoted. */
const FORMULA_START=/^[=+\-@\t\r\n]/;
export function csvField(value){
 if(typeof value!=='string'){
  const s=value==null?'':String(value);
  return /[",\n\r]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;
 }
 let s=value;
 if(FORMULA_START.test(s))s="'"+s;
 if(/[",\n\r]/.test(s))s='"'+s.replaceAll('"','""')+'"';
 return s;
}
export function formatNum(n,digits=8){
 if(typeof n!=='number'||!Number.isFinite(n))return '';
 const s=n.toFixed(digits);
 const zero=(0).toFixed(digits);
 return s==='-'+zero?zero:s;
}
export function toCsv(headers,rows){
 const line=cells=>cells.map(cell=>{
  if(cell&&typeof cell==='object'&&cell.n)return typeof cell.exact==='string'?cell.exact:formatNum(cell.v,cell.digits??AREA_DP);
  return csvField(cell);
 }).join(',');
 return [line(headers),...rows.map(line)].join('\r\n')+'\r\n';
}
export function quantityCsv(state,lang='en'){
 const {headers,rows}=quantityTable(state,lang);
 return '\uFEFF'+toCsv(headers,rows);
}

/* One how-measured note for every field evaluate() returns. Added beside the
   metrics object. The metric names and values stay as they are. */
const AREA_TAIL={
 en:' The order quantity equals this measurement; no waste allowance is applied.',
 th:' ปริมาณที่สั่งเท่ากับค่าที่วัดได้นี้ เพราะไม่ได้บวกเผื่อการสูญเสีย',
 zh:' 订购数量等于这一测量值，因为不加损耗。'
};
const OTHER_TAIL={
 en:' This records how the figure is produced. It is not an order quantity.',
 th:' ข้อความนี้บอกว่าตัวเลขนี้มาจากไหน ไม่ใช่ปริมาณที่สั่ง',
 zh:' 这里说明该数字如何得出。它不是订购数量。'
};
const CLAUSE={
 gross:{kind:'area',en:'sum of each occupied outer slab outline times the share of that plate that is kept. Service voids add height and no floor area',th:'ผลบวกของเส้นขอบพื้นชั้นนอกของทุกชั้นที่มีพื้นที่ คูณสัดส่วนของแผ่นพื้นที่คงไว้ ชั้นเครื่องและชั้นหลบภัยเพิ่มความสูงแต่ไม่เพิ่มพื้นที่',zh:'各有面积楼层的外轮廓楼板乘以该层保留比例之和。设备层和避难层只增加高度，不增加面积'},
 core:{kind:'area',en:'core side squared, counted once on every occupied level. It is the core footprint',th:'ด้านของแกนกลางยกกำลังสอง นับหนึ่งครั้งต่อชั้นที่มีพื้นที่ เป็นรอยแกนกลาง',zh:'核心筒边长的平方，每个有面积的楼层计一次。这是核心筒足迹'},
 common:{kind:'area',en:'gross floor area times the common and service allowance. This is not the circulation slice',th:'พื้นที่รวมคูณค่าเผื่อส่วนกลางและงานระบบ ไม่ใช่ส่วนทางสัญจร',zh:'总建筑面积乘以公共与设备折减。这不是交通面积'},
 rentable:{kind:'area',en:'gross minus core minus the common allowance, and not below zero. This is the schedule rentable area, not the plate-split net',th:'พื้นที่รวมลบแกนกลางลบค่าเผื่อส่วนกลาง และไม่ติดลบ เป็นพื้นที่ให้เช่าในตาราง ไม่ใช่พื้นที่สุทธิจากการแบ่งแผ่นพื้น',zh:'总面积减去核心筒再减去公共折减，且不低于零。这是表上的可租面积，不是平面划分的净面积'},
 cornerArea:{kind:'area',en:'sum of corner zones that clear the frontage test and miss the core, capped at rentable area',th:'ผลบวกของมุมที่ผ่านความยาวหน้าและไม่ทับแกน จำกัดไม่เกินพื้นที่ให้เช่า',zh:'通过面宽检验且不与核心筒重叠的转角区之和，不超过可租面积'},
 corners:{kind:'other',en:'count of those corner zones',th:'จำนวนโซนมุมเหล่านั้น',zh:'这些转角区的个数'},
 facade:{kind:'area',en:'integrated lateral surface of the loft on every level, including voids. On a vertical prism this equals perimeter times floor-to-floor height',th:'พื้นที่ผิวด้านข้างที่อินทิเกรตของทรงยกสูงทุกชั้น รวมชั้นว่าง เมื่อผนังตั้งตรงจะเท่ากับเส้นรอบรูปคูณความสูงชั้น',zh:'每一层（含空层）放样侧面积的积分。直壁时等于周长乘以层高'},
 height:{kind:'other',en:'sum of floor-to-floor heights in the stack, crown excluded',th:'ผลบวกของความสูงระหว่างชั้นในกองชั้น ไม่รวมยอด',zh:'楼层叠合的层高之和，不含塔冠'},
 occupiedCount:{kind:'other',en:'count of levels that earn floor area',th:'จำนวนชั้นที่คิดพื้นที่',zh:'计入面积的楼层数'},
 voidLevels:{kind:'other',en:'mechanical and refuge levels inserted from the stored schedule, not counting gardens',th:'ชั้นเครื่องและชั้นหลบภัยที่แทรกจากตารางที่เก็บไว้ ไม่นับสวน',zh:'按已存楼层表插入的设备层和避难层，不含花园'},
 gardenLevels:{kind:'other',en:'levels given entirely to open air',th:'ชั้นที่ยกให้ที่โล่งทั้งชั้น',zh:'整层让给露天的楼层数'},
 gardenArea:{kind:'area',en:'plate area given away by a partial or whole-floor setback',th:'พื้นที่แผ่นพื้นที่ยกให้จากการถอยชั้นบางส่วนหรือทั้งชั้น',zh:'局部或整层退台让出的楼板面积'},
 gardenReserve:{kind:'other',en:'garden area times the terrace upkeep rate',th:'พื้นที่สวนคูณอัตราดูแลลาน',zh:'露台面积乘以露台维护单价'},
 detailKey:{kind:'other',en:'name of the selected assembly. It identifies a detail and is not a measured length',th:'ชื่อชุดประกอบที่เลือก ใช้ระบุรายละเอียด ไม่ใช่ความยาวที่วัด',zh:'所选构造的名称。它标识节点，不是测得的长度'},
 detailArea:{kind:'area',en:'the area that assembly is charged on: skin, crown plan, or terrace, as that detail names',th:'พื้นที่ที่ชุดประกอบนั้นคิดราคา ได้แก่ เปลือก ผังยอด หรือลาน ตามที่รายละเอียดนั้นระบุ',zh:'该构造计费的面积：表皮、塔冠平面或露台，以该节点所标明的为准'},
 detailReserve:{kind:'other',en:'detail area times re-qualification plus maintenance access. The material coefficient is not applied again',th:'พื้นที่รายละเอียดคูณค่าตรวจสอบซ้ำบวกการเข้าถึงซ่อมบำรุง ไม่คูณสัมประสิทธิ์วัสดุซ้ำ',zh:'节点面积乘以再认证与维护通道之和。材料系数不再乘一次'},
 detailCapital:{kind:'other',en:'detail area times that assembly’s one-time capital rate',th:'พื้นที่รายละเอียดคูณอัตราทุนครั้งเดียวของชุดประกอบนั้น',zh:'节点面积乘以该构造的一次性资本单价'},
 detailBasis:{kind:'other',en:'which named area the detail is charged on',th:'รายละเอียดนี้คิดราคาบนพื้นที่ชื่อใด',zh:'该节点按哪一项已命名面积计费'},
 airRate:{kind:'other',en:'air leakage rate stored for the selected assembly, read against its stated threshold',th:'อัตราการรั่วของอากาศที่เก็บไว้ของชุดประกอบที่เลือก อ่านเทียบเกณฑ์ที่ระบุ',zh:'所选构造存储的空气渗透率，对照其写明的限值'},
 airMeets:{kind:'other',en:'whether that stored rate is at or under the threshold. It is not a laboratory certificate',th:'อัตราที่เก็บไว้นั้นอยู่ในเกณฑ์หรือต่ำกว่าหรือไม่ ไม่ใช่ใบรับรองจากห้องทดลอง',zh:'该存储渗透率是否不高于限值。这不是试验室证书'},
 crownHeight:{kind:'other',en:'height the selected crown adds, taken from the crown library',th:'ความสูงที่ยอดที่เลือกเพิ่ม มาจากคลังยอด',zh:'所选塔冠增加的高度，取自塔冠库'},
 heightTotal:{kind:'other',en:'stack height plus crown height. The height allowance is tested against this figure',th:'ความสูงกองชั้นบวกความสูงยอด เพดานความสูงถูกตรวจกับตัวเลขนี้',zh:'叠合高度加塔冠高度。高度限额按此数检验'},
 crownReserve:{kind:'other',en:'annual upkeep charged on the crown’s own plan area',th:'ค่าดูแลรายปีที่คิดบนพื้นที่ผังของยอดเอง',zh:'按塔冠自身平面面积计的年维护费'},
 crownCapital:{kind:'other',en:'one-time structure cost of the crown',th:'ต้นทุนโครงสร้างครั้งเดียวของยอด',zh:'塔冠的一次性结构费用'},
 crownPlan:{kind:'area',en:'assumed equivalent plan area of the crown, separate from the drawn footprint',th:'พื้นที่ผังเทียบเท่าของยอดตามสมมติฐาน แยกจากรอยที่วาด',zh:'塔冠的假定等效平面面积，与绘出的足迹分开'},
 crownKind:{kind:'other',en:'the crown library key',th:'รหัสยอดในคลัง',zh:'塔冠库中的类型键'},
 crownUse:{kind:'other',en:'what the library says the crown is for',th:'คลังบอกว่ายอดนี้ใช้ทำอะไร',zh:'库中说明该塔冠作何用途'},
 crownNetRent:{kind:'other',en:'crown income after its own cost. It is not part of the floor rent',th:'รายได้ยอดหลังหักต้นทุนของยอด ไม่ใช่ส่วนของค่าเช่าชั้น',zh:'塔冠收入扣除其自身费用。它不属于楼层租金'},
 observationArea:{kind:'area',en:'area the crown library treats as an observation deck',th:'พื้นที่ที่คลังยอดถือเป็นดาดฟ้าชมวิว',zh:'塔冠库视为观景平台的面积'},
 observationRent:{kind:'other',en:'rent the library assigns to that observation area',th:'ค่าเช่าที่คลังกำหนดให้พื้นที่ชมวิวนั้น',zh:'库中赋给该观景面积的租金'},
 ledArea:{kind:'area',en:'media area. It is zero until the media façade is switched on',th:'พื้นที่สื่อ เป็นศูนย์จนกว่าจะเปิดเปลือกสื่อ',zh:'媒体面积。未打开媒体立面时为零'},
 ledRent:{kind:'other',en:'advertising income on the media area',th:'รายได้โฆษณาบนพื้นที่สื่อ',zh:'媒体面积上的广告收入'},
 ledCost:{kind:'other',en:'operating cost of the media area',th:'ต้นทุนเดินระบบของพื้นที่สื่อ',zh:'媒体面积的运行费用'},
 voidArea:{kind:'area',en:'mean occupied plate times the number of service voids. It is an equivalent, not a slab that was drawn',th:'พื้นที่แผ่นเฉลี่ยของชั้นที่มีพื้นที่ คูณจำนวนชั้นว่างงานระบบ เป็นค่าเทียบเท่า ไม่ใช่พื้นจริงที่วาด',zh:'有面积楼层的平均楼板乘以设备空层数。这是折算值，不是画出的一块楼板'},
 rent:{kind:'other',en:'annual gross rent from the published rent equation on the named areas',th:'ค่าเช่ารวมต่อปีจากสมการค่าเช่าที่เผยแพร่ บนพื้นที่ที่ระบุชื่อ',zh:'按已公布的租金公式，在已命名面积上算出的年总租金'},
 facadeCost:{kind:'other',en:'façade area times the reserve, the façade factor, regime discipline and the material coefficient',th:'พื้นที่เปลือกคูณเงินสำรอง คูณตัวคูณเปลือก คูณวินัยของกรอบ และคูณสัมประสิทธิ์วัสดุ',zh:'立面面积乘以储备、立面系数、体制约束和材料系数'},
 structureCost:{kind:'other',en:'gross area times the structure base times the plate’s column-density multiplier',th:'พื้นที่รวมคูณฐานโครงสร้าง คูณตัวคูณความหนาแน่นของเสาของแผ่นพื้น',zh:'总面积乘以结构基数，再乘以该楼板的柱密度系数'},
 contribution:{kind:'other',en:'rent plus crown income, minus the named reserves. It is not NOI',th:'ค่าเช่าบวกรายได้ยอด ลบเงินสำรองที่ระบุชื่อ ไม่ใช่ NOI',zh:'租金加塔冠收入，减去已命名的储备。它不是 NOI'},
 capex:{kind:'other',en:'one-time capital, including contingency, summed from the named area rates',th:'ทุนครั้งเดียว รวมค่าเผื่อความไม่แน่นอน รวมจากอัตราของพื้นที่ที่ระบุชื่อ',zh:'一次性资本，含不可预见费，由已命名面积的单价相加'},
 capexStructure:{kind:'other',en:'gross area times the structure capital rate times the column-density multiplier',th:'พื้นที่รวมคูณอัตราทุนโครงสร้าง คูณตัวคูณความหนาแน่นของเสา',zh:'总面积乘以结构资本单价，再乘以柱密度系数'},
 capexEnvelope:{kind:'other',en:'façade area times the envelope capital rate times the façade factor and the material coefficient',th:'พื้นที่เปลือกคูณอัตราทุนเปลือก คูณตัวคูณเปลือกและสัมประสิทธิ์วัสดุ',zh:'立面面积乘以围护资本单价、立面系数和材料系数'},
 capexFitout:{kind:'other',en:'rentable area times the fit-out capital rate',th:'พื้นที่ให้เช่าคูณอัตราทุนตกแต่งภายใน',zh:'可租面积乘以装修资本单价'},
 capexPerM2:{kind:'other',en:'total capital divided by gross floor area',th:'ทุนทั้งหมดหารด้วยพื้นที่รวม',zh:'资本总额除以总建筑面积'},
 payback:{kind:'other',en:'capital divided by annual contribution. It is infinite when contribution is not positive',th:'ทุนหารด้วยรายได้หลังหักสำรองต่อปี เป็นอนันต์เมื่อรายได้นั้นไม่เป็นบวก',zh:'资本除以年度贡献。贡献不为正时为无穷大'},
 capexImpliedReserve:{kind:'other',en:'total capital spread evenly over the stated life. It is a cross-check, not an input',th:'ทุนทั้งหมดกระจายเท่าๆ กันตลอดอายุที่ระบุ เป็นตัวตรวจไขว้ ไม่ใช่ข้อมูลเข้า',zh:'资本总额在写明的寿命上均摊。这是交叉核对，不是输入'},
 efficiency:{kind:'other',en:'rentable divided by gross, in percent. This is the schedule efficiency, not the plate-split net',th:'พื้นที่ให้เช่าหารด้วยพื้นที่รวม เป็นร้อยละ เป็นประสิทธิภาพในตาราง ไม่ใช่พื้นที่สุทธิจากการแบ่งแผ่นพื้น',zh:'可租面积除以总面积，以百分比表示。这是表上的效率，不是平面划分的净面积'},
 yieldOnCost:{kind:'other',en:'annual contribution divided by gross floor area',th:'รายได้หลังหักสำรองต่อปี หารด้วยพื้นที่รวม',zh:'年度贡献除以总建筑面积'},
 distinctiveness:{kind:'other',en:'form score from taper, twist and corners, on a zero-to-one scale',th:'คะแนนรูปทรงจากความเรียว การบิด และมุม บนมาตราส่วนศูนย์ถึงหนึ่ง',zh:'由收分、扭转和转角得出的形态分，范围为零到一'},
 convexCorners:{kind:'other',en:'count of convex corners used by that score',th:'จำนวนมุมนูนที่คะแนนนั้นใช้',zh:'该分数所用的凸角个数'},
 clearHeight:{kind:'other',en:'lowest occupied floor-to-floor height minus the services band',th:'ความสูงระหว่างชั้นที่ต่ำสุดของชั้นที่มีพื้นที่ ลบแถบงานระบบ',zh:'有面积楼层中最低的层高减去设备带'},
 daylightDepth:{kind:'other',en:'deepest distance from the core wall to the façade on an occupied plate',th:'ระยะที่ลึกที่สุดจากผนังแกนถึงเปลือกบนแผ่นพื้นที่มีพื้นที่',zh:'有面积楼板上，从核心筒壁到立面的最大进深'},
 skyReach:{kind:'other',en:'daylight reach on the base plate from clear height. It is reported as geometry and is not priced',th:'ระยะที่แสงธรรมชาติถึงบนแผ่นพื้นฐาน จากความสูงใส รายงานเป็นเรขาคณิต ไม่ได้คิดราคา',zh:'由净高得到的基底楼板采光进深。按几何报告，不计价'},
 daylitFraction:{kind:'other',en:'share of the base plate inside that reach',th:'สัดส่วนของแผ่นพื้นฐานที่อยู่ในระยะนั้น',zh:'基底楼板落在该进深内的比例'},
 volume:{kind:'other',en:'enclosed volume of the loft from grade to the roof plate',th:'ปริมาตรภายในของทรงยกสูง จากพื้นดินถึงแผ่นหลังคา',zh:'从地面到屋顶楼板的放样围合体积'},
 structureMultiplier:{kind:'other',en:'column-density multiplier against the reference plate',th:'ตัวคูณความหนาแน่นของเสาเทียบกับแผ่นพื้นอ้างอิง',zh:'相对参考楼板的柱密度系数'},
 columnCount:{kind:'other',en:'interior plus perimeter columns implied by the bay and the plate',th:'เสาภายในบวกเสารอบรูป ที่ระยะช่วงและแผ่นพื้นบอกเป็นนัย',zh:'由柱网和楼板推得的内部柱加周边柱数量'},
 shapeFactor:{kind:'other',en:'the plate’s perimeter-to-area ratio against the reference plate',th:'อัตราส่วนเส้นรอบรูปต่อพื้นที่ของแผ่นพื้น เทียบแผ่นอ้างอิง',zh:'该楼板周长与面积之比，相对参考楼板'},
 'premiums.identity':{kind:'other',en:'identity premium rate from the form score and the façade family',th:'อัตราส่วนเพิ่มอัตลักษณ์จากคะแนนรูปทรงและตระกูลเปลือก',zh:'由形态分和立面类型得出的识别性溢价率'},
 'premiums.columnFree':{kind:'other',en:'column-free premium rate. It is zero unless the structure is column-free',th:'อัตราส่วนเพิ่มของพื้นที่ไร้เสา เป็นศูนย์ถ้าโครงสร้างไม่ไร้เสา',zh:'无柱溢价率。结构并非无柱时为零'},
 'premiums.height':{kind:'other',en:'clear-height premium rate, applied only above the stated floor-to-floor threshold',th:'อัตราส่วนเพิ่มความสูงใส ใช้เมื่อสูงกว่าเกณฑ์ความสูงชั้นที่ระบุ',zh:'净高溢价率，仅在高于写明的层高门槛时使用'},
 'premiums.lowCeiling':{kind:'other',en:'penalty rate when clear height is below the stated minimum',th:'อัตราหักเมื่อความสูงใสต่ำกว่าขั้นต่ำที่ระบุ',zh:'净高低于写明下限时的折减率'},
 'premiums.depth':{kind:'other',en:'penalty rate when the deepest daylight exceeds the stated tolerance',th:'อัตราหักเมื่อระยะแสงที่ลึกที่สุดเกินค่าที่ยอมรับ',zh:'最大采光进深超过写明容许值时的折减率'},
 'premiums.corner':{kind:'other',en:'corner premium as a fraction of base rent. It is the input rate, not a measured area',th:'ส่วนเพิ่มมุมเป็นสัดส่วนของค่าเช่าฐาน เป็นอัตราที่ป้อน ไม่ใช่พื้นที่ที่วัด',zh:'转角溢价占基础租金的比例。这是输入的费率，不是测得的面积'},
 'breakdown.rentOrdinary':{kind:'other',en:'rentable area times base rent. Base rent is the rent rate times occupancy',th:'พื้นที่ให้เช่าคูณค่าเช่าฐาน ค่าเช่าฐานคืออัตราเช่าคูณอัตราการเช่าอยู่',zh:'可租面积乘以基础租金。基础租金是租金单价乘以出租率'},
 'breakdown.rentCorner':{kind:'other',en:'corner area times base rent times the corner premium',th:'พื้นที่มุมคูณค่าเช่าฐานคูณส่วนเพิ่มมุม',zh:'转角面积乘以基础租金再乘以转角溢价'},
 'breakdown.rentIdentity':{kind:'other',en:'rentable area times base rent times the identity rate',th:'พื้นที่ให้เช่าคูณค่าเช่าฐานคูณอัตราอัตลักษณ์',zh:'可租面积乘以基础租金再乘以识别性费率'},
 'breakdown.rentColumnFree':{kind:'other',en:'rentable area times base rent times the column-free rate',th:'พื้นที่ให้เช่าคูณค่าเช่าฐานคูณอัตราไร้เสา',zh:'可租面积乘以基础租金再乘以无柱费率'},
 'breakdown.rentHeight':{kind:'other',en:'rentable area times base rent times the clear-height rate',th:'พื้นที่ให้เช่าคูณค่าเช่าฐานคูณอัตราความสูงใส',zh:'可租面积乘以基础租金再乘以净高费率'},
 'breakdown.rentPenalty':{kind:'other',en:'rentable area times base rent times the low-ceiling and depth penalties. The rent total subtracts this',th:'พื้นที่ให้เช่าคูณค่าเช่าฐานคูณบทลงโทษเพดานต่ำและระยะลึก ค่าเช่ารวมหักตัวเลขนี้',zh:'可租面积乘以基础租金再乘以低净高与进深折减。租金合计减去此项'},
 heightHeadroom:{kind:'other',en:'height allowance minus tower height, crown included',th:'เพดานความสูงลบความสูงอาคาร รวมยอด',zh:'高度限额减去含塔冠的建筑高度'},
 valid:{kind:'other',en:'true only when the core, site, height and area checks all pass',th:'เป็นจริงเมื่อการตรวจแกน ที่ตั้ง ความสูง และพื้นที่ผ่านทั้งหมด',zh:'仅当核心筒、场地、高度和面积检查都通过时为真'},
 reasons:{kind:'other',en:'the named checks that failed: core, site, height or area. An empty list means the form passed',th:'การตรวจที่ระบุชื่อแล้วไม่ผ่าน ได้แก่ แกน ที่ตั้ง ความสูง หรือพื้นที่ รายการว่างหมายความว่ารูปทรงผ่าน',zh:'未通过的已命名检查：核心筒、场地、高度或面积。空列表表示形态通过'}
};

function noteFor(key,lang){
 const row=CLAUSE[key];
 if(!row)throw new Error('missing how-measured note: '+key);
 const tail=(row.kind==='area'?AREA_TAIL:OTHER_TAIL)[lang];
 const body=row[lang];
 if(lang==='en')return 'Measured as '+body+'.'+tail;
 if(lang==='th')return 'วัดเป็น'+body+'.'+tail;
 return '测量为'+body+'。'+tail;
}

export function howMeasured(metrics,lang='en'){
 const L=langOf(lang);
 const out={};
 for(const [key,value] of Object.entries(metrics)){
  if(value&&typeof value==='object'&&!Array.isArray(value)){
   out[key]={};
   for(const sub of Object.keys(value))out[key][sub]=noteFor(key+'.'+sub,L);
  }else out[key]=noteFor(key,L);
 }
 return out;
}
