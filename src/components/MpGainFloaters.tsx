import { useTranslation } from "react-i18next";
import { useGameStore } from "../store/useGameStore";

export function MpGainFloaters() {
  const { t, i18n } = useTranslation();
  const floaters = useGameStore((s) => s.mpGainFloaters);
  const dismiss = useGameStore((s) => s.dismissMpGainFloater);

  const locale =
    i18n.language?.startsWith("ru") ? "ru-RU" : undefined;

  return (
    <div className="mp-gain-floater-layer" aria-hidden>
      {floaters.map((e, i) => (
        <span
          key={e.id}
          className="mp-gain-floater"
          style={{
            animationDelay: `${Math.min(i * 52, 260)}ms`,
          }}
          onAnimationEnd={() => dismiss(e.id)}
        >
          {t("app.mpGainFloater", {
            value: e.amount.toLocaleString(locale),
          })}
        </span>
      ))}
    </div>
  );
}
