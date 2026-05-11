import { create } from "zustand";
import {
  ZERO_UPGRADE_LEVELS,
  canPurchaseUpgrade,
  nextUpgradeCostMp,
  type UpgradeBranch,
  type UpgradeLevels,
} from "../game/upgrades";

type TabId = "game" | "upgrades" | "planet" | "prestige" | "stats";

type GameState = {
  massMp: number;
  upgradeLevels: UpgradeLevels;
  activeTab: TabId;
  addMassMp: (amount: number) => void;
  buyUpgrade: (branch: UpgradeBranch) => void;
  setTab: (tab: TabId) => void;
};

export const useGameStore = create<GameState>((set) => ({
  massMp: 0,
  upgradeLevels: { ...ZERO_UPGRADE_LEVELS },
  activeTab: "game",
  addMassMp: (amount) =>
    set((s) => ({ massMp: s.massMp + Math.max(0, Math.floor(amount)) })),
  buyUpgrade: (branch) =>
    set((s) => {
      if (!canPurchaseUpgrade(s.upgradeLevels, branch, s.massMp)) return s;
      const cost = nextUpgradeCostMp(s.upgradeLevels, branch);
      return {
        massMp: s.massMp - cost,
        upgradeLevels: {
          ...s.upgradeLevels,
          [branch]: s.upgradeLevels[branch] + 1,
        },
      };
    }),
  setTab: (activeTab) => set({ activeTab }),
}));
