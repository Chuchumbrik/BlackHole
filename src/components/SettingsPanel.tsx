import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useGameStore } from "../store/useGameStore";
import { isMuted, setMuted, resumeAudio, playPurchase } from "../game/audio/sound";

const LANG_KEY = "cbh:lang";

const APP_VERSION = __APP_VERSION__;

/**
 * Настройки игры: ручное сохранение и полный сброс прогресса.
 * Сброс — за двухшаговым подтверждением (необратимое действие, чистит сейв).
 */
export function SettingsPanel() {
  const { i18n } = useTranslation();
  const saveNow = useGameStore((s) => s.saveNow);
  const resetProgress = useGameStore((s) => s.resetProgress);
  const setTab = useGameStore((s) => s.setTab);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const [lang, setLangState] = useState(i18n.language?.startsWith("en") ? "en" : "ru");

  const setLang = (lng: "ru" | "en") => {
    void i18n.changeLanguage(lng);
    setLangState(lng);
    try {
      localStorage.setItem(LANG_KEY, lng);
    } catch {
      /* ignore */
    }
  };

  const onToggleSound = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) {
      resumeAudio();
      playPurchase(); // короткий сэмпл — слышно, что звук включился
    }
  };

  const onSave = () => {
    saveNow();
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1800);
  };

  const onReset = () => {
    resetProgress();
    setConfirmingReset(false);
    setTab("game");
  };

  return (
    <div className="settings-panel">
      <h2 className="settings-title">Настройки</h2>

      <section className="settings-section">
        <h3 className="settings-section-title">Сохранение</h3>
        <p className="settings-hint">
          Прогресс сохраняется автоматически каждые 10 секунд и при закрытии
          вкладки. Можно сохранить вручную прямо сейчас.
        </p>
        <button type="button" className="settings-btn" onClick={onSave}>
          {savedFlash ? "Сохранено ✓" : "Сохранить сейчас"}
        </button>
      </section>

      <section className="settings-section">
        <h3 className="settings-section-title">Язык / Language</h3>
        <p className="settings-hint">
          Переключение языка интерфейса. Часть текстов пока только на русском —
          перевод дополняется.
        </p>
        <div className="settings-lang">
          <button
            type="button"
            className={lang === "ru" ? "settings-btn is-active" : "settings-btn settings-btn-ghost"}
            onClick={() => setLang("ru")}
          >
            Русский
          </button>
          <button
            type="button"
            className={lang === "en" ? "settings-btn is-active" : "settings-btn settings-btn-ghost"}
            onClick={() => setLang("en")}
          >
            English
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h3 className="settings-section-title">Звук</h3>
        <p className="settings-hint">
          Тонкие процедурные эффекты: поглощение материи, покупки, события,
          сжатие. Громкость намеренно низкая.
        </p>
        <button type="button" className="settings-btn" onClick={onToggleSound}>
          {muted ? "Звук: выкл 🔇" : "Звук: вкл 🔊"}
        </button>
      </section>

      <section className="settings-section settings-danger">
        <h3 className="settings-section-title">Опасная зона</h3>
        <p className="settings-hint">
          Полный сброс удалит весь прогресс: массу, улучшения, престиж, планеты
          и достижения. Сгенерируется новая вселенная. Действие необратимо.
        </p>
        {confirmingReset ? (
          <div className="settings-confirm">
            <p className="settings-confirm-text">
              Точно сбросить весь прогресс? Это нельзя отменить.
            </p>
            <div className="settings-confirm-actions">
              <button
                type="button"
                className="settings-btn settings-btn-danger"
                onClick={onReset}
              >
                Да, сбросить всё
              </button>
              <button
                type="button"
                className="settings-btn settings-btn-ghost"
                onClick={() => setConfirmingReset(false)}
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="settings-btn settings-btn-danger"
            onClick={() => setConfirmingReset(true)}
          >
            Сбросить весь прогресс
          </button>
        )}
      </section>

      <p className="settings-version">Версия {APP_VERSION}</p>
    </div>
  );
}
