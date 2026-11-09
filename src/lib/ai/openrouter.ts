import { costUsd } from "./pricing";
import type { AiProvider, AiRequest, AiResponse } from "./provider";
import { estimateTokens } from "./tokens";

// Настоящая модель через OpenRouter: один ключ, любая модель (Claude, GPT, Gemini).
// Модель задаётся переменными окружения, код при смене модели не меняется.
//   OPENROUTER_API_KEY  ключ (только в .env.local или в настройках хостинга)
//   AI_MODEL            основная модель, по умолчанию Claude Sonnet 5.5
//   AI_MODEL_SMALL      дешёвая модель для мелких задач (подбор стиля)

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
export const DEFAULT_MODEL = "anthropic/claude-sonnet-5.5";
export const DEFAULT_SMALL_MODEL = "anthropic/claude-haiku-5.5";

type OpenRouterReply = {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
  error?: { message?: string };
};

export class OpenRouterProvider implements AiProvider {
  constructor(private key: string, private model: string) {}

  async complete(req: AiRequest): Promise<AiResponse> {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/json",
        "X-Title": "WINDX",
      },
      body: JSON.stringify({
        model: req.model ?? this.model,
        messages: [
          // Системный промпт одинаковый во всех запросах: помечаем его для кэша Anthropic,
          // повторное чтение из кэша стоит примерно 10% обычной цены.
          { role: "system", content: [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }] },
          { role: "user", content: req.user },
        ],
        max_tokens: req.maxTokens ?? 16000,
        ...(req.jsonObject ? { response_format: { type: "json_object" }, provider: { require_parameters: true } } : {}),
        // Просим OpenRouter вернуть фактическую стоимость запроса.
        usage: { include: true },
      }),
      signal: AbortSignal.timeout(180_000),
    });
    const data = (await res.json().catch(() => ({}))) as OpenRouterReply;
    if (!res.ok || data.error) throw new Error(`OpenRouter ${res.status}: ${data.error?.message ?? "request failed"}`);

    const text = data.choices?.[0]?.message?.content ?? "";
    const known = (n: unknown): n is number => typeof n === "number" && Number.isSafeInteger(n) && n >= 0;
    const inputKnown = known(data.usage?.prompt_tokens), outputKnown = known(data.usage?.completion_tokens);
    const input = inputKnown ? data.usage!.prompt_tokens! : estimateTokens(req.system + req.user);
    const output = outputKnown ? data.usage!.completion_tokens! : estimateTokens(text);
    const costKnown=typeof data.usage?.cost === "number" && Number.isFinite(data.usage.cost) && data.usage.cost >= 0;
    return {
      text,
      usage: {
        inputTokens: input,
        outputTokens: output,
        estimated: !inputKnown || !outputKnown || !costKnown,
        costUsd: costKnown ? data.usage!.cost! : costUsd(input, output,req.model??this.model),
      },
    };
  }
}
