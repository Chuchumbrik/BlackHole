import { useState } from "react";
import { useGameStore } from "../store/useGameStore";
import { ppFromMass, PRESTIGE_THRESHOLD_MP } from "../game/prestige";

/** Вкладка «Престиж»: коллапс рана ради очков престижа (PP). */
export function PrestigePanel() {
  const massMp = useGameStore((s) => s.massMp);
  const prestigePoints = useGameStore((s) => s.prestigePoints);
  const doPrestige = useGameStore((s) => s.doPrestige);
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
    </div>
  );
}
