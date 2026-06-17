import { describe, it, expect, beforeEach } from "vitest";
import {
  loadSave,
  writeSave,
  clearSave,
  SAVE_KEY,
  SAVE_SCHEMA_VERSION,
  type SaveData,
} from "./saveGame";

const mkSave = (over: Partial<SaveData> = {}): SaveData => ({
  schemaVersion: SAVE_SCHEMA_VERSION,
  massMp: 1234,
  gameTimeSec: 99,
  upgradeLevels: {
    size: 1,
    gravity: 0,
    disk: 2,
    efficiency: 0,
    jets: 0,
    lensing: 0,
    hawking: 0,
  },
  systems: [],
  activeSystemId: "s1",
  activePlanetId: null,
  viewTier: 0,
  simTimeScale: 1,
  jetBuffEndsAtSimSec: 0,
  savedAtMs: 1000,
  incomeEmaMpPerSec: 0.5,
  prestigePoints: 7,
  prestigePerkLevels: { compressed_singularity: 2 },
  mpUpgradeLevels: {},
  achievementsUnlocked: ["mp_1k"],
  ...over,
});

beforeEach(() => {
  localStorage.clear();
});

describe("saveGame: round-trip", () => {
  it("writeSave → loadSave возвращает то же", () => {
    const data = mkSave();
    writeSave(data);
    expect(loadSave()).toEqual(data);
  });
  it("нет сейва → null", () => {
    expect(loadSave()).toBeNull();
  });
  it("битый JSON → null, не падает", () => {
    localStorage.setItem(SAVE_KEY, "{not json");
    expect(loadSave()).toBeNull();
  });
  it("clearSave удаляет", () => {
    writeSave(mkSave());
    clearSave();
    expect(loadSave()).toBeNull();
  });
});

describe("saveGame: миграция версии (НЕ молчаливый wipe постоянной меты)", () => {
  it("при несовпадении версии сохраняет PP/перки/достижения и делает бэкап", () => {
    const old = mkSave({ schemaVersion: SAVE_SCHEMA_VERSION + 99 });
    localStorage.setItem(SAVE_KEY, JSON.stringify(old));

    const loaded = loadSave();
    // Постоянная мета не должна теряться:
    expect(loaded).not.toBeNull();
    expect(loaded?.prestigePoints).toBe(7);
    expect(loaded?.prestigePerkLevels).toEqual({ compressed_singularity: 2 });
    expect(loaded?.achievementsUnlocked).toEqual(["mp_1k"]);
    // Сырой прежний сейв сохранён в бэкап:
    expect(localStorage.getItem("cbh:save:bak")).toBeTruthy();
  });
});
