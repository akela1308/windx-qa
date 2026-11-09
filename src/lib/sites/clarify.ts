// Правило из мастер-контекста: до первого результата не задаём лишних вопросов.
// Спрашиваем один конкретный вопрос, только если без ответа сайт не сделать.
//
// ГИПОТЕЗА: пока это простая проверка длины описания. Когда подключим модель,
// решать, хватает ли сведений, будет она сама (с тем же правилом в промпте).

export type Clarification = { questionKey: "clarifyWhat" } | null;

export function needsClarification(brief: string): Clarification {
  const words = brief.trim().split(/\s+/).filter(Boolean);
  // Из 5 слов и меньше обычно не понять, чем занимается бизнес.
  return words.length <= 5 ? { questionKey: "clarifyWhat" } : null;
}
