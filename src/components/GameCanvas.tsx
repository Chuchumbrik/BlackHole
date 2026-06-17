import {
  Application,
  BlurFilter,
  Container,
  Graphics,
  Text,
} from "pixi.js";
import { useEffect, useRef } from "react";
import {
  BASE_BH_MASS,
  BASE_HORIZON_FRACTION,
  BASE_STAR_MASS,
  BASE_SPAWN_PER_SECOND,
  BH_ORBIT_RADIUS_FRACTION,
  BH_SCREEN_ANGLE_RAD,
  FIELD_MP_GLOBAL_MULTIPLIER,
  JET_BASE_PROC_CHANCE,
  JET_BUFF_DURATION_SEC,
  JET_IMPULSE_SPEED,
  JET_PROC_ATTEMPT_INTERVAL_SEC,
  JET_PROC_CHANCE_PER_LEVEL,
  PLANET_TRIBUTE_INTERVAL_SEC,
  ROCHE_TEAR_FACTOR,
  ROCHE_REWARD_MUL,
  ROCHE_RING_SHARDS,
  softCapIncomeMul,
  STAR_COLLISION_RADIUS_FRACTION,
  STAR_DISPLAY_RADIUS_FRACTION,
  STELLAR_SYSTEM_RADIUS_MUL,
  SYSTEM_OUTER_RADIUS_FRACTION,
  USER_ZOOM_MAX,
  USER_ZOOM_MIN,
  WAVE_PULL_SPEED,
  SUPERNOVA_MP_MULT,
} from "../game/balance";
import {
  advanceSpawnAccumulator,
  applyJetImpulseToObjects,
  predictTrajectoryPoints,
  resetSimulationIds,
  type SimLayout,
  type SimObject,
  objRadius,
  addObjectsCapped,
  spawnDebrisBurst,
  spawnRocheRing,
  spawnTributeShip,
  stepSimulation,
  trySpawn,
  type SpawnControl,
} from "../game/simulation";
import { paintSimObjectShape } from "../game/debrisPaint";
import {
  areShipsUnlocked,
  combinedWorldScale,
  computeRadiiPx,
  effectiveGravityAccel,
  hawkingMpPerSecond,
  levelSum,
  mpIncomeMultiplier,
  type UpgradeLevels,
} from "../game/upgrades";
import { planetSwallowMpBase } from "../game/world/planetLife";
import { prestigeModifiers, prestigeRunStart } from "../game/prestigePerks";
import { mpUpgradeModifiers } from "../game/mpUpgrades";
import { environmentModifiers } from "../game/environment";
import { loreOnRocheTear } from "../game/journal";
import { achievementMpMul, newlyUnlocked } from "../game/achievements";
import {
  pickEvent,
  eventById,
  EVENT_FIRST_DELAY_SEC,
  EVENT_COOLDOWN_SEC,
  PARADE_ALIGN_THRESHOLD,
  PARADE_COOLDOWN_SEC,
} from "../game/events";
import {
  buildPlanetPhysicsSnapshot,
  pickPlanetAtWorld,
  planetContextFromSimLayout,
} from "../game/world/planetLayout";
import {
  seedPlanetBodies,
  integratePlanetBodies,
  planetAlignment,
  detectPlanetCollisions,
  orbitInstability,
  ORBIT_INSTABILITY_WARN,
  type PlanetBody,
} from "../game/world/planetPhysics";
import { buildPlanetHoverText } from "../game/world/planetHoverText";
import {
  lerpRgb,
  planetPaletteRgb,
  rgbToFill,
} from "../game/world/planetPalette";
import type { Rgb } from "../game/world/planetPalette";
import { buildStarHoverText } from "../game/world/starHoverText";
import type { Planet } from "../game/world/types";
import { playAbsorb } from "../game/audio/sound";
import { useGameStore } from "../store/useGameStore";

function smoothPlanetFillColors(
  map: Map<string, Rgb>,
  planets: Planet[],
  dtSec: number,
): void {
  const ids = new Set(planets.map((p) => p.id));
  for (const id of map.keys()) {
    if (!ids.has(id)) map.delete(id);
  }
  for (const p of planets) {
    const target = planetPaletteRgb(p);
    const prev = map.get(p.id) ?? target;
    map.set(p.id, lerpRgb(prev, target, Math.min(1, dtSec * 0.42)));
  }
}

function orbitLapsTotal(obj: SimObject): number {
  return (obj.orbitLapsStar ?? 0) + (obj.orbitLapsBh ?? 0);
}

/** MP при поглощении горизонтом (подсказка; звезда/столкновение тел MP не дают). */
function consumptionMpOnDevour(
  obj: SimObject,
  levels: UpgradeLevels,
  jetBuffActive: boolean,
): number {
  const mpMult = mpIncomeMultiplier(levels, jetBuffActive);
  return Math.floor(obj.mpValue * mpMult * FIELD_MP_GLOBAL_MULTIPLIER);
}

function objectLabelWithMp(
  obj: SimObject,
  levels: UpgradeLevels,
  jetBuffActive: boolean,
): string {
  const mp = consumptionMpOnDevour(obj, levels, jetBuffActive);
  const laps = orbitLapsTotal(obj);
  const orbitHint = laps > 0 ? ` · ⟲${laps}` : "";
  return `${obj.displayName} · +${mp.toLocaleString()} MP${orbitHint}`;
}

function layoutFromHost(el: HTMLElement, upgradeLevels: UpgradeLevels): SimLayout {
  const w = Math.max(el.clientWidth, 1);
  const h = Math.max(el.clientHeight, 1);
  const minD = Math.min(w, h);
  // Горизонт учитывает и накопленную массу (читаем из стора — не тянем через вызовы).
  const massMp = useGameStore.getState().massMp;
  const { horizon, gravity } = computeRadiiPx(minD, upgradeLevels, massMp);
  const starX = w / 2;
  const starY = h / 2;
  const sysMul = STELLAR_SYSTEM_RADIUS_MUL;
  const bhR = minD * BH_ORBIT_RADIUS_FRACTION * sysMul;
  const bhX = starX + Math.cos(BH_SCREEN_ANGLE_RAD) * bhR;
  const bhY = starY + Math.sin(BH_SCREEN_ANGLE_RAD) * bhR;
  let systemRadius = minD * SYSTEM_OUTER_RADIUS_FRACTION * sysMul;
  const bhDist = Math.hypot(bhX - starX, bhY - starY);
  systemRadius = Math.max(
    systemRadius,
    bhDist + horizon * 2.5 + minD * 0.035,
  );
  /** Игровой GM: масштаб поля 1/r², согласован с визуальным горизонтом (прокси R_s). Ветка «Радиус притяжения» меняет зону/профиль силы, не эту массу. */
  const bhMassScale = Math.max(0.85, horizon / (minD * BASE_HORIZON_FRACTION));
  return {
    width: w,
    height: h,
    horizonRadius: horizon,
    gravityRadius: gravity,
    gravityAccel: effectiveGravityAccel(upgradeLevels),
    bhMass: BASE_BH_MASS * bhMassScale,
    star: {
      x: starX,
      y: starY,
      mass: BASE_STAR_MASS,
    },
    bh: { x: bhX, y: bhY },
    systemRadius,
    starCollisionRadius: minD * STAR_COLLISION_RADIUS_FRACTION,
  };
}

/** Звёздное поле: 3 слоя глубины с мерцанием и цветовой вариацией. */
// V3: ярче и плотнее — фон теперь экранный (bgRoot), не уезжает на зуме.
const STAR_LAYERS = [
  { count: 120, size: 0.9, baseA: 0.34, tw: 0.6, color: 0xffffff },
  { count: 66, size: 1.5, baseA: 0.46, tw: 1.0, color: 0xbcd4ff },
  { count: 34, size: 2.3, baseA: 0.58, tw: 1.5, color: 0xfde6c4 },
] as const;

function paintStars(g: Graphics, w: number, h: number, timeSec: number): void {
  g.clear();
  let i = 0;
  for (const L of STAR_LAYERS) {
    for (let k = 0; k < L.count; k++, i++) {
      const x = (((i * 73) % 997) / 997) * w;
      const y = (((i * 51) % 1009) / 1009) * h;
      const tw = 0.5 + 0.5 * Math.sin(timeSec * L.tw + i * 1.7);
      g.circle(x, y, L.size + tw * 0.5);
      g.fill({ color: L.color, alpha: L.baseA + tw * 0.26 });
    }
  }
}

/** Шлейфы движения объектов (аддитивно): короткая черта против скорости. */
function paintStreaks(g: Graphics, objects: SimObject[]): void {
  g.clear();
  for (const o of objects) {
    const sp = Math.hypot(o.vx, o.vy);
    if (sp < 16) continue;
    const len = Math.min(sp * 0.18, 28);
    const ux = o.vx / sp;
    const uy = o.vy / sp;
    g.moveTo(o.x, o.y);
    g.lineTo(o.x - ux * len, o.y - uy * len);
    g.stroke({
      width: Math.max(0.8, objRadius(o) * 0.5),
      color: o.kind === 4 ? 0x9bd2ff : 0xffcaa0,
      alpha: Math.min(0.5, sp / 240),
      cap: "round",
    });
  }
}

/** Мягкая туманность (под сильным блюром) — рисуется редко, на ресайз. */
function paintNebula(g: Graphics, w: number, h: number): void {
  g.clear();
  const d = Math.max(w, h);
  const blobs = [
    { x: 0.24, y: 0.3, r: 0.5, c: 0x4a368f },
    { x: 0.72, y: 0.66, r: 0.55, c: 0x16506a },
    { x: 0.58, y: 0.18, r: 0.4, c: 0x5e2856 },
    { x: 0.4, y: 0.8, r: 0.42, c: 0x243d78 },
  ];
  // Аддитивный блендинг: перекрытие блобов накапливает яркость, поэтому держим
  // alpha низким (0.13) — мягкое свечение, но фон не «забивает» объекты поля.
  for (const b of blobs) {
    g.circle(b.x * w, b.y * h, b.r * d * 0.5);
    g.fill({ color: b.c, alpha: 0.13 });
  }
}

/** Свечение дыры (аддитивный слой под блюром): тёплый bloom + аккреционный диск. */
function paintHoleGlow(
  g: Graphics,
  layout: SimLayout,
  pulse01: number,
  diskLevel: number,
  timeSec: number,
  hawkingLevel: number,
): void {
  const cx = layout.bh.x;
  const cy = layout.bh.y;
  const r = layout.horizonRadius;
  g.clear();
  // Тёплый ореол аккреции (несколько колец → bloom после блюра).
  for (let i = 0; i < 4; i++) {
    g.circle(cx, cy, r * (1.15 + i * 0.55));
    g.fill({
      color: i < 2 ? 0xff8a3c : 0x7b5cc0,
      alpha: 0.18 - i * 0.035 + pulse01 * 0.06,
    });
  }
  if (diskLevel > 0) {
    const rInner = r * 1.16;
    const rOuter = r * (1.5 + diskLevel * 0.04);
    const omega = 0.4 + diskLevel * 0.05;
    const hawkingPulse =
      hawkingLevel > 0
        ? Math.sin(timeSec * 2.8) * 0.06 * Math.min(1, hawkingLevel * 0.2)
        : 0;
    for (let arm = 0; arm < 3; arm++) {
      const a0 = arm * ((Math.PI * 2) / 3) + timeSec * omega;
      g.moveTo(cx + Math.cos(a0) * rInner, cy + Math.sin(a0) * rInner);
      g.arc(cx, cy, rInner, a0, a0 + Math.PI * 1.4);
      g.stroke({
        width: 2 + diskLevel * 0.15,
        color: 0xffb347,
        alpha: Math.min(0.45 + diskLevel * 0.05 + hawkingPulse, 0.9),
      });
    }
    g.circle(cx, cy, rOuter);
    g.stroke({ width: 3, color: 0xff7a18, alpha: 0.4 });
  }
}

function paintHole(
  g: Graphics,
  layout: SimLayout,
  pulse01: number,
  lensingLevel: number,
  jetBuffActive: boolean,
  timeSec: number,
): void {
  const cx = layout.bh.x;
  const cy = layout.bh.y;
  const r = layout.horizonRadius;

  g.clear();
  // Событийный горизонт — глубокий чёрный диск.
  g.circle(cx, cy, r);
  g.fill({ color: 0x000000 });
  // Фотонное кольцо — яркое, тонкое (свет, огибающий горизонт).
  g.circle(cx, cy, r * 1.035);
  g.stroke({ width: 1.6 + pulse01 * 2.2, color: 0xfff3d0, alpha: 0.9 });
  g.circle(cx, cy, r * 1.1);
  g.stroke({ width: 1, color: 0x9bdcff, alpha: 0.45 + pulse01 * 0.3 });

  if (lensingLevel > 0) {
    const lr = r * (1.2 + Math.min(0.15, lensingLevel * 0.02));
    g.circle(cx, cy, lr);
    g.stroke({
      width: 1.1,
      color: 0x7dd3fc,
      alpha: 0.12 + Math.min(0.24, lensingLevel * 0.04),
    });
  }

  if (jetBuffActive) {
    const poleA = timeSec * 2.2;
    const r0 = r * 0.4;
    const r1 = r * 2.4;
    for (const pole of [poleA, poleA + Math.PI]) {
      g.moveTo(cx + Math.cos(pole) * r0, cy + Math.sin(pole) * r0);
      g.lineTo(cx + Math.cos(pole) * r1, cy + Math.sin(pole) * r1);
      g.stroke({ width: 2.2, color: 0x38bdf8, alpha: 0.55, cap: "round" });
    }
  }
}


/** Палитра звезды по спектральному классу: [ядро, свечение]. */
const STAR_CLASS_COLORS: Record<string, [number, number]> = {
  F: [0xe6eeff, 0x9bbcff],
  G: [0xfff4cf, 0xfbbf24],
  K: [0xffd9a0, 0xf59e0b],
  M: [0xffb38a, 0xef6b3c],
};

function paintMainStar(
  g: Graphics,
  layout: SimLayout,
  starClass: string,
  timeSec: number,
): void {
  g.clear();
  const minS = Math.min(layout.width, layout.height);
  const r = Math.max(9, minS * STAR_DISPLAY_RADIUS_FRACTION);
  const [core, glow] =
    STAR_CLASS_COLORS[starClass] ?? STAR_CLASS_COLORS.G;
  const pulse = 0.5 + 0.5 * Math.sin(timeSec * 1.6);
  const { x, y } = layout.star;
  // Корона: несколько затухающих слоёв + лёгкий пульс.
  g.circle(x, y, r * (2.6 + pulse * 0.3));
  g.fill({ color: glow, alpha: 0.06 + pulse * 0.03 });
  g.circle(x, y, r * 1.9);
  g.fill({ color: glow, alpha: 0.12 });
  g.circle(x, y, r * 1.35);
  g.fill({ color: glow, alpha: 0.3 });
  // Тело и горячий ободок.
  g.circle(x, y, r);
  g.fill({ color: glow, alpha: 0.96 });
  g.circle(x, y, r * 0.72);
  g.fill({ color: core, alpha: 0.95 });
}

function paintPlanetSoiRings(
  g: Graphics,
  layout: SimLayout,
  planets: Planet[],
  simTimeSec: number,
  fillRgbById: Map<string, Rgb>,
  orbitHighlightPlanetId: string | null,
  posById?: Map<string, { x: number; y: number }>,
  unstableIds?: Set<string>,
): void {
  g.clear();
  if (planets.length === 0) return;
  const ctx = planetContextFromSimLayout(layout);
  const n = planets.length;
  planets.forEach((planet, planetIndex) => {
    const s = buildPlanetPhysicsSnapshot(
      planet,
      ctx,
      simTimeSec,
      planetIndex,
      n,
      posById?.get(planet.id),
    );
    const orbitR = Math.hypot(s.x - layout.star.x, s.y - layout.star.y);
    const hot = orbitHighlightPlanetId === planet.id;

    g.circle(layout.star.x, layout.star.y, orbitR);
    if (hot) {
      g.stroke({ width: 10, color: 0x38bdf8, alpha: 0.14 });
      g.circle(layout.star.x, layout.star.y, orbitR);
      g.stroke({ width: 4.2, color: 0xbae6fd, alpha: 0.72 });
      g.circle(layout.star.x, layout.star.y, orbitR);
      g.stroke({ width: 1.5, color: 0xffffff, alpha: 0.95 });
    } else {
      g.stroke({ width: 1, color: 0x38bdf8, alpha: 0.22 });
    }

    g.circle(s.x, s.y, s.soiRadius);
    g.stroke(
      hot
        ? { width: 2.4, color: 0x6ee7b7, alpha: 0.9 }
        : { width: 1.4, color: 0x34d399, alpha: 0.62 },
    );

    // Предупреждение: орбита дестабилизирована гравитацией дыры.
    if (unstableIds?.has(planet.id)) {
      const pulse = 0.5 + 0.5 * Math.sin(simTimeSec * 6);
      g.circle(s.x, s.y, Math.max(4, s.surfaceRadius) + 6 + pulse * 5);
      g.stroke({ width: 2.2, color: 0xef4444, alpha: 0.45 + pulse * 0.45 });
    }

    const rgb = fillRgbById.get(planet.id) ?? planetPaletteRgb(planet);
    const sr = Math.max(2.3, s.surfaceRadius);
    // Направление на звезду (для дня/ночи и огней на тёмной стороне).
    const dx = s.x - layout.star.x;
    const dy = s.y - layout.star.y;
    const dl = Math.hypot(dx, dy) || 1;
    const nx = dx / dl; // от звезды к планете → тёмная сторона
    const ny = dy / dl;

    // Атмосферное свечение (если есть атмосфера).
    if (planet.atmosphere > 28) {
      g.circle(s.x, s.y, sr * 1.42);
      g.fill({
        color: planet.hydrosphere > 45 ? 0x7ec8ff : 0xa8e6c4,
        alpha: 0.1 + planet.atmosphere / 700,
      });
    }
    // Тело планеты.
    g.circle(s.x, s.y, sr);
    g.fill({ color: rgbToFill(rgb), alpha: 0.97 });
    // Освещённая сторона (блик к звезде) и затенённая ночная.
    g.circle(s.x - nx * sr * 0.32, s.y - ny * sr * 0.32, sr * 0.62);
    g.fill({ color: 0xffffff, alpha: 0.14 });
    g.circle(s.x + nx * sr * 0.34, s.y + ny * sr * 0.34, sr * 0.62);
    g.fill({ color: 0x05070d, alpha: 0.42 });
    // Огни цивилизации на ночной стороне.
    if (planet.lifeBorn && planet.civLevel > 0 && sr > 3) {
      const lights = 2 + planet.civLevel * 2;
      for (let li = 0; li < lights; li++) {
        const ang = (li / lights) * Math.PI * 2 + planetIndex;
        const rad = sr * (0.25 + 0.5 * (((li * 37) % 100) / 100));
        const lx = s.x + nx * sr * 0.4 + Math.cos(ang) * rad * 0.55;
        const ly = s.y + ny * sr * 0.4 + Math.sin(ang) * rad * 0.55;
        g.circle(lx, ly, Math.max(0.5, sr * 0.06));
        g.fill({ color: 0xffe08a, alpha: 0.85 });
      }
    }
    // Обводка.
    g.circle(s.x, s.y, sr);
    g.stroke({
      width: hot ? 1.55 : 1.1,
      color: 0x0f172a,
      alpha: hot ? 0.5 : 0.3,
    });
  });
}

/** Карта галактики (узлы-планеты + маркер дыры) — заготовка под прокачку узлов. */
function paintGalaxy(
  g: Graphics,
  layout: SimLayout,
  pulse01: number,
): void {
  const { width: w, height: h } = layout;
  const cx = layout.star.x;
  const cy = layout.star.y;
  g.clear();
  g.rect(0, 0, w, h);
  g.fill({ color: 0x06060c });

  const orbitR = Math.min(w, h) * 0.36;
  const colors = [
    0x8b5cf6, 0x38bdf8, 0xfbbf24, 0x34d399, 0xf472b6, 0xa78bfa,
  ];
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * orbitR;
    const y = cy + Math.sin(a) * orbitR;
    const rr = 12 + (i % 3) * 2;
    g.circle(x, y, rr);
    g.fill({ color: colors[i % colors.length], alpha: 0.88 });
    g.circle(x, y, rr);
    g.stroke({ width: 1, color: 0xffffff, alpha: 0.14 });
  }

  g.circle(cx, cy, 16 + pulse01 * 5);
  g.fill({ color: 0x000000 });
  g.circle(cx, cy, 26 + pulse01 * 4);
  g.stroke({ width: 2, color: 0x6b4faa, alpha: 0.5 });
}

/** Пунктир вдоль полилинии (мировые координаты слоя worldRoot). */
function strokeDashedPolyline(
  g: Graphics,
  points: { x: number; y: number }[],
  color: number,
  alpha: number,
  dashPx: number,
  gapPx: number,
): void {
  if (points.length < 2) return;
  const cycle = dashPx + gapPx;
  let distAlong = 0;

  const strokeDashSegment = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    segStartDist: number,
  ): void => {
    const segLen = Math.hypot(bx - ax, by - ay);
    if (segLen < 1e-6) return;
    let u = 0;
    while (u < segLen - 1e-6) {
      const globalDist = segStartDist + u;
      const phase = globalDist % cycle;
      const inDash = phase < dashPx;
      const roomInDash = inDash ? dashPx - phase : gapPx - (phase - dashPx);
      const step = Math.min(roomInDash, segLen - u);
      const t0 = u / segLen;
      const t1 = (u + step) / segLen;
      const x0 = ax + (bx - ax) * t0;
      const y0 = ay + (by - ay) * t0;
      const x1 = ax + (bx - ax) * t1;
      const y1 = ay + (by - ay) * t1;
      if (inDash) {
        g.moveTo(x0, y0);
        g.lineTo(x1, y1);
      }
      u += step;
    }
  };

  for (let i = 0; i < points.length - 1; i++) {
    const ax = points[i].x;
    const ay = points[i].y;
    const bx = points[i + 1].x;
    const by = points[i + 1].y;
    const segLen = Math.hypot(bx - ax, by - ay);
    strokeDashSegment(ax, ay, bx, by, distAlong);
    distAlong += segLen;
  }

  g.stroke({ width: 1.15, color, alpha, cap: "round", join: "round" });
}

function pickObjectAtWorld(
  objects: SimObject[],
  wx: number,
  wy: number,
): number | null {
  let bestId: number | null = null;
  let bestD = Infinity;
  for (const o of objects) {
    const r = objRadius(o) * 2;
    const d = Math.hypot(o.x - wx, o.y - wy);
    if (d <= r && d < bestD) {
      bestD = d;
      bestId = o.id;
    }
  }
  return bestId;
}

/** Масштаб спрайта у самого горизонта (было 0.14 — эффект ослаблен в ~2 раза по амплитуде). */
const SHRINK_MIN_AT_HORIZON = 0.57;

/** Визуальное сжатие у горизонта дыры перед исчезновением. */
function spriteShrinkNearHorizon(o: SimObject, layout: SimLayout): number {
  const d = Math.hypot(o.x - layout.bh.x, o.y - layout.bh.y);
  const hr = layout.horizonRadius;
  const gr = layout.gravityRadius;
  if (d >= gr) return 1;
  if (d <= hr) return SHRINK_MIN_AT_HORIZON;
  const span = gr - hr;
  const u = span > 1e-6 ? (d - hr) / span : 1;
  const t = Math.max(0, Math.min(1, u));
  return SHRINK_MIN_AT_HORIZON + (1 - SHRINK_MIN_AT_HORIZON) * t;
}

function syncBodyGraphics(
  layer: Container,
  pool: Graphics[],
  objects: SimObject[],
  layout: SimLayout,
  simTimeSec: number,
): void {
  while (pool.length < objects.length) {
    const g = new Graphics();
    layer.addChild(g);
    pool.push(g);
  }
  while (pool.length > objects.length) {
    const g = pool.pop();
    if (g) {
      layer.removeChild(g);
      g.destroy();
    }
  }
  for (let i = 0; i < objects.length; i++) {
    const o = objects[i];
    const g = pool[i];
    paintSimObjectShape(g, o, simTimeSec);
    const shrink = spriteShrinkNearHorizon(o, layout);
    g.scale.set(shrink, shrink);
  }
}

/** Один Pixi canvas: фон, дыра, объекты; симуляция на игровом времени (не FPS). */
export function GameCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let app: Application | null = null;
    let raf = 0;
    let observer: ResizeObserver | null = null;
    let wheelCleanup: (() => void) | undefined;

    resetSimulationIds();
    let objects: SimObject[] = [];
    // Динамические тела планет (Фаза P): персистентны между кадрами, пере-сеются
    // при смене системы и реконсилируются при удалении/добавлении планет.
    let planetBodies: PlanetBody[] = [];
    let planetBodiesSystemId: string | null = null;
    /** Свежая карта позиций тел по id — для рендера/пика вне тика. */
    let planetPosById = new Map<string, { x: number; y: number }>();
    /** Планеты с дестабилизированной орбитой (предупреждение игроку). */
    let planetUnstableIds = new Set<string>();
    /** Таймеры запуска кораблей-«дани» по id планеты (игр.сек). */
    const tributeAccum = new Map<string, number>();
    /** EMA дохода MP/игр.сек (для оффлайна) + аккумулятор записи в стор. */
    let incomeEma = useGameStore.getState().incomeEmaMpPerSec;
    let emaWriteAccum = 0;
    /** Планировщик периодических событий (игровое время). */
    let eventActiveId: string | null = null;
    let eventEndsAtSec = 0;
    let eventNextAtSec = EVENT_FIRST_DELAY_SEC;
    /** Часы событий в РЕАЛЬНОМ времени (растут при simScale>0) — чтобы события
     *  не мелькали на ×10 и замирали на паузе. */
    let eventClock = 0;
    /** Не раньше этого времени снова проверять естественный парад планет. */
    let paradeReadyAtSec = EVENT_FIRST_DELAY_SEC;
    const spawnControl: SpawnControl = { accum: 0 };
    let consumePulse = 0;
    const graphicsPool: Graphics[] = [];
    const planetFillSmooth = new Map<string, Rgb>();
    type HitFlash = { x: number; y: number; t: number; via: string };
    const hitFlashes: HitFlash[] = [];

    const boot = async () => {
      const application = new Application();
      await application.init({
        resizeTo: host,
        background: 0x050508,
        antialias: true,
        autoDensity: true,
        resolution:
          typeof window !== "undefined" ? window.devicePixelRatio ?? 1 : 1,
      });

      if (cancelled) {
        application.destroy(true);
        return;
      }

      app = application;
      host.appendChild(application.canvas);

      const scene = new Container();
      application.stage.addChild(scene);

      // V3: фон (туманность+звёзды) — в экранном слое, НЕ трансформируется
      // камерой; иначе на крупном плане «У дыры» поле уезжало за кадр.
      const bgRoot = new Container();
      bgRoot.eventMode = "none";
      const worldRoot = new Container();
      const galaxyRoot = new Container();
      scene.addChild(bgRoot);
      scene.addChild(worldRoot);
      scene.addChild(galaxyRoot);

      const nebula = new Graphics();
      nebula.filters = [new BlurFilter({ strength: 30, quality: 3 })];
      nebula.blendMode = "add";
      nebula.eventMode = "none";
      const stars = new Graphics();
      stars.blendMode = "add";
      stars.eventMode = "none";
      const holeGlow = new Graphics();
      holeGlow.filters = [new BlurFilter({ strength: 10, quality: 4 })];
      holeGlow.blendMode = "add";
      holeGlow.eventMode = "none";
      const mainStar = new Graphics();
      const planetSoi = new Graphics();
      const hole = new Graphics();
      const trails = new Graphics();
      const streaks = new Graphics();
      streaks.blendMode = "add";
      streaks.filters = [new BlurFilter({ strength: 2, quality: 2 })];
      streaks.eventMode = "none";
      const collisionFx = new Graphics();
      collisionFx.blendMode = "add";
      collisionFx.eventMode = "none";
      const bodyLayer = new Container();
      const selectionLabel = new Text({
        text: "",
        style: {
          fontFamily: "system-ui, Segoe UI, sans-serif",
          fontSize: 12,
          fill: 0xe2e8f0,
          stroke: { color: 0x0a0c10, width: 4 },
        },
      });
      selectionLabel.anchor.set(0.5, 1);
      selectionLabel.visible = false;
      selectionLabel.eventMode = "none";

      const hoverTooltip = new Text({
        text: "",
        style: {
          fontFamily: "system-ui, Segoe UI, sans-serif",
          fontSize: 11,
          fill: 0xcfd8e3,
          stroke: { color: 0x080a0d, width: 3 },
        },
      });
      hoverTooltip.anchor.set(0.5, 1);
      hoverTooltip.visible = false;
      hoverTooltip.eventMode = "none";

      const planetTooltip = new Text({
        text: "",
        style: {
          fontFamily: "system-ui, Segoe UI, sans-serif",
          fontSize: 10,
          fill: 0xe2e8f0,
          stroke: { color: 0x0a0c10, width: 3 },
          lineHeight: 13,
          wordWrap: true,
          wordWrapWidth: 240,
        },
      });
      planetTooltip.anchor.set(0.5, 1);
      planetTooltip.visible = false;
      planetTooltip.eventMode = "none";

      const starTooltip = new Text({
        text: "",
        style: {
          fontFamily: "system-ui, Segoe UI, sans-serif",
          fontSize: 10,
          fill: 0xfef3c7,
          stroke: { color: 0x1a0a02, width: 3 },
          lineHeight: 13,
          wordWrap: true,
          wordWrapWidth: 220,
        },
      });
      starTooltip.anchor.set(0.5, 1);
      starTooltip.visible = false;
      starTooltip.eventMode = "none";

      bgRoot.addChild(nebula);
      bgRoot.addChild(stars);
      worldRoot.addChild(mainStar);
      worldRoot.addChild(planetSoi);
      worldRoot.addChild(holeGlow);
      worldRoot.addChild(hole);
      worldRoot.addChild(trails);
      worldRoot.addChild(streaks);
      worldRoot.addChild(bodyLayer);
      worldRoot.addChild(collisionFx);
      worldRoot.addChild(selectionLabel);
      worldRoot.addChild(hoverTooltip);
      worldRoot.addChild(planetTooltip);
      worldRoot.addChild(starTooltip);

      const galaxy = new Graphics();
      galaxyRoot.addChild(galaxy);

      let lastSimTimeSecForPaint = 0;
      let jetProcAccum = 0;
      let hawkingCarry = 0;
      // Сглаженные («дисплейные») радиусы дыры: плавно догоняют целевые при
      // апгрейдах/росте массы, чтобы размер не прыгал скачком (-1 = не задано).
      let dispHorizon = -1;
      let dispGravity = -1;
      let lastMs = performance.now();

      let hoverObjectId: number | null = null;
      let hoverPlanet: Planet | null = null;
      let hoverStar = false;
      let selectedObjectId: number | null = null;

      let panX = 0;
      let panY = 0;
      let userZoom = 1;
      let panLastX = 0;
      let panLastY = 0;
      let ptrDown = false;
      let ptrSX = 0;
      let ptrSY = 0;
      let ptrMoved = false;
      const DRAG_THRESH = 7;

      // Фокус камеры: «У дыры» — на дыре; «Система» — середина дыра↔звезда (чтобы
      // в кадр попадали и дыра, и звезда с планетами).
      const cameraFocus = (layout: SimLayout, viewTier: 0 | 1 | 2) =>
        viewTier === 1
          ? {
              x: (layout.bh.x + layout.star.x) / 2,
              y: (layout.bh.y + layout.star.y) / 2,
            }
          : { x: layout.bh.x, y: layout.bh.y };

      // Базовый масштаб (до userZoom): в «Системе» подгоняем под охват дыра↔звезда.
      const cameraBaseScale = (
        levels: UpgradeLevels,
        layout: SimLayout,
        viewTier: 0 | 1 | 2,
      ) => {
        if (viewTier === 1) {
          const span = Math.hypot(
            layout.bh.x - layout.star.x,
            layout.bh.y - layout.star.y,
          );
          const halfExtent = Math.max(span * 0.62, layout.horizonRadius * 6);
          return (Math.min(layout.width, layout.height) * 0.46) / halfExtent;
        }
        return combinedWorldScale(levels, viewTier);
      };

      const applyCamera = (
        levels: UpgradeLevels,
        layout: SimLayout,
        viewTier: 0 | 1 | 2,
      ) => {
        if (viewTier >= 2) {
          worldRoot.visible = false;
          galaxyRoot.visible = true;
          return;
        }
        worldRoot.visible = true;
        galaxyRoot.visible = false;
        const focus = cameraFocus(layout, viewTier);
        const s = cameraBaseScale(levels, layout, viewTier) * userZoom;
        worldRoot.pivot.set(focus.x, focus.y);
        worldRoot.position.set(
          layout.width / 2 + panX,
          layout.height / 2 + panY,
        );
        worldRoot.scale.set(s);
      };

      const syncSceneSize = () => {
        const levels = useGameStore.getState().upgradeLevels;
        const viewTier = useGameStore.getState().viewTier;
        const simTimeSec = useGameStore.getState().gameTimeSec;
        const activeSystemId = useGameStore.getState().activeSystemId;
        const systems = useGameStore.getState().systems;
        const activeSystem = systems.find((s) => s.id === activeSystemId);
        const pls = activeSystem?.planets ?? [];
        smoothPlanetFillColors(planetFillSmooth, pls, 0);
        const layout = layoutFromHost(host, levels);
        const jetEnd = useGameStore.getState().jetBuffEndsAtSimSec;
        const jetBuffVis =
          jetEnd > 0 && lastSimTimeSecForPaint < jetEnd;
        paintNebula(nebula, layout.width, layout.height);
        paintStars(stars, layout.width, layout.height, performance.now() / 1000);
        paintMainStar(mainStar, layout, activeSystem?.starClass ?? "G", performance.now() / 1000);
        paintPlanetSoiRings(
          planetSoi,
          layout,
          pls,
          simTimeSec,
          planetFillSmooth,
          hoverPlanet?.id ?? null,
          planetPosById,
          planetUnstableIds,
        );
        paintHoleGlow(
          holeGlow,
          layout,
          consumePulse,
          levels.disk,
          performance.now() / 1000,
          levels.hawking,
        );
        paintHole(
          hole,
          layout,
          consumePulse,
          levels.lensing,
          jetBuffVis,
          performance.now() / 1000,
        );
        paintGalaxy(galaxy, layout, consumePulse);
        paintStreaks(streaks, objects);
        syncBodyGraphics(
          bodyLayer,
          graphicsPool,
          objects,
          layout,
          simTimeSec,
        );
        applyCamera(levels, layout, viewTier);
      };

      observer = new ResizeObserver(() => {
        syncSceneSize();
        if (application.renderer?.resize) {
          application.renderer.resize(host.clientWidth, host.clientHeight);
        }
      });
      observer.observe(host);

      application.stage.eventMode = "static";
      application.stage.hitArea = application.screen;

      application.stage.on("pointerdown", (e) => {
        if (useGameStore.getState().viewTier >= 2) return;
        ptrDown = true;
        ptrMoved = false;
        ptrSX = e.global.x;
        ptrSY = e.global.y;
        panLastX = e.global.x;
        panLastY = e.global.y;
      });

      application.stage.on("pointermove", (e) => {
        // V4: один снимок состояния на событие (было до 6 вызовов getState).
        const st = useGameStore.getState();
        if (st.viewTier >= 2) return;

        if (ptrDown) {
          const moved = Math.hypot(
            e.global.x - ptrSX,
            e.global.y - ptrSY,
          );
          if (moved > DRAG_THRESH) ptrMoved = true;
          if (ptrMoved) {
            panX += e.global.x - panLastX;
            panY += e.global.y - panLastY;
            panLastX = e.global.x;
            panLastY = e.global.y;
            const lay = layoutFromHost(host, st.upgradeLevels);
            const maxP = Math.min(lay.width, lay.height) * 3.5;
            panX = Math.max(-maxP, Math.min(maxP, panX));
            panY = Math.max(-maxP, Math.min(maxP, panY));
          }
          return;
        }

        const local = worldRoot.toLocal(e.global);
        hoverObjectId = pickObjectAtWorld(objects, local.x, local.y);
        const layoutPm = layoutFromHost(host, st.upgradeLevels);
        const simT = st.gameTimeSec;
        const sys = st.systems.find((s) => s.id === st.activeSystemId);
        const pCtx = planetContextFromSimLayout(layoutPm);
        hoverPlanet =
          hoverObjectId === null
            ? pickPlanetAtWorld(
                local.x,
                local.y,
                sys?.planets ?? [],
                pCtx,
                simT,
                planetPosById,
              )
            : null;
        const minS = Math.min(layoutPm.width, layoutPm.height);
        const starHitR = Math.max(
          28,
          minS * STAR_DISPLAY_RADIUS_FRACTION * 2.1,
        );
        const distToStar = Math.hypot(
          local.x - layoutPm.star.x,
          local.y - layoutPm.star.y,
        );
        hoverStar =
          hoverObjectId === null &&
          hoverPlanet === null &&
          distToStar < starHitR;
      });

      const finishPointerPick = (e: {
        global: { x: number; y: number };
      }) => {
        if (useGameStore.getState().viewTier >= 2) return;
        if (!ptrDown) return;
        ptrDown = false;
        if (!ptrMoved) {
          const local = worldRoot.toLocal(e.global);
          const id = pickObjectAtWorld(objects, local.x, local.y);
          if (id !== null) {
            selectedObjectId = selectedObjectId === id ? null : id;
            return;
          }
          selectedObjectId = null;
          // Клик по планете → открыть панель её развития.
          const levelsPk = useGameStore.getState().upgradeLevels;
          const layoutPk = layoutFromHost(host, levelsPk);
          const simTPk = useGameStore.getState().gameTimeSec;
          const sysIdPk = useGameStore.getState().activeSystemId;
          const sysPk = useGameStore
            .getState()
            .systems.find((s) => s.id === sysIdPk);
          const planet = pickPlanetAtWorld(
            local.x,
            local.y,
            sysPk?.planets ?? [],
            planetContextFromSimLayout(layoutPk),
            simTPk,
            planetPosById,
          );
          if (planet) {
            useGameStore.getState().setActivePlanet(planet.id);
            useGameStore.getState().setTab("planet");
            return;
          }
          // Тап по пустому космосу → волна притяжения (Energy): импульс всем телам к дыре.
          if (useGameStore.getState().tryCastPullWave()) {
            applyJetImpulseToObjects(objects, layoutPk, WAVE_PULL_SPEED);
            hitFlashes.push({
              x: layoutPk.bh.x,
              y: layoutPk.bh.y,
              t: 0,
              via: "horizon",
            });
          }
        }
      };

      application.stage.on("pointerup", finishPointerPick);
      application.stage.on("pointerupoutside", finishPointerPick);

      application.stage.on("pointerleave", () => {
        hoverObjectId = null;
        hoverPlanet = null;
        hoverStar = false;
        ptrDown = false;
      });

      const onStageWheel = (e: {
        preventDefault: () => void;
        deltaY: number;
        global: { x: number; y: number };
      }) => {
        e.preventDefault();
        if (cancelled || useGameStore.getState().viewTier >= 2) return;
        const factor = e.deltaY > 0 ? 1 / 1.06 : 1.06;
        const levelsW = useGameStore.getState().upgradeLevels;
        const viewTierW = useGameStore.getState().viewTier;
        const layoutW = layoutFromHost(host, levelsW);
        const simPt = worldRoot.toLocal(e.global);
        const pivot = cameraFocus(layoutW, viewTierW);
        userZoom = Math.max(
          USER_ZOOM_MIN,
          Math.min(USER_ZOOM_MAX, userZoom * factor),
        );
        const sNew = cameraBaseScale(levelsW, layoutW, viewTierW) * userZoom;
        panX =
          e.global.x - (simPt.x - pivot.x) * sNew - layoutW.width / 2;
        panY =
          e.global.y - (simPt.y - pivot.y) * sNew - layoutW.height / 2;
        const maxP = Math.min(layoutW.width, layoutW.height) * 3.5;
        panX = Math.max(-maxP, Math.min(maxP, panX));
        panY = Math.max(-maxP, Math.min(maxP, panY));
      };
      application.stage.on("wheel", onStageWheel);
      wheelCleanup = () => application.stage.off("wheel", onStageWheel);

      const paintTrajectories = (
        layout: SimLayout,
        levels: UpgradeLevels,
        viewTier: 0 | 1 | 2,
        worldScale: number,
      ) => {
        trails.clear();
        if (viewTier >= 2) return;

        /** Экранно-стабильный пунктир: длины в мире обратно пропорциональны зуму слоя. */
        const safeScale = Math.max(worldScale, 0.07);
        const dashWorld = 6.5 / safeScale;
        const gapWorld = 5.5 / safeScale;

        /** Последний сегмент при столкновении с телом — предупреждающий цвет. */
        const TRAIL_COLLISION = 0xfb923c;

        const gameT = useGameStore.getState().gameTimeSec;
        const sysId = useGameStore.getState().activeSystemId;
        const sysList = useGameStore.getState().systems;
        const activeSys = sysList.find((s) => s.id === sysId);
        const pCtx = planetContextFromSimLayout(layout);
        const pTr = activeSys?.planets ?? [];
        const nTr = pTr.length;
        const planetSnaps = pTr.map((pl: Planet, pi: number) =>
          buildPlanetPhysicsSnapshot(
            pl,
            pCtx,
            gameT,
            pi,
            nTr,
            planetPosById.get(pl.id),
          ),
        );

        const showTrail = (obj: SimObject) => {
          const { points: pts, endsWithBodyCollision } =
            predictTrajectoryPoints(obj, layout, levels, {
              othersSnapshot: objects,
              planetSnapshots: planetSnaps,
            });
          if (pts.length < 2) return;
          const hot = hoverObjectId === obj.id;
          const hasOrbit = orbitLapsTotal(obj) > 0;
          const color = hasOrbit
            ? hot
              ? 0xd8b4fe
              : 0x8b7ccf
            : hot
              ? 0xffffff
              : 0x8b93a5;
          const alpha = hot ? 0.92 : hasOrbit ? 0.52 : 0.42;

          if (endsWithBodyCollision && pts.length >= 2) {
            const alphaHit = hot ? 0.96 : 0.78;
            if (pts.length >= 3) {
              strokeDashedPolyline(
                trails,
                pts.slice(0, -1),
                color,
                alpha,
                dashWorld,
                gapWorld,
              );
              strokeDashedPolyline(
                trails,
                pts.slice(-2),
                TRAIL_COLLISION,
                alphaHit,
                dashWorld,
                gapWorld,
              );
            } else {
              strokeDashedPolyline(
                trails,
                pts,
                TRAIL_COLLISION,
                alphaHit,
                dashWorld,
                gapWorld,
              );
            }
          } else {
            strokeDashedPolyline(trails, pts, color, alpha, dashWorld, gapWorld);
          }
        };

        for (const obj of objects) {
          const active =
            hoverObjectId === obj.id || selectedObjectId === obj.id;
          if (active) showTrail(obj);
        }
      };

      const tick = (nowMs: number) => {
        if (cancelled || !app) return;

        const dt = Math.min((nowMs - lastMs) / 1000, 0.12);
        lastMs = nowMs;

        const simScale = useGameStore.getState().simTimeScale;
        const simDt = dt * simScale;
        useGameStore.getState().advanceGameTime(simDt);
        const simTimeSec = useGameStore.getState().gameTimeSec;
        lastSimTimeSecForPaint = simTimeSec;
        // Масса до начислений тика — для замера дохода (в тике трат нет).
        const massAtTickStart = useGameStore.getState().massMp;

        const levels = useGameStore.getState().upgradeLevels;
        const viewTier = useGameStore.getState().viewTier;
        const activeSystemId = useGameStore.getState().activeSystemId;
        const systems = useGameStore.getState().systems;
        const activeSystem = systems.find((s) => s.id === activeSystemId);
        const layout = layoutFromHost(host, levels);

        // Плавная анимация радиусов дыры: экспоненциальное сглаживание к целевым
        // значениям (горизонт + зона притяжения). Применяется и к визуалу, и к
        // GM-полю — чтобы физика и картинка оставались согласованы (лаг ~0.2 с).
        {
          const targetH = layout.horizonRadius;
          const targetG = layout.gravityRadius;
          if (dispHorizon < 0) {
            dispHorizon = targetH;
            dispGravity = targetG;
          } else {
            const k = 1 - Math.exp(-dt / 0.2); // постоянная времени ≈ 0.2 с
            dispHorizon += (targetH - dispHorizon) * k;
            dispGravity += (targetG - dispGravity) * k;
          }
          layout.horizonRadius = dispHorizon;
          layout.gravityRadius = dispGravity;
          const minDL = Math.min(layout.width, layout.height);
          layout.bhMass =
            BASE_BH_MASS *
            Math.max(0.85, dispHorizon / (minDL * BASE_HORIZON_FRACTION));
        }

        if (levels.jets > 0) {
          jetProcAccum += simDt;
        } else {
          jetProcAccum = 0;
        }
        while (
          levels.jets > 0 &&
          jetProcAccum >= JET_PROC_ATTEMPT_INTERVAL_SEC
        ) {
          jetProcAccum -= JET_PROC_ATTEMPT_INTERVAL_SEC;
          const buffEnd = useGameStore.getState().jetBuffEndsAtSimSec;
          if (simTimeSec >= buffEnd) {
            const diskMul =
              levels.disk <= 0
                ? 0
                : Math.min(1, levels.disk / 3);
            const p =
              diskMul *
              Math.min(
                0.92,
                JET_BASE_PROC_CHANCE +
                  Math.max(0, levels.jets - 1) * JET_PROC_CHANCE_PER_LEVEL,
              );
            if (Math.random() < p) {
              useGameStore
                .getState()
                .setJetBuffEndsAt(simTimeSec + JET_BUFF_DURATION_SEC);
              applyJetImpulseToObjects(objects, layout, JET_IMPULSE_SPEED);
            }
          }
        }

        const jetBuffEndsAt = useGameStore.getState().jetBuffEndsAtSimSec;
        const jetBuffActive =
          jetBuffEndsAt > 0 && simTimeSec < jetBuffEndsAt;

        // Сверхнова (узел №11): отложенный всплеск спавна + временный ×3 MP.
        const snBurst = useGameStore.getState().consumeSupernovaBurst();
        if (snBurst > 0) {
          objects = trySpawn(objects, layout, snBurst, {
            shipsUnlocked: areShipsUnlocked(levels),
            upgradeLevels: levels,
          });
        }
        const snBuffEndsAt = useGameStore.getState().supernovaBuffEndsAtSimSec;
        const supernovaMpMul =
          snBuffEndsAt > 0 && simTimeSec < snBuffEndsAt ? SUPERNOVA_MP_MULT : 1;

        const perkLevels = useGameStore.getState().prestigePerkLevels;
        const pmods = prestigeModifiers(perkLevels);
        const runStart = prestigeRunStart(perkLevels);
        const mpu = mpUpgradeModifiers(
          useGameStore.getState().mpUpgradeLevels,
        );
        const envMods = environmentModifiers(
          useGameStore.getState().environmentLevels,
        );
        const achMul = achievementMpMul(
          useGameStore.getState().achievementsUnlocked,
        );

        // Восстановление Energy — в РЕАЛЬНОМ времени (идёт и на паузе).
        useGameStore.getState().regenEnergy(dt);

        // --- Периодические события (в РЕАЛЬНОМ времени, замирают на паузе) ---
        if (simScale > 0) eventClock += dt;
        if (eventActiveId && eventClock >= eventEndsAtSec) {
          eventActiveId = null;
          eventNextAtSec = eventClock + EVENT_COOLDOWN_SEC;
          useGameStore.getState().setActiveEvent(null);
        }
        if (!eventActiveId && simScale > 0) {
          const startEvent = (def: ReturnType<typeof eventById>) => {
            if (!def) return;
            eventActiveId = def.id;
            eventEndsAtSec = eventClock + def.durationSec;
            useGameStore.getState().setActiveEvent(def.name);
            if (def.spawnBurst > 0) {
              objects = trySpawn(objects, layout, def.spawnBurst, {
                shipsUnlocked: areShipsUnlocked(levels),
                upgradeLevels: levels,
              });
            }
          };
          // «Парад планет» срабатывает, когда планеты сами выстроились в ряд
          // (не двигаем их силой), с собственной паузой между парадами.
          const naturallyAligned =
            eventClock >= paradeReadyAtSec &&
            planetBodies.length >= 3 &&
            planetAlignment(planetBodies, layout.star) >= PARADE_ALIGN_THRESHOLD;
          if (naturallyAligned) {
            startEvent(eventById("planet_parade"));
            paradeReadyAtSec = eventClock + PARADE_COOLDOWN_SEC;
            eventNextAtSec = eventClock + EVENT_COOLDOWN_SEC;
          } else if (eventClock >= eventNextAtSec) {
            // Прочие события — по таймеру (парад исключён, он только по выравниванию).
            startEvent(pickEvent(Math.random(), ["planet_parade"]));
          }
        }
        const ev = eventById(eventActiveId);
        const eventSpawnMul = ev?.spawnMul ?? 1;
        const eventMpMul = ev?.mpMul ?? 1;

        const mpMult = softCapIncomeMul(
          mpIncomeMultiplier(levels, jetBuffActive) *
            pmods.mpMul *
            mpu.mpMul *
            envMods.mpMul *
            achMul *
            eventMpMul *
            supernovaMpMul,
        );
        const shipsUnlocked = areShipsUnlocked(levels);

        const spawnCount = advanceSpawnAccumulator(
          spawnControl,
          simDt,
          BASE_SPAWN_PER_SECOND *
            runStart.spawnRateMul *
            mpu.spawnRateMul *
            envMods.spawnRateMul *
            eventSpawnMul,
        );
        objects = trySpawn(objects, layout, spawnCount, {
          shipsUnlocked,
          upgradeLevels: levels,
        });

        const planetCtx = planetContextFromSimLayout(layout);
        const pList0 = activeSystem?.planets ?? [];
        const nPl0 = pList0.length;

        // --- Динамика планет (Фаза P): засев/реконсиляция + интеграция ---
        const starSrc = {
          x: layout.star.x,
          y: layout.star.y,
          mass: layout.star.mass,
        };
        // Возмущающая масса дыры для орбит планет растёт с её горизонтом: на старте
        // ≈3 % (планеты спокойно вращаются вокруг звезды и НЕ падают сразу в дыру),
        // по мере роста дыры — усиливается и в пределе разрушает орбиты (как задумано).
        const minDLayout = Math.min(layout.width, layout.height);
        const bhGrowth =
          layout.horizonRadius / (minDLayout * BASE_HORIZON_FRACTION);
        // Окружение (ветка B) усиливает возмущение орбит дырой (риск): множитель
        // применяется ВНУТРИ клампа [0.03, 1], поэтому раннее влияние мало и растёт
        // вместе с массой дыры — орбиты деградируют быстрее, планеты падают раньше.
        const bhPerturbFrac = Math.min(
          1,
          Math.max(0.03, (bhGrowth - 1) * 0.8) * envMods.orbitPerturbMul,
        );
        const bhSrc = {
          x: layout.bh.x,
          y: layout.bh.y,
          mass: layout.bhMass * bhPerturbFrac,
        };
        if ((activeSystemId ?? null) !== planetBodiesSystemId) {
          planetBodies = seedPlanetBodies(pList0, planetCtx, starSrc, bhSrc);
          planetBodiesSystemId = activeSystemId ?? null;
        } else {
          // Реконсиляция по id в ОБЕ стороны: удалить тела исчезнувших планет и
          // досеять недостающие (выжившие сохраняют свою динамическую позицию).
          const planetIdSet = new Set(pList0.map((p) => p.id));
          const bodyIdSet = new Set(planetBodies.map((b) => b.id));
          const sameSet =
            planetBodies.length === nPl0 &&
            pList0.every((p) => bodyIdSet.has(p.id));
          if (!sameSet) {
            const kept = planetBodies.filter((b) => planetIdSet.has(b.id));
            const keptIds = new Set(kept.map((b) => b.id));
            if (kept.length < nPl0) {
              // досев недостающих по корректным слотам (из полного засева)
              const seeded = seedPlanetBodies(pList0, planetCtx, starSrc, bhSrc);
              for (const sb of seeded) {
                if (!keptIds.has(sb.id)) kept.push(sb);
              }
            }
            planetBodies = kept;
          }
        }
        if (simDt > 0) {
          integratePlanetBodies(planetBodies, starSrc, bhSrc, simDt);
        }

        // Столкновения планет → разрушение на обломки (тела очистит реконсиляция след. кадра).
        if (simDt > 0 && planetBodies.length > 1 && activeSystem) {
          const hits = detectPlanetCollisions(planetBodies);
          if (hits.length > 0) {
            const destroyed = new Set<string>();
            for (const [a, b] of hits) {
              destroyed.add(a);
              destroyed.add(b);
            }
            for (const id of destroyed) {
              const body = planetBodies.find((bb) => bb.id === id);
              if (body) {
                objects = addObjectsCapped(
                  objects,
                  spawnDebrisBurst(body.x, body.y, 9),
                );
                hitFlashes.push({ x: body.x, y: body.y, t: 0, via: "body" });
              }
              useGameStore.getState().removePlanet(activeSystem.id, id);
            }
          }
        }

        // Предупреждение о нестабильной орбите (гравитация дыры конкурирует со звездой).
        planetUnstableIds = new Set(
          planetBodies
            .filter(
              (b) => orbitInstability(b, starSrc, bhSrc) > ORBIT_INSTABILITY_WARN,
            )
            .map((b) => b.id),
        );

        planetPosById = new Map(
          planetBodies.map((b) => [b.id, { x: b.x, y: b.y }]),
        );

        const planetSnaps = pList0.map((pl: Planet, pi: number) =>
          buildPlanetPhysicsSnapshot(
            pl,
            planetCtx,
            simTimeSec,
            pi,
            nPl0,
            planetPosById.get(pl.id),
          ),
        );

        // Дань: цивилизованные планеты запускают корабли к дыре (часть захватывается → MP).
        if (simDt > 0) {
          for (const pl of pList0) {
            if (pl.civLevel <= 0) continue;
            const pos = planetPosById.get(pl.id);
            if (!pos) continue;
            const interval = PLANET_TRIBUTE_INTERVAL_SEC / pl.civLevel;
            const acc = (tributeAccum.get(pl.id) ?? 0) + simDt;
            if (acc >= interval) {
              tributeAccum.set(pl.id, acc - interval);
              objects = addObjectsCapped(objects, [
                spawnTributeShip(pos.x, pos.y, layout.bh.x, layout.bh.y),
              ]);
            } else {
              tributeAccum.set(pl.id, acc);
            }
          }
          // Чистка таймеров дани от удалённых планет (анти-утечка Map).
          if (tributeAccum.size > pList0.length) {
            const ids = new Set(pList0.map((p) => p.id));
            for (const id of [...tributeAccum.keys()]) {
              if (!ids.has(id)) tributeAccum.delete(id);
            }
          }
        }

        // Суб-шаги интегратора объектов: на ускорении ×10 один шаг Эйлера на
        // simDt до 1.2с туннелирует сквозь горизонт и «накачивает» орбиты.
        // Дробим до ~0.06с/шаг (с потолком), чтобы поведение было стабильным.
        const objSubsteps = Math.min(6, Math.max(1, Math.ceil(simDt / 0.06)));
        const subDt = simDt / objSubsteps;
        const consumed: ReturnType<typeof stepSimulation>["consumed"] = [];
        for (let sub = 0; sub < objSubsteps; sub++) {
          const r = stepSimulation(objects, layout, subDt, levels, planetSnaps);
          objects = r.objects;
          for (const c of r.consumed) consumed.push(c);
        }

        if (activeSystem) {
          const planetListSnapshot = [...activeSystem.planets];
          const nSnap = planetListSnapshot.length;
          for (let pi = 0; pi < planetListSnapshot.length; pi++) {
            const pl = planetListSnapshot[pi];
            const s = buildPlanetPhysicsSnapshot(
              pl,
              planetCtx,
              simTimeSec,
              pi,
              nSnap,
              planetPosById.get(pl.id),
            );
            const dBh = Math.hypot(s.x - layout.bh.x, s.y - layout.bh.y);
            if (dBh < layout.horizonRadius) {
              const gain = Math.floor(
                planetSwallowMpBase(pl) * mpMult * FIELD_MP_GLOBAL_MULTIPLIER,
              );
              if (gain > 0) {
                consumePulse = 1;
                useGameStore.getState().addMassMp(gain);
              }
              hitFlashes.push({ x: s.x, y: s.y, t: 0, via: "horizon" });
              useGameStore.getState().removePlanet(activeSystem.id, pl.id);
              continue;
            }
            // Предел Роша: приливный разрыв планеты в кольцо обломков ДО горизонта.
            if (dBh < layout.horizonRadius * ROCHE_TEAR_FACTOR) {
              const totalMp = Math.max(
                1,
                Math.floor(planetSwallowMpBase(pl) * ROCHE_REWARD_MUL),
              );
              objects = addObjectsCapped(
                objects,
                spawnRocheRing(
                  layout.bh.x,
                  layout.bh.y,
                  s.x,
                  s.y,
                  ROCHE_RING_SHARDS,
                  totalMp,
                ),
              );
              hitFlashes.push({ x: s.x, y: s.y, t: 0, via: "body" });
              const lore = loreOnRocheTear(pl.name);
              useGameStore.getState().addJournalEntry(lore.category, lore.text);
              useGameStore.getState().removePlanet(activeSystem.id, pl.id);
              continue;
            }
            const dSt = Math.hypot(s.x - layout.star.x, s.y - layout.star.y);
            if (dSt < layout.starCollisionRadius + s.surfaceRadius * 0.85) {
              hitFlashes.push({ x: s.x, y: s.y, t: 0, via: "star" });
              useGameStore.getState().removePlanet(activeSystem.id, pl.id);
            }
          }
        }

        if (
          selectedObjectId !== null &&
          !objects.some((o) => o.id === selectedObjectId)
        ) {
          selectedObjectId = null;
        }

        if (consumed.length > 0) {
          let gain = 0;
          let maxMp = 0;
          for (const c of consumed) {
            const g = Math.floor(c.mp * mpMult * FIELD_MP_GLOBAL_MULTIPLIER);
            gain += g;
            if (g > maxMp) maxMp = g;
            // Удар обломка в планету → откат её развития.
            if (c.via === "planet" && c.planetId && activeSystem) {
              useGameStore
                .getState()
                .damagePlanet(activeSystem.id, c.planetId);
            }
            if (c.atX != null && c.atY != null) {
              hitFlashes.push({
                x: c.atX,
                y: c.atY,
                t: 0,
                via: c.via ?? "body",
              });
            }
          }
          if (gain > 0) {
            consumePulse = 1;
            useGameStore.getState().addMassMp(gain);
            playAbsorb(maxMp); // throttle внутри — без какофонии
          }
        }

        if (simScale > 0 && levels.hawking > 0) {
          const massMp = useGameStore.getState().massMp;
          const hRate =
            hawkingMpPerSecond(levels, massMp) * pmods.hawkingMul * mpu.hawkingMul;
          hawkingCarry += hRate * simDt;
          const hGain = Math.floor(hawkingCarry);
          hawkingCarry -= hGain;
          if (hGain > 0) useGameStore.getState().addMassMp(hGain);
        }

        // EMA дохода в MP/РЕАЛЬНУЮ секунду (для оффлайна): прирост массы за тик / dt.
        // Реальная ставка согласована с оффлайн-формулой (× реальное время × 75%)
        // и отражает фактическую скорость заработка при текущем ускорении.
        if (simDt > 0 && dt > 0) {
          const gained = useGameStore.getState().massMp - massAtTickStart;
          const rate = gained / dt;
          const alpha = 1 - Math.exp(-dt / 30); // сглаживание ~30 реальных сек
          incomeEma += (rate - incomeEma) * alpha;
        }
        emaWriteAccum += dt;
        if (emaWriteAccum >= 1) {
          emaWriteAccum = 0;
          const st = useGameStore.getState();
          st.setIncomeEma(incomeEma);
          // Проверка достижений (раз в ~секунду).
          const allPlanets = st.systems.flatMap((sys) => sys.planets);
          const fresh = newlyUnlocked(
            {
              massMp: st.massMp,
              lifetimeMassMp: st.lifetimeMassMp,
              massSpentTotal: st.massSpentTotal,
              prestigePoints: st.lifetimePp, // достижения — по суммарным PP, не текущим
              prestigeCount: st.prestigeCount,
              gameTimeSec: st.gameTimeSec,
              upgradeSum: levelSum(st.upgradeLevels),
              upgradeLevels: st.upgradeLevels,
              incomeMpPerSec: st.incomeEmaMpPerSec,
              planetsWithLife: allPlanets.filter((p) => p.lifeBorn).length,
              maxCivLevel: allPlanets.reduce((m, p) => Math.max(m, p.civLevel), 0),
            },
            st.achievementsUnlocked,
          );
          for (const a of fresh) st.unlockAchievement(a.id, a.name);
        }

        consumePulse = Math.max(0, consumePulse - simDt * 3.5);

        const plTick = activeSystem?.planets ?? [];
        smoothPlanetFillColors(planetFillSmooth, plTick, simDt);

        for (let i = 0; i < hitFlashes.length; i++) {
          hitFlashes[i].t += dt;
        }
        for (let i = hitFlashes.length - 1; i >= 0; i--) {
          if (hitFlashes[i].t > 0.34) hitFlashes.splice(i, 1);
        }
        collisionFx.clear();
        for (const f of hitFlashes) {
          const u = f.t / 0.34;
          const col =
            f.via === "horizon"
              ? 0xfbbf24
              : f.via === "star"
                ? 0xfb923c
                : f.via === "planet"
                  ? 0x4ade80
                  : 0xf472b6;
          // Расширяющееся кольцо.
          collisionFx.circle(f.x, f.y, 4 + u * 150);
          collisionFx.stroke({ width: 1.8 + u * 2.5, color: col, alpha: (1 - u) * 0.8 });
          // Яркое ядро-вспышка (быстро гаснет).
          const core = Math.max(0, 1 - u * 2.3);
          if (core > 0) {
            collisionFx.circle(f.x, f.y, 3 + (1 - core) * 12);
            collisionFx.fill({ color: 0xffffff, alpha: core * 0.7 });
          }
          // Искры-частицы разлетаются.
          for (let k = 0; k < 6; k++) {
            const ang = (k / 6) * Math.PI * 2 + f.x * 0.3;
            const pr = u * (16 + (k % 3) * 12);
            collisionFx.circle(
              f.x + Math.cos(ang) * pr,
              f.y + Math.sin(ang) * pr,
              Math.max(0.6, (1 - u) * 2.2),
            );
            collisionFx.fill({ color: col, alpha: (1 - u) * 0.6 });
          }
        }

        paintStars(stars, layout.width, layout.height, nowMs / 1000);
        paintHoleGlow(
          holeGlow,
          layout,
          consumePulse,
          levels.disk,
          simTimeSec,
          levels.hawking,
        );
        paintHole(
          hole,
          layout,
          consumePulse,
          levels.lensing,
          jetBuffActive,
          simTimeSec,
        );
        paintMainStar(mainStar, layout, activeSystem?.starClass ?? "G", performance.now() / 1000);
        paintPlanetSoiRings(
          planetSoi,
          layout,
          plTick,
          simTimeSec,
          planetFillSmooth,
          hoverPlanet?.id ?? null,
          planetPosById,
          planetUnstableIds,
        );
        paintGalaxy(galaxy, layout, consumePulse);
        paintStreaks(streaks, objects);
        syncBodyGraphics(
          bodyLayer,
          graphicsPool,
          objects,
          layout,
          simTimeSec,
        );
        applyCamera(levels, layout, viewTier);

        const worldScale =
          viewTier >= 2
            ? 1
            : Math.max(
                0.07,
                combinedWorldScale(levels, viewTier) * userZoom,
              );

        const trailScale = Math.max(
          0.07,
          Math.abs(worldRoot.scale.x) || worldScale,
        );
        paintTrajectories(layout, levels, viewTier, trailScale);

        /** Подписи в мире наследуют scale слоя; обратный масштаб ≈ постоянный размер текста на экране при зуме. */
        const labelScreenScale = 1 / worldScale;
        selectionLabel.scale.set(labelScreenScale);
        hoverTooltip.scale.set(labelScreenScale);
        planetTooltip.scale.set(labelScreenScale);
        starTooltip.scale.set(labelScreenScale);

        const draggingPan = ptrDown && ptrMoved;

        if (viewTier >= 2) {
          selectionLabel.visible = false;
          hoverTooltip.visible = false;
          planetTooltip.visible = false;
          starTooltip.visible = false;
        } else {
          if (
            hoverObjectId !== null &&
            hoverObjectId !== selectedObjectId
          ) {
            const hov = objects.find((o) => o.id === hoverObjectId);
            if (hov) {
              hoverTooltip.text = objectLabelWithMp(
                hov,
                levels,
                jetBuffActive,
              );
              const liftH =
                (objRadius(hov) * 2 + 10) / worldScale;
              hoverTooltip.position.set(hov.x, hov.y - liftH);
              hoverTooltip.visible = true;
              planetTooltip.visible = false;
              starTooltip.visible = false;
            } else {
              hoverTooltip.visible = false;
            }
          } else {
            hoverTooltip.visible = false;
          }

          if (selectedObjectId !== null) {
            const sel = objects.find((o) => o.id === selectedObjectId);
            if (sel) {
              selectionLabel.text = objectLabelWithMp(
                sel,
                levels,
                jetBuffActive,
              );
              const lift =
                (objRadius(sel) * 2 + 10) / worldScale;
              selectionLabel.position.set(sel.x, sel.y - lift);
              selectionLabel.visible = true;
            } else {
              selectionLabel.visible = false;
            }
          } else {
            selectionLabel.visible = false;
          }

          if (
            hoverPlanet &&
            hoverObjectId === null &&
            !draggingPan &&
            !hoverTooltip.visible
          ) {
            const hPl = hoverPlanet;
            const systemsNow = useGameStore.getState().systems;
            const sysNow = systemsNow.find((s) => s.id === activeSystemId);
            const hp = sysNow?.planets.find((p: Planet) => p.id === hPl.id);
            if (hp && sysNow) {
              planetTooltip.text = buildPlanetHoverText(
                hp,
                levels,
                jetBuffActive,
                sysNow.starClass,
              );
              const planetsArr = sysNow.planets;
              const hi = planetsArr.findIndex((p: Planet) => p.id === hp.id);
              const s = buildPlanetPhysicsSnapshot(
                hp,
                planetContextFromSimLayout(layout),
                simTimeSec,
                Math.max(0, hi),
                planetsArr.length,
                planetPosById.get(hp.id),
              );
              const liftP = (s.surfaceRadius * 2 + 14) / worldScale;
              planetTooltip.position.set(s.x, s.y - liftP);
              planetTooltip.visible = true;
              starTooltip.visible = false;
            } else {
              planetTooltip.visible = false;
            }
          } else {
            planetTooltip.visible = false;
          }

          if (
            hoverStar &&
            !draggingPan &&
            hoverObjectId === null &&
            !hoverTooltip.visible &&
            !planetTooltip.visible
          ) {
            const systemsNow = useGameStore.getState().systems;
            const sysNow = systemsNow.find((s) => s.id === activeSystemId);
            if (sysNow) {
              starTooltip.text = buildStarHoverText(sysNow);
              const minS = Math.min(layout.width, layout.height);
              const liftS =
                (Math.max(18, minS * STAR_DISPLAY_RADIUS_FRACTION) * 2 + 10) /
                worldScale;
              starTooltip.position.set(
                layout.star.x,
                layout.star.y - liftS,
              );
              starTooltip.visible = true;
            } else {
              starTooltip.visible = false;
            }
          } else {
            starTooltip.visible = false;
          }
        }

        raf = requestAnimationFrame(tick);
      };

      syncSceneSize();
      requestAnimationFrame(() => {
        if (!cancelled && application.renderer?.resize) {
          application.renderer.resize(host.clientWidth, host.clientHeight);
        }
        syncSceneSize();
      });
      raf = requestAnimationFrame(tick);
    };

    void boot();

    return () => {
      cancelled = true;
      wheelCleanup?.();
      cancelAnimationFrame(raf);
      observer?.disconnect();
      graphicsPool.length = 0;
      host.replaceChildren();
    };
  }, []);

  return <div ref={hostRef} className="game-canvas-host" />;
}
