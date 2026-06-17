import { useGameStore } from "../store/useGameStore";
import {
  ACHIEVEMENTS,
  achievementMpMul,
  type AchievementDef,
} from "../game/achievements";

/** Сгруппировать достижения по теме, сохраняя порядок появления групп. */
function byGroup(): { group: string; items: AchievementDef[] }[] {
  const order: string[] = [];
  const map = new Map<string, AchievementDef[]>();
  for (const a of ACHIEVEMENTS) {
    if (!map.has(a.group)) {
      map.set(a.group, []);
      order.push(a.group);
    }
    map.get(a.group)!.push(a);
  }
  return order.map((group) => ({ group, items: map.get(group)! }));
}

/** Вкладка «Достижения»: многоуровневые ачивки по темам и суммарный бонус. */
export function AchievementsPanel() {
  const unlocked = useGameStore((s) => s.achievementsUnlocked);
  const set = new Set(unlocked);
  const mul = achievementMpMul(unlocked);
  const groups = byGroup();

  return (
    <div className="ach-panel">
      <h2 className="app-panel-title">Достижения</h2>
      <p className="ach-summary">
        Открыто {unlocked.length}/{ACHIEVEMENTS.length} · суммарный бонус дохода
        ×{mul.toFixed(2)}
      </p>
      {groups.map(({ group, items }) => {
        const got = items.filter((a) => set.has(a.id)).length;
        return (
          <section key={group} className="ach-group">
            <h3 className="ach-group-title">
              {group} <span className="ach-group-count">{got}/{items.length}</span>
            </h3>
            <ul className="ach-list">
              {items.map((a) => {
                const isGot = set.has(a.id);
                return (
                  <li key={a.id} className={isGot ? "ach is-got" : "ach"}>
                    <div className="ach-head">
                      <span className="ach-name">{a.name}</span>
                      <span className="ach-mul">
                        +{Math.round((a.bonusMpMul - 1) * 100)} % MP
                      </span>
                    </div>
                    <p className="ach-desc">{a.desc}</p>
                    <span className="ach-status">
                      {isGot ? "Открыто ✓" : "Закрыто"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
