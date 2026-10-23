import{test}from'node:test';
import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{runInNewContext}from'node:vm';

const source=readFileSync(new URL('../dist/settings.js',import.meta.url),'utf8').replace(/^import[^\n]+\n/,'').replaceAll('export ','');
function fixture(){
  const nodes=[],document={activeElement:null};
  document.createElement=tag=>{
    const n={tagName:tag,children:[],attrs:{},events:{},isConnected:true,value:'',textContent:'',
      append(...c){this.children.push(...c)},replaceChildren(...c){this.children=[...c]},
      setAttribute(k,v){this.attrs[k]=v},addEventListener(k,v){this.events[k]=v},
      focus(){document.activeElement=this},showModal(){this.open=true},close(){this.open=false;this.events.close?.()},
      fire(k){return this.events[k]?.()}};nodes.push(n);return n;
  };
  document.body=document.createElement('body');
  let prefs={units:'metric',currency:'USD'},language='en',changes=0,fail=false;
  const book={source:'Test reference source',date:'2026-10-22',rates:{USD:1,THB:33.5,CNY:7.1},dates:{THB:'2026-10-21'}};
  const context={document,Intl,getPreferences:()=>prefs,setPreferences:patch=>{prefs={...prefs,...patch}},resetPreferences:()=>{prefs={units:'metric',currency:'USD'}},getRateBook:()=>book,refreshRates:async()=>{if(fail)throw Error('offline');book.date='2026-10-23'}};
  runInNewContext(source+'\nthis.mount=mountSettings;this.strings=SETTINGS_TEXT;',context);
  const ui=context.mount({getLang:()=>language,onChange:()=>{changes++}});
  return{ui,nodes,document,book,get prefs(){return prefs},get changes(){return changes},lang:l=>{language=l;ui.render()},offline:()=>{fail=true},byId:id=>nodes.find(n=>n.id===id),byText:text=>nodes.find(n=>n.textContent===text),strings:context.strings};
}

test('settings mounts named native controls, changes preferences and restores invoking focus',()=>{
  const f=fixture(),units=f.byId('display-units'),currency=f.byId('display-currency'),dialog=f.byId('display-settings');
  assert.equal(dialog.tagName,'dialog');assert.equal(dialog.attrs['aria-labelledby'],'display-settings-title');
  assert.equal(f.ui.button.attrs['aria-haspopup'],'dialog');
  assert.equal(f.nodes.find(n=>n.htmlFor===units.id).children[0].textContent,'Units');
  f.ui.button.focus();f.ui.button.fire('click');assert.equal(dialog.open,true);assert.equal(f.document.activeElement,units);
  units.value='imperial';units.fire('change');currency.value='THB';currency.fire('change');
  assert.equal(f.prefs.units,'imperial');assert.equal(f.prefs.currency,'THB');assert.equal(f.changes,2);
  assert.ok(f.nodes.some(n=>n.textContent==='Approximate conversion: 1 USD = 33.5 THB'));
  assert.ok(f.nodes.some(n=>n.textContent.includes('Test reference source')&&n.textContent.includes('2026-10-21')));
  f.byText('Close').fire('click');assert.equal(dialog.open,false);assert.equal(f.document.activeElement,f.ui.button);
});

test('refresh exposes pending and failure states while retaining selected currency and dated rate',async()=>{
  const f=fixture(),currency=f.byId('display-currency');currency.value='CNY';currency.fire('change');f.offline();
  const button=f.byText('Refresh rates'),promise=button.fire('click');assert.equal(button.disabled,true);
  await promise;assert.equal(button.disabled,false);assert.equal(f.prefs.currency,'CNY');
  const status=f.nodes.find(n=>n.attrs.role==='status');assert.equal(status.hidden,false);assert.match(status.textContent,/Could not refresh/);
  assert.ok(f.nodes.some(n=>n.textContent.includes('1 USD = 7.1 CNY')));
  assert.ok(f.nodes.some(n=>n.textContent.includes('Rate date: 2026-10-22')));
  f.byText('Restore metric / USD').fire('click');assert.equal(f.prefs.currency,'USD');assert.equal(f.prefs.units,'metric');assert.match(status.textContent,/defaults restored/);
});

test('language refresh translates the controls and currency names without changing preferences',()=>{
  const f=fixture();for(const lang of ['en','th','zh']){
    f.lang(lang);assert.equal(f.ui.button.textContent,f.strings[lang].title);
    const select=f.byId('display-currency');assert.equal(select.children.length,3);
    assert.match(select.children.find(n=>n.value==='THB').textContent,new RegExp(new Intl.DisplayNames([lang],{type:'currency'}).of('THB')));
    assert.equal(f.byId('display-settings').lang,lang);
  }
  assert.equal(f.changes,0);assert.equal(f.prefs.currency,'USD');
});
