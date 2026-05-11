import { create } from "zustand";

type TabId = "game" | "upgrades" | "planet" | "prestige" | "stats";

type GameState = {
  massMp: number;
  activeTab: TabId;
  tickMass: () => void;
  setTab: (tab: TabId) => void;
};

/** Заглушка экономики для проверки связки UI ↔ состояние (позже заменить симуляцией). */
export const useGameStore = create<GameState>((set) => ({
  massMp: 0,
  activeTab: "game",
  tickMass: () => set((s) => ({ massMp: s.massMp + 1 })),
  setTab: (activeTab) => set({ activeTab }),
}));
