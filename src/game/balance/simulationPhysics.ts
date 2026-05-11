/**
 * Физика шага симуляции (пиксели, игровые секунды).
 * Числа — ручки «ощущения» поля; главный глобальный тюнинг дохода — economyTuning.
 */

export const OUTSIDE_GRAVITY_RATIO = 0.52;
/** Ближе к 1 — меньше «воздушного трения» (слой B idle). */
export const VELOCITY_DAMPING = 0.99935;
export const GRAVITY_CONST = 0.064;
export const GRAVITY_SOFTENING = 280;

/** Базовое ускорение к центру до множителя «Эффективность». */
export const BASE_GRAVITY_ACCEL = 2200;
export const BASE_BH_MASS = 180000;
export const BASE_STAR_MASS = 90000;

/** Базовая тяга корабля наружу (пикс/с²); дальше × качества и апгрейды. */
export const SHIP_THRUST_BASE = 980;

/**
 * База MP за побег корабля из зоны: награда ≈ это × качество пилота × множители дохода.
 * Источник: obsidian/07 (корабль).
 */
export const ESCAPE_MP_BASE = 22;
