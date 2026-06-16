import { useState } from "react";
import { useGameStore } from "../store/useGameStore";
import { ppFromMass, PRESTIGE_THRESHOLD_MP } from "../game/prestige";
import { PRESTIGE_PERKS, perkCost } from "../game/prestigePerks";

/** Вкладка «Престиж»: коллапс рана ради очков престижа (PP). */
export function PrestigePanel() {
  const massMp = useGameStore((s) => s.massMp);
  const prestigePoints = useGameStore((s) => s.prestigePoints);
  const prestigePerkLevels = useGameStore((s) => s.prestigePerkLevels);
  const doPrestige = useGameStore((s) => s.doPrestige);
  const buyPrestigePerk = useGameStore((s) => s.buyPrestigePerk);
  const [confirming, setConfirming] = useState(false);

  const gain = ppFromMass(massMp);
  const canPrestige = gain > 0;

  return (
    <div className="prestige-panel">
      <h2 className="app-panel-title">Престиж — Сжатие</h2>
      <p className="prestige-pp">
        Очки престижа: <b>{prestigePoints.toLocaleString("ru-RU")} PP</b>
      </p>
      <p className="prestige-row">
        Текущая масса: {massMp.toLocaleString("ru-RU")} MP
      </p>
      <p className="prestige-row">
        Сжатие даст: <b>{gain.toLocaleString("ru-RU")} PP</b>
      </p>

      {!canPrestige && (
        <p className="app-panel-hint">
          Нужно накопить ≥ {PRESTIGE_THRESHOLD_MP.toLocaleString("ru-RU")} MP,
          чтобы сжать вселенную.
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
        {PRESTIGE_PERKS.map((perk) => {
          const lvl = prestigePerkLevels[perk.id] ?? 0;
          const maxed = lvl >= perk.maxLevel;
          const cost = perkCost(perk, lvl);
          const affordable = prestigePoints >= cost;
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
                  className="prestige-btn prestige-perk-buy"
                  disabled={!affordable}
                  onClick={() => buyPrestigePerk(perk.id)}
                >
                  Купить · {cost} PP
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
