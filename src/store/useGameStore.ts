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

type GameState = {
  massMp: number;
  upgradeLevels: UpgradeLevels;
  /** Масштаб вида: у дыры / звёздная система / карта галактики (узлы). */
  viewTier: ViewTierId;
  activeTab: TabId;
  addMassMp: (amount: number) => void;
  buyUpgrade: (branch: UpgradeBranch) => void;
  setTab: (tab: TabId) => void;
  setViewTier: (tier: ViewTierId) => void;
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
  addMassMp: (amount) =>
    set((s) => ({ massMp: s.massMp + Math.max(0, Math.floor(amount)) })),
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
}));
