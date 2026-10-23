import{getPreferences,setPreferences,resetPreferences,getRateBook,refreshRates}from'./preferences.js?v=bc763656eb';

export const SETTINGS_TEXT={
  en:{title:'Settings',close:'Close',units:'Units',metric:'Metric · m, m²',imperial:'Imperial · ft, ft²',currency:'Currency',basis:'Currency conversion changes the display only. Construction costs and rents keep the same USD price basis; these are not local market prices.',approx:'Approximate conversion',source:'Source',date:'Rate date',refresh:'Refresh rates',refreshing:'Refreshing rates…',updated:'Rates refreshed.',failed:'Could not refresh. The dated rates shown below are still in use.',reset:'Restore metric / USD',resetNote:'Restores display preferences only. Your building and studies stay as they are.',resetDone:'Display defaults restored.'},
  th:{title:'การตั้งค่า',close:'ปิด',units:'หน่วย',metric:'เมตริก · m, m²',imperial:'อิมพีเรียล · ft, ft²',currency:'สกุลเงิน',basis:'การแปลงสกุลเงินเปลี่ยนเฉพาะการแสดงผล ต้นทุนก่อสร้างและค่าเช่ายังใช้ฐานราคา USD เดิม ไม่ใช่ราคาตลาดในท้องถิ่น',approx:'การแปลงโดยประมาณ',source:'แหล่งข้อมูล',date:'วันที่อัตราแลกเปลี่ยน',refresh:'อัปเดตอัตราแลกเปลี่ยน',refreshing:'กำลังอัปเดตอัตราแลกเปลี่ยน…',updated:'อัปเดตอัตราแลกเปลี่ยนแล้ว',failed:'อัปเดตไม่ได้ ยังใช้อัตราแลกเปลี่ยนตามวันที่ที่แสดงด้านล่าง',reset:'คืนค่าเมตริก / USD',resetNote:'คืนค่าเฉพาะการแสดงผล อาคารและการศึกษาของคุณยังคงเดิม',resetDone:'คืนค่าการแสดงผลเริ่มต้นแล้ว'},
  zh:{title:'设置',close:'关闭',units:'单位',metric:'公制 · m, m²',imperial:'英制 · ft, ft²',currency:'货币',basis:'货币换算仅改变显示。建造成本和租金仍采用原有的美元价格基础，并非当地市场价格。',approx:'近似换算',source:'来源',date:'汇率日期',refresh:'更新汇率',refreshing:'正在更新汇率…',updated:'汇率已更新。',failed:'无法更新。仍使用下方注明日期的汇率。',reset:'恢复公制 / 美元',resetNote:'仅恢复显示设置。您的建筑和研究保持不变。',resetDone:'已恢复默认显示设置。'}
};

/** A global display preference, deliberately independent of the building state. */
export function mountSettings({getLang=()=> 'en',onChange=()=>{}}={}){
  const el=(tag,cls)=>{const n=document.createElement(tag);if(cls)n.className=cls;return n};
  const button=el('button','settings-button');button.type='button';button.setAttribute('aria-haspopup','dialog');
  const dialog=el('dialog','display-settings');dialog.id='display-settings';dialog.setAttribute('aria-labelledby','display-settings-title');
  button.setAttribute('aria-controls',dialog.id);
  const header=el('div','settings-heading'),title=el('h2');title.id='display-settings-title';
  const close=el('button');close.type='button';close.addEventListener('click',()=>dialog.close());header.append(title,close);
  const fields=el('div','settings-fields');
  const unitLabel=el('label'),unitText=el('span'),units=el('select');units.id='display-units';unitLabel.htmlFor=units.id;unitLabel.append(unitText,units);
  const currencyLabel=el('label'),currencyText=el('span'),currency=el('select');currency.id='display-currency';currencyLabel.htmlFor=currency.id;currencyLabel.append(currencyText,currency);
  fields.append(unitLabel,currencyLabel);
  const basis=el('p','settings-basis'),rate=el('p','settings-rate'),provenance=el('p','settings-provenance');
  const status=el('p','settings-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
  const actions=el('div','settings-actions'),refresh=el('button'),reset=el('button');refresh.type=reset.type='button';actions.append(refresh,reset);
  const resetNote=el('p','settings-reset-note');
  dialog.append(header,fields,basis,rate,provenance,status,actions,resetNote);document.body.append(dialog);
  let pending=false,message='',returnFocus=null;
  const lang=()=>SETTINGS_TEXT[getLang()]?getLang():'en';
  const option=(value,text)=>{const o=el('option');o.value=value;o.textContent=text;return o};
  function render(){
    const l=lang(),t=SETTINGS_TEXT[l],p=getPreferences(),book=getRateBook();
    dialog.lang=l;button.textContent=title.textContent=t.title;close.textContent=t.close;
    unitText.textContent=t.units;currencyText.textContent=t.currency;
    units.replaceChildren(option('metric',t.metric),option('imperial',t.imperial));units.value=p.units;
    let names;try{names=new Intl.DisplayNames([l],{type:'currency'})}catch{}
    currency.replaceChildren(...Object.keys(book.rates).sort().map(code=>option(code,`${code} — ${names?.of(code)||code}`)));currency.value=p.currency;
    basis.textContent=t.basis;
    const value=new Intl.NumberFormat(l,{maximumFractionDigits:6}).format(book.rates[p.currency]);
    rate.textContent=`${t.approx}: 1 USD = ${value} ${p.currency}`;
    provenance.textContent=`${t.source}: ${book.source} · ${t.date}: ${book.dates?.[p.currency]||book.date}`;
    status.textContent=message?t[message]:'';status.hidden=!message;
    refresh.textContent=pending?t.refreshing:t.refresh;refresh.disabled=pending;
    reset.textContent=t.reset;resetNote.textContent=t.resetNote;
  }
  units.addEventListener('change',()=>{setPreferences({units:units.value});render();onChange()});
  currency.addEventListener('change',()=>{setPreferences({currency:currency.value});render();onChange()});
  reset.addEventListener('click',()=>{resetPreferences();message='resetDone';render();onChange()});
  refresh.addEventListener('click',async()=>{
    pending=true;message='';render();
    try{await refreshRates();message='updated';onChange()}catch{message='failed'}
    finally{pending=false;render()}
  });
  function open(){render();if(dialog.open)return;returnFocus=document.activeElement;dialog.showModal();units.focus()}
  dialog.addEventListener('close',()=>{if(returnFocus?.isConnected)returnFocus.focus();else button.focus()});
  button.addEventListener('click',open);render();
  return {button,render,open};
}
