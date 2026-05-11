import {
  Application,
  Container,
  Graphics,
  Sprite,
  Text,
  Texture,
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
  STAR_COLLISION_RADIUS_FRACTION,
  STAR_DISPLAY_RADIUS_FRACTION,
  STELLAR_SYSTEM_RADIUS_MUL,
  SYSTEM_OUTER_RADIUS_FRACTION,
} from "../game/balance";
import { KIND_COLORS, KIND_RADIUS } from "../game/colors";
import {
  advanceSpawnAccumulator,
  predictTrajectoryPoints,
  resetSimulationIds,
  type SimLayout,
  type SimObject,
  stepSimulation,
  trySpawn,
  type SpawnControl,
} from "../game/simulation";
import {
  areShipsUnlocked,
  combinedWorldScale,
  computeRadiiPx,
  effectiveGravityAccel,
  mpIncomeMultiplier,
  type UpgradeLevels,
} from "../game/upgrades";
import { useGameStore } from "../store/useGameStore";

const BODY_TEXTURE = Texture.WHITE;

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

  if (diskLevel > 0) {
    const omega = 0.38 + diskLevel * 0.05;
    const arms = 3;
    for (let arm = 0; arm < arms; arm++) {
      const phase = timeSec * omega + arm * ((Math.PI * 2) / arms);
      const rOuter = r * (1.52 + diskLevel * 0.04);
      const sweep = Math.PI * 1.35;
      g.moveTo(
        cx + Math.cos(phase) * r * 1.18,
        cy + Math.sin(phase) * r * 1.18,
      );
      g.arc(cx, cy, r * 1.18, phase, phase + sweep);
      g.stroke({
        width: 1.15 + diskLevel * 0.12,
        color: 0xfbbf24,
        alpha: Math.min(0.22 + diskLevel * 0.05, 0.55),
      });
      g.moveTo(
        cx + Math.cos(phase + 0.08) * rOuter,
        cy + Math.sin(phase + 0.08) * rOuter,
      );
      g.arc(cx, cy, rOuter, phase + 0.12, phase + sweep * 0.92);
      g.stroke({
        width: 1,
        color: 0xf59e0b,
        alpha: Math.min(0.18 + diskLevel * 0.05, 0.45),
      });
    }
    const alpha = Math.min(0.18 + diskLevel * 0.055, 0.72);
    g.circle(cx, cy, r * (1.62 + pulse01 * 0.05));
    g.stroke({ width: 2.5, color: 0xf59e0b, alpha });
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
    const r = KIND_RADIUS[o.kind] * 2;
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

function syncBodySprites(
  layer: Container,
  pool: Sprite[],
  objects: SimObject[],
  layout: SimLayout,
): void {
  while (pool.length < objects.length) {
    const s = new Sprite(BODY_TEXTURE);
    s.anchor.set(0.5);
    layer.addChild(s);
    pool.push(s);
  }
  while (pool.length > objects.length) {
    const s = pool.pop();
    if (s) {
      layer.removeChild(s);
      s.destroy();
    }
  }
  for (let i = 0; i < objects.length; i++) {
    const o = objects[i];
    const s = pool[i];
    const r = KIND_RADIUS[o.kind];
    const shrink = spriteShrinkNearHorizon(o, layout);
    const d = r * 2 * shrink;
    s.width = d;
    s.height = d;
    s.tint = KIND_COLORS[o.kind];
    s.alpha = 0.96;
    s.position.set(o.x, o.y);
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
    const spritePool: Sprite[] = [];

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
      const hole = new Graphics();
      const trails = new Graphics();
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

      worldRoot.addChild(stars);
      worldRoot.addChild(mainStar);
      worldRoot.addChild(hole);
      worldRoot.addChild(trails);
      worldRoot.addChild(bodyLayer);
      worldRoot.addChild(selectionLabel);

      const galaxy = new Graphics();
      galaxyRoot.addChild(galaxy);

      let hoverObjectId: number | null = null;
      let selectedObjectId: number | null = null;

      let panX = 0;
      let panY = 0;
      let userZoom = 1;
      const USER_ZOOM_MIN = 0.42;
      const USER_ZOOM_MAX = 2.85;
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
        const layout = layoutFromHost(host, levels);
        paintStars(stars, layout.width, layout.height);
        paintMainStar(mainStar, layout);
        paintHole(hole, layout, consumePulse, levels.disk, performance.now() / 1000);
        paintGalaxy(galaxy, layout, consumePulse);
        syncBodySprites(bodyLayer, spritePool, objects, layout);
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
            const maxP = Math.min(lay.width, lay.height) * 1.12;
            panX = Math.max(-maxP, Math.min(maxP, panX));
            panY = Math.max(-maxP, Math.min(maxP, panY));
          }
          return;
        }

        const local = worldRoot.toLocal(e.global);
        hoverObjectId = pickObjectAtWorld(objects, local.x, local.y);
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
        ptrDown = false;
      });

      const canvasEl = application.canvas;
      const onWheel = (ev: WheelEvent) => {
        ev.preventDefault();
        if (cancelled || useGameStore.getState().viewTier >= 2) return;
        const factor = ev.deltaY > 0 ? 1.06 : 1 / 1.06;
        userZoom = Math.max(
          USER_ZOOM_MIN,
          Math.min(USER_ZOOM_MAX, userZoom * factor),
        );
      };
      canvasEl.addEventListener("wheel", onWheel, { passive: false });
      wheelCleanup = () =>
        canvasEl.removeEventListener("wheel", onWheel);

      let lastMs = performance.now();

      const paintTrajectories = (
        layout: SimLayout,
        levels: UpgradeLevels,
        viewTier: 0 | 1 | 2,
      ) => {
        trails.clear();
        if (viewTier >= 2) return;

        const showTrail = (obj: SimObject) => {
          const pts = predictTrajectoryPoints(obj, layout, levels, {
            maxSeconds: 12,
            stepSeconds: 0.03,
            maxPoints: 360,
          });
          if (pts.length < 2) return;
          const hot = hoverObjectId === obj.id;
          const color = hot ? 0xffffff : 0x8b93a5;
          const alpha = hot ? 0.92 : 0.42;
          strokeDashedPolyline(trails, pts, color, alpha, 5, 4);
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

        const levels = useGameStore.getState().upgradeLevels;
        const viewTier = useGameStore.getState().viewTier;
        const layout = layoutFromHost(host, levels);
        const mpMult = mpIncomeMultiplier(levels);
        const shipsUnlocked = areShipsUnlocked(levels);

        const spawnCount = advanceSpawnAccumulator(
          spawnControl,
          dt,
          BASE_SPAWN_PER_SECOND,
        );
        objects = trySpawn(objects, layout, spawnCount, { shipsUnlocked });

        const { objects: nextObjects, consumed, escaped } = stepSimulation(
          objects,
          layout,
          dt,
          levels,
        );
        objects = nextObjects;

        if (
          selectedObjectId !== null &&
          !objects.some((o) => o.id === selectedObjectId)
        ) {
          selectedObjectId = null;
        }

        if (consumed.length > 0) {
          consumePulse = 1;
          let gain = 0;
          for (const c of consumed) {
            gain += Math.floor(
              c.mp * mpMult * FIELD_MP_GLOBAL_MULTIPLIER,
            );
          }
          useGameStore.getState().addMassMp(gain);
        }

        if (escaped.length > 0) {
          let bonus = 0;
          for (const e of escaped) {
            bonus += Math.floor(
              e.bonusMp * mpMult * FIELD_MP_GLOBAL_MULTIPLIER,
            );
          }
          if (bonus > 0) useGameStore.getState().addMassMp(bonus);
        }

        consumePulse = Math.max(0, consumePulse - dt * 3.5);

        paintHole(hole, layout, consumePulse, levels.disk, nowMs / 1000);
        paintMainStar(mainStar, layout);
        paintGalaxy(galaxy, layout, consumePulse);
        syncBodySprites(bodyLayer, spritePool, objects, layout);
        applyCamera(levels, layout, viewTier);
        paintTrajectories(layout, levels, viewTier);

        if (viewTier >= 2) {
          selectionLabel.visible = false;
        } else if (selectedObjectId !== null) {
          const sel = objects.find((o) => o.id === selectedObjectId);
          if (sel) {
            selectionLabel.text = sel.displayName;
            const lift = KIND_RADIUS[sel.kind] * 2 + 10;
            selectionLabel.position.set(sel.x, sel.y - lift);
            selectionLabel.visible = true;
          } else {
            selectionLabel.visible = false;
          }
        } else {
          selectionLabel.visible = false;
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
      if (app) {
        app.destroy(true, { children: true });
      }
      spritePool.length = 0;
      host.replaceChildren();
    };
  }, []);

  return <div ref={hostRef} className="game-canvas-host" />;
}
