// Считаем композиции, а не шрифты/цвета. Повтор меню внутри одного сайта
// не превращается в несколько независимых случаев использования макета.
export type MobileProbe = {width: number; scrollWidth: number; ctaBottom: number | null; viewportHeight: number};
export type Capture = {
  caseId: string;
  phase: string;
  url: string;
  sections: {composition: string; id: string; text: string}[];
  photoSlots: number;
  mobile: MobileProbe;
  finalMobile?: MobileProbe;
};
const tally=(values:string[])=>Object.fromEntries([...new Set(values)].map(k=>[k,values.filter(v=>v===k).length]));
const services=(r:Capture)=>r.sections.filter(s=>s.composition.startsWith('services.')&&s.composition!=='services.cta-band').map(s=>s.composition);
const sequence=(r:Capture)=>r.sections.filter(s=>!/^(header|footer|signature)\./.test(s.composition)).map(s=>s.composition).join(' → ');
export function summariseCaptures(results:Capture[]) {
  return ['before','candidate','after'].filter(phase=>results.some(r=>r.phase===phase)).map(phase=>{
    const rows=results.filter(r=>r.phase===phase).sort((a,b)=>a.caseId.localeCompare(b.caseId));
    if(new Set(rows.map(r=>r.caseId)).size!==rows.length)throw Error('Duplicate case in a phase');
    return {
      phase,n:rows.length,
      heroes:tally(rows.map(r=>r.sections.find(s=>s.composition.startsWith('hero.'))?.composition??'missing')),
      serviceCompositions:tally(rows.flatMap(services)),
      sitesUsingServiceCompositions:tally(rows.flatMap(r=>[...new Set(services(r))])),
      uniqueCoreSequences:new Set(rows.map(sequence)).size,
      rows:rows.map(r=>{const m=r.finalMobile??r.mobile;return {case:r.caseId,url:r.url,sequence:sequence(r),sections:r.sections.length,photoSlots:r.photoSlots,mobileSource:r.finalMobile?'standalone-fixed-viewport':'initial-editor-preview',mobileOverflow:m.scrollWidth>m.width+1,ctaInitiallyVisible:m.ctaBottom===null?null:m.ctaBottom<=m.viewportHeight};}),
    };
  });
}
