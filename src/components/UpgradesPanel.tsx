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
  SUPERNOVA_UNLOCK_PRESTIGE,
  SUPERNOVA_MAX_LEVEL,
  supernovaUpgradeCostMp,
  supernovaMpMult,
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

/** Категории-вкладки для навигации по улучшениям. */
type UpgradeCategory = "all" | "core" | "special" | "env" | "deep";


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
  const supernovaLevel = useGameStore((s) => s.supernovaLevel);
  const buySupernovaLevel = useGameStore((s) => s.buySupernovaLevel);
  const prestigeCount = useGameStore((s) => s.prestigeCount);
  const buyMultiplier = useGameStore((s) => s.buyMultiplier);
  const setBuyMultiplier = useGameStore((s) => s.setBuyMultiplier);
  const [category, setCategory] = useState<UpgradeCategory>("all");
  const [onlyAffordable, setOnlyAffordable] = useState(false);
  const [hideMaxed, setHideMaxed] = useState(false);
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

  // Какие категории вообще доступны (чтобы не показывать пустые вкладки).
  const envUnlocked = isEnvironmentBranchUnlocked(sum);
  const advBranchesUnlocked = (["time", "life", "exotic"] as AdvBranch[]).filter(
    (b) => isAdvBranchUnlocked(b, prestigeCount),
  );
  const hasDeep = advBranchesUnlocked.length > 0;

  const CATS: { id: UpgradeCategory; label: string; show: boolean }[] = [
    { id: "all", label: "Все", show: true },
    { id: "core", label: "Чёрная дыра", show: true },
    { id: "special", label: "Особые", show: true },
    { id: "env", label: "Окружение", show: envUnlocked },
    { id: "deep", label: "Глубокие", show: hasDeep },
  ];
  const showCat = (c: UpgradeCategory) => category === "all" || category === c;

  // Предрасчёт списков с учётом фильтров «только доступные» / «скрыть макс.».
  const coreList = UPGRADE_BRANCHES.filter(
    (branch) => !branchLocked(branch, upgradeLevels),
  )
    .map((branch) => ({
      branch,
      plan: planUpgradePurchase(upgradeLevels, branch, massMp, buyMultiplier),
    }))
    .filter(({ plan }) => !onlyAffordable || plan.count > 0);

  const mpList = MP_UPGRADES.map((up) => {
    const lvl = mpUpgradeLevels[up.id] ?? 0;
    return {
      up,
      lvl,
      maxed: lvl >= up.maxLevel,
      plan: planMpUpgradePurchase(up, lvl, massMp, buyMultiplier),
    };
  }).filter(
    ({ maxed, plan }) =>
      (!hideMaxed || !maxed) && (!onlyAffordable || plan.count > 0),
  );

  const envList = (
    envUnlocked
      ? ENVIRONMENT_UPGRADES.filter((up) => isEnvironmentUpgradeUnlocked(up, sum))
      : []
  )
    .map((up) => {
      const lvl = environmentLevels[up.id] ?? 0;
      return {
        up,
        lvl,
        maxed: lvl >= up.maxLevel,
        plan: planEnvironmentPurchase(up, lvl, massMp, buyMultiplier, sum),
      };
    })
    .filter(
      ({ maxed, plan }) =>
        (!hideMaxed || !maxed) && (!onlyAffordable || plan.count > 0),
    );

  const deepGroups = advBranchesUnlocked
    .map((branch) => ({
      branch,
      items: ADV_UPGRADES.filter((up) => up.branch === branch)
        .map((up) => {
          const lvl = advancedLevels[up.id] ?? 0;
          return {
            up,
            lvl,
            maxed: lvl >= up.maxLevel,
            plan: planAdvancedPurchase(up, lvl, massMp, buyMultiplier, prestigeCount),
          };
        })
        .filter(
          ({ maxed, plan }) =>
            (!hideMaxed || !maxed) && (!onlyAffordable || plan.count > 0),
        ),
    }))
    .filter((g) => g.items.length > 0);

  const supernovaShown =
    envUnlocked && prestigeCount >= SUPERNOVA_UNLOCK_PRESTIGE;

  const nothingShown =
    (!showCat("core") || coreList.length === 0) &&
    (!showCat("special") || mpList.length === 0) &&
    (!showCat("env") || (envList.length === 0 && !supernovaShown)) &&
    (!showCat("deep") || deepGroups.length === 0);

  return (
    <div className="upgrades-panel">
      <h2 className="upgrades-panel-title">{t("upgrades.title")}</h2>
      <p className="upgrades-panel-meta">
        {t("upgrades.holeLevel", { value: sum.toLocaleString("ru-RU") })}
      </p>
      <nav className="upg-cats" aria-label="Категории улучшений">
        {CATS.filter((c) => c.show).map((c) => (
          <button
            key={c.id}
            type="button"
            className={category === c.id ? "is-active" : undefined}
            onClick={() => setCategory(c.id)}
          >
            {c.label}
          </button>
        ))}
      </nav>
      <div className="upg-filters">
        <button
          type="button"
          className={onlyAffordable ? "is-active" : undefined}
          onClick={() => setOnlyAffordable((v) => !v)}
        >
          ✓ Только доступные
        </button>
        <button
          type="button"
          className={hideMaxed ? "is-active" : undefined}
          onClick={() => setHideMaxed((v) => !v)}
        >
          ⤓ Скрыть макс.
        </button>
      </div>
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
      {showCat("core") && coreList.length > 0 && (
      <ul className="upgrades-card-list">
        {coreList.map(({ branch, plan }) => {
          const level = upgradeLevels[branch];
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
      )}

      {showCat("special") && mpList.length > 0 && (
      <>
      <h3 className="upgrades-extra-title">Особые улучшения</h3>
      <ul className="upgrades-card-list">
        {mpList.map(({ up, lvl, maxed, plan }) => {
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
                        : up.kind === "hawkingMul"
                          ? "пассиву Хокинга"
                          : up.kind === "wavePullMul"
                            ? "силе волны притяжения"
                            : "запасу и восстановлению импульса"
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
      </>
      )}

      {showCat("env") && (envList.length > 0 || supernovaShown) && (
        <>
          {envList.length > 0 && (
          <>
          <h3 className="upgrades-extra-title">Окружение (риск / награда)</h3>
          <ul className="upgrades-card-list">
            {envList.map(({ up, lvl, maxed, plan }) => {
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
          </>
          )}

          {supernovaShown &&
            (() => {
              const maxed = supernovaLevel >= SUPERNOVA_MAX_LEVEL;
              const cost = supernovaUpgradeCostMp(supernovaLevel);
              const affordable = !maxed && massMp >= cost;
              const curMult = supernovaMpMult(supernovaLevel);
              const nextMult = supernovaMpMult(supernovaLevel + 1);
              const unlocked = supernovaLevel >= 1;
              return (
                <ul className="upgrades-card-list">
                  <li className="upgrades-card">
                    <div className="upgrades-card-main">
                      <div className="upgrades-card-head">
                        <h3 className="upgrades-card-name">Сверхновая ☀</h3>
                        <span className="upgrades-card-level">
                          {unlocked
                            ? `Ур. ${supernovaLevel}/${SUPERNOVA_MAX_LEVEL}`
                            : "Не открыта"}
                        </span>
                      </div>
                      <p className="upgrades-card-effect">
                        Активируемый скилл (кнопка на экране): всплеск материи +
                        временный множитель к добыче MP.
                      </p>
                      <p className="upgrades-card-current">
                        {unlocked
                          ? `Сейчас: ×${curMult.toFixed(2)} MP${
                              maxed ? "" : ` → ×${nextMult.toFixed(2)} на след. ур.`
                            }`
                          : `После покупки: ×${nextMult.toFixed(
                              2,
                            )} MP и кнопка скилла на экране`}
                      </p>
                    </div>
                    <div className="upgrades-card-action">
                      {maxed ? (
                        <p className="upgrades-card-cost">Максимум</p>
                      ) : (
                        <>
                          <p className="upgrades-card-cost">
                            {`${unlocked ? "Улучшить" : "Открыть"}: ${cost.toLocaleString(
                              "ru-RU",
                            )} MP`}
                          </p>
                          <button
                            type="button"
                            className="upgrades-buy"
                            disabled={!affordable}
                            onClick={() => {
                              if (buySupernovaLevel()) playPurchase();
                            }}
                          >
                            {unlocked ? "Улучшить" : "Открыть"}
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                </ul>
              );
            })()}
        </>
      )}

      {showCat("deep") &&
        deepGroups.map(({ branch, items }) => (
          <div key={branch}>
            <h3 className="upgrades-extra-title">{ADV_BRANCH_LABEL[branch]}</h3>
            <ul className="upgrades-card-list">
              {items.map(({ up, lvl, maxed, plan }) => {
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

      {nothingShown && (
        <p className="upg-empty">
          {onlyAffordable
            ? "Сейчас нет доступных для покупки улучшений в этой категории — копите массу."
            : "В этой категории пока нет улучшений."}
        </p>
      )}
    </div>
  );
}
