import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { GameCanvas } from "./components/GameCanvas";
import { TimeScaleControls } from "./components/TimeScaleControls";
import { ViewScaleControls } from "./components/ViewScaleControls";
import { MpGainFloaters } from "./components/MpGainFloaters";
import { PlanetPanel } from "./components/PlanetPanel";
import { UpgradesPanel } from "./components/UpgradesPanel";
import { PrestigePanel } from "./components/PrestigePanel";
import { AchievementsPanel } from "./components/AchievementsPanel";
import { JournalPanel } from "./components/JournalPanel";
import { StatsPanel } from "./components/StatsPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { FeedbackButton } from "./components/FeedbackButton";
import { FieldLegend } from "./components/FieldLegend";
import { OnboardingCta } from "./components/OnboardingCta";
import { useGameStore } from "./store/useGameStore";
import { levelSum } from "./game/upgrades";
import { UPGRADE_FIRST_LEVEL_COST_MP, ENERGY_MAX } from "./game/balance";
import { resumeAudio, playEvent, playPrestige } from "./game/audio/sound";

const APP_VERSION = __APP_VERSION__;

const CTA_SEEN_KEY = "cbh:onboardingCtaSeen";

/**
 * V1: прогрессивное раскрытие вкладок. `unlocked` решает, показывать ли вкладку
 * в навигации (саму панель можно открыть всегда, если игрок туда попал). Цель —
 * не вываливать новичку 7 разделов сразу; глубина открывается по мере роста.
 */
const TABS = [
  { id: "game" as const, labelKey: "app.tabs.game", hint: "Игровое поле: дыра поглощает материю системы", unlocked: () => true },
  { id: "upgrades" as const, labelKey: "app.tabs.upgrades", hint: "Прокачка чёрной дыры за MP", unlocked: () => true },
  { id: "planet" as const, labelKey: "app.tabs.planet", hint: "Развитие планет: терраформинг, жизнь, цивилизация, дань", unlocked: (c: TabUnlockCtx) => c.levelSum >= 1 },
  { id: "prestige" as const, labelKey: "app.tabs.prestige", hint: "Сжатие вселенной ради очков престижа (PP)", unlocked: (c: TabUnlockCtx) => c.levelSum >= 5 || c.prestigeCount > 0 },
  { id: "stats" as const, labelKey: "app.tabs.stats", hint: "Все показатели игры", unlocked: (c: TabUnlockCtx) => c.levelSum >= 1 },
  { id: "achievements" as const, labelKey: "app.tabs.achievements", hint: "Достижения и их постоянные бонусы", unlocked: (c: TabUnlockCtx) => c.achievementsCount >= 1 },
  { id: "journal" as const, labelKey: "app.tabs.journal", hint: "Космический журнал: летопись открытий, рисков и вех", unlocked: (c: TabUnlockCtx) => c.levelSum >= 1 },
  { id: "settings" as const, labelKey: "app.tabs.settings", hint: "Сохранение и сброс прогресса", unlocked: () => true },
];

type TabUnlockCtx = {
  levelSum: number;
  prestigeCount: number;
  achievementsCount: number;
};

/** Класс-модификатор оверлея по вкладке (для специфичных стилей панели). */
const PANEL_OVERLAY_CLASS: Record<string, string> = {
  upgrades: "app-panel-upgrades",
  planet: "app-panel-planet",
  prestige: "app-panel-prestige",
  stats: "app-panel-stats",
  achievements: "app-panel-stats",
  journal: "app-panel-stats",
  settings: "app-panel-settings",
};

function App() {
  const { t } = useTranslation();
  const massMp = useGameStore((s) => s.massMp);
  const energy = useGameStore((s) => s.energy);
  const activeTab = useGameStore((s) => s.activeTab);
  const setTab = useGameStore((s) => s.setTab);
  const upgradeLevelSum = useGameStore((s) => levelSum(s.upgradeLevels));
  const prestigeCount = useGameStore((s) => s.prestigeCount);
  const achievementsCount = useGameStore((s) => s.achievementsUnlocked.length);
  const pendingOfflineMp = useGameStore((s) => s.pendingOfflineMp);
  const clearPendingOffline = useGameStore((s) => s.clearPendingOffline);
  const achievementToast = useGameStore((s) => s.achievementToast);
  const clearAchievementToast = useGameStore((s) => s.clearAchievementToast);
  const activeEventName = useGameStore((s) => s.activeEventName);
  const prestigeFlash = useGameStore((s) => s.prestigeFlash);
  const [collapsing, setCollapsing] = useState(false);

  // V1: онбординг-CTA к первой покупке. Показываем, когда MP уже хватает на
  // первый апгрейд, но игрок ещё ничего не купил и подсказку не закрывал.
  const [ctaSeen, setCtaSeen] = useState(() => {
    try {
      return localStorage.getItem(CTA_SEEN_KEY) === "1";
    } catch {
      return false;
    }
  });
  const dismissCta = () => {
    setCtaSeen(true);
    try {
      localStorage.setItem(CTA_SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
  };
  const showCta =
    !ctaSeen &&
    upgradeLevelSum === 0 &&
    massMp >= UPGRADE_FIRST_LEVEL_COST_MP &&
    activeTab === "game";

  const unlockCtx: TabUnlockCtx = {
    levelSum: upgradeLevelSum,
    prestigeCount,
    achievementsCount,
  };
  const visibleTabs = TABS.filter(
    (tab) => tab.unlocked(unlockCtx) || tab.id === activeTab,
  );

  // V8: вспышка коллапса при сжатии.
  useEffect(() => {
    if (prestigeFlash === 0) return;
    setCollapsing(true);
    playPrestige();
    const id = window.setTimeout(() => setCollapsing(false), 1300);
    return () => window.clearTimeout(id);
  }, [prestigeFlash]);

  // V6: разблокировать аудио по первому жесту (политика autoplay браузеров).
  useEffect(() => {
    const unlock = () => resumeAudio();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  // V6: звук старта события.
  useEffect(() => {
    if (activeEventName) playEvent();
  }, [activeEventName]);

  // V7: цвет тинта по активному событию.
  const eventTint =
    activeEventName === "Дождь астероидов"
      ? "rgba(251,146,60,0.16)"
      : activeEventName === "Богатая жила"
        ? "rgba(251,191,36,0.16)"
        : activeEventName === "Парад планет"
          ? "rgba(167,139,250,0.16)"
          : null;

  // Автосейв: каждые 10 с и при сворачивании/закрытии вкладки.
  useEffect(() => {
    const save = () => useGameStore.getState().saveNow();
    const interval = window.setInterval(save, 10_000);
    const onVis = () => {
      if (document.visibilityState === "hidden") save();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("beforeunload", save);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", save);
    };
  }, []);

  // Автоскрытие тоста достижения.
  useEffect(() => {
    if (!achievementToast) return;
    const id = window.setTimeout(() => clearAchievementToast(), 3500);
    return () => window.clearTimeout(id);
  }, [achievementToast, clearAchievementToast]);

  return (
    <div className="app-root">
      <div className="app-game-layer">
        <div
          className={
            activeTab === "game"
              ? "game-canvas-wrap is-visible"
              : "game-canvas-wrap is-backdrop"
          }
          aria-hidden={activeTab !== "game"}
        >
          <GameCanvas />
        </div>
        {/* Виньетка: мягко затемняет края, чтобы прямоугольный край кадра (где
            «вплывают» тела с дальней круглой границы) не читался как рамка. */}
        <div className="game-vignette" aria-hidden="true" />
        {activeTab !== "game" && (
          <>
            {/* Полупрозрачный бэкдроп: космос виден позади, клик по нему закрывает
                панель (модальное поведение, а не блокировка всего экрана). */}
            <div
              className="app-panel-backdrop"
              onClick={() => setTab("game")}
              aria-hidden="true"
            />
            <div
              className={`app-panel-overlay ${PANEL_OVERLAY_CLASS[activeTab] ?? ""}`}
              role="dialog"
              aria-modal="false"
            >
              <button
                type="button"
                className="app-panel-close"
                onClick={() => setTab("game")}
                aria-label="Закрыть"
                title="Закрыть (или клик по космосу)"
              >
                ✕
              </button>
              {activeTab === "upgrades" && <UpgradesPanel />}
              {activeTab === "planet" && <PlanetPanel />}
              {activeTab === "prestige" && <PrestigePanel />}
              {activeTab === "stats" && <StatsPanel />}
              {activeTab === "achievements" && <AchievementsPanel />}
              {activeTab === "journal" && <JournalPanel />}
              {activeTab === "settings" && <SettingsPanel />}
            </div>
          </>
        )}
      </div>

      {activeTab === "game" && (
        <>
          <ViewScaleControls />
          <TimeScaleControls />
          <FieldLegend />
        </>
      )}

      {showCta && (
        <OnboardingCta
          onOpenUpgrades={() => {
            dismissCta();
            setTab("upgrades");
          }}
          onDismiss={dismissCta}
        />
      )}

      <div className="app-ui">
        <header className="app-header">
          <div>
            <h1 className="app-title">{t("app.title")}</h1>
            <p className="app-subtitle">
              {t("app.subtitle")} · v{APP_VERSION}
            </p>
          </div>
          <div
            className="app-mass"
            title="MP — масса-энергия, ваша валюта. Набирается, когда материя падает за горизонт чёрной дыры."
          >
            {t("app.mass", { value: massMp.toLocaleString("ru-RU") })}
            <span className="app-mass-hint"> {t("app.massHint")}</span>
          </div>
          <div
            className="app-energy"
            title="Гравитационный импульс. Тапните по пустому космосу — волна притяжения тянет тела к дыре, ускоряя поглощение. Восстанавливается со временем."
          >
            <div className="app-energy-row">
              <span className="app-energy-label">Импульс</span>
              <span className="app-energy-value">
                {Math.floor(energy)}/{ENERGY_MAX}
              </span>
            </div>
            <div className="app-energy-track">
              <div
                className="app-energy-fill"
                style={{
                  width: `${Math.max(0, Math.min(100, (energy / ENERGY_MAX) * 100))}%`,
                }}
              />
            </div>
          </div>
        </header>

        <nav className="app-nav" aria-label="Разделы">
          {visibleTabs.map((tab) => {
            const classes = [
              tab.id === activeTab ? "is-active" : "",
              showCta && tab.id === "upgrades" ? "is-cta-glow" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={tab.id}
                type="button"
                className={classes || undefined}
                onClick={() => {
                  if (tab.id === "upgrades") dismissCta();
                  setTab(tab.id);
                }}
                title={tab.hint}
              >
                {t(tab.labelKey)}
              </button>
            );
          })}
        </nav>
      </div>

      {pendingOfflineMp > 0 && (
        <div className="app-offline-overlay" role="dialog" aria-modal="true">
          <div className="app-offline-card">
            <p className="app-offline-title">Пока вас не было</p>
            <p className="app-offline-amount">
              +{pendingOfflineMp.toLocaleString("ru-RU")} MP
            </p>
            <p className="app-offline-hint">
              Поглощение продолжалось без вас (75 %, кап 12 ч).
            </p>
            <button type="button" onClick={clearPendingOffline}>
              Забрать
            </button>
          </div>
        </div>
      )}

      {eventTint && (
        <div
          className="event-tint"
          aria-hidden="true"
          style={{
            background: `radial-gradient(circle at 50% 50%, transparent 55%, ${eventTint} 100%)`,
          }}
        />
      )}
      {collapsing && (
        <div className="collapse-flash" aria-hidden="true">
          <span>Новая вселенная</span>
        </div>
      )}

      {activeEventName && (
        <div className="event-banner" role="status">
          ⚡ Событие: <b>{activeEventName}</b>
        </div>
      )}

      {achievementToast && (
        <div className="ach-toast" role="status">
          🏆 Достижение: <b>{achievementToast}</b>
        </div>
      )}

      <MpGainFloaters />
      <FeedbackButton />
    </div>
  );
}

export default App;
