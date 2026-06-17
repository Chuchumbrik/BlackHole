import { create } from "zustand";
import {
  PLANET_ACCELERATION_SECONDS,
  PLANET_GOLDEN_MID,
  PLANET_TERRAFORM_STEP,
  PLANET_TERRAFORM_COST_MP,
  PLANET_SHIELD_DURATION_SEC,
  PLANET_SHIELD_COST_MP,
} from "../game/balance";
import {
  ZERO_UPGRADE_LEVELS,
  canPurchaseUpgrade,
  isViewTierUnlocked,
  nextUpgradeCostMp,
  type UpgradeBranch,
  type UpgradeLevels,
} from "../game/upgrades";
import { generateStarSystems } from "../game/world/generation";
import { ppFromMass } from "../game/prestige";
import { PRESTIGE_PERKS, perkCost, prestigeRunStart } from "../game/prestigePerks";
import { MP_UPGRADES, mpUpgradeCost } from "../game/mpUpgrades";
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
  /** Накопленные очки престижа (между ранами). */
  prestigePoints: number;
  /** Суммарно заработанные PP за всё время (для достижений; не тратится, не сбрасывается). */
  lifetimePp: number;
  /** Уровни перков престижа по id. */
  prestigePerkLevels: Record<string, number>;
  /** Уровни data-driven MP-апгрейдов по id (ран-скоуп, сброс при сжатии). */
  mpUpgradeLevels: Record<string, number>;
  /** Открытые достижения (постоянные, переживают сжатие). */
  achievementsUnlocked: string[];
  /** Имя только что открытого достижения для тоста; null — нет. */
  achievementToast: string | null;
  /** Имя активного периодического события (баннер); null — нет. */
  activeEventName: string | null;
  /** Счётчик-сигнал коллапса prestige (для полноэкранной вспышки). */
  prestigeFlash: number;
  addMassMp: (amount: number) => void;
  dismissMpGainFloater: (id: number) => void;
  buyUpgrade: (branch: UpgradeBranch, count?: number) => void;
  setJetBuffEndsAt: (simSec: number) => void;
  setActiveSystem: (systemId: string) => void;
  advanceGameTime: (simDt: number) => void;
  acceleratePlanet: (systemId: string, planetId: string) => void;
  activePlanetId: string | null;
  setActivePlanet: (planetId: string | null) => void;
  removePlanet: (systemId: string, planetId: string) => void;
  /** Откат развития планеты от удара астероида (снижает прогресс/жизнь/выход MP). */
  damagePlanet: (systemId: string, planetId: string) => void;
  /** Терраформинг: подвинуть параметры планеты к золотой середине (за MP). */
  terraformPlanet: (systemId: string, planetId: string) => void;
  /** Щит планеты от ударов на время (за MP). */
  shieldPlanet: (systemId: string, planetId: string) => void;
  setTab: (tab: TabId) => void;
  setViewTier: (tier: ViewTierId) => void;
  setSimTimeScale: (scale: SimTimeScale) => void;
  /** Записать сглаженную ставку дохода (из игрового цикла). */
  setIncomeEma: (mpPerSec: number) => void;
  /** Закрыть окно оффлайн-дохода. */
  clearPendingOffline: () => void;
  /** Сжатие: начислить PP по текущей массе и начать новый ран. */
  doPrestige: () => void;
  /** Купить уровень перка престижа за PP. */
  buyPrestigePerk: (id: string, count?: number) => void;
  /** Купить уровень MP-апгрейда за MP. */
  buyMpUpgrade: (id: string, count?: number) => void;
  /** Кратность покупки (×1/2/5/10), общая для панелей. Не персистится. */
  buyMultiplier: number;
  setBuyMultiplier: (m: number) => void;
  /** Открыть достижение (если ещё не открыто) и показать тост. */
  unlockAchievement: (id: string, name: string) => void;
  clearAchievementToast: () => void;
  /** Установить/снять активное событие (для баннера). */
  setActiveEvent: (name: string | null) => void;
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
    prestigePoints: s.prestigePoints,
    lifetimePp: s.lifetimePp,
    prestigePerkLevels: s.prestigePerkLevels,
    mpUpgradeLevels: s.mpUpgradeLevels,
    achievementsUnlocked: s.achievementsUnlocked,
  };
}

function maxUnlockedViewTier(levels: UpgradeLevels): ViewTierId {
  if (!isViewTierUnlocked(1, levels)) return 0;
  if (!isViewTierUnlocked(2, levels)) return 1;
  return 2;
}

export const useGameStore = create<GameState>((set, get) => {
  const saved = loadSave();
  const systems =
    saved?.systems && saved.systems.length > 0
      ? saved.systems
      : generateStarSystems();
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
    prestigePoints: saved?.prestigePoints ?? 0,
    lifetimePp: saved?.lifetimePp ?? saved?.prestigePoints ?? 0,
    prestigePerkLevels: saved?.prestigePerkLevels ?? {},
    mpUpgradeLevels: saved?.mpUpgradeLevels ?? {},
    achievementsUnlocked: saved?.achievementsUnlocked ?? [],
    achievementToast: null,
    activeEventName: null,
    prestigeFlash: 0,
    buyMultiplier: 1,
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
      // Развиваем жизнь/стадии только в АКТИВНОЙ системе: фоновые не растут и не
      // истощаются «вслепую» (иначе цивилизации фоновых систем выжимались без дани).
      return {
        gameTimeSec: s.gameTimeSec + simDt,
        systems: s.systems.map((system) =>
          system.id !== s.activeSystemId
            ? system
            : {
                ...system,
                planets: system.planets.map((planet: Planet) =>
                  tickPlanetLife(advancePlanetStages(planet, simDt), simDt),
                ),
              },
        ),
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
              // Ускорение двигает и стадии, и жизнь/цивилизацию (петля «жизнь→дань»).
              return tickPlanetLife(
                advancePlanetStages(p, PLANET_ACCELERATION_SECONDS),
                PLANET_ACCELERATION_SECONDS,
              );
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
  damagePlanet: (systemId, planetId) =>
    set((s) => ({
      systems: s.systems.map((sys) => {
        if (sys.id !== systemId) return sys;
        return {
          ...sys,
          planets: sys.planets.map((p: Planet) => {
            // Щит поглощает удар без отката.
            if (p.id !== planetId || p.shieldUntilSec > s.gameTimeSec) return p;
            return {
              ...p,
              stageProgressSec: Math.max(0, p.stageProgressSec - 8),
              lifeEmergenceSec: Math.max(0, p.lifeEmergenceSec - 20),
              mpYieldMult: Math.max(0.3, p.mpYieldMult * 0.95),
            };
          }),
        };
      }),
    })),
  terraformPlanet: (systemId, planetId) =>
    set((s) => {
      if (s.massMp < PLANET_TERRAFORM_COST_MP) return s;
      const nudge = (v: number) => {
        if (v < PLANET_GOLDEN_MID)
          return Math.min(PLANET_GOLDEN_MID, v + PLANET_TERRAFORM_STEP);
        return Math.max(PLANET_GOLDEN_MID, v - PLANET_TERRAFORM_STEP);
      };
      let touched = false;
      const systems = s.systems.map((sys) => {
        if (sys.id !== systemId) return sys;
        return {
          ...sys,
          planets: sys.planets.map((p: Planet) => {
            if (p.id !== planetId) return p;
            touched = true;
            return {
              ...p,
              orbitalDistance: nudge(p.orbitalDistance),
              gravityProxy: nudge(p.gravityProxy),
              surfaceTemperature: nudge(p.surfaceTemperature),
              atmosphere: nudge(p.atmosphere),
              hydrosphere: nudge(p.hydrosphere),
              geologicalActivity: nudge(p.geologicalActivity),
            };
          }),
        };
      });
      if (!touched) return s;
      return { systems, massMp: s.massMp - PLANET_TERRAFORM_COST_MP };
    }),
  shieldPlanet: (systemId, planetId) =>
    set((s) => {
      if (s.massMp < PLANET_SHIELD_COST_MP) return s;
      let touched = false;
      const systems = s.systems.map((sys) => {
        if (sys.id !== systemId) return sys;
        return {
          ...sys,
          planets: sys.planets.map((p: Planet) => {
            if (p.id !== planetId) return p;
            touched = true;
            return {
              ...p,
              shieldUntilSec: s.gameTimeSec + PLANET_SHIELD_DURATION_SEC,
            };
          }),
        };
      });
      if (!touched) return s;
      return { systems, massMp: s.massMp - PLANET_SHIELD_COST_MP };
    }),
  buyUpgrade: (branch, count = 1) =>
    set((s) => {
      let mass = s.massMp;
      const upgradeLevels = { ...s.upgradeLevels };
      let bought = 0;
      for (let i = 0; i < count; i++) {
        if (!canPurchaseUpgrade(upgradeLevels, branch, mass)) break;
        mass -= nextUpgradeCostMp(upgradeLevels, branch);
        upgradeLevels[branch] += 1;
        bought++;
      }
      if (bought === 0) return s;
      const cap = maxUnlockedViewTier(upgradeLevels);
      const viewTier = s.viewTier > cap ? cap : s.viewTier;
      return { massMp: mass, upgradeLevels, viewTier };
    }),
  setTab: (activeTab) => set({ activeTab }),
  setViewTier: (tier) =>
    set((s) => {
      const cap = maxUnlockedViewTier(s.upgradeLevels);
      const viewTier = tier > cap ? cap : tier;
      return { viewTier };
    }),
  setSimTimeScale: (simTimeScale) => set({ simTimeScale }),
  setBuyMultiplier: (buyMultiplier) => set({ buyMultiplier }),
  unlockAchievement: (id, name) =>
    set((s) => {
      if (s.achievementsUnlocked.includes(id)) return s;
      return {
        achievementsUnlocked: [...s.achievementsUnlocked, id],
        achievementToast: name,
      };
    }),
  clearAchievementToast: () => set({ achievementToast: null }),
  setActiveEvent: (activeEventName) => set({ activeEventName }),
  setIncomeEma: (incomeEmaMpPerSec) => set({ incomeEmaMpPerSec }),
  clearPendingOffline: () => set({ pendingOfflineMp: 0 }),
  doPrestige: () =>
    set((s) => {
      const gain = ppFromMass(s.massMp);
      if (gain <= 0) return s;
      const rs = prestigeRunStart(s.prestigePerkLevels);
      const fresh = generateStarSystems(rs.extraPlanets);
      return {
        prestigePoints: s.prestigePoints + gain,
        lifetimePp: s.lifetimePp + gain,
        prestigeFlash: s.prestigeFlash + 1,
        massMp: rs.startMassMp,
        upgradeLevels: { ...ZERO_UPGRADE_LEVELS },
        systems: fresh,
        activeSystemId: fresh[0]?.id ?? "",
        activePlanetId: null,
        viewTier: 0,
        gameTimeSec: 0,
        jetBuffEndsAtSimSec: 0,
        incomeEmaMpPerSec: 0,
        pendingOfflineMp: 0,
        mpUpgradeLevels: {},
        mpGainFloaters: [],
      };
    }),
  buyPrestigePerk: (id, count = 1) =>
    set((s) => {
      const def = PRESTIGE_PERKS.find((p) => p.id === id);
      if (!def) return s;
      let pp = s.prestigePoints;
      let lvl = s.prestigePerkLevels[id] ?? 0;
      let bought = 0;
      for (let i = 0; i < count && lvl < def.maxLevel; i++) {
        const cost = perkCost(def, lvl);
        if (pp < cost) break;
        pp -= cost;
        lvl++;
        bought++;
      }
      if (bought === 0) return s;
      return {
        prestigePoints: pp,
        prestigePerkLevels: { ...s.prestigePerkLevels, [id]: lvl },
      };
    }),
  buyMpUpgrade: (id, count = 1) =>
    set((s) => {
      const def = MP_UPGRADES.find((u) => u.id === id);
      if (!def) return s;
      let mass = s.massMp;
      let lvl = s.mpUpgradeLevels[id] ?? 0;
      let bought = 0;
      for (let i = 0; i < count && lvl < def.maxLevel; i++) {
        const cost = mpUpgradeCost(def, lvl);
        if (mass < cost) break;
        mass -= cost;
        lvl++;
        bought++;
      }
      if (bought === 0) return s;
      return {
        massMp: mass,
        mpUpgradeLevels: { ...s.mpUpgradeLevels, [id]: lvl },
      };
    }),
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
        prestigePoints: 0,
        lifetimePp: 0,
        prestigePerkLevels: {},
        mpUpgradeLevels: {},
        achievementsUnlocked: [],
        achievementToast: null,
        mpGainFloaters: [],
      };
    }),
  };
});
