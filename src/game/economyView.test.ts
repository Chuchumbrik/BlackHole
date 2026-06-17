import { describe, it, expect } from "vitest";
import { steadyMpMul, effectiveHawkingPerSec } from "./economyView";
import { ZERO_UPGRADE_LEVELS } from "./upgrades";

const base = () => ({
  upgradeLevels: { ...ZERO_UPGRADE_LEVELS },
  prestigePerkLevels: {} as Record<string, number>,
  mpUpgradeLevels: {} as Record<string, number>,
  environmentLevels: {} as Record<string, number>,
  achievementsUnlocked: [] as string[],
  massMp: 10_000,
});

describe("economyView: steadyMpMul", () => {
  it("без апгрейдов = 1", () => {
    expect(steadyMpMul(base())).toBeCloseTo(1, 6);
  });
  it("ветки добычи (диск/эффективность) повышают множитель", () => {
    const s = base();
    s.upgradeLevels.disk = 10;
    s.upgradeLevels.efficiency = 10;
    expect(steadyMpMul(s)).toBeGreaterThan(1);
  });
});

describe("economyView: effectiveHawkingPerSec", () => {
  it("при уровне хокинга 0 = 0", () => {
    expect(effectiveHawkingPerSec(base())).toBe(0);
  });
  it("растёт от общего множителя добычи (связность экономики)", () => {
    const plain = base();
    plain.upgradeLevels.hawking = 5;
    const boosted = base();
    boosted.upgradeLevels.hawking = 5;
    boosted.upgradeLevels.disk = 20; // повышает общий mpMul
    expect(effectiveHawkingPerSec(boosted)).toBeGreaterThan(
      effectiveHawkingPerSec(plain),
    );
  });
});
