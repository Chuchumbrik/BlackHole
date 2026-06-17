export const PLANET_STAGE_DURATIONS_MIN = [8, 15, 25, 40] as const;

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
export const ROCHE_TEAR_FACTOR = 2.6;
/** Суммарный MP кольца обломков относительно поглощения планеты целиком (награда за риск). */
export const ROCHE_REWARD_MUL = 1.3;
/** Число осколков в кольце разрыва (часть может ускользнуть из системы — риск). */
export const ROCHE_RING_SHARDS = 26;
