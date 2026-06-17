import { describe, it, expect } from "vitest";
import {
  ecosystemStable,
  tickPlanetLife,
  planetSwallowMpBase,
} from "./planetLife";
import {
  PLANET_LIFE_EMERGENCE_TOTAL_SEC,
  PLANET_CIV_STAGE_SEC,
  PLANET_CIV_MAX_LEVEL,
} from "../balance";
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

describe("planetLife: экосистема", () => {
  it("все параметры в коридоре → стабильна", () => {
    expect(ecosystemStable(mkPlanet())).toBe(true);
  });
  it("параметр вне коридора → нестабильна", () => {
    expect(ecosystemStable(mkPlanet({ atmosphere: 5 }))).toBe(false);
  });
});

describe("planetLife: зарождение жизни и цивилизация", () => {
  it("зрелая (стадия 3) стабильная экосистема накапливает жизнь до рождения", () => {
    const born = tickPlanetLife(mkPlanet({ stage: 3 }), PLANET_LIFE_EMERGENCE_TOTAL_SEC);
    expect(born.lifeBorn).toBe(true);
  });
  it("незрелая планета (стадия < 3) НЕ зарождает жизнь даже при стабильной экосистеме", () => {
    const p = tickPlanetLife(mkPlanet({ stage: 2 }), PLANET_LIFE_EMERGENCE_TOTAL_SEC);
    expect(p.lifeBorn).toBe(false);
    expect(p.lifeEmergenceSec).toBe(0);
  });
  it("нестабильная экосистема не зарождает жизнь", () => {
    const p = tickPlanetLife(
      mkPlanet({ stage: 3, atmosphere: 5 }),
      PLANET_LIFE_EMERGENCE_TOTAL_SEC,
    );
    expect(p.lifeBorn).toBe(false);
    expect(p.lifeEmergenceSec).toBe(0);
  });
  it("после жизни цивилизация растёт по тирам до потолка", () => {
    let p = mkPlanet({ lifeBorn: true });
    p = tickPlanetLife(p, PLANET_CIV_STAGE_SEC * 2 + 1);
    expect(p.civLevel).toBe(2);
    p = tickPlanetLife(p, PLANET_CIV_STAGE_SEC * 10);
    expect(p.civLevel).toBe(PLANET_CIV_MAX_LEVEL);
  });
  it("биосфера истощается после жизни (mpYieldMult падает, но >= нижней границы)", () => {
    const p = tickPlanetLife(mkPlanet({ lifeBorn: true, mpYieldMult: 1 }), 100000);
    expect(p.mpYieldMult).toBeLessThan(1);
    expect(p.mpYieldMult).toBeGreaterThanOrEqual(0.22);
  });
});

describe("planetLife: доход за поглощение", () => {
  it("жизнь повышает базовый MP за поглощение", () => {
    const noLife = planetSwallowMpBase(mkPlanet({ lifeBorn: false }));
    const life = planetSwallowMpBase(mkPlanet({ lifeBorn: true }));
    expect(life).toBeGreaterThan(noLife);
  });
});
