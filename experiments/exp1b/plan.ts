// План эксперимента 1b: какие направления получает каждый бизнес.
//
// Правило: по одному направлению из каждого семейства (светлое, тёмное, цветное),
// подходящему бизнесу по тегу suits. Где можно, разным бизнесам даём разные
// направления, чтобы отделить влияние направления от влияния бизнеса.
// «Тёплый журнальный» (бежевый) не берём: это и есть результат эксперимента 1.
// deep-ink получают и юристы, и йога: так видно, как одно направление
// выглядит у разных бизнесов.
//
// run "repeat" повторяет первое направление: сходится ли модель внутри стиля.

export const PLAN = {
  bike: { light: "swiss", dark: "night-shift", colour: "signal" },
  law: { light: "newsprint", dark: "deep-ink", colour: "monotone" },
  yoga: { light: "soft-clay", dark: "deep-ink", colour: "poster-duo" },
} as const;

export type Biz = keyof typeof PLAN;
export const RUNS = ["light", "dark", "colour", "repeat"] as const;
export type RunName = (typeof RUNS)[number];

export function directionFor(biz: Biz, run: RunName): string {
  return run === "repeat" ? PLAN[biz].light : PLAN[biz][run];
}
