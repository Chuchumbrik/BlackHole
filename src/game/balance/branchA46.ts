/**
 * Ветка A пункты 4–6 (фаза 3): джеты, линзирование, хокинг.
 * Источник: obsidian/07 — таблица «Сингулярность».
 */

/** Длительность баффа MP после прока джетов (сек игрового времени). */
export const JET_BUFF_DURATION_SEC = 20;
/** Множитель MP поля на время баффа джетов (ТЗ ×1.8). */
export const JET_FIELD_MP_MULT = 1.8;
/** Интервал между попытками прока (сек): после него бросок RNG. */
export const JET_PROC_ATTEMPT_INTERVAL_SEC = 3;
/** Базовая вероятность прока за попытку (при уровне джетов 1). */
export const JET_BASE_PROC_CHANCE = 0.25;
/** За каждый дополнительный уровень ветки джетов. */
export const JET_PROC_CHANCE_PER_LEVEL = 0.06;
/** Импульс скорости к центру дыры (пикс/с), один раз при проке. */
export const JET_IMPULSE_SPEED = 52;

/** За уровень линзирования: множитель веса «редкого» типа (kind 3) в спавне. ТЗ +12% за уровень. */
export const LENSING_RARE_WEIGHT_MULT_PER_LEVEL = 1.12;

/** Хокинг: базовый MP/с при уровне 1 и массе 0 (далее × масса и уровни). */
export const HAWKING_BASE_MP_PER_SEC = 0.04;
/** Множитель за уровень ветки хокинга (мультипликативно). */
export const HAWKING_PER_LEVEL_FACTOR = 1.12;
/** Масштаб от log(1 + massMp) для пассивного тика. */
export const HAWKING_MASS_LOG_COEFF = 0.35;
