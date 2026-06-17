import { describe, it, expect } from "vitest";
import { INCOME_SOFTCAP, softCapIncomeMul } from "./economyTuning";

describe("economyTuning: softCapIncomeMul (анти-гиперинфляция)", () => {
  it("до порога — без изменений (идентичность)", () => {
    expect(softCapIncomeMul(1)).toBe(1);
    expect(softCapIncomeMul(INCOME_SOFTCAP)).toBe(INCOME_SOFTCAP);
    expect(softCapIncomeMul(INCOME_SOFTCAP - 0.01)).toBeCloseTo(
      INCOME_SOFTCAP - 0.01,
      6,
    );
  });
  it("выше порога — сжимает (результат < вход, но > порога)", () => {
    const big = softCapIncomeMul(1000);
    expect(big).toBeLessThan(1000);
    expect(big).toBeGreaterThan(INCOME_SOFTCAP);
  });
  it("монотонно не убывает", () => {
    let prev = 0;
    for (let x = 0; x <= 5000; x += 25) {
      const y = softCapIncomeMul(x);
      expect(y).toBeGreaterThanOrEqual(prev);
      prev = y;
    }
  });
  it("сильно гасит огромные множители (1000× → < 10× от сырого)", () => {
    expect(softCapIncomeMul(1000)).toBeLessThan(200);
  });
});
