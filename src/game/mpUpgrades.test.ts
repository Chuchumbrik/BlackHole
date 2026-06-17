import { describe, it, expect } from "vitest";
import { MP_UPGRADES, mpUpgradeCost, mpUpgradeModifiers } from "./mpUpgrades";

describe("mpUpgrades: cost", () => {
  it("уровень 0 = база, растёт по costMult", () => {
    for (const d of MP_UPGRADES) {
      expect(mpUpgradeCost(d, 0)).toBe(Math.ceil(d.baseCost));
      expect(mpUpgradeCost(d, 3)).toBe(Math.ceil(d.baseCost * d.costMult ** 3));
    }
  });
});

describe("mpUpgrades: modifiers", () => {
  it("пусто → нейтрально", () => {
    expect(mpUpgradeModifiers({})).toEqual({
      mpMul: 1,
      spawnRateMul: 1,
      hawkingMul: 1,
    });
  });
  it("каждый апгрейд множит свой канал", () => {
    for (const d of MP_UPGRADES) {
      const m = mpUpgradeModifiers({ [d.id]: 2 });
      expect(m[d.kind]).toBeCloseTo(d.perLevel ** 2, 6);
    }
  });
});
