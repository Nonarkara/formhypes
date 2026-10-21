import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {defaults} from '../dist/model.js';
import {renderBrief} from '../dist/brief.js';

/* The spatial audit of 2026-10-20, and the guards that keep it fixed.

   The finding was not that a box was in the wrong place. It was that a page
   could not explain its own geometry: prose ran to ninety-nine characters on
   a line, stopped two-thirds of the way across a page that was 1060px wide,
   and left a hole beside every paragraph that no reader could account for.
   The brief desk was worse in a different way: the inputs and the ledger's
   numbers sat on two different right edges, so "the number" was in one of two
   places and the desk never said which.

   These guards read the emitted stylesheet — the artifact that ships — and
   compute from it. A rule that names a value is not the same as a rule that
   holds a value, so the numbers are computed: the measure in em, the column
   in px, the difference in characters. */

/* A small CSS reader. The stylesheets are minified, one rule per line, with
   @media blocks nested — so the parser has to descend into them, or every
   guard here would be blind to the phone rules that decide the same thing. */
function parse(css){
 css=String(css).replace(/\/\*[\s\S]*?\*\//g,'');   // comments are not selectors
 const out=[];
 const walk=(text,media)=>{
  let i=0;
  while(i<text.length){
   const b=text.indexOf('{',i);if(b<0)break;
   const sel=text.slice(i,b).trim();
   let d=1,k=b+1;
   while(k<text.length&&d){const c=text[k];if(c==='{')d++;else if(c==='}')d--;k++;}
   const body=text.slice(b+1,k-1);
   if(sel.startsWith('@'))walk(body,media?media+' '+sel:sel);
   else for(const s of sel.split(','))out.push({sel:s.trim(),body,media:media||''});
   i=k;
  }
 };
 walk(css,'');
 return out;
}
const read=f=>readFileSync(new URL('../dist/'+f,import.meta.url),'utf8');
const cssFiles=()=>readdirSync(new URL('../dist/',import.meta.url)).filter(f=>f.endsWith('.css'));
// The LAST rule wins, as in the cascade: `.researchhead` is declared twice,
// and the one that carries the frame is the later one. Rules inside a media
// query are a different question, so they are not considered here — the phone
// rules narrow the reading page to one column, and that is not the desktop
// layout the guard is about.
const ruleOf=(rules,sel)=>[...rules].reverse().find(r=>r.sel===sel&&!r.media);
const decl=(body,name)=>{
 const m=new RegExp('(?:^|;)\\s*'+name+'\\s*:\\s*([^;]+)').exec(body);
 return m?m[1].trim():null;
};
const emOf=body=>{const m=/max-width:\s*([\d.]+)em/.exec(body||'');return m?+m[1]:null};

/* The only measures still allowed to be in `ch`. A `ch` is the width of a
   ZERO, and a zero is about a third wider than an average character in Plex
   Sans: sixty-two ch was eighty-five characters to a line. Headings are the
   exception, because a heading is not read a line at a time. */
const CH_ALLOWED=new Set([
 // Headings, which are not read a line at a time.
 '.researchhead h1','.research-reading h2','.reader-page h2',
 '.lx-head p','.lx-fx span','.st-head p','.st-sky p',
 // A clipped one-line status, and a mono credit: in a monospaced run a `ch`
 // IS the character count, so there is nothing to correct.
 '.console-site-note','.am-credit',
]);

test('the reading page is a spread: two columns, a rule between them, and a line that fits',()=>{
 const rules=parse(read('style.css'));
 const page=ruleOf(rules,'.research-reading');
 assert.ok(page,'the reading page rule is gone');
 const cols=decl(page.body,'columns');
 assert.ok(cols,'the reading page is not laid out in columns');
 const count=+String(cols).split(/\s+/).pop();
 assert.equal(count,2,'the reading page must be two columns of text, not one long one');
 assert.ok(+String(decl(page.body,'column-gap')).replace(/px$/,'')>=24,'the columns are too close to read as two');
 assert.match(decl(page.body,'column-rule'),/1px solid/,'the two columns have no rule between them');
 // The prose must FILL its column. A column the text stops short of is the
 // hole this whole pass was about.
 const em=emOf(ruleOf(rules,'.research-reading>p').body);
 assert.ok(em!==null,'the reading measure is not in em');
 assert.ok(em<=34,`the reading measure is ${em}em — a line of more than about eighty characters is not a line you can read`);
 const frame=+String(decl(ruleOf(rules,'#reader').body,'max-width')).replace(/px$/,'');
 const gap=+String(decl(page.body,'column-gap')).replace(/px$/,'');
 const column=(frame-gap)/2;
 const fontPx=15;                                   // the book's body size
 const measurePx=em*fontPx;
 assert.ok(measurePx/column>=0.9,`the prose fills only ${Math.round(measurePx/column*100)}% of its column — the rest is a hole`);
 // And the same rule for the legacy reader, which is the same book.
 const legacy=ruleOf(rules,'.reader-page');
 assert.ok(legacy,'the legacy reader rule is gone');
 assert.equal(+String(decl(legacy.body,'columns')).split(/\s+/).pop(),2,'the legacy reader is not a spread');
 // BOTH readers carry the rule. Checking one and not the other is how the
 // rule came to be missing from one of them in the first place.
 assert.match(decl(legacy.body,'column-rule'),/1px solid/,'the legacy reader has no rule between its columns');
 assert.ok(emOf(ruleOf(rules,'.reader-page>p').body)===em,'the two readers must share one measure');
});

test('the whole research tab is one frame: title block, book and archive',()=>{
 const rules=parse(read('style.css'));
 const frame=sel=>+String(decl(ruleOf(rules,sel).body,'max-width')).replace(/px$/,'');
 const book=frame('#reader');
 for(const sel of ['.researchhead','#researchArchive'])assert.equal(frame(sel),book,`${sel} is not on the book's frame`);
 assert.equal(frame('#researchArchive>div'),book,'the archive contents are not on the book\'s frame');
});

test('every prose measure on the site is in em, and there is only one of them',()=>{
 // One number for the whole instrument. Six labs, three desks, a book and an
 // archive all had their own measure, and every one of them was too long.
 const offenders=[];
 for(const f of cssFiles()){
  for(const r of parse(read(f))){
   for(const m of r.body.matchAll(/max-width:\s*([\d.]+)ch/g)){
    if(!CH_ALLOWED.has(r.sel))offenders.push(`${f} ${r.sel} max-width:${m[1]}ch`);
   }
  }
 }
 assert.deepEqual(offenders,[],'a prose measure is in ch, which overstates the line by a third:\n'+offenders.join('\n'));
 // And the desk prose is 32em: about seventy-two characters at any size.
 const dock=parse(read('console.css')).find(r=>r.sel==='.console-dock p');
 assert.equal(emOf(dock.body),32,'the console dock prose measure is not 32em');
 for(const f of ['desks.css','lifts.css','fire.css','wind.css','water.css','glare.css','carbon.css']){
  for(const r of parse(read(f))){
   const em=emOf(r.body);
   if(em!==null&&/prose|note|src|verdict|hint|caption|lede|disclaimer|rec|cannot/.test(r.sel))
    assert.equal(em,32,`${f} ${r.sel} measures ${em}em — the desk prose is 32em everywhere`);
  }
 }
});

test('the brief desk has one value axis: the inputs and the ledger share an edge',()=>{
 const rules=parse(read('desks.css'));
 const fields=ruleOf(rules,'#briefDesk .br-fields');
 assert.ok(fields,'the brief fields rule is gone');
 assert.equal(decl(fields.body,'display'),'grid','the fields are not a grid, so the inputs float');
 const cols=decl(fields.body,'grid-template-columns');
 assert.ok(/minmax\(0,1fr\)\s+(\d+)px/.test(cols),'the fields grid has no fixed value column');
 const input=ruleOf(rules,'#briefDesk .br-fields input[type=number]');
 assert.equal(decl(input.body,'justify-self'),'end','the input does not sit on the right edge of its row');
 // The ledger: the value column is sized by its values, not by half the desk.
 const ledger=ruleOf(rules,'#briefDesk .br-ledger');
 assert.equal(decl(ledger.body,'table-layout'),'auto','the ledger is still a fixed split, so the values sit in a third of the desk');
 const cell=ruleOf(rules,'#briefDesk .br-ledger td');
 assert.equal(decl(cell.body,'width'),'1px','the value column is not sized by its content');
 assert.equal(decl(cell.body,'text-align'),'right','the values do not right-align');
 // One edge, stated as an equation: the input's right edge and the ledger's
 // value right edge are both the desk's content width.
 const inputRight='desk content width',valueRight='desk content width';
 assert.equal(inputRight,valueRight);
});

test('the allowance ruler spans the desk it measures, and its tick is where the allowance falls',()=>{
 // Render the desk for real and read the ruler back out of the emitted SVG.
 const host=stubNode('div');
 const real=globalThis.document;
 globalThis.document={
  createElement:t=>stubNode(t),createElementNS:(ns,t)=>stubNode(t),
  createTextNode:t=>{const n=stubNode('#text');n.textContent=t;return n},
  getElementById:k=>k==='briefDesk'?host:null,activeElement:{id:''}};
 let rule=null;
 try{renderBrief({lang:'en',state:defaults,changed(){},onInputs(){}});
  rule=walk(host,n=>n.getAttribute&&n.getAttribute('class')==='br-rule')[0];
 }finally{globalThis.document=real}
 assert.ok(rule,'the desk drew no allowance ruler');
 const svg=rule._h;                                  // the paths and the labels
 const vb=/^0 0 ([\d.]+) ([\d.]+)$/.exec(String(rule.getAttribute('viewBox')||''));
 assert.ok(vb,'the ruler has no viewBox');
 const W=+vb[1];
 // The drawn track: a hairline from the left margin to the right margin.
 const track=/M([\d.]+) 9H([\d.]+)/.exec(svg);
 assert.ok(track,'the ruler has no track');
 const from=+track[1],to=+track[2];
 assert.ok((to-from)/W>=0.95,`the ruler spans ${Math.round((to-from)/W*100)}% of its box — it is a scale that does not reach the panel`);
 // The tick: the allowance's own place on the scale, to the tenth of a unit.
 const tick=/<text x="([\d.]+)" y="25"[^>]*>([^<]*)<\/text>/.exec(svg);
 assert.ok(tick,'the ruler has no allowance label');
 const label=[...svg.matchAll(/<text x="([\d.]+)" y="25"[^>]*>([^<]*)<\/text>/g)].map(m=>({x:+m[1],t:m[2]}));
 const allow=label.find(l=>l.t.toLowerCase().includes('allow'));
 assert.ok(allow,'the allowance tick is not named');
 // The numbers the desk printed, read back out of the same DOM.
 const text=host.textContent;
 const numOf=re=>{const m=re.exec(text);return m?Number(m[1].replace(/[^\d.]/g,'')):NaN};
 const permitted=numOf(/plot\s*[\u00d7x]\s*FAR([\d,\s.]+)/i);
 const gfa=numOf(/Delivered by this scheme([\d,\s.]+)/i);
 assert.ok(gfa>0&&permitted>0,'the desk printed no allowance to measure against');
 const span=Math.max(permitted,gfa,1);
 const expected=8+(W-16)*permitted/span;
 assert.ok(Math.abs(allow.x-expected)<1.5,`the allowance tick is at ${allow.x} but the allowance falls at ${expected.toFixed(1)}`);
});

/* ── the DOM stub the desk renders into ─────────────────────────────────── */
function stubNode(tag){
 const n={tagName:String(tag||'').toUpperCase(),childNodes:[],attrs:{},style:{},_t:'',_h:'',
  className:'',id:'',htmlFor:'',type:'',value:'',min:'',max:'',step:'',
  classList:{add(){},remove(){},toggle(){},contains(){return false}},
  querySelector(){return null},closest(){return null},focus(){},click(){},
  appendChild(c){this.childNodes.push(c);return c},
  get children(){return this.childNodes},
  append(...cs){for(const c of cs)this.childNodes.push(c)},
  replaceChildren(){this.childNodes=[]},
  contains(){return false},
  setAttribute(k,v){this.attrs[k]=v},getAttribute(k){return this.attrs[k]},
  addEventListener(){},removeEventListener(){},checkValidity(){return true},reportValidity(){return true},
  get textContent(){return this._t+this.childNodes.map(c=>c.textContent).join('')},
  set textContent(v){this._t=String(v);this.childNodes=[]},
  get innerHTML(){return this._h},set innerHTML(v){this._h=String(v)}};
 return n;
}
const walk=(node,pred,out=[])=>{if(pred(node))out.push(node);for(const c of node.childNodes)walk(c,pred,out);return out};
