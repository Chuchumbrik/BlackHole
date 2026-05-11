import {
  ESCAPE_MP_BASE,
  MAX_OBJECTS_ON_FIELD,
  OUTSIDE_GRAVITY_RATIO,
  SHIP_SPAWN_FRACTION,
  SHIP_THRUST_BASE,
  VELOCITY_DAMPING,
  type ObjectKind,
} from "./balance";
import type { UpgradeLevels } from "./upgrades";
import { shipThrustMultiplierFromLevels } from "./upgrades";
import { rollMpForKind, rollObjectKind, rollShipQualities } from "./rng";

export type SimObject = {
  id: number;
  kind: ObjectKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  mpValue: number;
  /** Корабль (kind 4): множители при спавне */
  thrust01?: number;
  pilot01?: number;
  /** Корабль: уже был глубже зоны гравитации — нужно для побега наружу */
  shipEnteredGravity?: boolean;
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
  /** Ускорение к центру (пикс/с²), с учётом улучшения «Эффективность». */
  gravityAccel: number;
};

/**
 * Притяжение к центру для объектов вне горизонта.
 * Снаружи `gravityRadius` тянем слабее, но ненулевым — иначе объекты,
 * заспавненные по кольцу за пределами зоны (по ТЗ), никогда не входят в поле силы.
 */

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

export function spawnShip(layout: SimLayout): SimObject {
  const q = rollShipQualities();
  const mpValue = rollMpForKind(4);
  const angle = Math.random() * Math.PI * 2;
  const halfMin = Math.min(layout.width, layout.height) / 2 - 12;
  const minDist = layout.gravityRadius * 1.06;
  let maxDist = Math.max(halfMin * 0.92, minDist + 80);
  if (maxDist <= minDist) maxDist = minDist + 120;
  const dist = minDist + Math.random() * (maxDist - minDist);
  const x = layout.cx + Math.cos(angle) * dist;
  const y = layout.cy + Math.sin(angle) * dist;
  const tangential = 22 + Math.random() * 48;
  const vx = -Math.sin(angle) * tangential;
  const vy = Math.cos(angle) * tangential;

  return {
    id: nextId++,
    kind: 4,
    x,
    y,
    vx,
    vy,
    mpValue,
    thrust01: q.thrust01,
    pilot01: q.pilot01,
    shipEnteredGravity: false,
  };
}

export type ConsumeEvent = { objectId: number; mp: number; kind: ObjectKind };

export type EscapeEvent = {
  objectId: number;
  bonusMp: number;
};

function outwardThrustAccel(
  obj: SimObject,
  levels: UpgradeLevels,
): number {
  const t = obj.thrust01 ?? 1;
  const p = obj.pilot01 ?? 1;
  return (
    SHIP_THRUST_BASE *
    t *
    p *
    shipThrustMultiplierFromLevels(levels)
  );
}

/**
 * Один шаг симуляции: притяжение, для кораблей — тяга наружу; побег при выходе из зоны после входа;
 * поглощение при r < horizonRadius.
 */
export function stepSimulation(
  objects: SimObject[],
  layout: SimLayout,
  dt: number,
  upgradeLevels: UpgradeLevels,
): {
  objects: SimObject[];
  consumed: ConsumeEvent[];
  escaped: EscapeEvent[];
} {
  const consumed: ConsumeEvent[] = [];
  const escaped: EscapeEvent[] = [];
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
          ? layout.gravityAccel
          : layout.gravityAccel * OUTSIDE_GRAVITY_RATIO;
      nvx += nx * strength * dt;
      nvy += ny * strength * dt;

      if (obj.kind === 4) {
        const thrust = outwardThrustAccel(obj, upgradeLevels);
        nvx -= nx * thrust * dt;
        nvy -= ny * thrust * dt;
      }
    }

    nvx *= VELOCITY_DAMPING;
    nvy *= VELOCITY_DAMPING;

    const newX = obj.x + nvx * dt;
    const newY = obj.y + nvy * dt;
    const newDx = layout.cx - newX;
    const newDy = layout.cy - newY;
    const newDist = Math.hypot(newDx, newDy) || 1e-6;

    if (obj.kind === 4) {
      let entered = obj.shipEnteredGravity ?? false;
      if (newDist < layout.gravityRadius * 0.97) {
        entered = true;
      }
      if (
        entered &&
        newDist > layout.gravityRadius * 1.04
      ) {
        const pilot = obj.pilot01 ?? 1;
        escaped.push({
          objectId: obj.id,
          bonusMp: Math.floor(ESCAPE_MP_BASE * pilot),
        });
        continue;
      }
      next.push({
        ...obj,
        x: newX,
        y: newY,
        vx: nvx,
        vy: nvy,
        shipEnteredGravity: entered,
      });
      continue;
    }

    next.push({
      ...obj,
      x: newX,
      y: newY,
      vx: nvx,
      vy: nvy,
    });
  }

  return { objects: next, consumed, escaped };
}

export type SpawnControl = {
  accum: number;
};

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
  options: { shipsUnlocked: boolean },
): SimObject[] {
  const result = [...objects];
  for (let i = 0; i < count; i++) {
    if (result.length >= MAX_OBJECTS_ON_FIELD) break;
    const ship =
      options.shipsUnlocked && Math.random() < SHIP_SPAWN_FRACTION;
    result.push(ship ? spawnShip(layout) : spawnOutsideGravity(layout));
  }
  return result;
}
