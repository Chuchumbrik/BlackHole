import { create } from "zustand";

type TabId = "game" | "upgrades" | "planet" | "prestige" | "stats";

type GameState = {
  massMp: number;
  activeTab: TabId;
  addMassMp: (amount: number) => void;
  setTab: (tab: TabId) => void;
};

export const useGameStore = create<GameState>((set) => ({
  massMp: 0,
  activeTab: "game",
  addMassMp: (amount) =>
    set((s) => ({ massMp: s.massMp + Math.max(0, Math.floor(amount)) })),
  setTab: (activeTab) => set({ activeTab }),
}));
