/* ── study graphics ───────────────────────────────────────────────────────
   The search already computes every candidate it ranks; the desk then showed
   five rows of them. These two figures are drawn from that same array — no
   candidate is added, dropped, re-run or estimated here.

   1. familyResponse puts all eleven families on ONE shared contribution scale,
      so the spread between families is the width of the rules and cannot be
      normalised away by accident.
   2. lattice opens one family and shows the discrete grid the search actually
      walked: four roof scales by four twists, sixteen cells, one cell each.

   Both are honest about the discipline that makes the comparison mean
   anything: every candidate was resized to the same gross floor area, so only
   the form is moving. */
import {families} from './model.js?v=0c66fed306';

const INK='#191c1b',MUTED='#585e5b',FAINT='#8b918d',LINE='#c6cbc6',ACCENT='#f59e0b',PAPER='#f2f2ef';
// Value ladder for the lattice, light to dark. Text flips at index 4, where the
// fill is dark enough that ink would stop being readable.
const RAMP=['#eceeea','#d8dbd6','#bec2bc','#9ba09b','#767c77','#4e544f'];
const X0=118,ROW=25,TOP=30,GUTTER=108;
// Coordinates go out at 2dp. Raw doubles put seventeen digits into a path and
// make the emitted figure impossible to read back and check.
const px=v=>Math.round(v*100)/100;

/* One scale for the whole figure. The current tower is inside the range even
   when it is not a lattice cell — its own taper rarely is — so a rule for it
   can always be drawn. A scale built from the candidates alone would put it
   off the paper. */
export function responseScale(alternatives,current,width=720){
 const all=alternatives.map(a=>a.metrics.contribution).concat(current==null?[]:[current.contribution]);
 const min=Math.min(...all),max=Math.max(...all),span=max-min||1;
 return {min,max,x:v=>X0+(v-min)/span*(width-70-X0)};
}
const group=a=>({family:a.state.family,lo:Infinity,hi:-Infinity,best:null,rows:[]});
export function familyBands(alternatives){
 const by=new Map();
 for(const a of alternatives){
  const f=a.state.family;
  if(!by.has(f))by.set(f,group(a));
  const b=by.get(f),c=a.metrics.contribution;
  if(c<b.lo)b.lo=c;if(c>b.hi)b.hi=c;
  if(!b.best||c>b.best.metrics.contribution)b.best=a;
  b.rows.push(a);
 }
 return [...by.values()].sort((x,y)=>y.hi-x.hi||x.lo-y.lo);
}
const svgEl=(tag,attrs,parent)=>{
 const n=document.createElementNS('http://www.w3.org/2000/svg',tag);
 for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);
 if(parent)parent.append(n);return n;
};

/** Every family on one scale. Returns the figure element. */
export function familyResponse(alternatives,current,tt,lang,{selected=null,onPick=null,width=720,row=ROW}={}){
 const bands=familyBands(alternatives),s=responseScale(alternatives,current,width);
 const H=TOP+bands.length*row+34;
 const fig=document.createElement('figure');fig.className='study-fig';
 fig.append(caption(tt('s.plotTitle'),tt('s.plotNote')));
 const svg=svgEl('svg',{viewBox:`0 0 ${width} ${H}`,role:'group','aria-label':tt('s.plotTitle')},fig);
 // Current-tower rule first, so the family rules sit over it and win where they cross.
 if(current)svgEl('path',{d:`M${px(s.x(current.contribution))} ${TOP-8}V${H-26}`,stroke:ACCENT,'stroke-width':1,'stroke-dasharray':'4 3',fill:'none'},svg);
 bands.forEach((b,i)=>{
  const y=TOP+i*row+row/2,on=b.family===selected;
  const g=svgEl('g',{class:'study-band'+(on?' on':''),tabindex:'0',role:'button',
   'aria-pressed':String(on),'data-study-focus':'family:'+b.family,
   'aria-label':tt('fs.'+b.family)+' · '+compact(lang,b.lo)+' – '+compact(lang,b.hi)},svg);
  svgEl('rect',{x:0,y:y-row/2,width,height:row,fill:'transparent','pointer-events':'all'},g);
  svgEl('path',{d:`M${px(s.x(b.lo))} ${y}H${px(s.x(b.hi))}`,stroke:on?INK:MUTED,'stroke-width':2},g);
  svgEl('path',{d:`M${px(s.x(b.lo))} ${y-4}v8M${px(s.x(b.hi))} ${y-4}v8`,stroke:on?INK:MUTED,'stroke-width':1},g);
  svgEl('circle',{cx:px(s.x(b.hi)),cy:y,r:3.4,fill:ACCENT},g);
  const t=svgEl('text',{x:GUTTER,y:y+4,'text-anchor':'end',fill:on?INK:MUTED,'font-size':10.5},g);
  t.textContent=tt('fs.'+b.family);
  if(onPick){const pick=()=>onPick(b.family);
   g.addEventListener('click',pick);
   g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick()}});}
 });
 svgEl('path',{d:`M${X0} ${H-26}H${width-70}`,stroke:LINE,'stroke-width':1},svg);
 for(const v of[s.min,s.max]){const x=s.x(v);
  svgEl('path',{d:`M${x} ${H-26}v5`,stroke:LINE,'stroke-width':1},svg);
  const t=svgEl('text',{x,y:H-9,'text-anchor':'middle',fill:FAINT,'font-size':10},svg);
  t.textContent=compact(lang,v);}
 if(current){const t=svgEl('text',{x:s.x(current.contribution),y:H-9,'text-anchor':'middle',fill:ACCENT,'font-size':10},svg);
  t.textContent=tt('s.current');}
 return fig;
}

/** The 4x4 grid the search walked for one family, as real buttons. */
export function lattice(alternatives,family,tt,lang,onApply){
 const s=responseScale(alternatives,null);
 const cells=new Map();
 for(const a of alternatives)if(a.state.family===family){
  const k=a.state.taper+'|'+a.state.twist,prev=cells.get(k);
  if(!prev||(a.score??a.metrics.contribution)>(prev.score??prev.metrics.contribution))cells.set(k,a);
 }
 const tapers=[...new Set(alternatives.map(a=>a.state.taper))].sort((x,y)=>y-x);
 const twists=[...new Set(alternatives.map(a=>a.state.twist))].sort((x,y)=>x-y);
 const fig=document.createElement('figure');fig.className='study-fig';
 const head=document.createElement('figcaption');head.textContent=tt('s.latticeTitle');fig.append(head);
 const note=document.createElement('p');note.className='note';note.textContent=tt('s.latticeNote');fig.append(note);
 const wrap=document.createElement('div');wrap.className='lattice';
 const best=[...cells.values()].reduce((b,a)=>!b||a.metrics.contribution>b.metrics.contribution?a:b,null);
 for(const tp of tapers){
  const row=document.createElement('div');row.className='lattice-row';
  const lab=document.createElement('span');lab.className='lattice-lab';lab.textContent=tp.toFixed(2);row.append(lab);
  for(const tw of twists){
   const a=cells.get(tp+'|'+tw);
   const cell=document.createElement(a?'button':'span');
   cell.className='lattice-cell';
   if(a){
    const t=(a.metrics.contribution-s.min)/(s.max-s.min||1);
    const step=Math.min(RAMP.length-1,Math.max(0,Math.round(t*(RAMP.length-1))));
    cell.style.background=a===best?ACCENT:RAMP[step];
    cell.style.color=a===best?INK:step>=4?PAPER:INK;
    cell.type='button';
    cell.textContent=compact(lang,a.metrics.contribution);
    cell.title=tt('fs.'+family)+' · '+tt('s.roofScale')+' '+tp.toFixed(2)+' · '+tt('s.twist')+' '+tw+'°';
    cell.setAttribute('data-study-focus',family+':'+tp+':'+tw);
    cell.setAttribute('aria-label',tt('s.col.apply')+' · '+cell.title+' · '+tt('c.floors')+' '+a.state.floors+' · '+tt('s.col.height')+' '+a.metrics.height.toFixed(0)+' m · '+tt('s.col.contribution')+' USD '+Math.round(a.metrics.contribution).toLocaleString(LOCALE[lang]));
    if(a===best)cell.classList.add('best');
    cell.onclick=()=>onApply(a);
   }else{
    // Nothing to draw, so nothing is filled: a dashed rule is the drafting
    // convention for a cell the run did not produce.
    cell.style.background='none';
    cell.style.color=FAINT;
    cell.textContent='—';
    cell.setAttribute('aria-label',tt('s.rejected'));
    cell.title=tt('s.rejected');
   }
   row.append(cell);
  }
  wrap.append(row);
 }
 const ticks=document.createElement('div');ticks.className='lattice-row';
 ticks.append(Object.assign(document.createElement('span'),{className:'lattice-lab'}));
 for(const tw of twists){const s2=document.createElement('span');s2.className='lattice-tick';s2.textContent=tw+'°';ticks.append(s2)}
 wrap.append(ticks);
 fig.append(wrap);
 const legend=document.createElement('p');legend.className='note';legend.textContent=tt('s.latticeLegend');
 // Only explain a dashed cell if the run actually produced one; nine of the
 // eleven families are complete, and a legend for an absence is a lie of omission.
 if(cells.size<tapers.length*twists.length)legend.textContent+=' '+tt('s.latticeRejected');
 fig.append(legend);
 return fig;
}
function caption(title,note){
 const f=document.createElement('figcaption');f.textContent=title;
 const p=document.createElement('p');p.className='note';p.textContent=note;f.append(p);return f;
}
const LOCALE={en:'en-US',th:'th-TH',zh:'zh-CN'};
/* Millions with a pinned decimal. Intl's own compact notation is not usable
   here: it writes 2628.0万 into a cell built for 26.3, and it never names the
   currency. Dividing by a million gives the same four characters in all three
   locales, so a cell cannot overflow in one script and not another, and the
   unit is said once in words in the caption. */
export const compact=(lang,v)=>new Intl.NumberFormat(LOCALE[lang]??'en-US',{minimumFractionDigits:1,maximumFractionDigits:1}).format(v/1e6);
export const familyName=(lang,f)=>families[f]??f;