import i18n from "../../i18n";
import { FIELD_MP_GLOBAL_MULTIPLIER } from "../balance";
import {
  PLANET_ECOSYSTEM_HIGH,
  PLANET_ECOSYSTEM_LOW,
  PLANET_LIFE_EMERGENCE_TOTAL_SEC,
  PLANET_CIV_MAX_LEVEL,
} from "../balance/planetTuning";
import { mpIncomeMultiplier, type UpgradeLevels } from "../upgrades";
import {
  ecosystemDeficits,
  ecosystemStable,
  lifeEmergenceRatio,
  planetMatureForLife,
  planetSwallowMpBase,
  type PlanetParamKey,
} from "./planetLife";
import { planetStageInfo } from "./planetProgress";
import {
  inHabitableZone,
  likelyTidalLocked,
} from "./planetAstroHints";
import type { Planet } from "./types";

function deficitLabel(key: PlanetParamKey): string {
  return i18n.t(`planet.hover.deficit.${key}`);
}

/** Многострочная подсказка над планетой на canvas (Pixi Text). */
export function buildPlanetHoverText(
  planet: Planet,
  levels: UpgradeLevels,
  jetBuffActive: boolean,
  starClass: string,
): string {
  const mpMult = mpIncomeMultiplier(levels, jetBuffActive);
  const swallow = Math.floor(
    planetSwallowMpBase(planet) * mpMult * FIELD_MP_GLOBAL_MULTIPLIER,
  );
  const stable = ecosystemStable(planet);
  const lifeRatio = lifeEmergenceRatio(planet);
  const deficits = ecosystemDeficits(planet);

  const lines: string[] = [
    i18n.t("planet.hover.title", { name: planet.name }),
    i18n.t("planet.hover.stage", {
      stageName: planetStageInfo(planet.stage).name,
      stage: planet.stage,
      yield: (planet.mpYieldMult * 100).toFixed(0),
    }),
  ];

  if (!stable) {
    if (deficits.length === 0) {
      lines.push(i18n.t("planet.hover.ecoUnstable"));
    } else {
      lines.push(
        i18n.t("planet.hover.ecoHint", {
          list: deficits.map(deficitLabel).join(", "),
        }),
      );
    }
    lines.push(
      i18n.t("planet.hover.ecoBand", {
        low: PLANET_ECOSYSTEM_LOW,
        high: PLANET_ECOSYSTEM_HIGH,
      }),
    );
  } else if (!planet.lifeBorn && !planetMatureForLife(planet)) {
    lines.push(i18n.t("planet.hover.lifeGate"));
  } else if (!planet.lifeBorn) {
    lines.push(
      i18n.t("planet.hover.lifeEmergence", {
        pct: Math.round(lifeRatio * 100),
        totalMin: Math.round(PLANET_LIFE_EMERGENCE_TOTAL_SEC / 60),
      }),
    );
  } else {
    lines.push(i18n.t("planet.hover.lifeBorn"));
    lines.push(
      i18n.t("planet.hover.civTier", {
        tier: planet.civLevel,
        max: PLANET_CIV_MAX_LEVEL,
      }),
    );
  }

  if (inHabitableZone(starClass, planet.orbitalDistance)) {
    lines.push(i18n.t("planet.astro.hzIn"));
  } else {
    lines.push(i18n.t("planet.astro.hzOut"));
  }
  if (likelyTidalLocked(planet)) {
    lines.push(i18n.t("planet.astro.tidalLock"));
  }

  lines.push(i18n.t("planet.hover.swallow", { mp: swallow.toLocaleString(i18n.language === "en" ? "en-US" : "ru-RU") }));

  return lines.join("\n");
}
