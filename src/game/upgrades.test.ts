import { describe, it, expect } from "vitest";
import {
  ZERO_UPGRADE_LEVELS,
  levelSum,
  nextUpgradeCostMp,
  canPurchaseUpgrade,
  planUpgradePurchase,
  mpIncomeMultiplier,
  hawkingMpPerSecond,
  computeRadiiPx,
  type UpgradeLevels,
} from "./upgrades";
import {
  UPGRADE_FIRST_LEVEL_COST_MP,
  UPGRADE_COST_MULTIPLIER_PER_LEVEL,
  JET_FIELD_MP_MULT,
  SUM_FOR_JETS_UNLOCK,
  massHorizonMul,
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

describe("upgrades: горизонт растёт от массы", () => {
  it("massHorizonMul: =1 при 0, монотонно растёт, мягко (лог)", () => {
    expect(massHorizonMul(0)).toBe(1);
    expect(massHorizonMul(20000)).toBeGreaterThan(massHorizonMul(2000));
    // мягкость: даже при огромной массе множитель остаётся умеренным
    expect(massHorizonMul(1_000_000)).toBeLessThan(2);
  });
  it("computeRadiiPx: горизонт с массой больше, чем без", () => {
    const r0 = computeRadiiPx(800, ZERO_UPGRADE_LEVELS, 0).horizon;
    const r1 = computeRadiiPx(800, ZERO_UPGRADE_LEVELS, 100_000).horizon;
    expect(r1).toBeGreaterThan(r0);
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

describe("upgrades: planUpgradePurchase (оптовая, цена под множитель)", () => {
  const sumCost = (branch: "size", n: number) => {
    let total = 0;
    const tmp = { ...ZERO_UPGRADE_LEVELS };
    for (let i = 0; i < n; i++) {
      total += nextUpgradeCostMp(tmp, branch);
      tmp[branch] += 1;
    }
    return total;
  };
  it("при достатке массы берёт ровно count и сумму растущих цен", () => {
    const want = sumCost("size", 5);
    const plan = planUpgradePurchase(ZERO_UPGRADE_LEVELS, "size", 1e9, 5);
    expect(plan.count).toBe(5);
    expect(plan.totalCost).toBe(want);
    // сумма 5 уровней строго больше, чем 5×(цена первого) — цена пересчитывается
    expect(plan.totalCost).toBeGreaterThan(
      5 * nextUpgradeCostMp(ZERO_UPGRADE_LEVELS, "size"),
    );
  });
  it("ограничивается доступной массой (capped < count)", () => {
    const twoLevels = sumCost("size", 2);
    const plan = planUpgradePurchase(ZERO_UPGRADE_LEVELS, "size", twoLevels, 10);
    expect(plan.count).toBe(2);
    expect(plan.totalCost).toBe(twoLevels);
  });
  it("нулевая масса → count 0, цена 0", () => {
    const plan = planUpgradePurchase(ZERO_UPGRADE_LEVELS, "size", 0, 10);
    expect(plan).toEqual({ count: 0, totalCost: 0 });
  });
  it("учитывает блокировку ветки (jets заблокированы)", () => {
    const plan = planUpgradePurchase(lv({ size: 1 }), "jets", 1e9, 10);
    expect(plan.count).toBe(0);
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
