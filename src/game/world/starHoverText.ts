import i18n from "../../i18n";
import type { StarSystem } from "./types";

/** Подсказка над звездой на canvas (Pixi Text). */
export function buildStarHoverText(system: StarSystem): string {
  return i18n.t("star.hover.body", {
    name: system.name,
    starClass: system.starClass,
    planets: system.planets.length,
  });
}
