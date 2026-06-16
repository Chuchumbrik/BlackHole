# CosmoBlackHole — «Чёрная Дыра: Поглощение»

Веб idle/космический симулятор: игрок — чёрная дыра, растёт, поглощая объекты звёздной системы. Язык общения с пользователем — **русский**.

## Стек

- **Vite 6 + React 19 + TypeScript** (strict), рендер на **PixiJS v8** (canvas), состояние — **Zustand**, i18n — **react-i18next** (RU по умолчанию, EN — `src/locales/`).
- Деплой: **Vercel** (`dist`, фреймворк Vite). Репо: github.com/Chuchumbrik/BlackHole.
- Dev-сервер: `npm run dev` → http://localhost:5173 (порт по умолчанию Vite, не переопределён).

## Команды

- `npm run dev` — дев-сервер.
- `npm run build` — `tsc -b && vite build` (тип-чек обязателен, сборка падает на ошибках типов).
- `npm run lint` — ESLint.
- `npm run version:patch` — поднять patch в `package.json` без git-тега.

## Карта кода (`src/`)

- `store/useGameStore.ts` — **единый Zustand-стор**. Состояние: `massMp` (валюта), `gameTimeSec`, `upgradeLevels`, `systems`/`activeSystemId`/`activePlanetId`, `viewTier`, `simTimeScale`, `jetBuffEndsAtSimSec`. Транзиентное (не сохранять): `mpGainFloaters`.
- `components/GameCanvas.tsx` (~1300 строк) — **игровой цикл здесь**: `requestAnimationFrame` → `advanceGameTime(simDt)` + `stepSimulation(...)`. Цикл живёт в canvas-компоненте, НЕ в сторе.
- `game/simulation.ts` — физика шага (`stepSimulation`), поглощение, столкновения.
- `game/balance/*` — **source of truth по балансу** (экономика апгрейдов, физика, спавн, разблокировки, тюнинг планет). Числа баланса менять ТОЛЬКО здесь, не разбрасывать по компонентам.
- `game/upgrades.ts` — 7 веток ветки A: `size, gravity, disk, efficiency, jets, lensing, hawking`. Ветка B (окружение, апгрейды 7–11) ещё НЕ реализована.
- `game/world/*` — генерация мира, планеты (стадии/жизнь/SOI/палитра/ховер-тексты), `planetProgress.ts`, `planetLayout.ts`.
- `components/` — UI поверх canvas (`UpgradesPanel`, `PlanetPanel`, контролы времени/масштаба, `MpGainFloaters`).

## Важные архитектурные факты

- **Генерация мира НЕ сидирована**: `generateStarSystems()` использует `Math.random()`, ID — через `Date.now()`. Следствие: сейв обязан хранить **весь массив `systems`** целиком (нельзя восстановить из seed). Если позже понадобится воспроизводимость (лидерборд по seed) — нужен явный сидируемый RNG, сейчас его нет.
- **Сохранения НЕТ** (ни localStorage, ни облака). Idle-игра без персистентности — блокер №1 играбельности.
- Вкладки `prestige` и `stats` — пока пустые заглушки (TabId есть, логики нет).

## Ритуал перед КАЖДЫМ коммитом

1. Поднять patch: `npm run version:patch`.
2. Описать изменение в `CHANGELOG.md` (кратко, сверху).
3. При необходимости обновить абзац «Текущая версия» в `README.md` и заметки в `obsidian/`.
4. Версии до MVP: формат `0.ФАЗА.патч`; релиз MVP = `1.0.0`. Правила — `obsidian/10`, фазы — `obsidian/11`.

## Документация по геймдизайну

`obsidian/` (RU). Канон: `01` (цели MVP), `02` (core loop), `07` (баланс/формулы), `11` (дорожная карта по фазам), `13` (баланс/темп). Полная копия — в `/root/Projects/brain/projects/cosmo-blackhole/`. Каталог `obsidian/` исключён из деплоя (`.vercelignore`).

## Правила работы

- Это **веб-проект**, НЕ мод Minecraft/Forge — не тащить `DeferredRegister`, события Forge, Mixin и т.п. (см. `.cursor/rules/`).
- Окончания строк — **LF** (`.gitattributes`: `* text=auto eol=lf`). Не коммитить CRLF.
- Баланс idle-игры проверяется не чтением, а запуском: dev-сервер + браузер (puppeteer) → клик апгрейдов, консоль, скриншот.

## Текущая цель (решение пользователя, 2026-06-16)

MVP-приоритет — **играбельность вперёд формальных скоупов**: (1) локальный сейв + оффлайн-начисление (75%, кап 12 ч), (2) калибровка баланса, (3) базовый prestige. Решение про закрытую бету/релиз 1.0 — позже.
