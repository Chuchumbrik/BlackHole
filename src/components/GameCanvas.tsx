import { Application, Container, Graphics } from "pixi.js";
import { useEffect, useRef } from "react";

/**
 * Один Pixi canvas на сцену; React только монтирует контейнер.
 * Дальше сюда переносится игровой цикл из ТЗ.
 */
export function GameCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let app: Application | null = null;
    let observer: ResizeObserver | null = null;

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
      scene.addChild(stars);
      scene.addChild(hole);

      const paint = () => {
        const w = Math.max(host.clientWidth, 1);
        const h = Math.max(host.clientHeight, 1);
        const cx = w / 2;
        const cy = h / 2;
        const r = Math.min(w, h) * 0.085;

        stars.clear();
        for (let i = 0; i < 160; i++) {
          const sx = ((i * 73) % 997) / 997;
          const sy = ((i * 51) % 1009) / 1009;
          const x = sx * w;
          const y = sy * h;
          const a = 0.12 + (i % 7) * 0.04;
          stars.circle(x, y, 0.7 + (i % 3) * 0.35);
          stars.fill({ color: 0xffffff, alpha: a });
        }

        hole.clear();
        hole.circle(cx, cy, r * 1.42);
        hole.stroke({ width: 2, color: 0x3d2566, alpha: 0.45 });
        hole.circle(cx, cy, r);
        hole.fill({ color: 0x000000 });
      };

      observer = new ResizeObserver(() => {
        paint();
      });
      observer.observe(host);
      paint();
    };

    void boot();

    return () => {
      cancelled = true;
      observer?.disconnect();
      if (app) {
        app.destroy(true, { children: true });
      }
      host.replaceChildren();
    };
  }, []);

  return <div ref={hostRef} className="game-canvas-host" />;
}
