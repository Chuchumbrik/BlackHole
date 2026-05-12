import type { Planet } from "./types";

/** Коридор орбитальной дистанции (0–100) как грубая обитаемая зона по классу звезды. */
export function habitableZoneBand(starClass: string): {
  low: number;
  high: number;
} {
  const c = starClass.trim().toUpperCase().charAt(0);
  switch (c) {
    case "F":
      return { low: 38, high: 78 };
    case "G":
      return { low: 28, high: 68 };
    case "K":
      return { low: 18, high: 55 };
    case "M":
      return { low: 8, high: 38 };
    default:
      return { low: 22, high: 62 };
  }
}

export function inHabitableZone(
  starClass: string,
  orbitalDistance: number,
): boolean {
  const b = habitableZoneBand(starClass);
  return orbitalDistance >= b.low && orbitalDistance <= b.high;
}

/** Эвристика: близкая орбита и сильная самогравитация тела. */
export function likelyTidalLocked(planet: Planet): boolean {
  return planet.orbitalDistance <= 28 && planet.gravityProxy >= 45;
}
