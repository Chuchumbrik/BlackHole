import {
  PLANET_SYSTEM_COUNT_MAX,
  PLANET_SYSTEM_COUNT_MIN,
  PLANETS_FIRST_SYSTEM_MAX,
  PLANETS_FIRST_SYSTEM_MIN,
  PLANETS_PER_SYSTEM_MAX,
  PLANETS_PER_SYSTEM_MIN,
} from "../balance/planetTuning";
import type { Planet, StarSystem } from "./types";
import { rollAnomaly } from "./anomalies";

const STAR_CLASSES = ["G", "K", "F", "M"] as const;
const SYSTEM_NAMES = ["Aster", "Helios", "Nyx", "Tau", "Eos", "Orion"] as const;
const PLANET_NAMES = [
  "Prime",
  "Aqua",
  "Inferna",
  "Zephyr",
  "Silica",
  "Karelia",
  "Boreal",
  "Saffron",
  "Vesper",
  "Cinder",
  "Nereid",
  "Altair",
] as const;

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
  const radiusScale = Math.round((0.42 + Math.random() * 0.96) * 100) / 100;
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
    orbitSpeed: randomRange(0.012, 0.072),
    stage: 1,
    stageProgressSec: 0,
    lifeEmergenceSec: 0,
    lifeBorn: false,
    mpYieldMult: 1,
    civLevel: 0,
    civProgressSec: 0,
    shieldUntilSec: 0,
    radiusScale,
  };
}

/**
 * Генерация мира. `ngPlus` (число New Game+) делает вселенную «древнее»: больше
 * аномалий и появляются блуждающие ЧД (контент-слой NG+); звёзды стартуют с
 * накопленной массой (старые тяжёлые светила) — крупнее, щедрее при поглощении.
 */
export function generateStarSystems(extraPlanets = 0, ngPlus = 0): StarSystem[] {
  const bonus = Math.max(0, Math.floor(extraPlanets));
  const ng = Math.max(0, Math.floor(ngPlus));
  const systemsCount = randomInt(PLANET_SYSTEM_COUNT_MIN, PLANET_SYSTEM_COUNT_MAX);
  return Array.from({ length: systemsCount }, (_, systemIdx) => {
    const planetsCount =
      (systemIdx === 0
        ? randomInt(PLANETS_FIRST_SYSTEM_MIN, PLANETS_FIRST_SYSTEM_MAX)
        : randomInt(PLANETS_PER_SYSTEM_MIN, PLANETS_PER_SYSTEM_MAX)) + bonus;
    const systemName = SYSTEM_NAMES[systemIdx % SYSTEM_NAMES.length];
    // Старые тяжёлые звёзды в NG+ (накопленная масса на старте).
    const starMassMp = ng > 0 ? Math.round(3000 * ng * (0.6 + Math.random())) : 0;
    return {
      id: id("system", systemIdx),
      name: `${systemName}-${systemIdx + 1}`,
      starClass: STAR_CLASSES[systemIdx % STAR_CLASSES.length],
      planets: Array.from({ length: planetsCount }, (_, planetIdx) =>
        genPlanet(systemIdx, planetIdx),
      ),
      anomaly: rollAnomaly(ng),
      ...(starMassMp > 0 ? { starMassMp } : {}),
    };
  });
}
