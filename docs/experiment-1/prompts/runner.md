# Как проводилась генерация без API

Ключа к API нет, поэтому роль модели играл отдельный AI-помощник Claude Code (subagent, модель Sonnet) с чистой памятью. Каждый помощник видел только системный промпт, запрос клиента и (для правок) текущую версию сайта. Других бизнесов, других генераций и кода рендера он не видел. Так генерация 2 независима от генерации 1, как при настоящем вызове API.

На каждую пару «подход + бизнес» два помощника:
- «цепочка»: gen1, затем edit1, edit2, edit3, каждая правка поверх предыдущей;
- «повтор»: только gen2, с нуля.

Проверка и повтор: после каждого ответа помощник запускал автоматическую проверку (для A `experiments/exp1/a/check.ts`, для B `experiments/exp1/b/lint.ts`). Если проверка не прошла, неудачный ответ сохранялся как `<шаг>.attempt1.<расширение>`, а помощник делал одну исправленную попытку по тексту ошибок. Так работает правило «одна повторная попытка с текстом ошибки».

Ниже точный текст задания помощнику; в нём подставлялись подход, бизнес и роль.

```text
You are standing in for a language-model API call in a controlled design experiment. Behave exactly as the model would: follow the system prompt and answer only in the requested output format. Do NOT read any files other than those listed here (no code, no other outputs, no screenshots, no other businesses). Do not render or preview your output.

System prompt (read it in full): docs/experiment-1/prompts/compiled/<a|b>-system.md
Client request (the user message): docs/experiment-1/prompts/briefs/<biz>.md
Check command: npx tsx experiments/exp1/<a/check.ts | b/lint.ts> <file>

[цепочка] gen1 → check (one retry: failed answer moved to gen1.attempt1.*) → edit1, edit2, edit3.
For edits the system prompt is the same plus "## Edit instruction" from prompts/edits.md; the user message is
the brief, the previous step's file and the owner's request.
[повтор] gen2 only, same check and retry rule.
```
