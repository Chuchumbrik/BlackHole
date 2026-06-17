import { describe, it, expect } from "vitest";
import {
  seedPlanetBodies,
  integratePlanetBodies,
  planetAlignment,
  detectPlanetCollisions,
  orbitInstability,
  type PlanetBody,
  type GravitySource,
} from "./planetPhysics";
import type { PlanetLayoutContext } from "./planetLayout";
import { BASE_STAR_MASS, BASE_BH_MASS } from "../balance";
import type { Planet } from "./types";

const ctx: PlanetLayoutContext = {
  starX: 1000,
  starY: 1000,
  horizonRadius: 30,
  systemRadius: 3000,
};
const star: GravitySource = { x: 1000, y: 1000, mass: BASE_STAR_MASS };

const mkPlanet = (i: number): Planet => ({
  id: `p${i}`,
  name: `P${i}`,
  orbitalDistance: 40 + i * 10,
  gravityProxy: 50,
  surfaceTemperature: 50,
  atmosphere: 50,
  hydrosphere: 50,
  geologicalActivity: 50,
  orbitPhaseRad: i,
  orbitSpeed: 0.1,
  stage: 1,
  stageProgressSec: 0,
  lifeEmergenceSec: 0,
  lifeBorn: false,
  mpYieldMult: 1,
  civLevel: 0,
  civProgressSec: 0,
  shieldUntilSec: 0,
  radiusScale: 1,
});

const finite = (b: PlanetBody) =>
  [b.x, b.y, b.vx, b.vy].every((v) => Number.isFinite(v));

describe("planetPhysics: seedPlanetBodies", () => {
  it("сеет тело на каждую планету, всё конечно", () => {
    const bodies = seedPlanetBodies([mkPlanet(0), mkPlanet(1)], ctx, star);
    expect(bodies).toHaveLength(2);
    expect(bodies.every(finite)).toBe(true);
  });
  it("стартовая скорость ~перпендикулярна радиусу (круговая орбита)", () => {
    const [b] = seedPlanetBodies([mkPlanet(0)], ctx, star);
    const rx = b.x - star.x;
    const ry = b.y - star.y;
    const dot = rx * b.vx + ry * b.vy; // должно быть ≈ 0
    const mag = Math.hypot(rx, ry) * Math.hypot(b.vx, b.vy) || 1;
    expect(Math.abs(dot) / mag).toBeLessThan(1e-6);
  });
});

describe("planetPhysics: integratePlanetBodies", () => {
  it("круговая орбита стабильна (радиус в коридоре, без NaN) за 600 шагов", () => {
    const bodies = seedPlanetBodies([mkPlanet(0)], ctx, star);
    const r0 = Math.hypot(bodies[0].x - star.x, bodies[0].y - star.y);
    const farBh: GravitySource = { x: -1e6, y: -1e6, mass: BASE_BH_MASS };
    for (let i = 0; i < 600; i++) integratePlanetBodies(bodies, star, farBh, 0.1, 4);
    expect(finite(bodies[0])).toBe(true);
    const r1 = Math.hypot(bodies[0].x - star.x, bodies[0].y - star.y);
    expect(Math.abs(r1 - r0) / r0).toBeLessThan(0.25); // не разлетается и не схлопывается
  });
  it("реалистичный старт: 4 планеты + дыра-возмущение не падают на звезду и не разлетаются (3000 шагов ×0.1)", () => {
    // дыра как в игре: далеко (~2000px) и со СЛАБОЙ стартовой возмущающей массой (~3%).
    const bh: GravitySource = {
      x: ctx.starX + 2000,
      y: ctx.starY,
      mass: BASE_BH_MASS * 0.03,
    };
    const planets = [mkPlanet(0), mkPlanet(1), mkPlanet(2), mkPlanet(3)];
    const bodies = seedPlanetBodies(planets, ctx, star, bh);
    const r0 = bodies.map((b) => Math.hypot(b.x - star.x, b.y - star.y));
    for (let i = 0; i < 3000; i++) integratePlanetBodies(bodies, star, bh, 0.1);
    bodies.forEach((b, i) => {
      expect(finite(b)).toBe(true);
      const r = Math.hypot(b.x - star.x, b.y - star.y);
      // радиус держится в коридоре ±30 % — нет спирали на звезду и нет ухода.
      expect(r).toBeGreaterThan(r0[i] * 0.7);
      expect(r).toBeLessThan(r0[i] * 1.3);
    });
  });
  it("dt<=0 — без изменений", () => {
    const bodies = seedPlanetBodies([mkPlanet(0)], ctx, star);
    const snap = { ...bodies[0] };
    integratePlanetBodies(bodies, star, { x: 0, y: 0, mass: 1 }, 0);
    expect(bodies[0]).toEqual(snap);
  });
});

describe("planetPhysics: столкновения и нестабильность", () => {
  it("пересекающиеся поверхности → пара на разрушение", () => {
    const a: PlanetBody = { id: "a", x: 0, y: 0, vx: 0, vy: 0, mass: 1, surfaceRadius: 10 };
    const b: PlanetBody = { id: "b", x: 5, y: 0, vx: 0, vy: 0, mass: 1, surfaceRadius: 10 };
    const far: PlanetBody = { id: "c", x: 999, y: 0, vx: 0, vy: 0, mass: 1, surfaceRadius: 10 };
    const hits = detectPlanetCollisions([a, b, far]);
    expect(hits).toHaveLength(1);
    expect(hits[0].sort()).toEqual(["a", "b"]);
  });
  it("planetAlignment: ~1 когда планеты в ряд, ~0 когда по кругу", () => {
    const st = { x: 0, y: 0 };
    const mk = (x: number, y: number): PlanetBody => ({
      id: `${x},${y}`, x, y, vx: 0, vy: 0, mass: 1, surfaceRadius: 1,
    });
    // все по одну сторону (в ряд по +X) → ~1
    const aligned = [mk(100, 0), mk(200, 0), mk(300, 1)];
    expect(planetAlignment(aligned, st)).toBeGreaterThan(0.99);
    // равномерно по кругу (4 стороны) → ~0
    const spread = [mk(100, 0), mk(-100, 0), mk(0, 100), mk(0, -100)];
    expect(planetAlignment(spread, st)).toBeLessThan(0.05);
    // пусто → 0
    expect(planetAlignment([], st)).toBe(0);
  });
  it("orbitInstability в [0,1] и растёт с массой дыры вблизи", () => {
    const [body] = seedPlanetBodies([mkPlanet(0)], ctx, star);
    const weakBh: GravitySource = { x: body.x + 50, y: body.y, mass: 1000 };
    const strongBh: GravitySource = { x: body.x + 50, y: body.y, mass: 5_000_000 };
    const w = orbitInstability(body, star, weakBh);
    const s = orbitInstability(body, star, strongBh);
    expect(w).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
    expect(s).toBeGreaterThan(w);
  });
});
