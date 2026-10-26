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

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const states=JSON.parse(await readFile(process.argv[2],'utf8'));
 const failures=controlFitFailures(states);
 if(failures.length){console.error(failures.join('\n'));process.exitCode=1}
 else console.log(`PASS: ${states.length} measured control states`);
}
