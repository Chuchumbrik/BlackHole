import {
  BASE_GRAVITY_ACCEL,
  GRAVITY_CONST,
  GRAVITY_FIELD_BLEND_IN_FRAC,
  GRAVITY_FIELD_BLEND_OUT_FRAC,
  GRAVITY_SOFTENING,
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
import type { PlanetPhysicsSnapshot } from "./world/planetLayout";

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
  /** Радиус тела (px) для столкновений и отрисовки; по умолчанию KIND_RADIUS[kind]. */
  radiusPx?: number;
  /** Сид формы многоугольника. */
  shapeSeed?: number;
  /** Радиан/с вращение силуэта на экране. */
  spinRate?: number;
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

export function objRadius(o: SimObject): number {
  return o.radiusPx ?? KIND_RADIUS[o.kind];
}

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
/**
 * Стартовая скорость объекта на ободе: смещена ВНУТРЬ системы (к центру) с
 * угловым разбросом, чтобы тела действительно влетали в систему и проходили
 * зону притяжения, а не разлетались наружу (иначе ранний захват почти нулевой).
 */
function randomBoundaryVelocity(
  fromX: number,
  fromY: number,
  centerX: number,
  centerY: number,
): { vx: number; vy: number } {
  const inward = Math.atan2(centerY - fromY, centerX - fromX);
  const spread = (Math.random() - 0.5) * 1.7; // ±~0.85 рад
  const dir = inward + spread;
  const speed = 12 + Math.random() * 34;
  return { vx: Math.cos(dir) * speed, vy: Math.sin(dir) * speed };
}

export function spawnOutsideGravity(
  layout: SimLayout,
  upgradeLevels: UpgradeLevels,
): SimObject {
  const kind = rollObjectKind(upgradeLevels);
  const baseR = KIND_RADIUS[kind];
  const sizeU =
    kind === 3 ? 0.62 + Math.random() * 0.58 : 0.45 + Math.random() * 0.95;
  const radiusPx = Math.max(2.2, Math.round(baseR * sizeU * 10) / 10);
  const sizeMul = Math.pow(radiusPx / baseR, 1.22);
  const mpValue = rollMpForKind(kind, sizeMul);
  const spawnAngle = Math.random() * Math.PI * 2;
  const r = layout.systemRadius;
  const x = layout.star.x + Math.cos(spawnAngle) * r;
  const y = layout.star.y + Math.sin(spawnAngle) * r;
  const { vx, vy } = randomBoundaryVelocity(x, y, layout.bh.x, layout.bh.y);
  const id = nextId++;
  const mass =
    OBJECT_MASS[kind] * Math.pow(Math.max(0.35, radiusPx / baseR), 2.2);
  const shapeSeed = Math.floor(Math.random() * 1_000_000_000);
  const spinRate = (Math.random() < 0.5 ? -1 : 1) * (0.28 + Math.random() * 2.4);

  return {
    id,
    kind,
    displayName: buildObjectDisplayName(kind, id),
    x,
    y,
    vx,
    vy,
    mass,
    mpValue,
    radiusPx,
    shapeSeed,
    spinRate,
  };
}

export function spawnShip(layout: SimLayout): SimObject {
  const q = rollShipQualities();
  const baseR = KIND_RADIUS[4];
  const sizeU = 0.55 + Math.random() * 0.65;
  const radiusPx = Math.max(3.5, Math.round(baseR * sizeU * 10) / 10);
  const sizeMul = Math.pow(radiusPx / baseR, 1.15);
  const mpValue = rollMpForKind(4, sizeMul);
  const spawnAngle = Math.random() * Math.PI * 2;
  const r = layout.systemRadius;
  const x = layout.star.x + Math.cos(spawnAngle) * r;
  const y = layout.star.y + Math.sin(spawnAngle) * r;
  const { vx, vy } = randomBoundaryVelocity(x, y, layout.bh.x, layout.bh.y);
  const id = nextId++;
  const mass = OBJECT_MASS[4] * Math.pow(Math.max(0.4, radiusPx / baseR), 2);
  const shapeSeed = Math.floor(Math.random() * 1_000_000_000);
  const spinRate = (Math.random() < 0.5 ? -1 : 1) * (0.15 + Math.random() * 0.9);

  return {
    id,
    kind: 4,
    displayName: buildObjectDisplayName(4, id),
    x,
    y,
    vx,
    vy,
    mass,
    mpValue,
    radiusPx,
    shapeSeed,
    spinRate,
    thrust01: q.thrust01,
    pilot01: q.pilot01,
    shipEnteredGravity: false,
  };
}

/**
 * Корабль-«дань»: цивилизованная планета запускает его в космос (целит к дыре
 * со спредом). Часть таких кораблей захватывается дырой → пассивный MP. Это
 * диегетическое обоснование дани (ты видишь поток ракет от планеты к дыре).
 */
export function spawnTributeShip(
  x: number,
  y: number,
  bhX: number,
  bhY: number,
): SimObject {
  const q = rollShipQualities();
  const baseR = KIND_RADIUS[4];
  const sizeU = 0.5 + Math.random() * 0.5;
  const radiusPx = Math.max(3, Math.round(baseR * sizeU * 10) / 10);
  const sizeMul = Math.pow(radiusPx / baseR, 1.15);
  const mpValue = rollMpForKind(4, sizeMul);
  const ang = Math.atan2(bhY - y, bhX - x) + (Math.random() - 0.5) * 0.7;
  const speed = 46 + Math.random() * 40;
  const id = nextId++;
  const mass = OBJECT_MASS[4] * Math.pow(Math.max(0.4, radiusPx / baseR), 2);
  return {
    id,
    kind: 4,
    displayName: buildObjectDisplayName(4, id),
    x,
    y,
    vx: Math.cos(ang) * speed,
    vy: Math.sin(ang) * speed,
    mass,
    mpValue,
    radiusPx,
    shapeSeed: Math.floor(Math.random() * 1_000_000_000),
    spinRate: (Math.random() < 0.5 ? -1 : 1) * (0.2 + Math.random() * 1.1),
    thrust01: q.thrust01 * 0.5, // слабее тяга — больше шанс захвата (это «дань»)
    pilot01: q.pilot01 * 0.5,
    shipEnteredGravity: false,
  };
}

/**
 * Выброс обломков при разрушении планеты (столкновение планет). Осколки летят
 * наружу из точки разрушения и затем могут быть захвачены/поглощены дырой.
 */
export function spawnDebrisBurst(
  x: number,
  y: number,
  count: number,
): SimObject[] {
  const out: SimObject[] = [];
  for (let i = 0; i < count; i++) {
    const kind = Math.random() < 0.55 ? 1 : 2;
    const baseR = KIND_RADIUS[kind];
    const sizeU = 0.6 + Math.random() * 1.1;
    const radiusPx = Math.max(2.2, Math.round(baseR * sizeU * 10) / 10);
    const sizeMul = Math.pow(radiusPx / baseR, 1.22);
    const mpValue = rollMpForKind(kind, sizeMul);
    const dir = (i / Math.max(1, count)) * Math.PI * 2 + Math.random() * 0.6;
    const speed = 38 + Math.random() * 78;
    const id = nextId++;
    const mass =
      OBJECT_MASS[kind] * Math.pow(Math.max(0.35, radiusPx / baseR), 2.2);
    out.push({
      id,
      kind,
      displayName: buildObjectDisplayName(kind, id),
      x: x + Math.cos(dir) * 3,
      y: y + Math.sin(dir) * 3,
      vx: Math.cos(dir) * speed,
      vy: Math.sin(dir) * speed,
      mass,
      mpValue,
      radiusPx,
      shapeSeed: Math.floor(Math.random() * 1_000_000_000),
      spinRate: (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 2.6),
    });
  }
  return out;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge1 <= edge0) return x >= edge1 ? 1 : 0;
  const u = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return u * u * (3 - 2 * u);
}

/**
 * Множитель к ньютоновскому полю дыры: 1 у центра зоны, плавно к OUTSIDE_GRAVITY_RATIO
 * за пределами `gravityRadius` (без скачка на границе кольца).
 */
export function bhGravityFieldStrength(
  distFromBh: number,
  layout: SimLayout,
): number {
  const g = Math.max(layout.gravityRadius, 1e-6);
  const lo = g * GRAVITY_FIELD_BLEND_IN_FRAC;
  const hi = g * GRAVITY_FIELD_BLEND_OUT_FRAC;
  const t = smoothstep(lo, hi, distFromBh);
  return OUTSIDE_GRAVITY_RATIO + (1 - OUTSIDE_GRAVITY_RATIO) * (1 - t);
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
  const accel = GRAVITY_CONST * source.mass * invSq * ratio;
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
  | {
      kind: "consumed";
      mp: number;
      objectKind: ObjectKind;
      /** Для предпросмотра траекторий и отладки. */
      via?: "horizon" | "star" | "planet" | "body";
      /** id планеты при via:"planet" — для отката развития. */
      planetId?: string;
      atX: number;
      atY: number;
    }
  | { kind: "escaped" };

/** id планеты, в поверхность которой врезался объект, иначе null. */
function hitsPlanetSurface(
  obj: SimObject,
  planets: PlanetPhysicsSnapshot[],
): string | null {
  for (const p of planets) {
    const d = Math.hypot(obj.x - p.x, obj.y - p.y);
    if (d < p.surfaceRadius + objRadius(obj)) return p.id;
  }
  return null;
}

/** Один шаг интегрирования — общая логика для симуляции и предпросмотра траектории. */
export function advanceObjectOneStep(
  obj: SimObject,
  layout: SimLayout,
  dt: number,
  upgradeLevels: UpgradeLevels,
  planetInfluences: PlanetPhysicsSnapshot[] = [],
): StepOutcome {
  const dx = layout.bh.x - obj.x;
  const dy = layout.bh.y - obj.y;
  const dist = Math.hypot(dx, dy) || 1e-6;

  if (dist < layout.horizonRadius) {
    return {
      kind: "consumed",
      mp: obj.mpValue,
      objectKind: obj.kind,
      via: "horizon",
      atX: obj.x,
      atY: obj.y,
    };
  }

  const distStar0 =
    Math.hypot(obj.x - layout.star.x, obj.y - layout.star.y) || 1e-6;
  if (distStar0 < layout.starCollisionRadius) {
    return {
      kind: "consumed",
      mp: 0,
      objectKind: obj.kind,
      via: "star",
      atX: obj.x,
      atY: obj.y,
    };
  }

  let nvx = obj.vx;
  let nvy = obj.vy;
  let nx = dx / dist;
  let ny = dy / dist;

  if (dist > layout.horizonRadius) {
    const bhField = bhGravityFieldStrength(dist, layout);
    const bhGravity = applyBodyGravity(
      { ...obj, vx: nvx, vy: nvy },
      { x: layout.bh.x, y: layout.bh.y, mass: layout.bhMass },
      dt,
      bhField,
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

    for (const pl of planetInfluences) {
      const pdx = pl.x - obj.x;
      const pdy = pl.y - obj.y;
      const pr = Math.hypot(pdx, pdy) || 1e-6;
      if (pr < pl.soiRadius && pr >= pl.surfaceRadius - 0.5) {
        const pg = applyBodyGravity(
          { ...obj, vx: nvx, vy: nvy },
          { x: pl.x, y: pl.y, mass: pl.mass },
          dt,
          0.82,
        );
        nvx = pg.vx;
        nvy = pg.vy;
      }
    }

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

  if (newDist < layout.horizonRadius) {
    return {
      kind: "consumed",
      mp: obj.mpValue,
      objectKind: obj.kind,
      via: "horizon",
      atX: newX,
      atY: newY,
    };
  }

  if (planetInfluences.length > 0) {
    const probe = { ...obj, x: newX, y: newY };
    const hitPlanetId = hitsPlanetSurface(probe, planetInfluences);
    if (hitPlanetId) {
      return {
        kind: "consumed",
        mp: 0,
        objectKind: obj.kind,
        via: "planet",
        planetId: hitPlanetId,
        atX: newX,
        atY: newY,
      };
    }
  }

  const distStar1 =
    Math.hypot(newX - layout.star.x, newY - layout.star.y) || 1e-6;
  if (distStar1 < layout.starCollisionRadius) {
    return {
      kind: "consumed",
      mp: 0,
      objectKind: obj.kind,
      via: "star",
      atX: newX,
      atY: newY,
    };
  }

  if (obj.kind === 4) {
    let entered = obj.shipEnteredGravity ?? false;
    if (newDist < layout.gravityRadius * 0.97) {
      entered = true;
    }
    if (entered && newDist > layout.gravityRadius * 1.04) {
      return { kind: "escaped" };
    }
    const rShipStar = Math.hypot(
      newX - layout.star.x,
      newY - layout.star.y,
    );
    if (rShipStar > layout.systemRadius * 1.02) {
      return { kind: "escaped" };
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
    return { kind: "escaped" };
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

/** Витки вокруг звезды и вокруг дыры независимо (счётчик для UI). */
function applyOrbitLapTracking(
  prev: SimObject,
  layout: SimLayout,
  live: SimObject,
): { obj: SimObject } {
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
    /** Снимок планет: гравитация внутри SOI и столкновение с поверхностью. */
    planetSnapshots?: PlanetPhysicsSnapshot[];
  },
): TrajectoryPreviewResult {
  const maxSec = options?.maxSeconds ?? TRAJECTORY_PREVIEW_MAX_SIM_SECONDS;
  const stepDt = options?.stepSeconds ?? TRAJECTORY_PREVIEW_STEP_SECONDS;
  const maxPoints = options?.maxPoints ?? TRAJECTORY_PREVIEW_MAX_POINTS;
  const others = options?.othersSnapshot;
  const planets = options?.planetSnapshots ?? [];

  let o: SimObject = { ...start };
  const pts: { x: number; y: number }[] = [{ x: o.x, y: o.y }];
  let t = 0;
  let endsWithBodyCollision = false;

  while (t < maxSec && pts.length < maxPoints) {
    const r = advanceObjectOneStep(o, layout, stepDt, upgradeLevels, planets);
    if (r.kind !== "live") {
      if (r.kind === "consumed" && r.via === "planet") {
        endsWithBodyCollision = true;
      }
      break;
    }
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

export type ConsumeEvent = {
  objectId: number;
  /** MP в валюту: только при поглощении горизонтом; 0 — звезда или столкновение тел. */
  mp: number;
  kind: ObjectKind;
  via?: "horizon" | "star" | "planet" | "body";
  /** id планеты при via:"planet" — для отката развития. */
  planetId?: string;
  atX?: number;
  atY?: number;
};

/** Центр–центр: сумма радиусов тел. */
function bodySeparationMin(a: SimObject, b: SimObject): number {
  return objRadius(a) + objRadius(b);
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
 * В валюту MP не идёт (только горизонт); в событиях mp: 0.
 * Вызывается после шага интегрирования по гравитации / горизонту / звезде.
 */
export function resolveBodyCollisions(objects: SimObject[]): {
  survivors: SimObject[];
  consumed: ConsumeEvent[];
} {
  const n = objects.length;
  if (n < 2) return { survivors: objects, consumed: [] };

  const killed = new Set<number>();
  const hitPos = new Map<number, { x: number; y: number }>();

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = objects[i];
      const b = objects[j];
      if (killed.has(a.id) || killed.has(b.id)) continue;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist < bodySeparationMin(a, b)) {
        killed.add(a.id);
        killed.add(b.id);
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        hitPos.set(a.id, { x: mx, y: my });
        hitPos.set(b.id, { x: mx, y: my });
      }
    }
  }

  if (killed.size === 0) return { survivors: objects, consumed: [] };

  const consumed: ConsumeEvent[] = [];
  const survivors: SimObject[] = [];
  for (const o of objects) {
    if (killed.has(o.id)) {
      const hp = hitPos.get(o.id);
      consumed.push({
        objectId: o.id,
        mp: 0,
        kind: o.kind,
        via: "body",
        atX: hp?.x ?? o.x,
        atY: hp?.y ?? o.y,
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
  planetInfluences: PlanetPhysicsSnapshot[] = [],
): {
  objects: SimObject[];
  consumed: ConsumeEvent[];
} {
  const consumed: ConsumeEvent[] = [];
  const next: SimObject[] = [];

  for (const obj of objects) {
    const r = advanceObjectOneStep(obj, layout, dt, upgradeLevels, planetInfluences);
    if (r.kind === "consumed") {
      consumed.push({
        objectId: obj.id,
        mp: r.mp,
        kind: r.objectKind,
        via: r.via,
        planetId: r.planetId,
        atX: r.atX,
        atY: r.atY,
      });
      continue;
    }
    if (r.kind === "escaped") {
      continue;
    }
    const { obj: withOrbit } = applyOrbitLapTracking(obj, layout, r.obj);
    next.push(withOrbit);
  }

  const { survivors, consumed: bodyHits } = resolveBodyCollisions(next);
  consumed.push(...bodyHits);

  return { objects: survivors, consumed };
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
