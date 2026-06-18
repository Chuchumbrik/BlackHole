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
// Фидбек: звезда крепче держит планеты на орбите (90k → 200k).
export const BASE_STAR_MASS = 200000;

/** Базовая тяга корабля наружу (пикс/с²); дальше × качества и апгрейды. */
export const SHIP_THRUST_BASE = 980;

/**
 * Рост звезды от поглощённой массы тел. `STAR_ABSORB_FRACTION` — какая доля массы
 * упавшего в звезду тела идёт в её копилку. Влияние на гравитацию — мягкое (лог),
 * чтобы орбиты не разносило; на видимый размер — заметнее (но с потолком).
 */
export const STAR_ABSORB_FRACTION = 1;
export const STAR_MASS_SCALE = 4000;
/** Множитель гравитации звезды от накопленной массы (лог, мягкий). */
export function starGravityMul(absorbedMass: number): number {
  return 1 + 0.12 * Math.log1p(Math.max(0, absorbedMass) / STAR_MASS_SCALE);
}
/** Множитель видимого радиуса звезды от накопленной массы (заметнее, с потолком). */
export function starDisplayMul(absorbedMass: number): number {
  return Math.min(1.8, 1 + 0.22 * Math.log1p(Math.max(0, absorbedMass) / STAR_MASS_SCALE));
}

/**
 * Награда за поглощение звезды дырой — крупный единоразовый куш (звезда ≫ планет
 * ≫ астероидов). Растёт с массой, которую звезда успела набрать.
 */
export const STAR_SWALLOW_BASE_MP = 1_000_000;
export function starSwallowReward(absorbedMass: number): number {
  return Math.floor(
    STAR_SWALLOW_BASE_MP * (1 + Math.max(0, absorbedMass) / STAR_MASS_SCALE),
  );
}
