import { describe, it, expect } from "vitest";
import {
  SUPERNOVA_MP_MULT,
  SUPERNOVA_MAX_LEVEL,
  supernovaMpMult,
  supernovaUpgradeCostMp,
} from "./energy";

describe("supernova: прокачка скилла (item 24)", () => {
  it("уровень 0 = нет множителя, 1 = базовый ×3", () => {
    expect(supernovaMpMult(0)).toBe(1);
    expect(supernovaMpMult(1)).toBe(SUPERNOVA_MP_MULT);
  });
  it("множитель монотонно растёт с уровнем", () => {
    for (let l = 1; l < SUPERNOVA_MAX_LEVEL; l++) {
      expect(supernovaMpMult(l + 1)).toBeGreaterThan(supernovaMpMult(l));
    }
  });
  it("стоимость растёт геометрически, разблокировка дешевле прокачки", () => {
    expect(supernovaUpgradeCostMp(0)).toBeLessThan(supernovaUpgradeCostMp(1));
    expect(supernovaUpgradeCostMp(2)).toBeGreaterThan(supernovaUpgradeCostMp(1));
  });
});
