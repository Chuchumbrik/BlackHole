/**
 * Prestige («Сжатие»): коллапс рана ради постоянной валюты PP, ускоряющей
 * следующие заходы. Формула из obsidian/03; порог снижен под реальный темп
 * MVP (Q-R1) — калибруется на балансовом проходе (фаза G).
 */
export const PRESTIGE_THRESHOLD_MP = 1000;

/** Сколько PP даст сжатие при текущей массе (0, если ниже порога). */
export function ppFromMass(massMp: number): number {
  if (massMp < PRESTIGE_THRESHOLD_MP) return 0;
  return Math.floor(Math.sqrt(massMp / 1000));
}
