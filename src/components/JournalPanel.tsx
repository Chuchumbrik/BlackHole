import { useGameStore } from "../store/useGameStore";
import {
  JOURNAL_CATEGORY_COLOR,
  JOURNAL_CATEGORY_LABEL,
  type JournalEntry,
} from "../game/journal";

/** Свежих записей показываем заметно, остальное — в «Архиве». */
const RECENT_COUNT = 9;

function Row({ e }: { e: JournalEntry }) {
  return (
    <li className="journal-entry">
      <span
        className="journal-cat"
        style={{
          color: JOURNAL_CATEGORY_COLOR[e.category],
          borderColor: JOURNAL_CATEGORY_COLOR[e.category],
        }}
      >
        {JOURNAL_CATEGORY_LABEL[e.category]}
      </span>
      <span className="journal-text">{e.text}</span>
    </li>
  );
}

export function JournalPanel() {
  const entries = useGameStore((s) => s.journalEntries);
  const recent = entries.slice(0, RECENT_COUNT);
  const archive = entries.slice(RECENT_COUNT);

  return (
    <div className="journal-panel">
      <h2 className="upgrades-panel-title">Космический журнал</h2>
      <p className="upgrades-panel-meta">
        Летопись существования дыры — открытия, риски, вехи.
      </p>
      {entries.length === 0 ? (
        <p className="journal-empty">Пока ничего не записано.</p>
      ) : (
        <ul className="journal-list">
          {recent.map((e) => (
            <Row key={e.id} e={e} />
          ))}
        </ul>
      )}
      {archive.length > 0 && (
        <>
          <h3 className="upgrades-extra-title">Архив ({archive.length})</h3>
          <ul className="journal-list journal-archive">
            {archive.map((e) => (
              <Row key={e.id} e={e} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
