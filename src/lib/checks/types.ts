import { z } from "zod";

const Text = z.string().max(400);
export const BrowserScanSchema = z.object({
  width: z.number().int().min(320).max(1600),
  headings: z.array(z.object({ section: z.number().int().min(-1).max(15), text: Text })).max(150),
  links: z.array(z.object({ section: z.number().int().min(-1).max(15), href: Text, label: Text, targetExists: z.boolean() })).max(250),
  duplicateIds: z.array(Text).max(30),
  missingAlt: z.array(z.number().int().min(-1).max(15)).max(50),
  overflow: z.array(z.number().int().min(-1).max(15)).max(16),
  smallTargets: z.array(z.number().int().min(-1).max(15)).max(16),
  contrasts: z.array(z.object({ section: z.number().int().min(-1).max(15), text: Text, ratio: z.number().min(1).max(21), min: z.number().min(3).max(4.5) })).max(50),
  fontsReady: z.boolean(), truncated: z.boolean(),
});
export type BrowserScan = z.infer<typeof BrowserScanSchema>;
export type Finding = {
  code: "brokenLink" | "unsafeLink" | "invalidContact" | "emptyHeading" | "duplicateHeading" | "duplicateId" | "missingPhone" | "missingEmail" | "photo" | "alt" | "weight" | "contrast" | "overflow" | "target" | "unconfirmed" | "wrong" | "recipient";
  section?: number; evidence: string; source: "document" | "browser";
  priority: "high" | "medium" | "low"; confidence: "measured" | "possible";
  action: "review" | "owner" | "specialist";
};
export type WorksReport = {
  id: string; at: string; version: number; fingerprint: string; locale: string;
  findings: Finding[]; htmlBytes: number; browser: boolean; fontsReady: boolean;
  externalLinks: number; customCode: number; forms: number; limited: boolean;
};
export type WorksCheckState = { fingerprint: string; version: number; reports: WorksReport[] };
