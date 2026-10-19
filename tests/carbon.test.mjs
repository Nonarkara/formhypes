import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,families} from '../dist/model.js';
import {concreteECF,rebarECF,sectionECF,account,tower,materials,summary,carbonRead,curves,whatIf,scorsBand,
 CONCRETE_ECF,REBAR_ECF,SECTION_ECF,TEF_ROAD,WASTE,RHO_C,CONCRETE_KM,REFERENCE_STEEL,SCORS,TARGETS,SYSTEMS,SYSTEM_KEYS,
 HEARST_RATIO,PERIMETER_FRAME_INEFF,OUTRIGGER_SHARE,CARBON_TEXT,renderCarbonLab} from '../dist/carbon.js';

const near=(a,b,e=1e-9)=>assert.ok(Math.abs(a-b)<=e,`${a} != ${b}`);
const base={concrete:'C40/50',ggbs:25,rebarEAF:56,steelEAF:46,km:300};

test('IStructE Table 2.3 factors are carried exactly and interpolated between published points',()=>{
 near(concreteECF('C32/40',0),0.149);near(concreteECF('C32/40',25),0.120);near(concreteECF('C32/40',70),0.063);
 near(concreteECF('C40/50',25),0.138);near(concreteECF('C25/30',70),0.056);
 near(concreteECF('C40/50',50),0.138+(0.072-0.138)*25/45);       // linear between 25% and 70%
 near(rebarECF(0),REBAR_ECF.bof);near(rebarECF(100),REBAR_ECF.eaf);
 near(sectionECF(0),2.450);near(sectionECF(100),0.567);
 assert.ok(Math.abs(rebarECF(56)-1.960)<0.02,'default rebar share sits on the global 1.960');
 assert.ok(Math.abs(sectionECF(46)-1.580)<0.02,'default section share sits on the global 1.580');
 near(TEF_ROAD,0.10749e-3);
});

test('cement replacement lowers concrete carbon monotonically, for every class',()=>{
 for(const cls of Object.keys(CONCRETE_ECF)){let prev=Infinity;for(let r=0;r<=70;r+=1){const v=concreteECF(cls,r);assert.ok(v<prev,`${cls} ${r}%`);prev=v}}
});

test('carbon arithmetic: tonnes × factor, plus A4 and A5 waste, by hand',()=>{
 const kg={grav_conc:1e6,grav_rebar:0,grav_steel:0,lat_conc:0,lat_rebar:0,lat_steel:0};
 const a=account(kg,{...base,ggbs:25,concrete:'C32/40'});
 const a13=1e6*0.120,a4=1e6*CONCRETE_KM*0.10749e-3,a5=WASTE.concrete*(a13+a4);
 near(a.a13,a13,1e-6);near(a.a4,a4,1e-6);near(a.a5,a5,1e-6);near(a.total,a13+a4+a5,1e-6);
 near(a13,120000,1e-6);                  // 1,000 t of C32/40 at 25% GGBS = 120 tCO2e A1–A3
 const s=account({grav_conc:0,grav_rebar:0,grav_steel:1000,lat_conc:0,lat_rebar:0,lat_steel:0},{...base,steelEAF:100,km:0});
 near(s.total,1000*0.567*(1+WASTE.steel),1e-9);
 near(account(kg,{...base,rates:{conc:200}}).cost,1e6/RHO_C*200,1e-6);
});

test('lateral material grows with height, and with slenderness at a fixed floor area',()=>{
 for(const system of SYSTEM_KEYS){
  let prev=-1;
  for(const n of [20,30,40,50,60,70]){const r=summary(tower({...defaults},n),system,{...base,core:defaults.core});assert.ok(r.latM2>prev,`${system} ${n}`);prev=r.latM2}
  const wide=carbonRead({...defaults,system},{...base,spanFactor:1}).here,slim=carbonRead({...defaults,system},{...base,spanFactor:0.8}).here;
  assert.ok(Math.abs(slim.gross/wide.gross-1)<0.12,'equal floor area within rounding of storeys');
  assert.ok(slim.latM2>wide.latM2&&slim.totalM2>wide.totalM2,`${system}: slimmer costs more material`);
 }
});

test('drift scaling: once drift governs, lateral material per tower goes as about H³',()=>{
 const s={...defaults,family:'box',taper:1,program:'mini',height:4};
 const a=tower(s,40),b=tower(s,80),ka=materials(a,'diagrid',base).kg.lat_steel,kb=materials(b,'diagrid',base).kg.lat_steel;
 assert.equal(materials(b,'diagrid',base).governs,'drift');
 const p=Math.log(kb/ka)/Math.log(b.H/a.H);
 assert.ok(p>2.5&&p<4.5,`exponent ${p}`);       // wind profile adds to the cubic
});

test('system ordering follows the sourced assumptions',()=>{
 // Outriggers move half the moment to the perimeter (40–60% published): less core.
 const tw=tower({...defaults},60);
 const cg=materials(tw,'column-grid',{...base,core:defaults.core}).kg,ou=materials(tw,'outrigger',{...base,core:defaults.core}).kg;
 assert.ok(ou.lat_conc<cg.lat_conc);near(OUTRIGGER_SHARE,0.5);
 // Hearst Tower: diagrid 20% less steel than a conventional perimeter frame.
 near(SYSTEMS.diagrid.lat[0].ineff/PERIMETER_FRAME_INEFF,HEARST_RATIO);near(HEARST_RATIO,0.8);
 // Lateral material at height: core-only > outrigger > diagrid (Khan: core frames inefficient at height).
 const L=k=>k.lat_conc+k.lat_rebar+k.lat_steel,dg=materials(tw,'diagrid',{...base,core:defaults.core}).kg;
 assert.ok(L(cg)>L(ou)&&L(ou)>L(dg),`${L(cg)} ${L(ou)} ${L(dg)}`);
});

test('steel calibration: a Sears-like steel tower lands inside Khan’s published range',()=>{
 const s={...defaults,family:'box',taper:1,program:'mini',height:3.8,span:68,core:20};
 const r=summary(tower(s,108),'diagrid',{...base,core:20});
 const lo=Math.min(...REFERENCE_STEEL.map(p=>p.kg)),hi=Math.max(...REFERENCE_STEEL.map(p=>p.kg));
 assert.ok(r.steelM2>lo*0.9&&r.steelM2<hi*1.1,`${r.steelM2}`);
});

test('published reference points carry their citations',()=>{
 assert.deepEqual(REFERENCE_STEEL.map(p=>p.key),['hancock','empire','sears']);
 for(const p of REFERENCE_STEEL){assert.ok(p.src&&p.src.length>3);assert.ok(p.kg>100&&p.kg<250)}
 near(REFERENCE_STEEL[0].kg,29*4.8824,1e-9);
 assert.equal(scorsBand(120),'A');assert.equal(scorsBand(199),'B');assert.equal(scorsBand(300),'E');
 assert.equal(scorsBand(341),'E');assert.equal(scorsBand(156),'B');assert.equal(scorsBand(228),'C');assert.equal(scorsBand(9999),'G');
 assert.deepEqual(TARGETS.map(t=>t.value),[156,228]);
 for(const l of ['en','th','zh'])for(const k of ['IStructE','SCORS','Khan','Hearst','Foraboschi'])assert.ok(CARBON_TEXT[l].src.includes(k),`${l} ${k}`);
});

test('finite outputs for floors 12/48/70 × every family × every system',()=>{
 for(const family of Object.keys(families))for(const system of SYSTEM_KEYS)for(const floors of [12,48,70]){
  const r=carbonRead({...defaults,family,system,floors},base);
  for(const v of [r.here.totalM2,r.here.gravM2,r.here.latM2,r.here.carbonM2,r.here.costM2,r.here.steelM2,r.premiumKg,r.premiumCarbon])
   assert.ok(Number.isFinite(v),`${family}/${system}/${floors}`);
  assert.ok(r.here.totalM2>0&&r.here.carbonM2>0);
  assert.ok(SCORS.some(([,b])=>b===r.here.band));
 }
});

test('what-if keeps the floor area: n′ = n / f²',()=>{
 const w=whatIf({...defaults,floors:48},{spanFactor:0.8});
 assert.equal(w.floors,75);near(w.state.span,defaults.span*0.8);
 const c=curves({...defaults},base,[20,40]);
 for(const k of SYSTEM_KEYS)assert.equal(c[k].length,2);
});

test('i18n: identical key sets in en, th, zh',()=>{
 const keys=o=>Object.entries(o).flatMap(([k,v])=>v&&typeof v==='object'?keys(v).map(x=>k+'.'+x):[k]).sort();
 const en=keys(CARBON_TEXT.en);
 assert.deepEqual(keys(CARBON_TEXT.th),en);assert.deepEqual(keys(CARBON_TEXT.zh),en);
 for(const l of ['th','zh'])for(const k of en){const v=k.split('.').reduce((o,p)=>o[p],CARBON_TEXT[l]);assert.ok(typeof v==='string'&&v.length>0,`${l} ${k}`)}
 assert.ok(!/ฉัน|เรา|ข้าพเจ้า/.test(JSON.stringify(CARBON_TEXT.th)),'Thai has no first person');
});

test('renderer never throws without a DOM',()=>{
 assert.doesNotThrow(()=>renderCarbonLab());
 assert.doesNotThrow(()=>renderCarbonLab({host:{}}));
 assert.doesNotThrow(()=>renderCarbonLab({host:{},state:{...defaults},metrics:{},lang:'th',active:true}));
 assert.doesNotThrow(()=>renderCarbonLab({host:{},state:{...defaults},lang:'xx',active:false}));
});
