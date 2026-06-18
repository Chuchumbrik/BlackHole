import { useGameStore } from "../store/useGameStore";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_THEMES,
  achievementMpMul,
  themeProgress,
  type AchievementCtx,
  type AchievementTheme,
} from "../game/achievements";
import { levelSum } from "../game/upgrades";

/** Карточка одной темы: кружочки тиров + прогресс-бар до следующего. */
function ThemeCard({ t, ctx }: { t: AchievementTheme; ctx: AchievementCtx }) {
  const p = themeProgress(t, ctx);
  const allDone = p.nextAt === null;
  // Бонус, уже набранный по этой теме (произведение пройденных тиров).
  let earnedMul = 1;
  for (let i = 0; i < p.done; i++) earnedMul *= t.tiers[i].mul;
  const nextTier = allDone ? null : t.tiers[p.done];

  return (
    <li className="ach-card">
      <div className="ach-card-head">
        <span className="ach-card-name">{t.group}</span>
        <span className="ach-card-count">
          {p.done}/{p.total}
        </span>
      </div>

      <div className="ach-tiers" role="img" aria-label={`Пройдено ${p.done} из ${p.total}`}>
        {t.tiers.map((tier, i) => (
          <span
            key={tier.id}
            className={
              i < p.done
                ? "ach-dot is-done"
                : i === p.done
                  ? "ach-dot is-current"
                  : "ach-dot"
            }
            title={`${tier.name} · ${t.fmt(tier.at)} · +${Math.round((tier.mul - 1) * 100)}% MP`}
          />
        ))}
      </div>

      <p className="ach-card-bonus">
        Сейчас даёт: +{Math.round((earnedMul - 1) * 100)}% MP
      </p>

      {allDone ? (
        <p className="ach-card-progress ach-card-done">Все тиры открыты ✓</p>
      ) : (
        <>
          <div className="ach-bar">
            <div
              className="ach-bar-fill"
              style={{ width: `${Math.round(p.fraction * 100)}%` }}
            />
          </div>
          <p className="ach-card-progress">
            {t.fmt(p.value)} / {t.fmt(nextTier!.at)} → «{nextTier!.name}» (+
            {Math.round((nextTier!.mul - 1) * 100)}% MP)
          </p>
        </>
      )}
    </li>
  );
}

/** Вкладка «Достижения»: темы-карточки с тирами и прогрессом. */
export function AchievementsPanel() {
  const unlocked = useGameStore((s) => s.achievementsUnlocked);
  const massMp = useGameStore((s) => s.massMp);
  const lifetimeMassMp = useGameStore((s) => s.lifetimeMassMp);
  const massSpentTotal = useGameStore((s) => s.massSpentTotal);
  const massSpentRun = useGameStore((s) => s.massSpentRun);
  const lifetimePp = useGameStore((s) => s.lifetimePp);
  const prestigeCount = useGameStore((s) => s.prestigeCount);
  const gameTimeSec = useGameStore((s) => s.gameTimeSec);
  const upgradeLevels = useGameStore((s) => s.upgradeLevels);
  const incomeEmaMpPerSec = useGameStore((s) => s.incomeEmaMpPerSec);
  const systems = useGameStore((s) => s.systems);
  const starsSwallowed = useGameStore((s) => s.starsSwallowed);

  const allPlanets = systems.flatMap((sys) => sys.planets);
  const ctx: AchievementCtx = {
    massMp,
    lifetimeMassMp,
    massSpentTotal,
    massSpentRun,
    prestigePoints: lifetimePp,
    prestigeCount,
    gameTimeSec,
    upgradeSum: levelSum(upgradeLevels),
    upgradeLevels,
    incomeMpPerSec: incomeEmaMpPerSec,
    planetsWithLife: allPlanets.filter((p) => p.lifeBorn).length,
    maxCivLevel: allPlanets.reduce((m, p) => Math.max(m, p.civLevel), 0),
    starsSwallowed,
  };

  const mul = achievementMpMul(unlocked);

  const lifetimeThemes = ACHIEVEMENT_THEMES.filter((t) => t.scope === "lifetime");
  const runThemes = ACHIEVEMENT_THEMES.filter((t) => t.scope === "run");

  return (
    <div className="ach-panel">
      <h2 className="app-panel-title">Достижения</h2>
      <p className="ach-summary">
        Открыто {unlocked.length}/{ACHIEVEMENTS.length} · суммарный бонус дохода ×
        {mul.toFixed(2)}
      </p>

      <h3 className="ach-section-title">За всю игру</h3>
      <p className="ach-section-hint">
        Накопительные показатели — переживают сжатие.
      </p>
      <ul className="ach-card-list">
        {lifetimeThemes.map((t) => (
          <ThemeCard key={t.group} t={t} ctx={ctx} />
        ))}
      </ul>

      <h3 className="ach-section-title">За один ран</h3>
      <p className="ach-section-hint">
        Показатели текущего рана — обнуляются при сжатии (но открытые тиры
        остаются навсегда).
      </p>
      <ul className="ach-card-list">
        {runThemes.map((t) => (
          <ThemeCard key={t.group} t={t} ctx={ctx} />
        ))}
      </ul>
    </div>
  );
}
