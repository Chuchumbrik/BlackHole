import { useEffect, useState } from "react";
import { useGameStore } from "../store/useGameStore";
import { playSupernova } from "../game/audio/sound";
import {
  SUPERNOVA_ENERGY_COST,
  SUPERNOVA_COOLDOWN_SEC,
  supernovaMpMult,
} from "../game/balance";

/**
 * Экранная панель быстрого доступа к активным скиллам (item 17). Сейчас — только
 * «Сверхновая»: появляется, когда скилл куплен (supernovaLevel ≥ 1). Кнопка
 * показывает готовность/перезарядку и запускает способность.
 */
export function SkillBar() {
  const level = useGameStore((s) => s.supernovaLevel);
  const energy = useGameStore((s) => s.energy);
  const readyAtMs = useGameStore((s) => s.supernovaReadyAtMs);
  const trigger = useGameStore((s) => s.triggerSupernova);

  // Тикер раз в 250 мс — плавный обратный отсчёт перезарядки.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, []);

  if (level < 1) return null;

  const cooldownLeftSec = Math.max(0, Math.ceil((readyAtMs - Date.now()) / 1000));
  const onCooldown = cooldownLeftSec > 0;
  const lowEnergy = energy < SUPERNOVA_ENERGY_COST;
  const canFire = !onCooldown && !lowEnergy;
  const cooldownPct = onCooldown
    ? 1 - cooldownLeftSec / SUPERNOVA_COOLDOWN_SEC
    : 1;
  const mult = supernovaMpMult(level);

  const status = onCooldown
    ? `${cooldownLeftSec} с`
    : lowEnergy
      ? `нужно ${SUPERNOVA_ENERGY_COST}⚡`
      : "готова";

  return (
    <div className="skillbar" aria-label="Скиллы">
      <button
        type="button"
        className={`skillbar-btn${canFire ? " is-ready" : ""}`}
        disabled={!canFire}
        onClick={() => {
          if (trigger()) playSupernova();
        }}
        title={`Сверхновая (ур. ${level}): всплеск материи + ×${mult.toFixed(
          2,
        )} к добыче MP на время. Стоит ${SUPERNOVA_ENERGY_COST} импульса, перезарядка ${Math.round(
          SUPERNOVA_COOLDOWN_SEC / 60,
        )} мин.`}
      >
        <span className="skillbar-icon">☀</span>
        <span className="skillbar-meta">
          <span className="skillbar-name">Сверхновая</span>
          <span className="skillbar-status">{status}</span>
        </span>
        <span className="skillbar-lvl">×{mult.toFixed(2)}</span>
        <span
          className="skillbar-cooldown"
          style={{ transform: `scaleX(${cooldownPct})` }}
        />
      </button>
    </div>
  );
}
