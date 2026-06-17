import {
  PLANET_ACCELERATION_BASE_MP,
  PLANET_ACCELERATION_MULTIPLIER_MAX,
  PLANET_GOLDEN_MID,
  PLANET_STAGE_DURATIONS_SEC,
} from "../balance/planetTuning";
import type { Planet, PlanetStage } from "./types";

function stageDurationSec(stage: PlanetStage): number {
  return PLANET_STAGE_DURATIONS_SEC[stage - 1] ?? PLANET_STAGE_DURATIONS_SEC[3];
}

/** Названия и суть геологических стадий планеты (для наглядности развития). */
export const PLANET_STAGE_INFO: { name: string; desc: string }[] = [
  {
    name: "Протопланета",
    desc: "Аккреция вещества, раскалённая кора, активный вулканизм.",
  },
  {
    name: "Молодая планета",
    desc: "Кора остывает, формируются первичная атмосфера и океаны.",
  },
  {
    name: "Зрелая планета",
    desc: "Стабильный климат — при подходящих условиях возможна жизнь.",
  },
  {
    name: "Древний мир",
    desc: "Геология затихает, недра остывают, ресурсы на исходе.",
  },
];

export function planetStageInfo(stage: PlanetStage): {
  name: string;
  desc: string;
} {
  return PLANET_STAGE_INFO[stage - 1] ?? PLANET_STAGE_INFO[3];
}

export function deviationFromGoldenMid(planet: Planet): number {
  const params = [
    planet.orbitalDistance,
    planet.gravityProxy,
    planet.surfaceTemperature,
    planet.atmosphere,
    planet.hydrosphere,
    planet.geologicalActivity,
  ];
  return params.reduce(
    (sum, value) => sum + Math.abs(value - PLANET_GOLDEN_MID),
    0,
  );
}

export function accelerationMultiplier(planet: Planet): number {
  const raw = 1 + deviationFromGoldenMid(planet) / 100;
  return Math.max(1, Math.min(PLANET_ACCELERATION_MULTIPLIER_MAX, raw));
}

export function accelerationCostMp(planet: Planet): number {
  const base = PLANET_ACCELERATION_BASE_MP * accelerationMultiplier(planet);
  const sizeFactor = 0.5 + planet.radiusScale * 0.72;
  return Math.ceil(base * sizeFactor);
}

export function advancePlanetStages(planet: Planet, dtSec: number): Planet {
  if (dtSec <= 0) return planet;
  let stage = planet.stage;
  let progress = planet.stageProgressSec + dtSec;

  while (true) {
    const duration = stageDurationSec(stage);
    if (progress < duration) break;
    if (stage >= 4) {
      progress = duration;
      break;
    }
    progress -= duration;
    stage = (stage + 1) as PlanetStage;
  }

  return {
    ...planet,
    stage,
    stageProgressSec: progress,
  };
}

export function stageProgressRatio(planet: Planet): number {
  const duration = stageDurationSec(planet.stage);
  if (duration <= 0) return 1;
  return Math.max(0, Math.min(1, planet.stageProgressSec / duration));
}
