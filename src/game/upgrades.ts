/** Четыре ветки улучшений дыры (фаза 2) — см. obsidian/02, 07. */

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

const FIRST_LEVEL_COST_MP = 10;
const COST_MULTIPLIER = 1.45;

/** Множители эффекта за один уровень (мультипликативно по уровням). */
const EFFECT = {
  sizeHorizon: 1.12,
  gravityRadius: 1.18,
  diskMp: 1.08,
  efficiencyMp: 1.07,
  efficiencyPull: 1.04,
} as const;

const SUM_FOR_DISK = 5;
const SUM_FOR_EFFICIENCY = 10;

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
  return Math.ceil(FIRST_LEVEL_COST_MP * Math.pow(COST_MULTIPLIER, L));
}

export function isDiskUnlocked(levels: UpgradeLevels): boolean {
  return levelSum(levels) >= SUM_FOR_DISK;
}

export function isEfficiencyUnlocked(levels: UpgradeLevels): boolean {
  return levelSum(levels) >= SUM_FOR_EFFICIENCY;
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

/** Множитель MP при поглощении (диск × эффективность). */
export function mpIncomeMultiplier(levels: UpgradeLevels): number {
  return (
    Math.pow(EFFECT.diskMp, levels.disk) *
    Math.pow(EFFECT.efficiencyMp, levels.efficiency)
  );
}

/** Базовые доли экрана → абсолютные радиусы с учётом уровней. */
export function computeRadiiPx(
  minDimensionPx: number,
  levels: UpgradeLevels,
): { horizon: number; gravity: number } {
  const baseHorizon = minDimensionPx * 0.085;
  const baseGravity = minDimensionPx * 0.42;
  return {
    horizon: baseHorizon * Math.pow(EFFECT.sizeHorizon, levels.size),
    gravity: baseGravity * Math.pow(EFFECT.gravityRadius, levels.gravity),
  };
}

/** Ускорение притяжения с бонусом эффективности (+4% за уровень к «скорости поглощения»). */
export function effectiveGravityAccel(levels: UpgradeLevels): number {
  const base = 2200;
  return base * Math.pow(EFFECT.efficiencyPull, levels.efficiency);
}
