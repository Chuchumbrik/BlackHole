import { describe, it, expect } from "vitest";
import {
  PRESTIGE_PERKS,
  perkCost,
  prestigeModifiers,
  prestigeRunStart,
} from "./prestigePerks";

describe("prestigePerks: perkCost", () => {
  it("уровень 0 = базовая цена", () => {
    for (const d of PRESTIGE_PERKS) expect(perkCost(d, 0)).toBe(Math.ceil(d.baseCost));
  });
  it("растёт по costMult^level", () => {
    for (const d of PRESTIGE_PERKS) {
      expect(perkCost(d, 2)).toBe(Math.ceil(d.baseCost * d.costMult ** 2));
      expect(perkCost(d, 5)).toBeGreaterThan(perkCost(d, 4));
    }
  });
});

describe("prestigePerks: prestigeModifiers (тип B)", () => {
  it("пустые уровни → нейтрально", () => {
    expect(prestigeModifiers({})).toEqual({ mpMul: 1, hawkingMul: 1 });
  });
  it("mpMul-перк множит доход", () => {
    const d = PRESTIGE_PERKS.find((p) => p.kind === "mpMul")!;
    const m = prestigeModifiers({ [d.id]: 3 });
    expect(m.mpMul).toBeCloseTo(d.perLevel ** 3, 6);
    expect(m.hawkingMul).toBe(1);
  });
  it("hawkingMul-перк множит пассив", () => {
    const d = PRESTIGE_PERKS.find((p) => p.kind === "hawkingMul")!;
    const m = prestigeModifiers({ [d.id]: 2 });
    expect(m.hawkingMul).toBeCloseTo(d.perLevel ** 2, 6);
  });
});

describe("prestigePerks: prestigeRunStart (тип A)", () => {
  it("пустые → нейтрально", () => {
    expect(prestigeRunStart({})).toEqual({
      spawnRateMul: 1,
      extraPlanets: 0,
      startMassMp: 0,
      planetHeadStartStages: 0,
    });
  });
  it("cosmic_memory даёт фору по стадиям планет", () => {
    expect(prestigeRunStart({ cosmic_memory: 2 }).planetHeadStartStages).toBe(2);
  });
  it("spawnRateMul мультипликативен, extraPlanets/startMass аддитивны", () => {
    const spawn = PRESTIGE_PERKS.find((p) => p.kind === "spawnRateMul")!;
    const planets = PRESTIGE_PERKS.find((p) => p.kind === "extraPlanets")!;
    const mass = PRESTIGE_PERKS.find((p) => p.kind === "startMass")!;
    const r = prestigeRunStart({
      [spawn.id]: 2,
      [planets.id]: 3,
      [mass.id]: 4,
    });
    expect(r.spawnRateMul).toBeCloseTo(spawn.perLevel ** 2, 6);
    expect(r.extraPlanets).toBe(planets.perLevel * 3);
    expect(r.startMassMp).toBe(mass.perLevel * 4);
  });
});
