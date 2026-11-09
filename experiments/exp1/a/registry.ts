import type { ReactNode } from "react";
import type { z } from "zod";
import type { Tokens } from "./tokens";

// Композиция = один способ подачи одного смысла («услуги списком-прайсом»,
// «услуги большим нумерованным индексом» и т.д.). Вёрстку пишем мы,
// AI только выбирает композицию и заполняет props по схеме.

export type RenderCtx = {
  sectionIndex?: number;
  enquiry?: { action: string; token: (index: number) => string; recipientReady: boolean };
  tokens: Tokens;
  index: number; // порядковый номер секции, для меток «01 / Services»
};

export type Composition<S extends z.ZodType = z.ZodType> = {
  // Подсказка для AI: как выглядит и когда уместна. Попадает в промпт.
  description: string;
  props: S;
  css: string;
  render: (props: z.infer<S>, ctx: RenderCtx) => ReactNode;
};

export function defineComposition<S extends z.ZodType>(c: Composition<S>): Composition<S> {
  return c;
}
