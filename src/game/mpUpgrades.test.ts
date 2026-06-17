import { describe, it, expect } from "vitest";
import {
  MP_UPGRADES,
  mpUpgradeCost,
  mpUpgradeModifiers,
  planMpUpgradePurchase,
} from "./mpUpgrades";

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

describe("mpUpgrades: planMpUpgradePurchase (оптовая)", () => {
  const def = MP_UPGRADES[0];
  it("при достатке массы — count и сумма растущих цен", () => {
    let want = 0;
    for (let i = 0; i < 4; i++) want += mpUpgradeCost(def, i);
    const plan = planMpUpgradePurchase(def, 0, 1e12, 4);
    expect(plan.count).toBe(4);
    expect(plan.totalCost).toBe(want);
  });
  it("ограничивается массой", () => {
    const twoLevels = mpUpgradeCost(def, 0) + mpUpgradeCost(def, 1);
    const plan = planMpUpgradePurchase(def, 0, twoLevels, 10);
    expect(plan.count).toBe(2);
    expect(plan.totalCost).toBe(twoLevels);
  });
  it("упирается в maxLevel", () => {
    const plan = planMpUpgradePurchase(def, def.maxLevel - 1, 1e30, 10);
    expect(plan.count).toBe(1);
  });
});
