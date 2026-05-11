/** Источник чисел — obsidian/07 и ТЗ; фаза 1 использует базовые константы без апгрейдов. */

export const BASE_SPAWN_PER_SECOND = 8;

/** Веса типов в процентах (сумма 100). */
export const SPAWN_WEIGHTS = [55, 25, 15, 5] as const;

export type ObjectKind = 0 | 1 | 2 | 3;

/** Диапазоны MP по типу (включительно, равномерное целое). */
export const MP_RANGE: Record<
  ObjectKind,
  readonly [min: number, max: number]
> = {
  0: [1, 3],
  1: [10, 15],
  2: [20, 35],
  3: [50, 80],
};

export const MAX_OBJECTS_ON_FIELD = 300;
