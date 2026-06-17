import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../store/useGameStore";
import { levelSum } from "../game/upgrades";

const APP_VERSION = __APP_VERSION__;

const TITLE_MIN = 4;
const TITLE_MAX = 120;
const DESC_MIN = 10;
const DESC_MAX = 4000;

type FeedbackType = "bug" | "improvement" | "other";
type Status = "idle" | "submitting" | "success" | "error";

/** Краткий снимок состояния игрока для отчёта (только по согласию). */
function buildStateSnapshot(): string {
  const s = useGameStore.getState();
  return [
    `version=${APP_VERSION}`,
    `massMp=${Math.floor(s.massMp)}`,
    `upgradeSum=${levelSum(s.upgradeLevels)}`,
    `prestigePoints=${s.prestigePoints}`,
    `gameTimeSec=${Math.floor(s.gameTimeSec)}`,
    `mpUpgrades=${Object.keys(s.mpUpgradeLevels).length}`,
    `achievements=${s.achievementsUnlocked.length}`,
  ].join(" ");
}

function buildEnvContext(): string {
  const scr =
    typeof window !== "undefined"
      ? `${window.screen?.width}x${window.screen?.height} dpr${window.devicePixelRatio ?? 1}`
      : "n/a";
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "n/a";
  return `app=${APP_VERSION}\nscreen=${scr}\nua=${ua}`;
}

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [includeSnapshot, setIncludeSnapshot] = useState(true);
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  const titleTrim = title.trim();
  const descTrim = description.trim();
  const titleValid = titleTrim.length >= TITLE_MIN && titleTrim.length <= TITLE_MAX;
  const descValid = descTrim.length >= DESC_MIN && descTrim.length <= DESC_MAX;
  const canSubmit = titleValid && descValid && status !== "submitting";

  useEffect(() => {
    if (!open) return;
    titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const reset = () => {
    setTitle("");
    setDescription("");
    setType("bug");
    setStatus("idle");
    setResultUrl(null);
    setErrorMsg("");
    setHoneypot("");
  };

  const submit = async () => {
    if (!canSubmit) return;
    setStatus("submitting");
    setErrorMsg("");
    const context =
      buildEnvContext() +
      (includeSnapshot ? `\nstate: ${buildStateSnapshot()}` : "");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title: titleTrim,
          description: descTrim,
          context,
          company: honeypot, // honeypot — должно быть пусто
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        url?: string | null;
      };
      if (res.ok && data.ok) {
        setResultUrl(data.url ?? null);
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMsg(
          res.status === 422
            ? "Проверьте поля: заголовок и описание слишком короткие."
            : "Не удалось отправить. Попробуйте позже.",
        );
      }
    } catch {
      setStatus("error");
      setErrorMsg("Сеть недоступна. Попробуйте позже.");
    }
  };

  return (
    <>
      <button
        type="button"
        className="feedback-fab"
        title="Сообщить о баге или предложить улучшение"
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        ?
      </button>

      {open && (
        <div
          className="feedback-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Обратная связь"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="feedback-card">
            <div className="feedback-head">
              <h3>Обратная связь</h3>
              <button
                type="button"
                className="feedback-close"
                aria-label="Закрыть"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>

            {status === "success" ? (
              <div className="feedback-success">
                <p>Спасибо! Обращение отправлено.</p>
                {resultUrl && (
                  <a href={resultUrl} target="_blank" rel="noreferrer">
                    Открыть на GitHub
                  </a>
                )}
                <button
                  type="button"
                  className="feedback-submit"
                  onClick={() => setOpen(false)}
                >
                  Готово
                </button>
              </div>
            ) : (
              <>
                <label className="feedback-label">
                  Тип
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as FeedbackType)}
                    disabled={status === "submitting"}
                  >
                    <option value="bug">Баг</option>
                    <option value="improvement">Улучшение</option>
                    <option value="other">Другое</option>
                  </select>
                </label>

                <label className="feedback-label">
                  Заголовок
                  <input
                    ref={titleRef}
                    type="text"
                    value={title}
                    maxLength={TITLE_MAX}
                    placeholder="Кратко суть"
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={status === "submitting"}
                  />
                  <span className="feedback-counter">
                    {titleTrim.length}/{TITLE_MAX}
                    {!titleValid && titleTrim.length > 0 && (
                      <em className="feedback-err"> · мин. {TITLE_MIN}</em>
                    )}
                  </span>
                </label>

                <label className="feedback-label">
                  Описание
                  <textarea
                    value={description}
                    maxLength={DESC_MAX}
                    rows={5}
                    placeholder="Что произошло / что предлагаете. Для бага — как воспроизвести."
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={status === "submitting"}
                  />
                  <span className="feedback-counter">
                    {descTrim.length}/{DESC_MAX}
                    {!descValid && descTrim.length > 0 && (
                      <em className="feedback-err"> · мин. {DESC_MIN}</em>
                    )}
                  </span>
                </label>

                <label className="feedback-checkbox">
                  <input
                    type="checkbox"
                    checked={includeSnapshot}
                    onChange={(e) => setIncludeSnapshot(e.target.checked)}
                    disabled={status === "submitting"}
                  />
                  Приложить снимок состояния (масса, уровни, PP — ускоряет разбор)
                </label>

                {/* honeypot — скрыт от людей, ловит ботов */}
                <input
                  type="text"
                  className="feedback-hp"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  aria-hidden="true"
                />

                {status === "error" && (
                  <p className="feedback-error-msg">{errorMsg}</p>
                )}

                <button
                  type="button"
                  className="feedback-submit"
                  disabled={!canSubmit}
                  onClick={submit}
                >
                  {status === "submitting" ? "Отправка…" : "Отправить"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
