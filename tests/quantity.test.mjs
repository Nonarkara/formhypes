import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defaults, evaluate, stack} from '../dist/model.js';
import {t} from '../dist/i18n.js';
import {splitOf} from '../dist/areasplit.js';
import {quantityCsv, quantityTable, howMeasured, toCsv, csvField, formatNum, levelRows} from '../dist/quantity.js';

const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');

const SAMPLES=[
 {name:'petronas cross',state:{...defaults}},
 {name:'opaque twisted box',state:{...defaults,family:'box',program:'custom',floors:12,material:'precast',skin:'horizontal',twist:20,taper:0.7,core:18,span:36,height:3.8}}
];

function parseCsv(text){
 assert.equal(text.charCodeAt(0),0xFEFF,'UTF-8 BOM');
 const body=text.slice(1).replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').replace(/\n$/,'');
 const rows=[];
 let row=[],cur='',q=false;
 for(let i=0;i<body.length;i++){
  const c=body[i];
  if(q){
   if(c==='"'&&body[i+1]==='"'){cur+='"';i++}
   else if(c==='"')q=false;
   else cur+=c;
  }else if(c==='"')q=true;
  else if(c===','){row.push(cur);cur=''}
  else if(c==='\n'){row.push(cur);rows.push(row);row=[];cur=''}
  else cur+=c;
 }
 if(cur.length||row.length){row.push(cur);rows.push(row)}
 return rows;
}

function col(headers,name){
 const i=headers.indexOf(name);
 assert.ok(i>=0,'missing column '+name);
 return i;
}

test('CSV totals equal the on-screen schedule for two massings',()=>{
 for(const {name,state} of SAMPLES){
  const metrics=evaluate(state),split=splitOf(metrics);
  const table=quantityTable(state,'en');
  const grid=parseCsv(quantityCsv(state,'en'));
  const headers=grid[0];
  const gross=col(headers,table.headers[2]);
  const core=col(headers,table.headers[3]);
  const circ=col(headers,table.headers[4]);
  const net=col(headers,table.headers[5]);
  const how=headers.length-1;
  assert.equal(headers[how],'How measured');
  const levels=grid.slice(1).filter(r=>/^\d+$/.test(r[0]));
  const measured=grid.find(r=>r[0]==='Measured total');
  const order=grid.find(r=>r[0]==='Order total');
  assert.ok(measured&&order,name);
  assert.equal(levels.length,stack(state).length,name+' level count');
  const printed=(got,want,label)=>{
   assert.equal(got,formatNum(want,2),`${name} ${label}: ${got} vs ${formatNum(want,2)}`);
  };
  printed(measured[gross],metrics.gross,'gross');
  printed(measured[core],split.core,'core');
  printed(measured[circ],split.circulation,'circulation');
  printed(measured[net],split.net,'net');
  const facadeCols=headers.map((h,i)=>/^\s*Façade /.test(h)?i:-1).filter(i=>i>=0);
  assert.ok(facadeCols.length>=1,name+' façade columns');
  const cents=s=>{
   assert.match(s,/^-?\d+\.\d{2}$/,name+' 2 dp '+s);
   const neg=s.startsWith('-');
   const [a,b]=s.replace('-','').split('.');
   const n=Number(a)*100+Number(b);
   return neg?-n:n;
  };
  const facadeCents=facadeCols.reduce((s,i)=>s+cents(measured[i]),0);
  assert.equal(facadeCents,cents(formatNum(metrics.facade,2)),name+' façade schedule at 2 dp');
  for(const i of [gross,core,circ,net,...facadeCols])assert.equal(order[i],measured[i],name+' order');
  assert.match(measured[how],/on-screen schedule/);
  assert.match(measured[how],/whole m²/);
  assert.match(measured[how],/2 decimal places/);
  assert.match(order[how],/no waste/);
  assert.match(levels[0][how],/outer slab outline/);
  assert.match(levels[0][how],/perimeter × floor-to-floor/);
  assert.match(levels[0][how],/whole m²/);
  assert.match(levels[0][1],/^-?\d+\.\d{3}$/,name+' elevation 3 dp');
  assert.match(levels[0][0],/^\d+$/,name+' level integer');
 }
 const glass=levelRows(SAMPLES[0].state);
 assert.ok(glass.keys.some(k=>k.includes('|glass:')),'a glazed massing splits façade by glazing type');
 assert.ok(glass.keys.filter(k=>k.startsWith('float|glass:')).length>=2,'more than one glass type');
 const solid=levelRows(SAMPLES[1].state);
 assert.ok(solid.keys.every(k=>k.startsWith('precast|skin:')),'an opaque massing keeps the selected material');
 const voids=glass.rows.filter(r=>!r.gfa);
 assert.ok(voids.length>=1&&voids.every(r=>r.gross===0&&Object.values(r.facade).some(v=>v>0)),'voids keep façade and earn no floor area');
});

test('study JSON notes how every metric was measured, without renaming metrics',()=>{
 const metrics=evaluate(defaults);
 const before=structuredClone(metrics);
 for(const lang of ['en','th','zh']){
  const notes=howMeasured(metrics,lang);
  walk(metrics,notes,lang);
 }
 assert.deepEqual(metrics,before);
 assert.equal(typeof metrics.gross,'number');
 const app=read('dist/app.js');
 assert.match(app,/howMeasured:howMeasured\(metrics,lang\)/);
 assert.match(app,/state,metrics,howMeasured:/);
});

function walk(metrics,notes,lang,path=''){
 for(const [k,v] of Object.entries(metrics)){
  const here=path?path+'.'+k:k;
  if(v&&typeof v==='object'&&!Array.isArray(v)){
   assert.equal(typeof notes[k],'object',here);
   walk(v,notes[k],lang,here);
  }else{
   assert.equal(typeof notes[k],'string',here);
   assert.ok(notes[k].length>20,here);
   if(lang==='th')assert.match(notes[k],/\p{Script=Thai}/u,here);
   if(lang==='zh')assert.match(notes[k],/\p{Script=Han}/u,here);
   if(lang==='en')assert.match(notes[k],/[A-Za-z]{3}/,here);
  }
 }
}

test('printed cells sum to the printed totals in every numeric column',()=>{
 const cents=s=>{
  assert.match(s,/^-?\d+\.\d{2}$/,'area cell '+s);
  const neg=s.startsWith('-');
  const [a,b]=s.replace('-','').split('.');
  return (neg?-1:1)*(Number(a)*100+Number(b));
 };
 for(const {name,state} of SAMPLES){
  const metrics=evaluate(state),split=splitOf(metrics);
  const grid=parseCsv(quantityCsv(state,'en'));
  const headers=grid[0];
  const levels=grid.slice(1).filter(r=>/^\d+$/.test(r[0]));
  const measured=grid.find(r=>r[0]==='Measured total');
  const order=grid.find(r=>r[0]==='Order total');
  const numeric=headers.map((_,i)=>i).filter(i=>/^-?\d+\.\d{2}$/.test(measured[i]));
  assert.ok(numeric.length>=5,name+' numeric columns');
  for(const i of numeric){
   const sum=levels.reduce((s,r)=>s+cents(r[i]),0);
   assert.equal(sum,cents(measured[i]),`${name} ${headers[i]} printed rows`);
   assert.equal(order[i],measured[i],`${name} ${headers[i]} order`);
  }
  const at=(label,want)=>assert.equal(measured[col(headers,label)],formatNum(want,2),name+' '+label);
  at('Gross floor area (m²)',metrics.gross);
  at('Core area (m²)',split.core);
  at('Circulation (m²)',split.circulation);
  at('Net area (m²)',split.net);
  const facadeIdx=headers.map((h,i)=>h.startsWith('Façade')?i:-1).filter(i=>i>=0);
  const facadeSum=facadeIdx.reduce((s,i)=>s+cents(measured[i]),0);
  assert.equal(facadeSum,cents(formatNum(metrics.facade,2)),name+' façade');
 }
});

test('formula injection is prefixed on text and not on negative numbers',()=>{
 for(const raw of ['=1+1','+cmd','-cmd','@SUM(A1)','\t=1+1','\r=1+1','\n=1+1']){
  const field=csvField(raw);
  assert.equal(field.startsWith('"')?field[1]:field[0],"'");
  const file=toCsv(['h'],[[raw]]);
  assert.equal(parseCsv('\uFEFF'+file)[1][0],"'"+raw);
 }
 const quoted=toCsv(['h'],[['=1+1, see']]);
 assert.match(quoted,/"'=1\+1, see"/);
 assert.equal(parseCsv('\uFEFF'+quoted)[1][0],"'=1+1, see");
 const neg=toCsv(['n'],[[{n:true,v:-12.5,digits:2}]]);
 assert.match(neg,/^-12\.50$/m);
 assert.doesNotMatch(neg,/'/);
 assert.equal(csvField(-12.5),'-12.5');
 const src=read('dist/quantity.js');
 assert.match(src,/return '\\uFEFF'\+toCsv\(/);
 assert.match(src,/typeof value!=='string'/);
});

test('Thai and Chinese headers render, with ตร.ม. in Thai',()=>{
 const state={...defaults};
 const th=parseCsv(quantityCsv(state,'th'))[0].join(' | ');
 const zh=parseCsv(quantityCsv(state,'zh'))[0].join(' | ');
 const en=parseCsv(quantityCsv(state,'en'))[0].join(' | ');
 assert.match(th,/ชั้น/);
 assert.match(th,/ตร\.ม\./);
 assert.match(th,/วิธีวัด/);
 assert.match(th,/กระจกโฟลตใส/);
 assert.doesNotMatch(th,/Gross floor area/);
 assert.match(zh,/层/);
 assert.match(zh,/m²/);
 assert.match(zh,/测量方法/);
 assert.match(zh,/透明浮法玻璃/);
 assert.match(parseCsv(quantityCsv(state,'zh')).map(r=>r[0]).join('\n'),/计算合计/);
 assert.doesNotMatch(parseCsv(quantityCsv(state,'zh')).map(r=>r[0]).join('\n'),/实测合计/);
 const thHow=parseCsv(quantityCsv(state,'th')).find(r=>r[0]==='1').at(-1);
 assert.match(thHow,/จำนวนเต็ม/);
 assert.match(thHow,/ทศนิยม 2 ตำแหน่ง/);
 assert.match(parseCsv(quantityCsv(state,'th'))[0].join(' | '),/กระจกใส low-e/);
 assert.match(t.th['d.exportNote'],/ภายใน\. JSON/);
 assert.doesNotMatch(t.th['d.exportNote'],/ภายใน JSON/);
 assert.match(zh,/\p{Script=Han}/u);
 assert.match(en,/Gross floor area \(m²\)/);
 assert.match(en,/How measured/);
 assert.equal(quantityTable(state,'th').headers.length,quantityTable(state,'zh').headers.length);
});

test('the export control matches the existing buttons and stays a 44px target',()=>{
 const html=read('dist/index.html');
 assert.match(html,/id="exportQty"/);
 assert.match(html,/class="exportoptions"/);
 const css=read('dist/style.css');
 assert.match(css,/\.exportoptions button\{min-width:44px;min-height:44px\}/);
 assert.match(read('README.md'),/opentakeoff/i);
 assert.match(read('CREDITS.md'),/AGPL/);
 assert.match(read('CREDITS.md'),/https:\/\/github\.com\/Kentucky-ai\/opentakeoff/);
 assert.doesNotMatch(read('dist/quantity.js'),/opentakeoff[\s\S]{0,80}function\s+\w+\s*\(/i);
});
