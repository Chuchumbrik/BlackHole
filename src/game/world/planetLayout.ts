import type { Planet } from "./types";

/** Минимальный контекст геометрии без импорта `SimLayout` (избегаем циклических зависимостей). */
export type PlanetLayoutContext = {
  starX: number;
  starY: number;
  horizonRadius: number;
  systemRadius: number;
};

export type PlanetPhysicsSnapshot = {
  id: string;
  x: number;
  y: number;
  /** Масса для 1/r² внутри SOI (условные единицы, согласована с `GRAVITY_CONST`). */
  mass: number;
  soiRadius: number;
  surfaceRadius: number;
};

export function planetContextFromSimLayout(layout: {
  star: { x: number; y: number };
  horizonRadius: number;
  systemRadius: number;
}): PlanetLayoutContext {
  return {
    starX: layout.star.x,
    starY: layout.star.y,
    horizonRadius: layout.horizonRadius,
    systemRadius: layout.systemRadius,
  };
}

export function buildPlanetPhysicsSnapshot(
  planet: Planet,
  ctx: PlanetLayoutContext,
  simTimeSec: number,
): PlanetPhysicsSnapshot {
  const orbitMin = ctx.horizonRadius * 4.5;
  const orbitMax = Math.max(orbitMin + 12, ctx.systemRadius * 0.85);
  const orbitRadius =
    orbitMin +
    (orbitMax - orbitMin) * Math.max(0, Math.min(1, planet.orbitalDistance / 100));
  const angle = planet.orbitPhaseRad + simTimeSec * planet.orbitSpeed;
  const x = ctx.starX + Math.cos(angle) * orbitRadius;
  const y = ctx.starY + Math.sin(angle) * orbitRadius;
  const soiRadius =
    ctx.horizonRadius *
    (1.45 + (planet.gravityProxy / 100) * 1.45 + (planet.atmosphere / 100) * 0.6);
  const surfaceRadius = Math.max(2.3, soiRadius * 0.18);
  const mass = 38_000 * Math.pow(Math.max(0.15, planet.gravityProxy / 50), 1.15);

  return {
    id: planet.id,
    x,
    y,
    mass,
    soiRadius,
    surfaceRadius,
  };
}

export function pickPlanetAtWorld(
  wx: number,
  wy: number,
  planets: Planet[],
  ctx: PlanetLayoutContext,
  simTimeSec: number,
): Planet | null {
  let best: { planet: Planet; d: number } | null = null;
  for (const planet of planets) {
    const s = buildPlanetPhysicsSnapshot(planet, ctx, simTimeSec);
    const hitR = Math.max(s.surfaceRadius * 2.2, 14);
    const d = Math.hypot(wx - s.x, wy - s.y);
    if (d < hitR && (!best || d < best.d)) {
      best = { planet, d };
    }
  }
  return best?.planet ?? null;
}
