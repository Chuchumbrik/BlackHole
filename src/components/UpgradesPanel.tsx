import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { playPurchase } from "../game/audio/sound";
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
import {
  ENVIRONMENT_UPGRADES,
  environmentUpgradeCost,
  isEnvironmentBranchUnlocked,
  isEnvironmentUpgradeUnlocked,
  planEnvironmentPurchase,
} from "../game/environment";
import {
  SUPERNOVA_ENERGY_COST,
  SUPERNOVA_COOLDOWN_SEC,
  SUPERNOVA_UNLOCK_PRESTIGE,
} from "../game/balance";
import { effectiveHawkingPerSec } from "../game/economyView";
import {
  ADV_UPGRADES,
  ADV_BRANCH_LABEL,
  advancedUpgradeCost,
  isAdvBranchUnlocked,
  planAdvancedPurchase,
  type AdvBranch,
} from "../game/advancedUpgrades";

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
  const environmentLevels = useGameStore((s) => s.environmentLevels);
  const buyEnvironmentUpgrade = useGameStore((s) => s.buyEnvironmentUpgrade);
  const prestigePerkLevels = useGameStore((s) => s.prestigePerkLevels);
  const achievementsUnlocked = useGameStore((s) => s.achievementsUnlocked);
  const advancedLevels = useGameStore((s) => s.advancedLevels);
  const buyAdvancedUpgrade = useGameStore((s) => s.buyAdvancedUpgrade);
  const energy = useGameStore((s) => s.energy);
  const supernovaReadyAtMs = useGameStore((s) => s.supernovaReadyAtMs);
  const prestigeCount = useGameStore((s) => s.prestigeCount);
  const triggerSupernova = useGameStore((s) => s.triggerSupernova);
  const buyMultiplier = useGameStore((s) => s.buyMultiplier);
  const setBuyMultiplier = useGameStore((s) => s.setBuyMultiplier);
  const sum = levelSum(upgradeLevels);
  const viewportMin = useViewportMinPx();
  const snap = upgradeBranchSnapshot(upgradeLevels, massMp);
  const radii = computeRadiiPx(viewportMin, upgradeLevels, massMp);
  // Эффективный пассив Хокинга с учётом общего множителя добычи (других веток).
  const hawkingEff = effectiveHawkingPerSec({
    upgradeLevels,
    prestigePerkLevels,
    mpUpgradeLevels,
    environmentLevels,
    achievementsUnlocked,
    massMp,
  });

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
                            mps: formatMultiplier(hawkingEff),
                          });

          return (
            <li key={branch} className="upgrades-card">
              <div className="upgrades-card-main">
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
              </div>
              <div className="upgrades-card-action">
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
                  onClick={() => {
                    buyUpgrade(branch, buyMultiplier);
                    playPurchase();
                  }}
                >
                  {buyMultiplier === 1
                    ? t("upgrades.buy")
                    : t(capped ? "upgrades.buyNMax" : "upgrades.buyN", {
                        count: plan.count,
                      })}
                </button>
              </div>
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
              <div className="upgrades-card-main">
                <div className="upgrades-card-head">
                  <h3 className="upgrades-card-name">{up.name}</h3>
                  <span className="upgrades-card-level">
                    Ур. {lvl}/{up.maxLevel}
                  </span>
                </div>
                <p className="upgrades-card-effect">{up.desc}</p>
                <p className="upgrades-card-current">
                  {`Сейчас: ×${formatMultiplier(up.perLevel ** lvl)} к ${
                    up.kind === "mpMul"
                      ? "добыче MP"
                      : up.kind === "spawnRateMul"
                        ? "частоте спавна материи"
                        : "пассиву Хокинга"
                  } (ур. ${lvl})`}
                </p>
              </div>
              <div className="upgrades-card-action">
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
                      onClick={() => {
                        buyMpUpgrade(up.id, buyMultiplier);
                        playPurchase();
                      }}
                    >
                      {buyMultiplier === 1
                        ? "Купить"
                        : `Купить ×${plan.count}${capped ? " (макс.)" : ""}`}
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {isEnvironmentBranchUnlocked(sum) && (
        <>
          <h3 className="upgrades-extra-title">Окружение (риск / награда)</h3>
          <ul className="upgrades-card-list">
            {ENVIRONMENT_UPGRADES.filter((up) =>
              isEnvironmentUpgradeUnlocked(up, sum),
            ).map((up) => {
              const lvl = environmentLevels[up.id] ?? 0;
              const maxed = lvl >= up.maxLevel;
              const plan = planEnvironmentPurchase(
                up,
                lvl,
                massMp,
                buyMultiplier,
                sum,
              );
              const affordable = plan.count > 0;
              const capped = affordable && plan.count < buyMultiplier;
              return (
                <li key={up.id} className="upgrades-card">
                  <div className="upgrades-card-main">
                    <div className="upgrades-card-head">
                      <h3 className="upgrades-card-name">{up.name}</h3>
                      <span className="upgrades-card-level">
                        Ур. {lvl}/{up.maxLevel}
                      </span>
                    </div>
                    <p className="upgrades-card-effect">{up.desc}</p>
                    {up.risk && (
                      <p className="upgrades-card-risk">⚠ {up.risk}</p>
                    )}
                  </div>
                  <div className="upgrades-card-action">
                    {maxed ? (
                      <p className="upgrades-card-cost">Максимум</p>
                    ) : (
                      <>
                        <p className="upgrades-card-cost">
                          {buyMultiplier === 1 || !affordable
                            ? `Следующий уровень: ${environmentUpgradeCost(
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
                          onClick={() => {
                            buyEnvironmentUpgrade(up.id, buyMultiplier);
                            playPurchase();
                          }}
                        >
                          {buyMultiplier === 1
                            ? "Купить"
                            : `Купить ×${plan.count}${capped ? " (макс.)" : ""}`}
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {prestigeCount >= SUPERNOVA_UNLOCK_PRESTIGE &&
            (() => {
              const cooldownLeftSec = Math.max(
                0,
                Math.ceil((supernovaReadyAtMs - Date.now()) / 1000),
              );
              const onCooldown = cooldownLeftSec > 0;
              const canFire = energy >= SUPERNOVA_ENERGY_COST && !onCooldown;
              return (
                <ul className="upgrades-card-list">
                  <li className="upgrades-card">
                    <div className="upgrades-card-main">
                      <div className="upgrades-card-head">
                        <h3 className="upgrades-card-name">Сверхновая ☀</h3>
                      </div>
                      <p className="upgrades-card-effect">
                        Активируемая способность: мощный всплеск материи + ×3 к
                        добыче MP на время.
                      </p>
                      <p className="upgrades-card-risk">
                        Стоит {SUPERNOVA_ENERGY_COST} импульса · перезарядка{" "}
                        {Math.round(SUPERNOVA_COOLDOWN_SEC / 60)} мин
                      </p>
                    </div>
                    <div className="upgrades-card-action">
                      <p className="upgrades-card-cost">
                        {onCooldown
                          ? `Перезарядка: ${cooldownLeftSec} с`
                          : energy < SUPERNOVA_ENERGY_COST
                            ? `Нужно ${SUPERNOVA_ENERGY_COST} импульса`
                            : "Готова"}
                      </p>
                      <button
                        type="button"
                        className="upgrades-buy"
                        disabled={!canFire}
                        onClick={() => {
                          if (triggerSupernova()) playPurchase();
                        }}
                      >
                        Запустить
                      </button>
                    </div>
                  </li>
                </ul>
              );
            })()}
        </>
      )}

      {(["time", "life", "exotic"] as AdvBranch[])
        .filter((b) => isAdvBranchUnlocked(b, prestigeCount))
        .map((branch) => (
          <div key={branch}>
            <h3 className="upgrades-extra-title">{ADV_BRANCH_LABEL[branch]}</h3>
            <ul className="upgrades-card-list">
              {ADV_UPGRADES.filter((up) => up.branch === branch).map((up) => {
                const lvl = advancedLevels[up.id] ?? 0;
                const maxed = lvl >= up.maxLevel;
                const plan = planAdvancedPurchase(
                  up,
                  lvl,
                  massMp,
                  buyMultiplier,
                  prestigeCount,
                );
                const affordable = plan.count > 0;
                const capped = affordable && plan.count < buyMultiplier;
                return (
                  <li key={up.id} className="upgrades-card">
                    <div className="upgrades-card-main">
                      <div className="upgrades-card-head">
                        <h3 className="upgrades-card-name">{up.name}</h3>
                        <span className="upgrades-card-level">
                          Ур. {lvl}/{up.maxLevel}
                        </span>
                      </div>
                      <p className="upgrades-card-effect">{up.desc}</p>
                    </div>
                    <div className="upgrades-card-action">
                      {maxed ? (
                        <p className="upgrades-card-cost">Максимум</p>
                      ) : (
                        <>
                          <p className="upgrades-card-cost">
                            {buyMultiplier === 1 || !affordable
                              ? `Следующий уровень: ${advancedUpgradeCost(
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
                            onClick={() => {
                              buyAdvancedUpgrade(up.id, buyMultiplier);
                              playPurchase();
                            }}
                          >
                            {buyMultiplier === 1
                              ? "Купить"
                              : `Купить ×${plan.count}${capped ? " (макс.)" : ""}`}
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
    </div>
  );
}
