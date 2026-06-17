/**
 * V1: ненавязчивый онбординг-указатель на первую покупку. Появляется, когда у
 * новичка уже хватает MP на первый апгрейд, но он ещё ничего не купил. Гасится
 * при открытии «Улучшений», первой покупке или явном закрытии; флаг — в
 * localStorage, чтобы не возвращаться. Подсветку самой вкладки задаёт App.
 */
type Props = {
  onOpenUpgrades: () => void;
  onDismiss: () => void;
};

export function OnboardingCta({ onOpenUpgrades, onDismiss }: Props) {
  return (
    <div className="onboarding-cta" role="status">
      <span className="onboarding-cta-text">
        Хватает на первое улучшение — прокачайте дыру, чтобы расширить зону
        захвата.
      </span>
      <button
        type="button"
        className="onboarding-cta-action"
        onClick={onOpenUpgrades}
      >
        Открыть «Улучшения»
      </button>
      <button
        type="button"
        className="onboarding-cta-close"
        aria-label="Скрыть подсказку"
        onClick={onDismiss}
      >
        ×
      </button>
    </div>
  );
}
