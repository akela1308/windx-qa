import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {validateDoc,type SiteDoc} from '@/lib/design';
import {templateIndex} from './templates';
export async function readCatalogueDocument(file:string):Promise<SiteDoc>{
 const checked=validateDoc(JSON.parse(await readFile(path.join(process.cwd(),'docs','catalog',file),'utf8')));
 if(!checked.ok)throw Error('Invalid public catalogue document');return checked.doc;
}
export async function templateReference(value:unknown){
 const i=templateIndex(value);if(i===undefined)return '';
 const [doc,instructions]=await Promise.all([readCatalogueDocument(`template-${i}.json`),readFile(path.join(process.cwd(),'src/lib/prompts/selected-template.md'),'utf8')]);
 return '\n\n## Explicitly selected starting template\n'+templateLayoutReference(doc)+'\n\n'+instructions.trim();
}

// Only spatial roles, never example copy, SVG, contacts or other business facts.
// A selected template is more specific than the generic direction's suggested layouts.
export function templateLayoutReference(doc:SiteDoc){
 const hero=doc.sections.find(s=>s.composition.startsWith('hero.'));
 const primary=doc.sections.find(s=>s.composition.startsWith('services.')&&s.composition!=='services.cta-band');
 if(!hero)throw Error('Catalogue template has no hero');
 const props=hero.props&&typeof hero.props==='object'?hero.props:{};
 const spatial:Record<string,string>={};
 if('align' in props&&typeof props.align==='string')spatial.align=props.align;
 if('graphicSide' in props&&typeof props.graphicSide==='string')spatial.graphicSide=props.graphicSide;
 const reference={hero:{composition:hero.composition,spatial},primaryOffering:primary?.composition,laterSectionRoles:doc.sections.filter(s=>s!==hero&&s!==primary&&!s.composition.startsWith('header.')&&!s.composition.startsWith('footer.')).map(s=>s.composition)};
 return JSON.stringify(reference,null,2);
}
