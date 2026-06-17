/**
 * Критические события жизни планеты («замороченная» жизнь): редкие потрясения,
 * откатывающие развитие — кислородная катастрофа (фильтр зарождения), супервулкан,
 * ядерная война развитой цивилизации. Дополняют удары астероидов (поле) и делают
 * путь к цивилизации тернистым (GDD §6.4). Чистая логика (rand инъектируется).
 */
import { PLANET_CIV_STAGE_SEC, PLANET_LIFE_EMERGENCE_TOTAL_SEC } from "../balance/planetTuning";
import type { Planet } from "./types";

export type CritEventKind =
  | "oxygen_catastrophe"
  | "supervolcano"
  | "nuclear_war";

export type CritEventResult = {
  planet: Planet;
  event?: { kind: CritEventKind; name: string };
};

/** Базовая частота крит-события (в секунду) для подверженной планеты. */
export const CRIT_EVENT_RATE_PER_SEC = 0.004;

function clamp01to100(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/**
 * Возможное крит-событие за шаг dtSec. `rand` — источник случайности [0,1).
 * Возвращает (возможно) изменённую планету и описание события.
 */
export function rollCritEvent(
  planet: Planet,
  dtSec: number,
  rand: () => number = Math.random,
): CritEventResult {
  if (dtSec <= 0) return { planet };
  // Подвержены: с зарождающейся/состоявшейся жизнью.
  const emerging = !planet.lifeBorn && planet.lifeEmergenceSec > 0;
  if (!planet.lifeBorn && !emerging) return { planet };
  if (rand() >= CRIT_EVENT_RATE_PER_SEC * dtSec) return { planet };

  // Выбор события по состоянию планеты.
  const candidates: CritEventKind[] = [];
  if (emerging) candidates.push("oxygen_catastrophe");
  candidates.push("supervolcano");
  if (planet.civLevel >= 2) candidates.push("nuclear_war");
  const kind = candidates[Math.floor(rand() * candidates.length)];

  switch (kind) {
    case "oxygen_catastrophe":
      // Великий фильтр: откат зарождения жизни на треть.
      return {
        planet: {
          ...planet,
          lifeEmergenceSec: Math.max(
            0,
            planet.lifeEmergenceSec - PLANET_LIFE_EMERGENCE_TOTAL_SEC * 0.33,
          ),
        },
        event: { kind, name: "Кислородная катастрофа" },
      };
    case "supervolcano":
      // Геология/температура качаются, биосфера слабеет.
      return {
        planet: {
          ...planet,
          geologicalActivity: clamp01to100(planet.geologicalActivity + 18),
          surfaceTemperature: clamp01to100(planet.surfaceTemperature + 8),
          mpYieldMult: Math.max(0.22, planet.mpYieldMult * 0.92),
        },
        event: { kind, name: "Сверхвулканизм" },
      };
    case "nuclear_war":
      // Цивилизация отбрасывается на тир назад.
      return {
        planet: {
          ...planet,
          civProgressSec: Math.max(
            0,
            planet.civProgressSec - PLANET_CIV_STAGE_SEC,
          ),
          civLevel: Math.max(0, planet.civLevel - 1),
          mpYieldMult: Math.max(0.22, planet.mpYieldMult * 0.9),
        },
        event: { kind, name: "Ядерная война" },
      };
  }
}
