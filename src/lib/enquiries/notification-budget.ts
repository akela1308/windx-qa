import { authFile, readJson, replaceJson, serialAuth } from "@/lib/auth/account-store";
// Временный общий предел запросов уведомлений на текущем бесплатном почтовом
// аккаунте: оставляем часть квоты для восстановления доступа. Это не тариф.
export const ENQUIRY_MAIL_DAILY_LIMIT = 50;
export async function reserveNotificationSend(now: number) {
  const day = new Date(now).toISOString().slice(0, 10);
  return serialAuth(`enquiry-mail-budget:${day}`, async () => {
    const file = authFile("enquiry-mail-budget", day);
    const count = (await readJson<{ count: number }>(file))?.count ?? 0;
    if (count >= ENQUIRY_MAIL_DAILY_LIMIT) return Date.parse(`${day}T00:00:00Z`) + 24 * 3600_000;
    await replaceJson(file, { count: count + 1 });
    return null;
  });
}
