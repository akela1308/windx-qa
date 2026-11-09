import { createHmac,randomBytes,timingSafeEqual } from "node:crypto";
import { mkdir,readFile,writeFile,link,unlink } from "node:fs/promises";
import path from "node:path";
import { dataRoot } from "@/lib/auth/accounts";
import { EvidenceSchema,type SearchEvidence } from "./types";
async function secret() {
 const file=path.join(dataRoot(),"auth","search-check-key");await mkdir(path.dirname(file),{recursive:true,mode:0o700});
 try{return await readFile(file);}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;}
 const temp=`${file}.${randomBytes(8).toString("hex")}.tmp`;await writeFile(temp,randomBytes(32),{flag:"wx",mode:0o600});
 try{await link(temp,file);}catch(e){if((e as NodeJS.ErrnoException).code!=="EEXIST")throw e;}finally{await unlink(temp);}
 return readFile(file);
}
export async function signSearchEvidence(raw:SearchEvidence){const evidence=EvidenceSchema.parse(raw);return createHmac("sha256",await secret()).update(JSON.stringify(evidence)).digest("hex");}
export async function verifySearchEvidence(raw:unknown,signature:string){
 const evidence=EvidenceSchema.parse(raw);if(!/^[a-f0-9]{64}$/.test(signature)||evidence.at>Date.now()+30_000||Date.now()-evidence.at>10*60_000)throw Error("Expired check");
 const expected=await signSearchEvidence(evidence);if(!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))throw Error("Invalid check evidence");return evidence;
}
