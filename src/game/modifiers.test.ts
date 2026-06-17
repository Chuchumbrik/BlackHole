import { describe, it, expect } from "vitest";
import { computeModifiers, neutralModifiers } from "./modifiers";
import { ZERO_UPGRADE_LEVELS, type UpgradeLevels } from "./upgrades";

const lv = (p: Partial<UpgradeLevels>): UpgradeLevels => ({
  ...ZERO_UPGRADE_LEVELS,
  ...p,
});

describe("modifiers: computeModifiers", () => {
  it("нулевые уровни → нейтральные каналы", () => {
    expect(computeModifiers({ upgradeLevels: { ...ZERO_UPGRADE_LEVELS } })).toEqual(
      neutralModifiers(),
    );
  });

  it("disk и efficiency повышают mpMul (>1)", () => {
    expect(computeModifiers({ upgradeLevels: lv({ disk: 5 }) }).mpMul).toBeGreaterThan(1);
    expect(
      computeModifiers({ upgradeLevels: lv({ efficiency: 5 }) }).mpMul,
    ).toBeGreaterThan(1);
  });

  it("gravity повышает gravityRadiusMul; size — horizonMul", () => {
    expect(
      computeModifiers({ upgradeLevels: lv({ gravity: 4 }) }).gravityRadiusMul,
    ).toBeGreaterThan(1);
    expect(computeModifiers({ upgradeLevels: lv({ size: 4 }) }).horizonMul).toBeGreaterThan(1);
  });

  it("lensing повышает rareWeightMul только при level>0", () => {
    expect(computeModifiers({ upgradeLevels: lv({ lensing: 0 }) }).rareWeightMul).toBe(1);
    expect(
      computeModifiers({ upgradeLevels: lv({ lensing: 3 }) }).rareWeightMul,
    ).toBeGreaterThan(1);
  });

  it("каналы независимы (size не трогает mpMul)", () => {
    const m = computeModifiers({ upgradeLevels: lv({ size: 10 }) });
    expect(m.mpMul).toBe(1);
  });
});
