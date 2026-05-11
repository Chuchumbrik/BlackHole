/**
 * Экономика и эффекты четырёх веток улучшений дыры.
 * Источник: obsidian/07 — «Улучшения чёрной дыры»; формула цены — как в 02.
 */

export const UPGRADE_FIRST_LEVEL_COST_MP = 10;
export const UPGRADE_COST_MULTIPLIER_PER_LEVEL = 1.45;

/**
 * Мультипликатор за один уровень ветки (мультипликативно по уровням).
 * Соответствует +12 %, +18 %, +8 %, +7 % / +4 % в ТЗ.
 */
export const UPGRADE_PER_LEVEL_FACTOR = {
  horizon: 1.12,
  gravityRadius: 1.18,
  diskGlobalMp: 1.08,
  efficiencyGlobalMp: 1.07,
  efficiencyPull: 1.04,
} as const;

/** Тяга корабля: мягкая связь с ветками диск и эффективность (см. 07, shipThrust). */
export const SHIP_THRUST_DISK_FACTOR_PER_LEVEL = 1.022;
export const SHIP_THRUST_EFFICIENCY_FACTOR_PER_LEVEL = 1.032;
