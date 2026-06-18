// Калибровка v0.5.75 (анализ doc 17, рек. №3): ранние стадии чуть быстрее
// (8/15/25/40 → 6/12/20/34), чтобы жизнь была достижима в обозримом ране —
// вместе с перком «Космическая память» (фора по стадиям).
export const PLANET_STAGE_DURATIONS_MIN = [6, 12, 20, 34] as const;

export const PLANET_STAGE_DURATIONS_SEC = PLANET_STAGE_DURATIONS_MIN.map(
  (minutes) => minutes * 60,
) as readonly number[];

export const PLANET_ACCELERATION_SECONDS = 60;
export const PLANET_ACCELERATION_BASE_MP = 100;

export const PLANET_GOLDEN_MID = 50;
export const PLANET_ACCELERATION_MULTIPLIER_MAX = 3;

export const PLANET_SYSTEM_COUNT_MIN = 1;
export const PLANET_SYSTEM_COUNT_MAX = 2;
/** Обычные системы: число планет. */
export const PLANETS_PER_SYSTEM_MIN = 1;
export const PLANETS_PER_SYSTEM_MAX = 7;

/** Первая «домашняя» система — больше тел. */
export const PLANETS_FIRST_SYSTEM_MIN = 4;
export const PLANETS_FIRST_SYSTEM_MAX = 10;

/** Коридор параметров планеты до зарождения жизни. */
export const PLANET_ECOSYSTEM_LOW = 38;
export const PLANET_ECOSYSTEM_HIGH = 62;

/**
 * Жизнь может зарождаться только на ЗРЕЛОЙ планете (стадия ≥ 3). Так геологические
 * стадии становятся осмысленным гейтом: сперва планета должна дозреть, и лишь потом
 * — при стабильной экосистеме — копится зарождение жизни.
 */
export const PLANET_LIFE_MIN_STAGE = 3;

/** Секунд игрового времени на полоску «зарождение жизни» при стабильной экосистеме. */
export const PLANET_LIFE_EMERGENCE_TOTAL_SEC = 480;

/** Цивилизация: секунд игрового времени на один тир (после рождения жизни), потолок тира. */
export const PLANET_CIV_STAGE_SEC = 150;
export const PLANET_CIV_MAX_LEVEL = 4;
/** Базовый интервал запуска кораблей-«дани» при тире 1 (делится на тир — чаще на высоких). */
export const PLANET_TRIBUTE_INTERVAL_SEC = 7;

/** Терраформинг: на сколько единиц двигать каждый параметр к золотой середине за клик; цена MP. */
export const PLANET_TERRAFORM_STEP = 6;
export const PLANET_TERRAFORM_COST_MP = 120;
/** Щит планеты: длительность (игр.сек) и цена MP. */
export const PLANET_SHIELD_DURATION_SEC = 120;
export const PLANET_SHIELD_COST_MP = 200;

/**
 * Предел Роша (приливный разрыв). Когда орбита планеты деградирует настолько, что
 * планета подходит к дыре ближе `horizonRadius × ROCHE_TEAR_FACTOR` (но ещё НЕ дошла
 * до горизонта), приливные силы разрывают её в КОЛЬЦО ОБЛОМКОВ, которое затем
 * аккрецирует (растянутый, но крупный приток MP). Множитель > 1, чтобы порог был
 * заметно дальше горизонта — планета рвётся до поглощения целиком.
 */
// Фидбек: планеты рвутся реже — порог Роша ближе к горизонту (2.6 → 1.7).
export const ROCHE_TEAR_FACTOR = 1.7;
/** Суммарный MP кольца обломков относительно поглощения планеты целиком (награда за риск). */
export const ROCHE_REWARD_MUL = 1.3;
/** Число осколков в кольце разрыва (часть может ускользнуть из системы — риск). */
export const ROCHE_RING_SHARDS = 26;

/**
 * Климат планеты (динамика): температура и орбитальный параметр следуют за
 * физическим положением тела относительно звезды. Звезда «вырабатывает тепло» —
 * ближе к ней горячее, дальше холоднее; масса/класс звезды задают светимость.
 */

/** Относительная светимость по классу звезды (0..1), с мягкой добавкой от набранной массы. */
const STAR_CLASS_LUMINOSITY: Record<string, number> = {
  O: 1.0,
  B: 0.95,
  A: 0.85,
  F: 0.72,
  G: 0.6,
  K: 0.45,
  M: 0.32,
};
export function starLuminosity01(starClass: string, starMassMp = 0): number {
  const base = STAR_CLASS_LUMINOSITY[starClass] ?? 0.6;
  const massBoost = 1 + 0.3 * Math.log1p(Math.max(0, starMassMp) / 6000);
  return Math.min(1.25, base * massBoost);
}

/**
 * Целевая температура планеты (0..100) по орбитальной близости и светимости.
 * orbital01: 0 — у самой звезды (горячо), 100 — на краю системы (холодно).
 * Калибровка: средняя орбита у G-звезды ≈ «золотая середина» (~50).
 */
export function targetTemperature01(orbital01: number, lum01: number): number {
  const closeness = Math.max(0, Math.min(1, 1 - orbital01 / 100));
  return Math.max(0, Math.min(100, 100 * lum01 * (0.35 + 0.85 * closeness)));
}

/** Доля сглаживания климата за один тик синхронизации (вызывается ~раз/сек). */
export const PLANET_CLIMATE_EASE = 0.18;

/**
 * Орбитальная оборона: развитые цивилизации сбивают приближающиеся к планете
 * тела (астероиды/кометы/мусор), но НЕ свои корабли-дань. Защищает планету от
 * ударов (откатов развития) — петля «выжила → больше дани».
 */
export const PLANET_GUNS_MIN_CIV = 2;
export const PLANET_GUNS_INTERVAL_SEC = 1.6;
/** Радиус обороны = доля min(ширина,высота) поля × (1 + доп. за тир цивилизации). */
export const PLANET_GUNS_RADIUS_FRAC = 0.05;
export const PLANET_GUNS_RANGE_PER_CIV = 0.3;
