import {
  PLANET_SYSTEM_COUNT_MAX,
  PLANET_SYSTEM_COUNT_MIN,
  PLANETS_PER_SYSTEM_MAX,
  PLANETS_PER_SYSTEM_MIN,
} from "../balance/planetTuning";
import type { Planet, StarSystem } from "./types";

const STAR_CLASSES = ["G", "K", "F", "M"] as const;
const SYSTEM_NAMES = ["Aster", "Helios", "Nyx", "Tau", "Eos", "Orion"] as const;
const PLANET_NAMES = ["Prime", "Aqua", "Inferna", "Zephyr", "Silica"] as const;

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function id(prefix: string, i: number): string {
  return `${prefix}-${Date.now()}-${i}-${Math.floor(Math.random() * 1e6)}`;
}

function genPlanet(systemIdx: number, planetIdx: number): Planet {
  return {
    id: id("planet", systemIdx * 10 + planetIdx),
    name: `${PLANET_NAMES[(systemIdx + planetIdx) % PLANET_NAMES.length]}-${planetIdx + 1}`,
    orbitalDistance: Math.round(randomRange(12, 92)),
    gravityProxy: Math.round(randomRange(10, 95)),
    surfaceTemperature: Math.round(randomRange(5, 98)),
    atmosphere: Math.round(randomRange(8, 96)),
    hydrosphere: Math.round(randomRange(0, 100)),
    geologicalActivity: Math.round(randomRange(2, 100)),
    orbitPhaseRad: randomRange(0, Math.PI * 2),
    orbitSpeed: randomRange(0.016, 0.06),
    stage: 1,
    stageProgressSec: 0,
  };
}

export function generateStarSystems(): StarSystem[] {
  const systemsCount = randomInt(PLANET_SYSTEM_COUNT_MIN, PLANET_SYSTEM_COUNT_MAX);
  return Array.from({ length: systemsCount }, (_, systemIdx) => {
    const planetsCount = randomInt(PLANETS_PER_SYSTEM_MIN, PLANETS_PER_SYSTEM_MAX);
    const systemName = SYSTEM_NAMES[systemIdx % SYSTEM_NAMES.length];
    return {
      id: id("system", systemIdx),
      name: `${systemName}-${systemIdx + 1}`,
      starClass: STAR_CLASSES[systemIdx % STAR_CLASSES.length],
      planets: Array.from({ length: planetsCount }, (_, planetIdx) =>
        genPlanet(systemIdx, planetIdx),
      ),
    };
  });
}
