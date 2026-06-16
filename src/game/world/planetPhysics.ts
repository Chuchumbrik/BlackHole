/**
 * Физика планет как ДИНАМИЧЕСКИХ тел (Фаза P).
 *
 * Раньше планеты были кинематическими (`angle = phase + t·ω` в `planetLayout`).
 * Здесь они — тела с позицией и скоростью, интегрируемые под настоящей
 * гравитацией: звезда ↔ планеты ↔ дыра. Орбита возникает из массы звезды
 * (vis-viva), а рост массы дыры её возмущает и в пределе разрушает.
 *
 * Чистый модуль (без Pixi/React/стора) — подключается в `GameCanvas`.
 */
import { GRAVITY_CONST, GRAVITY_SOFTENING } from "../balance";
import type { Planet } from "./types";
import {
  buildPlanetPhysicsSnapshot,
  type PlanetLayoutContext,
} from "./planetLayout";

export type PlanetBody = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  surfaceRadius: number;
};

export type GravitySource = { x: number; y: number; mass: number };

/** Ускорение к источнику по тому же закону, что и в `simulation.ts` (a ∝ GM/(r²+soft)). */
function accelToward(
  x: number,
  y: number,
  src: GravitySource,
  out: { ax: number; ay: number },
): void {
  const dx = src.x - x;
  const dy = src.y - y;
  const dist = Math.hypot(dx, dy) || 1e-6;
  const invSq = 1 / (dist * dist + GRAVITY_SOFTENING);
  const a = GRAVITY_CONST * src.mass * invSq;
  out.ax += (dx / dist) * a;
  out.ay += (dy / dist) * a;
}

/**
 * Засеять тела планет: позиция — из существующей геометрии (`buildPlanetPhysicsSnapshot`
 * при t=0), скорость — круговая орбита вокруг звезды (с учётом смягчения поля).
 */
export function seedPlanetBodies(
  planets: Planet[],
  ctx: PlanetLayoutContext,
  star: GravitySource,
): PlanetBody[] {
  const n = planets.length;
  return planets.map((pl, i) => {
    const s = buildPlanetPhysicsSnapshot(pl, ctx, 0, i, n);
    const dx = s.x - star.x;
    const dy = s.y - star.y;
    const r = Math.hypot(dx, dy) || 1e-6;
    // v² / r = a_центр = GM·r/(r²+soft) → v для круговой орбиты под смягчённым полем.
    const vCirc = Math.sqrt(
      (GRAVITY_CONST * star.mass * r) / (r * r + GRAVITY_SOFTENING),
    );
    // Тангенциальное направление (против часовой) — перпендикуляр к радиусу.
    const tx = -dy / r;
    const ty = dx / r;
    return {
      id: pl.id,
      x: s.x,
      y: s.y,
      vx: tx * vCirc,
      vy: ty * vCirc,
      mass: s.mass,
      surfaceRadius: s.surfaceRadius,
    };
  });
}

/**
 * Полу-неявный Эйлер с суб-шагами. Источники: звезда + дыра + взаимная гравитация
 * планет. Суб-шаги нужны для стабильности при ускорении времени (×10).
 */
export function integratePlanetBodies(
  bodies: PlanetBody[],
  star: GravitySource,
  bh: GravitySource,
  dt: number,
  substeps = 4,
): void {
  if (dt <= 0 || bodies.length === 0) return;
  const h = dt / Math.max(1, substeps);
  const acc = { ax: 0, ay: 0 };
  for (let step = 0; step < substeps; step++) {
    for (const b of bodies) {
      acc.ax = 0;
      acc.ay = 0;
      accelToward(b.x, b.y, star, acc);
      accelToward(b.x, b.y, bh, acc);
      for (const other of bodies) {
        if (other === b) continue;
        accelToward(b.x, b.y, other, acc);
      }
      b.vx += acc.ax * h;
      b.vy += acc.ay * h;
    }
    for (const b of bodies) {
      b.x += b.vx * h;
      b.y += b.vy * h;
    }
  }
}

/** Пары планет, пересёкшихся поверхностями → кандидаты на разрушение. */
export function detectPlanetCollisions(bodies: PlanetBody[]): Array<[string, string]> {
  const hits: Array<[string, string]> = [];
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i];
      const b = bodies[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < a.surfaceRadius + b.surfaceRadius) hits.push([a.id, b.id]);
    }
  }
  return hits;
}

/**
 * Оценка нестабильности орбиты 0..1: насколько гравитация дыры конкурирует
 * с гравитацией звезды в точке планеты. >~0.35 — орбита под угрозой (предупреждение игроку).
 */
export function orbitInstability(
  body: PlanetBody,
  star: GravitySource,
  bh: GravitySource,
): number {
  const aStar = accelMag(body, star);
  const aBh = accelMag(body, bh);
  const sum = aStar + aBh;
  return sum > 0 ? aBh / sum : 0;
}

function accelMag(p: { x: number; y: number }, src: GravitySource): number {
  const dx = src.x - p.x;
  const dy = src.y - p.y;
  const dist = Math.hypot(dx, dy) || 1e-6;
  return (GRAVITY_CONST * src.mass) / (dist * dist + GRAVITY_SOFTENING);
}

/** Порог нестабильности, при котором показываем предупреждение. */
export const ORBIT_INSTABILITY_WARN = 0.35;
