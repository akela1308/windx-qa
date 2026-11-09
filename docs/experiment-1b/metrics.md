# Замеры эксперимента 1b (генерируется скриптом)

## Каждая страница

| Бизнес | Вариант | Направление | Фон | Шрифты | Скелет | Свой рисунок | Ошибки | Попыток |
|---|---|---|---|---|---|---|---|---|
| bike | light | swiss | #FFFFFF (L100 S0) | archivo / public-sans | strip-two-col → type → list → list → grid-4 → grid-3 → two-col → list → prose → type | нет | нет | 1 |
| bike | dark | night-shift | #0d0d0b (L5 S8) | big-shoulders / ibm-plex-sans | strip-two-col → type → grid-4 → list → photo-split → grid-4 → photo-split → photo-full → list → list → type | нет | нет | 1 |
| bike | colour | signal | #F5C400 (L48 S100) | big-shoulders / work-sans | strip-two-col → type → list → type → two-col → list → type | нет | нет | 1 |
| bike | repeat | swiss | #FFFFFF (L100 S0) | archivo / public-sans | strip-two-col → type → list → list → grid-4 → grid-3 → list → two-col → type | нет | нет | 1 |
| law | light | newsprint | #fafafa (L98 S0) | newsreader / source-serif | prose → photo-split → list → list → two-col → grid-3 → list → prose → two-col | нет | нет | 1 |
| law | dark | deep-ink | #14213a (L15 S49) | cormorant / public-sans | prose → prose → list → list → list → photo-split → list → two-col → two-col | нет | нет | 1 |
| law | colour | monotone | #98c1a4 (L68 S25) | fraunces / public-sans | prose → prose → photo-split → list → list → list → two-col → prose | нет | нет | 1 |
| law | repeat | newsprint | #fbfbfb (L98 S0) | newsreader / source-serif | prose → photo-split → list → list → two-col → grid-3 → list → prose → two-col | нет | нет | 1 |
| yoga | light | soft-clay | #EBD3C5 (L85 S49) | young-serif / karla | strip-prose → photo-split → photo-split → photo-split → prose → list → prose → list → two-col → two-col | да | нет | 1 |
| yoga | dark | deep-ink | #162a22 (L13 S31) | cormorant / karla | prose → prose → list → list → photo-split → list → list → prose → two-col | нет | нет | 1 |
| yoga | colour | poster-duo | #E8743B (L57 S79) | young-serif / karla | strip-prose → gallery → grid-4 → list → prose → prose → list → list → two-col → type | да | нет | 1 |
| yoga | repeat | soft-clay | #D6E4CB (L85 S32) | young-serif / karla | strip-prose → photo-split → photo-split → grid-4 → prose → photo-split → prose → list → two-col → two-col | да | нет | 1 |

## Разные направления у одного бизнеса

| Бизнес | Пара | Разница фона (RGB) | Те же шрифты | Расстояние по скелету |
|---|---|---|---|---|
| bike | light и dark | 420 | нет | 0.45 |
| bike | light и colour | 262 | нет | 0.40 |
| bike | dark и colour | 296 | нет | 0.55 |
| bike | light и repeat (то же направление) | 0 | да | 0.20 |
| law | light и dark | 370 | нет | 0.44 |
| law | light и colour | 142 | нет | 0.56 |
| law | dark и colour | 233 | нет | 0.33 |
| law | light и repeat (то же направление) | 2 | да | 0.00 |
| yoga | light и dark | 317 | нет | 0.70 |
| yoga | light и colour | 168 | да | 0.60 |
| yoga | dark и colour | 224 | нет | 0.70 |
| yoga | light и repeat (то же направление) | 28 | да | 0.20 |

## Одно направление (deep-ink) у разных бизнесов

Юристы: #14213a, cormorant / public-sans. Йога: #162a22, cormorant / karla. Разница фона 26, скелет 0.33.

С первой попытки прошли проверку: 12 из 12. Ошибки после всех попыток: 0.

Для сравнения, эксперимент 1: у двух генераций одного бизнеса разница фона была от 2 до 23, шрифты совпали в 4 из 6 пар.

