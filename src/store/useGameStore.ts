import { create } from "zustand";
import {
  ZERO_UPGRADE_LEVELS,
  canPurchaseUpgrade,
  isViewTierUnlocked,
  nextUpgradeCostMp,
  type UpgradeBranch,
  type UpgradeLevels,
} from "../game/upgrades";

type TabId = "game" | "upgrades" | "planet" | "prestige" | "stats";

export type ViewTierId = 0 | 1 | 2;

/** Множитель времени симуляции: 0 — пауза, иначе ускорение относительно реального времени. */
export type SimTimeScale = 0 | 1 | 2 | 3 | 5;

export type MpGainFloaterEvent = { id: number; amount: number };

let mpGainFloaterIdSeq = 0;

type GameState = {
  massMp: number;
  upgradeLevels: UpgradeLevels;
  /** Масштаб вида: у дыры / звёздная система / карта галактики (узлы). */
  viewTier: ViewTierId;
  activeTab: TabId;
  /** Скорость игрового времени (пауза / ×1 / ×2 / ×3 / ×5). */
  simTimeScale: SimTimeScale;
  /** Активные всплывающие подсказки «+MP» к счётчику (очищаются после анимации). */
  mpGainFloaters: MpGainFloaterEvent[];
  /** Игровое время окончания баффа джетов (сек); 0 — нет активного баффа. */
  jetBuffEndsAtSimSec: number;
  addMassMp: (amount: number) => void;
  dismissMpGainFloater: (id: number) => void;
  buyUpgrade: (branch: UpgradeBranch) => void;
  setJetBuffEndsAt: (simSec: number) => void;
  setTab: (tab: TabId) => void;
  setViewTier: (tier: ViewTierId) => void;
  setSimTimeScale: (scale: SimTimeScale) => void;
};

function maxUnlockedViewTier(levels: UpgradeLevels): ViewTierId {
  if (!isViewTierUnlocked(1, levels)) return 0;
  if (!isViewTierUnlocked(2, levels)) return 1;
  return 2;
}

export const useGameStore = create<GameState>((set) => ({
  massMp: 0,
  upgradeLevels: { ...ZERO_UPGRADE_LEVELS },
  viewTier: 0,
  activeTab: "game",
  simTimeScale: 1,
  mpGainFloaters: [],
  jetBuffEndsAtSimSec: 0,
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
}));
