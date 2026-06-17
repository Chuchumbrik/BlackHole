import { describe, it, expect } from "vitest";
import {
  accelerationCostMp,
  advancePlanetStages,
  deviationFromGoldenMid,
} from "./planetProgress";
import { PLANET_STAGE_DURATIONS_SEC } from "../balance";
import type { Planet } from "./types";

const mkPlanet = (over: Partial<Planet> = {}): Planet => ({
  id: "p1",
  name: "P",
  orbitalDistance: 50,
  gravityProxy: 50,
  surfaceTemperature: 50,
  atmosphere: 50,
  hydrosphere: 50,
  geologicalActivity: 50,
  orbitPhaseRad: 0,
  orbitSpeed: 0.1,
  stage: 1,
  stageProgressSec: 0,
  lifeEmergenceSec: 0,
  lifeBorn: false,
  mpYieldMult: 1,
  civLevel: 0,
  civProgressSec: 0,
  shieldUntilSec: 0,
  radiusScale: 1,
  ...over,
});

describe("planetProgress: ускорение", () => {
  it("стоимость ускорения положительна", () => {
    expect(accelerationCostMp(mkPlanet())).toBeGreaterThan(0);
  });
  it("отклонение от золотой середины 0 при параметрах=50", () => {
    expect(deviationFromGoldenMid(mkPlanet())).toBeCloseTo(0, 6);
  });
});

describe("planetProgress: продвижение стадий", () => {
  it("достаточное время повышает стадию", () => {
    const after = advancePlanetStages(mkPlanet({ stage: 1 }), PLANET_STAGE_DURATIONS_SEC[0] + 1);
    expect(after.stage).toBeGreaterThanOrEqual(2);
  });
  it("стадия не превышает 4", () => {
    const after = advancePlanetStages(mkPlanet({ stage: 4 }), 1e9);
    expect(after.stage).toBe(4);
  });
  it("dt<=0 — без изменений стадии", () => {
    const after = advancePlanetStages(mkPlanet({ stage: 2, stageProgressSec: 5 }), 0);
    expect(after.stage).toBe(2);
  });
});
