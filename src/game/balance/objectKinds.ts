/**
 * Типы объектов и диапазоны MP.
 * Источник: obsidian/07 — таблица весов и MP.
 */

/** Тип 4 — космический корабль (отдельная механика тяги и побега). */
export type ObjectKind = 0 | 1 | 2 | 3 | 4;

/** MP по типу: равномерное целое в интервале [min, max]. */
export const MP_RANGE: Record<
  ObjectKind,
  readonly [min: number, max: number]
> = {
  0: [1, 3],
  1: [10, 15],
  2: [20, 35],
  3: [50, 80],
  4: [40, 70],
};
