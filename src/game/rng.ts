import type { ObjectKind } from "./balance";
import { MP_RANGE, SPAWN_WEIGHTS } from "./balance";

/** Типы только для обломков (без корабля-побега). */
export type DebrisKind = 0 | 1 | 2 | 3;

/** Равномерное целое в [min, max]. */
export function randIntInclusive(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Ролл типа объекта по весам ТЗ (55 / 25 / 15 / 5). */
export function rollObjectKind(): DebrisKind {
  const r = Math.random() * 100;
  let acc = 0;
  for (let i = 0; i < SPAWN_WEIGHTS.length; i++) {
    acc += SPAWN_WEIGHTS[i];
    if (r < acc) return i as DebrisKind;
  }
  return 3;
}

export function rollMpForKind(kind: ObjectKind): number {
  const [lo, hi] = MP_RANGE[kind];
  return randIntInclusive(lo, hi);
}

/** Качества корабля при спавне (влияют на тягу и награду за побег). */
export function rollShipQualities(): { thrust01: number; pilot01: number } {
  return {
    thrust01: 0.72 + Math.random() * 0.48,
    pilot01: 0.82 + Math.random() * 0.36,
  };
}
