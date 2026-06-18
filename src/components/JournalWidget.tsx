import { useGameStore } from "../store/useGameStore";
import { JOURNAL_CATEGORY_COLOR } from "../game/journal";

/** Компактный журнал в правом нижнем углу — последние записи всегда на виду. */
export function JournalWidget() {
  const entries = useGameStore((s) => s.journalEntries);
  const setTab = useGameStore((s) => s.setTab);
  const recent = entries.slice(0, 4);
  if (recent.length === 0) return null;
  return (
    <button
      type="button"
      className="journal-widget"
      onClick={() => setTab("journal")}
      title="Открыть Космический журнал"
    >
      <span className="journal-widget-title">Космический журнал</span>
      <ul className="journal-widget-list">
        {recent.map((e) => (
          <li key={e.id} className="journal-widget-entry">
            <span
              className="journal-widget-dot"
              style={{ background: JOURNAL_CATEGORY_COLOR[e.category] }}
            />
            <span className="journal-widget-text">{e.text}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}
