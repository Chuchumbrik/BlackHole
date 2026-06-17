import { describe, it, expect } from "vitest";
import {
  ADV_UPGRADES,
  advancedModifiers,
  isAdvBranchUnlocked,
  planAdvancedPurchase,
} from "./advancedUpgrades";

describe("advancedUpgrades: разблокировка по сжатиям", () => {
  it("ветки открыты только с нужного числа сжатий", () => {
    expect(isAdvBranchUnlocked("time", 0)).toBe(false);
    expect(isAdvBranchUnlocked("time", 1)).toBe(true);
    expect(isAdvBranchUnlocked("life", 1)).toBe(false);
    expect(isAdvBranchUnlocked("life", 2)).toBe(true);
    expect(isAdvBranchUnlocked("exotic", 3)).toBe(true);
  });
});

describe("advancedUpgrades: модификаторы", () => {
  it("пусто → нейтрально", () => {
    expect(advancedModifiers({})).toEqual({
      mpMul: 1,
      spawnRateMul: 1,
      lifeSpeedMul: 1,
    });
  });
  it("панспермия ускоряет жизнь (lifeSpeedMul > 1)", () => {
    const m = advancedModifiers({ panspermia: 3 });
    expect(m.lifeSpeedMul).toBeGreaterThan(1);
  });
  it("каждый узел множит свои каналы за уровень", () => {
    for (const def of ADV_UPGRADES) {
      const m = advancedModifiers({ [def.id]: 2 });
      for (const [ch, per] of Object.entries(def.perLevel)) {
        expect(m[ch as keyof typeof m]).toBeCloseTo(per ** 2, 6);
      }
    }
  });
});

describe("advancedUpgrades: покупка", () => {
  const def = ADV_UPGRADES[0]; // time, unlock prestige 1
  it("заблокировано без нужных сжатий", () => {
    expect(planAdvancedPurchase(def, 0, 1e12, 5, 0).count).toBe(0);
  });
  it("покупает при разблокировке и достатке массы", () => {
    expect(planAdvancedPurchase(def, 0, 1e12, 3, 1).count).toBe(3);
  });
});
