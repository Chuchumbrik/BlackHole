import { describe, it, expect } from "vitest";
import { ppFromMass, PRESTIGE_THRESHOLD_MP } from "./prestige";

describe("prestige: ppFromMass", () => {
  it("ниже порога даёт 0 PP", () => {
    expect(ppFromMass(0)).toBe(0);
    expect(ppFromMass(PRESTIGE_THRESHOLD_MP - 1)).toBe(0);
  });

  it("на пороге даёт 1 PP", () => {
    expect(ppFromMass(PRESTIGE_THRESHOLD_MP)).toBe(1);
  });

  it("растёт как floor(sqrt(MP/1000))", () => {
    expect(ppFromMass(4000)).toBe(2);
    expect(ppFromMass(9000)).toBe(3);
    expect(ppFromMass(100_000)).toBe(10);
  });

  it("монотонно не убывает", () => {
    let prev = 0;
    for (let m = 0; m <= 200_000; m += 1500) {
      const pp = ppFromMass(m);
      expect(pp).toBeGreaterThanOrEqual(prev);
      prev = pp;
    }
  });
});
