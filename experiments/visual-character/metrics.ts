import {fontCharacter,fontKeyForFamily} from '../exp1/a/font-character';
import {contrast} from '../exp1/a/tokens';
export type Palette={bg:string;surface:string;ink:string;muted:string;accent:string;accentInk:string;line:string};
export function backgroundFamily(hex:string){
 if(!/^#[0-9a-f]{6}$/i.test(hex))return 'unknown';
 const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),max=Math.max(r,g,b),min=Math.min(r,g,b),c=max-min,l=(max+min)/2;
 let h=0;if(c){if(max===r)h=((g-b)/c)%6;else if(max===g)h=(b-r)/c+2;else h=(r-g)/c+4;h=(h*60+360)%360;}
 if(l<.25)return 'dark';
 if(c<.025)return l>=.8?'neutral-light':'neutral-mid';
 if(l>=.8){if(h>=20&&h<=70&&c<=.22)return 'warm-light';return h>=130&&h<=300?'cool-light':'chromatic-light';}
 return c>=.25?'strong-colour':'muted-colour';
}
export function paletteContrast(c:Palette){return {inkBg:contrast(c.ink,c.bg),inkSurface:contrast(c.ink,c.surface),mutedBg:contrast(c.muted,c.bg),mutedSurface:contrast(c.muted,c.surface),action:contrast(c.accentInk,c.accent)};}
export function snapshotFromHtml(html:string){
 const variable=(name:string)=>{const value=html.match(new RegExp('--'+name+':([^;]+);'))?.[1];if(!value)throw Error('Missing rendered variable: '+name);return value.trim();};
 const colors:Palette={bg:variable('bg'),surface:variable('surface'),ink:variable('ink'),muted:variable('muted'),accent:variable('accent'),accentInk:variable('accent-ink'),line:variable('line')};
 const heroTag=html.match(/<[^>]+\bdata-section="hero\.[^"]*"[^>]*>/)?.[0];
 const heroTone=heroTag?.match(/\bclass="[^"]*\btone-(default|ink|accent|surface)\b/)?.[1];
 return {heroTone,colors,displayFont:variable('f-display'),bodyFont:variable('f-body'),weight:Number(variable('d-weight')),italic:variable('d-style')==='italic'};
}
export type CharacterCapture={caseId:string;phase:'before'|'after'|'holdout'|'control';url:string;colors:Palette;displayFont:string;bodyFont:string;weight:number;italic:boolean;heroTone?:string};
const tally=(values:string[])=>Object.fromEntries([...new Set(values)].map(v=>[v,values.filter(x=>x===v).length]));
export function summariseCharacters(captures:CharacterCapture[]){
 return ['before','after','holdout','control'].map(phase=>{
  const rows=captures.filter(c=>c.phase===phase).sort((a,b)=>a.caseId.localeCompare(b.caseId));
  if(new Set(rows.map(c=>c.caseId)).size!==rows.length)throw Error('Duplicate captured case');
  const values=rows.map(c=>{const displayKey=fontKeyForFamily(c.displayFont),bodyKey=fontKeyForFamily(c.bodyFont);const heroBg=c.heroTone==='accent'?c.colors.accent:c.heroTone==='ink'?c.colors.ink:c.heroTone==='surface'?c.colors.surface:c.heroTone==='default'?c.colors.bg:undefined;return {case:c.caseId,url:c.url,heroTone:c.heroTone,heroBg,heroBackgroundFamily:heroBg?backgroundFamily(heroBg):'unknown',bg:c.colors.bg,backgroundFamily:backgroundFamily(c.colors.bg),surface:c.colors.surface,surfaceFamily:backgroundFamily(c.colors.surface),accent:c.colors.accent,displayFont:displayKey??'unknown',displayKind:displayKey?fontCharacter(displayKey).kind:'unknown',bodyFont:bodyKey??'unknown',contrast:paletteContrast(c.colors)};});
  return {phase,n:rows.length,backgroundFamilies:tally(values.map(v=>v.backgroundFamily)),heroBackgroundFamilies:tally(values.map(v=>v.heroBackgroundFamily)),surfaceFamilies:tally(values.map(v=>v.surfaceFamily)),headingKinds:tally(values.map(v=>v.displayKind)),headingFonts:tally(values.map(v=>v.displayFont)),rows:values};
 }).filter(p=>p.n);
}
