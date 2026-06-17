import { useTranslation } from "react-i18next";
import {
  SHIPS_UNLOCK_MIN_SUM,
  VIEW_TIER_GALAXY_MIN_SUM,
  VIEW_TIER_SYSTEM_MIN_SUM,
} from "../game/balance";
import { areShipsUnlocked, isViewTierUnlocked } from "../game/upgrades";
import {
  useGameStore,
  type ViewTierId,
} from "../store/useGameStore";

export function ViewScaleControls() {
  const { t } = useTranslation();
  const upgradeLevels = useGameStore((s) => s.upgradeLevels);
  const viewTier = useGameStore((s) => s.viewTier);
  const setViewTier = useGameStore((s) => s.setViewTier);

  const sum =
    upgradeLevels.size +
    upgradeLevels.gravity +
    upgradeLevels.disk +
    upgradeLevels.efficiency;

  const tier1Ok = isViewTierUnlocked(1, upgradeLevels);
  const tier2Ok = isViewTierUnlocked(2, upgradeLevels);

  const select = (tier: ViewTierId) => {
    setViewTier(tier);
  };

  return (
    <div className="view-tier-controls" role="group" aria-label={t("viewTier.groupLabel")}>
      <button
        type="button"
        className={viewTier === 0 ? "is-active" : undefined}
        onClick={() => select(0)}
        title="Крупный план чёрной дыры — видно горизонт, диск и захват материи"
      >
        {t("viewTier.local")}
      </button>
      <button
        type="button"
        className={viewTier === 1 ? "is-active" : undefined}
        onClick={() => select(1)}
        disabled={!tier1Ok}
        title={
          tier1Ok
            ? "Вид всей звёздной системы — звезда, планеты и дыра в одном кадре"
            : t("viewTier.lockSystem", { need: VIEW_TIER_SYSTEM_MIN_SUM, sum })
        }
      >
        {t("viewTier.system")}
      </button>
      <button
        type="button"
        className={viewTier === 2 ? "is-active" : undefined}
        onClick={() => select(2)}
        disabled={!tier2Ok}
        title={
          tier2Ok
            ? "Карта галактики — переключение между звёздными системами"
            : t("viewTier.lockGalaxy", { need: VIEW_TIER_GALAXY_MIN_SUM, sum })
        }
      >
        {t("viewTier.galaxy")}
      </button>
      {areShipsUnlocked(upgradeLevels) ? (
        <span className="view-tier-hint">{t("viewTier.shipsActive")}</span>
      ) : (
        <span className="view-tier-hint view-tier-hint-muted">
          {t("viewTier.shipsLocked", { need: SHIPS_UNLOCK_MIN_SUM, sum })}
        </span>
      )}
    </div>
  );
}
