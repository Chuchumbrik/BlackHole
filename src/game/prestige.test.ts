import { describe, it, expect } from "vitest";
import { ppFromSpent, prestigePpGain, PRESTIGE_SPENT_PER_PP } from "./prestige";

describe("prestige: ppFromSpent (по потраченной массе)", () => {
  it("ниже порога даёт 0 PP", () => {
    expect(ppFromSpent(0)).toBe(0);
    expect(ppFromSpent(PRESTIGE_SPENT_PER_PP - 1)).toBe(0);
  });

  it("на пороге даёт 1 PP", () => {
    expect(ppFromSpent(PRESTIGE_SPENT_PER_PP)).toBe(1);
  });

  it("растёт как floor(sqrt(spent/PER_PP))", () => {
    expect(ppFromSpent(PRESTIGE_SPENT_PER_PP * 4)).toBe(2);
    expect(ppFromSpent(PRESTIGE_SPENT_PER_PP * 9)).toBe(3);
    expect(ppFromSpent(PRESTIGE_SPENT_PER_PP * 100)).toBe(10);
  });

  it("монотонно не убывает", () => {
    let prev = 0;
    for (let m = 0; m <= PRESTIGE_SPENT_PER_PP * 120; m += PRESTIGE_SPENT_PER_PP / 3) {
      const pp = ppFromSpent(m);
      expect(pp).toBeGreaterThanOrEqual(prev);
      prev = pp;
    }
  });
});

describe("prestige: prestigePpGain (потрачено + наличие)", () => {
  it("учитывает и потраченное, и наличие на руках", () => {
    // по отдельности ниже порога, вместе — достаточно
    expect(prestigePpGain(600, 600)).toBe(ppFromSpent(1200));
    expect(prestigePpGain(PRESTIGE_SPENT_PER_PP * 2, PRESTIGE_SPENT_PER_PP * 2)).toBe(
      ppFromSpent(PRESTIGE_SPENT_PER_PP * 4),
    );
  });
  it("наличие само по себе даёт PP (не только траты)", () => {
    expect(prestigePpGain(0, PRESTIGE_SPENT_PER_PP * 9)).toBe(3);
  });
});
