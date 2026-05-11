import { useTranslation } from "react-i18next";
import {
  UPGRADE_BRANCHES,
  isDiskUnlocked,
  isEfficiencyUnlocked,
  levelSum,
  nextUpgradeCostMp,
  canPurchaseUpgrade,
} from "../game/upgrades";
import { useGameStore } from "../store/useGameStore";

export function UpgradesPanel() {
  const { t } = useTranslation();
  const massMp = useGameStore((s) => s.massMp);
  const upgradeLevels = useGameStore((s) => s.upgradeLevels);
  const buyUpgrade = useGameStore((s) => s.buyUpgrade);
  const sum = levelSum(upgradeLevels);

  return (
    <div className="upgrades-panel">
      <h2 className="upgrades-panel-title">{t("upgrades.title")}</h2>
      <p className="upgrades-panel-meta">
        {t("upgrades.holeLevel", { value: sum.toLocaleString("ru-RU") })}
      </p>
      <ul className="upgrades-card-list">
        {UPGRADE_BRANCHES.map((branch) => {
          const level = upgradeLevels[branch];
          const cost = nextUpgradeCostMp(upgradeLevels, branch);
          const locked =
            (branch === "disk" && !isDiskUnlocked(upgradeLevels)) ||
            (branch === "efficiency" &&
              !isEfficiencyUnlocked(upgradeLevels));
          const canBuy = canPurchaseUpgrade(
            upgradeLevels,
            branch,
            massMp,
          );

          return (
            <li key={branch} className="upgrades-card">
              <div className="upgrades-card-head">
                <h3 className="upgrades-card-name">
                  {t(`upgrades.branches.${branch}.name`)}
                </h3>
                <span className="upgrades-card-level">
                  {t("upgrades.levelShort", { value: level })}
                </span>
              </div>
              <p className="upgrades-card-effect">
                {t(`upgrades.branches.${branch}.effect`)}
              </p>
              {locked ? (
                <p className="upgrades-card-lock">
                  {branch === "disk"
                    ? t("upgrades.lock.disk")
                    : t("upgrades.lock.efficiency")}
                </p>
              ) : (
                <>
                  <p className="upgrades-card-cost">
                    {t("upgrades.nextCost", {
                      value: cost.toLocaleString("ru-RU"),
                    })}
                  </p>
                  <button
                    type="button"
                    className="upgrades-buy"
                    disabled={!canBuy}
                    onClick={() => buyUpgrade(branch)}
                  >
                    {t("upgrades.buy")}
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
