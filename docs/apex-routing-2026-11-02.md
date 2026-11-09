# Настройка адреса WINDX без www

2 ноября 2026 года. Поручение владельца: исправить открытие страниц и вход по `windx.app`, максимум работы выполнить самостоятельно.

## Причина

До изменений `www.windx.app` ведёт на Railway (`aovikp6g.up.railway.app`), а `windx.app` использует перенаправление GoDaddy через A-записи `15.197.225.128` и `3.33.251.168`. Главная отвечает 301 на www, но `/how` возвращает 404, POST ранее возвращал 405. В редакторе GoDaddy доступны 301, 302 и masking, настройки сохранения пути нет. Маскирование не включалось.

Подключённый Railway MCP возвращает `Access denied to this project`; авторизация и глобальные ключи не менялись. Проблема находится до приложения. Код приложения, сессии и настройки аккаунтов в этой части не менялись.

## Настроено и активировано

В существующем Cloudflare-аккаунте `qa-contact@example.test's Account` подготовлена зона `windx.app`, план Free ($0). Регистрация домена остаётся в GoDaddy. Нового аккаунта, карты, платных сервисов или API-ключей не создавали.

Исходные 14 записей экспортированы из GoDaddy. В подготовленной зоне сохранены без изменений 6 CNAME и 3 TXT, включая оба адреса Resend, DKIM, DMARC, подтверждение Railway, www, wildcard клиентских сайтов и делегирование ACME. NS и SOA назначает DNS-провайдер; две A-записи старого перенаправления заменены одной корневой записью A `192.0.2.0` с проксированием для redirect-only режима. Она не является сервером приложения. Остальные записи оставлены DNS-only: трафик кабинета, клиентских поддоменов и почтовых сервисов не переводится через HTTP-прокси Cloudflare.

Все 9 сохраняемых записей проверены прямыми DNS-запросами на каждом из двух назначенных Cloudflare-серверов: **18 из 18 совпадений** с исходным экспортом. DNSSEC DS до изменений отсутствует; защита не отключалась. Автоматическое изменение robots.txt при настройке зоны выключено.

Подготовлено и повторно прочитано сохранённое правило `WINDX apex to canonical www`, ID `f72e7f1e8eb64db59a667fddcc87bf4b`:

- Условие: `(http.host eq "windx.app")`.
- Назначение: `concat("https://www.windx.app", http.request.uri.path)`.
- Статус 308, с сохранением HTTP-метода.
- Preserve query string включён.
- Правило включено в активной зоне Cloudflare.

Пример: `https://windx.app/login?next=%2Fsites` должен переводить на `https://www.windx.app/login?next=%2Fsites`. Вход, cookies и ссылки кабинета остаются на одном каноническом origin. Клиентские поддомены в условие правила не входят.

## Подтверждённое переключение

Владелец явно подтвердил использование текущего аккаунта и переключение DNS. В GoDaddy сохранена замена серверов имён только для `windx.app`; повторное чтение интерфейса показывает `Using custom nameservers` и оба новых сервера:

```text
Было:
ns21.domaincontrol.com
ns22.domaincontrol.com

Стало:
eoin.ns.cloudflare.com
nelly.ns.cloudflare.com
```

Это передало Cloudflare полномочия отвечать за DNS домена. Регистратор, оплата и аккаунты приложения не менялись.

Cloudflare показывает активную зону. Авторитетный реестр `.app`, резолверы `1.1.1.1` и `8.8.8.8` возвращают новые NS. Новый адрес отвечает по HTTPS с обычной проверкой сертификата; `/how?routing=propagation` возвращает 308 на точный адрес www с параметром. WWW и клиентские сайты остаются подключёнными непосредственно к Railway.

**Обновление при сквозном аудите:** старый кеш обновился. Обычный запуск `tests/apex-routing-live.mts` прошёл без подмены разрешения DNS. Chrome открыл `https://windx.app/account` на `https://www.windx.app/account` с сохранённой сессией и подтверждённой почтой владельца. Системные настройки, hosts и браузерная защита не менялись. У отдельных посетителей старый DNS-кеш ещё может обновляться независимо.

Откат: вернуть `ns21.domaincontrol.com` и `ns22.domaincontrol.com` в GoDaddy. Исходная зона сохранена; переключение и откат зависят от обновления DNS-кеша. Правило старого перенаправления в GoDaddy отдельно не удалялось.

## Проверка после активации

Добавлен безопасный ручной сценарий:

```sh
WINDX_LIVE_ROUTING_CHECK=1 node --import tsx tests/apex-routing-live.mts
```

Проверяет HTTPS-страницы, сохранение пути и параметров, HEAD и POST с синтетическим телом, отправку настоящей формы входа с заведомо неверными вымышленными данными, отсутствие перенаправления клиентского поддомена в кабинет. Не создаёт аккаунты, не отправляет письма, не использует пароль владельца и не меняет сайты. Без переменной окружения завершается со статусом SKIP до сетевых запросов.

Живой сценарий **прошёл полностью** через публичное разрешение apex: 8 GET-маршрутов → 308 → www 200, HEAD и POST → 308, настоящая форма корректно обработала неверные синтетические данные, клиентский поддомен остался отдельным и ответил 200. HTTPS проверялся штатно. Проверка не доказывает вход с правильным паролем владельца.

Сохранение существующей авторизованной сессии в Chrome через адрес без www подтверждено. Изменение пароля или выход владельца не потребовались. Снимок: `data/verification/journey-audit-2026-11-02/apex-account-live.png`.

Доказательства и резерв находятся в `data/verification/domain-routing-2026-11-02/`: `godaddy-original.zone`, `cloudflare-prepared.zone`, `prepared-record-check.json`, `cloudflare-pending-activation.png`, `cloudflare-redirect-prepared.png`, `godaddy-nameservers-saved.png`, `cloudflare-active.png`. Они не включаются в git.

## Официальные источники

- [Railway: корневые домены и ограничения GoDaddy](https://docs.railway.com/networking/domains/working-with-domains).
- [GoDaddy: параметры перенаправления](https://www.godaddy.com/en-ca/help/forward-my-godaddy-domain-12123?v=1).
- [Cloudflare: параметры Single Redirects, 308 и сохранение query string](https://developers.cloudflare.com/rules/url-forwarding/single-redirects/settings/).
- [Cloudflare: DNS-запись для redirect-only адреса](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).
- [Cloudflare: активация Universal SSL](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/enable-universal-ssl/).
