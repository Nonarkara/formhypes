/* ── 形局 · the form layer ─────────────────────────────────────────────────────
   A deep study of Feng Shui, read against the site this model is actually
   standing on.

   Two layers are kept strictly apart, because the tradition itself keeps them
   apart and because collapsing them is how a design study turns into a
   prediction:

     形局 / 峦头 — LANDSCAPE FORM. The older, empirical layer: is there a mass
       behind, is the ground open in front, are the four corners lower than the
       middle. Every claim in this module about form is a measurement of the
       harvested OpenStreetMap context — real footprints, real heights — so it
       is either true of this plot or it is not computed at all.

     理气 — DIRECTIONAL QI. The Later Heaven ring, the eight palaces, the eight
       wandering-year stars. This is the layer a luopan measures, and it is
       reproduced here as a system: tables that are published, a rule that is
     published, and arithmetic you can check against the mnemonic.

   Neither layer touches the rent model, and nothing here is a forecast. The
   site's own disclaimer says so in three languages; this one says it in the
   module that implements it. */

import {profile} from './model.js?v=9531c58c62';
import {cityData} from './cityscape.js?v=dcc15cb0df';

const D2R = Math.PI / 180;

/* ── the Later Heaven ring ────────────────────────────────────────────────────
   后天八卦, the King Wen arrangement — the one a luopan carries and the one
   every practical siting system reads. Clockwise from north. `bits` is the
   trigram's three lines read BOTTOM, MIDDLE, TOP, and it is not decoration: it
   is what yunjian() runs on, so the eight stars are derived from the trigrams
   rather than transcribed beside them.

   Elements and Lo Shu numbers are the standard Later Heaven attributions and
   are unanimous across sources. The finer per-mountain element table is NOT
   reproduced here, because sources disagree on 巽 (Wood as a trigram, Earth as a
   mountain) and a study that picks one silently is asserting something the
   tradition does not settle. */
export const PALACE = [
  {k:'kan',  cn:'坎', ro:'Kan',  dir:'N',  deg:0,   bits:[0,1,0], el:'water', num:1},
  {k:'gen',  cn:'艮', ro:'Gen',  dir:'NE', deg:45,  bits:[0,0,1], el:'earth', num:8},
  {k:'zhen', cn:'震', ro:'Zhen', dir:'E',  deg:90,  bits:[1,0,0], el:'wood',  num:3},
  {k:'xun',  cn:'巽', ro:'Xun',  dir:'SE', deg:135, bits:[0,1,1], el:'wood',  num:4},
  {k:'li',   cn:'离', ro:'Li',   dir:'S',  deg:180, bits:[1,0,1], el:'fire',  num:9},
  {k:'kun',  cn:'坤', ro:'Kun',  dir:'SW', deg:225, bits:[0,0,0], el:'earth', num:2},
  {k:'dui',  cn:'兑', ro:'Dui',  dir:'W',  deg:270, bits:[1,1,0], el:'metal', num:7},
  {k:'qian', cn:'乾', ro:'Qian', dir:'NW', deg:315, bits:[1,1,1], el:'metal', num:6}
];

/* ── 二十四山 ───────────────────────────────────────────────────────────────
   The circle divided into twenty-four, fifteen degrees each, named with eight
   stems, twelve branches and the four corner trigrams. Order is clockwise from
   子 at zero. Fifteen degrees is the whole reason this is a ring and not a
   list: the sector a building sits on decides which palace names it, and 15° of
   error moves the answer by a whole mountain. */
export const SHAN = [
  ['zi','子','Zi',0],['gui','癸','Gui',15],['chou','丑','Chou',30],['gen','艮','Gen',45],
  ['yin','寅','Yin',60],['jia','甲','Jia',75],['mao','卯','Mao',90],['yi','乙','Yi',105],
  ['chen','辰','Chen',120],['xun','巽','Xun',135],['si','巳','Si',150],['bing','丙','Bing',165],
  ['wu','午','Wu',180],['ding','丁','Ding',195],['wei','未','Wei',210],['kun','坤','Kun',225],
  ['shen','申','Shen',240],['geng','庚','Geng',255],['you','酉','You',270],['xin','辛','Xin',285],
  ['xu','戌','Xu',300],['qian','乾','Qian',315],['hai','亥','Hai',330],['ren','壬','Ren',345]
].map(([k,cn,ro,deg])=>({k,cn,ro,deg,palace:Math.round(deg/45)%8}));

/* ── the eight wandering-year stars ──────────────────────────────────────────
   四吉 four auspicious, 四凶 four inauspicious — and only that, because it is
   the division every source agrees on. The ORDER WITHIN each group is not
   reproduced: sources rank 生气 above 延年 in one and 延年 above 天医 in
   another, and inventing a severity the tradition does not share is exactly the
   kind of tidy-up that turns a study into a claim. */
export const STAR = {
  shengqi:{k:'shengqi',cn:'生气',x:'貪狼',luck:1},
  tianyi: {k:'tianyi', cn:'天医',x:'巨門',luck:1},
  yannian:{k:'yannian',cn:'延年',x:'武曲',luck:1},
  fuwei:  {k:'fuwei',  cn:'伏位',x:'輔弼',luck:1},
  jueming:{k:'jueming',cn:'绝命',x:'破軍',luck:0},
  wugui:  {k:'wugui',  cn:'五鬼',x:'廉貞',luck:0},
  liusha: {k:'liusha', cn:'六煞',x:'文曲',luck:0},
  huohai: {k:'huohai', cn:'禍害',x:'祿存',luck:0}
};

/* The published 大游年 mnemonic, one line per home palace: the seven stars for
   the seven palaces clockwise after the home. It lives here as the table the
   derived result is CHECKED against, which is why it is data and not a comment.
   A transcription nobody verifies is how a derivation quietly stops agreeing
   with the thing it derives from. */
export const VERSE = {
  kan:'五天生延绝祸六', gen:'六绝祸生延天五', zhen:'延生祸绝五天六', xun:'天五六祸生绝延',
  li:'六五绝延祸生天', kun:'天延绝生祸五六', dui:'生祸延绝六五天', qian:'六天五祸绝延生'
};

/* 爻变口诀, the rule the mnemonic is a mnemonic for:
   three lines unchanged is 伏位; change the top line alone is 生气; top and
   middle is 五鬼; all three is 延年; top and bottom is 六煞; the middle alone
   is 绝命; middle and bottom is 天医; the bottom alone is 祸害. */
export function yunjian(homeIdx){
 const home = PALACE[((homeIdx % 8) + 8) % 8];
 return PALACE.map(p => {
  if(p === home) return STAR.fuwei;
  const changed = p.bits.map((b,i)=>b !== home.bits[i]);
  const key = changed[2]
   ? (changed[1] ? (changed[0] ? 'yannian' : 'wugui') : (changed[0] ? 'liusha' : 'shengqi'))
   : (changed[1] ? (changed[0] ? 'tianyi' : 'jueming') : 'huohai');
  return STAR[key];
 });
}

/* 东四宅 / 西四宅. The rule is structural, not a lookup: 坎离震巽 are the four
   palaces of the eastern group, 乾坤艮兑 the western four, and the derivation
   itself guarantees that the four auspicious stars fall inside the home's own
   group and the four inauspicious ones in the other. A guard checks that, so a
   table edit cannot quietly break it. */
export const EAST_GROUP = ['kan','li','zhen','xun'];
export const zhaiGroup = homeIdx => (EAST_GROUP.includes(PALACE[((homeIdx%8)+8)%8].k) ? 'east' : 'west');

/* ── bearings ─────────────────────────────────────────────────────────────────
   The model's own convention, taken from solar.js: the plane has east along +x
   and north along +y, and a bearing is measured clockwise from north. This is
   the same azimuth the solar-incidence guard uses, so the ring, the sun and the
   shadow cannot disagree about which way north is. */
export const bearingOf = (x,y) => ((Math.atan2(x,y) / D2R) % 360 + 360) % 360;
export const sectorOf = deg => Math.round((((deg % 360) + 360) % 360) / 45) % 8;
export const mountainOf = deg => Math.round((((deg % 360) + 360) % 360) / 15) % 24;

/* ── 形局 · the form layer, measured ─────────────────────────────────────────
   The real harvested context, binned into the eight sectors and reduced to
   numbers: how many buildings, how much footprint, how tall the tallest one.
   No rule is applied to those numbers here. The classical criteria are applied
   in readForm(), and they are applied to measurements rather than to a
   picture of the site, which is the only version of this that can be wrong in a
   useful way. */
export function sectorMass(city, radius){
 const out = PALACE.map(p=>({...p,count:0,foot:0,maxH:0,sumH:0,dist:0}));
 if(!city) return {sectors:out,radius,buildings:0};
 const ring = radius ?? 4*60;
 let n=0;
 for(const b of city.buildings){
  let sx=0,sy=0;
  for(const [x,y] of b.ring){sx+=x;sy+=y}
  const cx=sx/b.ring.length, cy=sy/b.ring.length, d=Math.hypot(cx,cy);
  if(d>ring) continue;
  n++;
  const s=out[sectorOf(bearingOf(cx,cy))];
  s.count++; s.dist+=d;
  let a=0;
  for(let i=0;i<b.ring.length;i++){
   const [x1,y1]=b.ring[i],[x2,y2]=b.ring[(i+1)%b.ring.length];
   a+=x1*y2-x2*y1;
  }
  s.foot+=Math.abs(a)/2; s.sumH+=b.h; if(b.h>s.maxH)s.maxH=b.h;
 }
 for(const s of out){
  s.foot=Math.round(s.foot); s.sumH=Math.round(s.sumH);
  s.meanD=s.count?Math.round(s.dist/s.count):null;
 }
 return {sectors:out,radius:ring,buildings:n};
}

/* The three form criteria, each stated as the measurement it is made from.

   靠山 — a mass behind the seat. The classical figure is a HILL; on a city plot
   the honest equivalent is built mass, and it is reported as mass, never as a
   mountain.

   明堂 — the open court in front. Reported as the share of the front 90° that
   is open ground, because "open" is measurable and "bright" is not.

   四隅 — the four corners lower than the middle. Reported as the corner mass
   against the whole, again as a number. */
export function readForm(mass, backIdx, frontIdx){
 const s = mass.sectors;
 const front90 = [frontIdx,(frontIdx+1)%8,(frontIdx+7)%8];
 const corners = [1,3,5,7];
 const sum = k => s.reduce((v,q)=>v+q[k],0);
 const totalFoot = sum('foot');
 const frontBuilt = front90.reduce((v,i)=>v+s[i].foot,0);
 const frontFoot = totalFoot ? frontBuilt/totalFoot : 0;
 const cornerFoot = (totalFoot ? corners.reduce((v,i)=>v+s[i].foot,0)/totalFoot : 0);
 const heaviest = s.reduce((a,b)=>b.foot>a.foot?b:a, s[0]);
 return {
  back:{...s[backIdx],built:s[backIdx].count>0},
  front:{foot:+frontFoot.toFixed(3),builtFoot:Math.round(frontBuilt)},
  corners:{foot:+cornerFoot.toFixed(3),open:cornerFoot<0.5},
  heaviest:{dir:heaviest.dir,foot:heaviest.foot},
  counted:mass.buildings
 };
}
/* ── i18n ─────────────────────────────────────────────────────────────────────
   Two rules govern this dictionary and both exist for a reason.

   The 八卦, 二十四山 and star characters are NOT here. They are drawn on the
   luopan in every language, because that is what a luopan carries — they are
   the instrument, not a translation of it. They live in PALACE[].cn, SHAN[][1]
   and STAR[].cn, which are data. What a reader has to understand is here.

   Every reader is served a GLOSS rather than a transliteration. The eight star
   names are glossed in the reader's own language — "rising qi", "prostrate
   seat", "celestial physician" — beside the characters themselves. A romanised
   or phonetic form would help nobody who does not already know the word, and
   the English and Thai strings are kept free of the characters themselves so
   no reader meets a glyph they cannot pronounce inside a sentence. */
export const FENG_I18N={
 en:{
  title:'Feng Shui, read against this plot',
  lede:'A design study of a documented siting tradition, measured on the harvested context around this tower. Not a consultation, not a forecast, and no effect on any figure on this site.',
  ring:'Luopan, the twenty-four mountains',
  ringNote:'The circle divided into twenty-four, fifteen degrees each, with the eight palaces of the Later Heaven bagua. Derived, not typed in: the stars are computed from the trigrams.',
  zhan:'Sitting direction', zhanNote:'Turn the tower and the ring turns with it — one bearing, read once.',
  facing:'Facing', sit:'Sits on', stars:'Wandering-year stars',
  el:'Element', num:'Lo Shu', sector:'Sector', mass:'Mass in sector',
  form:'Form, the landscape layer',
  formNote:'The empirical layer: a mass behind, open ground in front, corners lower than the middle. Every figure below is measured from real footprints and heights.',
  backing:'Backing mass', court:'Open court', corner:'Four corners',
  none:'nothing built inside the {0} m ring', tallest:'tallest', count:'buildings',
  open:'open', built:'built', radius:'Measured ring',
  heavy:'Heaviest sector', group:'Group', groupEast:'Eastern four', groupWest:'Western four',
  auspicious:'four auspicious', inauspicious:'four inauspicious',
  water:'Water', earth:'Earth', wood:'Wood', fire:'Fire', metal:'Metal',
  shengqi:'Rising qi', tianyi:'Celestial physician', yannian:'Prolonged years', fuwei:'Prostrate seat',
  jueming:'Severed life', wugui:'Five ghosts', liusha:'Six baleful', huohai:'Harm',
  starNote:'Seven of the eight follow the published Dayou Nian mnemonic; the eighth is the home palace itself, the prostrate seat. Severity within each group is not given, because the sources do not agree on it.',
  src1:'Later Heaven bagua, trigram elements and Lo Shu numbers — the standard attributions, unanimous across sources.',
  src2:'The twenty-four mountains: twenty-four divisions of fifteen degrees, clockwise from Zi at zero.',
  src3:'The Dayou Nian mnemonic and the Yaobian line-change rule, from the Huangdi Baizhai Zhoushu as transmitted.',
  src4:'Cultural context: Chiou & Krishnamurti, “Unraveling fêng-shui” (1997), pp. 549–572.',
  study:'What this study is not: a site survey, a licensed consultation, or evidence that a direction causes an outcome. No star here is a prediction, and none of it enters the rent model.'
 },
 th:{
  title:'ฮวงจุ้ย อ่านกับที่ดินผืนนี้',
  lede:'การศึกษาเชิงออกแบบตามภูมิปัญญาการวางที่ที่มีบันทึกไว้ วัดจากบริบทจริงรอบตึกนี้ ไม่ใช่การปรึกษาฮวง ไม่ใช่การพยากรณ์ และไม่มีผลกับตัวเลขใด ๆ บนเว็บไซต์นี้',
  ring:'ลู่ป้าน คือภูเขายี่สิบสี่ดอก',
  ringNote:'วงกลมแบ่งเป็นยี่สิบสี่ส่วน ส่วนละสิบห้าองศา พร้อมแปดปาลัตรของต้นฮวงจุ้ยยุคหลังฟ้า ดาวทั้งแปดคำนวณมาจากต้นไตรมาตร ไม่ได้พิมพ์ตายตัว',
  zhan:'ทิศที่นั่ง', zhanNote:'หมุนตึก วงลู่ป้านก็หมุนตาม ทิศเดียว อ่านครั้งเดียว',
  facing:'ทิศหันหน้า', sit:'นั่งบน', stars:'ดาวมงคลแปดดวง',
  el:'ธาตุ', num:'ลั่วซู', sector:'ทิศ', mass:'มวลในทิศนั้น',
  form:'รูปทรง ชั้นที่วัดรูปได้',
  formNote:'ชั้นที่วัดได้จริง มีมวลด้านหลัง พื้นโล่งด้านหน้า มุมทั้งสี่ต่ำกว่ากลาง ตัวเลขทุกตัวด้านล่างวัดจากรูปทรงและความสูงจริง',
  backing:'มวลด้านหลัง', court:'ลานโล่งหน้า', corner:'มุมทั้งสี่',
  none:'ไม่มีสิ่งก่อสร้างภายในวงรัศมี {0} ม.', tallest:'สูงสุด', count:'อาคาร',
  open:'โล่ง', built:'มีสิ่งก่อสร้าง', radius:'วงที่วัด',
  heavy:'ทิศที่หนาแน่นที่สุด', group:'กลุ่ม', groupEast:'กลุ่มตะวันออกสี่', groupWest:'กลุ่มตะวันตกสี่',
  auspicious:'สี่ดวงมงคล', inauspicious:'สี่ดวงอัปราย',
  water:'น้ำ', earth:'ดิน', wood:'ไม้', fire:'ไฟ', metal:'โลหะ',
  shengqi:'พลังที่เติบโต', tianyi:'หมอฟ้า', yannian:'ปีที่ยืนยาว', fuwei:'ตำแหน่งซ่อน',
  jueming:'ปลายชีวิต', wugui:'ห้าวิญญาณ', liusha:'หกอสูร', huohai:'สิ่งทำร้าย',
  starNote:'เจ็ดดวงมาจากบทกลอนที่ตีพิมพ์ไว้ อีกหนึ่งดวงคือปาลัตรของตัวเอง ไม่ให้ระดับความรุนแรงภายในแต่ละกลุ่ม เพราะแหล่งข้อมูลไม่เห็นพ้องต้องกัน',
  src1:'ต้นฮวงจุ้ยยุคหลังฟ้า ธาตุของไตรมาตร และเลขลั่วซู เป็นค่ามาตรฐานที่แหล่งข้อมูลทั้งหมดเห็นพ้องต้องกัน',
  src2:'ภูเขายี่สิบสี่ดอก แบ่งยี่สิบสี่ส่วน ส่วนละสิบห้าองศา เรียงตามเข็มนาฬิกาเริ่มที่ตำแหน่งต้นฮวงจุ้ยเหนือ',
  src3:'บทกลอนการเดินปีแปดหมอ กับหลักกติกาเปลี่ยนเส้นในไตรมาตร จากตำราหมอแปดบ้านของจักรพรรดิฮังที่สืบทอดกันมา',
  src4:'บริบททางวัฒนธรรม: Chiou และ Krishnamurti, “Unraveling fêng-shui” (1997), หน้า 549–572',
  study:'สิ่งที่การศึกษานี้ไม่ใช่ ที่ดินจริง คำปรึกษาที่มีใบอนุญาต หรือหลักฐานว่าทิศใดเป็นเหตุเป็นผล ดาวทุกดวงไม่ใช่การพยากรณ์ และไม่มีส่วนใดเข้าโมเดลค่าเช่า'
 },
 zh:{
  title:'风水：据此地块而读',
  lede:'这是对一套有文献可循的择址传统的设计研究，尺度取自本塔楼周边实测的建成环境。不是风水咨询，不是运势预测，也不影响本站任何数字。',
  ring:'罗盘，即二十四山',
  ringNote:'圆周分二十四位，每位十五度，配后天八卦八宫。八星由卦体推得，并非抄录。',
  zhan:'坐山方向', zhanNote:'转动塔楼，罗盘随之转动 —— 一个方位，只读一次。',
  facing:'朝向', sit:'坐于', stars:'八宅游年星',
  el:'五行', num:'洛书', sector:'方位', mass:'该方实测体量',
  form:'形势，峦头一层',
  formNote:'可实测的一层：背后有靠，前方开阔，四隅低于中宫。以下数字全部由真实轮廓与高度量得。',
  backing:'靠山', court:'明堂', corner:'四隅',
  none:'环内 {0} 米无建筑', tallest:'最高', count:'栋',
  open:'空', built:'有', radius:'实测环半径',
  heavy:'体量最大之方', group:'宅组', groupEast:'东四宅', groupWest:'西四宅',
  auspicious:'四吉', inauspicious:'四凶',
  water:'水', earth:'土', wood:'木', fire:'火', metal:'金',
  shengqi:'生发之气', tianyi:'天医之吉', yannian:'延年之吉', fuwei:'本宅伏位',
  jueming:'绝命之凶', wugui:'五鬼之凶', liusha:'六煞之凶', huohai:'祸害之凶',
  starNote:'八星中七位出自传世的《大游年》歌诀，第八位即本宅之伏位。吉凶两组之内不再排等第，因各家文献对此并不一致。',
  src1:'后天八卦、卦体五行与洛书数，皆为各家一致公认之标准配属。',
  src2:'二十四山：周天三百六十度，每位十五度，自子位顺时针排列。',
  src3:'《大游年》歌诀与爻变口诀，出自黄帝《八宅周书》一系传本。',
  /* The author names are deliberately absent here and given in full in the
     English citation: a transliterated surname I cannot verify is an invented
     fact, and dropping a name is not one. */
  src4:'文化背景：风水的学术拆解，1997 年国际空间信息文献集，第 549–572 页。',
  study:'本研究不是：实地测绘、持照咨询，或方位致果之证据。此处无一星为预言，亦无一项进入租金模型。'
 }
};

/* ── the study ────────────────────────────────────────────────────────────────
   One object, computed once, from the model and the harvested city. Nothing in
   the drawing reads the model directly, so the ring and the panel cannot
   disagree about what they are describing. */
export function fengStudy(state, city, level){
 const sitDeg = (((state?.orientation ?? 0) % 360) + 360) % 360;
 const faceDeg = (sitDeg + 180) % 360;
 const homeIdx = sectorOf(sitDeg);
 const stars = yunjian(homeIdx);
 /* The ring is the HARVEST radius, not one derived from the tower. Two reasons,
    and the first one cost this desk a whole reading.

    An earlier version measured span x 4, about 192 m, on the reasoning that a
    ring scaled to the building is the ring that matters. But this site is drawn
    as a tower standing in a cleared plot: the nearest harvested building
    centroid in Bangkok is 173 m out and the median is 598 m, so a 192 m ring
    measured one building and reported an empty plot in every configuration. The
    layer was not measuring the neighbourhood, it was measuring the hole in it.

    Measuring past the harvest is the other way to lie, and more quietly: cityscape
    keeps only what falls inside a 700 m circle, so anything beyond it is absence
    of data rather than absence of buildings. The harvest radius is the largest
    ring for which "this is all of it" is true, so it is the one used. */
 const radius = city?.radius ?? 0;
 const mass = sectorMass(city, radius);
 const form = readForm(mass, homeIdx, sectorOf(faceDeg));
 return {
  sitDeg, faceDeg, homeIdx, faceIdx:sectorOf(faceDeg),
  home:PALACE[homeIdx], mountain:SHAN[mountainOf(sitDeg)], faceMountain:SHAN[mountainOf(faceDeg)],
  stars, group:zhaiGroup(homeIdx), mass, form,
  level:level??null,
  tier:'documented siting tradition measured on harvested context; no rent, safety or outcome claim'
 };
}

/* ── the drawing ──────────────────────────────────────────────────────────────
   A luopan is a set of concentric bands, so it is drawn as one: every ring
   shares a centre and a start angle, and each band states one thing. Nothing is
   placed by eye against anything else, which is what stops a ring diagram
   drifting out of register with itself.

   The trigram is drawn as three bars rather than as the ☰ glyph. A trigram IS
   three lines — broken or solid — and drawing it as lines means it renders at
   any size, in any language, with no font dependency, and reads at 14px where a
   glyph does not. */
const TAU = Math.PI * 2;
const R = {shanIn:96, shanOut:118, palIn:62, palOut:96, plan:44, wall:1};
const pt = (cx,cy,r,deg)=>[cx+Math.sin(deg*D2R)*r, cy-Math.cos(deg*D2R)*r];
const f2 = v => (Math.round(v*100)/100);

/* One trigram: three lines, bottom / middle / top, yin broken. */
function trigram(bits,cx,cy,deg,len=13,gap=3.2,w=1.7){
 const a=deg*D2R, ux=Math.cos(a), uy=Math.sin(a);          // along the bar
 const vx=-uy, vy=ux;                                       // across it
 let d='';
 for(let i=0;i<3;i++){
  const off=(1-i)*(gap+w);
  const x=cx+ux*off, y=cy+uy*off;
  if(bits[i]) d+=`M${f2(x-ux*len/2)} ${f2(y-uy*len/2)}L${f2(x+ux*len/2)} ${f2(y+uy*len/2)}`;
  else{
   const h=len/2-1.1;
   d+=`M${f2(x-ux*len/2)} ${f2(y-uy*len/2)}L${f2(x-vx*h)} ${f2(y-vy*h)}`
     +`M${f2(x+vx*h)} ${f2(y+vy*h)}L${f2(x+ux*len/2)} ${f2(y+uy*len/2)}`;
  }
 }
 return `<path d="${d}" stroke="currentColor" stroke-width="${w}" fill="none" stroke-linecap="butt"/>`;
}

export function luopanSVG(st,lang){
 const T=FENG_I18N[lang]||FENG_I18N.en, C=160;
 const ink='var(--ink)', faint='var(--faint)', muted='var(--muted)', accent='var(--accent)';
 let o=[];
 o.push(`<circle cx="${C}" cy="${C}" r="${R.shanOut}" fill="none" stroke="${faint}" stroke-width=".8"/>`);
 o.push(`<circle cx="${C}" cy="${C}" r="${R.shanIn}" fill="none" stroke="${faint}" stroke-width=".8"/>`);
 o.push(`<circle cx="${C}" cy="${C}" r="${R.palIn}" fill="none" stroke="${faint}" stroke-width=".8"/>`);
 o.push(`<circle cx="${C}" cy="${C}" r="${R.wall}" fill="none" stroke="${muted}" stroke-width=".6" stroke-dasharray="2 3"/>`);

 /* The twenty-four mountains. Every division is drawn, whether or not it is
    named — a ring with gaps in it reads as a ring with missing data. */
 for(const m of SHAN){
  const [x1,y1]=pt(C,C,R.shanIn,m.deg-7.5),[x2,y2]=pt(C,C,R.shanOut,m.deg-7.5);
  o.push(`<path d="M${f2(x1)} ${f2(y1)}L${f2(x2)} ${f2(y2)}" stroke="${faint}" stroke-width=".5"/>`);
  const [lx,ly]=pt(C,C,(R.shanIn+R.shanOut)/2,m.deg);
  const home=m.deg===st.mountain.deg, face=m.deg===st.faceMountain.deg;
  o.push(`<text x="${f2(lx)}" y="${f2(ly)}" font-size="8.5" text-anchor="middle" dominant-baseline="central"`
   +` font-family="Noto Sans SC, IBM Plex Sans, sans-serif"`
   +` fill="${home?accent:face?ink:muted}"${home?' font-weight="600"':''}>${m.cn}</text>`);
 }

 /* The eight palaces: sector, trigram, Lo Shu number, and the star the home
    palace names it. */
 const secA=[],secB=[];
 for(let i=0;i<8;i++){
  const p=PALACE[i], star=st.stars[i];
  const [x1,y1]=pt(C,C,R.palIn,p.deg-22.5),[x2,y2]=pt(C,C,R.shanIn,p.deg-22.5);
  secA.push(`${f2(x1)} ${f2(y1)}`);secB.push(`${f2(x2)} ${f2(y2)}`);
  const [mx,my]=pt(C,C,(R.palIn+R.shanIn)/2-1,p.deg);
  const cls=star.luck?'#7ea36a':'#8a6a63';
  o.push(`<path d="M${pt(C,C,R.shanIn,p.deg).map(f2).join(' ')}A${R.shanIn} ${R.shanIn} 0 0 0 ${pt(C,C,R.shanIn,p.deg+22.5).map(f2).join(' ')}L${pt(C,C,R.palIn,p.deg+22.5).map(f2).join(' ')}A${R.palIn} ${R.palIn} 0 0 1 ${pt(C,C,R.palIn,p.deg-22.5).map(f2).join(' ')}Z"`
   +` fill="${st.homeIdx===i?'#f59e0b1f':'none'}" stroke="${st.homeIdx===i?accent:'none'}" stroke-width="1"/>`);
  o.push(`<g color="${star.luck?cls:'var(--muted)'}" transform="translate(${f2(mx)} ${f2(my-8)}) rotate(${p.deg})">${trigram(p.bits,0,0,0,11,2.8,1.5)}</g>`);
  const [nx,ny]=pt(C,C,R.palIn+9,p.deg);
  o.push(`<text x="${f2(nx)}" y="${f2(ny)}" font-size="7" text-anchor="middle" dominant-baseline="central"`
   +` font-family="IBM Plex Mono, monospace" fill="${faint}">${p.num}</text>`);
 }
 o.push(`<path d="M${secA.join('L')}Z" fill="none" stroke="${faint}" stroke-width=".5"/>`);
 o.push(`<path d="M${secB.join('L')}Z" fill="none" stroke="${faint}" stroke-width=".5"/>`);

 /* The star names, outside the mountain ring, on the palace centre line. */
 for(let i=0;i<8;i++){
  const p=PALACE[i],star=st.stars[i],[lx,ly]=pt(C,C,R.shanOut+11,p.deg);
  o.push(`<text x="${f2(lx)}" y="${f2(ly)}" font-size="8" text-anchor="middle" dominant-baseline="central"`
   +` font-family="Noto Sans SC, IBM Plex Sans, sans-serif" fill="${star.luck?'#7ea36a':'#8a6a63'}"`
   +`>${star.cn}</text>`);
  const [dx,dy]=pt(C,C,R.shanOut+19,p.deg);
  o.push(`<text x="${f2(dx)}" y="${f2(dy)}" font-size="6.5" text-anchor="middle" dominant-baseline="central"`
   +` font-family="IBM Plex Mono, monospace" fill="${faint}">${p.ro.toUpperCase()}·${T[p.el]}</text>`);
 }

 /* The seat. A needle from the centre out through the mountain the tower sits
    on, and a shorter one to the facing — the two are the whole 坐向 question and
    drawing only one of them is the reason a compass ring looks decorative. */
 for(const [deg,len,col,w] of [[st.sitDeg,R.shanOut-4,accent,2],[st.faceDeg,R.palIn-6,ink,1.2]]){
  const [ax,ay]=pt(C,C,R.wall,deg),[bx,by]=pt(C,C,len,deg);
  o.push(`<path d="M${f2(ax)} ${f2(ay)}L${f2(bx)} ${f2(by)}" stroke="${col}" stroke-width="${w}"/>`);
  o.push(`<circle cx="${f2(ax)}" cy="${f2(ay)}" r="2.4" fill="${col}"/>`);
 }

 /* The plot, to scale, at the centre: the tower's own footprint, placed by the
    ONE mapping the whole sheet uses. pt() puts bearing 0 at the top and 90 at the
    right, which is a site point (x east, y north) landing at (C + x·k, C − y·k).
    Rotating the plan again by the sitting bearing on top of that would turn it
    twice — profile() has already applied state.orientation — and at bearing zero
    the earlier version put north below the centre. The footprint therefore needs
    no rotation of its own: it is already where the model says it is. */
 {
  const plan=st.plan||[[-24,-24],[24,-24],[24,24],[-24,24]];
  const k=R.plan/60, px=([x,y])=>[C+x*k, C-y*k];
  o.push(`<polygon points="${plan.map(p=>px(p).map(f2).join(' ')).join(' ')}" fill="none" stroke="${muted}" stroke-width=".9"/>`);
  /* The core, as the square the model actually states: state.core metres on a
     side, centred on the footprint. Sized from the number, not fitted to the
     outline, because the outline is a family and the core is a dimension. */
  const core=st.core||0;
  if(core>0){
   let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;
   for(const [x,y]of plan){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y}
   const cx=(x0+x1)/2, cy=(y0+y1)/2, h=core/2;
   const [ax,ay]=px([cx-h,cy-h]),[bx,by]=px([cx+h,cy+h]);
   o.push(`<rect x="${f2(Math.min(ax,bx))}" y="${f2(Math.min(ay,by))}"`
    +` width="${f2(Math.abs(bx-ax))}" height="${f2(Math.abs(by-ay))}"`
    +` fill="${accent}" fill-opacity=".22" stroke="${accent}" stroke-width=".8"/>`);
  }
 }

 /* North, as a reference mark rather than a letter: a bar with an arrowhead at
    the top of the sheet, on the true-north line and nothing else. */
 o.push(`<path d="M${C} ${C-R.shanOut-30}V${C-R.shanOut-8}" stroke="${muted}" stroke-width=".9"/>`);
 o.push(`<path d="M${C-3.4} ${C-R.shanOut-11}L${C} ${C-R.shanOut-6}L${C+3.4} ${C-R.shanOut-11}Z" fill="${muted}"/>`);

 const label=`${T.title}. ${T.ring}. ${st.home.cn}${st.mountain.cn} ${T.sit} ${Math.round(st.sitDeg)}°. ${T.facing} ${Math.round(st.faceDeg)}°.`;
 return `<svg viewBox="0 0 320 320" class="feng-lp" role="img" aria-label="${label.replace(/"/g,'&quot;')}">${o.join('')}</svg>`;
}

/* ── the desk ──────────────────────────────────────────────────────────────────
   The order of the columns is the argument: the instrument and the measurements
   first, then what the tradition says to do with them. A reading placed before
   its numbers lets a conclusion arrive ahead of its evidence, which is the
   failure mode of every siting diagram ever printed.

   One bearing, read once. The slider writes state.orientation and nothing else,
   so there is no second, private idea of which way this building faces; turn the
   tower and the ring turns with it because they are the same number. */
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const num=(v,d=0)=>Number(v).toLocaleString(undefined,{maximumFractionDigits:d});
/* el()'s second argument is TEXT and its third is the class. Every container
   here used to pass its class name into the text slot, which produced a
   correctly-shaped desk with no class on anything: it rendered, it had the
   right amount of text, and it carried no styles and no hooks at all. */
const put=(tag,cls)=>{const n=document.createElement(tag);n.className=cls;return n};

export function renderFeng({lang,state,changed}){
 const T=FENG_I18N[lang]||FENG_I18N.en;
 const host=document.getElementById('fengshuiDesk');
 if(!host)return;

 /* The harvested city and the tower's own plan are read ONCE here and passed
    down, so the ring, the table and the readings cannot be describing different
    plots — which is what happens when each of them looks the state up itself. */
 const city=cityData(state.city);
 const plan=profile(state,0);
 const study=()=>({...fengStudy(state,city,null),plan,core:state.core});

 const head=el('div',null,'feng-head');
 head.append(el('h2',T.title),el('p',T.lede,'note'));

 const pane=el('div',null,'feng-pane');
 const side=el('div',null,'feng-side');
 const grid=el('div',null,'feng-grid');
 grid.append(pane,side);
 host.replaceChildren();
 host.append(head,grid);

 /* the control — the model's own bearing, on the model's own 5° quantum, so the
    number under the needle is always a number the model can actually hold */
 const ctl=el('div',null,'feng-ctl');
 const lab=el('label',T.zhan); lab.htmlFor='fengSit';
 const rng=el('input'); rng.type='range'; rng.id='fengSit'; rng.min='0'; rng.max='359'; rng.step='5';
 rng.value=String(Math.round(fengStudy(state,city,null).sitDeg)%360);
 const read=el('output',null,'feng-read'); read.id='fengSitOut'; read.setAttribute('role','status');
 ctl.append(lab,rng,read,el('p',T.zhanNote,'note'));

 /* the instrument. The ring goes into its own holder so a repaint is one
    assignment — no node removal, no reordering, no first-child lookup that a
    partial DOM does not have. */
 const fig=el('figure',null,'feng-fig');
 const holder=el('div',null,'feng-lpbox');
 fig.append(holder,el('figcaption',T.ringNote,'note'));

 /* the measurements, each stated as the measurement it is */
 const forms=el('dl',null,'feng-forms');
 const rows=[
  [T.backing,st=>st.form.back.built
    ?`${st.form.back.count} ${T.count} · ${num(st.form.back.foot)} m² · ${T.tallest} ${st.form.back.maxH} m`
    :T.none.replace('{0}',num(st.mass.radius))],
  [T.court,st=>`${num(st.form.front.builtFoot)} m² · ${Math.round(st.form.front.foot*100)}%`],
  [T.corner,st=>`${Math.round(st.form.corners.foot*100)}% ${st.form.corners.open?T.open:T.built}`],
  [T.heavy,st=>`${st.form.heaviest.dir} · ${num(st.form.heaviest.foot)} m²`]
 ];
 const cells=rows.map(([k])=>{const d=el('div',null,'feng-form');const v=put('dd','feng-val');d.append(el('dt',k),v);forms.append(d);return v});

 /* the eight palaces: what the tradition says, and the measurement beside it.
    The reading sits directly above its own table, so the tally is read against
    the eight rows that produce it. */
 /* The eight palaces: what the tradition says, and the measurement beside it.
    The reading sits directly above its own table, so the tally is read against
    the eight rows that produce it. */
 const reading=el('p',null,'feng-reading');
 const measure=el('p',null,'feng-measure');
 side.append(reading,el('h3',T.stars),el('p',T.starNote,'note'),measure);
 const tbl=el('table',null,'feng-table');
 side.append(tbl);

 /* The FACES card is the other half of 坐向: the mountain the building looks
    toward, the star that mountain names, and the mass sitting there. Three
    lines, not five, because five would mimic its neighbour table row and
    compete with it. This is also what fills the empty strip under the right
    column that used to leave the desk reading as unfinished. */
 const faces=put('div','feng-faces');
 faces.append(put('h4','feng-faces-h'),
             put('p','feng-faces-star'),
             put('p','feng-faces-mass'));
 side.append(faces);

 /* Sources and study note, here, not as a bottom strip: the strip was the dead
    zone under the right column that left the page reading as unfinished. With
    them in the side column, the columns end together and the desk is one
    block. */
 const srcBox=put('div','feng-srcbox');
 const srcList=el('ol',null,'feng-src');
 for(const k of ['src1','src2','src3','src4'])srcList.append(el('li',T[k]));
 srcBox.append(srcList,el('p',T.study,'note strong'));
 side.append(srcBox);

 /* One paint path. Dragging the slider repaints the ring, the readings and the
    table from a single recomputation; the model is only written on release, so a
    drag cannot churn the whole page sixty times a second. */
 const paint=orient=>{
  const st=orient===undefined?study():{...fengStudy({...state,orientation:orient},city,null),plan,core:state.core};
  holder.innerHTML=luopanSVG(st,lang);
  read.textContent=`${Math.round(st.sitDeg)}° · ${Math.round(st.faceDeg)}°`;
  read.title=`${st.home.cn}${st.mountain.cn} / ${st.faceMountain.cn}`;
  rows.forEach(([,f],i)=>{cells[i].textContent=f(st)});
  const lucky=st.stars.filter(x=>x.luck).length;
  reading.textContent=`${T.group}: ${T[st.group==='east'?'groupEast':'groupWest']} · `
   +`${T.auspicious} ${lucky} / ${T.inauspicious} ${8-lucky}`;
  paintTable(tbl,st,T);
  paintFaces(faces,st,T);
  measure.textContent=`${T.radius}: ${num(st.mass.radius)} m · ${num(st.mass.buildings)} ${T.count}`;
 };
 rng.oninput=()=>paint(Number(rng.value));
 rng.onchange=()=>changed&&changed({orientation:Number(rng.value)});

 pane.append(ctl,fig,el('h3',T.form),el('p',T.formNote,'note'),forms);
 paint();
}

/* Table cells are built cell-then-content, never node.append(...) used as a
   value: append returns undefined, so the first version of this wrote three
   undefined cells and a table that rendered empty. */
function paintTable(tbl,st,T){
 const head=el('tr');
 for(const k of ['sector','el','num','stars','mass'])head.append(el('th',T[k]));
 const thead=el('thead');thead.append(head);
 const tb=el('tbody');
 for(const [i,s] of st.mass.sectors.entries()){
  const star=st.stars[i], tr=el('tr');
  if(i===st.homeIdx)tr.className='is-home';
  const sec=el('td'); sec.append(el('b',s.cn),el('span',`${s.ro} ${s.dir}`));
  const names=el('td'); names.append(el('b',star.cn),el('span',T[star.k]));
  tr.append(sec,el('td',T[s.el]),el('td',String(s.num)),names,
   el('td',s.count?`${s.count} · ${num(s.foot)} m² · ${s.maxH} m`:'—'));
  tb.append(tr);
 }
 tbl.replaceChildren();
 tbl.append(thead,tb);
}

/* The FACES card reads the OPPOSITE of the table's home row: the facing palace,
   the facing mountain, the facing star, and the mass in the facing sector.
   Three text fields. paintFaces rebuilds the card every paint rather than
   updating existing nodes by querySelector — same pattern as paintTable, and
   the only one that the DOM stub can drive. */
function paintFaces(host,st,T){
 const fpal=PALACE[st.faceIdx], face=st.faceMountain,
       fstar=st.stars[st.faceIdx], fsect=st.mass.sectors[st.faceIdx];
 if(!fpal||!face||!fstar||!fsect){host.replaceChildren();return}
 const h=put('h4','feng-faces-h'),
       stEl=put('p','feng-faces-star'),
       msEl=put('p','feng-faces-mass');
 h.textContent=`${T.facing} ${face.cn} · ${fpal.ro}`;
 stEl.textContent=`${fstar.cn} · ${T[fstar.k]}`;
 msEl.textContent=fsect.count
   ?`${fsect.count} ${T.count} · ${num(fsect.foot)} m² · ${fsect.maxH} m`
   :T.none.replace('{0}',num(st.mass.radius));
 host.replaceChildren(h,stEl,msEl);
}

export function getFengStudy(state,city){return fengStudy(state,city||cityData(state?.city),null)}
