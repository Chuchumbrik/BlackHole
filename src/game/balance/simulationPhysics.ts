/**
 * Физика шага симуляции (пиксели, игровые секунды).
 * Числа — ручки «ощущения» поля; главный глобальный тюнинг дохода — economyTuning.
 */

export const OUTSIDE_GRAVITY_RATIO = 0.52;
/** Радиус зоны притяжения не меньше горизонта × этот коэффициент (геометрия поля). */
export const GRAVITY_RADIUS_MIN_OVER_HORIZON = 1.08;
/** Плавный спад силы поля дыры: начало/конец полосы в долях `gravityRadius`. */
export const GRAVITY_FIELD_BLEND_IN_FRAC = 0.9;
export const GRAVITY_FIELD_BLEND_OUT_FRAC = 1.22;
/** 1 — без искусственного трения объектов; иначе < 1 затухает скорость каждый шаг. */
export const VELOCITY_DAMPING = 1;
/** Подогнано после перехода на a ∝ GM/r² (без массы тела в ускорении): ≈ старый G × типичная масса объекта. */
export const GRAVITY_CONST = 0.082;
export const GRAVITY_SOFTENING = 280;

/** Базовое ускорение к центру до множителя «Эффективность». */
export const BASE_GRAVITY_ACCEL = 2200;
export const BASE_BH_MASS = 180000;
export const BASE_STAR_MASS = 90000;

/** Базовая тяга корабля наружу (пикс/с²); дальше × качества и апгрейды. */
export const SHIP_THRUST_BASE = 980;
