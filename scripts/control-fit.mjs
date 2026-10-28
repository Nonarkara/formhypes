import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

// Input is a real-browser receipt: text Range bounds, control bounds and
// computed padding/borders. This checks the receipt, not a CSS approximation.
const EXPECTED_GROUPS={wind:[4],lifts:[3,2,2,2,2],fire:[3,4,3,3],carbon:[2,3,3]};
export function controlFitFailures(states){
 const failures=[];
 for(const lang of ['en','th','zh'])for(const width of [390,1024,1440])for(const key of ['wind','lifts','fire','carbon']){
  const found=states.filter(s=>s.lang===lang&&s.width===width&&s.key===key);
  if(found.length!==1){failures.push(`${lang}/${width}/${key}: expected one measured state`);continue}
  const state=found[0],id=`${lang}/${width}/${key}`;
  if(typeof state.coarse!=='boolean')failures.push(`${id}: pointer mode not measured`);
  if(state.docOverflow!==false)failures.push(`${id}: document overflow`);
  if(state.groups.length!==EXPECTED_GROUPS[key].length)failures.push(`${id}: missing or unexpected choice groups`);
  for(const [index,group] of state.groups.entries()){
   if(group.selected!==1)failures.push(`${id}: exclusive group has ${group.selected} selected choices`);
   if(group.buttons.length!==EXPECTED_GROUPS[key][index])failures.push(`${id}: missing or unexpected choices`);
   for(const b of group.buttons){
    const label=`${id}/${b.text}`;
    if(typeof b.text!=='string'||!b.text.trim()||b.width<=0||b.textWidth<=0||b.textHeight<=0||![b.width,b.height,b.textWidth,b.textHeight,b.padding,b.border,b.font].every(Number.isFinite)){
     failures.push(`${label}: incomplete measurement`);continue;
    }
    if(b.width>b.textWidth+b.padding+b.border+2)failures.push(`${label}: box exceeds label and padding`);
    if(b.clipped!==false)failures.push(`${label}: clipped label`);
    if(b.font<12||b.height<(state.coarse?32:24)||b.height>Math.max(34,b.textHeight+16))failures.push(`${label}: unreadable or oversized target`);
   }
  }
 }
 return failures;
}

// The row is a decision group: its identity, money and action must be
// available together. Receipts come from the rendered shipped table.
export function candidateFitFailures(states){
 const failures=[];
 for(const lang of ['en','th','zh'])for(const width of [390,1024,1440]){
  const found=states.filter(s=>(s.lang==='zh-Hans'?'zh':s.lang)===lang&&s.width===width);
  const id=lang+'/'+width;
  if(found.length!==1){failures.push(id+': expected one candidate state');continue}
  const s=found[0];
  if(typeof s.coarse!=='boolean')failures.push(id+': pointer mode not measured');
  if(typeof s.blended!=='boolean')failures.push(id+': ranking mode not measured');
  if(s.overflow!==false||s.scrollWidth>s.clientWidth+1)failures.push(id+': horizontal scroll separates the decision');
  if(s.rows?.length!==5){failures.push(id+': expected five candidates');continue}
  for(const row of s.rows){
   const compact=s.clientWidth<=600;
   if(!Number.isFinite(row.rect.height)||row.rect.height<=0||row.rect.height>(compact?165:65))failures.push(id+': oversized or empty candidate row');
   if(!Number.isFinite(row.button.width)||row.button.width<=0||row.button.height<(s.coarse?32:24)||row.button.left<0||row.button.right>s.width)failures.push(id+': action outside decision');
   for(const key of ['cand','contribution','delta','roof','corners','height','apply',...(s.blended?['score']:[])]){
    if(row.cells.filter(c=>c.key===key).length!==1)failures.push(id+': missing '+key);
   }
   for(const c of row.cells){
    if(!c.text||c.clipped!==false||!Number.isFinite(c.rect.width)||c.rect.width<=0||c.rect.left<0||c.rect.right>s.width+1)failures.push(id+': unreadable '+c.key);
    if(compact&&!['cand','apply'].includes(c.key)&&!c.label?.trim())failures.push(id+': missing label '+c.key);
   }
   for(let a=0;a<row.cells.length;a++)for(let b=a+1;b<row.cells.length;b++){
    const x=row.cells[a].rect,y=row.cells[b].rect;
    if(Math.min(x.right,y.right)-Math.max(x.left,y.left)>1&&Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>1)failures.push(id+': overlapping cells');
   }
  }
  if(s.rows[0].rect.bottom>s.height)failures.push(id+': first candidate decision below first screen');
 }
 return failures;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const states=JSON.parse(await readFile(process.argv[2],'utf8'));
 const failures=process.argv.includes('--candidates')?candidateFitFailures(states):controlFitFailures(states);
 if(failures.length){console.error(failures.join('\n'));process.exitCode=1}
 else console.log(`PASS: ${states.length} measured states`);
}
