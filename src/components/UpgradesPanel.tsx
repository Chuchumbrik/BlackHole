import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  UPGRADE_BRANCHES,
  computeRadiiPx,
  isDiskUnlocked,
  isEfficiencyUnlocked,
  isHawkingUnlocked,
  isJetsUnlocked,
  isLensingUnlocked,
  levelSum,
  nextUpgradeCostMp,
  planUpgradePurchase,
  upgradeBranchSnapshot,
  type UpgradeLevels,
} from "../game/upgrades";
import { useGameStore } from "../store/useGameStore";
import { MP_UPGRADES, mpUpgradeCost, planMpUpgradePurchase } from "../game/mpUpgrades";

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

function branchLocked(
  branch: (typeof UPGRADE_BRANCHES)[number],
  levels: UpgradeLevels,
): boolean {
  if (branch === "disk") return !isDiskUnlocked(levels);
  if (branch === "efficiency") return !isEfficiencyUnlocked(levels);
  if (branch === "jets") return !isJetsUnlocked(levels);
  if (branch === "lensing") return !isLensingUnlocked(levels);
  if (branch === "hawking") return !isHawkingUnlocked(levels);
  return false;
}


export function UpgradesPanel() {
  const { t, i18n } = useTranslation();
  const massMp = useGameStore((s) => s.massMp);
  const upgradeLevels = useGameStore((s) => s.upgradeLevels);
  const buyUpgrade = useGameStore((s) => s.buyUpgrade);
  const mpUpgradeLevels = useGameStore((s) => s.mpUpgradeLevels);
  const buyMpUpgrade = useGameStore((s) => s.buyMpUpgrade);
  const buyMultiplier = useGameStore((s) => s.buyMultiplier);
  const setBuyMultiplier = useGameStore((s) => s.setBuyMultiplier);
  const sum = levelSum(upgradeLevels);
  const viewportMin = useViewportMinPx();
  const snap = upgradeBranchSnapshot(upgradeLevels, massMp);
  const radii = computeRadiiPx(viewportMin, upgradeLevels);

  return (
    <div className="upgrades-panel">
      <h2 className="upgrades-panel-title">{t("upgrades.title")}</h2>
      <p className="upgrades-panel-meta">
        {t("upgrades.holeLevel", { value: sum.toLocaleString("ru-RU") })}
      </p>
      <div className="buy-mult">
        <span className="buy-mult-label">Покупать:</span>
        {[1, 2, 5, 10, 50, 100].map((m) => (
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
      <ul className="upgrades-card-list">
        {UPGRADE_BRANCHES.filter(
          (branch) => !branchLocked(branch, upgradeLevels),
        ).map((branch) => {
          const level = upgradeLevels[branch];
          const plan = planUpgradePurchase(
            upgradeLevels,
            branch,
            massMp,
            buyMultiplier,
          );
          const canBuy = plan.count > 0;
          // массы хватает не на весь множитель — покупаем максимум возможного
          const capped = canBuy && plan.count < buyMultiplier;

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
                  : branch === "efficiency"
                    ? t("upgrades.current.efficiency", {
                        mp: formatMultiplier(snap.efficiencyIncomeMul),
                        pull: formatMultiplier(snap.efficiencyPullMul),
                      })
                    : branch === "jets"
                      ? t("upgrades.current.jets", {
                          level: level,
                        })
                      : branch === "lensing"
                        ? t("upgrades.current.lensing", {
                            mul: formatMultiplier(snap.lensingRareWeightMul),
                          })
                        : t("upgrades.current.hawking", {
                            mps: formatMultiplier(snap.hawkingMpPerSecApprox),
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
              <p className="upgrades-card-cost">
                {buyMultiplier === 1 || !canBuy
                  ? t("upgrades.nextCost", {
                      value: nextUpgradeCostMp(
                        upgradeLevels,
                        branch,
                      ).toLocaleString("ru-RU"),
                    })
                  : t(
                      capped ? "upgrades.bulkCostCapped" : "upgrades.bulkCost",
                      {
                        count: plan.count,
                        value: plan.totalCost.toLocaleString("ru-RU"),
                      },
                    )}
              </p>
              <button
                type="button"
                className="upgrades-buy"
                disabled={!canBuy}
                onClick={() => buyUpgrade(branch, buyMultiplier)}
              >
                {buyMultiplier === 1
                  ? t("upgrades.buy")
                  : t(capped ? "upgrades.buyNMax" : "upgrades.buyN", {
                      count: plan.count,
                    })}
              </button>
            </li>
          );
        })}
      </ul>

      <h3 className="upgrades-extra-title">Особые улучшения</h3>
      <ul className="upgrades-card-list">
        {MP_UPGRADES.map((up) => {
          const lvl = mpUpgradeLevels[up.id] ?? 0;
          const maxed = lvl >= up.maxLevel;
          const plan = planMpUpgradePurchase(up, lvl, massMp, buyMultiplier);
          const affordable = plan.count > 0;
          const capped = affordable && plan.count < buyMultiplier;
          return (
            <li key={up.id} className="upgrades-card">
              <div className="upgrades-card-head">
                <h3 className="upgrades-card-name">{up.name}</h3>
                <span className="upgrades-card-level">
                  Ур. {lvl}/{up.maxLevel}
                </span>
              </div>
              <p className="upgrades-card-effect">{up.desc}</p>
              {maxed ? (
                <p className="upgrades-card-cost">Максимум</p>
              ) : (
                <>
                  <p className="upgrades-card-cost">
                    {buyMultiplier === 1 || !affordable
                      ? `Следующий уровень: ${mpUpgradeCost(
                          up,
                          lvl,
                        ).toLocaleString("ru-RU")} MP`
                      : capped
                        ? `Хватает на ×${plan.count} (макс.): ${plan.totalCost.toLocaleString(
                            "ru-RU",
                          )} MP`
                        : `${plan.count} ур.: ${plan.totalCost.toLocaleString(
                            "ru-RU",
                          )} MP`}
                  </p>
                  <button
                    type="button"
                    className="upgrades-buy"
                    disabled={!affordable}
                    onClick={() => buyMpUpgrade(up.id, buyMultiplier)}
                  >
                    {buyMultiplier === 1
                      ? "Купить"
                      : `Купить ×${plan.count}${capped ? " (макс.)" : ""}`}
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
