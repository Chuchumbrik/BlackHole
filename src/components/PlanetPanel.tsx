import { useTranslation } from "react-i18next";
import {
  PLANET_ACCELERATION_SECONDS,
  PLANET_ECOSYSTEM_HIGH,
  PLANET_ECOSYSTEM_LOW,
  PLANET_LIFE_EMERGENCE_TOTAL_SEC,
  PLANET_STAGE_DURATIONS_SEC,
} from "../game/balance";
import {
  accelerationCostMp,
  accelerationMultiplier,
  deviationFromGoldenMid,
  stageProgressRatio,
} from "../game/world/planetProgress";
import {
  ecosystemStable,
  lifeEmergenceRatio,
} from "../game/world/planetLife";
import { useGameStore } from "../store/useGameStore";

function formatParam(value: number): string {
  return `${Math.round(value)}/100`;
}

export function PlanetPanel() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-US" : "ru-RU";
  const systems = useGameStore((s) => s.systems);
  const activeSystemId = useGameStore((s) => s.activeSystemId);
  const setActiveSystem = useGameStore((s) => s.setActiveSystem);
  const acceleratePlanet = useGameStore((s) => s.acceleratePlanet);
  const massMp = useGameStore((s) => s.massMp);

  const activeSystem =
    systems.find((system) => system.id === activeSystemId) ?? systems[0];
  const planet = activeSystem?.planets[0];

  if (!activeSystem || !planet) {
    return (
      <section className="planet-panel">
        <h2 className="planet-title">{t("planet.title")}</h2>
        <p className="planet-empty">{t("planet.empty")}</p>
      </section>
    );
  }

  const stageDuration = PLANET_STAGE_DURATIONS_SEC[planet.stage - 1] ?? 1;
  const progressRatio = stageProgressRatio(planet);
  const progressPercent = Math.round(progressRatio * 100);
  const stable = ecosystemStable(planet);
  const lifePct = Math.round(lifeEmergenceRatio(planet) * 100);
  const cost = accelerationCostMp(planet);
  const enoughMass = massMp >= cost;
  const nextGainSec = Math.min(
    PLANET_ACCELERATION_SECONDS,
    stageDuration - planet.stageProgressSec,
  );

  return (
    <section className="planet-panel">
      <div className="planet-head">
        <h2 className="planet-title">{t("planet.title")}</h2>
        <p className="planet-system">
          {t("planet.activeSystem", {
            name: activeSystem.name,
            starClass: activeSystem.starClass,
          })}
        </p>
      </div>

      {systems.length > 1 && (
        <div className="planet-system-picker" role="group" aria-label={t("planet.systemsLabel")}>
          {systems.map((system) => (
            <button
              key={system.id}
              type="button"
              className={system.id === activeSystem.id ? "is-active" : undefined}
              onClick={() => setActiveSystem(system.id)}
            >
              {system.name}
            </button>
          ))}
        </div>
      )}

      <article className="planet-card">
        <h3 className="planet-name">{planet.name}</h3>
        <p className="planet-stage">
          {t("planet.stageLabel", {
            stage: planet.stage,
            max: PLANET_STAGE_DURATIONS_SEC.length,
          })}
        </p>
        <div className="planet-progress-track" aria-hidden="true">
          <div
            className="planet-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="planet-progress-text">
          {t("planet.progress", {
            percent: progressPercent,
            current: Math.floor(planet.stageProgressSec),
            total: stageDuration,
          })}
        </p>

        <ul className="planet-params">
          <li>{t("planet.params.orbitalDistance", { value: formatParam(planet.orbitalDistance) })}</li>
          <li>{t("planet.params.gravityProxy", { value: formatParam(planet.gravityProxy) })}</li>
          <li>{t("planet.params.temperature", { value: formatParam(planet.surfaceTemperature) })}</li>
          <li>{t("planet.params.atmosphere", { value: formatParam(planet.atmosphere) })}</li>
          <li>{t("planet.params.hydrosphere", { value: formatParam(planet.hydrosphere) })}</li>
          <li>{t("planet.params.geology", { value: formatParam(planet.geologicalActivity) })}</li>
        </ul>

        <p className="planet-eco-hint">
          {stable
            ? t("planet.ecoGate", {
                low: PLANET_ECOSYSTEM_LOW,
                high: PLANET_ECOSYSTEM_HIGH,
              })
            : t("planet.ecoPending")}
        </p>

        {stable && !planet.lifeBorn && (
          <div className="planet-life-block">
            <h4 className="planet-subtitle">{t("planet.lifeTitle")}</h4>
            <div className="planet-progress-track" aria-hidden="true">
              <div
                className="planet-progress-fill planet-progress-life"
                style={{ width: `${lifePct}%` }}
              />
            </div>
            <p className="planet-progress-text">
              {t("planet.lifeProgress", {
                pct: lifePct,
                totalMin: Math.round(PLANET_LIFE_EMERGENCE_TOTAL_SEC / 60),
              })}
            </p>
          </div>
        )}

        {planet.lifeBorn && (
          <div className="planet-life-block">
            <p className="planet-life-born">{t("planet.lifeBorn")}</p>
            <p className="planet-civ-teaser">{t("planet.civTeaser")}</p>
          </div>
        )}

        <p className="planet-meta">
          {t("planet.accelInfo", {
            seconds: PLANET_ACCELERATION_SECONDS,
            next: Math.max(0, Math.floor(nextGainSec)),
            multiplier: accelerationMultiplier(planet).toFixed(2),
            deviation: Math.round(deviationFromGoldenMid(planet)),
          })}
        </p>
        <button
          type="button"
          className="planet-accelerate"
          disabled={!enoughMass}
          onClick={() => acceleratePlanet(activeSystem.id, planet.id)}
        >
          {t("planet.accelerate", {
            cost: cost.toLocaleString(locale),
          })}
        </button>
      </article>
    </section>
  );
}
