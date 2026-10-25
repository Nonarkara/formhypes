// One readable vector view for all method sheets. Calculations and diagrams
// stay with their labs; this module owns only reading and dialog lifecycle.
export const DRAWING_TEXT={
 en:{enlarge:'Enlarge drawing',title:'Method drawing',close:'Close',pan:'Scroll across the drawing to read the annotations.'},
 th:{enlarge:'ขยายภาพแบบ',title:'ภาพวิธีคำนวณ',close:'ปิด',pan:'เลื่อนภาพในแนวนอนเพื่ออ่านคำอธิบาย'},
 zh:{enlarge:'放大图纸',title:'计算方法图',close:'关闭',pan:'横向滚动图纸以阅读标注。'}
};

export function drawingWidth(svg){
 const width=Number((svg.getAttribute('viewBox')||'').trim().split(/[ ,]+/)[2]);
 const sizes=[...svg.querySelectorAll('text')].map(t=>parseFloat(t.getAttribute('font-size'))).filter(n=>Number.isFinite(n)&&n>0);
 return Math.ceil(Math.max(1000,Number.isFinite(width)&&width>0&&sizes.length?width*16/Math.min(...sizes):1000));
}

export function openDrawing(source,dialog,scroll){
 const svg=source.querySelector('svg');if(!svg)return false;
 const copy=svg.cloneNode(true);copy.style.width=drawingWidth(svg)+'px';
 scroll.replaceChildren(copy);dialog.showModal();
 scroll.scrollLeft=0;scroll.scrollTop=0;scroll.focus();return true;
}

export function mountDrawingViewer({figure,source,lang='en',title,onOpen}){
 const text=DRAWING_TEXT[lang]||DRAWING_TEXT.en;
 const el=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value)n.textContent=value;return n};
 const button=el('button','drawing-open',text.enlarge);button.type='button';button.disabled=true;
 button.setAttribute('aria-haspopup','dialog');
 const dialog=el('dialog','drawing-dialog');dialog.setAttribute('aria-label',title||text.title);
 const head=el('div','drawing-head'),close=el('button','',text.close);close.type='button';close.onclick=()=>dialog.close();
 head.append(el('h2','',title||text.title),close);
 const scroll=el('div','drawing-scroll');scroll.tabIndex=0;scroll.setAttribute('aria-label',text.pan);
 dialog.append(head,el('p','drawing-hint',text.pan),scroll);
 let resume=null;
 button.onclick=()=>{if(openDrawing(source,dialog,scroll))resume=onOpen?.()||null};
 dialog.onclose=()=>{const finish=resume;resume=null;scroll.replaceChildren();if(typeof finish==='function'&&source.isConnected&&source.getBoundingClientRect().width>0)finish()};
 const caption=figure.querySelector('figcaption');
 if(caption){figure.insertBefore(button,caption);figure.insertBefore(dialog,caption)}
 else figure.append(button,dialog);
 return {button,dialog,scroll,setAvailable:ready=>{button.disabled=!ready}};
}
