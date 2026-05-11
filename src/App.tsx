import { useTranslation } from "react-i18next";
import { GameCanvas } from "./components/GameCanvas";
import { TimeScaleControls } from "./components/TimeScaleControls";
import { ViewScaleControls } from "./components/ViewScaleControls";
import { UpgradesPanel } from "./components/UpgradesPanel";
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
        {activeTab !== "game" && activeTab !== "upgrades" && (
          <div className="app-panel-placeholder">
            <p className="app-panel-title">
              {t(`app.tabs.${activeTab}`)}
            </p>
            <p className="app-panel-hint">Экран из ТЗ — в следующих PR.</p>
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
    </div>
  );
}

export default App;
