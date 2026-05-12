import { useTranslation } from "react-i18next";
import {
  useGameStore,
  type SimTimeScale,
} from "../store/useGameStore";

const SPEEDS: SimTimeScale[] = [0, 1, 2, 3, 5, 10];

export function TimeScaleControls() {
  const { t } = useTranslation();
  const simTimeScale = useGameStore((s) => s.simTimeScale);
  const setSimTimeScale = useGameStore((s) => s.setSimTimeScale);

  const label = (scale: SimTimeScale) =>
    scale === 0 ? t("timeScale.pause") : t(`timeScale.x${scale}`);

  return (
    <div
      className="time-scale-controls"
      role="group"
      aria-label={t("timeScale.groupLabel")}
    >
      {SPEEDS.map((scale) => (
        <button
          key={scale}
          type="button"
          className={simTimeScale === scale ? "is-active" : undefined}
          onClick={() => setSimTimeScale(scale)}
        >
          {label(scale)}
        </button>
      ))}
    </div>
  );
}
