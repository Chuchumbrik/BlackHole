import {
  Application,
  Container,
  Graphics,
  Sprite,
  Texture,
} from "pixi.js";
import { useEffect, useRef } from "react";
import { BASE_SPAWN_PER_SECOND } from "../game/balance";
import { KIND_COLORS, KIND_RADIUS } from "../game/colors";
import {
  advanceSpawnAccumulator,
  resetSimulationIds,
  type SimLayout,
  type SimObject,
  stepSimulation,
  trySpawn,
  type SpawnControl,
} from "../game/simulation";
import { useGameStore } from "../store/useGameStore";

const BODY_TEXTURE = Texture.WHITE;

function layoutFromHost(el: HTMLElement): SimLayout {
  const w = Math.max(el.clientWidth, 1);
  const h = Math.max(el.clientHeight, 1);
  const minD = Math.min(w, h);
  return {
    cx: w / 2,
    cy: h / 2,
    width: w,
    height: h,
    horizonRadius: minD * 0.085,
    gravityRadius: minD * 0.42,
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
): void {
  const { cx, cy } = layout;
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
}

/** Спрайты надёжнее batched Graphics.circle в Pixi v8 на части окружений. */
function syncBodySprites(
  layer: Container,
  pool: Sprite[],
  objects: SimObject[],
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
    const d = r * 2;
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

      const stars = new Graphics();
      const hole = new Graphics();
      const bodyLayer = new Container();
      scene.addChild(stars);
      scene.addChild(hole);
      scene.addChild(bodyLayer);

      const syncSceneSize = () => {
        const layout = layoutFromHost(host);
        paintStars(stars, layout.width, layout.height);
        paintHole(hole, layout, consumePulse);
        syncBodySprites(bodyLayer, spritePool, objects);
      };

      observer = new ResizeObserver(() => {
        syncSceneSize();
        if (application.renderer?.resize) {
          application.renderer.resize(host.clientWidth, host.clientHeight);
        }
      });
      observer.observe(host);

      let lastMs = performance.now();

      const tick = (nowMs: number) => {
        if (cancelled || !app) return;

        const dt = Math.min((nowMs - lastMs) / 1000, 0.12);
        lastMs = nowMs;

        const layout = layoutFromHost(host);

        const spawnCount = advanceSpawnAccumulator(
          spawnControl,
          dt,
          BASE_SPAWN_PER_SECOND,
        );
        objects = trySpawn(objects, layout, spawnCount);

        const { objects: nextObjects, consumed } = stepSimulation(
          objects,
          layout,
          dt,
        );
        objects = nextObjects;

        if (consumed.length > 0) {
          consumePulse = 1;
          let gain = 0;
          for (const c of consumed) gain += c.mp;
          useGameStore.getState().addMassMp(gain);
        }

        consumePulse = Math.max(0, consumePulse - dt * 3.5);

        paintHole(hole, layout, consumePulse);
        syncBodySprites(bodyLayer, spritePool, objects);

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
