import { create } from "zustand";
import { PLANET_ACCELERATION_SECONDS } from "../game/balance";
import {
  ZERO_UPGRADE_LEVELS,
  canPurchaseUpgrade,
  isViewTierUnlocked,
  nextUpgradeCostMp,
  type UpgradeBranch,
  type UpgradeLevels,
} from "../game/upgrades";
import { generateStarSystems } from "../game/world/generation";
import {
  loadSave,
  writeSave,
  clearSave,
  SAVE_SCHEMA_VERSION,
  type SaveData,
} from "../game/save/saveGame";
import { accelerationCostMp, advancePlanetStages } from "../game/world/planetProgress";
import { tickPlanetLife } from "../game/world/planetLife";
import type { Planet, StarSystem } from "../game/world/types";

type TabId = "game" | "upgrades" | "planet" | "prestige" | "stats";

export type ViewTierId = 0 | 1 | 2;

/** Множитель времени симуляции: 0 — пауза, иначе ускорение относительно реального времени. */
export type SimTimeScale = 0 | 1 | 2 | 3 | 5 | 10;

export type MpGainFloaterEvent = { id: number; amount: number };

let mpGainFloaterIdSeq = 0;

type GameState = {
  massMp: number;
  gameTimeSec: number;
  upgradeLevels: UpgradeLevels;
  /** Масштаб вида: у дыры / звёздная система / карта галактики (узлы). */
  viewTier: ViewTierId;
  activeTab: TabId;
  /** Скорость игрового времени (пауза / ×1 / ×2 / ×3 / ×5 / ×10). */
  simTimeScale: SimTimeScale;
  systems: StarSystem[];
  activeSystemId: string;
  /** Активные всплывающие подсказки «+MP» к счётчику (очищаются после анимации). */
  mpGainFloaters: MpGainFloaterEvent[];
  /** Игровое время окончания баффа джетов (сек); 0 — нет активного баффа. */
  jetBuffEndsAtSimSec: number;
  /** Сглаженная ставка дохода MP/с (для оффлайн-начисления); пишется из игрового цикла. */
  incomeEmaMpPerSec: number;
  /** Начисленный оффлайн-доход для показа окна «пока вас не было»; 0 — нет. */
  pendingOfflineMp: number;
  addMassMp: (amount: number) => void;
  dismissMpGainFloater: (id: number) => void;
  buyUpgrade: (branch: UpgradeBranch) => void;
  setJetBuffEndsAt: (simSec: number) => void;
  setActiveSystem: (systemId: string) => void;
  advanceGameTime: (simDt: number) => void;
  acceleratePlanet: (systemId: string, planetId: string) => void;
  activePlanetId: string | null;
  setActivePlanet: (planetId: string | null) => void;
  removePlanet: (systemId: string, planetId: string) => void;
  setTab: (tab: TabId) => void;
  setViewTier: (tier: ViewTierId) => void;
  setSimTimeScale: (scale: SimTimeScale) => void;
  /** Записать сглаженную ставку дохода (из игрового цикла). */
  setIncomeEma: (mpPerSec: number) => void;
  /** Закрыть окно оффлайн-дохода. */
  clearPendingOffline: () => void;
  /** Сохранить текущий прогресс в localStorage. */
  saveNow: () => void;
  /** Полный сброс прогресса (с очисткой сейва). */
  resetProgress: () => void;
};

/** Собрать снимок сейва из состояния. */
function buildSaveData(s: GameState): SaveData {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    massMp: s.massMp,
    gameTimeSec: s.gameTimeSec,
    upgradeLevels: s.upgradeLevels,
    systems: s.systems,
    activeSystemId: s.activeSystemId,
    activePlanetId: s.activePlanetId,
    viewTier: s.viewTier,
    simTimeScale: s.simTimeScale,
    jetBuffEndsAtSimSec: s.jetBuffEndsAtSimSec,
    savedAtMs: Date.now(),
    incomeEmaMpPerSec: s.incomeEmaMpPerSec,
  };
}

function maxUnlockedViewTier(levels: UpgradeLevels): ViewTierId {
  if (!isViewTierUnlocked(1, levels)) return 0;
  if (!isViewTierUnlocked(2, levels)) return 1;
  return 2;
}

export const useGameStore = create<GameState>((set, get) => {
  const saved = loadSave();
  const systems = saved?.systems ?? generateStarSystems();
  const upgradeLevels = saved?.upgradeLevels ?? { ...ZERO_UPGRADE_LEVELS };
  const viewTierCap = maxUnlockedViewTier(upgradeLevels);
  const initialViewTier = Math.min(
    saved?.viewTier ?? 0,
    viewTierCap,
  ) as ViewTierId;

  // Оффлайн-доход: усреднённая ставка × прошедшее реальное время × 75 %, кап 12 ч.
  const OFFLINE_MIN_SEC = 60;
  const OFFLINE_CAP_SEC = 12 * 3600;
  const OFFLINE_RATE = 0.75;
  let pendingOfflineMp = 0;
  if (saved && saved.incomeEmaMpPerSec > 0) {
    const elapsedSec = Math.max(0, (Date.now() - saved.savedAtMs) / 1000);
    if (elapsedSec >= OFFLINE_MIN_SEC) {
      const capped = Math.min(elapsedSec, OFFLINE_CAP_SEC);
      pendingOfflineMp = Math.floor(
        saved.incomeEmaMpPerSec * capped * OFFLINE_RATE,
      );
    }
  }

  return {
    systems,
    activeSystemId: saved?.activeSystemId ?? systems[0]?.id ?? "",
    activePlanetId: saved?.activePlanetId ?? null,
    massMp: (saved?.massMp ?? 0) + pendingOfflineMp,
    pendingOfflineMp,
    gameTimeSec: saved?.gameTimeSec ?? 0,
    upgradeLevels,
    viewTier: initialViewTier,
    activeTab: "game",
    simTimeScale: saved?.simTimeScale ?? 1,
    mpGainFloaters: [],
    jetBuffEndsAtSimSec: saved?.jetBuffEndsAtSimSec ?? 0,
    incomeEmaMpPerSec: saved?.incomeEmaMpPerSec ?? 0,
    addMassMp: (amount) =>
    set((s) => {
      const add = Math.max(0, Math.floor(amount));
      if (add <= 0) return s;
      const id = ++mpGainFloaterIdSeq;
      return {
        massMp: s.massMp + add,
        mpGainFloaters: [...s.mpGainFloaters, { id, amount: add }],
      };
    }),
  dismissMpGainFloater: (id) =>
    set((s) => ({
      mpGainFloaters: s.mpGainFloaters.filter((e) => e.id !== id),
    })),
  setJetBuffEndsAt: (jetBuffEndsAtSimSec) => set({ jetBuffEndsAtSimSec }),
  setActiveSystem: (systemId) =>
    set((s) => {
      if (!s.systems.some((sys) => sys.id === systemId)) return s;
      return { activeSystemId: systemId, activePlanetId: null };
    }),
  advanceGameTime: (simDt) =>
    set((s) => {
      if (simDt <= 0) return s;
      return {
        gameTimeSec: s.gameTimeSec + simDt,
        systems: s.systems.map((system) => ({
          ...system,
          planets: system.planets.map((planet: Planet) =>
            tickPlanetLife(advancePlanetStages(planet, simDt), simDt),
          ),
        })),
      };
    }),
  acceleratePlanet: (systemId, planetId) =>
    set((s) => {
      const system = s.systems.find((sys) => sys.id === systemId);
      const planet = system?.planets.find((p) => p.id === planetId);
      if (!planet) return s;

      const cost = accelerationCostMp(planet);
      if (s.massMp < cost) return s;

      return {
        massMp: s.massMp - cost,
        systems: s.systems.map((sys) => {
          if (sys.id !== systemId) return sys;
          return {
            ...sys,
            planets: sys.planets.map((p: Planet) => {
              if (p.id !== planetId) return p;
              return advancePlanetStages(p, PLANET_ACCELERATION_SECONDS);
            }),
          };
        }),
      };
    }),
  setActivePlanet: (activePlanetId) => set({ activePlanetId }),
  removePlanet: (systemId, planetId) =>
    set((s) => {
      const systems = s.systems.map((sys) =>
        sys.id !== systemId
          ? sys
          : {
              ...sys,
              planets: sys.planets.filter((p: Planet) => p.id !== planetId),
            },
      );
      const ap =
        s.activePlanetId === planetId ? null : s.activePlanetId;
      return { systems, activePlanetId: ap };
    }),
  buyUpgrade: (branch) =>
    set((s) => {
      if (!canPurchaseUpgrade(s.upgradeLevels, branch, s.massMp)) return s;
      const cost = nextUpgradeCostMp(s.upgradeLevels, branch);
      const upgradeLevels = {
        ...s.upgradeLevels,
        [branch]: s.upgradeLevels[branch] + 1,
      };
      const cap = maxUnlockedViewTier(upgradeLevels);
      const viewTier =
        s.viewTier > cap ? cap : s.viewTier;
      return {
        massMp: s.massMp - cost,
        upgradeLevels,
        viewTier,
      };
    }),
  setTab: (activeTab) => set({ activeTab }),
  setViewTier: (tier) =>
    set((s) => {
      const cap = maxUnlockedViewTier(s.upgradeLevels);
      const viewTier = tier > cap ? cap : tier;
      return { viewTier };
    }),
  setSimTimeScale: (simTimeScale) => set({ simTimeScale }),
  setIncomeEma: (incomeEmaMpPerSec) => set({ incomeEmaMpPerSec }),
  clearPendingOffline: () => set({ pendingOfflineMp: 0 }),
  saveNow: () => writeSave(buildSaveData(get())),
  resetProgress: () =>
    set(() => {
      clearSave();
      const fresh = generateStarSystems();
      return {
        massMp: 0,
        gameTimeSec: 0,
        upgradeLevels: { ...ZERO_UPGRADE_LEVELS },
        systems: fresh,
        activeSystemId: fresh[0]?.id ?? "",
        activePlanetId: null,
        viewTier: 0,
        simTimeScale: 1,
        jetBuffEndsAtSimSec: 0,
        incomeEmaMpPerSec: 0,
        pendingOfflineMp: 0,
        mpGainFloaters: [],
      };
    }),
  };
});
