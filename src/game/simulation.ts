import {
  BASE_GRAVITY_ACCEL,
  GRAVITY_CONST,
  GRAVITY_SOFTENING,
  ESCAPE_MP_BASE,
  MAX_OBJECTS_ON_FIELD,
  OBJECT_MASS,
  OUTSIDE_GRAVITY_RATIO,
  SHIP_SPAWN_FRACTION,
  SHIP_THRUST_BASE,
  VELOCITY_DAMPING,
  type ObjectKind,
} from "./balance";
import { KIND_RADIUS } from "./colors";
import type { UpgradeLevels } from "./upgrades";
import { shipThrustMultiplierFromLevels } from "./upgrades";
import { buildObjectDisplayName } from "./objectNames";
import { rollMpForKind, rollObjectKind, rollShipQualities } from "./rng";

export type SimObject = {
  id: number;
  kind: ObjectKind;
  /** Подпись при выборе (тип + программный позывной). */
  displayName: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  mpValue: number;
  /** Накопленный азимутальный ход относительно звезды (рад, со знаком) — для витков. */
  _orbitStarAccumRad?: number;
  /** То же относительно центра чёрной дыры. */
  _orbitBhAccumRad?: number;
  /** Полных орбитальных витков вокруг звезды (накопительно). */
  orbitLapsStar?: number;
  /** Полных витков вокруг чёрной дыры (накопительно). */
  orbitLapsBh?: number;
  /** Корабль (kind 4): множители при спавне */
  thrust01?: number;
  pilot01?: number;
  /** Корабль: уже был глубже зоны гравитации — нужно для побега наружу */
  shipEnteredGravity?: boolean;
};

export type SimLayout = {
  width: number;
  height: number;
  /** Радиус горизонта событий (пиксели). */
  horizonRadius: number;
  /** Зона действия гравитации дыры (пиксели). */
  gravityRadius: number;
  /** Ускорение к центру (пикс/с²), с учётом улучшения «Эффективность». */
  gravityAccel: number;
  /** Эффективная масса чёрной дыры в формулах 1/r². */
  bhMass: number;
  /** Центральная звезда — якорь системы (центр масс по ТЗ v1.5). */
  star: { x: number; y: number; mass: number };
  /** Положение чёрной дыры на периферии системы. */
  bh: { x: number; y: number };
  /** Внешняя граница системы: спавн на окружности, побег за пределы. */
  systemRadius: number;
  /** Условная «фотосфера»: столкновение = поглощение звездой. */
  starCollisionRadius: number;
};

let nextId = 1;

export function resetSimulationIds(): void {
  nextId = 1;
}

/** Случайная скорость при спавне на границе системы (направление и модуль рандом). */
function randomBoundaryVelocity(): { vx: number; vy: number } {
  const dir = Math.random() * Math.PI * 2;
  const speed = 12 + Math.random() * 34;
  return { vx: Math.cos(dir) * speed, vy: Math.sin(dir) * speed };
}

export function spawnOutsideGravity(
  layout: SimLayout,
  upgradeLevels: UpgradeLevels,
): SimObject {
  const kind = rollObjectKind(upgradeLevels);
  const mpValue = rollMpForKind(kind);
  const spawnAngle = Math.random() * Math.PI * 2;
  const r = layout.systemRadius;
  const x = layout.star.x + Math.cos(spawnAngle) * r;
  const y = layout.star.y + Math.sin(spawnAngle) * r;
  const { vx, vy } = randomBoundaryVelocity();
  const id = nextId++;

  return {
    id,
    kind,
    displayName: buildObjectDisplayName(kind, id),
    x,
    y,
    vx,
    vy,
    mass: OBJECT_MASS[kind],
    mpValue,
  };
}

export function spawnShip(layout: SimLayout): SimObject {
  const q = rollShipQualities();
  const mpValue = rollMpForKind(4);
  const spawnAngle = Math.random() * Math.PI * 2;
  const r = layout.systemRadius;
  const x = layout.star.x + Math.cos(spawnAngle) * r;
  const y = layout.star.y + Math.sin(spawnAngle) * r;
  const { vx, vy } = randomBoundaryVelocity();
  const id = nextId++;

  return {
    id,
    kind: 4,
    displayName: buildObjectDisplayName(4, id),
    x,
    y,
    vx,
    vy,
    mass: OBJECT_MASS[4],
    mpValue,
    thrust01: q.thrust01,
    pilot01: q.pilot01,
    shipEnteredGravity: false,
  };
}

function applyBodyGravity(
  obj: SimObject,
  source: { x: number; y: number; mass: number },
  dt: number,
  ratio = 1,
): { vx: number; vy: number; dist: number; nx: number; ny: number } {
  const dx = source.x - obj.x;
  const dy = source.y - obj.y;
  const dist = Math.hypot(dx, dy) || 1e-6;
  const nx = dx / dist;
  const ny = dy / dist;
  const invSq = 1 / (dist * dist + GRAVITY_SOFTENING);
  const accel =
    GRAVITY_CONST * source.mass * obj.mass * invSq * ratio;
  return {
    vx: obj.vx + nx * accel * dt,
    vy: obj.vy + ny * accel * dt,
    dist,
    nx,
    ny,
  };
}

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

export type StepOutcome =
  | { kind: "live"; obj: SimObject }
  | { kind: "consumed"; mp: number; objectKind: ObjectKind }
  | { kind: "escaped"; bonusMp: number };

/** Один шаг интегрирования — общая логика для симуляции и предпросмотра траектории. */
export function advanceObjectOneStep(
  obj: SimObject,
  layout: SimLayout,
  dt: number,
  upgradeLevels: UpgradeLevels,
): StepOutcome {
  const dx = layout.bh.x - obj.x;
  const dy = layout.bh.y - obj.y;
  const dist = Math.hypot(dx, dy) || 1e-6;

  if (dist < layout.horizonRadius) {
    return {
      kind: "consumed",
      mp: obj.mpValue,
      objectKind: obj.kind,
    };
  }

  const distStar0 =
    Math.hypot(obj.x - layout.star.x, obj.y - layout.star.y) || 1e-6;
  if (distStar0 < layout.starCollisionRadius) {
    return {
      kind: "consumed",
      mp: obj.mpValue,
      objectKind: obj.kind,
    };
  }

  let nvx = obj.vx;
  let nvy = obj.vy;
  let nx = dx / dist;
  let ny = dy / dist;

  if (dist > layout.horizonRadius) {
    const outsideRatio =
      dist < layout.gravityRadius ? 1 : OUTSIDE_GRAVITY_RATIO;
    const bhGravity = applyBodyGravity(
      { ...obj, vx: nvx, vy: nvy },
      { x: layout.bh.x, y: layout.bh.y, mass: layout.bhMass },
      dt,
      outsideRatio,
    );
    nvx = bhGravity.vx;
    nvy = bhGravity.vy;
    nx = bhGravity.nx;
    ny = bhGravity.ny;

    const starGravity = applyBodyGravity(
      { ...obj, vx: nvx, vy: nvy },
      layout.star,
      dt,
      0.9,
    );
    nvx = starGravity.vx;
    nvy = starGravity.vy;

    const effRatio =
      layout.gravityAccel > 0
        ? layout.gravityAccel / BASE_GRAVITY_ACCEL
        : 1;
    nvx = obj.vx + (nvx - obj.vx) * effRatio;
    nvy = obj.vy + (nvy - obj.vy) * effRatio;

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
  const newDx = layout.bh.x - newX;
  const newDy = layout.bh.y - newY;
  const newDist = Math.hypot(newDx, newDy) || 1e-6;

  const distStar1 =
    Math.hypot(newX - layout.star.x, newY - layout.star.y) || 1e-6;
  if (distStar1 < layout.starCollisionRadius) {
    return {
      kind: "consumed",
      mp: obj.mpValue,
      objectKind: obj.kind,
    };
  }

  if (obj.kind === 4) {
    let entered = obj.shipEnteredGravity ?? false;
    if (newDist < layout.gravityRadius * 0.97) {
      entered = true;
    }
    if (entered && newDist > layout.gravityRadius * 1.04) {
      const pilot = obj.pilot01 ?? 1;
      return {
        kind: "escaped",
        bonusMp: Math.floor(ESCAPE_MP_BASE * pilot),
      };
    }
    const rShipStar = Math.hypot(
      newX - layout.star.x,
      newY - layout.star.y,
    );
    if (rShipStar > layout.systemRadius * 1.02) {
      const pilot = obj.pilot01 ?? 1;
      return {
        kind: "escaped",
        bonusMp: Math.floor(ESCAPE_MP_BASE * pilot),
      };
    }
    return {
      kind: "live",
      obj: {
        ...obj,
        x: newX,
        y: newY,
        vx: nvx,
        vy: nvy,
        shipEnteredGravity: entered,
      },
    };
  }

  const rFromStar = Math.hypot(
    newX - layout.star.x,
    newY - layout.star.y,
  );
  if (rFromStar > layout.systemRadius * 1.02) {
    return { kind: "escaped", bonusMp: 0 };
  }

  return {
    kind: "live",
    obj: {
      ...obj,
      x: newX,
      y: newY,
      vx: nvx,
      vy: nvy,
    },
  };
}

function unwrapAngleDelta(fromRad: number, toRad: number): number {
  let d = toRad - fromRad;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

/** Один центр: накопление signed winding за шаг; полные обороты 2π. */
function windingAccumulate(
  prevAccum: number | undefined,
  thetaStart: number,
  thetaEnd: number,
): { accum: number; lapsCompleted: number } {
  const d = unwrapAngleDelta(thetaStart, thetaEnd);
  let accum = prevAccum ?? 0;
  accum += d;
  let lapsCompleted = 0;
  while (accum >= 2 * Math.PI) {
    accum -= 2 * Math.PI;
    lapsCompleted++;
  }
  while (accum <= -2 * Math.PI) {
    accum += 2 * Math.PI;
    lapsCompleted++;
  }
  return { accum, lapsCompleted };
}

/** Витки вокруг звезды и вокруг дыры независимо (награда за каждый полный 2π). */
function applyOrbitLapTracking(
  prev: SimObject,
  layout: SimLayout,
  live: SimObject,
): { obj: SimObject; lapsCompleted: number } {
  const nx = live.x;
  const ny = live.y;
  const ts = Math.atan2(prev.y - layout.star.y, prev.x - layout.star.x);
  const te = Math.atan2(ny - layout.star.y, nx - layout.star.x);
  const ws = windingAccumulate(prev._orbitStarAccumRad, ts, te);

  const bs = Math.atan2(prev.y - layout.bh.y, prev.x - layout.bh.x);
  const be = Math.atan2(ny - layout.bh.y, nx - layout.bh.x);
  const wb = windingAccumulate(prev._orbitBhAccumRad, bs, be);

  return {
    obj: {
      ...live,
      _orbitStarAccumRad: ws.accum,
      _orbitBhAccumRad: wb.accum,
      orbitLapsStar: (prev.orbitLapsStar ?? 0) + ws.lapsCompleted,
      orbitLapsBh: (prev.orbitLapsBh ?? 0) + wb.lapsCompleted,
    },
    lapsCompleted: ws.lapsCompleted + wb.lapsCompleted,
  };
}

/** Верхние границы предпросмотра — для орбит без «конца» (не улетает и не поглощается). */
const TRAJECTORY_PREVIEW_MAX_SIM_SECONDS = 900;
/** Должно хватать на \`maxSeconds\` при текущем шаге: \(900 / 0.034 \approx 26471\) плюс запас. */
const TRAJECTORY_PREVIEW_MAX_POINTS = 32000;
const TRAJECTORY_PREVIEW_STEP_SECONDS = 0.034;

export type TrajectoryPreviewResult = {
  points: { x: number; y: number }[];
  /** Траектория оборвалась из‑за пересечения с телом из \`othersSnapshot\`. */
  endsWithBodyCollision: boolean;
};

/**
 * Точки предпросмотра траектории (тот же шаг интегрирования, что и в симуляции).
 * Идёт до **терминального события**: поглощение горизонтом/звездой, побег за систему (и для корабля —
 * свои правила в \`advanceObjectOneStep\`), при \`othersSnapshot\` — до **столкновения** с другим телом
 * (позиции «чужих» тел не двигаются — снимок на момент построения предпросмотра), либо до лимита времени/точек.
 */
export function predictTrajectoryPoints(
  start: SimObject,
  layout: SimLayout,
  upgradeLevels: UpgradeLevels,
  options?: {
    maxSeconds?: number;
    stepSeconds?: number;
    maxPoints?: number;
    /** Снимок прочих объектов для проверки столкновений (как \`resolveBodyCollisions\`). */
    othersSnapshot?: SimObject[];
  },
): TrajectoryPreviewResult {
  const maxSec = options?.maxSeconds ?? TRAJECTORY_PREVIEW_MAX_SIM_SECONDS;
  const stepDt = options?.stepSeconds ?? TRAJECTORY_PREVIEW_STEP_SECONDS;
  const maxPoints = options?.maxPoints ?? TRAJECTORY_PREVIEW_MAX_POINTS;
  const others = options?.othersSnapshot;

  let o: SimObject = { ...start };
  const pts: { x: number; y: number }[] = [{ x: o.x, y: o.y }];
  let t = 0;
  let endsWithBodyCollision = false;

  while (t < maxSec && pts.length < maxPoints) {
    const r = advanceObjectOneStep(o, layout, stepDt, upgradeLevels);
    if (r.kind !== "live") break;
    o = r.obj;
    if (others && hitsOtherBody(o, others)) {
      pts.push({ x: o.x, y: o.y });
      endsWithBodyCollision = true;
      break;
    }
    pts.push({ x: o.x, y: o.y });
    t += stepDt;
  }
  return { points: pts, endsWithBodyCollision };
}

export type ConsumeEvent = { objectId: number; mp: number; kind: ObjectKind };

export type EscapeEvent = {
  objectId: number;
  bonusMp: number;
};

/** Центр–центр: сумма радиусов спрайтов (\`KIND_RADIUS\` — половина стороны квадрата). */
function bodySeparationMin(a: SimObject, b: SimObject): number {
  return KIND_RADIUS[a.kind] + KIND_RADIUS[b.kind];
}

/** Пересечение с любым другим телом из снимка (то же условие, что у столкновений на поле). */
function hitsOtherBody(self: SimObject, others: SimObject[]): boolean {
  for (const b of others) {
    if (b.id === self.id) continue;
    const dist = Math.hypot(self.x - b.x, self.y - b.y);
    if (dist < bodySeparationMin(self, b)) return true;
  }
  return false;
}

/**
 * Столкновение тел друг с другом (фаза «уничтожение обоих»; дробление — позже).
 * Вызывается после шага интегрирования по гравитации / горизонту / звезде.
 */
export function resolveBodyCollisions(objects: SimObject[]): {
  survivors: SimObject[];
  consumed: ConsumeEvent[];
} {
  const n = objects.length;
  if (n < 2) return { survivors: objects, consumed: [] };

  const killed = new Set<number>();

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = objects[i];
      const b = objects[j];
      if (killed.has(a.id) || killed.has(b.id)) continue;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist < bodySeparationMin(a, b)) {
        killed.add(a.id);
        killed.add(b.id);
      }
    }
  }

  if (killed.size === 0) return { survivors: objects, consumed: [] };

  const consumed: ConsumeEvent[] = [];
  const survivors: SimObject[] = [];
  for (const o of objects) {
    if (killed.has(o.id)) {
      consumed.push({
        objectId: o.id,
        mp: o.mpValue,
        kind: o.kind,
      });
    } else {
      survivors.push(o);
    }
  }
  return { survivors, consumed };
}

export function stepSimulation(
  objects: SimObject[],
  layout: SimLayout,
  dt: number,
  upgradeLevels: UpgradeLevels,
): {
  objects: SimObject[];
  consumed: ConsumeEvent[];
  escaped: EscapeEvent[];
  /** Сколько полных орбитальных витков завершено за этот шаг (звезда + дыра). */
  orbitLapsCompleted: number;
} {
  const consumed: ConsumeEvent[] = [];
  const escaped: EscapeEvent[] = [];
  const next: SimObject[] = [];
  let orbitLapsCompleted = 0;

  for (const obj of objects) {
    const r = advanceObjectOneStep(obj, layout, dt, upgradeLevels);
    if (r.kind === "consumed") {
      consumed.push({
        objectId: obj.id,
        mp: r.mp,
        kind: r.objectKind,
      });
      continue;
    }
    if (r.kind === "escaped") {
      escaped.push({
        objectId: obj.id,
        bonusMp: r.bonusMp,
      });
      continue;
    }
    const { obj: withOrbit, lapsCompleted } = applyOrbitLapTracking(
      obj,
      layout,
      r.obj,
    );
    orbitLapsCompleted += lapsCompleted;
    next.push(withOrbit);
  }

  const { survivors, consumed: bodyHits } = resolveBodyCollisions(next);
  consumed.push(...bodyHits);

  return { objects: survivors, consumed, escaped, orbitLapsCompleted };
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
  options: { shipsUnlocked: boolean; upgradeLevels: UpgradeLevels },
): SimObject[] {
  const result = [...objects];
  for (let i = 0; i < count; i++) {
    if (result.length >= MAX_OBJECTS_ON_FIELD) break;
    const ship =
      options.shipsUnlocked && Math.random() < SHIP_SPAWN_FRACTION;
    result.push(
      ship ? spawnShip(layout) : spawnOutsideGravity(layout, options.upgradeLevels),
    );
  }
  return result;
}

/** Импульс скорости всех тел к центру дыры (релятивистские джеты). */
export function applyJetImpulseToObjects(
  objects: SimObject[],
  layout: SimLayout,
  impulseSpeed: number,
): void {
  for (const o of objects) {
    const dx = layout.bh.x - o.x;
    const dy = layout.bh.y - o.y;
    const dist = Math.hypot(dx, dy) || 1e-6;
    if (dist < layout.horizonRadius) continue;
    const nx = dx / dist;
    const ny = dy / dist;
    o.vx += nx * impulseSpeed;
    o.vy += ny * impulseSpeed;
  }
}
