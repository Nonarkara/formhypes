/* Every number the rail offers, with the range the model will actually accept.

   This table used to live inside app.js, where the sliders are built from it.
   The manual needs the same ranges: a manual that documents a copied table is
   a manual that lies the first time somebody moves a slider bound. Two readers
   of one table, so it ships as one file.

   [i18n key, min, max, step, unit] — the key is resolved per language in
   app.js buildRanges(); nothing here is English-only. `span` is special-cased
   in the model: its range is relative to the current scheme (a wider span is
   reachable, but a narrower one is not), which is why the manual says so
   rather than printing 32–62 as if it were absolute. */
export const SCHEMA={
 height:['c.height',3,6,.05,'m'],orientation:['c.orientation',0,360,5,'°'],span:['c.span',32,62,.01,'m'],aspect:['c.aspect',.65,1.5,.05,'×'],floors:['c.floors',12,70,1,''],
 taper:['c.taper',.6,1.2,.02,'×'],twist:['c.twist',0,180,5,'°'],
 core:['c.core',12,26,1,'m'],common:['c.common',8,22,1,'%'],
 site:['c.site',40,100,2,'m'],maxHeight:['c.maxHeight',100,350,5,'m'],frontage:['c.frontage',4,9,.5,'m'],
 rent:['c.rent',100,1400,25,'$'],premium:['c.premium',0,80,5,'%'],
 occupancy:['c.occupancy',50,100,1,'%'],reserve:['c.reserve',0,60,2,'$']};

/* Which rail panel each control is built into. The manual reads this too, so a
   control cannot exist without a panel and a label, and cannot be documented in
   a place that does not exist. */
export const GROUPS={
 orientationControl:['orientation'],
 geometryControls:['span','aspect','floors','height','taper','twist'],
 constraintControls:['core','common','site','maxHeight','frontage'],
 rentControls:['rent','premium','occupancy','reserve']};

/* The range is relative to the scheme rather than absolute, so the manual
   reports it as such instead of implying 32 m is a wall. */
export const RELATIVE=new Set(['span']);

/* The two figures a reader is most likely to read as results when they are
   inputs. Flagged in the manual, not hidden. */
export const ASSUMPTION=new Set(['rent','premium','occupancy','reserve','site','maxHeight','frontage']);