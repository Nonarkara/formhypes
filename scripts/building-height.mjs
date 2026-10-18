// OSM heights are lengths; storey counts require an explicit metres/storey assumption.
export function heightOf(tags){
 const metres=value=>{if(typeof value!=='string'&&typeof value!=='number')return null;const s=String(value).trim();if(!/^\d+(?:\.\d+)?\s*(?:m)?$/.test(s))return null;const n=parseFloat(s);return Number.isFinite(n)&&n>.5&&n<1000?n:null};
 for(const key of ['height','building:height']){const h=metres(tags[key]);if(h!==null)return {h,src:key}}
 const levels=Number(tags['building:levels']);if(Number.isFinite(levels)&&levels>0&&levels<200)return {h:levels*3.2,src:'levels × 3.2 m'};
 return null;
}
