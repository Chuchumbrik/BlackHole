import {
  PLANET_ECOSYSTEM_HIGH,
  PLANET_ECOSYSTEM_LOW,
  PLANET_LIFE_EMERGENCE_TOTAL_SEC,
  PLANET_LIFE_MIN_STAGE,
  PLANET_CIV_STAGE_SEC,
  PLANET_CIV_MAX_LEVEL,
} from "../balance/planetTuning";
import type { Planet } from "./types";

const PARAM_KEYS = [
  "orbitalDistance",
  "gravityProxy",
  "surfaceTemperature",
  "atmosphere",
  "hydrosphere",
  "geologicalActivity",
] as const;

export type PlanetParamKey = (typeof PARAM_KEYS)[number];

export function planetParam(planet: Planet, key: PlanetParamKey): number {
  return planet[key];
}

/** Все шесть показателей в коридоре — экосистема стабильна. */
export function ecosystemStable(planet: Planet): boolean {
  for (const key of PARAM_KEYS) {
    const v = planet[key];
    if (v < PLANET_ECOSYSTEM_LOW || v > PLANET_ECOSYSTEM_HIGH) return false;
  }
  return true;
}

/** Планета достаточно зрелая для жизни (геологическая стадия ≥ порога). */
export function planetMatureForLife(planet: Planet): boolean {
  return planet.stage >= PLANET_LIFE_MIN_STAGE;
}

/** Можно копить зарождение жизни: экосистема стабильна И планета зрелая. */
export function canHostLife(planet: Planet): boolean {
  return ecosystemStable(planet) && planetMatureForLife(planet);
}

/** Список параметров, которые нужно подтянуть к коридору [low, high]. */
export function ecosystemDeficits(planet: Planet): PlanetParamKey[] {
  const out: PlanetParamKey[] = [];
  for (const key of PARAM_KEYS) {
    const v = planet[key];
    if (v < PLANET_ECOSYSTEM_LOW) out.push(key);
    else if (v > PLANET_ECOSYSTEM_HIGH) out.push(key);
  }
  return out;
}

export function lifeEmergenceRatio(planet: Planet): number {
  if (planet.lifeBorn) return 1;
  if (!canHostLife(planet)) return 0;
  return Math.max(
    0,
    Math.min(1, planet.lifeEmergenceSec / PLANET_LIFE_EMERGENCE_TOTAL_SEC),
  );
}

/** Базовые MP за поглощение планеты горизонтом (до множителей дыры и `mpYieldMult`). */
export function planetSwallowMpBase(planet: Planet): number {
  const sum =
    planet.orbitalDistance +
    planet.gravityProxy +
    planet.surfaceTemperature +
    planet.atmosphere +
    planet.hydrosphere +
    planet.geologicalActivity;
  const stageBonus = planet.stage * 35;
  const lifeBonus = planet.lifeBorn ? 220 : 0;
  const sizeBoost = Math.pow(Math.max(0.35, planet.radiusScale), 0.75);
  return Math.round(
    (120 + sum * 0.45 + stageBonus + lifeBonus) * planet.mpYieldMult * sizeBoost,
  );
}

/**
 * Тик экосистемы / жизни на игровом шаге (не путать с ускорением стадии MP).
 * После рождения жизни медленно снижаем `mpYieldMult` (истощение биосферы).
 */
export function tickPlanetLife(planet: Planet, dtSec: number): Planet {
  if (dtSec <= 0) return planet;
  let lifeEmergenceSec = planet.lifeEmergenceSec;
  let lifeBorn = planet.lifeBorn;
  let mpYieldMult = planet.mpYieldMult;

  if (!lifeBorn && canHostLife(planet)) {
    lifeEmergenceSec += dtSec;
    if (lifeEmergenceSec >= PLANET_LIFE_EMERGENCE_TOTAL_SEC) {
      lifeBorn = true;
      lifeEmergenceSec = PLANET_LIFE_EMERGENCE_TOTAL_SEC;
    }
  }

  let civProgressSec = planet.civProgressSec;
  let civLevel = planet.civLevel;
  if (lifeBorn) {
    mpYieldMult = Math.max(0.22, mpYieldMult - dtSec * 1.2e-5);
    // Цивилизация растёт со временем после зарождения жизни.
    civProgressSec += dtSec;
    civLevel = Math.min(
      PLANET_CIV_MAX_LEVEL,
      Math.floor(civProgressSec / PLANET_CIV_STAGE_SEC),
    );
  }

  return {
    ...planet,
    lifeEmergenceSec,
    lifeBorn,
    mpYieldMult,
    civProgressSec,
    civLevel,
  };
}
