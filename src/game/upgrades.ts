/**
 * Логика четырёх веток улучшений дыры (фаза 2).
 * Константы формул — `balance/` (obsidian/07, ручки темпа — 13).
 */

import {
  BASE_GRAVITY_ACCEL,
  BASE_GRAVITY_FRACTION,
  BASE_HORIZON_FRACTION,
  CAMERA_SCALE_MIN,
  SHIPS_UNLOCK_MIN_SUM,
  SHIP_THRUST_DISK_FACTOR_PER_LEVEL,
  SHIP_THRUST_EFFICIENCY_FACTOR_PER_LEVEL,
  SUM_FOR_DISK_UNLOCK,
  SUM_FOR_EFFICIENCY_UNLOCK,
  UPGRADE_COST_MULTIPLIER_PER_LEVEL,
  UPGRADE_FIRST_LEVEL_COST_MP,
  UPGRADE_PER_LEVEL_FACTOR,
  VIEW_TIER_GALAXY_MIN_SUM,
  VIEW_TIER_SYSTEM_MIN_SUM,
  VIEW_TIER_SYSTEM_SCALE_MUL,
} from "./balance";

export const UPGRADE_BRANCHES = [
  "size",
  "gravity",
  "disk",
  "efficiency",
] as const;

export type UpgradeBranch = (typeof UPGRADE_BRANCHES)[number];

export type UpgradeLevels = Record<UpgradeBranch, number>;

export const ZERO_UPGRADE_LEVELS: UpgradeLevels = {
  size: 0,
  gravity: 0,
  disk: 0,
  efficiency: 0,
};

const F = UPGRADE_PER_LEVEL_FACTOR;

export function levelSum(levels: UpgradeLevels): number {
  return (
    levels.size + levels.gravity + levels.disk + levels.efficiency
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
  return true;
}

/** Множитель MP при поглощении и побеге (диск × эффективность). */
export function mpIncomeMultiplier(levels: UpgradeLevels): number {
  return (
    Math.pow(F.diskGlobalMp, levels.disk) *
    Math.pow(F.efficiencyGlobalMp, levels.efficiency)
  );
}

/** Базовые доли экрана → абсолютные радиусы с учётом уровней. */
export function computeRadiiPx(
  minDimensionPx: number,
  levels: UpgradeLevels,
): { horizon: number; gravity: number } {
  const baseHorizon = minDimensionPx * BASE_HORIZON_FRACTION;
  const baseGravity = minDimensionPx * BASE_GRAVITY_FRACTION;
  return {
    horizon: baseHorizon * Math.pow(F.horizon, levels.size),
    gravity: baseGravity * Math.pow(F.gravityRadius, levels.gravity),
  };
}

/** Ускорение притяжения с бонусом эффективности («скорость поглощения» в ТЗ). */
export function effectiveGravityAccel(levels: UpgradeLevels): number {
  return (
    BASE_GRAVITY_ACCEL *
    Math.pow(F.efficiencyPull, levels.efficiency)
  );
}

/**
 * Масштаб игрового слоя: при росте горизонта (ветка size) камера отъезжает —
 * относительный размер дыры на экране не растёт бесконечно.
 */
export function cameraWorldScale(levels: UpgradeLevels): number {
  const ratio = 1 / Math.pow(F.horizon, levels.size);
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
  return (
    Math.pow(SHIP_THRUST_DISK_FACTOR_PER_LEVEL, levels.disk) *
    Math.pow(SHIP_THRUST_EFFICIENCY_FACTOR_PER_LEVEL, levels.efficiency)
  );
}

export function combinedWorldScale(
  levels: UpgradeLevels,
  viewTier: 0 | 1 | 2,
): number {
  const base = cameraWorldScale(levels);
  if (viewTier === 1) return base * VIEW_TIER_SYSTEM_SCALE_MUL;
  return base;
}
