// Совместимая точка входа вместо сценария устаревшего интерфейса.
// Это HTTP-проверка production-сборки на одноразовых локальных данных.
// Визуальный браузерный аудит выполняется отдельно и описывается в отчёте.
if (process.argv.length > 2) throw new Error('Use npm run test:journey without a URL. The audit never mutates an external site.');
await import('../journey-http.mts');
