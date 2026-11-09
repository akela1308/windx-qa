// Оценка стоимости, когда провайдер не вернул точную цену (заглушка).
// Цены Claude Sonnet 5.5 на OpenRouter на 28.10.2026: $2 за миллион входных
// и $10 за миллион выходных токенов. С настоящей моделью берём цену из ответа OpenRouter.
const PRICES:Record<string,{input:number;output:number}>={
  "anthropic/claude-sonnet-5.5":{input:2,output:10},
  // OpenRouter public list pricing checked 2026-11-06. Provider-reported cost wins.
  "anthropic/claude-opus-5.5":{input:4,output:20},
};

export function costUsd(inputTokens: number, outputTokens: number,model="anthropic/claude-sonnet-5.5"): number {
  const price=PRICES[model]??PRICES["anthropic/claude-sonnet-5.5"];
  return (inputTokens*price.input+outputTokens*price.output)/1e6;
}
