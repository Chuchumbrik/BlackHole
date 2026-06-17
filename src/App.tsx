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
import { FeedbackButton } from "./components/FeedbackButton";
import { useGameStore } from "./store/useGameStore";

const APP_VERSION = __APP_VERSION__;

const TABS = [
  { id: "game" as const, labelKey: "app.tabs.game" },
  { id: "upgrades" as const, labelKey: "app.tabs.upgrades" },
  { id: "planet" as const, labelKey: "app.tabs.planet" },
  { id: "prestige" as const, labelKey: "app.tabs.prestige" },
  { id: "stats" as const, labelKey: "app.tabs.stats" },
];

function App() {
  const { t } = useTranslation();
  const massMp = useGameStore((s) => s.massMp);
  const activeTab = useGameStore((s) => s.activeTab);
  const setTab = useGameStore((s) => s.setTab);
  const pendingOfflineMp = useGameStore((s) => s.pendingOfflineMp);
  const clearPendingOffline = useGameStore((s) => s.clearPendingOffline);
  const achievementToast = useGameStore((s) => s.achievementToast);
  const clearAchievementToast = useGameStore((s) => s.clearAchievementToast);
  const activeEventName = useGameStore((s) => s.activeEventName);
  const prestigeFlash = useGameStore((s) => s.prestigeFlash);
  const [collapsing, setCollapsing] = useState(false);

  // V8: вспышка коллапса при сжатии.
  useEffect(() => {
    if (prestigeFlash === 0) return;
    setCollapsing(true);
    const id = window.setTimeout(() => setCollapsing(false), 1300);
    return () => window.clearTimeout(id);
  }, [prestigeFlash]);

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
              : "game-canvas-wrap"
          }
          aria-hidden={activeTab !== "game"}
        >
          <GameCanvas />
        </div>
        {activeTab === "upgrades" && (
          <div className="app-panel-overlay app-panel-upgrades">
            <UpgradesPanel />
          </div>
        )}
        {activeTab === "planet" && (
          <div className="app-panel-overlay app-panel-planet">
            <PlanetPanel />
          </div>
        )}
        {activeTab === "prestige" && (
          <div className="app-panel-overlay app-panel-prestige">
            <PrestigePanel />
          </div>
        )}
        {activeTab === "stats" && (
          <div className="app-panel-overlay app-panel-stats">
            <AchievementsPanel />
          </div>
        )}
      </div>

      {activeTab === "game" && (
        <>
          <ViewScaleControls />
          <TimeScaleControls />
        </>
      )}

      <div className="app-ui">
        <header className="app-header">
          <div>
            <h1 className="app-title">{t("app.title")}</h1>
            <p className="app-subtitle">
              {t("app.subtitle")} · v{APP_VERSION}
            </p>
          </div>
          <div className="app-mass">
            {t("app.mass", { value: massMp.toLocaleString("ru-RU") })}
            <span className="app-mass-hint"> {t("app.massHint")}</span>
          </div>
        </header>

        <nav className="app-nav" aria-label="Разделы">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={tab.id === activeTab ? "is-active" : undefined}
              onClick={() => setTab(tab.id)}
            >
              {t(tab.labelKey)}
            </button>
          ))}
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
