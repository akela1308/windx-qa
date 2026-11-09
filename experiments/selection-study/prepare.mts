import{readFile,writeFile,mkdir}from'node:fs/promises';
const root='data/verification/selection-study-2026-11-04';await mkdir(root,{recursive:true});
const cases=JSON.parse(await readFile('experiments/selection-study/cases.json','utf8')) as {id:string;brief:string}[];
const suffix=(await readFile('experiments/selection-study/suffix.txt','utf8')).trim();
for(const c of cases){const file=`${root}/${c.id}.txt`,text=c.brief+'\n\n'+suffix+'\n',old=await readFile(file,'utf8').catch((e:{code?:string})=>{if(e.code!=='ENOENT')throw e;return undefined;});if(old!==undefined&&old!==text)throw Error('Frozen brief changed: '+c.id);await writeFile(file,text);}
console.log('Eight fixed briefs prepared. No AI calls.');
