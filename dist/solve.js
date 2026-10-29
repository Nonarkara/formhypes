/* FormHypes — the brief solver.
 *
 * The studio could always answer "what does this form earn". It could not
 * answer the question the brief actually asks: "on this land, at this ratio,
 * under this cap — what can be built here, and which of those is worth
 * building?"
 *
 * The brief's numbers were arithmetic on a page. The model's feasibility was
 * geometry against an envelope. Nothing joined the two, so the studio could
 * rank a scheme that no land would carry, and could not tell the reader that
 * the brief they had written was larger than the plot they had drawn.
 *
 * This module joins them. It reads the brief as a constraint set, searches a
 * stated and bounded space of forms for the ones that satisfy every clause,
 * and reports the ones it could not satisfy with the clause that stopped them.
 *
 * The space is stated, not implied: eleven plan families, every storey count
 * the height cap allows, the roof scale and the twist held as the reader has
 * them. It is a bounded search, not an optimiser, and the desk says so.
 */

import {families,evaluate,grossOf,maxFloors,objectives,regimes} from './model.js?v=2d88cdbc91';
import {SCHEMA} from './schema.js?v=fd56569c48';

/** The span control's own range. A form the studio cannot hold on its own
 *  slider is not a form this desk may offer, so the search stays inside it and
 *  the desk says what the range is. */
export const SPAN_MIN=SCHEMA.span[1],SPAN_MAX=SCHEMA.span[2];
/** The storey control's own range. */
export const FLOOR_MIN=SCHEMA.floors[1],FLOOR_MAX=SCHEMA.floors[2];

/** The reasons a candidate can fail, in the order they are read.
 *
 *  The order is the order of the questions: can this be a building at all,
 *  is it on the land, does the land's allowance carry it, does the studio's
 *  own envelope and control hold it, and is it under the cap. A candidate is
 *  counted against the first clause it fails, so the numbers add up to the
 *  number refused.
 */
export const REASONS=['core','area','plot','far','site','span','height'];

/* ── the brief as a constraint set ──────────────────────────────────────── */

/** Read the brief as the clauses it actually imposes.
 *
 *  `brief` is the Brief desk's own input: the plot area, the floor area
 *  ratio, the height cap and the gross floor area the client asked for.
 *  `state` is the studio's own settings, which impose a second height cap
 *  and a buildable envelope.
 *
 *  Two height caps answer to the same question, so the stricter one governs
 *  and the answer says which it was. The land and the envelope are different
 *  subjects and both are kept: the plot is the outer bound, the envelope the
 *  inner one. A form may satisfy one and fail the other, and the reader is
 *  told which.
 */
export function briefConstraints(brief,state){
 const plot=Math.max(0,Number(brief&&brief.plot)||0);
 const far=Math.max(0,Number(brief&&brief.far)||0);
 const target=Math.max(0,Number(brief&&brief.target)||0);
 const briefCap=Math.max(0,Number(brief&&brief.cap)||0);
 const studioCap=Math.max(0,Number(state&&state.maxHeight)||0);
 let cap=studioCap,capSource='studio';
 if(briefCap>0&&(studioCap<=0||briefCap<=studioCap)){cap=briefCap;capSource='brief'}
 const allowance=plot*far;
 return {plot,far,target,allowance,plotHalf:plot>0?Math.sqrt(plot)/2:0,
  cap,capSource,briefCap,studioCap};
}

/* ── the search ─────────────────────────────────────────────────────────── */

/** Build the list of candidates without scoring them.
 *
 *  The target is what the brief asks for, unless the land's allowance is
 *  smaller — a brief larger than the plot is not a brief the solver can meet,
 *  and the answer is then the most the land can carry, said plainly.
 */
export function solvePlan(state,brief,objective='contribution'){
 const K=briefConstraints(brief,state);
 const ask=K.target;
 const capped=K.allowance>0&&ask>K.allowance;
 const target=capped?K.allowance:ask;
 const floorMin=Math.max(FLOOR_MIN,1);
 // The tallest the cap allows, under the cap that governs.
 const capState={...state,maxHeight:K.cap>0?K.cap:state.maxHeight};
 const floorMax=Math.min(FLOOR_MAX,Math.max(floorMin,maxFloors(capState)));
 const list=[];
 if(target>0){
  for(const family of Object.keys(families)){
   for(let floors=floorMin;floors<=floorMax;floors++){
    const candidate={...state,family,floors,maxHeight:capState.maxHeight};
    // Size the plan so the stack delivers the target area. Gross area scales
    // with the square of the span, so one step lands on it.
    const base=grossOf(candidate);
    candidate.span=state.span*Math.sqrt(target/Math.max(base,1));
    list.push(candidate);
   }
  }
 }
 return {K,objective,ask,target,capped,floorMin,floorMax,list,examined:list.length,
  families:Object.keys(families).length};
}

/** Score one candidate against the brief's clauses.
 *
 *  The span check is the solver's own: a form the studio's own span control
 *  cannot hold is not an answer this desk may give, so it is refused here
 *  rather than clamped into a different building.
 */
export function solveScore(candidate,K,objective='contribution'){
 const span=Math.abs(candidate.span);
 const reasons=[];
 if(span<SPAN_MIN-.00001||span>SPAN_MAX+.00001)reasons.push('span');
 const metrics=evaluate(candidate,K);
 const all=[...new Set([...reasons,...metrics.reasons])];
 const score=Object.hasOwn(objectives,objective)?objectives[objective](metrics,candidate):metrics.contribution;
 return {state:candidate,metrics,reasons:all,valid:all.length===0,objective,score};
}

/** The whole solve, in one call. Long enough to want slicing in the browser;
 *  the desk slices it exactly as it slices the candidate search. */
export function solveBrief(state,brief,objective='contribution'){
 const plan=solvePlan(state,brief,objective);
 const results=plan.list.map(c=>solveScore(c,plan.K,objective));
 // One row per plan family: the best storey count that family can reach. The
 // storey count is the variable here, so a family that answers at three
 // different counts is one answer, not three.
 const best=new Map();
 for(const r of results){
  if(!r.valid)continue;
  const held=best.get(r.state.family);
  if(!held||r.score>held.score)best.set(r.state.family,r);
 }
 const rows=[...best.values()].sort((a,b)=>b.score-a.score);
 const refused=refusedTally(results);
 // Two different counts, and they answer two different questions. The refused
 // count is the candidates a clause turned away. The rejected count is every
 // candidate that is not the answer, including the valid ones a family reached
 // at a storey count its better answer replaced.
 const refusedCount=Object.values(refused).reduce((a,b)=>a+b,0);
 return {...plan,results,rows,refused,refusedCount,feasible:rows.length,
  rejectedCount:results.length-rows.length};
}

/** Count the refusals against the first clause each candidate failed.
 *
 *  A candidate can fail several clauses at once — a form too wide for the land
 *  is also too wide for the studio's span control — and counting all of them
 *  would make the numbers add up to more than the number refused. The first
 *  clause in the order the clauses are read is the one that explains the
 *  refusal, so that is the one counted. */
export function refusedTally(results){
 const tally={};
 for(const r of results){
  if(r.valid)continue;
  const first=r.reasons.slice().sort((a,b)=>{
   const ia=REASONS.indexOf(a),ib=REASONS.indexOf(b);
   return (ia<0?99:ia)-(ib<0?99:ib);
  })[0];
  if(first)tally[first]=(tally[first]||0)+1;
 }
 return tally;
}

/** The best form in the solve, if there is one. */
export function bestOf(solve){return solve.rows.length?solve.rows[0]:null}
