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

/** Секунд игрового времени на полоску «зарождение жизни» при стабильной экосистеме. */
export const PLANET_LIFE_EMERGENCE_TOTAL_SEC = 480;
