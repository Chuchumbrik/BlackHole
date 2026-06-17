import { describe, it, expect } from "vitest";
import {
  ACHIEVEMENTS,
  achievementMpMul,
  newlyUnlocked,
  type AchievementCtx,
} from "./achievements";
import { ZERO_UPGRADE_LEVELS } from "./upgrades";

const ZERO: AchievementCtx = {
  massMp: 0,
  lifetimeMassMp: 0,
  massSpentTotal: 0,
  prestigePoints: 0,
  prestigeCount: 0,
  gameTimeSec: 0,
  upgradeSum: 0,
  upgradeLevels: { ...ZERO_UPGRADE_LEVELS },
  incomeMpPerSec: 0,
  planetsWithLife: 0,
  maxCivLevel: 0,
};

describe("achievements: каталог", () => {
  it("много достижений и у всех уникальные id", () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(60);
    const ids = new Set(ACHIEVEMENTS.map((a) => a.id));
    expect(ids.size).toBe(ACHIEVEMENTS.length);
  });
  it("есть достижения по каждой ветке улучшений", () => {
    expect(ACHIEVEMENTS.some((a) => a.id.startsWith("branch_size_"))).toBe(true);
    expect(ACHIEVEMENTS.some((a) => a.id.startsWith("branch_hawking_"))).toBe(true);
  });
});

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

describe("achievements: newlyUnlocked (многоуровневые)", () => {
  it("при нулевом контексте ничего не открыто", () => {
    expect(newlyUnlocked(ZERO, [])).toHaveLength(0);
  });
  it("порог массы открывает первый тир массы (mass_1)", () => {
    const fresh = newlyUnlocked({ ...ZERO, massMp: 1000 }, []);
    expect(fresh.map((a) => a.id)).toContain("mass_1");
  });
  it("уже открытые не возвращаются повторно", () => {
    const fresh = newlyUnlocked({ ...ZERO, massMp: 1000 }, ["mass_1"]);
    expect(fresh.map((a) => a.id)).not.toContain("mass_1");
  });
  it("многоуровневость: высокий порог открывает несколько тиров сразу", () => {
    const ids = newlyUnlocked({ ...ZERO, massMp: 1_000_000 }, []).map((a) => a.id);
    expect(ids).toContain("mass_1");
    expect(ids).toContain("mass_2");
    expect(ids).toContain("mass_3");
  });
  it("первое сжатие (pp_1) завязано на PP-контекст", () => {
    expect(newlyUnlocked({ ...ZERO, prestigePoints: 0 }, []).map((a) => a.id))
      .not.toContain("pp_1");
    expect(newlyUnlocked({ ...ZERO, prestigePoints: 1 }, []).map((a) => a.id))
      .toContain("pp_1");
  });
  it("жизнь и цивилизация — по своим показателям", () => {
    expect(newlyUnlocked({ ...ZERO, planetsWithLife: 1 }, []).map((a) => a.id))
      .toContain("bio_1");
    expect(newlyUnlocked({ ...ZERO, maxCivLevel: 4 }, []).map((a) => a.id))
      .toContain("civ_2");
  });
});
