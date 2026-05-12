import type { ObjectKind } from "./balance";
import { MP_RANGE, SPAWN_WEIGHTS } from "./balance";
import { LENSING_RARE_WEIGHT_MULT_PER_LEVEL } from "./balance/branchA46";
import type { UpgradeLevels } from "./upgrades";

/** Типы только для обломков (без корабля-побега). */
export type DebrisKind = 0 | 1 | 2 | 3;

/** Равномерное целое в [min, max]. */
export function randIntInclusive(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Ролл типа объекта по весам ТЗ; линзирование усиливает вес «редкого» (kind 3). */
export function rollObjectKind(upgradeLevels?: UpgradeLevels): DebrisKind {
  const lens = upgradeLevels?.lensing ?? 0;
  const weights = SPAWN_WEIGHTS.map((w, i) =>
    i === 3 && lens > 0
      ? w * Math.pow(LENSING_RARE_WEIGHT_MULT_PER_LEVEL, lens)
      : w,
  );
  const sum = weights.reduce((a, b) => a + b, 0);
  const r = Math.random() * sum;
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i];
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
