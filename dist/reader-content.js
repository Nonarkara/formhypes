// Four guided pages. Locators use printed page numbers (also PDF indices here).
export const SOURCES=[
 {id:'chen',author:'Shouheng Chen',year:'2006',title:'Embedding Methods for Massing and Detail Design in Computer Generated Design of Skyscrapers',where:'MIT SMArchS · §§4.1–4.3, pp. 41–61; §5.3, pp. 94–95; §§6.1–6.2, pp. 105–107',url:'https://dspace.mit.edu/entities/publication/9e8d7dfe-e1b3-47bb-92cb-f2b4c004b558'},
 {id:'non',author:'Non Arkaraprasertkul',year:'2007',title:'Shanghai contemporary: the politics of built form',where:'MIT S.M. · repository abstract; advisors Stanford Anderson and Yung Ho Chang',url:'https://dspace.mit.edu/entities/publication/0d797dd1-178f-4010-bbb7-4e855ffd7edb'},
 {id:'urban',author:'Non Arkaraprasertkul',year:'2008',title:'Politicisation and the Rhetoric of Shanghai Urbanism',where:'Footprint 2 · pp. 43–52 · article abstract',url:'https://journals.open.tudelft.nl/footprint/article/view/676'},
 {id:'ground',author:'Ornthammarath et al.',year:'2023',title:'Preliminary analysis of amplified ground motion in Bangkok basin using HVSR curves from recent moderate to large earthquakes',where:'Geoenvironmental Disasters 10, 28 · Results and Conclusion',url:'https://doi.org/10.1186/s40677-023-00259-0'},
 {id:'feng',author:'S.-C. Chiou & R. Krishnamurti',year:'1997',title:'Unraveling fêng-shui',where:'Environment and Planning B 24 · pp. 549–572',url:'https://www.andrew.cmu.edu/course/48-747/subFrames/readings/Chiou%26Krishnamurti.UnravelingFengShui.pdf'},
 {id:'peer',author:'PEER Tall Buildings Initiative',year:'2017',title:'Guidelines for Performance-Based Seismic Design of Tall Buildings',where:'PEER Report 2017/06 · engineering guidance, not this prototype’s certification',url:'https://peer.berkeley.edu/research/building-systems/tall-buildings-initiative'},
 {id:'knowledge',author:'designon · Dr Non',year:'2026',title:'Architectural knowledge source pack',where:'Source commit 6754f369 · drawing conventions and residential reference rules; not high-rise approval',url:'knowledge/designon-knowledge.json?v=38eb5f372c'}
];
export const ARTIFACTS=[
 {src:'research/artifacts/chen-fig34.png?v=3f5b8dbe0d',figure:34,page:41,alt:'Chen’s original program tree: user interface branches into massing and detail construction.'},
 {src:'research/artifacts/chen-fig36.png?v=fb01ea14ad',figure:36,page:43,alt:'Chen’s original Profile Finding diagram: plans at transition levels loft into a tower.'},
 {src:'research/artifacts/chen-fig76-detail.png?v=37eed70e3b',figure:76,page:94,alt:'One tower from Chen’s original Figure 76, with generated massing and facade details.'}
];
export const READER={
 en:{nav:['The thesis','The mechanism','The economics','The city','Before the thesis'],previous:'Previous',next:'Next',page:'Page',source:'Sources & reading trail',newDiagram:'Explanatory diagram · FormHypes, 2026',original:'Original thesis excerpt · © Shouheng Chen, 2006',fig:'Fig.',p:'p.',open:'Open original MIT record',archive:'Extended studies, diagrams & photographs',archiveNote:'These longer studies are supplementary interpretations and live model experiments. Their monetary assumptions are scenarios; none establishes code compliance or market value.',
 pages:[
 {title:'2006: put the knowledge inside the tool.',stand:'Thesis findings · Chen, chapters 3–6',paras:[
 'Chen’s question was practical: can an architect encode the recurring decisions behind a skyscraper, then reuse them without drawing every component again? He studied HKIFC, Petronas, Cira and Hearst. Their massing rules and façade details became reusable procedures, rather than a collection of finished pictures. [chen]',
 'The program separated massing from detail construction. A user could reconstruct a studied tower, vary its geometry, then attach components through their reference points. The program tree below matters because that separation lets a family of designs share construction knowledge. [chen]',
 'Chapter 5 shows generated variations and physical prototypes. Chapter 6 is explicit about the boundary: the original work concentrated on exterior skins. Connections to structure, interior programmes and structural or ecological analysis were future work. FormHypes takes up that invitation; it does not claim those problems are now solved. [chen]'],diagram:'lineage',labels:['Study a building','Encode its rules','Generate variations','Test beyond the skin'],artifact:0,caption:'Figure 34, p. 41. The original hierarchy separates massing and detail functions. This is source evidence, not a diagram drawn for this website.'},
 {title:'A plan is a rule. A tower is a transformation.',stand:'Thesis method + new 2026 geometry',paras:[
 'Profile Finding constructs plans at transition levels, scales and rotates them, then lofts between them. Point Finding locates related points in space and connects them into faceted surfaces. They solve different geometric tasks. See §4.2, pp. 43–47. Component placement then uses position points and neighbouring points (§4.3). [chen]',
 'Our extension exposes eleven simple polygon families, continuous taper, twist, aspect and orientation. The oval and petals are faceted approximations. Convex Minkowski sums construct some profiles; explicit nonconvex boundaries preserve stars and recesses. A support function alone would retain only a nonconvex plan’s convex hull.',
 'The same slab elevations drive area, height and export. Surface and volume use numerical integration; a drawing is not evidence of engineering performance. Try the Form atlas and Feng Shui prompts, then inspect the changed perimeter, core fit and corner footprints.'],diagram:'loft',labels:['Profile','Scale + rotate','Loft','Associate detail'],artifact:1,caption:'Figure 36, p. 43. Chen’s actual Profile Finding method. The new diagram above explains the operation; it is not a reproduction of his implementation.'},
 {title:'More corners. More rent. More wall to pay for.',stand:'FormHypes economic scenario · not a finding of the 2006 thesis',paras:[
 'A form should earn its extra envelope. Every alternative in Explore is resized to the same gross floor area. Core and common allowances come out before rentable area; qualifying corner zones are a subset of what remains. Base rent reaches every rentable square metre once. Only the extra corner premium is added.',
 'Annual contribution = occupied gross rent − envelope reserve − structure reserve. It is neither net operating income nor development profit. Land, construction finance, operating costs, taxes, leasing costs and capital recovery still need a project appraisal. An assumed identity premium is a sensitivity input, not evidence that an unusual tower commands one.',
 'A tall building makes economic sense only if demand, achievable rents and lifecycle costs support it. Transit capacity and public benefits require separate evidence. Chen’s combined massing/detail example shows how to produce a design; this new ledger asks what the design would need to justify. [chen]'],diagram:'ledger',labels:['Gross area','Core + common','Rentable area','Corner premium','Envelope + frame','Annual contribution'],artifact:2,caption:'Detail from Figure 76, p. 94: one of Chen’s generated towers. This is a cropped image from the thesis, not a FormHypes output or evidence of financial performance.'},
 {title:'The city gets a vote.',stand:'Dr Non’s research + a stated 2026 synthesis',paras:[
 'Dr Non’s 2007 MIT thesis, Shanghai contemporary: the politics of built form, investigates Shanghai’s transformation through planning history, politics, global markets and the production of urban imagery. It is a parallel line of inquiry, not an economic validation of Chen’s models. This account is based on the MIT repository abstract. [non]',
 'His 2008 paper tests urban imagery against urban form, individual buildings, skylines and streetscape. It brings the pedestrian’s experience into the same discussion as the architect-planner’s view. Our synthesis: compare who receives the rent and prestige with who gains access, bears disruption or loses a place. Those outcomes require fieldwork, not a silhouette score. [urban]',
 'Local ground conditions add another test. Bangkok’s basin research identifies long-period amplification; a city label cannot specify a parcel’s soil profile or a tower’s capacity. Use the location desk for sources and a mechanics experiment, then commission site investigation and structural analysis. [ground] [peer]',
 'Culture is a design conversation, not a national taste score. Feng Shui offers a useful provocation about orientation and relationships, with different schools and practices. Our playground invents site arrangements; it does not certify auspiciousness. Ask local occupants and stakeholders which meanings the proposed form carries. [feng]'],diagram:'city',labels:['Owner · income','Occupant · comfort','Neighbour · access','City · infrastructure','Ground · site evidence','Community · meaning'],caption:'2006 → 2007 → 2008 → 2026: Chen’s computational methods; Dr Non’s MIT thesis; his Shanghai urbanism paper; this product by Dr Non at depa + Axiom. The synthesis belongs to FormHypes.'}
 ]},
 th:{nav:['วิทยานิพนธ์','กลไก','เศรษฐศาสตร์','เมือง','ก่อนวิทยานิพนธ์'],previous:'ก่อนหน้า',next:'ถัดไป',page:'หน้า',source:'แหล่งอ้างอิงและเส้นทางการอ่าน',newDiagram:'แผนภาพอธิบาย · FormHypes, 2026',original:'ภาพจากวิทยานิพนธ์ต้นฉบับ · © Shouheng Chen, 2006',fig:'ภาพที่',p:'หน้า',open:'เปิดระเบียนต้นฉบับที่ MIT',archive:'บทศึกษาเพิ่มเติม แผนภาพ และภาพถ่าย',archiveNote:'บทศึกษาขนาดยาวเป็นการตีความและการทดลองกับโมเดล สมมติฐานทางการเงินเป็นสถานการณ์ทดลอง ไม่ยืนยันการผ่านกฎหมายหรือมูลค่าตลาด',
 pages:[
 {title:'2006: ใส่ความรู้ไว้ในเครื่องมือ',stand:'ข้อค้นพบในวิทยานิพนธ์ · Chen บทที่ 3–6',paras:[
 'Chen ถามว่า สถาปนิกจะเข้ารหัสการตัดสินใจที่เกิดซ้ำในการออกแบบตึกสูง แล้วนำกลับมาใช้โดยไม่ต้องวาดทุกชิ้นใหม่ได้หรือไม่ เขาศึกษา HKIFC, Petronas, Cira และ Hearst แล้วแปลงกฎรูปทรงกับรายละเอียดเปลือกอาคารเป็นขั้นตอนที่ใช้ซ้ำได้ [chen]',
 'โปรแกรมแยกการสร้างมวลอาคารออกจากการสร้างรายละเอียด ผู้ใช้จำลองอาคารกรณีศึกษา ปรับรูปทรง แล้ววางองค์ประกอบผ่านจุดอ้างอิงได้ ผังโปรแกรมด้านล่างแสดงว่าทำไมรูปแบบหลายแบบจึงใช้ความรู้ในการประกอบร่วมกันได้ [chen]',
 'บทที่ 5 แสดงรูปแบบแปรผันและหุ่นจำลอง บทที่ 6 ระบุชัดว่างานเดิมเน้นเปลือกอาคาร ส่วนรอยต่อโครงสร้าง การใช้พื้นที่ภายใน และการวิเคราะห์โครงสร้างหรือสิ่งแวดล้อมเป็นงานในอนาคต FormHypes รับคำชวนนี้มาทำต่อ โดยยังไม่ได้แก้ปัญหาเหล่านั้นครบถ้วน [chen]'],diagram:'lineage',labels:['ศึกษาอาคาร','เข้ารหัสกฎ','สร้างรูปแบบแปรผัน','ทดสอบสิ่งหลังเปลือก'],artifact:0,caption:'ภาพที่ 34 หน้า 41 ผังต้นฉบับแยกฟังก์ชันมวลอาคารกับรายละเอียด เป็นหลักฐานจากต้นฉบับ ไม่ใช่ภาพวาดขึ้นเพื่อเว็บไซต์นี้'},
 {title:'ผังคือกฎ อาคารคือการแปลงรูป',stand:'วิธีจากวิทยานิพนธ์ + เรขาคณิตที่ต่อยอดในปี 2026',paras:[
 'Profile Finding สร้างผังที่ชั้นเปลี่ยนรูป ย่อขยายและหมุน แล้วเชื่อมเป็นทรง ส่วน Point Finding หาตำแหน่งจุดที่สัมพันธ์กันในสามมิติแล้วเชื่อมเป็นผิวเหลี่ยม ดูหัวข้อ 4.2 หน้า 43–47 การวางองค์ประกอบใช้จุดตำแหน่งและจุดข้างเคียงในหัวข้อ 4.3 [chen]',
 'ส่วนต่อยอดมีผังรูปหลายเหลี่ยม 11 ตระกูล ปรับสอบบิด สัดส่วน และทิศทางได้ วงรีและกลีบดอกเป็นรูปเหลี่ยมประมาณเส้นโค้ง ผลบวก Minkowski ใช้สร้างผังนูนบางแบบ ส่วนดาวและขอบเว้าเก็บเป็นเส้นขอบโดยตรง เพราะฟังก์ชันรองรับเพียงอย่างเดียวเก็บได้แค่เปลือกนูนของรูปเว้า',
 'ระดับพื้นชุดเดียวกันใช้คำนวณพื้นที่ ความสูง และส่งออก ผิวและปริมาตรคำนวณด้วยการอินทิเกรตเชิงตัวเลข ภาพอาคารไม่ได้พิสูจน์สมรรถนะวิศวกรรม ลองสมุดรูปทรงและโจทย์ฮวงจุ้ย แล้วดูเส้นรอบรูป แกนกลาง และพื้นที่มุมที่เปลี่ยนไป'],diagram:'loft',labels:['ผัง','ย่อขยาย + หมุน','เชื่อมทรง','ผูกรายละเอียด'],artifact:1,caption:'ภาพที่ 36 หน้า 43 วิธี Profile Finding ของ Chen จริง แผนภาพใหม่ด้านบนอธิบายการทำงาน ไม่ได้ทำซ้ำโปรแกรมต้นฉบับ'},
 {title:'มุมมากขึ้น ค่าเช่ามากขึ้น ผนังก็มากขึ้น',stand:'สถานการณ์เศรษฐศาสตร์ FormHypes · ไม่ใช่ข้อค้นพบปี 2006',paras:[
 'รูปทรงควรคุ้มกับเปลือกอาคารที่เพิ่มขึ้น Explore ปรับทุกตัวเลือกให้มีพื้นที่รวมเท่ากัน หักแกนกลางและพื้นที่ส่วนกลางก่อนหาพื้นที่เช่า พื้นที่มุมเป็นส่วนหนึ่งของพื้นที่เช่า ทุกตารางเมตรได้รับค่าเช่าฐานครั้งเดียว แล้วบวกเฉพาะส่วนเพิ่มของมุม',
 'ผลตอบแทนสมทบรายปี = รายได้ค่าเช่าตามอัตราเข้าใช้ − เงินสำรองเปลือกอาคาร − เงินสำรองโครงสร้าง ไม่ใช่ NOI หรือกำไรพัฒนาโครงการ ยังต้องประเมินที่ดิน ดอกเบี้ย ค่าใช้จ่ายดำเนินงาน ภาษี ค่าเช่าพื้นที่ และการคืนทุน ส่วนเพิ่มจากเอกลักษณ์เป็นสมมติฐาน ไม่ใช่หลักฐานว่าตึกแปลกจะได้ค่าเช่าสูง',
 'ตึกสูงมีเหตุผลทางเศรษฐกิจเมื่ออุปสงค์ ค่าเช่าที่ทำได้จริง และต้นทุนตลอดอายุรองรับได้ ขีดความสามารถขนส่งและประโยชน์สาธารณะต้องมีหลักฐานแยก ตัวอย่างของ Chen แสดงวิธีสร้างแบบ ส่วนบัญชีใหม่นี้ถามว่าแบบต้องพิสูจน์ความคุ้มค่าเรื่องใดบ้าง [chen]'],diagram:'ledger',labels:['พื้นที่รวม','แกน + ส่วนกลาง','พื้นที่เช่า','ส่วนเพิ่มมุม','เปลือก + โครง','ผลตอบแทนสมทบ'],artifact:2,caption:'ภาพตัดจากภาพที่ 76 หน้า 94 อาคารที่ Chen สร้างด้วยระบบเดิม ไม่ใช่ผลลัพธ์ของ FormHypes หรือหลักฐานผลตอบแทนทางการเงิน'},
 {title:'เมืองมีสิทธิ์ออกเสียง',stand:'งานวิจัย ดร.นน + บทสังเคราะห์ปี 2026',paras:[
 'วิทยานิพนธ์ MIT ปี 2007 ของ ดร.นน ชื่อ Shanghai contemporary: the politics of built form ศึกษาการเปลี่ยนแปลงเซี่ยงไฮ้ผ่านประวัติศาสตร์ผังเมือง การเมือง ตลาดโลก และภาพลักษณ์เมือง เป็นคำถามคู่ขนาน ไม่ได้ยืนยันเศรษฐศาสตร์ของโมเดล Chen บทสรุปนี้อ้างจากบทคัดย่อในระเบียน MIT [non]',
 'บทความปี 2008 ของเขาตรวจภาพลักษณ์ผ่านรูปเมือง อาคาร เส้นขอบฟ้า และท้องถนน มุมมองคนเดินเท้าอยู่ในวงสนทนาเดียวกับสถาปนิกและนักผังเมือง บทสังเคราะห์ของเราเสนอให้เทียบผู้ได้ค่าเช่าและชื่อเสียงกับผู้ได้การเข้าถึง ผู้รับผลกระทบ และผู้เสียพื้นที่ เรื่องเหล่านี้ต้องลงพื้นที่ศึกษา [urban]',
 'สภาพดินเป็นอีกการทดสอบ งานวิจัยแอ่งกรุงเทพฯ พบการขยายคลื่นคาบยาว แต่ชื่อเมืองไม่ได้บอกชั้นดินรายแปลงหรือกำลังรับแรงของตึก ใช้โต๊ะศึกษาทำเลอ่านหลักฐานและทดลองกลศาสตร์ ก่อนสำรวจดินและวิเคราะห์โครงสร้างจริง [ground] [peer]',
 'วัฒนธรรมเป็นบทสนทนา ไม่ใช่คะแนนรสนิยมประจำชาติ ฮวงจุ้ยชวนคิดเรื่องทิศและความสัมพันธ์ แต่มีหลายสำนักและหลายวิธี สนามทดลองของเราจัดฉากพื้นที่สมมติ ไม่รับรองความเป็นมงคล ต้องถามผู้ใช้งานและผู้เกี่ยวข้องในท้องถิ่นว่ารูปทรงนั้นสื่ออะไร [feng]'],diagram:'city',labels:['เจ้าของ · รายได้','ผู้ใช้ · ความสบาย','เพื่อนบ้าน · การเข้าถึง','เมือง · โครงสร้างพื้นฐาน','พื้นดิน · หลักฐาน','ชุมชน · ความหมาย'],caption:'2006 → 2007 → 2008 → 2026: วิธีคำนวณของ Chen วิทยานิพนธ์ MIT ของ ดร.นน บทความเซี่ยงไฮ้ และผลิตภัณฑ์นี้โดย ดร.นน ที่ depa + Axiom บทสังเคราะห์เป็นของ FormHypes'}
 ]},
 zh:{nav:['论文','机制','经济','城市','论文之前'],previous:'上一页',next:'下一页',page:'页',source:'参考文献与阅读路径',newDiagram:'解释性图解 · FormHypes，2026',original:'论文原图节选 · © Shouheng Chen，2006',fig:'图',p:'页',open:'打开 MIT 原始记录',archive:'延伸研究、图解与照片',archiveNote:'长篇研究是补充解释与实时模型实验。货币假设属于情景，不构成规范合规或市场估值。',
 pages:[
 {title:'2006：把知识放进工具。',stand:'论文发现 · Chen 第三至六章',paras:[
 'Chen 的问题很实际：建筑师能否把摩天楼设计中反复出现的决策编码，以后不必逐件重画？他研究了 HKIFC、Petronas、Cira 和 Hearst，把体量规则与立面细节变成可复用的程序，而非一组完成图。[chen]',
 '程序把体量与细部构造分开。用户可以重建案例、改变几何，再通过参考点放置构件。下方程序树说明了这一分工为何能让多个设计共享构造知识。[chen]',
 '第五章展示变化方案和实体模型。第六章明确界定边界：原研究着重外表皮，结构连接、内部功能以及结构和生态分析留待后续。FormHypes 接续这个问题，并未声称已经解决这些任务。[chen]'],diagram:'lineage',labels:['研究建筑','编码规则','生成变化','测试表皮之后'],artifact:0,caption:'图 34，第 41 页。原始层级把体量和细部函数分开。这是论文证据，并非本站重绘。'},
 {title:'平面是规则。塔楼是变换。',stand:'论文方法 + 2026 年几何扩展',paras:[
 'Profile Finding 在过渡楼层建立平面，缩放、旋转后放样连接。Point Finding 在空间定位相关点，再连接成折面。两者解决不同任务，见 §4.2，第 43–47 页。构件通过定位点和相邻点建立关联（§4.3）。[chen]',
 '扩展提供十一种简单多边形平面，以及连续收分、扭转、长宽比与朝向。椭圆和花瓣是折面近似。部分凸平面采用 Minkowski 和；星形与凹口保留显式非凸边界。单靠支撑函数只能留下非凸平面的凸包。',
 '同一楼板标高用于面积、高度和导出。表面积与体积采用数值积分；绘图不能证明工程性能。试试形态图谱与风水提示，再查看周长、核心筒容纳和转角区域的变化。'],diagram:'loft',labels:['平面','缩放 + 旋转','放样','关联构件'],artifact:1,caption:'图 36，第 43 页。Chen 的 Profile Finding 原图。上方新图解释操作，并非复刻其程序。'},
 {title:'更多转角。更多租金。也有更多外墙。',stand:'FormHypes 经济情景 · 不属于 2006 年论文结论',paras:[
 '形态应当承担增加的表皮成本。Explore 把每个方案调整为相同总建筑面积。扣除核心筒和公共空间后得到可出租面积；合格转角区属于其中一部分。每平方米只收一次基础租金，再加转角溢价。',
 '年度贡献 = 按出租率计算的总租金 − 表皮储备 − 结构储备。它不是 NOI，也不是开发利润。土地、融资、运营、税费、招租和资本回收仍需项目评估。形象溢价是假设输入，不能证明奇特塔楼一定获得溢价。',
 '只有需求、可实现租金和全寿命成本支持时，高层才具有经济理由。交通容量与公共收益需要另行举证。Chen 的体量和细部组合展示如何生成设计；新的账本追问这个设计需要证明什么。[chen]'],diagram:'ledger',labels:['总面积','核心 + 公共','可出租面积','转角溢价','表皮 + 框架','年度贡献'],artifact:2,caption:'图 76 第 94 页局部：Chen 生成的塔楼之一。此图裁自论文，并非 FormHypes 输出或财务绩效证明。'},
 {title:'城市也有一票。',stand:'Non 博士的研究 + 明示的 2026 年综合解释',paras:[
 'Non 博士 2007 年 MIT 论文 Shanghai contemporary: the politics of built form，从规划史、政治、全球市场与城市意象生产研究上海转型。这是并行问题，不是对 Chen 模型的经济验证。本段依据 MIT 记录中的摘要。[non]',
 '其 2008 年论文通过城市形态、单体建筑、天际线和街景检验城市意象，把行人体验与建筑师、规划师的视角放在一起。我们的综合解释是：比较谁获得租金和声望，谁获得通达性、承受干扰或失去场所。这些结果需要田野调查，无法由轮廓分数推算。[urban]',
 '地基条件提出另一项检验。曼谷盆地研究识别出长周期放大，但城市名称不能指定地块土层或塔楼承载能力。用场地研究台查看来源与力学实验，再进行现场勘察和结构分析。[ground] [peer]',
 '文化是设计对话，不是全国口味评分。风水提示朝向与关系，也有不同流派和实践。试验场设置假想场地，不认证吉凶。应请当地使用者与利益相关者讨论拟议形态的意义。[feng]'],diagram:'city',labels:['业主 · 收入','使用者 · 舒适','邻居 · 通达','城市 · 基础设施','地基 · 场地证据','社区 · 意义'],caption:'2006 → 2007 → 2008 → 2026：Chen 的计算方法、Non 博士的 MIT 论文、上海城市研究，以及由 Non 博士在 depa + Axiom 创作的本产品。综合解释属于 FormHypes。'}
 ]}
};

/* Page five: the museum run. Attached after the literal so the array shape stays
   untouched -- the reader takes its page count from pages.length, so this is the
   only place a new page has to be declared. */
const TIMELINE_PAGE={
 en:{title:'Two centuries of arguing about a facade. Almost all of it was about rent.',stand:'Public-domain history · seven stops, 1884–1952',paras:[
 'Chicago, 1884–85. The Home Insurance Building puts an iron frame inside the walls and is usually called the first skeleton. It was not quite: the lower storeys still carry load in masonry, so the walls are not yet free and the windows are still smaller than tenants would like. A first step, dressed up as a conclusion.',
 'Buffalo, 1894–96. At the Guaranty Building every room gets two plate-glass windows, and the rooms are made square so that nobody pays rent for a dark corner. A daylight argument conducted entirely in money. Chen makes the same argument in 2006 about floor plates. It is 111 years old.',
 'Then the counter. The steel frame did not hand anyone a better daylit room, and Richardson never claimed the skeleton — his Trinity Church, finished in Chicago in 1877, is load-bearing masonry, and a very good one. Sullivan printed the admission in March 1896: we make them look alike because they are all alike.',
 'The glass run follows, and then the core settles into the middle and never moves again. Chen did not invent the question. He asked whether a computer could be given the answer.'
 ],diagram:'timeline',labels:[
 'Home Insurance, Chicago, 1884–85 — frame inside the wall; masonry still carries the lower storeys',
 'Guaranty, Buffalo, 1894–96 — two windows a room; square rooms, no dark corners to pay for',
 'Sullivan, 1896 — the room sets the structure, and the admission about repetition',
 'Boley, Kansas City, 1909 — glass hung outside brick piers; the wall becomes a skin',
 'Halidie, San Francisco, 1918 — slabs cantilever clear of the columns; the corner can be glass',
 'A. O. Smith, Milwaukee, 1928 — a whole wall of glass on an aluminium frame',
 'Lever House, New York, 1952 — curtain wall all round, core in the middle, slabs cantilevered'
 ],caption:'Dates and attributions are taken from the cited public sources. The seven glyphs are original schematic drawings, not measured elevations, and not to a common scale: these buildings are read as a sequence of decisions, not compared by size.'},
 th:{title:'สองศตวรรษที่เถียงกันเรื่องเปลือกอาคาร และเกือบทั้งหมดเป็นเรื่องค่าเช่า',stand:'ประวัติศาสตร์สาธารณะ · เจ็ดหยุด ค.ศ. 1884–1952',paras:[
 'ชิคาโก ค.ศ. 1884–85 ตึก Home Insurance ยัดโครงเหล็กไว้ในกำแพง และมักถูกเรียกว่าเป็นโครงสร้างสกเลตันแท้ครั้งแรก แต่ก็ไม่ใช่ ชั้นล่างยังรับน้ำหนักด้วยอิฐ กำแพงจึงยังไม่เป็นอิสระ และหน้าต่างยังเล็กกว่าที่ผู้เช่าอยากได้ เป็นก้าวแรกที่แต่งกายมาเป็นข้อสรุป',
 'บัฟโฟ ค.ศ. 1894–96 ที่ตึก Guaranty ทุกห้องได้กระจกแผ่นใหญ่สองบาน และจัดห้องให้เป็นสี่เหลี่ยมจัตุรัส เพื่อไม่ให้ใครต้องจ่ายค่าเช่ามุมมืด นี่คือข้อโต้แย้งเรื่องแสงที่ดำเนินไปด้วยเงินทั้งหมด Chen พูดข้อเดียวกันนี้ในปี 2006 เรื่องผังชั้น มันอายุ 111 ปี',
 'แล้วก็ข้อโต้แย้ง โครงเหล็กไม่ได้มอบห้องที่สว่างกว่าให้ใครเลย และริชาร์ดสันก็ไม่เคยอ้างว่าคิดโครงสร้างสกเลตัน โบสถ์ Trinity Church ที่ชิคาโกของเขา สร้างเสร็จปี 1877 เป็นงานอิฐรับน้ำหนัก และเป็นงานที่งดงามมาก ส่วนซัลลิแวนตีพิมพ์คำยอมรับในเดือนมีนาคม 1896 ว่า เราทำให้มันดูเหมือนกันเพราะมันเหมือนกันจริงๆ',
 'จากนั้นก็คือการวิ่งของกระจก แล้วแกนกลางก็ลงไปอยู่กลางและไม่ขยับอีกเลย Chen ไม่ได้คิดคำถามนี้ขึ้นเอง เขาแค่ถามว่าคำตอบจะให้กับคอมพิวเตอร์ได้หรือเปล่า'
 ],diagram:'timeline',labels:[
 'Home Insurance ชิคาโก 1884–85 — โครงอยู่ในกำแพง ชั้นล่างยังรับด้วยอิฐ',
 'Guaranty บัฟโฟ 1894–96 — ห้องละสองหน้าต่าง ห้องเป็นสี่เหลี่ยม มุมมืดไม่ต้องจ่ายค่าเช่า',
 'Sullivan 1896 — ห้องกำหนดโครงสร้าง และคำยอมรับเรื่องการทำซ้ำ',
 'Boley คานซาสซิตี้ 1909 — กระจกแขวนนอกเสาอิฐ กำแพงกลายเป็นเปลือก',
 'Halidie ซานฟรันซิสโก 1918 — พื้นยื่นพ้นเสา มุมจึงเป็นกระจกได้',
 'A. O. Smith มิลวอกกี 1928 — ผนังกระจกทั้งผนังบนโครงอัลูมิเนียม',
 'Lever House นิวยอร์ก 1952 — ผนังกระจกรอบ แกนกลางอยู่กลาง พื้นยื่นออกจากมัน'
 ],caption:'วันที่และชื่อผู้ออกแบบมาจากแหล่งข้อมูลสาธารณะที่ระบุ ภาพทั้งเจ็ดเป็นภาพร่างเชิงแผนผังที่วาดขึ้นใหม่ ไม่ใช่การยกระดับจากการวัด และไม่ได้ใช้มาตราส่วนเดียวกัน อาคารเหล่านี้ถูกอ่านในฐานะลำดับของการตัดสินใจ ไม่ใช่การเปรียบเทียบกันด้วยขนาด'},
 zh:{title:'关于立面的争论持续了两个世纪，而其中几乎全部都是关于租金。',stand:'公共领域史料 · 七个节点，1884–1952',paras:[
 '芝加哥，1884–85。Home Insurance Building 把钢框架放进墙里，通常被称为第一座骨架结构。但并不完全是：底层仍有部分砌体承重，所以墙还没有自由，窗也仍比租户想要的窄。一步，被装扮成结论。',
 '布法罗，1894–96。Guaranty Building 的每个房间都得到两扇大玻璃窗，房间做成方形，于是没有人要为暗角付租金。这是一个完全用钱讲完的采光论证。陈在 2006 年对楼板平面提出了同一个论证，它已经一百一十一岁了。',
 '然后是反面的说法。钢框架并没有送给任何人一个更亮的房间，理查森也从未宣称自己发明了骨架——他那座 1877 年在芝加哥落成的 Trinity Church 本身就是砌体承重，而且是极好的一件。苏利文在 1896 年 3 月印下了那句承认：我们让它们看起来一样，因为它们本来就一样。',
 '然后是玻璃的连跑，接着核心筒落进正中，从此再没挪动过。陈没有发明这个问题，他问的是：答案能不能交给计算机。'
 ],diagram:'timeline',labels:[
 'Home Insurance，芝加哥，1884–85 — 框架在墙内；底层仍由砌体承重',
 'Guaranty，布法罗，1894–96 — 每室两窗；房间方形，不必为暗角付租金',
 'Sullivan，1896 — 房间决定结构，以及那句关于重复的承认',
 'Boley，堪萨斯城，1909 — 玻璃挂在砖墩外面，墙变成皮',
 'Halidie，旧金山，1918 — 楼板挑出柱子之外，转角于是可以是玻璃',
 'A. O. Smith，密尔沃基，1928 — 铝框上的整整一面玻璃墙',
 'Lever House，纽约，1952 — 四面临幕墙，核心筒居中，楼板挑出'
 ],caption:'日期与署名取自所标注的公开来源。七个图符是重新绘制的示意图，并非实测立面，也不采用统一比例：这些建筑被当作一连串决策来阅读，而不是按体量互相比较。'}
};
for(const l of ['en','th','zh'])READER[l].pages.push(TIMELINE_PAGE[l]);
