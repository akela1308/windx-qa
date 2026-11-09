import { z } from "zod";
const Text=z.string().max(400);
export const SearchSnapshotSchema=z.object({
  title:Text,titleCount:z.number().int().min(0).max(100),description:z.string().max(1000),descriptionCount:z.number().int().min(0).max(100),lang:Text,
  h1:z.array(z.object({section:z.number().int().min(-1).max(15),text:Text})).max(100),
  robots:z.array(Text).max(20),canonicals:z.array(Text).max(20),
  links:z.array(z.object({section:z.number().int().min(-1).max(15),href:Text,targetExists:z.boolean()})).max(250),
  jsonld:z.array(z.string().max(32_000)).max(8),text:z.string().max(20_000),missingAlt:z.number().int().min(0).max(1000),
  sitemap:z.object({valid:z.boolean(),locations:z.array(Text).max(500),limited:z.boolean()}).nullable(),limited:z.boolean(),
});
export type SearchSnapshot=z.infer<typeof SearchSnapshotSchema>;
export const ProbeSchema=z.object({status:z.number().int().min(100).max(599).nullable(),body:z.string().max(140_000),type:Text,robots:Text,version:Text,publication:Text,limited:z.boolean(),error:z.enum(["none","unavailable","disabled","notPublished"])});
export type PublicProbe=z.infer<typeof ProbeSchema>;
export const EvidenceSchema=z.object({id:z.uuid(),at:z.number().int(),siteId:z.string().regex(/^[a-z0-9-]+$/),target:z.enum(["draft","published"]),fingerprint:z.string().regex(/^[a-f0-9]{64}$/),version:z.number().int().positive(),url:z.url().max(300),htmlHash:z.string().regex(/^[a-f0-9]{64}$/),page:ProbeSchema.omit({body:true}),robots:ProbeSchema,sitemap:ProbeSchema,source:z.enum(["generated","http"])});
export type SearchEvidence=z.infer<typeof EvidenceSchema>;
export type SearchCode="title"|"description"|"h1"|"language"|"languageMismatch"|"canonical"|"canonicalConflict"|"noindex"|"crawlBlocked"|"robotsUnavailable"|"sitemapUnavailable"|"sitemapInvalid"|"sitemapMissingPage"|"localMissing"|"localInvalid"|"jsonInvalid"|"address"|"phone"|"phoneFormat"|"contactMismatch"|"facts"|"brokenLink"|"alt"|"http"|"snapshot";
export type SearchFinding={code:SearchCode;section?:number;evidence:string;priority:"high"|"medium"|"low";confidence:"measured"|"possible";action:"review"|"owner"|"specialist";source:"html"|"document"|"http";reference:string};
export type SearchReport={id:string;at:string;version:number;target:"draft"|"published";fingerprint:string;url:string;source:"generated"|"http";findings:SearchFinding[];title:string;description:string;lang:string;h1Count:number;types:string[];passed:string[];browser:boolean;limited:boolean;pageStatus:number|null;robotsStatus:number|null;sitemapStatus:number|null;unavailable:boolean;customCode:boolean};
export type SearchCheckState={draft:string;published:string|null;reports:SearchReport[]};
