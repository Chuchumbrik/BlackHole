import { describe, it, expect } from "vitest";
import { SAVE_KEY, SAVE_SCHEMA_VERSION } from "../game/save/saveGame";
import { ZERO_UPGRADE_LEVELS } from "../game/upgrades";

/**
 * Регрессия: после загрузки сейва счётчик id журнала должен продолжаться с
 * максимума сохранённых записей, а не стартовать заново с 1. Иначе новые записи
 * коллизируют по id с восстановленными (React: «two children with the same key»).
 */
describe("journal id seeding from save", () => {
  it("new entries get ids unique vs restored ones", async () => {
    const save = {
      schemaVersion: SAVE_SCHEMA_VERSION,
      systems: [{ id: "s1", planets: [] }],
      upgradeLevels: { ...ZERO_UPGRADE_LEVELS },
      // Низкие id (как у сейва из сессии, где счётчик стартовал с 0): без посева
      // новые записи стартуют с 1 и коллизируют именно с этими.
      journalEntries: [
        { id: 3, timeSec: 0, category: "milestone", text: "restored-3" },
        { id: 2, timeSec: 0, category: "lore", text: "restored-2" },
        { id: 1, timeSec: 0, category: "discovery", text: "restored-1" },
      ],
      incomeEmaMpPerSec: 0,
      savedAtMs: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));

    // Свежий импорт стора → срабатывает посев journalIdSeq из сейва.
    const { useGameStore } = await import("./useGameStore");
    const before = useGameStore.getState().journalEntries.map((e) => e.id);
    expect(before).toEqual([3, 2, 1]);

    useGameStore.getState().addJournalEntry("milestone", "fresh-1");
    useGameStore.getState().addJournalEntry("milestone", "fresh-2");
    const ids = useGameStore.getState().journalEntries.map((e) => e.id);

    // Все id уникальны и новые больше прежнего максимума.
    expect(new Set(ids).size).toBe(ids.length);
    expect(Math.max(...ids)).toBeGreaterThan(3);
  });
});
