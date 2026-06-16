import { useGameStore } from "../store/useGameStore";
import { ACHIEVEMENTS, achievementMpMul } from "../game/achievements";

/** Вкладка «Статистика»: список достижений и суммарный бонус. */
export function AchievementsPanel() {
  const unlocked = useGameStore((s) => s.achievementsUnlocked);
  const set = new Set(unlocked);
  const mul = achievementMpMul(unlocked);

  return (
    <div className="ach-panel">
      <h2 className="app-panel-title">Достижения</h2>
      <p className="ach-summary">
        Открыто {unlocked.length}/{ACHIEVEMENTS.length} · суммарный бонус дохода
        ×{mul.toFixed(2)}
      </p>
      <ul className="ach-list">
        {ACHIEVEMENTS.map((a) => {
          const got = set.has(a.id);
          return (
            <li key={a.id} className={got ? "ach is-got" : "ach"}>
              <div className="ach-head">
                <span className="ach-name">{a.name}</span>
                <span className="ach-mul">
                  +{Math.round((a.bonusMpMul - 1) * 100)} % MP
                </span>
              </div>
              <p className="ach-desc">{a.desc}</p>
              <span className="ach-status">{got ? "Открыто ✓" : "Закрыто"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
