import { Graphics } from "pixi.js";
import type { ObjectKind } from "./balance";
import { KIND_COLORS, KIND_RADIUS } from "./colors";
import type { SimObject } from "./simulation";

function objRadius(o: SimObject): number {
  return o.radiusPx ?? KIND_RADIUS[o.kind];
}

function mulberry32(a: number): () => number {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Вершины контура в локальных координатах (центр 0,0), масштаб ~radius. */
function outlineVerts(
  kind: ObjectKind,
  seed: number,
  radius: number,
): { x: number; y: number }[] {
  const rnd = mulberry32(seed);
  const baseN =
    kind === 0 ? 12 : kind === 1 ? 9 : kind === 2 ? 15 : kind === 3 ? 7 : 5;
  const n = baseN + Math.floor(rnd() * 5);
  const verts: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 - Math.PI / 2 + (rnd() - 0.5) * 0.35;
    const rr = radius * (kind === 2 ? 0.42 + rnd() * 0.58 : 0.52 + rnd() * 0.48);
    verts.push({ x: Math.cos(ang) * rr, y: Math.sin(ang) * rr });
  }
  return verts;
}

/** Корабль — уплощённый ромб/шеврон. */
function shipVerts(radius: number, seed: number): { x: number; y: number }[] {
  const rnd = mulberry32(seed);
  const w = radius * (1.05 + rnd() * 0.2);
  const h = radius * (0.62 + rnd() * 0.15);
  return [
    { x: w, y: 0 },
    { x: 0, y: -h },
    { x: -w * 0.35, y: 0 },
    { x: 0, y: h },
  ];
}

function vertsForObject(o: SimObject): { x: number; y: number }[] {
  const r = objRadius(o);
  const seed = o.shapeSeed ?? o.id * 9973;
  if (o.kind === 4) return shipVerts(r, seed);
  return outlineVerts(o.kind, seed, r);
}

const STROKE: Record<ObjectKind, number> = {
  0: 0x4b5563,
  1: 0x451a03,
  2: 0x334155,
  3: 0xb45309,
  4: 0x0e7490,
};

/** Перерисовка одного обломка/корабля в мировых координатах. */
export function paintSimObjectShape(
  g: Graphics,
  o: SimObject,
  simTimeSec: number,
): void {
  g.clear();
  const verts = vertsForObject(o);
  if (verts.length < 2) return;
  const spin = o.spinRate ?? 0.9;
  const baseRot = (o.shapeSeed ?? o.id) * 0.00173;
  g.rotation = baseRot + simTimeSec * spin;
  g.position.set(o.x, o.y);

  const fill = KIND_COLORS[o.kind];
  const stroke = STROKE[o.kind];
  g.moveTo(verts[0].x, verts[0].y);
  for (let i = 1; i < verts.length; i++) {
    g.lineTo(verts[i].x, verts[i].y);
  }
  g.closePath();
  g.fill({ color: fill, alpha: 0.94 });
  g.stroke({ width: 1.15, color: stroke, alpha: 0.55 });
}
