import { describe, it, expect } from "vitest";
import {
  ENVIRONMENT_UPGRADES,
  ENVIRONMENT_BRANCH_UNLOCK_SUM,
  environmentModifiers,
  environmentUpgradeCost,
  isEnvironmentBranchUnlocked,
  isEnvironmentUpgradeUnlocked,
  planEnvironmentPurchase,
} from "./environment";

describe("environment: cost", () => {
  it("уровень 0 = база, растёт по costMult", () => {
    for (const d of ENVIRONMENT_UPGRADES) {
      expect(environmentUpgradeCost(d, 0)).toBe(Math.ceil(d.baseCost));
      expect(environmentUpgradeCost(d, 3)).toBe(
        Math.ceil(d.baseCost * d.costMult ** 3),
      );
    }
  });
});

describe("environment: разблокировка по сумме ветки A", () => {
  it("вкладка закрыта до порога, открыта на пороге", () => {
    expect(isEnvironmentBranchUnlocked(ENVIRONMENT_BRANCH_UNLOCK_SUM - 1)).toBe(
      false,
    );
    expect(isEnvironmentBranchUnlocked(ENVIRONMENT_BRANCH_UNLOCK_SUM)).toBe(
      true,
    );
  });
  it("узел открыт ровно на своём unlockSum", () => {
    for (const d of ENVIRONMENT_UPGRADES) {
      expect(isEnvironmentUpgradeUnlocked(d, d.unlockSum - 1)).toBe(false);
      expect(isEnvironmentUpgradeUnlocked(d, d.unlockSum)).toBe(true);
    }
  });
});

describe("environment: modifiers", () => {
  it("пусто → нейтрально", () => {
    expect(environmentModifiers({})).toEqual({
      mpMul: 1,
      spawnRateMul: 1,
      orbitPerturbMul: 1,
    });
  });
  it("каждый узел множит свои каналы за уровень", () => {
    for (const d of ENVIRONMENT_UPGRADES) {
      const m = environmentModifiers({ [d.id]: 2 });
      for (const [ch, per] of Object.entries(d.perLevel)) {
        expect(m[ch as keyof typeof m]).toBeCloseTo(per ** 2, 6);
      }
    }
  });
  it("риск-узлы поднимают orbitPerturbMul выше 1", () => {
    const risky = ENVIRONMENT_UPGRADES.filter((d) => d.perLevel.orbitPerturbMul);
    expect(risky.length).toBeGreaterThan(0);
    for (const d of risky) {
      expect(environmentModifiers({ [d.id]: 5 }).orbitPerturbMul).toBeGreaterThan(
        1,
      );
    }
  });
});

describe("environment: planEnvironmentPurchase", () => {
  const def = ENVIRONMENT_UPGRADES[0];
  it("ничего не купить, если ветка/узел заблокированы", () => {
    const plan = planEnvironmentPurchase(def, 0, 1e12, 5, def.unlockSum - 1);
    expect(plan.count).toBe(0);
    expect(plan.totalCost).toBe(0);
  });
  it("при достатке массы и разблокировке — растущие цены", () => {
    let want = 0;
    for (let i = 0; i < 4; i++) want += environmentUpgradeCost(def, i);
    const plan = planEnvironmentPurchase(def, 0, 1e12, 4, def.unlockSum);
    expect(plan.count).toBe(4);
    expect(plan.totalCost).toBe(want);
  });
  it("ограничивается массой и maxLevel", () => {
    const two = environmentUpgradeCost(def, 0) + environmentUpgradeCost(def, 1);
    expect(
      planEnvironmentPurchase(def, 0, two, 10, def.unlockSum).count,
    ).toBe(2);
    expect(
      planEnvironmentPurchase(def, def.maxLevel - 1, 1e30, 10, def.unlockSum)
        .count,
    ).toBe(1);
  });
});
