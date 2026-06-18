/**
 * Energy — «Гравитационный импульс»: активный ресурс поверх пассивного дохода.
 * Тап по пустому космосу тратит Energy и пускает ВОЛНУ ПРИТЯЖЕНИЯ — все тела поля
 * получают импульс к дыре (ускоряет поглощение). Восстанавливается со временем.
 * Лимит тапов/мин — жёсткий потолок против закликивания (Energy-кост — мягкий).
 *
 * Числа предварительные, под калибровку плейтестом (см. obsidian/16 §3, §14.4).
 */

/** Максимальный (и стартовый) запас Energy. */
export const ENERGY_MAX = 100;
/** Восстановление Energy в секунду реального времени (полный запас ≈ за 40 с). */
export const ENERGY_REGEN_PER_SEC = 2.5;
/** Стоимость одного тап-импульса. */
export const ENERGY_TAP_COST = 25;
/** Жёсткий потолок тапов за скользящую минуту. */
export const MAX_TAPS_PER_MIN = 30;
/** Скорость импульса, придаваемого телам волной (к дыре). */
export const WAVE_PULL_SPEED = 90;

/** Эффективный максимум импульса с учётом апгрейда «Импульсный накопитель». */
export function effectiveEnergyMax(energyMul: number): number {
  return ENERGY_MAX * Math.max(1, energyMul);
}
/** Эффективное восстановление импульса/с с учётом того же апгрейда. */
export function effectiveEnergyRegen(energyMul: number): number {
  return ENERGY_REGEN_PER_SEC * Math.max(1, energyMul);
}

/**
 * Сверхновая (узел №11 ветки B) — активируемая способность: всплеск спавна +
 * временный ×3 MP. Дорогая по Energy, с длинной перезарядкой. Открывается после
 * первого сжатия (как в каноне). «Мини-дыра» из ТЗ — упрощена до всплеска+баффа
 * (отдельный гравитационный источник — отдельная итерация).
 */
export const SUPERNOVA_ENERGY_COST = 80;
export const SUPERNOVA_COOLDOWN_SEC = 120; // реального времени
export const SUPERNOVA_BURST = 40; // тел во всплеске
export const SUPERNOVA_MP_MULT = 3; // временный множитель MP
export const SUPERNOVA_BUFF_SEC = 30; // длительность баффа (игрового времени)
export const SUPERNOVA_UNLOCK_PRESTIGE = 1; // открыта после N сжатий
