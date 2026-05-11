/**
 * Спавн объектов поля.
 * Источник: obsidian/07 — Баланс и формулы (v1), §«Спавн» и веса типов.
 */

export const BASE_SPAWN_PER_SECOND = 8;

/** Веса типов обломков в процентах (сумма 100). */
export const SPAWN_WEIGHTS = [55, 25, 15, 5] as const;

/** Доля попыток спавна, заменяемых на корабль (тип 4), после разблокировки. */
export const SHIP_SPAWN_FRACTION = 0.07;

export const MAX_OBJECTS_ON_FIELD = 300;
