// FormHypes — research section structure
// The prose itself lives in i18n.js so that every language is translated in
// one place. This file is only the order of the argument, plus the two blocks
// that carry data rather than words: the lifted level schedule and the table
// that maps each 2006 idea to where it lives now.

/** Chen's stored Petronas schedule, Appendix B `countLevel2`. Verbatim. */
export const PETRONAS_ARRAY=
'countLevel2 = Array(5500,5500,5500,5500,5500,4100,4100,4100,4100,4100,4100,4100,\n'+
'                4100,4100,4100,4100,4100,4100,4100,4100,4100,4100,4100,4100,4100,\n'+
'                4100,4100,4100,4100,4100,4100,4100,4100,4100,4100,4505,3900,3900,\n'+
'                4350,4100,4100,4350,4100,4100,4100,4100,4100,4100,4100,4100,4100,\n'+
'                4100,4100,4100,4100,4100,4100,4100,4100,4100)';

/** The map: one idea from 2006, where it lives now, which control holds it. */
export const MOVED=[
 ['r.moved.1.0','r.moved.1.1','r.moved.1.2'],
 ['r.moved.2.0','r.moved.2.1','r.moved.2.2'],
 ['r.moved.3.0','r.moved.3.1','r.moved.3.2'],
 ['r.moved.4.0','r.moved.4.1','r.moved.4.2'],
 ['r.moved.5.0','r.moved.5.1','r.moved.5.2'],
 ['r.moved.6.0','r.moved.6.1','r.moved.6.2']
];

export const SECTIONS=[
 {kind:'head',key:'r.ch1.h',body:'r.ch1.b'},
 {kind:'head',key:'r.ch2.h',body:'r.ch2.b'},
 {kind:'head',key:'r.ch3.h',body:'r.ch3.b'},
 {kind:'head',key:'r.ch4.h',body:'r.ch4.b'},
 {kind:'head',key:'r.ch5.h',body:'r.ch5.b'},
 {kind:'head',key:'r.ch6.h',body:'r.ch6.b'},
 {kind:'head',key:'r.code.h',body:'r.code.b',then:{kind:'code',text:PETRONAS_ARRAY},note:'r.code.note'},
 {kind:'head',key:'r.math.h',body:['r.math.b1','r.math.b2','r.math.b3','r.math.b4'],note:'r.math.note'},
 {kind:'head',key:'r.stand.h',body:['r.stand.b1','r.stand.b2','r.stand.b3','r.stand.b4','r.stand.b5'],note:'r.stand.note'},
 {kind:'head',key:'r.trio.h',body:['r.trio.b1','r.trio.b2','r.trio.b3','r.trio.b4','r.trio.b5'],then:[{kind:'cores'},{kind:'trio'}],note:'r.trio.note'},
 {kind:'head',key:'r.grammar.h',body:['r.grammar.b1','r.grammar.b2','r.grammar.b3','r.grammar.b4'],note:'r.grammar.note'},
 {kind:'head',key:'r.petronas.h',body:['r.petronas.b1','r.petronas.b2','r.petronas.b3'],then:{kind:'petronas'}},
 // The Petronas section runs long, so its second half continues under the same
 // heading rather than opening a numbered section of its own.
 {kind:'cont',body:['r.petronas.b4','r.petronas.b5','r.petronas.b6'],note:'r.petronas.note'},
 {kind:'head',key:'r.people.h',body:'r.people.b',then:{kind:'photos'}},
 {kind:'head',key:'r.moved.h',body:'r.moved.sub',then:{kind:'moved'}},
 {kind:'head',key:'r.political.h',body:['r.political.b1','r.political.b2','r.political.b3','r.political.b4'],note:'r.political.note'},
 {kind:'head',key:'r.regime.h',body:'r.regime.b',then:{kind:'regimes'}},
 {kind:'head',key:'r.limits.h',body:'r.limits.b'},
 {kind:'head',key:'r.close.h',body:'r.close.b'}
];

/** The four regimes, shown live from the model rather than restated in prose. */
export const REGIME_ORDER=['yield','competition','civic','speculative'];

/** Headings for the premium bars, so each rent stream is named in every language. */
export const PREMIUM_LABELS={
 ordinary:{'en':'Base rent / all rentable area','th':'ค่าเช่าฐานของพื้นที่ให้เช่าทั้งหมด','zh':'全部可租面积的基础租金'},
 corner:{'en':'Corner premium','th':'พรีเมียมมุม','zh':'转角溢价'},
 identity:{'en':'Identity premium','th':'พรีเมียมอัตลักษณ์','zh':'辨识度溢价'},
 columnFree:{'en':'Column-free plate','th':'พื้นที่ไร้เสา','zh':'无柱楼板'},
 height:{'en':'Clear height premium','th':'พรีเมียมความสูงพื้นถึงเพดาน','zh':'净高溢价'},
 penalty:{'en':'Obsolete stock / dark core','th':'อาคารเก่า / พื้นที่ลึก','zh':'老旧标准 / 暗核心'}
};

export const REGIME_READS={yield:'reads',competition:'reads',civic:'reads',speculative:'reads'};

/** Short labels for the model tables inside the research tab. */
export const RESEARCH_T={
 familyHead:{'en':'Floor profile family','th':'ตระกูลรูปพื้นชั้น','zh':'平面轮廓族'},
 contributionHead:{'en':'Contribution at equal floor area','th':'ส่งนอกสุทธิเมื่อพื้นที่เท่ากัน','zh':'等面积下的贡献'},
 cornersHead:{'en':'Corner offices','th':'ออฟฟิศมุม','zh':'转角办公'},
 distinctHead:{'en':'Distinctiveness','th':'ความมีเอกลักษณ์','zh':'独特性'},
 verdictHead:{'en':'What it means','th':'ความหมาย','zh':'含义'},
 equalAreaNote:{'en':'All five are resized to the same gross floor area. The differences are the form, not the size.','th':'ทั้งห้าถูกปรับขนาดให้พื้นที่รวมเท่ากัน ความต่างคือรูปทรง ไม่ใช่ขนาด','zh':'五种都被调整到相同总面积。差别在于形体，而不在于规模。'},

 /* The Petronas plate. Every figure here is read off the kernel at render time
    rather than typed in, so the copy cannot drift from the code. */
 rubHead:{'en':'Rub el Hizb against an area-matched slab','th':'Rub el Hizb เทียบกับสี่เหลี่ยมพื้นที่เท่ากัน','zh':'鲁布·希兹布与等面积板楼对照'},
 liveTag:{'en':'computed live','th':'คำนวณสด','zh':'实时计算'},
 rows:{
  area:{'en':'Floor area','th':'พื้นที่ชั้น','zh':'楼层面积'},
  perim:{'en':'Perimeter','th':'เส้นรอบ','zh':'周长'},
  shape:{'en':'Shape factor P/A','th':'ตัวประกอบรูป P/A','zh':'形状系数 P/A'},
  daylit:{'en':'Plate within sky reach','th':'ผังที่อยู่ในระยะรับแสง','zh':'落在有效采光范围内的楼板'},
  frame:{'en':'Frame cost vs reference','th':'ต้นทุนโครงสร้างเทียบเกณฑ์','zh':'结构成本相对基准'},
  corners:{'en':'Qualifying corner offices','th':'ออฟฟิศมุมที่ผ่านเกณฑ์','zh':'合格转角办公'},
  convex:{'en':'Convex plate','th':'ผังนูน','zh':'凸形楼板'},
  vertices:{'en':'Vertices','th':'จุดยอด','zh':'顶点数'},
  edge:{'en':'Length of each edge','th':'ความยาวของแต่ละด้าน','zh':'每条边的长度'},
  points:{'en':'Interior angle: point / valley','th':'มุมภายใน ยอด / รอยเว้า','zh':'内角：尖角 / 凹角'},
  real:{'en':'Real tower, average floor','th':'ตึกจริง พื้นที่ชั้นเฉลี่ย','zh':'真实大楼，平均楼层'},
  realFloor:{'en':'archnet: 218,000 m² ÷ 88 storeys','th':'archnet 218,000 ตร.ม. ÷ 88 ชั้น','zh':'archnet：218,000 m² ÷ 88 层'},
  edge48:{'en':'10.8 m at a 48 m half-width — under the 12 m two-frontage test','th':'10.8 ม. ที่ครึ่งความกว้าง 48 ม. ต่ำกว่าเกณฑ์ 12 ม. สองหน้า','zh':'半宽 48 m 时为 10.8 m——低于 12 m 双面临街门槛'},
  ratio:{'en':'Inner ÷ outer radius','th':'รัศมีใน ÷ รัศมีนอก','zh':'内半径 ÷ 外半径'},
  closedArea:{'en':'Raw area = 2 − √2','th':'พื้นที่ดิบ = 2 − √2','zh':'原始面积 = 2 − √2'},
  closedEdge:{'en':'Edge = (√2 − 1) ÷ 2','th':'ด้าน = (√2 − 1) ÷ 2','zh':'边长 = (√2 − 1) ÷ 2'}
 },
 rubCap:{'en':'<b>Rub el Hizb</b> — Pelli, 1993. Two concentric squares, one turned 45°. Same kernel, same 1,581 m² plate.','th':'<b>Rub el Hizb</b> — Pelli, 2536 (1993) สี่เหลี่ยมสองอันที่ร่วมศูนย์ อันหนึ่งหมุน 45 องศา เคอร์เนลเดียวกัน พื้นที่เท่ากันที่ 1,581 ตร.ม.','zh':'<b>鲁布·希兹布</b>——Pelli，1993。两个同心正方形，一个转 45°。同一个内核，同一块 1,581 m² 的楼板。'},
 slabCap:{'en':'<b>Rectilinear slab</b> — the same floor area as a plain rectangle.','th':'<b>สี่เหลี่ยมผืนผ้า</b> — พื้นที่เท่ากันเป็นสี่เหลี่ยมธรรมดา','zh':'<b>矩形板楼</b>——作为对照的普通矩形，面积完全相同。'},

 /* The three-tower comparison. Labels for a plate drawn at one common scale,
    so the plans can be read against each other rather than admired one by one. */
 trioHead:{'en':'Three floor plates at one common scale. A corner counts only where two exposures meet.','th':'ผังชั้นสามแบบที่สเกลเดียวกัน นับเป็นมุมเฉพาะตรงที่มีหน้าต่างสองด้านมาบรรจบกัน','zh':'三种楼板，同一比例尺。只有两个临界面相交处才计为转角。'},
 trioPlateHead:{'en':'How many rentable corners does the rule leave you?','th':'กฎนี้เหลือมุมที่ให้เช่าได้ให้คุณกี่มุม','zh':'这条规则给你留下几个可出租的转角？'},
 trioCore:{'en':'Core / service','th':'แกนกลาง / บริการ','zh':'核心筒 / 设备'},
 trioCorners:{'en':'Rentable corners','th':'มุมที่ให้เช่าได้','zh':'可出租转角'},
 trioRentable:{'en':'Rentable floor area','th':'พื้นที่ให้เช่า','zh':'可租面积'},
 trioSystem:{'en':'Structure','th':'โครงสร้าง','zh':'结构体系'},
 trioWidth:{'en':'Plate width','th':'ความกว้างผัง','zh':'楼板宽度'},
 trioDerived:{'en':'derived from the cited dimensions','th':'คำนวณจากขนาดที่อ้างอิง','zh':'由所引尺寸推导'},
 trioQuoted:{'en':'as cited','th':'ตามที่อ้างอิง','zh':'按引用'},
 trioSchem:{'en':'plate is schematic','th':'ผังเป็นภาพแผนผัง','zh':'图版为示意'},
 /* The plate's own values. Numbers and units travel untranslated; the words
    around them do not, which is the whole reason these are here and not in code. */
 trioCoreWtc:{'en':'27 × 41 m · 27.9%','th':'27 × 41 ม. · 27.9%','zh':'27 × 41 m · 27.9%'},
 trioCoreWillis:{'en':'22.9 m centre tube','th':'ท่อกลาง 22.9 ม.','zh':'中央管体 22.9 m'},
 trioCorePetronas:{'en':'23% of plan','th':'23% ของผัง','zh':'占平面 23%'},
 trioSysWtc:{'en':'Framed tube','th':'Framed tube','zh':'框架筒'},
 trioSysWillis:{'en':'Bundled tube · nine','th':'Bundled tube · nine','zh':'束筒 · 九管'},
 trioSysPetronas:{'en':'Interlocking squares','th':'Interlocking squares','zh':'咬合正方形'},
 trioVerdict:{'en':'Two of them bought stability and height. One of them changed what a floor plate can be.','th':'สองในสามซื้อความมั่นคงและความสูง ส่วนอีกหนึ่งเปลี่ยนว่าผังชั้นทำอะไรได้','zh':'三者中有两栋买来了稳定与高度。另一栋改变了楼板可以是什么。'},
 trioCapWtc:{'en':'<b>World Trade Center</b>, 1973 — Yamasaki with Worthington, Skilling, Helle &amp; Jackson. A framed tube: 63 m square, 27 × 41 m core, four chamfered corners.','th':'<b>World Trade Center</b>, 1973 — ยามาซากิ ร่วมกับ Worthington, Skilling, Helle &amp; Jackson framed tube สี่เหลี่ยม 63 ม. แกนกลาง 27 × 41 ม. มุมเจ็ดสิบสอง','zh':'<b>世贸中心</b>，1973 —— 雅马沙基与 Worthington, Skilling, Helle &amp; Jackson。框架筒：63 米见方，核心筒 27 × 41 米，四个切角。'},
 trioCapWillis:{'en':'<b>Willis Tower</b> (Sears), 1974 — Graham and Khan at SOM. Nine bundled tubes of 22.9 m in a 3 × 3, 68.6 m overall. In plan the bundle is still a square.','th':'<b>Willis Tower</b> (Sears), 1974 — แกรแฮมและข่านที่ SOM ท่อเก้าท่อขนาด 22.9 ม. เรียง 3 × 3 รวม 68.6 ม. ในผัง มันยังเป็นสี่เหลี่ยมอยู่ดี','zh':'<b>威利斯大厦</b>（西尔斯），1974 —— SOM 的格雷厄姆与汗。九根 22.9 米管体，3 × 3 排布，总宽 68.6 米。在平面上，这个束仍然是一个正方形。'},
 trioCapPetronas:{'en':'<b>Petronas Towers</b>, 1998 — Pelli. Two interlocking squares and eight semicircles, giving eight points rather than four.','th':'<b>Petronas Towers</b>, 1998 — เพลลี สองสี่เหลี่ยมที่สลักกันและครึ่งวงกลมแปดชิ้น ได้ยอดแปดแทนที่จะเป็นสี่','zh':'<b>双子塔</b>，1998 —— Pelli。两个咬合的正方形加八个半圆，得到八个尖角而不是四个。'},


 /* Six ways to hold a tower up, 1893–2017. The taxonomy and the running order are
    after the Los Angeles Times illustration published with the Wilshire Grand
    coverage; every building, address and date below was checked independently
    against the sources in the note. `h` sets the drawn height of the isometric —
    it is a reading aid, not a storey count, and the plate says so. */
 coresHead:{'en':'Six ways to hold a tower up','th':'หกวิธีที่ใช้พยุงตึกไว้','zh':'六种撑起高塔的方式'},
 coresNote:{'en':'The structure migrates inward, then outward again. In 1893 the envelope carried the load, so the envelope was the building. By 1989 the perimeter had become a hollow tube and the core was reduced to a hole in the middle of a floor plate. The last one is the honest admission that a slender core cannot stand alone, so it reaches out and locks the edge of the building to itself. The isometric diagrams are schematic and not to scale.',
            'th':'โครงสร้างย้ายเข้าไปข้างใน แล้วย้ายกลับออกมาอีกครั้ง ปี 1893 เปลือกอาคารรับน้ำหนัก เปลือกจึงคือตึกทั้งตึง พอถึงปี 1989 ขอบตึกกลายเป็นท่อกลวง แกนกลางเหลือเป็นเพียงรูโหว่กลางผังชั้น อันสุดท้ายคือการยอมรับตรง ๆ ว่าแกนกลางที่เรียวเกินไปยืนเองไม่ได้ จึงต้องยื่นออกไปล็อกขอบตึกไว้กับตัวเอง ภาพไอโซเมตริกเป็นภาพแผนผังเชิงหลักการ ไม่ได้ทำตามสัดส่วนจริง',
            'zh':'结构先是向内迁移，然后又向外回来。1893 年，外墙承重，于是外墙就是整栋楼。到 1989 年，周边已成为一根中空的管，核心筒只剩下楼板中间的一个洞。最后一个则是坦白：纤细的核心筒站不住，只好伸出去，把建筑的边缘锁在自己身上。等轴示意图为示意，不按比例。'},
 coresPlan:{'en':'plan below','th':'ผังด้านล่าง','zh':'下方为平面'},
 coresOutr:{'en':'30 outriggers','th':'outrigger 30 ต้น','zh':'30 道外伸桁架'},
 coresOutrNote:{'en':'Wilshire Grand: thirty outrigger levels on floors 28–31, 53–59 and 70–73, engaging the perimeter columns. Thornton Tomasetti describes a slender core and buckling-restrained braces — steel bars in grout-filled boxes.',
               'th':'Wilshire Grand มี outrigger 30 ระดับ ที่ชั้น 28–31, 53–59 และ 70–73 เชื่อมกับเสารอบนอก Thornton Tomasetti ระบุว่าแกนกลางเรียวและใช้ buckling restrained brace คือแท่งเหล็กในกล่องที่เทล็บกรอต',
               'zh':'Wilshire Grand 有 30 个外伸桁架层，位于 28–31、53–59 与 70–73 层，连接周边柱。Thornton Tomasetti 说明其核心筒纤细，采用屈曲约束支撑——灌浆钢箱中的钢棒。'},

 cores:[
  {sys:'Masonry',sysTh:'ผนังก่ออิฐ',sysZh:'砌体承重',
   bld:'Bradbury Building',addr:'304 S. Broadway',year:'1893',h:0.42,kind:'masonry',
   say:{'en':'The envelope carries the load, so the envelope cannot be opened.',
        'th':'เปลือกอาคารรับน้ำหนัก เปลือกจึงเปิดไม่ได้',
        'zh':'外墙承重，于是外墙无法打开。'}},
  {sys:'Moment frame',sysTh:'โครงข้อแข็ง',sysZh:'刚架',
   bld:'Union Bank Plaza',addr:'445 S. Figueroa St.',year:'1968',h:0.66,kind:'frame',
   say:{'en':'The frame carries the load, so the walls are free — but the plan fills with columns.',
        'th':'โครงรับน้ำหนัก กำแพงจึงเป็นอิสระ แต่ผังกลับเต็มไปด้วยเสา',
        'zh':'框架承重，于是墙体自由——但楼板布满了柱子。'}},
  {sys:'Braced core',sysTh:'แกนกลางมีค้ำยัน',sysZh:'支撑核心筒',
   bld:'Aon Center',addr:'707 Wilshire Blvd.',year:'1973',h:0.74,kind:'braced',
   say:{'en':'A central core takes the lateral load, and the plate clears around it.',
        'th':'แกนกลางรับแรงด้านข้าง ผังจึงโล่งออกรอบแกน',
        'zh':'中央核心筒承担侧向荷载，楼板在它周围让开。'}},
  {sys:'Tube system',sysTh:'ระบบท่อ',sysZh:'筒体体系',
   bld:'U.S. Bank Tower',addr:'633 W. 5th St.',year:'1989',h:1.00,kind:'tube',
   say:{'en':'The perimeter becomes the structure. The core is only a hole in the floor.',
        'th':'ขอบตึกกลายเป็นโครงสร้าง แกนกลางเหลือเป็นเพียงรูในผัง',
        'zh':'周边成为结构，核心筒只是楼板上的一个洞。'}},
  {sys:'Concrete core',sysTh:'แกนกลางคอนกรีต',sysZh:'混凝土核心筒',
   bld:'Chase Plaza',addr:'801 S. Grand Ave.',year:'1986',h:0.86,kind:'ccore',
   say:{'en':'A concrete core carries it; the floor is simply what spans to it.',
        'th':'แกนกลางคอนกรีตรับทั้งหมด พื้นชั้นคือสิ่งที่พาดไปถึงมัน',
        'zh':'混凝土核心筒承担全部荷载，楼板只是跨越到它。'}},
  {sys:'Core with outriggers',sysTh:'แกนกลางพร้อม outrigger',sysZh:'带外伸桁架的核心筒',
   bld:'Wilshire Grand',addr:'900 Wilshire Blvd.',year:'2017',h:1.06,kind:'outrigger',
   say:{'en':'A core too slender to stand alone reaches out and locks the perimeter to itself.',
        'th':'แกนกลางที่เรียวจนยืนเองไม่ได้ จึงยื่นออกไปล็อกขอบตึกไว้กับตัวเอง',
        'zh':'纤细到无法独立站立的核心筒，伸出去把周边柱锁在自己身上。'}}
 ],
 /* The photographs. Filenames carry the dates; the captions carry only what
    the frames and those filenames support. */
 photos:[
  ['research/media/office-2023.jpg?v=28b238fe18','r.people.c1'],
  ['research/media/house-2006.jpg?v=0e724b0a54','r.people.c2'],
  ['research/media/lab-0506.jpg?v=da52bf7eee','r.people.c3'],
  ['research/media/lab-0507.jpg?v=98808d23ce','r.people.c4'],
  ['research/media/lab-0508.jpg?v=516243ebdf','r.people.c5']
 ]
};