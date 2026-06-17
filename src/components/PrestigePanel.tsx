import { useState } from "react";
import { useGameStore } from "../store/useGameStore";
import { prestigePpGain, PRESTIGE_SPENT_PER_PP } from "../game/prestige";
import { PRESTIGE_PERKS, perkCost, planPerkPurchase } from "../game/prestigePerks";

/** Вкладка «Престиж»: коллапс рана ради очков престижа (PP). */
export function PrestigePanel() {
  const massSpentRun = useGameStore((s) => s.massSpentRun);
  const massMp = useGameStore((s) => s.massMp);
  const prestigePoints = useGameStore((s) => s.prestigePoints);
  const prestigePerkLevels = useGameStore((s) => s.prestigePerkLevels);
  const doPrestige = useGameStore((s) => s.doPrestige);
  const buyPrestigePerk = useGameStore((s) => s.buyPrestigePerk);
  const buyMultiplier = useGameStore((s) => s.buyMultiplier);
  const setBuyMultiplier = useGameStore((s) => s.setBuyMultiplier);
  const [confirming, setConfirming] = useState(false);

  // База PP = потрачено за ран + текущее наличие массы.
  const basis = massSpentRun + massMp;
  const gain = prestigePpGain(massSpentRun, massMp);
  const canPrestige = gain > 0;
  // При какой массе-базе откроется следующий PP (для подсказки прогресса).
  const nextPpAt = (gain + 1) * (gain + 1) * PRESTIGE_SPENT_PER_PP;

  return (
    <div className="prestige-panel">
      <h2 className="app-panel-title">Престиж — Сжатие</h2>
      <p className="prestige-pp">
        Очки престижа: <b>{prestigePoints.toLocaleString("ru-RU")} PP</b>
      </p>
      <p className="prestige-row">
        База массы: {basis.toLocaleString("ru-RU")} MP (потрачено{" "}
        {massSpentRun.toLocaleString("ru-RU")} + наличие{" "}
        {massMp.toLocaleString("ru-RU")})
      </p>
      <p className="prestige-row">
        Сжатие даст: <b>{gain.toLocaleString("ru-RU")} PP</b>
        {" · "}следующее PP при {nextPpAt.toLocaleString("ru-RU")} MP
      </p>

      {!canPrestige && (
        <p className="app-panel-hint">
          PP начисляется за массу-базу = <b>потрачено за ран + наличие</b>. Нужно
          набрать ≥ {PRESTIGE_SPENT_PER_PP.toLocaleString("ru-RU")} MP базы, чтобы
          сжать вселенную.
        </p>
      )}

      {canPrestige && !confirming && (
        <button
          type="button"
          className="prestige-btn"
          onClick={() => setConfirming(true)}
        >
          Сжать вселенную
        </button>
      )}

      {canPrestige && confirming && (
        <div className="prestige-confirm">
          <p className="app-panel-hint">
            Масса, апгрейды и текущие системы сбросятся. PP и перки останутся.
          </p>
          <div className="prestige-confirm-actions">
            <button
              type="button"
              className="prestige-btn"
              onClick={() => {
                doPrestige();
                setConfirming(false);
              }}
            >
              Сжать (+{gain} PP)
            </button>
            <button
              type="button"
              className="prestige-btn prestige-btn-ghost"
              onClick={() => setConfirming(false)}
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      <div className="prestige-perks">
        <h3 className="prestige-perks-title">Перки престижа</h3>
        <div className="buy-mult">
          <span className="buy-mult-label">Покупать:</span>
          {[1, 2, 5, 10].map((m) => (
            <button
              key={m}
              type="button"
              className={buyMultiplier === m ? "is-active" : undefined}
              onClick={() => setBuyMultiplier(m)}
            >
              ×{m}
            </button>
          ))}
        </div>
        {PRESTIGE_PERKS.map((perk) => {
          const lvl = prestigePerkLevels[perk.id] ?? 0;
          const maxed = lvl >= perk.maxLevel;
          const plan = planPerkPurchase(
            perk,
            lvl,
            prestigePoints,
            buyMultiplier,
          );
          const affordable = plan.count > 0;
          const capped = affordable && plan.count < buyMultiplier;
          const nextCost = perkCost(perk, lvl);
          return (
            <div key={perk.id} className="prestige-perk">
              <div className="prestige-perk-head">
                <span className="prestige-perk-name">{perk.name}</span>
                <span className="prestige-perk-lvl">
                  Ур. {lvl}/{perk.maxLevel}
                </span>
              </div>
              <p className="prestige-perk-desc">{perk.desc}</p>
              {maxed ? (
                <span className="prestige-perk-max">Максимум</span>
              ) : (
                <button
                  type="button"
                  className="upgrades-buy prestige-perk-buy"
                  disabled={!affordable}
                  onClick={() => buyPrestigePerk(perk.id, buyMultiplier)}
                >
                  {buyMultiplier === 1 || !affordable
                    ? `Купить · ${nextCost} PP`
                    : capped
                      ? `Купить ×${plan.count} (макс.) · ${plan.totalCost} PP`
                      : `Купить ×${plan.count} · ${plan.totalCost} PP`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
