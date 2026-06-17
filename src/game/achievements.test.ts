import { describe, it, expect } from "vitest";
import {
  ACHIEVEMENTS,
  achievementMpMul,
  newlyUnlocked,
  type AchievementCtx,
} from "./achievements";

const ZERO: AchievementCtx = {
  massMp: 0,
  prestigePoints: 0,
  gameTimeSec: 0,
  upgradeSum: 0,
};

describe("achievements: achievementMpMul", () => {
  it("без открытых → 1", () => {
    expect(achievementMpMul([])).toBe(1);
  });
  it("произведение бонусов открытых", () => {
    const a = ACHIEVEMENTS[0];
    const b = ACHIEVEMENTS[1];
    expect(achievementMpMul([a.id])).toBeCloseTo(a.bonusMpMul, 6);
    expect(achievementMpMul([a.id, b.id])).toBeCloseTo(
      a.bonusMpMul * b.bonusMpMul,
      6,
    );
  });
  it("неизвестные id игнорируются", () => {
    expect(achievementMpMul(["__nope__"])).toBe(1);
  });
});

describe("achievements: newlyUnlocked", () => {
  it("при нулевом контексте ничего не открыто", () => {
    expect(newlyUnlocked(ZERO, [])).toHaveLength(0);
  });
  it("порог массы открывает mp_1k", () => {
    const fresh = newlyUnlocked({ ...ZERO, massMp: 1000 }, []);
    expect(fresh.map((a) => a.id)).toContain("mp_1k");
  });
  it("уже открытые не возвращаются повторно", () => {
    const fresh = newlyUnlocked({ ...ZERO, massMp: 1000 }, ["mp_1k"]);
    expect(fresh.map((a) => a.id)).not.toContain("mp_1k");
  });
  it("first_prestige завязан на PP-контекст", () => {
    expect(newlyUnlocked({ ...ZERO, prestigePoints: 0 }, []).map((a) => a.id))
      .not.toContain("first_prestige");
    expect(newlyUnlocked({ ...ZERO, prestigePoints: 1 }, []).map((a) => a.id))
      .toContain("first_prestige");
  });
});
