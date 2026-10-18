// FormHypes — front-of-house brief desk
// The conversation that happens before any geometry exists: what the client
// asked for, what the plot will carry, and what has to be given up.
//
// Every figure here is arithmetic the reader can change. No market valuation,
// no compliance finding, no structural opinion. Where the 2006 kernel cannot
// hold a parameter Chen specifies, this panel says so on screen rather than
// approximating it quietly.

import {families, profile, cornerZones, stackHeight,grossOf} from './model.js?v=a07152d203';

export const BRIEF_I18N={
en:{
 title:'Front of house · the brief',
 lede:'What the client wants, what the plot carries, and what has to be given up. Every number below is arithmetic you can change. None of it is a market valuation, a code check, or a structural opinion.',
 'sec.brief':'1 · The brief',
 'sec.plot':'2–3 · Plot and floor area ratio',
 'sec.floors':'4 · Storeys and height',
 'sec.schemes':'5 · Three schemes',
 'sec.iconic':'6 · Corner offices',
 'sec.params':'7 · Massing parameters · thesis §4.4, p. 94',
 'sec.types':'8 · The four original massing types · §5.1.1',
 'l.gfa':'Gross floor area the client wants','l.plot':'Plot area','l.far':'Floor area ratio','l.plate':'Typical floor plate','l.cap':'Height cap',
 'u.m2':'m²','u.m':'m','u.pct':'%','u.far':'FAR',
 'r.plot':'Plot area','r.far':'Floor area ratio','r.permitted':'Permitted gross floor area = plot × FAR','r.brief':'Brief, as asked','r.delivered':'Delivered by this scheme','r.consumed':'Share of the allowance consumed','r.left':'Allowance left over','r.shortfall':'Shortfall','r.plotNeeded':'Plot this brief would need at this FAR',
 'r.storeys':'Storeys','r.height':'Implied height = storeys × floor-to-floor','r.stack':'Kernel stack height, mechanical and refuge levels included','r.cap':'Height cap','r.headroom':'Headroom under the cap',
 'st.subj.area':'Area check',
 'st.fits':'The brief fits inside the allowance.',
 'st.over':'The brief does not fit. The shortfall above is stated in square metres. No amount of form fixes that.',
 'st.plotSmall':'At this floor area ratio the plot cannot carry the brief. The plot area that would is named above.',
 'st.scope':'This is floor area measured against the floor area ratio allowance. Whether the form itself sits inside the envelope, the height cap and the core is a different check, reported at the top of the studio. The two can disagree, and when they do the arithmetic is what moved.',
 'st.hOk':'Under the cap.',
 'st.hOver':'Over the cap. Take area into a podium, lower the floor plate, or raise the floor-to-floor.',
 'sch.curtain.t':'Curtain-wall core',
 'sch.curtain.o':'Optimises envelope cost per square metre. One core in the middle, slabs cantilevered off it, glass all round — the cheapest way to build this brief.',
 'sch.curtain.s':'Sacrifices corner offices. A rectangular plate gives four, and a cantilevered plate runs deep, so the daylight you are selling is further from the window.',
 'sch.podium.t':'Podium plus tower',
 'sch.podium.o':'Optimises the allowance. Low-rise podium space carries floor area without spending the height cap, so the tower above can be shorter.',
 'sch.podium.s':'Sacrifices the silhouette. Two heights read as two buildings, and the tower is the smaller half.',
 'sch.solid.t':'Solid facade, low rise',
 'sch.solid.o':'Optimises the facade that lasts. A department-store wall — solid, lit from inside, serviced from within. No curtain wall to re-gasket every cycle.',
 'sch.solid.s':'Sacrifices daylight and the iconic reading. Deep plates and few storeys read as a box.',
 'sch.pick':'Use this scheme','sch.picked':'In use','sch.outcome':'Outcome',
 'sch.pf':'Plate factor','sch.ff':'Storey-height factor','sch.share':'Podium share of the brief','sch.pfloors':'Podium storeys','sch.pplate':'Podium plate factor','sch.pff':'Podium storey-height factor','sch.podiumPod':'Podium gross floor area','sch.podiumTower':'Tower storeys above the podium',
 'sch.assumed':'These factors are assumed, not sourced. They are here so that you can argue with them.',
 'io.rule':'A square plate gives four qualifying corners. A star gives eight. That is the whole argument about iconicity: the client is asking for more than four corner offices, and the only way to give them is to cut the corners into the plan.',
 'io.base':'Qualifying corners at grade','io.crown':'Qualifying corners at the crown','io.family':'Plan','io.now':'At the current plan',
 'io.read':'Read this table, not the slogan. A corner qualifies only if both edges beside it exceed twice the frontage, the angle is convex and under 145°, and the zone clears the core. A plan that tapers loses its corners as it rises.',
 'p.1':'Vertical Proportion','p.2':'Massing Description','p.3':'Floor Height','p.4':'Floor Number','p.5':'Middle Profile Level','p.6':'Middle Profile XScale','p.7':'Middle Profile YScale','p.8':'Top Profile XScale','p.9':'Top Profile YScale','p.10':'Rotation Angle',
 'p.map':'Each name is Chen’s, from the Settings for Massing panel. The notes below say what this instrument actually holds. Where the kernel has no field, the derivation is named and nothing is dressed up as native.',
 'p.1.map':'Native. taper — the uniform scale from grade to crown.',
 'p.2.map':'Native. family — the plan the loft is generated from.',
 'p.3.map':'Native. height — floor-to-floor, the same field the whole site uses.',
 'p.4.map':'Native. floors — the level count the stack is built from.',
 'p.5.map':'No native field. The kernel lofts one continuous scale with no discontinuity, so a transition level cannot be held. Carried here as a proportion of total height and drawn on the section; moving it changes where the section is cut, not the geometry.',
 'p.6.map':'No native field. Read with the middle Y scale as the plan proportion at the transition; their ratio drives the kernel field aspect.',
 'p.7.map':'No native field. Their ratio drives aspect. The kernel holds one aspect for the whole tower, so X and Y are not independent in elevation.',
 'p.8.map':'No native field. Read with the top Y scale as the crown proportion; their mean writes the single kernel field taper, which cannot hold X and Y apart.',
 'p.9.map':'No native field. Their mean writes taper, as above.',
 'p.10.map':'Native. orientation — the plan angle in world coordinates. The model holds twist separately: rotation per storey, not of the whole plan.',
 'p.writes':'writes {field} = {value}',
 'p.bound':'Chen bounded his own search — scale 0.1 to 2.0 in steps of 0.1, rotation 0 to 180° in steps of 10°, because outside that range the results are “unrealistic for practical reasons” (§4.2). The four scale sliders stay on his grid.',
 'ty.status':'Status in this kernel','ty.generated':'Generated by','ty.exact':'Exact','ty.approx':'Approximation','ty.partial':'Partial','ty.none':'Not reproduced','ty.jump':'Jump to this',
 'ty.branch.t':'16-Branch Form','ty.branch.g':'Profile Finding','ty.branch.s':'Approximated. The kernel has an eight-point star and tapers it — the same gesture with half the branches. A sixteen-lobe profile is not in the plan library; it would need a new polygon in geometry.js.',
 'ty.setback.t':'Set-back Corner Type','ty.setback.g':'Profile Finding','ty.setback.s':'Approximated. The indented corners are available: the chamfered plan is in the library. The set-back is not. profile() applies one continuous scale, so the loft cannot stop, step, and continue at a transitional floor.',
 'ty.faceted.t':'Multi-Faceted Glass Box','ty.faceted.g':'Points Finding','ty.faceted.s':'Not reproduced. This kernel does Profile Finding only. Points Finding locates related points in space and connects them into faceted surfaces — a different geometric operation, and not implemented here.',
 'ty.skin.t':'Structural Skin Mass','ty.skin.g':'Points Finding','ty.skin.s':'Partial. The diagrid exists as a structural system and is priced as one, with no columns inside the plate. The diagrid surface itself is Points Finding and is not generated.',
 'fam.box':'Rectilinear','fam.chamfer':'Chamfered','fam.cross':'Cruciform','fam.octagon':'Octagonal','fam.star':'Eight-point','fam.rub':'Rub el Hizb','fam.triangle':'Triangular','fam.hexagon':'Hexagonal','fam.oval':'Faceted oval','fam.petal':'Four-petal','fam.pinwheel':'Pinwheel',
 'as.lease':'Illustrative input — change it.',
 'as.end':'No market data is used on this desk. Rent, cost and yield elsewhere in this instrument are scenarios with editable inputs, not valuations. Nothing here is a code compliance check, a structural opinion, or a statement about safety or approval.',
 'dia.legend':'Solid outline: what the kernel draws, straight from profile(). Dashed amber: what the top X and Y scales ask for at the crown. The gap between them is the part this kernel cannot hold. The amber dash on the section is the middle profile level.',
 'ctl.open':'Show the massing diagram'
},
th:{
 title:'ห้องคุยกับเจ้าของ · โจทย์เบื้องต้น',
 lede:'เจ้าของต้องการอะไร ผังที่ดินรับไหวอะไร และอะไรที่ต้องยอมสละ ตัวเลขทุกตัวด้านล่างเป็นคณิตศาสตร์ที่แก้ได้ ไม่ใช่มูลค่าตลาด ไม่ใช่การตรวจกฎหมาย และไม่ใช่ความเห็นด้านโครงสร้าง',
 'sec.brief':'1 · โจทย์ของเจ้าของ',
 'sec.plot':'2–3 · ผังที่ดินและอัตราส่วนพื้นที่',
 'sec.floors':'4 · จำนวนชั้นและความสูง',
 'sec.schemes':'5 · ทางเลือกสามแบบ',
 'sec.iconic':'6 · ห้องมุม',
 'sec.params':'7 · พารามิเตอร์มวลอาคาร · วิทยานิพนธ์ §4.4 หน้า 94',
 'sec.types':'8 · มวลอาคารดั้งเดิมสี่แบบ · §5.1.1',
 'l.gfa':'พื้นที่รวมที่เจ้าของต้องการ','l.plot':'พื้นที่ผังที่ดิน','l.far':'อัตราส่วนพื้นที่','l.plate':'พื้นที่ชั้นทั่วไป','l.cap':'เพดานความสูง',
 'u.m2':'ตร.ม.','u.m':'ม.','u.pct':'%','u.far':'อัตราส่วนพื้นที่',
 'r.plot':'พื้นที่ผังที่ดิน','r.far':'อัตราส่วนพื้นที่','r.permitted':'พื้นที่รวมที่รับได้ = ผังที่ดิน × อัตราส่วน','r.brief':'โจทย์ตามที่ขอ','r.delivered':'สิ่งที่แบบนี้ส่งมอบได้','r.consumed':'สัดส่วนที่ใช้ไป','r.left':'สิ่งที่เหลือ','r.shortfall':'ขาด','r.plotNeeded':'ผังที่ดินที่โจทย์นี้ต้องใช้ที่อัตราส่วนนี้',
 'r.storeys':'จำนวนชั้น','r.height':'ความสูงโดยประมาณ = จำนวนชั้น × ความสูงชั้น','r.stack':'ความสูงตามชุดชั้นของโมเดล รวมชั้นเครื่องและชั้นหลุดหนี','r.cap':'เพดานความสูง','r.headroom':'ส่วนที่เหลือใต้เพดาน',
 'st.subj.area':'การตรวจพื้นที่',
 'st.fits':'โจทย์อยู่ในโควตาที่ได้รับ',
 'st.over':'โจทย์ไม่ลงกับโควตา ส่วนที่ขาดระบุเป็นตารางเมตรไว้ด้านบน ไม่มีรูปทรงใดช่วยได้',
 'st.plotSmall':'ที่อัตราส่วนพื้นที่นี้ ผังที่ดินรับโจทย์ไม่ได้ ขนาดผังที่ดินที่ต้องใช้ระบุไว้ด้านบน',
 'st.scope':'นี่คือพื้นที่ที่วัดเทียบกับโควตาตามอัตราส่วนพื้นที่ ส่วนการที่รูปทรงเองอยู่ในเขตที่ดิน เพดานความสูง และแกนกลางหรือไม่ เป็นการตรวจอีกอันหนึ่ง รายงานอยู่ด้านบนของห้องทำงาน ทั้งสองอาจไม่ตรงกัน และเมื่อไม่ตรง สิ่งที่ขยับคือตัวเลข',
 'st.hOk':'ต่ำกว่าเพดาน',
 'st.hOver':'สูงกว่าเพดาน ย้ายพื้นที่ไปโครงฐาน ลดขนาดพื้นชั้น หรือเพิ่มความสูงชั้น',
 'sch.curtain.t':'แกนกลางผิวกระจกเต็ม',
 'sch.curtain.o':'ชนะเรื่องต้นทุนต่อตารางเมตร แกนกลางหนึ่งแท่งอยู่กลาง พื้นชันยื่นออกจากแกน แล้วกระจกล้อมรอบ ถูกที่สุดในการก่อสร้างโจทย์นี้',
 'sch.curtain.s':'ต้องแลกห้องมุม พื้นผังสี่เหลี่ยมให้มุมสี่ และพื้นที่ยื่นยาว ทำให้แสงที่ขายได้อยู่ไกลจากหน้าต่าง',
 'sch.podium.t':'โครงฐานบวกตึก',
 'sch.podium.o':'ชนะโควตาพื้นที่ พื้นที่โครงฐานทำพื้นที่รวมได้โดยไม่กินเพดานความสูง ตึกข้างบนจึงสั้นลงได้',
 'sch.podium.s':'ต้องแลกเงาประทับของตึก ความสูงสองระดับอ่านได้ว่าเป็นสองอาคาร และตึกยังเป็นส่วนที่เล็กกว่า',
 'sch.solid.t':'ผิวมัน อาคารเตี้ย',
 'sch.solid.o':'ชนะความทนทานของผิว ผนังแบบห้าง ทึบ ใช้ไฟจากภายใน บริการจากภายใน ไม่ต้องเปลี่ยนยานผนังกระจกทุกรอบ',
 'sch.solid.s':'ต้องแลกแสงธรรมชาติและความเป็นไอคอน พื้นชันลึกและจำนวนชั้นน้อยอ่านได้ว่าเป็นกล่อง',
 'sch.pick':'ใช้แบบนี้','sch.picked':'กำลังใช้','sch.outcome':'ผลลัพธ์',
 'sch.pf':'ตัวคูณพื้นชั้น','sch.ff':'ตัวคูณความสูงชั้น','sch.share':'สัดส่วนโครงฐาน','sch.pfloors':'จำนวนชั้นโครงฐาน','sch.pplate':'ตัวคูณพื้นชั้นโครงฐาน','sch.pff':'ตัวคูณความสูงชั้นโครงฐาน','sch.podiumPod':'พื้นที่รวมโครงฐาน','sch.podiumTower':'จำนวนชั้นตึกเหนือโครงฐาน',
 'sch.assumed':'ตัวคูณเหล่านี้เป็นค่าสมมติ ไม่ได้มาจากแหล่งอ้างอิง วางไว้เพื่อให้โต้แย้งได้',
 'io.rule':'พื้นผังสี่เหลี่ยมให้มุมที่ผ่านเงื่อนไขสี่มุม รูปดาวให้แปดมุม นี่คือข้อถกเถียงเรื่องความเป็นไอคอนทั้งหมด เจ้าของต้องการมากกว่าห้องมุมสี่ห้อง และวิธีเดียวที่จะให้ได้คือบัดมุมเข้าไปในผัง',
 'io.base':'มุมที่ผ่านเงื่อนไขที่ระดับฐาน','io.crown':'มุมที่ผ่านเงื่อนไขที่ยอด','io.family':'ผัง','io.now':'ผังที่ใช้อยู่ตอนนี้',
 'io.read':'อ่านตารางนี้ อย่าอ่านคำโฆษณา มุมจะผ่านเงื่อนไขก็ต่อเมื่อสองด้านข้างยาวเกินสองเท่าของระยะหน้าต่าง มุมเวี้ยวออกและต่ำกว่า 145 องศา และพื้นที่นั้นไม่ชนแกน ผังที่หดตัวจะเสียมุมไปตามความสูง',
 'p.1':'สัดส่วนในแนวดิ่ง','p.2':'คำอธิบายมวล','p.3':'ความสูงชั้น','p.4':'จำนวนชั้น','p.5':'ระดับโปรไฟล์กลาง','p.6':'สเกลแกน X โปรไฟล์กลาง','p.7':'สเกลแกน Y โปรไฟล์กลาง','p.8':'สเกลแกน X โปรไฟล์ยอด','p.9':'สเกลแกน Y โปรไฟล์ยอด','p.10':'มุมหมุน',
 'p.map':'ชื่อทั้งหมดเป็นของ Chen จากแผงตั้งค่ามวล หมายเหตุด้านล่างบอกว่าเครื่องมือนี้ถืออะไรจริง ถ้าไม่มีฟิลด์ในโมเดล จะระบุวิธีคำนวณ และจะไม่ทำให้ดูเหมือนของเดิม',
 'p.1.map':'ของเดิม taper สเกลสม่ำเสมอจากฐานถึงยอด',
 'p.2.map':'ของเดิม family ผังที่ใช้สร้างรูปทรง',
 'p.3.map':'ของเดิม height ความสูงชั้น ใช้ฟิลด์เดียวกับทั้งเว็บไซต์',
 'p.4.map':'ของเดิม floors จำนวนชั้นที่ชุดชั้นสร้างจาก',
 'p.5.map':'ไม่มีฟิลด์เดิม โมเดลต่อชิ้นด้วยสเกลต่อเนื่องเดียวและไม่มีจุดเปลี่ยน จึงรับชั้นเปลี่ยนรูปไม่ได้ เก็บไว้เป็นสัดส่วนของความสูงทั้งหมดและขีดบนภาพตัด เลื่อนแล้วเปลี่ยนตำแหน่งที่ตัดเท่านั้น รูปทรงไม่เปลี่ยน',
 'p.6.map':'ไม่มีฟิลด์เดิม อ่านคู่กับสเกลแกน Y กลางว่าเป็นสัดส่วนของผังตรงระดับเปลี่ยนรูป อัตราส่วนของสองค่าขับฟิลด์ aspect',
 'p.7.map':'ไม่มีฟิลด์เดิม อัตราส่วนของทั้งสองขับ aspect โมเดลถือ aspect เดียวตลอดตึก แกน X กับ Y จึงไม่อิสระในแนวดิ่ง',
 'p.8.map':'ไม่มีฟิลด์เดิม อ่านคู่กับสเกลแกน Y ยอดว่าเป็นสัดส่วนของยอด ค่าเฉลี่ยของทั้งสองเขียนลงฟิลด์ taper ซึ่งแยก X กับ Y ไม่ได้',
 'p.9.map':'ไม่มีฟิลด์เดิม ค่าเฉลี่ยของทั้งสองเขียนลง taper เช่นเดียวกัน',
 'p.10.map':'ของเดิม orientation มุมของผังในระบบพิกัดโลก ส่วน twist เก็บแยกต่างหาก เป็นการหมุนต่อชั้น ไม่ใช่การหมุนทั้งผัง',
 'p.writes':'เขียนค่า {field} = {value}',
 'p.bound':'Chen จำกัดการค้นหาของตัวเองไว้ สเกล 0.1 ถึง 2.0 ทีละ 0.1 หมุน 0 ถึง 180 องศาทีละ 10 องศา เพราะเกินนั้นผลลัพธ์ "ไม่สมจริงในทางปฏิบัติ" (§4.2) สไลเดอร์สเกลทั้งสี่ตัวอยู่บนตารางของเขา',
 'ty.status':'สถานะในเคอร์เนลนี้','ty.generated':'สร้างด้วย','ty.exact':'ตรงต้นฉบับ','ty.approx':'ใกล้เคียง','ty.partial':'ทำได้บางส่วน','ty.none':'ไม่ได้ทำซ้ำ','ty.jump':'ไปที่แบบนี้',
 'ty.branch.t':'รูปแขนกิ่งสิบหก','ty.branch.g':'Profile Finding','ty.branch.s':'ใกล้เคียง เคอร์เนลนี้มีดาวแปนแขนและหดตัวขึ้น เป็นท่าทางเดียวกันแต่ครึ่งเดียว ผังสิบหกแขนไม่มีในคลังผัง ต้องเพิ่มพหูหลายเหลี่ยมใหม่ใน geometry.js',
 'ty.setback.t':'แบบถอยหลังมุม','ty.setback.g':'Profile Finding','ty.setback.s':'ใกล้เคียง มุมที่ถูกบัดมีอยู่แล้ว คือผังตัดมุมในคลัง แต่การถอยหลังไม่มี เพราะ profile() ใช้สเกลต่อเนื่องเดียว รูปทรงจึงหยุด ถอย แล้วเดินต่อที่ชั้นเปลี่ยนรูปไม่ได้',
 'ty.faceted.t':'กล่องกระจกหลายเหลี่ยม','ty.faceted.g':'Points Finding','ty.faceted.s':'ไม่ได้ทำซ้ำ เคอร์เนลนี้ทำได้แค่ Profile Finding ส่วน Points Finding หาตำแหน่งจุดที่สัมพันธ์กันในสามมิติแล้วต่อเป็นผิวเหลี่ยม เป็นคนละงานเรขาคณิต และยังไม่ได้ทำในที่นี้',
 'ty.skin.t':'มวลผิวโครงสร้าง','ty.skin.g':'Points Finding','ty.skin.s':'ทำได้บางส่วน ไดแกรดมีอยู่จริงในฐานระบบโครงสร้างและถูกตั้งราคาเป็นระบบโครงสร้าง โดยไม่มีเสากลางพื้น แต่ตัวผิวไดแกรดเองเป็น Points Finding และไม่ได้สร้าง',
 'fam.box':'สี่เหลี่ยม','fam.chamfer':'ตัดมุม','fam.cross':'กางเขน','fam.octagon':'แปดเหลี่ยม','fam.star':'ดาวแปนแขน','fam.rub':'สี่เหลี่ยมจัตุรัสเวียน','fam.triangle':'สามเหลี่ยม','fam.hexagon':'หกเหลี่ยม','fam.oval':'วงรีเหลี่ยม','fam.petal':'สี่กลีบ','fam.pinwheel':'กงล้อ',
 'as.lease':'ค่าสมมติที่แก้ได้',
 'as.end':'โต๊ะนี้ไม่ได้ใช้ข้อมูลตลาด ค่าเช่า ต้นทุน และผลตอบแทนในเครื่องมือนี้เป็นสถานการณ์ที่ปรับค่าได้ ไม่ใช่การประเมินมูลค่า ไม่มีสิ่งใดบนโต๊ะนี้ที่เป็นการตรวจกฎหมาย ความเห็นด้านโครงสร้าง หรือข้อความเรื่องความปลอดภัยและการอนุมัติ',
 'dia.legend':'เส้นทึบคือสิ่งที่เคอร์เนลนี้วาด อ่านจาก profile() เส้นประสีส้มคือสิ่งที่สเกลแกน X และ Y ที่ยอดเรียกร้อง ช่องว่างระหว่างสองเส้นคือส่วนที่เคอร์เนลนี้นี้ถือไม่ได้ เส้นประสีส้มบนภาพตัดคือระดับโปรไฟล์กลาง',
 'ctl.open':'แสดงภาพมวลอาคาร'
},
zh:{
 title:'前台 · 设计任务书',
 lede:'业主要什么，地块允许什么，以及必须放弃什么。下面每一个数字都是可以修改的算式，不是市场估值，不是规范核查，也不是结构意见。',
 'sec.brief':'1 · 任务书',
 'sec.plot':'2–3 · 地块与容积率',
 'sec.floors':'4 · 层数与高度',
 'sec.schemes':'5 · 三个方案',
 'sec.iconic':'6 · 转角办公',
 'sec.params':'7 · 体量参数 · 论文 §4.4，第 94 页',
 'sec.types':'8 · 四种原始体量 · §5.1.1',
 'l.gfa':'业主要的总建筑面积','l.plot':'地块面积','l.far':'容积率','l.plate':'标准层面积','l.cap':'高度上限',
 'u.m2':'m²','u.m':'m','u.pct':'%','u.far':'容积率',
 'r.plot':'地块面积','r.far':'容积率','r.permitted':'可建总面积 = 地块 × 容积率','r.brief':'业主要求','r.delivered':'本方案可交付','r.consumed':'已占额度','r.left':'剩余额度','r.shortfall':'缺口','r.plotNeeded':'按此容积率所需地块',
 'r.storeys':'层数','r.height':'推算高度 = 层数 × 层高','r.stack':'模型层列高度，已含设备层与避难层','r.cap':'高度上限','r.headroom':'距上限余量',
 'st.subj.area':'面积核算',
 'st.fits':'任务书在额度之内。',
 'st.over':'任务书放不下。上方缺口以平方米计，再多造型也解决不了。',
 'st.plotSmall':'在此容积率下，地块承载不了这份任务书。上方已列出所需地块面积。',
 'st.scope':'此处量的是面积与容积率额度。造型本身是否落在场地轮廓、高度上限与核心筒之内，是另一项检查，显示在工作室顶部。两者可能不一致；不一致时，动的是算术，不是造型。',
 'st.hOk':'低于上限。',
 'st.hOver':'高于上限。把面积移到底座，缩小标准层，或提高层高。',
 'sch.curtain.t':'核心筒幕墙',
 'sch.curtain.o':'优化每平方米的外围护造价。中央一根核心筒，楼层板自核心筒悬挑，四周玻璃——完成这份任务书最便宜的做法。',
 'sch.curtain.s':'牺牲转角办公。矩形标准层只有四个角，悬挑出来的板又深，卖得出去的采光离窗更远。',
 'sch.podium.t':'裙楼加塔楼',
 'sch.podium.o':'优化额度。低层裙楼在不占用高度上限的情况下承载面积，上面的塔楼因此可以更矮。',
 'sch.podium.s':'牺牲轮廓。两个高度读起来是两栋楼，而且塔楼是较小的那一半。',
 'sch.solid.t':'实墙低层',
 'sch.solid.o':'优化立面的耐久性。百货商店式的墙——实心、内部照明、内部维护，不必每个周期重换幕墙胶。',
 'sch.solid.s':'牺牲采光与标识性。深进深与少层数读起来是一只盒子。',
 'sch.pick':'采用此方案','sch.picked':'正在使用','sch.outcome':'结果',
 'sch.pf':'标准层系数','sch.ff':'层高系数','sch.share':'裙楼面积占比','sch.pfloors':'裙楼层数','sch.pplate':'裙楼标准层系数','sch.pff':'裙楼层高系数','sch.podiumPod':'裙楼建筑面积','sch.podiumTower':'裙楼以上塔楼层数',
 'sch.assumed':'这些系数是假设，没有出处，放在这里就是为了让你可以跟它争论。',
 'io.rule':'方形标准层给出四个合格转角，星形给出八个。这就是关于标识性的全部争论：业主要的不止四间转角办公，唯一的办法就是把转角切进平面里。',
 'io.base':'底层合格转角数','io.crown':'顶部合格转角数','io.family':'平面','io.now':'当前平面',
 'io.read':'读这张表，不要读口号。只有当转角两侧的边都超过面宽的两倍、夹角为凸且小于 145°、且该区域避开核心筒时，这个转角才算数。平面一旦向上收窄，转角就会消失。',
 'p.1':'垂直比例','p.2':'体量描述','p.3':'层高','p.4':'层数','p.5':'中段轮廓标高','p.6':'中段轮廓 X 向缩放','p.7':'中段轮廓 Y 向缩放','p.8':'顶部轮廓 X 向缩放','p.9':'顶部轮廓 Y 向缩放','p.10':'旋转角',
 'p.map':'这些名称全部来自陈寿恒的体量参数面板。下面的说明写的是这个工具真正持有的东西。模型里没有对应字段的地方，写明推导方式，不会假装它是原生的。',
 'p.1.map':'原生字段 taper，从底层到顶部的均匀缩放。',
 'p.2.map':'原生字段 family，放样所依据的平面。',
 'p.3.map':'原生字段 height，层高，与全站使用同一个字段。',
 'p.4.map':'原生字段 floors，层列据此生成。',
 'p.5.map':'无原生字段。模型用单一连续缩放放样，没有断点，承载不了转换层。此处按总高比例保存，并在剖面图上标出；移动它改变的是剖切位置，不是几何。',
 'p.6.map':'无原生字段。与中段 Y 向缩放合读，即转换标高处的平面比例；两值之比驱动 aspect 字段。',
 'p.7.map':'无原生字段。两值之比驱动 aspect。模型全塔只持有一个 aspect，X 与 Y 在竖向上并不独立。',
 'p.8.map':'无原生字段。与顶部 Y 向缩放合读，即顶部的比例；两值均值写入单一的 taper 字段，该字段无法分开 X 与 Y。',
 'p.9.map':'无原生字段。两值均值写入 taper，同上。',
 'p.10.map':'原生字段 orientation，平面在世界坐标中的角度。模型另存 twist，那是逐层旋转，不是整张平面的旋转。',
 'p.writes':'写入 {field} = {value}',
 'p.bound':'陈寿恒自己划定了搜索边界——缩放 0.1 到 2.0，步长 0.1；旋转 0 到 180 度，步长 10 度——因为超出这个范围的结果「在实践上不现实」（§4.2）。四个缩放滑杆都留在他这张表上。',
 'ty.status':'在本内核中的状态','ty.generated':'由何生成','ty.exact':'精确','ty.approx':'近似','ty.partial':'部分','ty.none':'未复现','ty.jump':'跳到这个',
 'ty.branch.t':'十六分枝体量','ty.branch.g':'轮廓查找法','ty.branch.s':'近似。本内核只有八角星并向上收窄，是同一个动作的一半。十六瓣平面不在平面库中，需要在 geometry.js 里新增一个多边形。',
 'ty.setback.t':'切角退台型','ty.setback.g':'轮廓查找法','ty.setback.s':'近似。切角是有的——切角平面就在库里。退台没有。profile() 只施加一种连续缩放，放样无法在转换层停下、退后再继续。',
 'ty.faceted.t':'多折面玻璃盒','ty.faceted.g':'点位查找法','ty.faceted.s':'未复现。本内核只做 Profile Finding。Points Finding 是在空间中定位相互关联的点并连接成折面面片，是另一种几何运算，此处并未实现。',
 'ty.skin.t':'结构表皮体量','ty.skin.g':'点位查找法','ty.skin.s':'部分。网架结构作为结构体系确实存在，并按结构体系计价，标准层内无柱。但网架面本身属于 Points Finding，并未生成。',
 'fam.box':'矩形','fam.chamfer':'切角','fam.cross':'十字形','fam.octagon':'八边形','fam.star':'八角星','fam.rub':'旋转正方形','fam.triangle':'三角形','fam.hexagon':'六边形','fam.oval':'多边形椭圆','fam.petal':'四瓣形','fam.pinwheel':'风车形',
 'as.lease':'可修改的假设值。',
 'as.end':'本台不使用任何市场数据。本工具中的租金、成本与回报都是可以改动的情景，不是估值。这里没有任何一项是规范核查、结构意见，或关于安全与审批的陈述。',
 'dia.legend':'实线是本内核画出的形状，直接来自 profile()。琥珀色虚线是顶部 X 与 Y 向缩放在顶部要求的形状。两者之间的差距，就是本内核承载不了的部分。剖面上的琥珀色虚线是中段轮廓标高。',
 'ctl.open':'显示体量图'
}
};

Object.assign(BRIEF_I18N.en,{"sec.params": "7 · Massing parameters · thesis §4.4, pp. 52–53", "st.hOver": "Over the cap. Reduce storeys or floor-to-floor height, or increase the plate area and redistribute the brief.", "sch.curtain.o": "Uniform tower study: assumed plate and storey height. Envelope, frame and leasing costs need project evidence; this is not a cheapest-build finding.", "io.rule": "Some nonrectangular profiles can offer more qualifying corners. The counts depend on frontage, core fit, taper and size; the table computes them for this design.", "p.10.map": "Mapped to twist: total profile rotation from grade to crown. World orientation is controlled separately in Sun study.", "sch.apply": "Apply the tower study", "sch.applyNote": "Resizes a custom uniform tower to this scheme’s tower area. A podium remains a separate brief calculation; the tower renderer does not construct it. Floor count is limited to 12–70; core and site constraints still apply."});
Object.assign(BRIEF_I18N.th,{"sec.params": "7 · พารามิเตอร์มวลอาคาร · วิทยานิพนธ์ 4.4 หน้า 52–53", "st.hOver": "เกินเพดาน ลดจำนวนชั้นหรือความสูงต่อชั้น หรือขยายพื้นที่ชั้นและจัดสรรโจทย์ใหม่", "sch.curtain.o": "ศึกษาตึกสม่ำเสมอด้วยพื้นที่ชั้นและความสูงที่สมมติ ต้นทุนเปลือก โครงสร้าง และการปล่อยเช่าต้องใช้ข้อมูลโครงการ ยังสรุปไม่ได้ว่าสร้างถูกที่สุด", "io.rule": "ผังบางแบบที่ไม่ใช่สี่เหลี่ยมอาจมีมุมที่เข้าเกณฑ์มากขึ้น จำนวนขึ้นกับหน้ากว้าง แกนกลาง การสอบ และขนาด ตารางคำนวณจากแบบปัจจุบัน", "p.10.map": "เชื่อมกับมุมบิดรวมของผังจากฐานถึงยอด ทิศอาคารในพิกัดโลกปรับแยกในแผงแสงอาทิตย์", "sch.apply": "ใช้ส่วนตึกของทางเลือกนี้", "sch.applyNote": "ปรับตึกชั้นสม่ำเสมอให้มีพื้นที่ตามส่วนตึกของทางเลือก โพเดียมยังเป็นการคำนวณแยก ไม่ได้ถูกสร้างในภาพตึก จำกัด 12–70 ชั้น และยังต้องตรวจแกนกลางกับที่ดิน"});
Object.assign(BRIEF_I18N.zh,{"sec.params": "7 · 体量参数 · 论文 §4.4，第 52–53 页", "st.hOver": "超过高度上限。减少楼层或层高，或增大楼板后重新分配面积。", "sch.curtain.o": "等截面塔楼研究：楼板与层高均为假设。外墙、结构和招租成本需要项目证据，不能据此判定造价最低。", "io.rule": "部分非矩形平面可能提供更多合格转角，数量取决于临面长度、核心筒、收分和尺寸。表格按当前设计计算。", "p.10.map": "映射到从底部至顶部的总扭转角。世界坐标朝向在日照研究中另行控制。", "sch.apply": "采用本方案的塔楼研究", "sch.applyNote": "将自定义等高塔楼调整至本方案塔楼部分的面积。裙房仍是单独的任务书计算，塔楼视图并未构建裙房。楼层限于 12–70，仍须核查核心筒及用地约束。"});

const SCALE_MIN=.1,SCALE_MAX=2,SCALE_STEP=.1;// Chen's own search grid, §4.2.
// Desk inputs live at module scope so they survive the re-render that a
// changed() call triggers; the app's state is never mutated from here.
const desk={gfa:120000,plot:9000,far:8,plate:1800,cap:260,scheme:'curtain',
 curtain:{pf:1.15,ff:1},podium:{share:.3,floors:6,pf:2,ff:1.5},solid:{pf:1.5,ff:1.25},
 mx:1,my:1,tx:.8,ty:.8,mLevel:.55,seeded:false};
const DESK_INITIAL=structuredClone(desk);
export function resetBrief(){Object.assign(desk,structuredClone(DESK_INITIAL))}
const SCHEMES=['curtain','podium','solid'];
const TYPES=[
 ['branch',{family:'star',taper:.55,twist:0,orientation:0,aspect:1}],
 ['setback',{family:'chamfer',taper:.8,twist:0,orientation:0,aspect:1}],
 ['faceted',{family:'oval',taper:1,twist:0,orientation:0,aspect:1}],
 ['skin',{family:'box',taper:1,twist:0,orientation:0,aspect:1,system:'diagrid'}]];
// None of the four is exact in this kernel, and the tag says so per row rather
// than in one blanket disclaimer.
const TYPE_STATUS={branch:'ty.approx',setback:'ty.approx',faceted:'ty.none',skin:'ty.partial'};



const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

/** Three schemes, three genuinely different pieces of arithmetic — not three
 *  labels on one result. The podium genuinely splits the brief, which is the
 *  whole point of the scheme; the other two change plate and storey height. */
export function schemeResult(k,state,inputs=desk){
 const f2f=state.height||4.1,plate=Math.max(1,inputs.plate);
 if(k==='podium'){
  const p=inputs.podium,podiumPlate=plate*p.pf;
  const podN=p.share<=0?0:Math.max(Math.round(p.floors),Math.ceil(inputs.gfa*clamp(p.share,0,.9)/podiumPlate));
  const podG=podiumPlate*podN,towN=Math.ceil(Math.max(0,inputs.gfa-podG)/plate),towG=towN*plate;
  const podH=podN*f2f*p.ff,towH=towN*f2f;
  return {plate,podiumPlate,podiumN:podN,podiumGfa:podG,podiumH:podH,towerN:towN,towerGfa:towG,towerH:towH,n:podN+towN,gfa:podG+towG,h:podH+towH};
 }
 const f=k==='solid'?inputs.solid:inputs.curtain,p=Math.max(1,plate*f.pf),n=Math.max(1,Math.ceil(inputs.gfa/p)),h=n*f2f*f.ff;
 return {plate:p,podiumPlate:0,podiumN:0,podiumGfa:0,podiumH:0,towerN:n,towerGfa:n*p,towerH:h,n,gfa:n*p,h};
}
// Mirrors the studio span slider (app.js schema.span) so an applied brief stays editable.
export const SPAN_RANGE=[32,62];
export function fitBriefTower(state,result,scheme){
 const floors=Math.max(12,Math.min(70,result.towerN||12)),height=Math.max(3,Math.min(6,scheme==='solid'?state.height*desk.solid.ff:state.height*(scheme==='curtain'?desk.curtain.ff:1)));
 const candidate={...state,program:'custom',floors,height:Math.round(height*20)/20,span:48},target=Math.max(1,result.towerGfa);
 candidate.span*=Math.sqrt(target/grossOf(candidate));return {program:'custom',floors,height:candidate.height,span:candidate.span};
}

/* ── the massing diagram ───────────────────────────────────────────────────
   Two truths in one frame. The solid outline is what profile() actually
   returns; the dashed one is the independent top X/Y scale the thesis asks
   for. Drawing both is more honest than quietly dropping one. */
function massingSVG(state){
 const base=profile(state,0),crown=base.map(([x,y])=>[x*desk.tx,y*desk.ty]);
 const reach=Math.max(1,...[...base,...crown].map(([x,y])=>Math.max(Math.abs(x),Math.abs(y))));
 const k=74/reach,cx=104,cy=50;
 const pts=p=>p.map(([x,y])=>`${(cx+x*k).toFixed(1)},${(cy-y*k).toFixed(1)}`).join(' ');
 const widthAt=t=>{const p=profile(state,t);return Math.max(...p.map(q=>q[0]))-Math.min(...p.map(q=>q[0]))};
 let sec='';
 for(let i=0;i<=6;i++){const t=i/6;sec+=`<line x1="190" y1="${(10+t*92).toFixed(1)}" x2="${(190+Math.max(2,widthAt(t)*k)).toFixed(1)}" y2="${(10+t*92).toFixed(1)}" stroke="currentColor" stroke-width="1" opacity=".45"/>`}
 const mid=10+clamp(desk.mLevel,0,1)*92;
 sec+=`<line x1="186" y1="${mid.toFixed(1)}" x2="300" y2="${mid.toFixed(1)}" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4 3"/>`;
 return`<svg viewBox="0 0 308 112" aria-hidden="true" focusable="false">`+
  `<polygon points="${pts(base)}" fill="none" stroke="currentColor" stroke-width="2"/>`+
  `<polygon points="${pts(crown)}" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="5 3"/>${sec}</svg>`;
}

let briefTab=0;
export function renderBrief({lang,state,changed,onInputs}){
 const c=BRIEF_I18N[lang]||BRIEF_I18N.en;
 const host=document.getElementById('briefDesk');if(!host)return;
 if(!desk.seeded){
  desk.cap=Number.isFinite(state.maxHeight)?state.maxHeight:260;
  // Rounded onto Chen's own 0.1 scale grid so the slider thumb matches the value.
  desk.tx=desk.ty=clamp(Math.round((state.taper||1)/SCALE_STEP)*SCALE_STEP,SCALE_MIN,SCALE_MAX);
  desk.mx=desk.my=clamp(Math.round((state.aspect||1)/SCALE_STEP)*SCALE_STEP,SCALE_MIN,SCALE_MAX);
  desk.seeded=true;
 }
 // Desk-only edits re-render from the same state; edits that push to the app
 // rely on the integrator re-invoking renderBrief with the new state.
 const again=()=>{renderBrief({lang,state,changed,onInputs});onInputs?.()};
 const focused=host.contains(document.activeElement)?document.activeElement.id:null;
 const locale=lang==='th'?'th-TH':lang==='zh'?'zh-CN':'en-US';
 const num=(v,d=0)=>(Number.isFinite(v)?v:0).toLocaleString(locale,{minimumFractionDigits:d,maximumFractionDigits:d});

 const r=schemeResult(desk.scheme,state);
 const far=Math.max(0,desk.far),permitted=Math.max(0,desk.plot)*far;
 const consumed=permitted>0?r.gfa/permitted*100:Infinity,over=r.gfa-permitted;

 host.replaceChildren();
 const root=el('section',undefined,'br-desk');
 root.append(el('h3',c.title,'br-h'),el('p',c.lede,'br-lede'));

 const section=head=>{const s=el('section',undefined,'br-sec');s.append(el('h4',head));return s};
 const ledger=(label,value,cls)=>{const tr=el('tr');const th=el('th',label);th.scope='row';tr.append(th,el('td',value,cls));return tr};
 const fields=(parent)=>{const f=el('div',undefined,'br-fields');parent.append(f);return f};
 const number=(parent,id,label,min,step,value,on)=>{
  const i=el('input');i.type='number';i.id=id;i.min=String(min);i.step=String(step);i.value=value;const maxima={'br-gfa':1e7,'br-plot':1e6,'br-far':100,'br-plate':20000,'br-cap':1000,'br-floors':70};if(maxima[id])i.max=String(maxima[id]);
  i.onchange=()=>{if(!Number.isFinite(i.valueAsNumber)||!i.checkValidity()||i.valueAsNumber<min){i.reportValidity();return}on(i.valueAsNumber);if(id!=='br-floors')again()};
  const l=el('label',label);l.htmlFor=id;parent.append(l,i);return i};
 const slider=(parent,id,label,min,max,step,value,on)=>{
  const i=el('input');i.type='range';i.id=id;i.min=String(min);i.max=String(max);i.step=String(step);i.value=value;const maxima={'br-gfa':1e7,'br-plot':1e6,'br-far':100,'br-plate':20000,'br-cap':1000,'br-floors':70};if(maxima[id])i.max=String(maxima[id]);
  const l=el('label',label);l.htmlFor=id;
  // Commit on release: every commit rebuilds the desk, which would drop a slider mid-drag.
  i.onchange=()=>on(Number(i.value));
  parent.append(l,i);return i};
 const table=(head)=>{const t=el('table',undefined,'br-ledger');if(head){const hr=el('thead');const tr=el('tr');for(const k of head){const th=el('th',c[k]);th.scope='col';tr.append(th)}hr.append(tr);t.append(hr)}const b=el('tbody');t.append(b);return{t,b}};
 const verdict=(parent,text,flag)=>{const p=el('p',text,flag?'br-flag':undefined);p.style.margin='0 0 9px';parent.append(p)};

 /* 1 · the brief */
 const s1=section(c['sec.brief']);
 number(fields(s1),'br-gfa',c['l.gfa'],1000,1000,desk.gfa,v=>desk.gfa=v);
 s1.append(el('p',c['as.lease'],'br-note'));

 /* 2–3 · plot, FAR, plate — the arithmetic, shown line by line */
 const s2=section(c['sec.plot']);
 const f2=fields(s2);
 number(f2,'br-plot',c['l.plot'],1,'any',desk.plot,v=>desk.plot=v);
 number(f2,'br-far',c['l.far'],.1,.1,desk.far,v=>desk.far=v);
 number(f2,'br-plate',c['l.plate'],50,50,desk.plate,v=>desk.plate=v);
 const t2=table();
 t2.b.append(
  ledger(c['r.plot'],`${num(desk.plot)} ${c['u.m2']}`),
  ledger(c['r.far'],num(desk.far,1)),
  ledger(c['r.permitted'],`${num(permitted)} ${c['u.m2']}`),
  ledger(c['r.brief'],`${num(desk.gfa)} ${c['u.m2']}`),
  ledger(c['r.delivered'],`${num(r.gfa)} ${c['u.m2']}`));
 s2.append(t2.t);
 const rule=document.createElementNS('http://www.w3.org/2000/svg','svg');
 rule.setAttribute('viewBox','0 0 160 16');rule.setAttribute('class','br-rule');rule.setAttribute('aria-hidden','true');
 const share=permitted>0?Math.max(0,r.gfa)/Math.max(permitted,r.gfa):0;
 const mark=(1+158*Math.max(0,Math.min(1,share))).toFixed(1);
 let ticks='';for(let i=0;i<=10;i++){const tx=(1+158*i/10).toFixed(1);ticks+=`M${tx} ${i%5?8:4}V14`;}
 if(over>0)rule.classList.add('over');
 rule.innerHTML=`<path d="M1 11H159" fill="none" stroke="currentColor" stroke-width="1"/><path d="${ticks}" fill="none" stroke="currentColor" stroke-width="1"/><path d="M${mark} 1V15" fill="none" stroke="currentColor" stroke-width="1.6"/>`;
 s2.append(rule);
 const t2b=table();
 t2b.b.append(
  ledger(c['r.consumed'],Number.isFinite(consumed)?`${num(consumed,1)}${c['u.pct']}`:'—'),
  ledger(c['r.left'],`${num(permitted-r.gfa)} ${c['u.m2']}`,over>0?'br-flag':undefined),
  ledger(c['r.shortfall'],`${num(Math.max(0,over))} ${c['u.m2']}`,over>0?'br-flag':undefined),
  ledger(c['r.plotNeeded'],`${num(far>0?r.gfa/far:0)} ${c['u.m2']}`));
 s2.append(t2b.t);
 // The verdict names its own subject, because the studio header carries a
  // second, different answer to the same question. See st.scope.
  verdict(s2,c['st.subj.area']+' · '+(over>0?(desk.plot<r.gfa/far?c['st.plotSmall']:c['st.over']):c['st.fits']),over>0);
  s2.append(el('p',c['st.scope'],'br-note'));

 /* 4 · storeys and height */
 const s3=section(c['sec.floors']);
 number(fields(s3),'br-cap',c['l.cap'],10,10,desk.cap,v=>desk.cap=v);
 const t3=table();
 t3.b.append(
  ledger(c['r.storeys'],num(r.n)),
  ledger(c['r.height'],`${num(r.h,1)} ${c['u.m']}`),
  ledger(c['r.stack'],`${num(stackHeight({...state,floors:r.n}),1)} ${c['u.m']}`),
  ledger(c['r.cap'],`${num(desk.cap)} ${c['u.m']}`),
  ledger(c['r.headroom'],`${num(desk.cap-r.h,1)} ${c['u.m']}`,r.h>desk.cap?'br-flag':undefined));
 s3.append(t3.t);
 verdict(s3,r.h>desk.cap?c['st.hOver']:c['st.hOk'],r.h>desk.cap);

 /* 5 · the three schemes */
 const s4=section(c['sec.schemes']);
 const cards=el('div',undefined,'br-cards');
 for(const k of SCHEMES){
  const o=schemeResult(k,state),card=el('div',undefined,'br-card'+(desk.scheme===k?' br-on':''));
  const b=el('button',c[`sch.${k}.t`]);b.type='button';b.id='br-sch-'+k;
  b.setAttribute('aria-pressed',String(desk.scheme===k));
  b.onclick=()=>{desk.scheme=k;again()};
  const dl=el('dl');
  const pair=(a,v)=>dl.append(el('dt',a),el('dd',v));
  pair(c['sch.outcome'],`${num(o.n)} · ${num(o.h,1)} ${c['u.m']} · ${num(o.gfa)} ${c['u.m2']}`);
  if(k==='podium')pair(c['sch.podiumPod'],`${num(o.podiumGfa)} ${c['u.m2']}`);
  card.append(b,dl,el('p',c[`sch.${k}.o`],'br-opt'),el('p',c[`sch.${k}.s`],'br-sac'));
  cards.append(card);
 }
 s4.append(cards);
 const own=desk[desk.scheme],f4=fields(s4);
 if(desk.scheme==='podium'){
  slider(f4,'br-share',c['sch.share'],0,.6,.05,own.share,v=>{own.share=v;again()});
  slider(f4,'br-pfloors',c['sch.pfloors'],1,12,1,own.floors,v=>{own.floors=v;again()});
  slider(f4,'br-pplate',c['sch.pplate'],1,4,.1,own.pf,v=>{own.pf=v;again()});
  slider(f4,'br-pff',c['sch.pff'],1,2,.1,own.ff,v=>{own.ff=v;again()});
 }else{
  slider(f4,'br-pf',c['sch.pf'],.6,2,.05,own.pf,v=>{own.pf=v;again()});
  slider(f4,'br-ff',c['sch.ff'],.8,2,.05,own.ff,v=>{own.ff=v;again()});
 }
 const apply=el('button',c['sch.apply']);apply.type='button';apply.id='br-apply';apply.onclick=()=>{const patch=fitBriefTower(state,r,desk.scheme);if(!Number.isFinite(patch.span)||patch.span<SPAN_RANGE[0]||patch.span>SPAN_RANGE[1]){const note=el('p',c['sch.tooLarge'],'br-flag');apply.after(note);return}changed(patch)};
 s4.append(apply,el('p',c['sch.applyNote'],'br-note'),el('p',c['sch.assumed'],'br-note'));

 /* 6 · corner offices, computed per family rather than asserted */
 const s5=section(c['sec.iconic']);
 s5.append(el('p',c['io.rule'],'br-read'));
 const t5=table(['io.family','io.base','io.crown','ty.jump']);
 for(const f of Object.keys(families)){
  const probe={...state,family:f},tr=el('tr');
  tr.append(el('th',c['fam.'+f]||f));
  for(const p of [profile(probe,0),profile(probe,1)]){
   const z=cornerZones(p,probe).length;
   tr.append(el('td',String(z),f===state.family?'br-cur':z===0?'br-note':undefined));
  }
  const cell=el('td'),jb=el('button',c['ty.jump']);jb.type='button';jb.id='br-fam-'+f;jb.className='br-jump';
  jb.onclick=()=>changed({family:f});
  cell.append(jb);tr.append(cell);
  t5.b.append(tr);
 }
 s5.append(t5.t,el('p',c['io.read'],'br-note'));

 /* 7 · the thesis parameters, named as Chen named them */
 const s6=section(c['sec.params']);
 s6.append(el('p',c['p.map'],'br-note'));
 const f6=fields(s6);
 const sel=el('select');sel.id='br-family';
 for(const f of Object.keys(families)){const o=el('option',c['fam.'+f]||f);o.value=f;sel.append(o)}
 sel.value=state.family;sel.onchange=()=>changed({family:sel.value});
 const lf=el('label',c['p.2']);lf.htmlFor=sel.id;f6.append(lf,sel);
 slider(f6,'br-taper',c['p.1'],.6,1.2,.02,state.taper,v=>changed({taper:v}));
 slider(f6,'br-height',c['p.3'],3,6,.05,state.height,v=>changed({height:v}));
 number(f6,'br-floors',c['p.4'],12,1,state.floors,v=>changed({floors:v}));
 // The four scale sliders sit on Chen's grid and write the kernel fields they
 // can reach; which field is named underneath, so nothing looks native.
 slider(f6,'br-mx',c['p.6'],SCALE_MIN,SCALE_MAX,SCALE_STEP,desk.mx,v=>{desk.mx=v;changed({aspect:clamp(desk.mx/desk.my,.25,4)})});
 slider(f6,'br-my',c['p.7'],SCALE_MIN,SCALE_MAX,SCALE_STEP,desk.my,v=>{desk.my=v;changed({aspect:clamp(desk.mx/desk.my,.25,4)})});
 slider(f6,'br-tx',c['p.8'],SCALE_MIN,SCALE_MAX,SCALE_STEP,desk.tx,v=>{desk.tx=v;changed({taper:clamp((desk.tx+desk.ty)/2,SCALE_MIN,SCALE_MAX)})});
 slider(f6,'br-ty',c['p.9'],SCALE_MIN,SCALE_MAX,SCALE_STEP,desk.ty,v=>{desk.ty=v;changed({taper:clamp((desk.tx+desk.ty)/2,SCALE_MIN,SCALE_MAX)})});
 slider(f6,'br-rot',c['p.10'],0,180,10,state.twist,v=>changed({twist:v}));
 slider(f6,'br-mlevel',c['p.5'],.05,.95,.05,desk.mLevel,v=>{desk.mLevel=v;again()});
 const t6=table();
 const writes=(field,value)=>c['p.writes'].replace('{field}',field).replace('{value}',value);
 t6.b.append(
  ledger(c['p.5'],c['p.5.map']),
  ledger(`${c['p.6']} / ${c['p.7']}`,`${c['p.6.map']} → ${writes('aspect',num(state.aspect,2))}`),
  ledger(`${c['p.8']} / ${c['p.9']}`,`${c['p.8.map']} → ${writes('taper',num(state.taper,2))}`),
  ledger(c['p.10'],c['p.10.map']));
 s6.append(t6.t,el('p',c['p.bound'],'br-note'));
 const det=el('details'),sum=el('summary',c['ctl.open']);
 const fig=el('div',undefined,'br-svg');fig.innerHTML=massingSVG(state);
 det.append(sum,fig,el('p',c['dia.legend'],'br-note'));
 s6.append(det);

 /* 8 · the four original massing types */
 const s7=section(c['sec.types']);
 const t7=table(['ty.status','ty.jump']);
 for(const [k,patch]of TYPES){
  const cell=el('td');
  cell.append(el('strong',c[`ty.${k}.t`]),el('p',c[`ty.${k}.s`],'br-note'),
   el('p',`${c['ty.generated']}: ${c[`ty.${k}.g`]}`,'br-note'),
   el('span',c[TYPE_STATUS[k]],'br-tag'));
  const act=el('td'),jb=el('button',c['ty.jump']);jb.type='button';jb.id='br-type-'+k;jb.className='br-jump';
  jb.onclick=()=>changed(patch);
  act.append(jb);
  const tr=el('tr');tr.append(cell,act);t7.b.append(tr);
 }
 s7.append(t7.t);
 const tabs=el('nav',undefined,'brief-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label',c.title);
 const sections=[[s1,s2,s3],[s4,s5],[s6,s7]],names={en:['Land & brief','Schemes & corners','Thesis controls'],th:['ที่ดินและโจทย์','ทางเลือกและมุม','ตัวควบคุมวิทยานิพนธ์'],zh:['用地与任务书','方案与转角','论文参数']}[lang];
 const select=i=>{briefTab=i;[...tabs.children].forEach((b,j)=>{b.setAttribute('aria-selected',String(i===j));b.tabIndex=i===j?0:-1});sections.forEach((group,j)=>group.forEach(s=>s.hidden=i!==j))};
 names.forEach((name,i)=>{const b=el('button',name);b.type='button';b.setAttribute('role','tab');b.onclick=()=>select(i);b.onkeydown=e=>{let n;if(e.key==='ArrowRight')n=(i+1)%3;if(e.key==='ArrowLeft')n=(i+2)%3;if(n!==undefined){e.preventDefault();select(n);tabs.children[n].focus()}};tabs.append(b)});
 root.append(tabs,s1,s2,s3,s4,s5,s6,s7,el('p',c['as.end'],'br-disclaimer'));select(briefTab);
 host.append(root);

 if(focused)document.getElementById(focused)?.focus({preventScroll:true});
}
export function getBriefStudy(state){return {inputs:JSON.parse(JSON.stringify(desk)),scheme:schemeResult(desk.scheme,state),tier:'brief arithmetic; hypothetical uniform tower application; no podium geometry'}}
Object.assign(BRIEF_I18N.en,{'sch.tooLarge':'This tower area needs a span beyond the model range. Reduce the brief or revise the scheme before applying.'});
Object.assign(BRIEF_I18N.th,{'sch.tooLarge':'พื้นที่ส่วนตึกต้องใช้หน้ากว้างเกินช่วงโมเดล โปรดลดโจทย์หรือปรับทางเลือกก่อนนำไปใช้'});
Object.assign(BRIEF_I18N.zh,{'sch.tooLarge':'该塔楼面积所需跨度超出模型范围，请先减少面积或调整方案。'});

export function setBriefInputs(patch){
 const bounds={plot:[1,1e6],far:[.1,100]};
 if(!patch||Object.entries(patch).some(([key,value])=>!Object.hasOwn(bounds,key)||!Number.isFinite(value)||value<bounds[key][0]||value>bounds[key][1]))return false;
 Object.assign(desk,patch);return true;
}

/** Restore a full saved Brief atomically; omitted legacy fields use defaults,
 * never the assumptions of whatever study happens to be open. */
export function normalizeBriefInputs(snapshot){
 if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))return false;
 const next=structuredClone(DESK_INITIAL),bounds={gfa:[1000,1e7],plot:[1,1e6],far:[.1,100],plate:[50,20000],cap:[10,1000],mx:[.1,2],my:[.1,2],tx:[.1,2],ty:[.1,2],mLevel:[.05,.95]};
 const number=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
 for(const [k,v]of Object.entries(snapshot)){
  if(Object.hasOwn(bounds,k)){if(!number(v,...bounds[k]))return false;next[k]=v}
  else if(k==='scheme'){if(!SCHEMES.includes(v))return false;next[k]=v}
  else if(k==='seeded'){if(typeof v!=='boolean')return false;next[k]=v}
  else if(['curtain','solid','podium'].includes(k)){
   if(!v||typeof v!=='object'||Array.isArray(v))return false;
   const limits=k==='podium'?{share:[0,.6],floors:[1,12],pf:[1,4],ff:[1,2]}:{pf:[.6,2],ff:[.8,2]};
   for(const [field,value]of Object.entries(v)){
    if(!Object.hasOwn(limits,field)||!number(value,...limits[field])||(field==='floors'&&!Number.isInteger(value)))return false;
    next[k][field]=value;
   }
  }else return false;
 }
 return next;
}
export function restoreBriefInputs(snapshot){
 const next=normalizeBriefInputs(snapshot);if(!next)return false;Object.assign(desk,next);return true;
}
