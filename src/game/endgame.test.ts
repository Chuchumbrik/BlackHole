import { describe, it, expect } from "vitest";
import {
  ENTROPY_THRESHOLD,
  ULTIMATE_NG_REQUIRED,
  canDestroyUniverse,
  upFromDestruction,
  ultimateMpMul,
  ultimateReached,
  ngPlusStartMass,
} from "./endgame";

describe("endgame: энтропия и Уничтожение", () => {
  it("Уничтожение доступно с порога энтропии", () => {
    expect(canDestroyUniverse(ENTROPY_THRESHOLD - 1)).toBe(false);
    expect(canDestroyUniverse(ENTROPY_THRESHOLD)).toBe(true);
  });
  it("UP всегда ≥ 1 и растёт с PP", () => {
    expect(upFromDestruction(0, ENTROPY_THRESHOLD)).toBeGreaterThanOrEqual(1);
    expect(upFromDestruction(100_000, ENTROPY_THRESHOLD)).toBeGreaterThan(
      upFromDestruction(100, ENTROPY_THRESHOLD),
    );
  });
});

describe("endgame: Ultimate Points", () => {
  it("множитель = 1 при 0 UP, растёт", () => {
    expect(ultimateMpMul(0)).toBe(1);
    expect(ultimateMpMul(4)).toBeGreaterThan(ultimateMpMul(1));
  });
  it("стартовая масса NG+ = 0 при 0 UP, растёт сверхлинейно", () => {
    expect(ngPlusStartMass(0)).toBe(0);
    expect(ngPlusStartMass(4)).toBeGreaterThan(ngPlusStartMass(2) * 2);
  });
  it("Ultimate Prestige достигается после N New Game+", () => {
    expect(ultimateReached(ULTIMATE_NG_REQUIRED - 1)).toBe(false);
    expect(ultimateReached(ULTIMATE_NG_REQUIRED)).toBe(true);
  });
});
