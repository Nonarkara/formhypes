/* The manual, in three languages.

   The prose here is the only part of the manual that is written by hand. Every
   table in it is built at runtime from the live model — the ranges come from
   schema.js, which is the same table the sliders are built from. A manual that
   copies the numbers is a manual that lies the first time a bound moves, so the
   numbers are never written down here.

   Voice: short sentences. The reader is standing in front of a working
   instrument, not reading a brochure. Every claim about what a control does is
   checkable against the code, so nothing here says "more realistic" or
   "industry-leading" — those are not things a drawing can be. */

export const MANUAL={
en:{
 title:'Manual',
 lede:'Nine tools. Every figure is computed in your browser from the settings you choose. Nothing is measured from a real building.',
 open:'Manual',
 close:'Close',
 sections:[
  ['start','Start here','Pick a form from the atlas at the top of the left rail, then move a slider. The tower, the plan and every number on the right move together. The level slider marks the same floor in the plan and in the core section.'],
  ['bar','The tool row','The nine marks under the header are the whole instrument. Each one opens a workspace: the drawing on the left is the form you are holding, and the desk on the right is the thing you came to read. They are named by what they draw, not by what they are called.'],
  ['rail','The left rail','Everything that changes the building is here, in four groups. Selects choose from a fixed library; sliders move a number. The sun study sets the city, the date and the time; the core section and the façade both read them.'],
  ['check','Is it working?','The check at the foot of this manual reads the live page: every workspace has a drawing, every control is on its rail, every figure is filled. It is the manual checking itself, so a broken build says so here rather than looking fine.'],
  ['honest','What it is not','This is a concept instrument. The lift groups, water zones, drainage stacks and wall assemblies are sized by published method and then checked against them, but nothing here is engineered, certified or approved. The money is a scenario: illustrative rent, occupancy and reserve, with no market data behind them. Every figure names its source on the drawing.'],
  ['keys','Keyboard','Tab moves between the tools; Left and Right arrows move along the bar. On the tower, arrow keys orbit and plus and minus zoom. Every control is reachable without a mouse.'],
  ['study','Studies','Save puts the current scheme on the shelf. The shelf survives a reload. Explore holds the area fixed and searches other forms for it, so any difference you read afterwards is the form and not the size.'],
  ['lang','Three languages','English, Thai and Chinese, switched at the top. Every table, every label and every sentence is translated rather than falling back, so a Chinese reader is never handed an English word in a Chinese sentence. Units and proper nouns stay Latin.'],
  ['source','Sources','Geometry follows the 2006 MIT thesis parameters and the standards named on each drawing. The core is sized on CIBSE Guide D as restated in ISO 8100-32, water on the usual fixture-pressure limits, and drainage on BS EN 12056-2. Open any drawing and the source is printed underneath it.']
 ],
 table:{
  head:['Control','Range','Reads as','Moves'],
  assumption:'assumption',
  derived:'derived',
  relative:'relative to this scheme',
  groups:['Form','Site & constraints','Rent','Orientation']
 },
 checks:{
  title:'System check',
  lede:'Run against the page you are looking at.',
  run:'Run the check',
  running:'Checking…',
  pass:'pass',
  fail:'fail',
  labels:{
   workspaces:'Every tool opens a drawing',
   controls:'Every control sits on a rail',
   ranges:'Every range matches the model',
   figures:'Every figure is filled',
   i18n:'Three languages, same keys',
   glyphs:'Every tool is named in all three languages',
   forms:'Every form family draws'
  },
  words:{tools:'tools',toolsNamed:'tools named in every language',everyPanel:'every panel present',
   noPanel:'no panel for',noButton:'no button for',unnamed:'unnamed:',
   controls:'controls',everyControl:'every control on a rail and labelled',onNoRail:'on no rail:',
   notBuilt:'no slider built for',unlabelled:'unlabelled:',rangesAgree:'ranges agree with the model',
   drifted:'live bounds differ from the model:',filled:'figures filled',empty:'empty:',
   noNan:'no NaN anywhere',notANumber:'NaN or undefined in:',keysTimes3:'keys × 3 languages',
   keyMismatch:'key sets differ',formsDraw:'form families draw a finite plan',notDrawn:'did not draw:'},
  ok:'Everything the manual describes is present.',
  bad:'Something the manual describes is missing. The failing line names it.'
 }
},
th:{
 title:'คู่มือ',
 lede:'เครื่องมือเก้าชิ้น ทุกตัวเลขคำนวณในเบราว์เซอร์ของคุณจากค่าที่คุณเลือก ไม่มีการวัดจากอาคารจริง',
 open:'คู่มือ',
 close:'ปิด',
 sections:[
  ['start','เริ่มที่นี่','เลือกรูปทรงจากแผนผังรูปเรขาคณิตที่ด้านบนของแถบซ้าย แล้วเลื่อนค่าใดค่าหนึ่ง ตึก ผัง และตัวเลขทุกตัวทางขวาจะเปลี่ยนตามพร้อมกัน ตัวเลื่อนชั้นจะทำเครื่องหมายชั้นเดียวกันทั้งในผังและในภาพตัดแกนกลาง'],
  ['bar','แถบเครื่องมือ','เครื่องหมายเก้าอันใต้หัวเรื่องคือเครื่องมือทั้งหมด แต่ละอันเปิดพื้นที่ทำงานของตัวเอง ภาพวาดทางซ้ายคือรูปทรงที่คุณกำลังถืออยู่ โต๊ะทำงานทางขวาคือสิ่งที่คุณมาดู ชื่อของแต่ละอันมาจากสิ่งที่มันวาด ไม่ใช่จากคำที่ใช้เรียก'],
  ['rail','แถบซ้าย','ทุกอย่างที่เปลี่ยนอาคารอยู่ตรงนี้ แบ่งเป็นสี่กลุ่ม ช่องเลือกเลือกจากคลังที่กำหนดไว้ ส่วนแถบเลื่อนปรับตัวเลข การศึกษาแสงอาทิตย์กำหนดเมือง วันที่ และเวลา ทั้งภาพตัดแกนกลางและเปลือกอาคารอ่านค่าเหล่านั้น'],
  ['check','ระบบทำงานหรือไม่','การตรวจสอบที่ท้ายคู่มือนี้อ่านหน้าเว็บที่คุณกำลังดูอยู่ ทุกพื้นที่ทำงานมีภาพวาด ทุกตัวควบคุมอยู่บนแถบของมัน ทุกตัวเลขถูกกรอก คู่มือตรวจตัวเอง ระบบที่พังจะบอกตรงนี้แทนที่จะดูปกติ'],
  ['honest','สิ่งที่มันไม่ใช่','นี่คือเครื่องมือเชิงแนวคิด กลุ่มลิฟต์ โซนน้ำ ท่อระบายน้ำ และรายละเอียดผนังถูกกำหนดขนาดด้วยวิธีมาตรฐานที่ตีพิมพ์แล้วนำมาตรวจสอบ แต่ไม่มีสิ่งใดในที่นี้ผ่านการออกแบบ รับรอง หรืออนุมัติ ตัวเลขเรื่องเงินเป็นสถานการณ์ ค่าเช่า อัตราการเช่า และเงินสำรองเป็นค่าสมมติ ไม่มีข้อมูลตลาดอยู่เบื้องหลัง ทุกตัวเลขระบุแหล่งที่มาของมันบนภาพวาด'],
  ['keys','แป้นพิมพ์','แท็บเลื่อนระหว่างเครื่องมือ ลูกศรซ้ายและขวาเลื่อนไปตามแถบ บนตึก ลูกศรหมุนมุมมอง และเครื่องหมายบวกลบซูม ใช้งานทุกตัวควบคุมได้โดยไม่ต้องใช้เมาส์'],
  ['study','แบบที่เก็บ','ปุ่มบันทึกจะวางแบบปัจจุบันลงชั้น และชั้นนั้นอยู่ข้ามการโหลดหน้าใหม่ การสำรวจจะตรึงพื้นที่ไว้แล้วค้นหารูปทรงอื่นให้พื้นที่เท่ากัน เพราะฉะนั้นความต่างที่เห็นหลังจากนั้นคือรูปทรง ไม่ใช่ขนาด'],
  ['lang','สามภาษา','อังกฤษ ไทย และจีน สลับได้ที่ด้านบน ทุกตาราง ทุกป้าย และทุกประโยคได้รับการแปลจริง ไม่ใช่การแสดงผลสำรอง ผู้อ่านภาษาจีนจึงไม่เคยได้รับคำภาษาอังกฤษในประโยคภาษาจีน หน่วยวัดและชื่อเฉพาะคงเป็นตัวละติน'],
  ['source','แหล่งที่มา','รูปทรงตามพารามิเตอร์วิทยานิพนธ์ MIT ปี 2006 และมาตรฐานที่ระบุไว้บนแต่ละภาพ แกนกลางกำหนดขนาดตาม CIBSE Guide D ตามที่ ISO 8100-32 อ้างถึง น้ำตามขีดจำกัดความดันที่จุดใช้ตามปกติ และการระบายน้ำตาม BS EN 12056-2 เปิดภาพวาดใดก็ได้ แหล่งที่มาจะพิมพ์อยู่ใต้ภาพนั้น']
 ],
 table:{
  head:['ตัวควบคุม','ช่วง','อ่านเป็น','เปลี่ยน'],
  assumption:'สมมติฐาน',
  derived:'คำนวณต่อยอด',
  relative:'อ้างอิงจากแบบนี้',
  groups:['รูปทรง','ที่ดินและข้อจำกัด','ค่าเช่า','ทิศทาง']
 },
 checks:{
  title:'การตรวจสอบระบบ',
  lede:'ทดสอบกับหน้าที่คุณกำลังดูอยู่',
  run:'เริ่มตรวจสอบ',
  running:'กำลังตรวจสอบ…',
  pass:'ผ่าน',
  fail:'ไม่ผ่าน',
  labels:{
   workspaces:'ทุกเครื่องมือเปิดภาพวาดได้',
   controls:'ทุกตัวควบคุมอยู่บนแถบของมัน',
   ranges:'ทุกช่วงค่าตรงกับโมเดล',
   figures:'ทุกตัวเลขถูกกรอกครบ',
   i18n:'สามภาษา ใช้คีย์เดียวกัน',
   glyphs:'ทุกเครื่องมือมีชื่อครบทั้งสามภาษา',
   forms:'ทุกกลุ่มรูปทรงวาดออกมาได้'
  },
  words:{tools:'เครื่องมือ',toolsNamed:'เครื่องมือมีชื่อครบทุกภาษา',everyPanel:'ทุกพื้นที่ทำงานมีอยู่',
   noPanel:'ไม่มีพื้นที่ทำงานสำหรับ',noButton:'ไม่มีปุ่มสำหรับ',unnamed:'ไม่มีชื่อ:',
   controls:'ตัวควบคุม',everyControl:'ทุกตัวควบคุมอยู่บนแถบและมีป้ายกำกับ',onNoRail:'ไม่อยู่บนแถบใด:',
   notBuilt:'ไม่ได้สร้างแถบเลื่อนสำหรับ',unlabelled:'ไม่มีป้ายกำกับ:',rangesAgree:'ช่วงค่าตรงกับโมเดล',
   drifted:'ขอบเขตที่ใช้งานต่างจากโมเดล:',filled:'ตัวเลขถูกกรอกครบ',empty:'ว่าง:',
   noNan:'ไม่มี NaN ที่ใด',notANumber:'พบ NaN หรือ undefined ใน:',keysTimes3:'คีย์ × 3 ภาษา',
   keyMismatch:'ชุดคีย์ไม่ตรงกัน',formsDraw:'กลุ่มรูปทรงวาดผังได้ครบ',notDrawn:'วาดไม่ได้:'},
  ok:'ทุกสิ่งที่คู่มือนี้อธิบายมีอยู่จริงครบถ้วน',
  bad:'มีสิ่งที่คู่มือนี้อธิบายหายไป บรรทัดที่ไม่ผ่านจะระบุไว้'
 }
},
zh:{
 title:'手册',
 lede:'九件工具。所有数字都由浏览器按你选择的设定算出，没有任何一项是从真实建筑实测来的。',
 open:'手册',
 close:'关闭',
 sections:[
  ['start','从这里开始','在左侧栏顶部的形体图集里选一个形体，然后拖动任一滑块。塔楼、平面图以及右侧的每个数字都会同时变化。楼层滑块在平面图与核心筒剖面中标出同一层。'],
  ['bar','工具栏','标题下的九个标记就是整套仪器。每个标记打开一个工作区：左边的图是你手里正在拿着的形体，右边的台面是你专程来读的东西。每一项都以它画出的东西命名，而不是以它的称呼命名。'],
  ['rail','左侧栏','所有会改变建筑的设定都在这里，分四组。下拉框从固定库中选择，滑块调整数字。日照研究设定城市、日期与时间；核心筒剖面与幕墙都读取这些值。'],
  ['check','系统是否正常','本手册末尾的检查读取你正在看的这一页：每个工作区都有图，每个控件都在自己的栏上，每个数字都已填入。手册在检查自己，因此出错的版本会在这里说明，而不是看起来一切正常。'],
  ['honest','它不是什么','这是一台概念仪器。电梯组、给水分区、排水立管与墙体构造均按已发表方法计算并据此校核，但其中没有任何一项经过结构设计、认证或审批。金额是情景推算：租金、出租率与储备金都是设定值，背后没有市场数据。每个数字都在图纸下方注明来源。'],
  ['keys','键盘','Tab 在工具之间移动，左右方向键沿工具栏移动。在塔楼上，方向键旋转视角，加减号缩放。所有控件都可以不用鼠标操作。'],
  ['study','存档','保存把当前方案放入架上，刷新后仍在。探索会固定面积，为同样的面积搜索其他形体，因此之后读到的任何差异都来自形体而不是体量。'],
  ['lang','三种语言','英文、泰文与中文，在顶部切换。所有表格、标签与句子都经过翻译而非回退，因此中文读者不会在中文句子里读到英文单词（单位与专有名词保留拉丁字母）。'],
  ['source','来源','几何依据 2006 年麻省理工论文的参数以及各图纸上标注的标准。核心筒依据 CIBSE Guide D（ISO 8100-32 中的表述）、给水按常用的龙头压力限值、排水按 BS EN 12056-2。打开任意一张图纸，来源就印在它下方。']
 ],
 table:{
  head:['控件','范围','读作','改变'],
  assumption:'假设',
  derived:'推导值',
  relative:'依本方案而定',
  groups:['形体','场地与约束','租金','朝向']
 },
 checks:{
  title:'系统自检',
  lede:'针对你正在查看的页面运行。',
  run:'开始检查',
  running:'检查中…',
  pass:'通过',
  fail:'未通过',
  labels:{
   workspaces:'每个工具都能打开图纸',
   controls:'每个控件都在对应的栏上',
   ranges:'每个范围与模型一致',
   figures:'每个数字都已填入',
   i18n:'三种语言使用相同的键',
   glyphs:'每个工具在三种语言中都有名称',
   forms:'每个形体族都能绘出'
  },
  words:{tools:'个工具',toolsNamed:'个工具在三种语言中均有名称',everyPanel:'每个工作区均已就位',
   noPanel:'缺少工作区：',noButton:'缺少按钮：',unnamed:'缺少名称：',
   controls:'个控件',everyControl:'每个控件均在对应栏上且有标签',onNoRail:'不在任何栏上：',
   notBuilt:'未生成滑块：',unlabelled:'缺少标签：',rangesAgree:'个范围与模型一致',
   drifted:'实际范围与模型不一致：',filled:'个数字已填入',empty:'为空：',
   noNan:'任何位置均无 NaN',notANumber:'出现 NaN 或 undefined：',keysTimes3:'个键 × 3 种语言',
   keyMismatch:'键集合不一致',formsDraw:'个形体族可绘出有限平面',notDrawn:'无法绘出：'},
  ok:'本手册所描述的内容全部到位。',
  bad:'有本手册所描述的内容缺失，未通过的那一行会指明是哪里。'
 }
}
};