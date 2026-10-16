/* ── what the wall is made of ───────────────────────────────────────────────
   Everything upstream charges the envelope on one number: the skin area, in
   square metres, integrated over every face of every level. That is the area.
   It is not the material. A wall of float glass and a wall of precast
   concrete occupy the same square metres and differ in what they cost to put
   up, what they cost to keep, how long they last and what they do to the
   solar gain on the face behind them.

   So the material is an overlay on the envelope, not a change to it. Each row
   carries the properties that move a number, and nothing else. It does NOT
   change the floor plate, the core, the structure or the rent: choosing a
   material does not make a floor bigger. If a row cannot move a figure it is
   decoration, and it is not here.

   The figures are indicative published ranges for commercial tower cladding,
   not a specification and not a quotation. They are stated so the reader can
   disagree with them: swap a number and every derived figure follows.

   vt    visible transmittance — the share of visible light reaching the glass
   shgc  solar heat gain coefficient — the share of solar energy passing
   upkeep        maintenance index, 1.00 = the float-glass baseline
   cycle         cleaning/replacement cycle, years
   carbon        embodied carbon, kgCO2e per m² of finished face
   envelope      cost coefficient applied to the existing envelope reserve
   draw          how the surface is inked in the three views
*/
export const MATERIALS={
 'float':{label:'Float glass, clear',thesis:'Sears Tower 1929',
  vt:.90,shgc:.85,upkeep:1.00,cycle:10,carbon:25,envelope:1.00,
  fill:'#8ea0a8',edge:'#c3d0d4',draw:'curtain'},
 'reflective':{label:'Reflective coated glass',thesis:'HSBC Hong Kong 1985',
  vt:.55,shgc:.30,upkeep:.85,cycle:12,carbon:28,envelope:1.12,
  fill:'#6f8494',edge:'#9fb4c0',draw:'curtain'},
 'low-e':{label:'Low-e insulated glazing unit',thesis:'Chicago Stock Exchange 1994',
  vt:.68,shgc:.32,upkeep:1.10,cycle:18,carbon:32,envelope:1.28,
  fill:'#7d929c',edge:'#b2c4cc',draw:'curtain'},
 'pv':{label:'Photovoltaic glass',thesis:'BIPV curtain wall',
  vt:.45,shgc:.20,upkeep:1.15,cycle:25,carbon:41,envelope:1.55,
  fill:'#3f5260',edge:'#7d94a0',draw:'cell'},
 'alu-spandrel':{label:'Anodised aluminium spandrel',thesis:'Hong Kong and Shanghai Bank 1985',
  vt:0,shgc:0,upkeep:.95,cycle:20,carbon:40,envelope:1.05,
  fill:'#9aa0a2',edge:'#d2d6d7',draw:'band'},
 'precast':{label:'Precast concrete panel',thesis:'César Pelli · One Shell Plaza',
  vt:0,shgc:0,upkeep:1.00,cycle:50,carbon:60,envelope:0.86,
  fill:'#9d9a92',edge:'#cfcbc2',draw:'panel'},
 'boardformed':{label:'Board-formed concrete',thesis:'Bauhaus · in-situ tradition',
  vt:0,shgc:0,upkeep:1.05,cycle:50,carbon:62,envelope:0.90,
  fill:'#948f86',edge:'#c6c0b6',draw:'board'},
 'terracotta':{label:'Terracotta louvre screen',thesis:'Louvre, Paris, 1983–89',
  vt:0,shgc:0,upkeep:1.25,cycle:40,carbon:45,envelope:1.18,
  fill:'#a2705a',edge:'#cfa588',draw:'louvre'},
 'timber':{label:'Timber soffit and reveal',thesis:'Delaware · deliberately limited',
  vt:0,shgc:0,upkeep:1.30,cycle:25,carbon:18,envelope:1.10,
  fill:'#a8814f',edge:'#d3b483',draw:'band'},
 'zinc':{label:'Zinc standing seam',thesis:'Haussmannian roof tradition',
  vt:0,shgc:0,upkeep:1.10,cycle:40,carbon:85,envelope:1.22,
  fill:'#8e959a',edge:'#c3c9cc',draw:'seam'},
 'corten':{label:'Weathering steel',thesis:'Rijo-iin tower, Helsinki, 1978',
  vt:0,shgc:0,upkeep:1.20,cycle:50,carbon:95,envelope:0.98,
  fill:'#8a5f43',edge:'#b98a6a',draw:'panel'},
 'granite':{label:'Granite cladding',thesis:'Standard for the period, everywhere',
  vt:0,shgc:0,upkeep:.90,cycle:60,carbon:55,envelope:1.02,
  fill:'#8b8a85',edge:'#c3c2bd',draw:'panel'}};

export const MATERIAL_KEYS=Object.keys(MATERIALS);
export const materialOf=s=>MATERIALS[s&&s.material]||MATERIALS.float;

/* The one honest consequence of choosing a material: the same integrated skin
   area, charged at this material's rate. Returns the annual reserve only —
   it does not touch rent, plate, core or contribution, because none of those
   move when you change what the wall is made of. */
export function materialEnvelopeCost(annualEnvelopeCost,s){
 const m=materialOf(s);
 return Math.max(0,annualEnvelopeCost)*m.envelope;
}

/* Which of the twelve actually lets light through. A reader choosing concrete
   for a tower wants to be told the envelope is now opaque before they wonder
   why the daylight figures did not move. */
export const isOpaque=s=>materialOf(s).vt===0;

/* Surface ink for the three views. The pattern is a property of the material,
   not a style: a louvre draws as fins, a curtain wall draws as a grid, precast
   draws as panel joints. Returned as an array of segments in unit-square face
   coordinates so every renderer can consume it without knowing what it is. */
export function surfacePattern(s,cols=6,rows=8){
 const m=materialOf(s),out=[];
 switch(m.draw){
  case 'curtain': case 'cell':
   for(let i=1;i<cols;i++)out.push(['v',i/cols]);
   for(let j=1;j<rows;j++)out.push(['h',j/rows]);
   if(m.draw==='cell')for(let i=1;i<cols;i+=2)for(let j=1;j<rows;j+=2)out.push(['d',(i-.5)/cols,(j-.5)/rows]);
   break;
  case 'panel':
   for(let j=1;j<rows;j+=2)out.push(['h',j/rows]);
   break;
  case 'board':
   for(let j=1;j<rows;j++)out.push(['h',j/rows]);
   break;
  case 'band':
   for(let j=1;j<rows;j+=4)out.push(['h',j/rows]);
   break;
  case 'seam':
   for(let i=1;i<cols;i++)out.push(['v',i/cols]);
   break;
  case 'louvre':
   for(let j=0;j<rows;j++)out.push(['d',j/rows]);
   break}
 return out;
}