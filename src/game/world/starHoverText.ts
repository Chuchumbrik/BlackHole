import i18n from "../../i18n";
import { starGravityMul } from "../balance";
import type { StarSystem } from "./types";

/** Подсказка над звездой на canvas (Pixi Text). */
export function buildStarHoverText(system: StarSystem): string {
  const base = i18n.t("star.hover.body", {
    name: system.name,
    starClass: system.starClass,
    planets: system.planets.length,
  });
  const grown = system.starMassMp ?? 0;
  if (grown > 0) {
    return `${base}\nМасса звезды: ×${starGravityMul(grown).toFixed(2)} (растёт, поглощая тела)`;
  }
  return base;
}
