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
  planetIndex: number,
  totalPlanets: number,
  /** Если задано — позиция берётся отсюда (динамическое тело), иначе кинематика. */
  posOverride?: { x: number; y: number },
): PlanetPhysicsSnapshot {
  const orbitMin = ctx.horizonRadius * 4.5;
  const orbitMax = Math.max(orbitMin + 12, ctx.systemRadius * 0.85);
  const slotFrac =
    totalPlanets > 0 ? (planetIndex + 0.42) / Math.max(1, totalPlanets) : 0.5;
  const paramFrac = Math.max(0, Math.min(1, planet.orbitalDistance / 100));
  const orbitBlend = slotFrac * 0.62 + paramFrac * 0.38;
  const orbitRadius = orbitMin + (orbitMax - orbitMin) * orbitBlend;
  const angle = planet.orbitPhaseRad + simTimeSec * planet.orbitSpeed;
  const x = posOverride ? posOverride.x : ctx.starX + Math.cos(angle) * orbitRadius;
  const y = posOverride ? posOverride.y : ctx.starY + Math.sin(angle) * orbitRadius;
  const soiRadius =
    ctx.horizonRadius *
    (1.45 + (planet.gravityProxy / 100) * 1.45 + (planet.atmosphere / 100) * 0.6);
  const baseSurf = Math.max(2.3, soiRadius * 0.18);
  const surfaceRadius = baseSurf * planet.radiusScale;
  const mass =
    38_000 *
    Math.pow(Math.max(0.15, planet.gravityProxy / 50), 1.15) *
    Math.pow(Math.max(0.35, planet.radiusScale), 0.9);

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
  /** Позиции динамических тел по id (если планеты интегрируются физикой). */
  posById?: Map<string, { x: number; y: number }>,
): Planet | null {
  let best: { planet: Planet; d: number } | null = null;
  const n = planets.length;
  for (let planetIndex = 0; planetIndex < planets.length; planetIndex++) {
    const planet = planets[planetIndex];
    const s = buildPlanetPhysicsSnapshot(
      planet,
      ctx,
      simTimeSec,
      planetIndex,
      n,
      posById?.get(planet.id),
    );
    const hitR = Math.max(s.surfaceRadius * 2.2, 14);
    const d = Math.hypot(wx - s.x, wy - s.y);
    if (d < hitR && (!best || d < best.d)) {
      best = { planet, d };
    }
  }
  return best?.planet ?? null;
}
