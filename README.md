# Чёрная Дыра: Поглощение

Веб-клиент: **Vite + React + TypeScript**, рендер **PixiJS v8**, состояние **Zustand**, тексты **react-i18next** (RU по умолчанию).

## Локально

```bash
npm install
npm run dev
```

Сборка:

```bash
npm run build
npm run preview
```

## Vercel

1. Импорт репозитория [github.com/Chuchumbrik/BlackHole](https://github.com/Chuchumbrik/BlackHole).
2. Framework Preset: **Vite** (или оставить автоопределение).
3. Команда сборки: `npm run build`, каталог вывода: `dist`.
4. Корень проекта — репозиторий; папка `obsidian/` не попадает в деплой (см. `.vercelignore`).

После деплоя проверьте главную страницу: должен открываться canvas с заглушкой сцены и React-панель поверх.

## Документация по геймдизайну

Заметки для разработки лежат в каталоге `obsidian/` (хранилище Obsidian, в прод не включается).
