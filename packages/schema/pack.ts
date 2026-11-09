import type { z } from "zod";
import type { Character } from "./character";
import type { Page, Site } from "./site";

// Пакет ниши: всё, что отличает одну нишу от другой, живёт здесь как данные.
// Движок работает с любым пакетом одинаково.

export type SectionSpec = {
  // Какой компонент из библиотеки packages/sections рисует эту секцию.
  component: string;
  // Схема props. Пакет может взять схему библиотеки как есть или ужесточить её.
  schema: z.ZodType;
  // Подсказка для AI: что это за секция и когда её ставить.
  description: string;
};

export type OnboardingQuestion = {
  id: string;
  kind: "text" | "textarea" | "list" | "choice" | "photos";
  required: boolean;
  label: { en: string; ru: string };
  hint?: { en: string; ru: string };
  options?: { value: string; label: { en: string; ru: string } }[];
};

export type PackPrompts = {
  system: string;
  generation: string;
};

export type PackSeo = {
  title: (site: Site, page: Page) => string;
  description: (site: Site, page: Page) => string;
  jsonLd: (site: Site, url: string) => Record<string, unknown>;
};

export type NichePack = {
  id: string;
  name: string;
  sections: Record<string, SectionSpec>;
  // Рекомендуемый порядок секций на главной (AI может отступить от него).
  defaultHomeSections: string[];
  characters: Character[];
  onboarding: OnboardingQuestion[];
  prompts: PackPrompts;
  seo: PackSeo;
};
