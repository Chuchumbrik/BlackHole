import i18n from "../../i18n";
import { starGravityMul } from "../balance";
import { ANOMALY_DEFS } from "./anomalies";
import type { StarSystem } from "./types";

/** Подсказка над звездой на canvas (Pixi Text). */
export function buildStarHoverText(system: StarSystem): string {
  const base = i18n.t("star.hover.body", {
    name: system.name,
    starClass: system.starClass,
    planets: system.planets.length,
  });
  const lines = [base];
  if (system.anomaly) {
    const a = ANOMALY_DEFS[system.anomaly];
    lines.push(`${a.legendary ? "✦ " : "⟡ "}${a.name}: ${a.desc}`);
  }
  const grown = system.starMassMp ?? 0;
  if (grown > 0) {
    lines.push(
      `Масса звезды: ×${starGravityMul(grown).toFixed(2)} (растёт, поглощая тела)`,
    );
  }
  return lines.join("\n");
}
