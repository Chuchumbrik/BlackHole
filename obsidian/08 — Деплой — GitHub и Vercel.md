# Деплой: GitHub и Vercel

Связано: [[00 — Главная (MOC)]], [[06 — Технические требования]]

## GitHub

- URL репозитория: [https://github.com/Chuchumbrik/BlackHole.git](https://github.com/Chuchumbrik/BlackHole.git)

### Рекомендуемый порядок

1. Инициализировать приложение в корне монорепо или в подпапке `apps/web` — зафиксировать в [[09 — Вопросы и решения (журнал)|журнале]].
2. Первый коммит: статический/SPA каркас + Obsidian-документация при желании (или исключить vault из релизного билда через `.vercelignore`).
3. Подключить remote `origin`, запушить в `main`.

## Vercel

1. Импорт проекта из GitHub в [Vercel](https://vercel.com).
2. Для **Vite**: команда сборки `npm run build`, каталог вывода `dist` (см. `vercel.json` в корне).
3. Для SPA включены **rewrites** на `index.html` в `vercel.json`.

### Исключения из деплоя

В корне репозитория есть **`.vercelignore`**: каталог `obsidian/` не попадает в артефакт деплоя на Vercel.

Альтернатива по желанию команды: документация в отдельной ветке без изменения `.vercelignore`.

## Переменные окружения

Для MVP без бэкенда — минимум. Если позже Firebase — добавить секреты в Vercel Project Settings.
