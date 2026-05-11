import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  UPGRADE_BRANCHES,
  computeRadiiPx,
  isDiskUnlocked,
  isEfficiencyUnlocked,
  levelSum,
  nextUpgradeCostMp,
  canPurchaseUpgrade,
  upgradeBranchSnapshot,
} from "../game/upgrades";
import { useGameStore } from "../store/useGameStore";

function formatMultiplier(x: number): string {
  return x.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  });
}

function useViewportMinPx(): number {
  const [m, setM] = useState(() =>
    typeof window !== "undefined"
      ? Math.min(window.innerWidth, window.innerHeight)
      : 400,
  );
  useEffect(() => {
    const onResize = () =>
      setM(Math.min(window.innerWidth, window.innerHeight));
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return m;
}

export function UpgradesPanel() {
  const { t, i18n } = useTranslation();
  const massMp = useGameStore((s) => s.massMp);
  const upgradeLevels = useGameStore((s) => s.upgradeLevels);
  const buyUpgrade = useGameStore((s) => s.buyUpgrade);
  const sum = levelSum(upgradeLevels);
  const viewportMin = useViewportMinPx();
  const snap = upgradeBranchSnapshot(upgradeLevels);
  const radii = computeRadiiPx(viewportMin, upgradeLevels);

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

          const currentLine =
            branch === "size"
              ? t("upgrades.current.size", {
                  mul: formatMultiplier(snap.horizonMul),
                  px: Math.round(radii.horizon).toLocaleString(i18n.language),
                })
              : branch === "gravity"
                ? t("upgrades.current.gravity", {
                    mul: formatMultiplier(snap.gravityMul),
                    px: Math.round(radii.gravity).toLocaleString(i18n.language),
                  })
                : branch === "disk"
                  ? t("upgrades.current.disk", {
                      mul: formatMultiplier(snap.diskIncomeMul),
                    })
                  : t("upgrades.current.efficiency", {
                      mp: formatMultiplier(snap.efficiencyIncomeMul),
                      pull: formatMultiplier(snap.efficiencyPullMul),
                    });

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
              <p className="upgrades-card-current">{currentLine}</p>
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
