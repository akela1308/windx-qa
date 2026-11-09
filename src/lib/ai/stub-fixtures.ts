// Только для заглушки. Без настоящей модели мы не можем сгенерировать сайт
// по новому описанию, поэтому подбираем самый похожий готовый ответ
// из экспериментов (docs/experiment-*). Настоящий провайдер это игнорирует.

// strong: слова, которые прямо называют нишу (весят втрое); words: косвенные признаки.
// Считаем, сколько раз слово встретилось: «студия йоги над пекарней» остаётся йогой.
const BUSINESSES = [
  { key: "tattoo", strong: ["tattoo", "тату", "tatuaje"], words: ["artist", "blackwork", "fine line"] },
  { key: "dentist", strong: ["dentist", "dental", "стомат", "dentista"], words: ["teeth", "tooth", "orthodont", "invisalign", "hygien", "зуб"] },
  { key: "bakery", strong: ["bakery", "пекарн", "panader"], words: ["bread", "sourdough", "baker", "pastr", "cake", "хлеб", "торт", "pastel"] },
  { key: "barber", strong: ["barber", "барбер"], words: ["haircut", "fade", "shave", "стрижк", "beard"] },
  { key: "florist", strong: ["florist", "флорист", "floristería"], words: ["flower", "bouquet", "букет", "цвет", "flor", "ramo", "wedding flowers"] },
  { key: "plumber", strong: ["plumb", "сантех", "fontaner"], words: ["boiler", "leak", "drain", "котёл", "котел", "протеч"] },
  { key: "electrician", strong: ["electrician", "электрик", "electricista"], words: ["electric", "rewire", "wiring", "fuse", "ev charger", "проводк"] },
  { key: "cafe", strong: ["cafe", "café", "coffee", "кафе", "кофе", "cafetería"], words: ["brunch", "breakfast", "toastie", "завтрак"] },
  { key: "tutor", strong: ["tutor", "репетит", "profesor particular"], words: ["tuition", "lessons", "gcse", "maths", "exam", "урок", "clases"] },
  { key: "law", strong: ["solicitor", "lawyer", "law practice", "юрист", "адвокат", "abogado"], words: ["law", "legal", "probate", "divorce", "wills", "accountant", "бухгалт"] },
  { key: "yoga", strong: ["yoga", "йог", "pilates", "пилатес"], words: ["mats", "class", "wellness", "massage", "масса"] },
  { key: "bike", strong: ["bike", "bicycle", "велосипед", "bici"], words: ["cycle", "repair", "workshop", "mechanic", "мастерск", "ремонт", "taller"] },
];

const count = (text: string, w: string) => text.split(w).length - 1;

export function pickBusiness(brief: string): string {
  const text = brief.toLowerCase();
  let best = { key: "bike", score: 0 };
  for (const b of BUSINESSES) {
    const score = b.strong.reduce((s, w) => s + 3 * count(text, w), 0) + b.words.reduce((s, w) => s + count(text, w), 0);
    if (score > best.score) best = { key: b.key, score };
  }
  return best.key;
}

// Готовые сайты: бизнес → направление → файл (путь от docs/).
// experiment-1c: три бизнеса в трёх стилях; demo-sites: по одному сайту на нишу
// (пекарня и барбершоп сделаны настоящей моделью, остальные подпиской Claude по тем же промптам).
const FIXTURES: Record<string, Record<string, string>> = {
  bike: { swiss: "experiment-1c/outputs/bike/light.json", "night-shift": "experiment-1c/outputs/bike/dark.json", signal: "experiment-1c/outputs/bike/colour.json" },
  law: { newsprint: "experiment-1c/outputs/law/light.json", "deep-ink": "experiment-1c/outputs/law/dark.json", monotone: "experiment-1c/outputs/law/colour.json" },
  yoga: { "soft-clay": "experiment-1c/outputs/yoga/light.json", "deep-ink": "experiment-1c/outputs/yoga/dark.json", "poster-duo": "experiment-1c/outputs/yoga/colour.json" },
  bakery: { "soft-clay": "demo-sites/outputs/bakery.json" },
  barber: { newsprint: "demo-sites/outputs/barber.json" },
  dentist: { swiss: "demo-sites/outputs/dentist.json" },
  florist: { "poster-duo": "demo-sites/outputs/florist.json" },
  plumber: { signal: "demo-sites/outputs/plumber.json" },
  cafe: { monotone: "demo-sites/outputs/cafe.json" },
  electrician: { newsprint: "demo-sites/outputs/electrician.json" },
  tattoo: { "night-shift": "demo-sites/outputs/tattoo.json" },
  tutor: { "warm-editorial": "demo-sites/outputs/tutor.json" },
};

// Ключ готового ответа (путь от docs/) и честный признак, совпал ли выбранный стиль.
export function pickFixture(brief: string, direction?: string): { key: string; styleMatched: boolean } {
  const options = FIXTURES[pickBusiness(brief)];
  if (direction && options[direction]) return { key: options[direction], styleMatched: true };
  return { key: Object.values(options)[0], styleMatched: !direction };
}

// Три демо-просьбы, которые код умеет выполнить без модели (см. sites/demo-edits.ts).
const EDITS = [
  { step: "calm-hero", words: ["calm", "hero", "quiet", "спокой", "главн", "tranquil", "portada"] },
  { step: "services", words: ["service", "differen", "услуг", "по-другому", "servicio"] },
  { step: "memorable", words: ["memorable", "element", "visual", "illustrat", "запомина", "элемент"] },
] as const;
export type DemoEdit = (typeof EDITS)[number]["step"];

// Приставку выбранного блока («Only change section 3 (hero.band).») не учитываем:
// название композиции не должно решать, какую демо-правку делать.
export const SECTION_PREFIX = /^Only change section (\d+) \(([\w.-]*)\)\. /;

export function pickEdit(request: string): DemoEdit | null {
  const text = request.replace(SECTION_PREFIX, "").toLowerCase();
  return EDITS.find((e) => e.words.some((w) => text.includes(w)))?.step ?? null;
}
