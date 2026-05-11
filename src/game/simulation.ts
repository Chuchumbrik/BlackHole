import { MAX_OBJECTS_ON_FIELD } from "./balance";
import type { ObjectKind } from "./balance";
import { rollMpForKind, rollObjectKind } from "./rng";

export type SimObject = {
  id: number;
  kind: ObjectKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  mpValue: number;
};

export type SimLayout = {
  cx: number;
  cy: number;
  width: number;
  height: number;
  /** Радиус горизонта событий (пиксели). */
  horizonRadius: number;
  /** Зона действия гравитации (пиксели). */
  gravityRadius: number;
};

/**
 * Притяжение к центру для объектов вне горизонта.
 * Снаружи `gravityRadius` тянем слабее, но ненулевым — иначе объекты,
 * заспавненные по кольцу за пределами зоны (по ТЗ), никогда не входят в поле силы.
 */
const GRAVITY_ACCEL = 2200;
/** Доля ускорения, когда объект ещё за пределами `gravityRadius`, но уже «видит» дыру. */
const OUTSIDE_GRAVITY_RATIO = 0.52;
const VELOCITY_DAMPING = 0.997;

let nextId = 1;

export function resetSimulationIds(): void {
  nextId = 1;
}

export function spawnOutsideGravity(layout: SimLayout): SimObject {
  const kind = rollObjectKind();
  const mpValue = rollMpForKind(kind);
  const angle = Math.random() * Math.PI * 2;
  const halfMin = Math.min(layout.width, layout.height) / 2 - 12;
  const minDist = layout.gravityRadius * 1.06;
  let maxDist = Math.max(halfMin * 0.92, minDist + 80);
  if (maxDist <= minDist) maxDist = minDist + 120;
  const dist = minDist + Math.random() * (maxDist - minDist);
  const x = layout.cx + Math.cos(angle) * dist;
  const y = layout.cy + Math.sin(angle) * dist;
  const tangential = 20 + Math.random() * 55;
  const vx = -Math.sin(angle) * tangential;
  const vy = Math.cos(angle) * tangential;

  return {
    id: nextId++,
    kind,
    x,
    y,
    vx,
    vy,
    mpValue,
  };
}

export type ConsumeEvent = { objectId: number; mp: number; kind: ObjectKind };

/**
 * Один шаг симуляции: притяжение к центру (внутри зоны — полное, снаружи — ослабленное),
 * поглощение при r < horizonRadius.
 * dt — секунды игрового времени (не кадра напрямую).
 */
export function stepSimulation(
  objects: SimObject[],
  layout: SimLayout,
  dt: number,
): { objects: SimObject[]; consumed: ConsumeEvent[] } {
  const consumed: ConsumeEvent[] = [];
  const next: SimObject[] = [];

  for (const obj of objects) {
    const dx = layout.cx - obj.x;
    const dy = layout.cy - obj.y;
    const dist = Math.hypot(dx, dy) || 1e-6;

    if (dist < layout.horizonRadius) {
      consumed.push({
        objectId: obj.id,
        mp: obj.mpValue,
        kind: obj.kind,
      });
      continue;
    }

    let nvx = obj.vx;
    let nvy = obj.vy;

    if (dist > layout.horizonRadius) {
      const nx = dx / dist;
      const ny = dy / dist;
      const strength =
        dist < layout.gravityRadius
          ? GRAVITY_ACCEL
          : GRAVITY_ACCEL * OUTSIDE_GRAVITY_RATIO;
      nvx += nx * strength * dt;
      nvy += ny * strength * dt;
    }

    nvx *= VELOCITY_DAMPING;
    nvy *= VELOCITY_DAMPING;

    next.push({
      ...obj,
      x: obj.x + nvx * dt,
      y: obj.y + nvy * dt,
      vx: nvx,
      vy: nvy,
    });
  }

  return { objects: next, consumed };
}

export type SpawnControl = {
  accum: number;
};

/** Накопитель спавна: привязан к игровому времени, не к FPS. */
export function advanceSpawnAccumulator(
  control: SpawnControl,
  dt: number,
  spawnRatePerSecond: number,
): number {
  control.accum += dt * spawnRatePerSecond;
  let spawns = 0;
  while (control.accum >= 1) {
    control.accum -= 1;
    spawns += 1;
  }
  return spawns;
}

export function trySpawn(
  objects: SimObject[],
  layout: SimLayout,
  count: number,
): SimObject[] {
  const result = [...objects];
  for (let i = 0; i < count; i++) {
    if (result.length >= MAX_OBJECTS_ON_FIELD) break;
    result.push(spawnOutsideGravity(layout));
  }
  return result;
}
