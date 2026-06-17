import { describe, it, expect } from "vitest";
import { addObjectsCapped } from "./simulation";
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
