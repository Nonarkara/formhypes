// Context desk — put the model on a real plot and count what its shadow does.
// The four replaced buildings and their published figures are real and are
// quoted as given. Every neighbouring block below is contextual massing composed
// for this study: not surveyed, every height indicative. Both facts are printed
// on screen, not merely held here.
import {profile, area, stackHeight} from './model.js?v=83bfd6e335';
import {cities, solarDefaults, solarPosition, studyDay, incidence, facadeExposure} from './solar.js?v=76931110a7';

// Empire Tower 58F / 227 m / 1999, floor plate ≈3,000 m² and a 2.60 m Grade A
// clear-height benchmark for Bangkok; Dayabumi Complex 35F / 157 m / 1984;
// Wisma 46 46F / 261.9 m / 1996; Landmark 81 81F / 461.3 m. KL and Jakarta carry
// the buildings' own coordinates; Bangkok has an approximate site centroid and Ho
// Chi Minh City has only the solar set's city reference — hence the coord kinds.
export const SITES={
 bangkok:{floors:58,height:227,plate:3000,coord:'approx',lat:13.72032,lon:100.53031,
  neighbours:[{b:12,d:95,w:40,h:46},{b:68,d:130,w:55,h:62},{b:155,d:160,w:48,h:38},{b:214,d:110,w:36,h:27},{b:262,d:185,w:70,h:88},{b:318,d:145,w:44,h:55}]},
 kl:{floors:35,height:157,plate:0,coord:'approx',lat:3.144944,lon:101.693806,
  neighbours:[{b:35,d:78,w:34,h:19},{b:92,d:112,w:46,h:26},{b:148,d:96,w:28,h:15},{b:205,d:140,w:52,h:34},{b:250,d:172,w:60,h:48},{b:305,d:104,w:38,h:22}]},
 jakarta:{floors:46,height:261.9,plate:0,coord:'approx',lat:-6.20361,lon:106.82,
  neighbours:[{b:24,d:118,w:44,h:132},{b:79,d:156,w:52,h:168},{b:142,d:132,w:40,h:96},{b:201,d:175,w:58,h:205},{b:258,d:146,w:46,h:118},{b:311,d:124,w:42,h:84}]},
 hcmc:{floors:81,height:461.2,plate:0,coord:'approx',lat:10.795,lon:106.7219,
  neighbours:[{b:41,d:152,w:46,h:126},{b:96,d:198,w:56,h:158},{b:151,d:164,w:44,h:92},{b:208,d:186,w:60,h:142},{b:266,d:224,w:64,h:176},{b:322,d:158,w:48,h:108}]}
};
Object.assign(SITES.bangkok,{"bld": "Empire Tower", "addr": "1 South Sathorn Road, Bangkok", "source": "https://www.skyscrapercenter.com/building/empire-tower/1157", "sourceNote": "58 floors: AWC owner fact sheet; 227 m: CTBUH. 3,000 m² reference plate is an illustrative assumption, not a verified typical floor."});
Object.assign(SITES.kl,{"bld": "Dayabumi Complex", "addr": "Jalan Sultan Hishamuddin, Kuala Lumpur", "source": "https://www.klcc.com.my/downloads/interactive_ar2024.pdf", "sourceNote": "Owner lists 36 storeys; historical studies count 35. 157 m: IIUM ICoPFM 2011 case study."});
Object.assign(SITES.jakarta,{"bld": "Wisma 46", "addr": "Jenderal Sudirman Street, Plot 1, Jakarta", "source": "https://www.skyscrapercenter.com/jakarta/wisma-46/880", "sourceNote": "261.9 m, 46 above-ground floors: CTBUH. Owner rounds height to 262 m and describes 50 total storeys."});
Object.assign(SITES.hcmc,{"bld": "Landmark 81", "addr": "720A Điện Biên Phủ, Ho Chi Minh City", "source": "https://s3.us-east-1.amazonaws.com/cloud.ctbuh.org/shop/DataHandbook_2023.pdf", "sourceNote": "461.2 m, 81 floors: CTBUH Data Handbook 2023. Arup rounds height to 461 m."});
SITES.kl.floors=36;
export const CONTEXT_SITES=SITES;
const ORDER=['bangkok','kl','jakarta','hcmc'];
const SUFFIX={bangkok:'Bkk',kl:'Kl',jakarta:'Jak',hcmc:'Hcmc'};
const LEVELS=33;

export const CONTEXT_I18N={
en:{title:'Place the model in the city',tier:'Site and shadow impact · concept study, not a planning submission',pick:'Pilot site',siteLabel:'Model',replaces:'Replaces',addr:'Address',coords:'Coordinates',coordApprox:'approximate site centroid',coordExact:'site coordinate of the building',coordPilot:'pilot-city reference from the solar set',latN:'N {0}°',latS:'S {0}°',lonE:'E {0}°',realHeight:'Real height',realFloors:'Real storeys',plate:'Typical floor plate',plateNote:'The floor plate is a published figure for one level. The dashed square is its equivalent square — an area equivalent, not the real outline.',clearNote:'A 2.60 m clear height is a Bangkok Grade A office benchmark. It calibrates the model storey height on screen; it is not a measurement of the model, and no benchmark for the other three cities is included here.',modelHeight:'Model height',storeyHeight:'Model storey height',areaNote:'Model ground footprint {0} m² against a published floor plate of {1} m².',skyline:'Skyline section',skyAria:'Height comparison: model {0} m, the building it replaces {1} m, and six contextual neighbours of indicative height',skylineNote:'Neighbour heights are indicative massing. The model is drawn at its computed stack height beside the real height of the building it replaces.',neighbours:'Contextual neighbours',colBearing:'Bearing',colDist:'Distance',colW:'Plan width',colH:'Height',colShaded:'Shaded',colFacade:'Tower-face sun intercepted',bearingNote:'Bearing is degrees clockwise from north; distance runs from the site centre to the neighbour centre; neighbour plan blocks are square in footprint.',daylight:'{0} h of daylight sampled',maxReach:'Longest shadow reaching it',maxLength:'Longest shadow of the day',noShade:'never shaded',facadeNote:'The last column is the share of the unobstructed sun hours on the neighbour’s tower-facing side that this tower intercepts, from the same sampled day. A geometric ratio, not a daylight loss.',sun:'Sun at the chosen time',plan:'Site plan',planAria:'Site plan: model footprint, contextual neighbours by bearing, and the shadow polygon at the chosen time',strip:'Shaded hours through the civil day',stripAria:'Shaded hours across the civil day, one mark per quarter-hour sample, for every contextual neighbour',samples:'{0} quarter-hour samples across the full civil day',time:'Clock time',alt:'Sun altitude',az:'Sun azimuth',shAz:'Shadow azimuth',shLen:'Shadow length',unitM:'m',unitH:'h',unitDeg:'°',runoff:'the shadow runs a further {0} m off the sheet',legTower:'Model footprint at grade',legPlan:'Model footprint at the shadow height',legRef:'Equivalent square of the replaced building',legNb:'Contextual neighbour, indicative height',legShadow:'Shadow at the chosen time',discTitle:'What this desk is, and is not',discSite:'FormHypes concept study. The model is placed on the plot of an existing building and replaces it on paper. No owner, authority or consent is involved, and nothing here is a planning submission.',discMass:'Contextual massing, not surveyed. The neighbouring blocks are composed for this study: bearings, distances, widths and heights are indicative. Only the replaced building and its published figures are real.',discShadow:'Unobstructed, flat-ground, opaque-massing calculation. No terrain, no surrounding buildings occluding, no atmospheric softening, no seasonal vegetation, no hourly sky model. Not a daylight assessment and not a rights-to-light assessment. While the sun is below the horizon, shade is zero, never negative.',discSolar:'Sun positions are computed for the solar set’s pilot-city coordinate, not for the site coordinate printed above. Where the two differ, the sun is the city one.',noSite:'This solar city has no pilot site here. Showing {0}.',nNorth:'N',scaleBar:'Scale bar',facadeNone:'That face never faces the sun',cityBkk:'Bangkok',cityKl:'Kuala Lumpur',cityJak:'Jakarta',cityHcmc:'Ho Chi Minh City',nameBkk:'Empire Tower',nameKl:'Dayabumi Complex',nameJak:'Wisma 46',nameHcmc:'Landmark 81',addrBkk:'1 South Sathorn Road, Sathorn, Bangkok',addrKl:'Jalan Sultan Hishamuddin, Merdeka Square, Kuala Lumpur',addrJak:'Jalan Jenderal Sudirman Kav-1, Jakarta',addrHcmc:'720A Điện Biên Phủ, Bình Thạnh, Ho Chi Minh City'},
th:{title:'วางโมเดลลงในเมือง',tier:'ที่ตั้งและเงาสาดตก · การศึกษาแนวคิด ไม่ใช่เอกสารยื่นวางผัง',pick:'ที่ตั้งต้นแบบ',siteLabel:'โมเดล',replaces:'แทนที่',addr:'ที่อยู่',coords:'พิกัด',coordApprox:'จุดศูนย์กลางที่ตั้งโดยประมาณ',coordExact:'พิกัดของอาคาร',coordPilot:'พิกัดอ้างอิงของเมืองจากชุดแสงอาทิตย์',latN:'N {0}°',latS:'S {0}°',lonE:'E {0}°',realHeight:'ความสูงจริง',realFloors:'จำนวนชั้นจริง',plate:'พื้นที่ชั้นมาตรฐาน',plateNote:'พื้นที่ชั้นคือตัวเลขที่เผยแพร่สำหรับหนึ่งชั้น สี่เหลี่ยมจัตุรัสเส้นประเป็นค่าด้านที่เทียบเท่าพื้นที่ ไม่ใช่รูปทรงจริง',clearNote:'ความสูงใส 2.60 ม. เป็นเกณฑ์อ้างอิงของออฟฟิศเกรดเอในกรุงเทพฯ ค่านี้ใช้เทียบกับความสูงชั้นของโมเดลบนหน้าจอ ไม่ใช่ค่าที่วัดจากโมเดลได้ และไม่มีเกณฑ์ของอีกสามเมืองรวมอยู่ที่นี่',modelHeight:'ความสูงโมเดล',storeyHeight:'ความสูงต่อชั้นของโมเดล',areaNote:'พื้นที่ฐานของโมเดล {0} ตร.ม. เทียบกับพื้นที่ชั้นมาตรฐานที่เผยแพร่ {1} ตร.ม.',skyline:'แนวเส้นฟ้า',skyAria:'เปรียบเทียบความสูง โมเดล {0} ม. อาคารที่ถูกแทนที่ {1} ม. และมวลข้างเคียงอีกหกหลังที่มีความสูงสมมติ',skylineNote:'ความสูงอาคารข้างเคียงเป็นมวลสมมติ โมเดลวาดที่ความสูงซ้อนชั้นที่คำนวณได้ คู่กับความสูงจริงของอาคารที่ถูกแทนที่',neighbours:'มวลข้างเคียง',colBearing:'ทิศเข็ม',colDist:'ระยะ',colW:'ด้านในแปลน',colH:'ความสูง',colShaded:'ถูกบัง',colFacade:'แสงที่หน้าหันเข้าหาโมเดลถูกดัด',bearingNote:'ทิศเข็มวัดจากทิศเหนือไปตามเข็มนาฬิกา ระยะวัดจากศูนย์กลางที่ตั้งไปยังศูนย์กลางอาคารข้างเคียง แปลนอาคารข้างเคียงเป็นสี่เหลี่ยมจัตุรัส',daylight:'เก็บตัวอย่างแสงวันได้ {0} ชม.',maxReach:'เงายาวที่สุดที่ไปถึง',maxLength:'เงายาวที่สุดของวัน',noShade:'ไม่เคยถูกบัง',facadeNote:'คอลัมน์สุดท้ายคือสัดส่วนแสงอาทิตย์ที่หน้าอาคารด้านที่หันเข้าหาโมเดลเคยได้รับโดยไม่มีอะไรบัง แล้วถูกโมเดลนี้ดัด นับจากวันเดียวกับที่สุ่มตัวอย่างไว้ เป็นอัตราส่วนเชิงเรขาคณิต ไม่ใช่การสูญเสียแสงสว่าง',sun:'ดวงอาทิตย์ ณ เวลาที่เลือก',plan:'ผังที่ตั้ง',planAria:'ผังที่ตั้ง แสดงรูปทรงฐานของโมเดล อาคารข้างเคียงตามทิศเข็ม และรูปเงา ณ เวลาที่เลือก',strip:'ชั่วโมงที่ถูกบังตลอดวัน',stripAria:'ชั่วโมงที่ถูกบังตลอดวัน ขีดหนึ่งครั้งต่อการสุ่มตัวอย่างทุกสิบห้านาที ของอาคารข้างเคียงแต่ละหลัง',samples:'สุ่มตัวอย่างทุกสิบห้านาที จำนวน {0} จุด ครอบคลุมวันตลอด',time:'เวลา',alt:'ความสูงของดวงอาทิตย์',az:'มุมอาซิมัตของดวงอาทิตย์',shAz:'ทิศของเงา',shLen:'ความยาวเงา',unitM:'ม.',unitH:'ชม.',unitDeg:'°',runoff:'เงายาวต่อออกไปอีก {0} ม. เกินขอบเขตแผ่นวาด',legTower:'รูปทรงฐานของโมเดล',legPlan:'รูปทรงของโมเดลที่ระดับความสูงของเงา',legRef:'สี่เหลี่ยมจัตุรัสเทียบเท่าของอาคารที่ถูกแทนที่',legNb:'อาคารข้างเคียง ความสูงสมมติ',legShadow:'เงา ณ เวลาที่เลือก',discTitle:'โต๊ะนี้คืออะไร และไม่ใช่อะไร',discSite:'เป็นการศึกษาแนวคิดของ FormHypes โมเดลถูกวางลงบนที่ดินของอาคารเดิมและแทนที่มันบนกระดาษ ไม่มีเจ้าของ ไม่มีหน่วยงานราชการ ไม่มีการยินยอมใด ๆ และไม่ใช่เอกสารยื่นวางผัง',discMass:'มวลบริบท ไม่ใช่ผลสำรวจ อาคารข้างเคียงทั้งหมดเป็นมวลที่เรียบเรียงขึ้นเพื่อการศึกษานี้ ทิศ ระยะ ด้าน และความสูงเป็นค่าบ่งชี้ มีเพียงอาคารที่ถูกแทนที่กับตัวเลขที่เผยแพร่เท่านั้นที่เป็นข้อมูลจริง',discShadow:'การคำนวณบนพื้นราบ ไม่มีสิ่งบัง และถือมวลอาคารเป็นทึบแสง ไม่มีภูมิประเทศ ไม่มีอาคารรอบข้างมาบัง ไม่มีการลดความเข้มของแสงในบรรยากาศ ไม่มีพืชพันธุ์ตามฤดูกาล ไม่มีแบบจำลองท้องฟ้ารายชั่วโมง ไม่ใช่การประเมินแสงสว่าง และไม่ใช่การประเมินสิทธิแสงสว่าง เมื่อดวงอาทิตย์อยู่ใต้ขอบฟ้า เงาที่บังมีค่าเป็นศูนย์เสมอ ไม่ติดลบ',discSolar:'ตำแหน่งดวงอาทิตย์คำนวณจากพิกัดอ้างอิงของเมืองในชุดแสงอาทิตย์ ไม่ใช่พิกัดที่ตั้งที่แสดงไว้ข้างบน เมื่อสองค่านี้ต่างกัน ดวงอาทิตย์เป็นค่าของเมือง',noSite:'เมืองตามระบบแสงอาทิตย์นี้ไม่มีที่ตั้งต้นแบบ กำลังแสดง {0}',nNorth:'N',scaleBar:'มาตราส่วน',facadeNone:'หน้านั้นไม่เคยหันรับดวงอาทิตย์',cityBkk:'กรุงเทพฯ',cityKl:'กัวลาลัมเปอร์',cityJak:'จาการ์ตา',cityHcmc:'โฮ่ชิมินซิตี',nameBkk:'ตึกอิมไพร์ทาวเวอร์',nameKl:'อาคารไดยาบูมิ',nameJak:'วิสมา 46',nameHcmc:'แลนด์มาร์ก 81',addrBkk:'ถนนสาทรใต้ 195 สาทร กรุงเทพฯ',addrKl:'ถนนสุลต่านหิสมุดดิน สี่เหลี่ยมเมอร์เดกา กัวลาลัมเปอร์',addrJak:'ถนนเจนรัล ซูดิร์มัน แปลง 1 จาการ์ตา',addrHcmc:'720A ถนนเดียนเบียนฟู เบิ่นทัญ กรุงเทพโฮจิมิน'},
zh:{title:'把模型放进城市里',tier:'选址与阴影影响 · 概念研究，不是规划申报文件',pick:'试点地块',siteLabel:'模型',replaces:'替代对象',addr:'地址',coords:'坐标',coordApprox:'近似地块中心',coordExact:'该建筑自身的地块坐标',coordPilot:'日照数据集中的城市参考坐标',latN:'北纬 {0}°',latS:'南纬 {0}°',lonE:'东经 {0}°',realHeight:'实际高度',realFloors:'实际层数',plate:'标准层面积',plateNote:'标准层面积是某一层的已公布数字。虚线正方形只是它的等效面积边长，不是真实外轮廓。',clearNote:'2.60 米净高是曼谷甲级办公的基准值。这里用它与屏幕上的模型层高作对照，它不是从模型上量出来的数值，另外三座城市没有纳入任何基准。',modelHeight:'模型高度',storeyHeight:'模型层高',areaNote:'模型底面面积 {0} 平方米，对照已公布的标准层面积 {1} 平方米。',skyline:'天际线剖面',skyAria:'高度对比：模型 {0} 米，被替代的建筑 {1} 米，另有六栋高度为示意的周边体量',skylineNote:'邻楼高度为示意体量。模型按其计算所得的堆叠高度绘出，与被替代建筑的真实高度并置。',neighbours:'周边体量',colBearing:'方位角',colDist:'距离',colW:'平面宽度',colH:'高度',colShaded:'受遮阴',colFacade:'朝向塔楼一侧的直射光被截取',bearingNote:'方位角自正北顺时针量起；距离自地块中心量至邻楼中心；邻楼平面按正方形处理。',daylight:'采样到的日照 {0} 小时',maxReach:'触及它的最长阴影',maxLength:'当日最长阴影',noShade:'从未受遮',facadeNote:'最后一列是邻楼朝向塔楼那一面原本可得、无遮挡的直射日照中，被这座塔截取的比例，取自同一个采样日。这是几何比例，不是采光损失。',sun:'所选时刻的太阳',plan:'地块平面',planAria:'地块平面：模型底面、按方位角标注的周边体量，以及所选时刻的阴影多边形',strip:'整日遮阴时段',stripAria:'民用日的遮阴时段，每刻钟一处采样，逐一对应每个周边体量',samples:'覆盖整个民用日，每刻钟一处采样，共 {0} 处',time:'钟表时间',alt:'太阳高度角',az:'太阳方位角',shAz:'阴影方位角',shLen:'阴影长度',unitM:'米',unitH:'小时',unitDeg:'度',runoff:'阴影再向外延伸 {0} 米，超出图幅',legTower:'模型底面轮廓',legPlan:'阴影高度处的模型轮廓',legRef:'被替代建筑的等效正方形',legNb:'周边体量，高度为示意',legShadow:'所选时刻的阴影',discTitle:'本工作台是什么，不是什么',discSite:'这是本工具的概念研究。模型被放在既有建筑的用地上，并在图纸上替代它。这里没有业主、没有主管部门、没有任何许可，本文件也不是规划申报材料。',discMass:'上下文体量，非实测。周边街区是为本研究编排出来的：其方位、距离、宽度与高度均为示意；只有被替代的建筑及其已公布的数字是真实的。',discShadow:'无遮挡、平地、不透光体量计算。没有地形，没有周边建筑相互遮挡，没有大气柔化，没有季节性植被，没有逐时天空模型。不是采光评估，也不是日照权评估。太阳位于地平线以下时，遮阴为零，绝不为负。',discSolar:'太阳位置按日照数据集中的城市参考坐标计算，而不是上面印出的地块坐标。两者不同时，采用城市坐标。',noSite:'该日照城市在此没有试点地块，现显示 {0}。',nNorth:'北',scaleBar:'比例尺',facadeNone:'该立面从不朝向太阳',cityBkk:'曼谷',cityKl:'吉隆坡',cityJak:'雅加达',cityHcmc:'胡志明市',nameBkk:'帝皇大厦',nameKl:'独立广场大厦',nameJak:'威斯玛46大厦',nameHcmc:'地标81大厦',addrBkk:'曼谷沙吞区南沙吞路195号',addrKl:'吉隆坡独立广场苏丹希沙慕丁路',addrJak:'雅加达苏迪尔曼将军路一号地块',addrHcmc:'胡志明市平定区奠边府路720A号'}
};

Object.assign(CONTEXT_I18N.en,{"colShaded": "Ground overlap", "colFacade": "Sampled face exposure blocked", "facadeNote": "Last column: incidence-weighted direct exposure blocked at nine points over the neighbour’s nearest axis-aligned face, using its height. Ground hours count any footprint overlap. Both use 32 triangulated loft bands and 15-minute samples; neither measures indoor daylight.", "clearNote": "The 3,000 m² reference plate is an illustrative comparison. No clear-height benchmark for these buildings has been verified in the owner sources.", "plate": "Reference plate · assumption", "discShadow": "Flat ground and opaque massing; 32 triangulated loft bands. Nine sample points per neighbour face. No terrain, weather, other occluders or indoor daylight model. Neighbour masses are invented; the results describe this scenario only.", "noSite": "No pilot site is available for this solar city. Select a supported site below.", "discSolar": "Solar positions use the selected city reference coordinate; printed building points are approximate location references, not surveyed parcels."});
Object.assign(CONTEXT_I18N.th,{"colShaded": "เงาทับพื้นที่ฐาน", "colFacade": "แสงที่ผิวตัวอย่างถูกบัง", "facadeNote": "คอลัมน์สุดท้ายถ่วงน้ำหนักการรับแสงตรงที่ถูกบัง ณ เก้าจุดบนผิวด้านใกล้โมเดลที่สุดตามแนวแกน โดยใช้ความสูงเพื่อนบ้าน ชั่วโมงที่ฐานนับเมื่อมีส่วนเงาทับ ใช้มวลแบ่งสามเหลี่ยม 32 ช่วงและตัวอย่างทุก 15 นาที ไม่ใช่ค่าการรับแสงภายใน", "clearNote": "พื้นที่ชั้นอ้างอิง 3,000 ตร.ม. เป็นสมมติฐานเปรียบเทียบ ยังไม่ยืนยันเกณฑ์ความสูงใสของอาคารเหล่านี้จากแหล่งข้อมูลเจ้าของ", "plate": "พื้นที่ชั้นอ้างอิง · สมมติฐาน", "discShadow": "พื้นราบและมวลทึบ แบ่งทรงเป็น 32 ช่วงสามเหลี่ยม สุ่มเก้าจุดต่อผิวเพื่อนบ้าน ไม่รวมภูมิประเทศ อากาศ สิ่งบังอื่น หรือแสงภายใน มวลเพื่อนบ้านเป็นสมมติ ผลจึงใช้กับสถานการณ์นี้เท่านั้น", "noSite": "เมืองแสงอาทิตย์นี้ยังไม่มีที่ตั้งต้นแบบ โปรดเลือกที่ตั้งที่รองรับด้านล่าง", "discSolar": "ตำแหน่งดวงอาทิตย์ใช้พิกัดอ้างอิงเมืองที่เลือก จุดอาคารที่แสดงเป็นตำแหน่งโดยประมาณ ไม่ใช่แปลงสำรวจ"});
Object.assign(CONTEXT_I18N.zh,{"colShaded": "地面重叠", "colFacade": "立面采样受照遮挡", "facadeNote": "末列按九个点计算相邻体量最近轴向立面的入射加权直射遮挡，计入邻楼高度。地面小时数按任意足迹重叠累计。两者使用 32 段三角化放样和 15 分钟采样，均不表示室内采光。", "clearNote": "3,000 平方米参考楼板仅为比较假设。尚未从业主来源核实这些建筑的净高基准。", "plate": "参考楼板 · 假设", "discShadow": "平地、不透明体量、32 段三角化放样，每个邻楼立面九个采样点。不含地形、天气、其他遮挡或室内采光。邻楼体量是假设，结果仅描述此情景。", "noSite": "此日照城市暂无试点场地，请在下方选择支持的场地。", "discSolar": "太阳位置使用所选城市参考坐标；图示建筑点位仅为大致位置，不是实测地块。"});

/* ── shadow geometry ──────────────────────────────────────────────────────
   The sun vector is (east, north, up) as a unit vector, so a point at height h
   lands on the ground at (x − h·e/u, y − h·n/u) and the shadow length is
   h·cot(altitude) = h·√(e²+n²)/u. Each stacked level is one plan translated,
   never a scaled copy, so the shadow is the union of those translations. */
const inPoly=(p,q)=>{let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((b[1]>q[1])!==(a[1]>q[1])&&q[0]<(a[0]-b[0])*(q[1]-b[1])/(a[1]-b[1])+b[0])c=!c}return c};
const turn=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
const proper=(a,b,c,d)=>turn(a,b,c)*turn(a,b,d)<0&&turn(c,d,a)*turn(c,d,b)<0;
// Two simple polygons meet iff a vertex of one lies inside the other or an edge
// pair properly crosses — the whole test, not a centre-point sample.
const meets=(P,Q)=>{for(const q of P)if(inPoly(Q,q))return true;for(const p of Q)if(inPoly(P,p))return true;for(let i=0;i<P.length;i++)for(let j=0;j<Q.length;j++)if(proper(P[i],P[(i+1)%P.length],Q[j],Q[(j+1)%Q.length]))return true;return false};
const shift=(p,d)=>p.map(q=>[q[0]+d.x,q[1]+d.y]);
const box=p=>{let a=Infinity,b=Infinity,c=-Infinity,d=-Infinity;for(const q of p){if(q[0]<a)a=q[0];if(q[0]>c)c=q[0];if(q[1]<b)b=q[1];if(q[1]>d)d=q[1]}return[a,b,c,d]};
const hitBox=(a,b)=>!(a[2]<b[0]||b[2]<a[0]||a[3]<b[1]||b[3]<a[1]);
const block=n=>{const r=n.b*Math.PI/180,x=n.d*Math.sin(r),y=n.d*Math.cos(r),w=n.w/2;return[[x-w,y-w],[x+w,y-w],[x+w,y+w],[x-w,y+w]]};
const rayOf=sun=>sun.aboveHorizon&&sun.vector.up>0?{x:-sun.vector.east/sun.vector.up,y:-sun.vector.north/sun.vector.up,k:Math.hypot(sun.vector.east,sun.vector.north)/sun.vector.up}:null;
const stackOf=s=>{const H=stackHeight(s,s.floors),lv=[];for(let i=0;i<LEVELS;i++){const t=i/(LEVELS-1);lv.push({t,h:t*H,poly:profile(s,t)})}return{H,lv}};

const CACHE=new Map();
export function contextShadow(s,height){const sun=solarPosition({...solarDefaults,...s}),ray=rayOf(sun);return {length:ray?Math.max(0,height)*ray.k:0,azimuth:(sun.azimuth+180)%360}}
export function projectedShadow(s,sun){
 const ray=rayOf(sun);if(!ray)return [];
 const {lv}=stackOf(s),polys=lv.map(l=>shift(l.poly,{x:ray.x*l.h,y:ray.y*l.h})),out=[polys[0],polys.at(-1)];
 for(let i=0;i<polys.length-1;i++)for(let j=0;j<polys[i].length;j++){
  const k=(j+1)%polys[i].length,a=polys[i][j],b=polys[i][k],c=polys[i+1][k],d=polys[i+1][j];out.push([a,b,c],[a,c,d]);
 }return out.map(p=>{let a=0;for(let i=0;i<p.length;i++)a+=p[i][0]*p[(i+1)%p.length][1]-p[(i+1)%p.length][0]*p[i][1];return a<0?[...p].reverse():p});
}
export const groundOverlap=(polygons,neighbour)=>polygons.some(p=>meets(p,block(neighbour)));
const sub=(a,b)=>a.map((v,i)=>v-b[i]),cross3=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0);
export function rayHitsTriangle(origin,dir,a,b,c){
 const e1=sub(b,a),e2=sub(c,a),p=cross3(dir,e2),det=dot(e1,p);if(Math.abs(det)<1e-10)return false;
 const t=sub(origin,a),u=dot(t,p)/det;if(u<0||u>1)return false;const q=cross3(t,e1),v=dot(dir,q)/det;
 return v>=0&&u+v<=1&&dot(e2,q)/det>1e-6;
}
function towerMesh(s){const {H,lv}=stackOf(s),triangles=[];for(let i=0;i<lv.length-1;i++)for(let j=0;j<lv[i].poly.length;j++){
 const k=(j+1)%lv[i].poly.length,a=[...lv[i].poly[j],lv[i].h],b=[...lv[i].poly[k],lv[i].h],c=[...lv[i+1].poly[k],lv[i+1].h],d=[...lv[i+1].poly[j],lv[i+1].h];triangles.push([a,b,c],[a,c,d]);
 }return {H,triangles,roof:profile(s,1)}}
function facadeSamples(n){
 const a=n.b*Math.PI/180,centre=[n.d*Math.sin(a),n.d*Math.cos(a)],normal=Math.abs(centre[0])>Math.abs(centre[1])?[-Math.sign(centre[0]),0]:[0,-Math.sign(centre[1])],tangent=[-normal[1],normal[0]],points=[];
 for(const u of [1/6,1/2,5/6])for(const v of [1/6,1/2,5/6])points.push([centre[0]+normal[0]*n.w/2+tangent[0]*(u-.5)*n.w,centre[1]+normal[1]*n.w/2+tangent[1]*(u-.5)*n.w,v*n.h]);
 return {points,bearing:(Math.atan2(normal[0],normal[1])*180/Math.PI+360)%360};
}
export function shade(s,sun,ns){
 const key=JSON.stringify([s.city,s.solarDate,s.family,s.span,s.aspect,s.orientation,s.taper,s.twist,s.floors,s.program,s.height,ns]);
 if(CACHE.has(key))return CACHE.get(key);
 const {H,triangles,roof}=towerMesh(s),faces=ns.map(facadeSamples);
 const rows=ns.map(()=>({hours:0,facadeHours:0,exposure:0,reach:0,flags:new Uint8Array(sun.length)}));let daylight=0,longest=0;
 sun.forEach((sm,i)=>{
  const ray=rayOf(sm);if(!ray)return;daylight+=.25;const len=H*ray.k;longest=Math.max(longest,len);
  const polygons=projectedShadow(s,sm),bounds=box(polygons.flat()),dir=[sm.vector.east,sm.vector.north,sm.vector.up];
  ns.forEach((n,j)=>{
   const r=rows[j];if(hitBox(bounds,box(block(n)))&&groundOverlap(polygons,n)){r.hours+=.25;r.flags[i]=1;r.reach=Math.max(r.reach,len)}
   const face=faces[j],weight=incidence(face.bearing,sm)*.25;r.exposure+=weight;if(weight<=0)return;
   const hits=face.points.filter(p=>{
    if(p[2]>=H)return false;const t=(H-p[2])/dir[2];if(t>0&&inPoly(roof,[p[0]+t*dir[0],p[1]+t*dir[1]]))return true;
    return triangles.some(tri=>rayHitsTriangle(p,dir,...tri));
   }).length;
   r.facadeHours+=weight*hits/face.points.length;
  });
 });
 for(const r of rows)r.ratio=r.exposure>1e-9?r.facadeHours/r.exposure:0;
 const out={H,rows,daylight,longest};if(CACHE.size>16)CACHE.delete(CACHE.keys().next().value);CACHE.set(key,out);return out;
}

const el=(t,x)=>{const n=document.createElement(t);if(x!==undefined)n.textContent=x;return n};
const txt=(s,...v)=>{let o=s;v.forEach((x,i)=>{o=o.split('{'+i+'}').join(x)});return o};
const num=(v,d=1)=>Number.isFinite(v)?v.toFixed(d):'—';
const wrap=cls=>{const n=el('div');n.className=cls;return n};
const svg=(label,body,vb)=>{const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox',vb);s.setAttribute('role','img');s.setAttribute('aria-label',label);s.innerHTML=body;return s};
const nice=v=>{const p=Math.pow(10,Math.floor(Math.log10(Math.max(1,v))));return [1,2,5,10].map(k=>k*p).find(k=>k<=v)||p};
let styled=false;

export function renderContext({lang,state,changed}){
 if(!styled){const s=el('style');s.id='cx-style';s.textContent=CSS;document.head.append(s);styled=true}
 const c=CONTEXT_I18N[lang]||CONTEXT_I18N.en;
 const host=document.getElementById('contextDesk');
 if(!host)return;
 const focus=host.contains(document.activeElement)?document.activeElement.id:null;
 const home=Object.hasOwn(SITES,state.city);
 if(!home){host.replaceChildren(el('h2',c.title),el('p',c.noSite));const nav=el('div');nav.className='cx-cities';for(const k of ORDER){const b=el('button',c['city'+SUFFIX[k]]);b.onclick=()=>changed({city:k});nav.append(b)}host.append(nav);return}
 const key=state.city,site=SITES[key];
 let city=solarDefaults.city,date=solarDefaults.solarDate,time=solarDefaults.solarTime;
 if(cities[state.city]){city=state.city;date=state.solarDate;time=state.solarTime}
 let sun=null,samples=[];
 try{sun=solarPosition({city,solarDate:date,solarTime:time});samples=studyDay({city,solarDate:date})}catch(e){}
 if(!sun||!samples.length){host.replaceChildren(el('p',c.noSite));return;}
 const s0={...state,city,solarDate:date},ns=site.neighbours,res=shade(s0,samples,ns);
 const{H,lv}=stackOf(s0),storey=H/Math.max(1,state.floors),foot=area(profile(s0,0));
 const ray=rayOf(sun),M=c.unitM,Hh=c.unitH,DG=c.unitDeg;
 const name=c['name'+SUFFIX[key]],cityName=c['city'+SUFFIX[key]];

 host.replaceChildren();host.classList.add('cx-desk');
 const head=wrap('cx-head');head.append(el('h2',c.title),el('p',c.tier));host.append(head);

 const row=wrap('cx-row');
 const nav=wrap('cx-cities');nav.setAttribute('role','group');nav.setAttribute('aria-label',c.pick);
 for(const k of ORDER){const b=el('button',c['city'+SUFFIX[k]]);b.id='cx-city-'+k;b.type='button';b.setAttribute('aria-pressed',String(k===state.city));b.onclick=()=>changed({city:k});nav.append(b)}
 row.append(nav);
 const tl=el('label',c.time);tl.htmlFor='cx-time';
 const ti=el('input');ti.id='cx-time';ti.className='cx-input';ti.type='time';ti.step='900';ti.value=time;
 ti.onchange=()=>{if(/^([01]\d|2[0-3]):[0-5]\d$/.test(ti.value))changed({solarTime:ti.value})};
 row.append(tl,ti);host.append(row);
 if(!home){const w=el('p',txt(c.noSite,cityName));w.className='cx-warn';host.append(w)}

 const grid=wrap('cx-grid');
 grid.append(siteCard({c,key,site,name,H,storey,foot,M}),sunCard({c,sun,ray,H,res,samples,time}),planCard({s0,c,site,ns,res,ray,H,sun,M,DG}),skyCard({c,site,name,ns,H,M}));
 host.append(grid);

 const tCard=wrap('cx-card');
 tCard.append(el('h3',c.neighbours),neighbourTable({c,ns,res,resRows:res.rows,DG,M,Hh}));
 const notes=wrap('cx-note');notes.append(el('p',c.bearingNote),el('p',c.facadeNote));tCard.append(notes);
 tCard.append(strips({c,ns,rows:res.rows,samples,time,Hh}));
 host.append(tCard);

 const disc=wrap('cx-card');disc.append(el('h3',c.discTitle));
 for(const k of ['discSite','discMass','discShadow','discSolar']){const p=el('p',c[k]);p.className='cx-warn';disc.append(p)}
 host.append(disc);
 if(focus)document.getElementById(focus)?.focus({preventScroll:true});
}

function siteCard({c,site,name,H,storey,foot,M}){
 const card=wrap('cx-card');card.append(el('h3',c.pick));
 const head=wrap('cx-site');head.append(el('b',name));
 const dl=el('dl');dl.className='cx-kv';
 const kv=(k,v)=>{dl.append(el('dt',k),el('dd',v))};
 kv(c.addr,c['addr'+SUFFIX[Object.keys(SITES).find(k=>SITES[k]===site)]]);
 kv(c.coords,txt(site.lat<0?c.latS:c.latN,Math.abs(site.lat).toFixed(6))+' · '+txt(c.lonE,site.lon.toFixed(6)));
 kv('',c['coord'+site.coord[0].toUpperCase()+site.coord.slice(1)]);
 kv(c.realFloors,String(site.floors));
 kv(c.realHeight,num(site.height,site.height%1?1:0)+' '+M);
 kv(c.replaces,name);
 if(site.plate)kv(c.plate,site.plate.toLocaleString('en-GB')+' m²');
 kv(c.modelHeight,num(H,1)+' '+M);
 kv(c.storeyHeight,num(storey,2)+' '+M);
 const a=el('a', {en:'Building sources ↗',th:'แหล่งข้อมูลอาคาร ↗',zh:'建筑来源 ↗'}[document.documentElement.lang.startsWith('th')?'th':document.documentElement.lang.startsWith('zh')?'zh':'en']);a.href=site.source;a.target='_blank';a.rel='noopener';head.append(dl,a);card.append(head);
 const note=wrap('cx-note');note.append(el('p',c.clearNote));
 if(site.plate)note.append(el('p',txt(c.areaNote,Math.round(foot).toLocaleString('en-GB'),site.plate.toLocaleString('en-GB'))),el('p',c.plateNote));
 card.append(note);
 return card;
}

function sunCard({c,sun,ray,H,res,samples,time}){
 const card=wrap('cx-card');card.append(el('h3',c.sun));
 const dl=el('dl');dl.className='cx-kv';
 const row=(k,v)=>{dl.append(el('dt',k),el('dd',v))};
 row(c.alt,ray?num(sun.altitude,1)+c.unitDeg:'—');
 row(c.az,ray?num(sun.azimuth,1)+c.unitDeg:'—');
 row(c.shAz,ray?num(((sun.azimuth+180)%360+360)%360,1)+c.unitDeg:'—');
 row(c.shLen,ray?num(H*ray.k,0)+' '+c.unitM:'—');
 row(c.maxLength,num(res.longest,0)+' '+c.unitM);
 card.append(dl,sunline({samples,H,res,c}));
 const note=wrap('cx-note');
 note.append(el('p',txt(c.daylight,num(res.daylight,2))+' · '+txt(c.samples,samples.length)),el('p',c.discSolar));
 card.append(note);
 return card;
}

function neighbourTable({c,ns,res,DG,M,Hh}){
 const table=el('table');table.className='cx-table';
 table.append(el('caption',txt(c.daylight,num(res.daylight,2))));
 const hr=el('tr');[c.colBearing,c.colDist,c.colW,c.colH,c.colShaded,c.maxReach,c.colFacade].forEach(s=>hr.append(el('th',s)));
 const thead=el('thead');thead.append(hr);table.append(thead);
 const tb=el('tbody');
 ns.forEach((n,i)=>{
  const r=res.rows[i],tr=el('tr');
  tr.append(el('th',String(n.b).padStart(3,'0')+DG));
  tr.append(el('td',n.d+' '+M),el('td',n.w+' '+M),el('td',n.h+' '+M));
  const sh=el('td',num(r.hours,2)+' '+Hh);sh.className=r.hours>0?'cx-hit':'cx-zero';tr.append(sh);
  const re=el('td',r.reach>0?num(r.reach,0)+' '+M:c.noShade);re.className=r.reach>0?'':'cx-zero';tr.append(re);
  const fa=el('td',r.exposure<=1e-6?c.facadeNone:num(r.ratio*100,0)+'%');fa.className=r.ratio>0?'cx-hit':'cx-zero';tr.append(fa);
  tb.append(tr);
 });
 table.append(tb);
 return table;
}

function strips({c,ns,rows,samples,time}){
 const box=wrap('cx-strips');box.append(el('h3',c.strip));
 ns.forEach((n,i)=>box.append(stripRow({flags:rows[i].flags,hours:rows[i].hours,daylight:rows[i].hours,i,c,Hh:c.unitH})));
 box.append(ruler({samples,time,c}));
 return box;
}

function stripRow({flags,hours,i,c,Hh}){
 const W=flags.length*4,Hh2=14;
 let body=`<rect class="cx-strip-frame" x="-1" y="-1" width="${W+2}" height="${Hh2+2}"/>`;
 for(let k=0;k<flags.length;k++)if(flags[k])body+=`<rect class="cx-strip-hit" x="${k*4}" y="0" width="3" height="${Hh2}"/>`;
 const fig=wrap('cx-strip');
 const lab=el('figcaption','N'+(i+1)+' · '+(hours>0?num(hours,2)+' '+Hh:c.noShade));
 const holder=el('div');holder.className='cx-strip-holder';
 holder.append(svg(txt(c.stripAria)+' N'+(i+1),body,'0 0 '+(W+2)+' '+(Hh2+2)));
 fig.append(lab,holder);
 return fig;
}

function ruler({samples,time,c}){
 const W=samples.length*4;
 const i=Math.min(samples.length-1,Math.max(0,(+time.slice(0,2)*60+ +time.slice(3,5))/15));
 let body='';
 [0,24,48,72,95].forEach(k=>{
  const x=k*4+1;
  body+=`<path class="cx-strip-frame" d="M${x} 0V5"/><text class="cx-t" x="${x}" y="13" text-anchor="${k===0?'start':k===95?'end':'middle'}">${String(Math.round(k/4)).padStart(2,'0')}</text>`;
 });
 body+=`<path class="cx-now" d="M${(i*4+2).toFixed(1)} -2V6"/>`;
 const fig=wrap('cx-strip');fig.append(svg(txt(c.stripAria),body,'0 0 '+W+' 15'));
 return fig;
}

/* ── drawings ─────────────────────────────────────────────────────────── */
function planCard({s0,c,site,ns,res,ray,H,sun,M,DG}){
 const card=wrap('cx-card');card.append(el('h3',c.plan));
 const V=560,C=280;
 const foot=profile(s0,0),top=profile(s0,1);
 const span=Math.max(...ns.map(n=>n.d+n.w),...foot.map(([x,y])=>Math.hypot(x,y)*2.6));
 const base=span*1.15;
 const run=ray?H*ray.k:0;
 const far=Math.max(...top.map(([x,y])=>Math.hypot(x,y)));
 const R=Math.max(base,Math.min(far+run,base*1.9));
 const s=C/R,X=x=>C+x*s,Y=y=>C-y*s;
 const pts=p=>p.map(q=>X(q[0]).toFixed(1)+','+Y(q[1]).toFixed(1)).join(' ');
 let body='';
 for(let r=100;r<R;r+=100)body+=`<circle class="cx-g" cx="${C}" cy="${C}" r="${(r*s).toFixed(1)}"/>`;
 body+=`<path class="cx-axis" d="M${C} 6V${V-6}M6 ${C}H${V-6}"/>`;
 if(ray)body+=`<path class="cx-shadow" fill-rule="nonzero" d="${projectedShadow(s0,sun).map(p=>'M'+pts(p)+'Z').join('')}"/>`;
 if(site.plate){const h=Math.sqrt(site.plate)/2;body+=`<polygon class="cx-ref" points="${pts([[-h,-h],[h,-h],[h,h],[-h,h]])}"/>`}
 ns.forEach((n,i)=>{
  const b=block(n),hit=res.rows[i].hours>0,mx=X((b[0][0]+b[2][0])/2),my=Y((b[0][1]+b[2][1])/2);
  body+=`<polygon class="cx-nb${hit?' hit':''}" points="${pts(b)}"/>`;
  body+=`<text class="${hit?'cx-t-a':'cx-t'}" x="${mx.toFixed(1)}" y="${(my-3).toFixed(1)}" text-anchor="middle">${String(n.b).padStart(3,'0')}${DG}</text>`;
  body+=`<text class="cx-t" x="${mx.toFixed(1)}" y="${(my+8).toFixed(1)}" text-anchor="middle">${n.h} m</text>`;
  if(mx<52)body+=`<text class="cx-t" x="${(mx+30).toFixed(1)}" y="${(my+22).toFixed(1)}" text-anchor="middle">${String(n.b).padStart(3,'0')}${DG}</text>`;
 });
 body+=`<polygon class="cx-tower" points="${pts(foot)}"/>`;
 body+=`<text class="cx-t-n" x="${C}" y="${C-8}" text-anchor="middle">${c.nNorth}</text>`;
 if(run>R)body+=`<text class="cx-t-a" x="${C}" y="${V-14}" text-anchor="middle">${txt(c.runoff,Math.round(run-R))}</text>`;
 const bar=nice(R/3.4);
 body+=`<path class="cx-axis" d="M18 ${V-24}h${(bar*s).toFixed(1)}M18 ${V-28}v8M${(18+bar*s).toFixed(1)} ${V-28}v8"/>`;
 body+=`<text class="cx-t" x="18" y="${V-31}">${c.scaleBar}</text><text class="cx-t" x="${(18+bar*s+5).toFixed(1)}" y="${V-21}">${bar} ${M}</text>`;
 const fig=wrap('cx-fig');
 fig.append(svg(txt(c.planAria,bar+' '+M),body,'0 0 '+V+' '+V));
 const leg=el('ul');leg.className='cx-legend';
 for(const[k,cls]of[['legTower','cx-tower'],['legShadow','cx-shadow'],['legNb','cx-nb'],['legRef','cx-ref']]){const li=el('li'),i=el('i');i.className=cls;li.append(i,document.createTextNode(c[k]));leg.append(li)}
 fig.append(leg);card.append(fig);
 return card;
}

function skyCard({c,site,name,ns,H,M}){
 const card=wrap('cx-card');card.append(el('h3',c.skyline));
 const rows=[[c.siteLabel,H,true],[name,site.height,false],...ns.map((n,i)=>['N'+(i+1),n.h,false])];
 const max=Math.max(...rows.map(r=>r[1])),W=560,L=150,sx=v=>L+v/max*(W-L-52);
 let body='',y=18;
 for(const[label,value,model]of rows){
  const w=Math.max(2,sx(value)-L);
  body+=`<rect class="${model?'cx-bar-model':'cx-bar-nb'}" x="${L}" y="${y-11}" width="${w.toFixed(1)}" height="13"/>`;
  body+=`<text class="cx-t-d" x="${L-6}" y="${y}" text-anchor="end">${label} ${Math.round(value)} ${M}</text>`;
  body+=`<text class="${model?'cx-t-a':'cx-t'}" x="${(L+w+5).toFixed(1)}" y="${y}">${Math.round(value)}</text>`;
  y+=21;
 }
 const fig=wrap('cx-fig');
 fig.append(svg(txt(c.skyAria,Math.round(H),Math.round(site.height)),body,'0 0 '+W+' '+(y+4)));
 const note=wrap('cx-note');note.append(el('p',c.skylineNote));
 card.append(fig,note);
 return card;
}

function sunline({samples,H,res,c}){
 const W=540,Hh=52,max=Math.max(1,res.longest);
 const sx=k=>6+k/(samples.length-1)*(W-12),sy=v=>Hh-4-v/max*(Hh-12);
 let body=`<path class="cx-axis" d="M6 4V${Hh}H${W-6}"/>`;
 body+=`<polyline class="cx-line" fill="none" points="${samples.map((sm,k)=>{const r=rayOf(sm);return sx(k).toFixed(1)+','+sy(r?H*r.k:0).toFixed(1)}).join(' ')}"/>`;
 body+=`<text class="cx-t" x="6" y="11">0</text><text class="cx-t" x="${W-6}" y="${Hh-6}" text-anchor="end">${Math.round(max)} ${c.unitM}</text>`;
 return svg(txt(c.stripAria)+' · '+c.shLen,body,'0 0 '+W+' '+Hh);
}

const CSS=`.cx-desk,.cx-desk *{box-sizing:border-box}
.cx-desk{font-size:13px;line-height:1.45;color:var(--ink)}
.cx-head{border-bottom:2px solid var(--ink);padding-bottom:6px;margin:0 0 10px}
.cx-head h2{margin:0;font-size:19px;letter-spacing:.01em}
.cx-head p{margin:3px 0 0;color:var(--muted)}
.cx-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0 0 12px;font-size:12px}
.cx-cities{display:flex;flex-wrap:wrap;border:1px solid var(--line)}
.cx-cities button{font:inherit;background:transparent;border:0;border-right:1px solid var(--line);padding:6px 11px;min-height:34px;cursor:pointer;color:var(--muted)}
.cx-cities button:last-child{border-right:0}
.cx-cities button[aria-pressed=true]{background:var(--accent);color:var(--dark);font-weight:600}
.cx-input{font:inherit;font-family:var(--mono);padding:4px 6px;border:1px solid var(--line);background:var(--panel);min-height:32px}
.cx-grid{align-items:start;display:grid;grid-template-columns:minmax(0,1fr);gap:12px}
@media(min-width:960px){.cx-grid{grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr)}}
.cx-card{border:1px solid var(--line);background:var(--panel);padding:10px 12px;margin:0 0 12px}
.cx-card h3{margin:0 0 6px;font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted);font-weight:600}
.cx-site b{display:block;font-size:16px}
.cx-kv{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;margin:6px 0 0;font-size:12px}
.cx-kv dt{color:var(--muted)}
.cx-kv dd{margin:0;font-family:var(--mono);word-break:break-word}
.cx-note{font-size:11px;line-height:1.5;color:var(--faint);margin:6px 0 0}
.cx-note p{margin:0 0 4px}
.cx-warn{font-size:12px;line-height:1.5;border-left:2px solid var(--accent);padding:2px 0 2px 10px;margin:0 0 8px}
.cx-fig{margin:0}
.cx-fig svg{display:block;width:100%;height:auto;background:var(--dark)}
.cx-legend{display:flex;flex-wrap:wrap;gap:3px 14px;margin:6px 0 0;padding:0;list-style:none;font-size:10.5px;color:var(--muted)}
.cx-legend i{display:inline-block;width:13px;height:9px;margin-right:5px;vertical-align:-1px}
.cx-strips{margin-top:12px}
.cx-strip{display:flex;align-items:center;gap:10px;margin:2px 0}
.cx-strip-holder{width:392px;max-width:62vw}
.cx-strip svg{display:block;width:100%;height:auto;background:var(--dark)}
.cx-strip figcaption{font-family:var(--mono);font-size:10px;color:var(--muted);min-width:104px;text-align:right}
.cx-strips .cx-strip svg{max-width:392px}
table.cx-table{border-collapse:collapse;width:100%;font-family:var(--mono);font-size:11.5px}
.cx-table caption{text-align:left;font-family:var(--sans);font-size:11px;color:var(--muted);padding:0 0 4px}
.cx-table th,.cx-table td{border-bottom:1px solid var(--line);padding:3px 5px;text-align:right;white-space:nowrap}
.cx-table th:first-child,.cx-table td:first-child{text-align:left}
.cx-table thead th{border-bottom:2px solid var(--ink);color:var(--muted);font-weight:600}
.cx-table tbody th{font-weight:600;color:var(--ink)}
.cx-hit{color:var(--accent);font-weight:600}
.cx-zero{color:var(--faint)}
.cx-g{stroke:var(--line);fill:none;stroke-width:1}
.cx-axis{stroke:var(--dim);fill:none;stroke-width:1}
.cx-nb{fill:var(--panel);stroke:var(--dim);stroke-width:1}
.cx-nb.hit{fill:var(--accent);fill-opacity:.3;stroke:var(--accent)}
.cx-ref{fill:none;stroke:var(--dim);stroke-width:1;stroke-dasharray:4 3}
.cx-tower{fill:var(--accent);fill-opacity:.16;stroke:var(--accent);stroke-width:2}
.cx-shadow{fill:var(--accent);fill-opacity:.24;stroke:none}
.cx-bar-nb{fill:var(--panel);stroke:var(--dim);stroke-width:1}
.cx-bar-model{fill:var(--accent)}
.cx-t{fill:var(--dim);font-family:var(--mono);font-size:9px}
.cx-t-d{fill:var(--dim);font-family:var(--mono);font-size:10px}
.cx-t-a{fill:var(--accent);font-family:var(--mono);font-size:9.5px;font-weight:600}
.cx-t-n{fill:var(--dim);font-family:var(--mono);font-size:12px;font-weight:700}
.cx-line{stroke:var(--accent);stroke-width:1.5}
.cx-strip-frame{fill:none;stroke:var(--line);stroke-width:1}
.cx-strip-hit{fill:var(--accent)}
.cx-now{stroke:var(--dim);stroke-width:2}
.cx-legend i.cx-shadow{background:rgba(245,158,11,.24)}
.cx-legend i.cx-tower{border:1px solid var(--accent);background:rgba(245,158,11,.16)}
.cx-legend i.cx-nb{border:1px solid var(--muted)}
.cx-legend i.cx-ref{border:1px dashed var(--muted)}`;
Object.assign(CONTEXT_I18N.en,{areaNote:'Model ground footprint {0} m² against an assumed reference plate of {1} m².',plateNote:'The dashed square is an assumed reference plate of equivalent area, not a surveyed building outline.'});
Object.assign(CONTEXT_I18N.th,{areaNote:'พื้นที่ฐานโมเดล {0} ตร.ม. เทียบกับพื้นที่ชั้นอ้างอิงสมมติ {1} ตร.ม.',plateNote:'สี่เหลี่ยมเส้นประคือผังอ้างอิงสมมติที่มีพื้นที่เท่ากัน ไม่ใช่เส้นขอบอาคารสำรวจ'});
Object.assign(CONTEXT_I18N.zh,{areaNote:'模型底层面积 {0} 平方米，对比假设参考楼板 {1} 平方米。',plateNote:'虚线方形是假设参考楼板的等面积方形，不是实测建筑轮廓。'});
Object.assign(CONTEXT_I18N.en,{storeyHeight:'Total height / occupied storey count'});
Object.assign(CONTEXT_I18N.th,{storeyHeight:'ความสูงรวม / จำนวนชั้นใช้งาน'});
Object.assign(CONTEXT_I18N.zh,{storeyHeight:'总高度 / 使用楼层数'});
Object.assign(CONTEXT_I18N.en,{addrBkk:'1 South Sathorn Road, Yannawa, Sathorn, Bangkok'});
Object.assign(CONTEXT_I18N.th,{addrBkk:'1 ถนนสาทรใต้ แขวงยานนาวา เขตสาทร กรุงเทพฯ'});
Object.assign(CONTEXT_I18N.zh,{addrBkk:'曼谷沙吞区南沙吞路1号'});
