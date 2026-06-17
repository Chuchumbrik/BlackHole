import { useState } from "react";
import { useGameStore } from "../store/useGameStore";
import { prestigePpGain, PRESTIGE_SPENT_PER_PP } from "../game/prestige";
import { PRESTIGE_PERKS, perkCost, planPerkPurchase } from "../game/prestigePerks";
import {
  ENTROPY_THRESHOLD,
  canDestroyUniverse,
  ultimateMpMul,
  upFromDestruction,
  ultimateReached,
} from "../game/endgame";

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
  const lifetimePp = useGameStore((s) => s.lifetimePp);
  const universeEntropy = useGameStore((s) => s.universeEntropy);
  const ultimatePoints = useGameStore((s) => s.ultimatePoints);
  const newGamePlusCount = useGameStore((s) => s.newGamePlusCount);
  const destroyUniverse = useGameStore((s) => s.destroyUniverse);
  const [confirming, setConfirming] = useState(false);
  const [confirmingDestroy, setConfirmingDestroy] = useState(false);

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

      {(universeEntropy > 0 || ultimatePoints > 0 || newGamePlusCount > 0) && (
        <div className="prestige-endgame">
          <h3 className="prestige-perks-title">Эндшпиль</h3>
          {ultimatePoints > 0 && (
            <p className="prestige-row">
              Ultimate Points: <b>{ultimatePoints.toLocaleString("ru-RU")}</b> ·
              вечный доход ×{ultimateMpMul(ultimatePoints).toFixed(2)}
              {newGamePlusCount > 0 && <> · New Game+{newGamePlusCount}</>}
            </p>
          )}
          <p className="prestige-row">
            Энтропия вселенной: {Math.floor(universeEntropy)}/{ENTROPY_THRESHOLD}
          </p>
          <div className="ach-bar" style={{ marginBottom: 8 }}>
            <div
              className="ach-bar-fill"
              style={{
                width: `${Math.min(100, (universeEntropy / ENTROPY_THRESHOLD) * 100)}%`,
              }}
            />
          </div>
          {canDestroyUniverse(universeEntropy) ? (
            !confirmingDestroy ? (
              <button
                type="button"
                className="prestige-btn"
                onClick={() => setConfirmingDestroy(true)}
              >
                Уничтожить Вселенную (+{upFromDestruction(lifetimePp, universeEntropy)} UP)
              </button>
            ) : (
              <div className="prestige-confirm">
                <p className="app-panel-hint">
                  ВСЁ сбросится (масса, апгрейды, PP, перки, системы). Останутся
                  только Ultimate Points, достижения и журнал. Начнётся New Game+.
                </p>
                <div className="prestige-confirm-actions">
                  <button
                    type="button"
                    className="prestige-btn"
                    onClick={() => {
                      destroyUniverse();
                      setConfirmingDestroy(false);
                    }}
                  >
                    Схлопнуть всё
                  </button>
                  <button
                    type="button"
                    className="prestige-btn prestige-btn-ghost"
                    onClick={() => setConfirmingDestroy(false)}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )
          ) : (
            <p className="app-panel-hint">
              Энтропия копится с каждым сжатием. При {ENTROPY_THRESHOLD} —
              Уничтожение Вселенной ради Ultimate Points и New Game+.
            </p>
          )}
          {ultimateReached(newGamePlusCount) && (
            <p className="prestige-row" style={{ color: "#fbbf24" }}>
              ✦ Ultimate Prestige достигнут — вы прошли цикл циклов.
            </p>
          )}
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
