import { describe, it, expect } from "vitest";
import { GAME_EVENTS, pickEvent, eventById } from "./events";

describe("events: каталог и выбор", () => {
  it("есть события и у всех положительный вес/длительность", () => {
    expect(GAME_EVENTS.length).toBeGreaterThan(0);
    for (const e of GAME_EVENTS) {
      expect(e.weight).toBeGreaterThan(0);
      expect(e.durationSec).toBeGreaterThan(0);
    }
  });
  it("pickEvent(0) даёт первое по весам, pickEvent(~1) — последнее", () => {
    expect(pickEvent(0).id).toBe(GAME_EVENTS[0].id);
    expect(pickEvent(0.9999).id).toBe(GAME_EVENTS[GAME_EVENTS.length - 1].id);
  });
  it("распределение pickEvent примерно соответствует весам", () => {
    const counts: Record<string, number> = {};
    const N = 6000;
    for (let i = 0; i < N; i++) {
      const id = pickEvent((i + 0.5) / N).id; // равномерная развёртка
      counts[id] = (counts[id] ?? 0) + 1;
    }
    const total = GAME_EVENTS.reduce((s, e) => s + e.weight, 0);
    for (const e of GAME_EVENTS) {
      const frac = (counts[e.id] ?? 0) / N;
      expect(frac).toBeCloseTo(e.weight / total, 1);
    }
  });
  it("eventById: известный/неизвестный", () => {
    expect(eventById(GAME_EVENTS[0].id)?.id).toBe(GAME_EVENTS[0].id);
    expect(eventById(null)).toBeNull();
    expect(eventById("__nope__")).toBeNull();
  });
  it("pickEvent с excludeIds никогда не возвращает исключённое", () => {
    for (let i = 0; i < 200; i++) {
      const e = pickEvent((i + 0.5) / 200, ["planet_parade"]);
      expect(e.id).not.toBe("planet_parade");
    }
  });
});
