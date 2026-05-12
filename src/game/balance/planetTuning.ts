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
export const PLANETS_PER_SYSTEM_MIN = 1;
export const PLANETS_PER_SYSTEM_MAX = 1;
