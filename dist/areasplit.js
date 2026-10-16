/* How a floor plate divides.

   The question this answers is the one an architect asks first about a plan:
   what fraction of the plate is core, what fraction you can never let, and
   what fraction you can actually sell. It is a different question from what the
   model charges, and the two disagree — see NOTE below, which is printed on the
   drawing rather than left in here.

   The split is as specified: circulation is CIRCULATION_SHARE of the usable
   area, where usable is the plate minus the core. The three slices are
   therefore core / circulation / NET usable, and they sum to the gross plate
   exactly. Labelling the third slice "usable" without "net" would double-count
   the circulation inside it, so the label says net. */

export const CIRCULATION_SHARE=0.30;

/* The model's own common/service allowance is gross × state.common, default
   12%, and it is a gross-up: circulation, shafts, structure thickness and
   services together — not circulation alone. Charging it and also charging 30%
   for circulation would double-count the same floor twice, so the two are kept
   apart: the pie states the plan split, the model states what it deducts, and
   the drawing prints both. The default building lands at 58.8% net usable here
   against 72.0% net/gross in the schedule, and a reader who sees only one of
   those numbers will think the other is wrong. */
export const AREA_SPLIT={
 circulationShare:CIRCULATION_SHARE,
 note:'Assumed circulation is 30% of the plate inside the core. The schedule deducts a separate common and service allowance, which also carries shafts and structure — the two are not the same figure.',
 aria:'Floor plate split'
};

/* A full turn, in radians.
   This was Math.PI/2 — a quarter turn — under the name TAU, which meant every
   wedge swept a quarter of the angle its share deserved. The three slices then
   covered ninety degrees of a three-hundred-and-sixty degree circle while the
   legend beside them printed 16.0 / 25.2 / 58.8, so the picture and the figures
   disagreed and the picture was the one that had no defence. The numbers were
   right, which is exactly why nothing caught it: every arithmetic test passed
   and the only thing wrong was the one nobody measured — the angle. */
const TAU=Math.PI*2;

/* One colour per slice, declared once. It used to live only on the legend row
   while the wedge read `slice.fill`, so every wedge was painted
   fill="undefined" — which the canvas accepts silently and paints black. A
   colour that belongs to a wedge belongs on the wedge. */
export const FILL={core:'#9aa3a0',circulation:'#5c6a72',net:'#f59e0b'};
/* Draw order, and the order the caller must build its labels in. The slice key
   was 'circulation' while the label map in app.js used 'circ', so the middle
   row rendered "undefined" — a lookup table that is longer than the list it
   serves will drift. One list, exported. */
export const KEYS=['core','circulation','net'];
const p=(cx,cy,r,a)=>[cx+r*Math.cos(a),cy+r*Math.sin(a)];

/* ── measuring text ───────────────────────────────────────────────────────
   The legend used to be three hard rows against three hard columns, and that
   only works in one of the three languages. The English name is 25 narrow
   glyphs, the Chinese one is 11 full-width ones, the Thai one is a stack of
   combining marks that carry almost no advance width — three names, three
   different widths, and only one of them fits between the swatch and the
   percentage. A column tuned to English prints 扣除交通后的使用面积 straight
   through 58.8%, which is what happened. So the names are measured, by
   character class, and wrapped to whatever is actually left over.

   Measuring on a canvas is not an option here: this runs while the string is
   being assembled, before there is a document to measure in. The widths come
   from the same per-class table the browser's own font metrics approximate. It
   is an estimate, and it deliberately errs wide — a line that wraps one word
   early costs a few units of margin, a line that wraps one word late costs a
   collision. */

/* Thai vowels and tone marks ride above or below their consonant. Counting
   them at full width would wrap every Thai label onto three lines and leave
   the legend a wall of text two words high. */
const THAI_MARK=/[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/;
const NARROW=/[ .,'’!|:;\[\]()\-\u2010\u2013\u2014·/\\]/;
const THIN=/[iljtfIrI1]/;
const WIDE=/[A-Z0-9%mwMW@]/;

export function charWidth(ch,px=11){
 const c=ch.codePointAt(0);
 if(c===0x20)return px*0.26;
 if(THAI_MARK.test(ch))return px*0.30;
 if(c>=0x1100&&(c<=0x115f||c===0x2329||c===0x232a
  ||(c>=0x2e80&&c<=0x303e)||(c>=0x3041&&c<=0x33ff)
  ||(c>=0x3400&&c<=0x4dbf)||(c>=0x4e00&&c<=0x9fff)
  ||(c>=0xa000&&c<=0xa4cf)||(c>=0xac00&&c<=0xd7a3)
  ||(c>=0xf900&&c<=0xfaff)||(c>=0xfe30&&c<=0xfe6f)
  ||(c>=0xff00&&c<=0xff60)||(c>=0xffe0&&c<=0xffe6)))return px;
 if(NARROW.test(ch))return px*0.30;
 if(THIN.test(ch))return px*0.33;
 if(WIDE.test(ch))return px*0.64;
 if(c>=0x0e00&&c<=0x0e7f)return px*0.54;
 return px*0.55;
}
export const textWidth=(s,px=11)=>{
 let w=0;
 for(const ch of String(s==null?'':s))w+=charWidth(ch,px);
 return w;
};

/* IBM Plex Mono sets every glyph on a 600/1000 advance, so a mono run is not
   an estimate at all — it is a multiplication. That matters because the value
   and the percentage share one baseline and must not touch. */
export const MONO_ADVANCE=0.6;
export const monoWidth=(s,px=10)=>String(s==null?'':s).length*px*MONO_ADVANCE;

/* Greedy wrap. Breaks on a space when there is one to break on — English and
   Thai get it — and between characters when there is not, which is the only
   thing that can be done with Chinese. Wrapping is a layout decision, not a
   translation one: the label is never shortened to fit, because shortening
   "usable, net of circulation" to "usable" is precisely the double-count this
   chart exists to avoid. */
export function wrapLabel(s,maxW,px=11){
 const str=String(s==null?'':s);
 if(str==='')return [''];
 if(maxW<=0||textWidth(str,px)<=maxW)return [str];
 const out=[];
 if(!/\s/.test(str)){
  // A script that does not use spaces cannot be broken on a word, and a greedy
  // break on one strands a single orphan on the last line — which is exactly
  // what "扣除交通后的使用面" + "积" was. Distribute the glyphs instead: eleven
  // characters that need two lines get six and five, not ten and one.
  //
  // The chunk count is found by MEASURING the widest chunk, not by dividing
  // the character count. Eleven CJK glyphs are uniform and the two answers
  // agree, but a run of proportional glyphs with no space in it does not, and
  // dividing by count silently produced lines that were wider than the column
  // they were measured against.
  const chars=[...str],ws=chars.map(c=>charWidth(c,px));
  const total=ws.reduce((a,b)=>a+b,0);
  const widest=n=>{
   const per=Math.ceil(chars.length/n);
   let acc=0,max=0;
   for(let i=0;i<chars.length;i++){
    acc+=ws[i];
    if((i+1)%per===0||i===chars.length-1){if(acc>max)max=acc;acc=0;}
   }
   return max;
  };
  let n=Math.max(1,Math.ceil(total/maxW));
  while(n<chars.length&&widest(n)>maxW)n++;
  const per=Math.ceil(chars.length/n);
  for(let i=0;i<chars.length;i+=per)out.push(chars.slice(i,i+per).join(''));
  return out;
 }
 let line='';
 for(const ch of str){
  if(line&&textWidth(line+ch,px)>maxW){
   const br=line.lastIndexOf(' ');
   if(br>0){
    out.push(line.slice(0,br).trimEnd());
    line=line.slice(br+1)+ch;
   }else{
    out.push(line);
    line=ch===' '?'':ch;
   }
  }else line+=ch;
 }
 if(line.trim()||!out.length)out.push(line.trimEnd());
 return out.length?out:[''];
}

/* ── the drawing ─────────────────────────────────────────────────────────── */

/* One wedge from angle a0 to a1, clockwise from twelve o'clock. The large-arc
   flag is the one detail that goes wrong quietly: an arc over half a turn needs
   it set or the canvas draws the mirror image and the slice silently swaps with
   its neighbour. */
function wedge(cx,cy,r,a0,a1,fill,stroke){
 const s=a1-a0,large=s>Math.PI?1:0;
 const[x0,y0]=p(cx,cy,r,a0),[x1,y1]=p(cx,cy,r,a1);
 return `<path d="M${cx} ${cy} L${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`;
}

/* The legend box, in units. WIDTH is the drawing's own coordinate space; the
   CSS caps the rendered width, so these are proportions, not pixels — but the
   two mono columns are measured in mono advances and the names are measured by
   class, so the same arithmetic holds at any scale. */
const BOX={WIDTH:300,PAD:15};
const COL={NAME_X:142,PCT_X:292,SWATCH_X:124,NAME_SZ:11,VAL_SZ:10,PCT_SZ:11,LINE:12.5,VGAP:15,BLOCK_GAP:14,COL_GAP:8};
export const LAYOUT=Object.freeze({...BOX,...COL});

/* The geometry the legend actually used, for anyone who has to check it — the
   test suite reads the same numbers the renderer did rather than trusting that
   three fixed columns stayed lucky across three scripts. The box height is
   decided here and nowhere else: a second copy of this arithmetic is a second
   answer waiting to disagree. */
export function legendLayout(legend,r=50){
 const rows=legend||[];
 const pctW=rows.reduce((m,g)=>Math.max(m,monoWidth(g.pct,COL.PCT_SZ)),0);
 const nameMax=Math.max(24,COL.PCT_X-pctW-COL.COL_GAP-COL.NAME_X);
 const blocks=rows.map(g=>{
  const lines=wrapLabel(g.label,nameMax,COL.NAME_SZ);
  return {lines,h:COL.LINE*(lines.length-1)+COL.VGAP};
 });
 const used=blocks.reduce((s,b)=>s+b.h,0)+COL.BLOCK_GAP*Math.max(0,blocks.length-1);
 return {nameMax,pctW,width:BOX.WIDTH,used,
  // The pie is centred on the legend block, and the box grows to whichever of
  // the two is taller — so a language whose names need two lines gets a taller
  // drawing with a still-centred pie, rather than a pie that has walked off the
  // top or a legend that runs out of the bottom.
  height:BOX.PAD*2+Math.max(r*2,used),
  nameX:COL.NAME_X,pctX:COL.PCT_X,blocks};
}

/* slices: [{key,label,value,fill}] in draw order. A zero value still gets a
   slice boundary of zero width rather than being dropped, so the legend and the
   wedge never disagree about how many parts the plate has. cy is deliberately
   not an option: a caller who could pin the pie's centre could push the legend
   out of the box. */
export function splitSVG(slices,{cx=62,r=50,total,legend}={}){
 const rows=legend||[],lay=legendLayout(rows,r);
 const H=lay.height,cy=BOX.PAD+Math.max(r,lay.used/2);

 const ink='var(--panel)';
 let a=-Math.PI/2,body='';
 for(const sl of slices){
  const frac=total>0?Math.max(0,sl.value)/total:0;
  const sweep=frac*TAU;
  if(sweep>0)body+=wedge(cx,cy,r,a,a+sweep,sl.fill||'none',ink);
  a+=sweep;
 }

 /* The legend is laid out in a column rather than at each wedge's own angle —
    an angle-driven legend puts two labels on top of each other the moment one
    slice is small, which is exactly the case worth looking at. Row heights are
    per block, because a name that needed two lines has to push the rows below
    it down rather than be drawn across them. */
 let y=BOX.PAD+COL.NAME_SZ;
 const out=rows.map(g=>{
  const lines=wrapLabel(g.label,lay.nameMax,COL.NAME_SZ);
  const swatchY=y-COL.NAME_SZ*0.82;
  const vy=y+(lines.length-1)*COL.LINE+COL.VGAP;
  const row=`<rect x="${COL.SWATCH_X}" y="${swatchY.toFixed(1)}" width="11" height="11" fill="${g.fill||'none'}" stroke="${ink}" stroke-width="1"/>`
   +lines.map((t,j)=>`<text x="${COL.NAME_X}" y="${(y+j*COL.LINE).toFixed(1)}" class="as-name">${t}</text>`).join('')
   +`<text x="${COL.NAME_X}" y="${vy.toFixed(1)}" class="as-val">${g.value}</text>`
   +`<text x="${COL.PCT_X}" y="${vy.toFixed(1)}" class="as-pct" text-anchor="end">${g.pct}</text>`;
  y=vy+COL.BLOCK_GAP;
  return row;
 }).join('');

 return `<svg viewBox="0 0 ${BOX.WIDTH} ${H.toFixed(1)}" role="img" aria-label="${slices.map(s=>s.label).join(', ')}">${body}${out}</svg>`;
}

/* The figures, from the model's own evaluated metrics so the pie cannot drift
   from the schedule printed above it. `floor` is the whole building: the pie
   sits beside gross floor area and rentable area, and a per-level pie beside a
   whole-building schedule would invite a comparison that is not like for like. */
export function splitOf(metrics,share=CIRCULATION_SHARE){
 const gross=Math.max(0,metrics.gross||0);
 const core=Math.max(0,Math.min(gross,metrics.core||0));
 const usable=gross-core;
 const circulation=usable*share;
 const net=usable-circulation;
 const pc=v=>gross>0?(v/gross*100).toFixed(1)+'%':'0.0%';
 const fmt=v=>Math.round(v).toLocaleString('en-US');
 return {
  gross,core,usable,circulation,net,
  // The fill travels with the slice, so the wedge and its legend row cannot
  // drift apart — they are the same object.
  slices:[
   {key:'core',value:core,pct:pc(core),fill:FILL.core},
   {key:'circulation',value:circulation,pct:pc(circulation),fill:FILL.circulation},
   {key:'net',value:net,pct:pc(net),fill:FILL.net}
  ],
  legend:KEYS.map((k,i)=>({fill:FILL[k],value:[core,circulation,net][i],pct:pc([core,circulation,net][i])})),
  // Both numbers, because the schedule's net/gross and this pie's net are
  // computed from different deductions and will not agree.
  modelCommon:metrics.common||0,
  modelRentable:metrics.rentable||0,
  modelEfficiency:metrics.efficiency||0,
  fmt
 };
}