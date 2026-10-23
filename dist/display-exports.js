import {toDisplay,unitLabel,getPreferences,getRateBook} from './preferences.js?v=e134c381e7';
const cell=value=>{const s=String(value);return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
export function alternativesCsv(rows,objective){
 const p=getPreferences(),book=getRateBook(),length=unitLabel('m'),area=unitLabel('m²').replace('²','2'),currency=p.currency.toLowerCase();
 const columns=[
  ['family',r=>r.state.family],['regime',r=>r.state.regime],['structure',r=>r.state.system],['floors',r=>r.state.floors],
  ['span_'+length,r=>toDisplay(r.state.span,'m').toFixed(4)],['roof_scale',r=>r.state.taper],['twist_deg',r=>r.state.twist],
  ['gross_'+area,r=>toDisplay(r.metrics.gross,'m²').toFixed(2)],['rentable_'+area,r=>toDisplay(r.metrics.rentable,'m²').toFixed(2)],
  ['corner_offices',r=>r.metrics.corners],['height_'+length,r=>toDisplay(r.metrics.height,'m').toFixed(2)],['total_height_'+length,r=>toDisplay(r.metrics.heightTotal,'m').toFixed(2)],
  ['distinctiveness',r=>r.metrics.distinctiveness.toFixed(4)],['ranking_score',r=>r.score],['ranking_method',r=>r.ranking?.method??'raw'],['objective',()=>objective],
  ...[['annual_rent','rent'],['envelope_reserve','facadeCost'],['structure_reserve','structureCost'],['annual_contribution','contribution'],['capex','capex']].map(([name,key])=>[name+'_'+currency,r=>toDisplay(r.metrics[key],'USD').toFixed(2)]),
  ['capex_'+currency+'_per_gross_'+area,r=>toDisplay(r.metrics.capexPerM2,'USD/m²').toFixed(2)],
  ['capital_over_contribution_years',r=>Number.isFinite(r.metrics.payback)?r.metrics.payback.toFixed(2):''],
  ['display_currency',()=>p.currency],['exchange_per_usd',()=>book.rates[p.currency]],['exchange_date',()=>book.dates?.[p.currency]||book.date],['exchange_source',()=>book.source]
 ];
 return [columns.map(([name])=>cell(name)).join(','),...rows.map(row=>columns.map(([,read])=>cell(read(row))).join(','))].join('\n');
}
