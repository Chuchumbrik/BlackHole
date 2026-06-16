/**
 * Экономика и эффекты четырёх веток улучшений дыры.
 * Источник: obsidian/07 — «Улучшения чёрной дыры»; формула цены — как в 02.
 */

export const UPGRADE_FIRST_LEVEL_COST_MP = 8;
export const UPGRADE_COST_MULTIPLIER_PER_LEVEL = 1.53;

/**
 * Мультипликатор за один уровень ветки (мультипликативно по уровням).
 * Сужено относительно ТЗ (+12 % / +18 % …): более жёсткий темп прокачки.
 */
export const UPGRADE_PER_LEVEL_FACTOR = {
  horizon: 1.075,
  gravityRadius: 1.11,
  diskGlobalMp: 1.045,
  efficiencyGlobalMp: 1.035,
  efficiencyPull: 1.022,
} as const;

/** Тяга корабля: мягкая связь с ветками диск и эффективность (см. 07, shipThrust). */
export const SHIP_THRUST_DISK_FACTOR_PER_LEVEL = 1.015;
export const SHIP_THRUST_EFFICIENCY_FACTOR_PER_LEVEL = 1.024;
