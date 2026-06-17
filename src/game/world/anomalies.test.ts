import { describe, it, expect } from "vitest";
import {
  ANOMALY_DEFS,
  anomalyMpMul,
  rollAnomaly,
} from "./anomalies";

describe("anomalies: множители и определения", () => {
  it("у каждого определения mpMul > 1", () => {
    for (const def of Object.values(ANOMALY_DEFS)) {
      expect(def.mpMul).toBeGreaterThan(1);
    }
  });
  it("anomalyMpMul: undefined → 1, иначе из таблицы", () => {
    expect(anomalyMpMul(undefined)).toBe(1);
    expect(anomalyMpMul("neutron_star")).toBe(ANOMALY_DEFS.neutron_star.mpMul);
  });
  it("легендарная — самая щедрая", () => {
    expect(ANOMALY_DEFS.stellar_nursery.legendary).toBe(true);
    expect(ANOMALY_DEFS.stellar_nursery.mpMul).toBeGreaterThan(
      ANOMALY_DEFS.neutron_star.mpMul,
    );
  });
  it("rollAnomaly: chanceMul=0 → почти всегда обычная, =большой → часто аномалия", () => {
    let plain = 0;
    for (let i = 0; i < 200; i++) if (rollAnomaly(0) === undefined) plain++;
    expect(plain).toBeGreaterThan(150); // легендарная всё же изредка проскочит
    let anom = 0;
    for (let i = 0; i < 200; i++) if (rollAnomaly(50) !== undefined) anom++;
    expect(anom).toBeGreaterThan(150);
  });
});
