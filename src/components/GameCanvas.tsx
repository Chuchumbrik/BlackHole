import {
  Application,
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
  STAR_COLLISION_RADIUS_FRACTION,
  STAR_DISPLAY_RADIUS_FRACTION,
  STELLAR_SYSTEM_RADIUS_MUL,
  SYSTEM_OUTER_RADIUS_FRACTION,
  USER_ZOOM_MAX,
  USER_ZOOM_MIN,
} from "../game/balance";
import {
  advanceSpawnAccumulator,
  applyJetImpulseToObjects,
  predictTrajectoryPoints,
  resetSimulationIds,
  type SimLayout,
  type SimObject,
  objRadius,
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
  mpIncomeMultiplier,
  type UpgradeLevels,
} from "../game/upgrades";
import { planetSwallowMpBase } from "../game/world/planetLife";
import {
  buildPlanetPhysicsSnapshot,
  pickPlanetAtWorld,
  planetContextFromSimLayout,
} from "../game/world/planetLayout";
import { buildPlanetHoverText } from "../game/world/planetHoverText";
import {
  lerpRgb,
  planetPaletteRgb,
  rgbToFill,
} from "../game/world/planetPalette";
import type { Rgb } from "../game/world/planetPalette";
import { buildStarHoverText } from "../game/world/starHoverText";
import type { Planet } from "../game/world/types";
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
  const { horizon, gravity } = computeRadiiPx(minD, upgradeLevels);
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

function paintStars(g: Graphics, w: number, h: number): void {
  g.clear();
  for (let i = 0; i < 160; i++) {
    const sx = ((i * 73) % 997) / 997;
    const sy = ((i * 51) % 1009) / 1009;
    const x = sx * w;
    const y = sy * h;
    const a = 0.12 + (i % 7) * 0.04;
    g.circle(x, y, 0.7 + (i % 3) * 0.35);
    g.fill({ color: 0xffffff, alpha: a });
  }
}

function paintHole(
  g: Graphics,
  layout: SimLayout,
  pulse01: number,
  diskLevel: number,
  timeSec: number,
  lensingLevel: number,
  hawkingLevel: number,
  jetBuffActive: boolean,
): void {
  const cx = layout.bh.x;
  const cy = layout.bh.y;
  const r = layout.horizonRadius;
  const ringBoost = pulse01 * 0.55;

  g.clear();
  g.circle(cx, cy, r * (1.42 + pulse01 * 0.06));
  g.stroke({
    width: 2 + pulse01 * 4,
    color: 0x6b4faa,
    alpha: 0.45 + ringBoost,
  });
  g.circle(cx, cy, r);
  g.fill({ color: 0x000000 });

  if (lensingLevel > 0) {
    const lr = r * (1.2 + Math.min(0.15, lensingLevel * 0.02));
    g.circle(cx, cy, lr);
    g.stroke({
      width: 1.1,
      color: 0x7dd3fc,
      alpha: 0.1 + Math.min(0.22, lensingLevel * 0.035),
    });
  }

  if (diskLevel > 0) {
    const hawkingPulse =
      hawkingLevel > 0
        ? Math.sin(timeSec * 2.8) * 0.04 * Math.min(1, hawkingLevel * 0.2)
        : 0;
    const rInnerDisk = r * 1.18;
    const rOuter = r * (1.52 + diskLevel * 0.04);
    const omegaInner = 0.38 + diskLevel * 0.05;
    const omegaOuter =
      omegaInner * Math.pow(rInnerDisk / rOuter, 1.5);
    const arms = 3;
    for (let arm = 0; arm < arms; arm++) {
      const arm0 = arm * ((Math.PI * 2) / arms);
      const phaseInner = timeSec * omegaInner + arm0;
      const phaseOuter = timeSec * omegaOuter + arm0;
      const sweep = Math.PI * 1.35;
      g.moveTo(
        cx + Math.cos(phaseInner) * rInnerDisk,
        cy + Math.sin(phaseInner) * rInnerDisk,
      );
      g.arc(cx, cy, rInnerDisk, phaseInner, phaseInner + sweep);
      g.stroke({
        width: 1.15 + diskLevel * 0.12,
        color: 0xfbbf24,
        alpha: Math.min(
          0.22 + diskLevel * 0.05 + hawkingPulse,
          0.62,
        ),
      });
      g.moveTo(
        cx + Math.cos(phaseOuter + 0.08) * rOuter,
        cy + Math.sin(phaseOuter + 0.08) * rOuter,
      );
      g.arc(cx, cy, rOuter, phaseOuter + 0.12, phaseOuter + sweep * 0.92);
      g.stroke({
        width: 1,
        color: 0xf59e0b,
        alpha: Math.min(
          0.18 + diskLevel * 0.05 + hawkingPulse * 0.8,
          0.52,
        ),
      });
    }
    const alpha = Math.min(
      0.18 + diskLevel * 0.055 + hawkingPulse * 1.1,
      0.78,
    );
    g.circle(cx, cy, r * (1.62 + pulse01 * 0.05));
    g.stroke({ width: 2.5, color: 0xf59e0b, alpha });
  }

  if (jetBuffActive) {
    const poleA = timeSec * 2.2;
    const r0 = diskLevel > 0 ? r * 0.35 : r * 0.45;
    const r1 = diskLevel > 0 ? r * 2.4 : r * 2.1;
    for (const pole of [poleA, poleA + Math.PI]) {
      const x0 = cx + Math.cos(pole) * r0;
      const y0 = cy + Math.sin(pole) * r0;
      const x1 = cx + Math.cos(pole) * r1;
      const y1 = cy + Math.sin(pole) * r1;
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.stroke({
        width: diskLevel > 0 ? 2.2 : 1.6,
        color: 0x38bdf8,
        alpha: 0.5,
        cap: "round",
      });
    }
  }
}

function paintMainStar(g: Graphics, layout: SimLayout): void {
  g.clear();
  const minS = Math.min(layout.width, layout.height);
  const r = Math.max(9, minS * STAR_DISPLAY_RADIUS_FRACTION);
  g.circle(layout.star.x, layout.star.y, r * 1.7);
  g.fill({ color: 0xfbbf24, alpha: 0.2 });
  g.circle(layout.star.x, layout.star.y, r);
  g.fill({ color: 0xf59e0b, alpha: 0.95 });
}

function paintPlanetSoiRings(
  g: Graphics,
  layout: SimLayout,
  planets: Planet[],
  simTimeSec: number,
  fillRgbById: Map<string, Rgb>,
  orbitHighlightPlanetId: string | null,
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

    const rgb = fillRgbById.get(planet.id) ?? planetPaletteRgb(planet);
    g.circle(s.x, s.y, Math.max(2.3, s.surfaceRadius));
    g.fill({ color: rgbToFill(rgb), alpha: 0.94 });
    g.circle(s.x, s.y, Math.max(2.3, s.surfaceRadius));
    g.stroke({
      width: hot ? 1.55 : 1.1,
      color: 0x0f172a,
      alpha: hot ? 0.5 : 0.35,
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

      const worldRoot = new Container();
      const galaxyRoot = new Container();
      scene.addChild(worldRoot);
      scene.addChild(galaxyRoot);

      const stars = new Graphics();
      const mainStar = new Graphics();
      const planetSoi = new Graphics();
      const hole = new Graphics();
      const trails = new Graphics();
      const collisionFx = new Graphics();
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

      worldRoot.addChild(stars);
      worldRoot.addChild(mainStar);
      worldRoot.addChild(planetSoi);
      worldRoot.addChild(hole);
      worldRoot.addChild(trails);
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
        const s = combinedWorldScale(levels, viewTier) * userZoom;
        worldRoot.pivot.set(layout.bh.x, layout.bh.y);
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
        paintStars(stars, layout.width, layout.height);
        paintMainStar(mainStar, layout);
        paintPlanetSoiRings(
          planetSoi,
          layout,
          pls,
          simTimeSec,
          planetFillSmooth,
          hoverPlanet?.id ?? null,
        );
        paintHole(
          hole,
          layout,
          consumePulse,
          levels.disk,
          performance.now() / 1000,
          levels.lensing,
          levels.hawking,
          jetBuffVis,
        );
        paintGalaxy(galaxy, layout, consumePulse);
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
        const viewTier = useGameStore.getState().viewTier;
        if (viewTier >= 2) return;

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
            const lay = layoutFromHost(
              host,
              useGameStore.getState().upgradeLevels,
            );
            const maxP = Math.min(lay.width, lay.height) * 3.5;
            panX = Math.max(-maxP, Math.min(maxP, panX));
            panY = Math.max(-maxP, Math.min(maxP, panY));
          }
          return;
        }

        const local = worldRoot.toLocal(e.global);
        hoverObjectId = pickObjectAtWorld(objects, local.x, local.y);
        const levelsPm = useGameStore.getState().upgradeLevels;
        const layoutPm = layoutFromHost(host, levelsPm);
        const simT = useGameStore.getState().gameTimeSec;
        const sysId = useGameStore.getState().activeSystemId;
        const sysList = useGameStore.getState().systems;
        const sys = sysList.find((s) => s.id === sysId);
        const pCtx = planetContextFromSimLayout(layoutPm);
        hoverPlanet =
          hoverObjectId === null
            ? pickPlanetAtWorld(
                local.x,
                local.y,
                sys?.planets ?? [],
                pCtx,
                simT,
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
          if (id === null) {
            selectedObjectId = null;
          } else {
            selectedObjectId = selectedObjectId === id ? null : id;
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
        const pivot = layoutW.bh;
        userZoom = Math.max(
          USER_ZOOM_MIN,
          Math.min(USER_ZOOM_MAX, userZoom * factor),
        );
        const sNew = combinedWorldScale(levelsW, viewTierW) * userZoom;
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
          buildPlanetPhysicsSnapshot(pl, pCtx, gameT, pi, nTr),
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

        const levels = useGameStore.getState().upgradeLevels;
        const viewTier = useGameStore.getState().viewTier;
        const activeSystemId = useGameStore.getState().activeSystemId;
        const systems = useGameStore.getState().systems;
        const activeSystem = systems.find((s) => s.id === activeSystemId);
        const layout = layoutFromHost(host, levels);

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

        const mpMult = mpIncomeMultiplier(levels, jetBuffActive);
        const shipsUnlocked = areShipsUnlocked(levels);

        const spawnCount = advanceSpawnAccumulator(
          spawnControl,
          simDt,
          BASE_SPAWN_PER_SECOND,
        );
        objects = trySpawn(objects, layout, spawnCount, {
          shipsUnlocked,
          upgradeLevels: levels,
        });

        const planetCtx = planetContextFromSimLayout(layout);
        const pList0 = activeSystem?.planets ?? [];
        const nPl0 = pList0.length;
        const planetSnaps = pList0.map((pl: Planet, pi: number) =>
          buildPlanetPhysicsSnapshot(pl, planetCtx, simTimeSec, pi, nPl0),
        );

        const { objects: nextObjects, consumed } = stepSimulation(
          objects,
          layout,
          simDt,
          levels,
          planetSnaps,
        );
        objects = nextObjects;

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
          for (const c of consumed) {
            gain += Math.floor(
              c.mp * mpMult * FIELD_MP_GLOBAL_MULTIPLIER,
            );
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
          }
        }

        if (simScale > 0 && levels.hawking > 0) {
          const massMp = useGameStore.getState().massMp;
          const hRate = hawkingMpPerSecond(levels, massMp);
          hawkingCarry += hRate * simDt;
          const hGain = Math.floor(hawkingCarry);
          hawkingCarry -= hGain;
          if (hGain > 0) useGameStore.getState().addMassMp(hGain);
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
          const a = (1 - u) * 0.82;
          const rr = 4 + u * 150;
          const col =
            f.via === "horizon"
              ? 0xfbbf24
              : f.via === "star"
                ? 0xfb923c
                : f.via === "planet"
                  ? 0x4ade80
                  : 0xf472b6;
          collisionFx.circle(f.x, f.y, rr);
          collisionFx.stroke({
            width: 1.8 + u * 2.5,
            color: col,
            alpha: a,
          });
        }

        paintHole(
          hole,
          layout,
          consumePulse,
          levels.disk,
          simTimeSec,
          levels.lensing,
          levels.hawking,
          jetBuffActive,
        );
        paintMainStar(mainStar, layout);
        paintPlanetSoiRings(
          planetSoi,
          layout,
          plTick,
          simTimeSec,
          planetFillSmooth,
          hoverPlanet?.id ?? null,
        );
        paintGalaxy(galaxy, layout, consumePulse);
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
