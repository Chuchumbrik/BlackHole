import { useTranslation } from "react-i18next";
import {
  PLANET_ACCELERATION_SECONDS,
  PLANET_ECOSYSTEM_HIGH,
  PLANET_ECOSYSTEM_LOW,
  PLANET_LIFE_EMERGENCE_TOTAL_SEC,
  PLANET_STAGE_DURATIONS_SEC,
  PLANET_TERRAFORM_COST_MP,
  PLANET_TERRAFORM_STEP,
  PLANET_SHIELD_COST_MP,
  PLANET_CIV_MAX_LEVEL,
} from "../game/balance";
import {
  accelerationCostMp,
  accelerationMultiplier,
  deviationFromGoldenMid,
  planetStageInfo,
  stageProgressRatio,
} from "../game/world/planetProgress";
import {
  ecosystemStable,
  lifeEmergenceRatio,
  planetMatureForLife,
} from "../game/world/planetLife";
import {
  inHabitableZone,
  likelyTidalLocked,
} from "../game/world/planetAstroHints";
import { useGameStore } from "../store/useGameStore";
import type { Planet } from "../game/world/types";

function formatParam(value: number): string {
  return `${Math.round(value)}/100`;
}

export function PlanetPanel() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "en" ? "en-US" : "ru-RU";
  const systems = useGameStore((s) => s.systems);
  const activeSystemId = useGameStore((s) => s.activeSystemId);
  const setActiveSystem = useGameStore((s) => s.setActiveSystem);
  const activePlanetId = useGameStore((s) => s.activePlanetId);
  const setActivePlanet = useGameStore((s) => s.setActivePlanet);
  const acceleratePlanet = useGameStore((s) => s.acceleratePlanet);
  const terraformPlanet = useGameStore((s) => s.terraformPlanet);
  const shieldPlanet = useGameStore((s) => s.shieldPlanet);
  const gameTimeSec = useGameStore((s) => s.gameTimeSec);
  const massMp = useGameStore((s) => s.massMp);

  const activeSystem =
    systems.find((system) => system.id === activeSystemId) ?? systems[0];
  const planet =
    activeSystem?.planets.find((p: Planet) => p.id === activePlanetId) ??
    activeSystem?.planets[0];

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
  const mature = planetMatureForLife(planet);
  const stageInfo = planetStageInfo(planet.stage);
  const lifePct = Math.round(lifeEmergenceRatio(planet) * 100);
  const cost = accelerationCostMp(planet);
  const enoughMass = massMp >= cost;
  const nextGainSec = Math.min(
    PLANET_ACCELERATION_SECONDS,
    stageDuration - planet.stageProgressSec,
  );

  // Чёткие состояния кнопок — чтобы активная кнопка не вводила в заблуждение.
  const maxStage = PLANET_STAGE_DURATIONS_SEC.length;
  const fullyDeveloped =
    planet.stage >= maxStage &&
    planet.lifeBorn &&
    planet.civLevel >= PLANET_CIV_MAX_LEVEL;
  const paramsPerfect = deviationFromGoldenMid(planet) <= PLANET_TERRAFORM_STEP / 2;
  const shieldActive = planet.shieldUntilSec > gameTimeSec;
  const shieldLeftSec = Math.ceil(planet.shieldUntilSec - gameTimeSec);
  const canTerraform = !paramsPerfect && massMp >= PLANET_TERRAFORM_COST_MP;
  const canShield = !shieldActive && massMp >= PLANET_SHIELD_COST_MP;
  const canAccelerate = enoughMass && !fullyDeveloped;

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

      {activeSystem.planets.length > 1 && (
        <div className="planet-planet-picker" role="tablist" aria-label={t("planet.planetsLabel")}>
          {activeSystem.planets.map((p: Planet) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              className={p.id === planet?.id ? "is-active" : undefined}
              onClick={() => setActivePlanet(p.id)}
            >
              {p.name}
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
          {" · "}
          <b>{stageInfo.name}</b>
        </p>
        <p className="planet-stage-desc">{stageInfo.desc}</p>
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
          <li>{t("planet.params.radiusScale", { value: planet.radiusScale.toFixed(2) })}</li>
          <li>{t("planet.params.orbitalDistance", { value: formatParam(planet.orbitalDistance) })}</li>
          <li>{t("planet.params.gravityProxy", { value: formatParam(planet.gravityProxy) })}</li>
          <li>{t("planet.params.temperature", { value: formatParam(planet.surfaceTemperature) })}</li>
          <li>{t("planet.params.atmosphere", { value: formatParam(planet.atmosphere) })}</li>
          <li>{t("planet.params.hydrosphere", { value: formatParam(planet.hydrosphere) })}</li>
          <li>{t("planet.params.geology", { value: formatParam(planet.geologicalActivity) })}</li>
        </ul>

        <p className="planet-astro-hint">
          {inHabitableZone(activeSystem.starClass, planet.orbitalDistance)
            ? t("planet.astro.hzIn")
            : t("planet.astro.hzOut")}
        </p>
        {likelyTidalLocked(planet) && (
          <p className="planet-astro-hint">{t("planet.astro.tidalLock")}</p>
        )}

        <p className="planet-eco-hint">
          {stable
            ? t("planet.ecoGate", {
                low: PLANET_ECOSYSTEM_LOW,
                high: PLANET_ECOSYSTEM_HIGH,
              })
            : t("planet.ecoPending")}
        </p>
        {stable && !mature && !planet.lifeBorn && (
          <p className="planet-eco-hint">
            Экосистема готова, но планета ещё не зрелая. Жизнь зарождается только
            на стадии «Зрелая планета» (3) — дай развиться или ускорь.
          </p>
        )}

        {stable && mature && !planet.lifeBorn && (
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
            <p className="planet-civ-level">
              Цивилизация: тир {planet.civLevel}/4
            </p>
            <p className="planet-civ-teaser">
              {planet.civLevel >= 1
                ? "Цивилизация запускает корабли в космос — часть захватывает дыра (пассивный MP)."
                : "Цивилизация зарождается… на высших тирах начнёт запускать корабли."}
            </p>
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
        {stable && mature && !planet.lifeBorn && (
          <p className="planet-life-auto-note">{t("planet.lifeAutoNote")}</p>
        )}
        <button
          type="button"
          className="planet-accelerate"
          disabled={!canAccelerate}
          title="Ускоряет развитие планеты за MP: стадии, зарождение жизни и рост цивилизации"
          onClick={() => acceleratePlanet(activeSystem.id, planet.id)}
        >
          {fullyDeveloped
            ? "Развитие завершено"
            : t("planet.accelerate", { cost: cost.toLocaleString(locale) })}
        </button>

        <div className="planet-actions">
          <button
            type="button"
            className="planet-action-btn"
            disabled={!canTerraform}
            onClick={() => terraformPlanet(activeSystem.id, planet.id)}
            title="Сдвигает параметры к золотой середине — путь к экосистеме и жизни"
          >
            {paramsPerfect
              ? "Параметры идеальны"
              : `Терраформинг · ${PLANET_TERRAFORM_COST_MP.toLocaleString(locale)} MP`}
          </button>
          <button
            type="button"
            className="planet-action-btn"
            disabled={!canShield}
            onClick={() => shieldPlanet(activeSystem.id, planet.id)}
            title="Защита от ударов астероидов на время"
          >
            {shieldActive
              ? `Щит активен · ${shieldLeftSec} с`
              : `Щит · ${PLANET_SHIELD_COST_MP.toLocaleString(locale)} MP`}
          </button>
        </div>
      </article>
    </section>
  );
}
