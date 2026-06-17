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
 * Доля учёта взаимного притяжения планет в орбитальной динамике. Масса планеты
 * задана крупной ради её SOI-поглощения материи; в орбитальной задаче такая масса
 * делала бы соседей сильнее звезды и разносила орбиты в хаос. Поэтому орбиты
 * определяются звездой и (растущей) дырой; взаимное притяжение — почти отключено.
 */
const PLANET_MUTUAL_FACTOR = 0;

/** Сумма ускорений на тело в точке (x,y): звезда + дыра (+ слабое взаимное). */
function netAccel(
  x: number,
  y: number,
  selfId: string | null,
  star: GravitySource,
  bh: GravitySource | null,
  bodies: ReadonlyArray<{ id: string; x: number; y: number; mass: number }>,
  out: { ax: number; ay: number },
): void {
  out.ax = 0;
  out.ay = 0;
  accelToward(x, y, star, out);
  if (bh) accelToward(x, y, bh, out);
  if (PLANET_MUTUAL_FACTOR > 0) {
    const tmp = { ax: 0, ay: 0 };
    for (const o of bodies) {
      if (o.id === selfId) continue;
      tmp.ax = 0;
      tmp.ay = 0;
      accelToward(x, y, o, tmp);
      out.ax += tmp.ax * PLANET_MUTUAL_FACTOR;
      out.ay += tmp.ay * PLANET_MUTUAL_FACTOR;
    }
  }
}

/**
 * Засеять тела планет: позиция — из существующей геометрии (`buildPlanetPhysicsSnapshot`
 * при t=0), скорость — такая, что РАДИАЛЬНАЯ (к звезде) компонента чистого ускорения
 * (звезда + дыра + соседи) точно уравновешивается центростремительным членом v²/r.
 * Это даёт нулевой радиальный дрейф на старте независимо от дыры; её тангенциальная
 * компонента далее медленно прецессирует/возмущает орбиту — как и задумано.
 */
export function seedPlanetBodies(
  planets: Planet[],
  ctx: PlanetLayoutContext,
  star: GravitySource,
  bh: GravitySource | null = null,
): PlanetBody[] {
  const n = planets.length;
  // 1) позиции и массы всех тел (нужны до расчёта скоростей — для взаимной гравитации).
  const seeds = planets.map((pl, i) => {
    const s = buildPlanetPhysicsSnapshot(pl, ctx, 0, i, n);
    return { id: pl.id, x: s.x, y: s.y, mass: s.mass, surfaceRadius: s.surfaceRadius };
  });
  // 2) скорость из радиальной компоненты чистого ускорения.
  const acc = { ax: 0, ay: 0 };
  return seeds.map((b) => {
    const dx = b.x - star.x;
    const dy = b.y - star.y;
    const r = Math.hypot(dx, dy) || 1e-6;
    const rxu = dx / r;
    const ryu = dy / r;
    netAccel(b.x, b.y, b.id, star, bh, seeds, acc);
    // компонента ускорения, направленная К звезде (положительная = внутрь).
    const aInward = -(acc.ax * rxu + acc.ay * ryu);
    const vCirc = Math.sqrt(Math.max(0, aInward) * r);
    // Тангенциальное направление (против часовой) — перпендикуляр к радиусу.
    const tx = -dy / r;
    const ty = dx / r;
    return {
      id: b.id,
      x: b.x,
      y: b.y,
      vx: tx * vCirc,
      vy: ty * vCirc,
      mass: b.mass,
      surfaceRadius: b.surfaceRadius,
    };
  });
}

/**
 * Симплектическая интеграция (leapfrog, kick-drift-kick) с адаптивными суб-шагами.
 * Источники: звезда + дыра + взаимная гравитация планет. В отличие от явного Эйлера,
 * leapfrog сохраняет энергию орбиты — планеты не «скручиваются» на звезду и не
 * улетают со временем даже при ускорении ×10. Число суб-шагов растёт с dt.
 */
export function integratePlanetBodies(
  bodies: PlanetBody[],
  star: GravitySource,
  bh: GravitySource,
  dt: number,
  substeps?: number,
): void {
  if (dt <= 0 || bodies.length === 0) return;
  const steps =
    substeps ?? Math.min(64, Math.max(4, Math.ceil(dt / 0.02)));
  const h = dt / steps;
  const n = bodies.length;
  const ax = new Array<number>(n);
  const ay = new Array<number>(n);
  const acc = { ax: 0, ay: 0 };
  const computeAcc = () => {
    for (let i = 0; i < n; i++) {
      const b = bodies[i];
      netAccel(b.x, b.y, b.id, star, bh, bodies, acc);
      ax[i] = acc.ax;
      ay[i] = acc.ay;
    }
  };
  for (let s = 0; s < steps; s++) {
    computeAcc();
    for (let i = 0; i < n; i++) {
      bodies[i].vx += 0.5 * h * ax[i];
      bodies[i].vy += 0.5 * h * ay[i];
    }
    for (let i = 0; i < n; i++) {
      bodies[i].x += h * bodies[i].vx;
      bodies[i].y += h * bodies[i].vy;
    }
    computeAcc();
    for (let i = 0; i < n; i++) {
      bodies[i].vx += 0.5 * h * ax[i];
      bodies[i].vy += 0.5 * h * ay[i];
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
