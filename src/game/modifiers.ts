/**
 * Единый сборщик модификаторов дыры в именованные каналы.
 *
 * Сейчас собирает вклад только веток апгрейдов (поведение 1-в-1 с прежними
 * формулами в `upgrades.ts`). В своих фазах сюда подключаются перки престижа
 * (тип B) и бонусы достижений — без правок потребителей. Цель: ОДНА точка,
 * куда добавляются новые эффекты, вместо разбросанных формул.
 *
 * Нейтральное значение каждого канала — 1 (чистый множитель).
 */
import {
  SHIP_THRUST_DISK_FACTOR_PER_LEVEL,
  SHIP_THRUST_EFFICIENCY_FACTOR_PER_LEVEL,
  UPGRADE_PER_LEVEL_FACTOR,
} from "./balance";
import { LENSING_RARE_WEIGHT_MULT_PER_LEVEL } from "./balance/branchA46";
import type { UpgradeLevels } from "./upgrades";

const F = UPGRADE_PER_LEVEL_FACTOR;

export type Modifiers = {
  /** Множитель MP-дохода (без контекстного баффа джетов — он применяется отдельно). */
  mpMul: number;
  /** Доп. множитель пассива хокинга (ветка hawking считается отдельно из-за лог-члена массы). */
  hawkingMul: number;
  /** Множитель радиуса зоны притяжения. */
  gravityRadiusMul: number;
  /** Множитель ускорения притяжения. */
  gravityAccelMul: number;
  /** Множитель радиуса горизонта. */
  horizonMul: number;
  /** Множитель веса редких объектов при спавне. */
  rareWeightMul: number;
  /** Множитель тяги кораблей (попытка вырваться из зоны). */
  shipThrustMul: number;
  /** Множитель частоты спавна (резерв под перки престижа «плотность поля»). */
  spawnRateMul: number;
  /** Множитель цены апгрейдов (резерв под перк «дешёвая сингулярность»). */
  costMul: number;
};

export function neutralModifiers(): Modifiers {
  return {
    mpMul: 1,
    hawkingMul: 1,
    gravityRadiusMul: 1,
    gravityAccelMul: 1,
    horizonMul: 1,
    rareWeightMul: 1,
    shipThrustMul: 1,
    spawnRateMul: 1,
    costMul: 1,
  };
}

export type ModifierInput = {
  upgradeLevels: UpgradeLevels;
  // perkLevels / achievements — добавятся в фазах R и ACH.
};

/** Собрать итоговые модификаторы из всех источников. */
export function computeModifiers(input: ModifierInput): Modifiers {
  const lv = input.upgradeLevels;
  const m = neutralModifiers();

  // --- Ветки апгрейдов (1-в-1 с прежними формулами upgrades.ts) ---
  m.mpMul *=
    Math.pow(F.diskGlobalMp, lv.disk) *
    Math.pow(F.efficiencyGlobalMp, lv.efficiency);
  m.gravityRadiusMul *= Math.pow(F.gravityRadius, lv.gravity);
  m.gravityAccelMul *= Math.pow(F.efficiencyPull, lv.efficiency);
  m.horizonMul *= Math.pow(F.horizon, lv.size);
  m.rareWeightMul *=
    lv.lensing > 0
      ? Math.pow(LENSING_RARE_WEIGHT_MULT_PER_LEVEL, lv.lensing)
      : 1;
  m.shipThrustMul *=
    Math.pow(SHIP_THRUST_DISK_FACTOR_PER_LEVEL, lv.disk) *
    Math.pow(SHIP_THRUST_EFFICIENCY_FACTOR_PER_LEVEL, lv.efficiency);

  return m;
}
