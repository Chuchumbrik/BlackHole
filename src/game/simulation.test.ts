import { describe, it, expect } from "vitest";
import { addObjectsCapped, spawnRocheRing } from "./simulation";
import { MAX_OBJECTS_ON_FIELD } from "./balance";
import type { SimObject } from "./simulation";

const mkObjs = (n: number): SimObject[] =>
  Array.from({ length: n }, (_, i) => ({
    id: i,
    kind: 1,
    displayName: `o${i}`,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    mass: 1,
    mpValue: 1,
    radiusPx: 2,
    shapeSeed: 0,
    spinRate: 0,
  })) as unknown as SimObject[];

describe("simulation: addObjectsCapped", () => {
  it("добавляет всё, если есть место", () => {
    const r = addObjectsCapped(mkObjs(10), mkObjs(5));
    expect(r).toHaveLength(15);
  });
  it("обрезает по потолку MAX_OBJECTS_ON_FIELD", () => {
    const base = mkObjs(MAX_OBJECTS_ON_FIELD - 3);
    const r = addObjectsCapped(base, mkObjs(20));
    expect(r).toHaveLength(MAX_OBJECTS_ON_FIELD);
  });
  it("не добавляет ничего при заполненном поле", () => {
    const base = mkObjs(MAX_OBJECTS_ON_FIELD);
    const r = addObjectsCapped(base, mkObjs(5));
    expect(r).toHaveLength(MAX_OBJECTS_ON_FIELD);
    expect(r).toBe(base); // возвращает исходный массив без копии
  });
});

describe("simulation: spawnRocheRing (приливный разрыв)", () => {
  it("создаёт ровно count осколков", () => {
    const ring = spawnRocheRing(0, 0, 100, 0, 26, 5000);
    expect(ring).toHaveLength(26);
  });
  it("суммарный mpValue близок к заданному totalMp (±джиттер)", () => {
    const total = 8000;
    const ring = spawnRocheRing(0, 0, 0, 140, 30, total);
    const sum = ring.reduce((a, o) => a + o.mpValue, 0);
    // джиттер каждого осколка 0.7..1.3 от среднего → сумма в пределах ±30%.
    expect(sum).toBeGreaterThan(total * 0.7);
    expect(sum).toBeLessThan(total * 1.3);
  });
  it("осколки лежат примерно на радиусе разрыва вокруг дыры", () => {
    const r0 = 120;
    const ring = spawnRocheRing(0, 0, r0, 0, 20, 1000);
    for (const o of ring) {
      const r = Math.hypot(o.x, o.y);
      expect(r).toBeGreaterThan(r0 * 0.85);
      expect(r).toBeLessThan(r0 * 1.15);
    }
  });
});
