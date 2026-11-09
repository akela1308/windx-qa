# Замеры эксперимента 1 (генерируется скриптом, не править руками)

## Подход A

| Сравнение | Расстояние по порядку блоков | Расстояние по набору приёмов | Тот же набор шрифтов | Почти тот же фон |
|---|---|---|---|---|
| Разные бизнесы (среднее по парам) | 0.56 | 0.48 | | |
| bike: gen1 и gen2 | 0.50 | 0.38 | да | да |
| law: gen1 и gen2 | 0.50 | 0.40 | да | да |
| yoga: gen1 и gen2 | 0.55 | 0.33 | нет | да |

0 значит одинаковый скелет страницы, 1 значит ничего общего.

| Бизнес | Шаг | Скелет страницы (сверху вниз) | Сетки карточек | Ошибки | Попыток |
|---|---|---|---|---|---|
| bike | gen1 | strip-two-col → photo-split → list → two-col → photo-full → list → two-col → type | нет | нет | 1 |
| bike | gen2 | strip-two-col → type → grid-4 → list → list → gallery → photo-split → list → two-col → type | нет | нет | 1 |
| bike | edit1 | strip-two-col → prose → list → two-col → photo-full → list → two-col → type | нет | нет | 1 |
| bike | edit2 | strip-two-col → prose → photo-split → two-col → photo-full → list → two-col → type | нет | нет | 1 |
| bike | edit3 | strip-two-col → prose → photo-split → prose → two-col → photo-full → list → two-col → type | нет | нет | 1 |
| law | gen1 | prose → prose → list → list → prose → list → list → two-col → prose | нет | нет | 1 |
| law | gen2 | strip-two-col → photo-split → list → list → list → two-col → two-col → list → two-col → prose | нет | нет | 1 |
| law | edit1 | prose → prose → list → list → prose → list → list → two-col → prose | нет | нет | 1 |
| law | edit2 | prose → prose → list → list → prose → list → list → two-col → prose | нет | нет | 1 |
| law | edit3 | prose → prose → prose → list → list → prose → list → list → two-col → prose | нет | нет | 1 |
| yoga | gen1 | prose → photo-split → two-col → list → photo-full → prose → list → two-col → prose | нет | нет | 1 |
| yoga | gen2 | prose → photo-split → prose → list → two-col → gallery → list → two-col → list → two-col → two-col | нет | нет | 1 |
| yoga | edit1 | prose → prose → two-col → list → photo-full → prose → list → two-col → prose | нет | нет | 1 |
| yoga | edit2 | prose → prose → two-col → list → photo-full → prose → list → two-col → prose | нет | нет | 1 |
| yoga | edit3 | prose → prose → two-col → prose → list → photo-full → prose → list → two-col → prose | нет | нет | 1 |

| Бизнес | gen1→edit1 | edit1→edit2 | edit2→edit3 |
|---|---|---|---|
| bike | 0.13 | 0.13 | 0.11 |
| law | 0.00 | 0.00 | 0.10 |
| yoga | 0.11 | 0.00 | 0.10 |

| Деньги и токены (оценка) | Значение |
|---|---|
| Системный промпт, токенов | 12572 |
| Генерация: вход / выход, токенов в среднем | 12711 / 2490 |
| Одна генерация, без кэша / с кэшем промпта | $0.075 / $0.042 |
| Цикл из трёх правок, без кэша / с кэшем | $0.246 / $0.144 |

С первой попытки прошли проверку: 15 из 15. Ошибки, которые видны только в браузере (проверка при генерации их не ловит): 0.

## Подход B

| Сравнение | Расстояние по порядку блоков | Расстояние по набору приёмов | Тот же набор шрифтов | Почти тот же фон |
|---|---|---|---|---|
| Разные бизнесы (среднее по парам) | 0.45 | 0.35 | | |
| bike: gen1 и gen2 | 0.33 | 0.25 | нет | да |
| law: gen1 и gen2 | 0.25 | 0.00 | нет | да |
| yoga: gen1 и gen2 | 0.63 | 0.71 | да | нет |

0 значит одинаковый скелет страницы, 1 значит ничего общего.

| Бизнес | Шаг | Скелет страницы (сверху вниз) | Сетки карточек | Ошибки | Попыток |
|---|---|---|---|---|---|
| bike | gen1 | strip-prose → photo-split → list → photo-split → photo-split → strip-prose | нет | нет | 1 |
| bike | gen2 | strip-prose → photo-split → list → photo-split → photo-split → photo-split → prose → photo-split → strip-prose | нет | На телефоне страница шире экрана: 459px | 1 |
| bike | edit1 | strip-prose → photo-split → list → photo-split → photo-split → strip-prose | нет | нет | 1 |
| bike | edit2 | strip-prose → photo-split → list → photo-split → photo-split → strip-prose | нет | нет | 1 |
| bike | edit3 | strip-prose → photo-split → prose → list → photo-split → photo-split → strip-prose | нет | нет | 1 |
| law | gen1 | strip-prose → photo-split → list → two-col → list → photo-split → two-col → prose | нет | нет | 1 |
| law | gen2 | strip-prose → photo-split → list → list → photo-split → photo-split → two-col → prose | нет | нет | 1 |
| law | edit1 | strip-prose → list → list → two-col → list → photo-split → two-col → prose | нет | нет | 1 |
| law | edit2 | strip-prose → list → list → two-col → list → photo-split → two-col → prose | нет | нет | 1 |
| law | edit3 | strip-prose → list → list → two-col → list → photo-split → two-col → prose | нет | нет | 1 |
| yoga | gen1 | strip-prose → photo-split → list → photo-split → list → two-col | нет | нет | 1 |
| yoga | gen2 | strip-prose → photo-split → photo-split → grid-3 → grid-4 → photo-split → photo-split → prose | нет | нет | 1 |
| yoga | edit1 | strip-prose → type → list → photo-split → list → two-col | нет | нет | 1 |
| yoga | edit2 | strip-prose → type → grid-4 → photo-split → list → two-col | нет | нет | 1 |
| yoga | edit3 | strip-prose → type → grid-4 → photo-split → list → two-col | нет | нет | 1 |

| Бизнес | gen1→edit1 | edit1→edit2 | edit2→edit3 |
|---|---|---|---|
| bike | 0.00 | 0.00 | 0.14 |
| law | 0.13 | 0.00 | 0.00 |
| yoga | 0.17 | 0.17 | 0.00 |

| Деньги и токены (оценка) | Значение |
|---|---|
| Системный промпт, токенов | 1222 |
| Генерация: вход / выход, токенов в среднем | 1361 / 3792 |
| Одна генерация, без кэша / с кэшем промпта | $0.061 / $0.058 |
| Цикл из трёх правок, без кэша / с кэшем | $0.196 / $0.187 |

С первой попытки прошли проверку: 15 из 15. Ошибки, которые видны только в браузере (проверка при генерации их не ловит): 1.

