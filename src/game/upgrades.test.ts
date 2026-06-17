import { describe, it, expect } from "vitest";
import {
  ZERO_UPGRADE_LEVELS,
  levelSum,
  nextUpgradeCostMp,
  canPurchaseUpgrade,
  mpIncomeMultiplier,
  hawkingMpPerSecond,
  type UpgradeLevels,
} from "./upgrades";
import {
  UPGRADE_FIRST_LEVEL_COST_MP,
  UPGRADE_COST_MULTIPLIER_PER_LEVEL,
  JET_FIELD_MP_MULT,
  SUM_FOR_JETS_UNLOCK,
} from "./balance";

const lv = (p: Partial<UpgradeLevels>): UpgradeLevels => ({
  ...ZERO_UPGRADE_LEVELS,
  ...p,
});

describe("upgrades: стоимость и сумма", () => {
  it("levelSum складывает все ветки", () => {
    expect(levelSum(lv({ size: 2, disk: 3, hawking: 1 }))).toBe(6);
  });
  it("первая цена = база, далее ×множитель", () => {
    expect(nextUpgradeCostMp(ZERO_UPGRADE_LEVELS, "size")).toBe(
      Math.ceil(UPGRADE_FIRST_LEVEL_COST_MP),
    );
    expect(nextUpgradeCostMp(lv({ size: 3 }), "size")).toBe(
      Math.ceil(UPGRADE_FIRST_LEVEL_COST_MP * UPGRADE_COST_MULTIPLIER_PER_LEVEL ** 3),
    );
  });
});

describe("upgrades: покупка и анлоки", () => {
  it("нельзя купить без достаточной массы", () => {
    expect(canPurchaseUpgrade(ZERO_UPGRADE_LEVELS, "size", 0)).toBe(false);
    expect(
      canPurchaseUpgrade(ZERO_UPGRADE_LEVELS, "size", UPGRADE_FIRST_LEVEL_COST_MP),
    ).toBe(true);
  });
  it("jets заблокированы до порога суммы", () => {
    expect(canPurchaseUpgrade(lv({ size: 1 }), "jets", 1e9)).toBe(false);
    const unlocked = lv({ size: SUM_FOR_JETS_UNLOCK });
    expect(canPurchaseUpgrade(unlocked, "jets", 1e9)).toBe(true);
  });
});

describe("upgrades: доход", () => {
  it("mpIncomeMultiplier ×JET при активном баффе", () => {
    const base = mpIncomeMultiplier(ZERO_UPGRADE_LEVELS, false);
    const buffed = mpIncomeMultiplier(ZERO_UPGRADE_LEVELS, true);
    expect(buffed).toBeCloseTo(base * JET_FIELD_MP_MULT, 6);
  });
  it("hawking = 0 при уровне 0, растёт с уровнем и массой", () => {
    expect(hawkingMpPerSecond(ZERO_UPGRADE_LEVELS, 1000)).toBe(0);
    const l1 = hawkingMpPerSecond(lv({ hawking: 1 }), 0);
    const l2 = hawkingMpPerSecond(lv({ hawking: 2 }), 0);
    expect(l2).toBeGreaterThan(l1);
    expect(hawkingMpPerSecond(lv({ hawking: 1 }), 100_000)).toBeGreaterThan(l1);
  });
});
