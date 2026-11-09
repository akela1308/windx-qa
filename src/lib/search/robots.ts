// Базовые Allow/Disallow для корня сайта и групп Googlebot/*.
// Это не эмулятор всех правил и версий поисковых роботов.
export function blocksGoogleRoot(text:string):boolean {
 const groups:{agents:string[];rules:{allow:boolean;path:string}[]}[]=[];
 // Отдельный аккумулятор позволяет объединять несколько User-agent до правил.
 let agents:string[]=[],rules:{allow:boolean;path:string}[]=[],seenRule=false;
 const flush=()=>{if(agents.length)groups.push({agents,rules});agents=[];rules=[];seenRule=false;};
 for(const line of text.replace(/^\uFEFF/,"").split(/\r?\n/)){
   const clean=line.split("#")[0].trim(),colon=clean.indexOf(":");if(colon<0)continue;
   const key=clean.slice(0,colon).trim().toLowerCase(),value=clean.slice(colon+1).trim();
   if(key==="user-agent"){if(seenRule)flush();agents.push(value.toLowerCase());}
   else if(agents.length&&(key==="allow"||key==="disallow")){seenRule=true;if(value)rules.push({allow:key==="allow",path:value});}
 }
 flush();const specific=groups.filter(g=>g.agents.includes("googlebot"));
 const selected=specific.length?specific:groups.filter(g=>g.agents.includes("*"));
 let best=-1,allow=true;
 for(const rule of selected.flatMap(g=>g.rules)){
   const pattern=rule.path,terminal=pattern.endsWith("$"),plain=terminal?pattern.slice(0,-1):pattern;
   const escaped=plain.split("*").map(part=>part.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join(".*");
   if(!new RegExp(`^${escaped}${terminal?"$":""}`).test("/"))continue;
   const length=plain.replace(/\*/g,"").length;
   if(length>best){best=length;allow=rule.allow;}else if(length===best&&rule.allow)allow=true;
 }
 return !allow;
}

export function hasGoogleNoindex(meta:string[],header:string):boolean {
 const blocks=(value:string)=>/(?:^|[\s,;])(?:noindex|none)(?:$|[\s,;])/i.test(value);
 if(meta.some(blocks))return true;
 let agent="";
 for(const part of header.split(",")){
   let value=part.trim();const prefix=value.match(/^([a-z][a-z0-9_-]*):\s*(.*)$/i);
   if(prefix&&!["unavailable_after","max-snippet","max-image-preview","max-video-preview"].includes(prefix[1].toLowerCase())){agent=prefix[1].toLowerCase();value=prefix[2];}
   if((!agent||agent==="googlebot"||agent==="*")&&blocks(value))return true;
 }
 return false;
}
