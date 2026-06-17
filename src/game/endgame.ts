/**
 * Эндшпиль (мета поверх престижа): энтропия копится с каждым сжатием; при пороге
 * доступно «Уничтожение Вселенной» — мета-сброс ради Ultimate Points (UP) и New
 * Game+. UP дают вечный множитель дохода и переживают всё, кроме полного сброса.
 * Ultimate Prestige — после нескольких NG+ (нарративный финал).
 *
 * Числа — стартовая калибровка (obsidian/16 §8), уточняются плейтестом.
 */

/** Прирост энтропии за одно сжатие. */
export const ENTROPY_PER_PRESTIGE = 1;
/** Порог энтропии для «Уничтожения Вселенной» (≈50–100 сжатий из GDD). */
export const ENTROPY_THRESHOLD = 50;
/** Сколько New Game+ нужно для разблокировки Ultimate Prestige (финал). */
export const ULTIMATE_NG_REQUIRED = 3;

export function canDestroyUniverse(entropy: number): boolean {
  return entropy >= ENTROPY_THRESHOLD;
}

/** Сколько UP даст Уничтожение: по суммарным PP и числу пройденных порогов энтропии. */
export function upFromDestruction(lifetimePp: number, entropy: number): number {
  const fromPp = Math.floor(Math.sqrt(Math.max(0, lifetimePp) / 100));
  const fromEntropy = Math.floor(Math.max(0, entropy) / ENTROPY_THRESHOLD);
  return Math.max(1, fromPp + fromEntropy);
}

/** Вечный множитель дохода MP от накопленных Ultimate Points (аддитивно, мягко). */
export function ultimateMpMul(up: number): number {
  return 1 + 0.25 * Math.max(0, up);
}

/** Достигнут ли Ultimate Prestige (финальная веха). */
export function ultimateReached(newGamePlusCount: number): boolean {
  return newGamePlusCount >= ULTIMATE_NG_REQUIRED;
}
