import { describe, it, expect } from "vitest";
import { rollCritEvent } from "./critEvents";
import type { Planet } from "./types";

const mk = (over: Partial<Planet> = {}): Planet => ({
  id: "p",
  name: "Гайя",
  orbitalDistance: 50,
  gravityProxy: 50,
  surfaceTemperature: 50,
  atmosphere: 50,
  hydrosphere: 50,
  geologicalActivity: 50,
  orbitPhaseRad: 0,
  orbitSpeed: 0.1,
  stage: 3,
  stageProgressSec: 0,
  lifeEmergenceSec: 200,
  lifeBorn: false,
  mpYieldMult: 1,
  civLevel: 0,
  civProgressSec: 0,
  shieldUntilSec: 0,
  radiusScale: 1,
  ...over,
});

// rand=()=>0 → событие срабатывает (0 < rate*dt), выбор первого кандидата.
const always = () => 0;
// rand=()=>0.999 → не срабатывает.
const never = () => 0.999;

describe("critEvents: rollCritEvent", () => {
  it("без жизни/зарождения — ничего не происходит", () => {
    const p = mk({ lifeBorn: false, lifeEmergenceSec: 0 });
    expect(rollCritEvent(p, 1, always).event).toBeUndefined();
  });
  it("высокий rand → события нет", () => {
    expect(rollCritEvent(mk(), 1, never).event).toBeUndefined();
  });
  it("зарождение: кислородная катастрофа откатывает lifeEmergenceSec", () => {
    const p = mk({ lifeBorn: false, lifeEmergenceSec: 300 });
    const r = rollCritEvent(p, 1, always);
    expect(r.event?.kind).toBe("oxygen_catastrophe");
    expect(r.planet.lifeEmergenceSec).toBeLessThan(300);
  });
  it("ядерная война возможна только при civLevel ≥ 2 и откатывает тир", () => {
    // подберём rand так, чтобы выбрать nuclear_war: кандидаты [supervolcano, nuclear_war]
    // (lifeBorn → нет oxygen). Math.floor(rand()*2)=1 → rand∈[0.5,1) на выборе.
    const rand = (() => {
      let i = 0;
      const seq = [0, 0.6]; // 1-й: проверка частоты (0<rate), 2-й: выбор индекса 1
      return () => seq[i++] ?? 0.6;
    })();
    const p = mk({ lifeBorn: true, civLevel: 3, civProgressSec: 500 });
    const r = rollCritEvent(p, 1, rand);
    expect(r.event?.kind).toBe("nuclear_war");
    expect(r.planet.civLevel).toBe(2);
  });
});
