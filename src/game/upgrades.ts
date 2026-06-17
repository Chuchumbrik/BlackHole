/**
 * Логика семи веток улучшений дыры (фазы 2–3).
 * Константы формул — `balance/` (obsidian/07, ручки темпа — 13).
 */

import {
  BASE_GRAVITY_ACCEL,
  BASE_GRAVITY_FRACTION,
  BASE_HORIZON_FRACTION,
  CAMERA_SCALE_MIN,
  GRAVITY_RADIUS_MIN_OVER_HORIZON,
  massHorizonMul,
  JET_FIELD_MP_MULT,
  SHIPS_UNLOCK_MIN_SUM,
  SUM_FOR_DISK_UNLOCK,
  SUM_FOR_EFFICIENCY_UNLOCK,
  SUM_FOR_HAWKING_UNLOCK,
  SUM_FOR_JETS_UNLOCK,
  SUM_FOR_LENSING_UNLOCK,
  UPGRADE_COST_MULTIPLIER_PER_LEVEL,
  UPGRADE_FIRST_LEVEL_COST_MP,
  UPGRADE_PER_LEVEL_FACTOR,
  VIEW_TIER_GALAXY_MIN_SUM,
  VIEW_TIER_SYSTEM_MIN_SUM,
  VIEW_TIER_SYSTEM_SCALE_MUL,
} from "./balance";
import {
  HAWKING_BASE_MP_PER_SEC,
  HAWKING_MASS_LOG_COEFF,
  HAWKING_PER_LEVEL_FACTOR,
  LENSING_RARE_WEIGHT_MULT_PER_LEVEL,
} from "./balance/branchA46";
import { computeModifiers } from "./modifiers";

export const UPGRADE_BRANCHES = [
  "size",
  "gravity",
  "disk",
  "efficiency",
  "jets",
  "lensing",
  "hawking",
] as const;

export type UpgradeBranch = (typeof UPGRADE_BRANCHES)[number];

export type UpgradeLevels = Record<UpgradeBranch, number>;

export const ZERO_UPGRADE_LEVELS: UpgradeLevels = {
  size: 0,
  gravity: 0,
  disk: 0,
  efficiency: 0,
  jets: 0,
  lensing: 0,
  hawking: 0,
};

const F = UPGRADE_PER_LEVEL_FACTOR;

export function levelSum(levels: UpgradeLevels): number {
  return (
    levels.size +
    levels.gravity +
    levels.disk +
    levels.efficiency +
    levels.jets +
    levels.lensing +
    levels.hawking
  );
}

export function nextUpgradeCostMp(
  levels: UpgradeLevels,
  branch: UpgradeBranch,
): number {
  const L = levels[branch];
  return Math.ceil(
    UPGRADE_FIRST_LEVEL_COST_MP * Math.pow(UPGRADE_COST_MULTIPLIER_PER_LEVEL, L),
  );
}

export function isDiskUnlocked(levels: UpgradeLevels): boolean {
  return levelSum(levels) >= SUM_FOR_DISK_UNLOCK;
}

export function isEfficiencyUnlocked(levels: UpgradeLevels): boolean {
  return levelSum(levels) >= SUM_FOR_EFFICIENCY_UNLOCK;
}

export function isJetsUnlocked(levels: UpgradeLevels): boolean {
  return levelSum(levels) >= SUM_FOR_JETS_UNLOCK;
}

export function isLensingUnlocked(levels: UpgradeLevels): boolean {
  return levelSum(levels) >= SUM_FOR_LENSING_UNLOCK;
}

export function isHawkingUnlocked(levels: UpgradeLevels): boolean {
  return levelSum(levels) >= SUM_FOR_HAWKING_UNLOCK;
}

export function canPurchaseUpgrade(
  levels: UpgradeLevels,
  branch: UpgradeBranch,
  massMp: number,
): boolean {
  if (massMp < nextUpgradeCostMp(levels, branch)) return false;
  if (branch === "disk" && !isDiskUnlocked(levels)) return false;
  if (branch === "efficiency" && !isEfficiencyUnlocked(levels)) {
    return false;
  }
  if (branch === "jets" && !isJetsUnlocked(levels)) return false;
  if (branch === "lensing" && !isLensingUnlocked(levels)) return false;
  if (branch === "hawking" && !isHawkingUnlocked(levels)) return false;
  return true;
}

/**
 * План оптовой покупки ветки: сколько уровней реально купится за `count`
 * (с учётом баланса и разблокировок) и их суммарная цена. Единый источник
 * истины для стора (списание) и панели (отображение цены под множитель).
 */
export function planUpgradePurchase(
  levels: UpgradeLevels,
  branch: UpgradeBranch,
  massMp: number,
  count: number,
): { count: number; totalCost: number } {
  const tmp = { ...levels };
  let mass = massMp;
  let totalCost = 0;
  let bought = 0;
  for (let i = 0; i < count; i++) {
    if (!canPurchaseUpgrade(tmp, branch, mass)) break;
    const c = nextUpgradeCostMp(tmp, branch);
    mass -= c;
    totalCost += c;
    tmp[branch] += 1;
    bought++;
  }
  return { count: bought, totalCost };
}

/** Множитель MP при поглощении (диск × эффективность × джеты при баффе). */
export function mpIncomeMultiplier(
  levels: UpgradeLevels,
  jetBuffActive: boolean,
): number {
  const base = computeModifiers({ upgradeLevels: levels }).mpMul;
  return jetBuffActive ? base * JET_FIELD_MP_MULT : base;
}

/** Базовые доли экрана → абсолютные радиусы с учётом уровней. */
export function computeRadiiPx(
  minDimensionPx: number,
  levels: UpgradeLevels,
  massMp = 0,
): { horizon: number; gravity: number } {
  const mods = computeModifiers({ upgradeLevels: levels });
  const baseHorizon = minDimensionPx * BASE_HORIZON_FRACTION;
  const baseGravity = minDimensionPx * BASE_GRAVITY_FRACTION;
  // Горизонт растёт от ветки size И от накопленной массы (мягко, лог).
  const horizon = baseHorizon * mods.horizonMul * massHorizonMul(massMp);
  let gravity = baseGravity * mods.gravityRadiusMul;
  const minGravity = horizon * GRAVITY_RADIUS_MIN_OVER_HORIZON;
  if (gravity < minGravity) gravity = minGravity;
  return { horizon, gravity };
}

/** Ускорение притяжения с бонусом эффективности («скорость поглощения» в ТЗ). */
export function effectiveGravityAccel(levels: UpgradeLevels): number {
  return (
    BASE_GRAVITY_ACCEL *
    computeModifiers({ upgradeLevels: levels }).gravityAccelMul
  );
}

/**
 * Масштаб игрового слоя: при росте горизонта (ветка size) камера отъезжает —
 * относительный размер дыры на экране не растёт бесконечно.
 */
export function cameraWorldScale(levels: UpgradeLevels): number {
  const ratio = 1 / computeModifiers({ upgradeLevels: levels }).horizonMul;
  return Math.max(CAMERA_SCALE_MIN, Math.min(1, ratio));
}

export function isViewTierUnlocked(
  tier: 1 | 2,
  levels: UpgradeLevels,
): boolean {
  const s = levelSum(levels);
  if (tier === 1) return s >= VIEW_TIER_SYSTEM_MIN_SUM;
  return s >= VIEW_TIER_GALAXY_MIN_SUM;
}

export function areShipsUnlocked(levels: UpgradeLevels): boolean {
  return levelSum(levels) >= SHIPS_UNLOCK_MIN_SUM;
}

export function shipThrustMultiplierFromLevels(levels: UpgradeLevels): number {
  return computeModifiers({ upgradeLevels: levels }).shipThrustMul;
}

export function combinedWorldScale(
  levels: UpgradeLevels,
  viewTier: 0 | 1 | 2,
): number {
  const base = cameraWorldScale(levels);
  if (viewTier === 1) return base * VIEW_TIER_SYSTEM_SCALE_MUL;
  return base;
}

/** Пассивный MP/с от хокингова излучения (0 при уровне 0). */
export function hawkingMpPerSecond(
  levels: UpgradeLevels,
  massMp: number,
): number {
  const L = levels.hawking;
  if (L <= 0) return 0;
  return (
    HAWKING_BASE_MP_PER_SEC *
    Math.pow(HAWKING_PER_LEVEL_FACTOR, L) *
    (1 + HAWKING_MASS_LOG_COEFF * Math.log1p(Math.max(0, massMp) / 100))
  );
}

/** Текущие мультипликаторы веток относительно базы баланса (для UI «сейчас»). */
export type UpgradeBranchSnapshot = {
  horizonMul: number;
  gravityMul: number;
  diskIncomeMul: number;
  efficiencyIncomeMul: number;
  efficiencyPullMul: number;
  jetsLevel: number;
  lensingRareWeightMul: number;
  hawkingMpPerSecApprox: number;
};

export function upgradeBranchSnapshot(
  levels: UpgradeLevels,
  massMpForHawkingHint = 0,
): UpgradeBranchSnapshot {
  const lensL = levels.lensing;
  return {
    horizonMul: Math.pow(F.horizon, levels.size),
    gravityMul: Math.pow(F.gravityRadius, levels.gravity),
    diskIncomeMul: Math.pow(F.diskGlobalMp, levels.disk),
    efficiencyIncomeMul: Math.pow(F.efficiencyGlobalMp, levels.efficiency),
    efficiencyPullMul: Math.pow(F.efficiencyPull, levels.efficiency),
    jetsLevel: levels.jets,
    lensingRareWeightMul:
      lensL > 0 ? Math.pow(LENSING_RARE_WEIGHT_MULT_PER_LEVEL, lensL) : 1,
    hawkingMpPerSecApprox: hawkingMpPerSecond(levels, massMpForHawkingHint),
  };
}
