import { z } from "zod";
import type { Composition } from "./registry";
import { TokensSchema } from "./tokens";
import { header } from "./compositions/header";
import { heroLayouts } from "./compositions/hero-layouts";
import { heroImages } from "./compositions/hero-images";
import { VisualPlanSchema } from "./visual-plan";
import { serviceLayouts } from "./compositions/service-layouts";
import { hero } from "./compositions/hero";
import { services } from "./compositions/services";
import { story } from "./compositions/story";
import { extras } from "./compositions/extras";
import { contact } from "./compositions/contact";
import { signature } from "./compositions/signature";
import { footer } from "./compositions/footer";
import { embed } from "./compositions/embed";
import { media } from "./compositions/media";
import { enquiry } from "./compositions/enquiry";
import { free } from "./compositions/free";

// Вся библиотека композиций подхода A в одном словаре.
export const COMPOSITIONS: Record<string, Composition> = {
  ...header, ...hero, ...heroLayouts, ...heroImages, ...services, ...serviceLayouts, ...story, ...extras, ...contact, ...enquiry, ...signature, ...footer, ...embed, ...media, ...free,
};

const sectionShape = (key: string, c: Composition) =>
  z.object({
    composition: z.literal(key).describe(c.description),
    id: z.string().regex(/^[a-z0-9-]+$/).optional().describe("Якорь для ссылок меню"),
    tone: z.enum(["default", "surface", "accent", "ink"]).describe("Фон секции"),
    props: c.props,
  });
type SectionVariant = ReturnType<typeof sectionShape>;

const sectionVariants = Object.entries(COMPOSITIONS).map(([key, c]) => sectionShape(key, c));

export const SectionSchema = z.discriminatedUnion("composition", sectionVariants as [SectionVariant, ...SectionVariant[]]);

export const SiteDocSchema = z.object({
  meta: z.object({
    businessName: z.string().min(1),
    title: z.string().min(1).max(70).describe("SEO title"),
    description: z.string().min(1).max(170).describe("SEO description"),
  }),
  rationale: z.string().describe("2-4 предложения: почему такой характер и такие композиции подходят этому бизнесу"),
  visualPlan: VisualPlanSchema.optional().describe("Required for new AI creation. Private design and image plan, never rendered as visitor copy. Optional for historical documents."),
  tokens: TokensSchema,
  sections: z.array(SectionSchema).min(3).max(16),
  factsToConfirm: z
    .array(z.object({ fact: z.string(), where: z.string() }))
    .describe("Все придуманные факты: контакты, адрес, часы, цены, цифры, отзывы, имена, обещания"),
}).superRefine((doc, ctx) => {
  // Редактор адресует свободный блок по стабильному ID, в том числе после импорта.
  doc.sections.forEach((section, index) => {
    if (section.composition !== "free.canvas") return;
    if (!section.id || doc.sections.filter(s => s.id === section.id).length !== 1)
      ctx.addIssue({code:"custom",path:["sections",index,"id"],message:"Free blocks require a unique stable section ID"});
  });
});

export type SiteDoc = z.infer<typeof SiteDocSchema>;
export type SectionDoc = SiteDoc["sections"][number] & { props: Record<string, unknown> };
