import { describe, it, expect } from "vitest";
import { starGravityMul, starDisplayMul } from "./simulationPhysics";

describe("star mass: множители роста звезды", () => {
  it("при нулевой поглощённой массе — нейтрально (×1)", () => {
    expect(starGravityMul(0)).toBe(1);
    expect(starDisplayMul(0)).toBe(1);
  });
  it("растут с поглощённой массой (монотонно)", () => {
    expect(starGravityMul(10_000)).toBeGreaterThan(starGravityMul(1_000));
    expect(starDisplayMul(10_000)).toBeGreaterThan(starDisplayMul(1_000));
  });
  it("гравитация растёт мягче визуала", () => {
    expect(starGravityMul(50_000)).toBeLessThan(starDisplayMul(50_000));
  });
  it("видимый радиус ограничен потолком ×1.8", () => {
    expect(starDisplayMul(1e12)).toBeLessThanOrEqual(1.8);
  });
});
