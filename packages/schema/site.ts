import { z } from "zod";

// Ядро модели сайта. Здесь нет ничего про конкретную нишу:
// какие секции бывают и какие у них props, решает пакет ниши (packs/*).

export const DaySchema = z.enum(["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]);
export type Day = z.infer<typeof DaySchema>;

const time = z.string().regex(/^\d{2}:\d{2}$/, "Формат времени HH:MM");

export const OpeningHoursSchema = z.object({
  days: z.array(DaySchema).min(1),
  opens: time,
  closes: time,
});

export const ServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.string().optional(),
});

export const BusinessSchema = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
  area: z.string().optional(), // район, например Hackney
  phone: z.string().min(1),
  email: z.string().optional(),
  address: z.string().min(1), // улица и дом
  postcode: z.string().optional(),
  hours: z.array(OpeningHoursSchema),
  services: z.array(ServiceSchema).min(1),
  about: z.string().min(1),
});

// Секция в ядре: только тип и произвольные данные.
// Проверку props по схеме делает validateSite() с помощью пакета ниши.
export const SectionSchema = z.object({
  id: z.string().optional(),
  type: z.string().min(1),
  props: z.record(z.string(), z.unknown()),
});

export const PageSchema = z.object({
  path: z.string().startsWith("/"),
  title: z.string().min(1),
  seo: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
  }),
  sections: z.array(SectionSchema).min(1),
});

export const SiteSchema = z.object({
  id: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Только латиница в нижнем регистре, цифры и дефис"),
  domain: z.string().optional(),
  pack: z.string().min(1), // id пакета ниши, например generic-local-business
  character: z.string().min(1), // id визуального характера из пакета
  locale: z.string().default("en-GB"),
  business: BusinessSchema,
  pages: z.array(PageSchema).min(1),
});

export type OpeningHours = z.infer<typeof OpeningHoursSchema>;
export type Business = z.infer<typeof BusinessSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type Page = z.infer<typeof PageSchema>;
export type Site = z.infer<typeof SiteSchema>;
