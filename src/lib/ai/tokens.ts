// Грубая оценка токенов: около 3.6 символа на токен для английского текста и разметки.
export function estimateTokens(s: string): number {
  return Math.ceil(s.length / 3.6);
}
