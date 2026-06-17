import { describe, it, expect } from "vitest";
import { starLuminosity01, targetTemperature01 } from "./planetTuning";

describe("climate: светимость звезды", () => {
  it("горячие классы светимее холодных", () => {
    expect(starLuminosity01("O")).toBeGreaterThan(starLuminosity01("G"));
    expect(starLuminosity01("G")).toBeGreaterThan(starLuminosity01("M"));
  });
  it("растёт с набранной массой звезды", () => {
    expect(starLuminosity01("G", 50_000)).toBeGreaterThan(starLuminosity01("G", 0));
  });
  it("неизвестный класс — дефолт (~G)", () => {
    expect(starLuminosity01("?")).toBeCloseTo(starLuminosity01("G"), 5);
  });
});

describe("climate: целевая температура по орбите", () => {
  it("ближе к звезде (orbital01 мал) — горячее", () => {
    const lum = starLuminosity01("G");
    expect(targetTemperature01(10, lum)).toBeGreaterThan(targetTemperature01(90, lum));
  });
  it("в пределах 0..100", () => {
    for (const o of [0, 25, 50, 75, 100]) {
      const t = targetTemperature01(o, starLuminosity01("O", 1e6));
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(100);
    }
  });
});
