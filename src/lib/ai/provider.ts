import { readFile } from "node:fs/promises";
import path from "node:path";
import { costUsd } from "./pricing";
import { DEFAULT_MODEL, OpenRouterProvider } from "./openrouter";
import { estimateTokens } from "./tokens";
import { consentProvider } from "./consent";

export { costUsd, estimateTokens };

// Единственная точка, через которую код обращается к модели.
// Две реализации: заглушка (готовые ответы из файлов в docs/) и настоящая модель через OpenRouter.
// Настоящая включается, когда задан OPENROUTER_API_KEY; иначе работает заглушка.

export type AiRequest = {
  system: string; // системный промпт (текст из файла промпта)
  user: string; // запрос пользователя и текущее состояние
  // Ключ готового ответа для заглушки: путь от папки docs/, например "experiment-1c/outputs/bike/light.json".
  // Настоящий провайдер его игнорирует.
  fixtureKey: string;
  model?: string; // другая модель для этого запроса (например, дешёвая для мелкой задачи)
  maxTokens?: number;
  jsonObject?: boolean; // ответ данными, без текста и псевдовызовов инструментов
};

export type AiResponse = {
  text: string;
  usage: { inputTokens: number; outputTokens: number; estimated: boolean; costUsd: number };
};

export interface AiProvider {
  complete(req: AiRequest): Promise<AiResponse>;
}

export class FixtureProvider implements AiProvider {
  constructor(private dir: string) {}

  async complete(req: AiRequest): Promise<AiResponse> {
    const text = await readFile(path.join(this.dir, req.fixtureKey), "utf8");
    const input = estimateTokens(req.system + req.user);
    const output = estimateTokens(text);
    return { text, usage: { inputTokens: input, outputTokens: output, estimated: true, costUsd: costUsd(input, output) } };
  }
}

// true, когда подключена настоящая модель (есть ключ и не включён принудительный демо-режим).
export function isLiveAi(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY) && process.env.AI_DEMO !== "1";
}

export function getProvider(): AiProvider {
  if (isLiveAi()) return consentProvider(new OpenRouterProvider(process.env.OPENROUTER_API_KEY!, process.env.AI_MODEL ?? DEFAULT_MODEL));
  const dir = process.env.AI_FIXTURES_DIR ?? path.join(process.cwd(), "docs");
  return new FixtureProvider(dir);
}
