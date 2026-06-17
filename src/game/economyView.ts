/**
 * Производные экономики для UI: установившиеся множители добычи MP и эффективный
 * пассив Хокинга с учётом ВСЕХ источников (ветки дыры, перки престижа, MP-апгрейды,
 * окружение, достижения). Нужно, чтобы карточки улучшений показывали корректные
 * числа «в пересчёте других улучшений», а не изолированно.
 *
 * Транзиентные баффы (события/сверхновая) и софткап здесь НЕ учитываются — это
 * установившаяся оценка; рантайм в `GameCanvas` применяет их поверх.
 */
import {
  hawkingMpPerSecond,
  mpIncomeMultiplier,
  type UpgradeLevels,
} from "./upgrades";
import { prestigeModifiers } from "./prestigePerks";
import { mpUpgradeModifiers } from "./mpUpgrades";
import { environmentModifiers } from "./environment";
import { achievementMpMul } from "./achievements";

export type EconomyState = {
  upgradeLevels: UpgradeLevels;
  prestigePerkLevels: Record<string, number>;
  mpUpgradeLevels: Record<string, number>;
  environmentLevels: Record<string, number>;
  achievementsUnlocked: string[];
  massMp: number;
};

/** Установившийся множитель добычи MP (без транзиентных событий/баффов и софткапа). */
export function steadyMpMul(s: EconomyState): number {
  return (
    mpIncomeMultiplier(s.upgradeLevels, false) *
    prestigeModifiers(s.prestigePerkLevels).mpMul *
    mpUpgradeModifiers(s.mpUpgradeLevels).mpMul *
    environmentModifiers(s.environmentLevels).mpMul *
    achievementMpMul(s.achievementsUnlocked)
  );
}

/** Эффективный пассив Хокинга (MP/с) с учётом общего множителя добычи. */
export function effectiveHawkingPerSec(s: EconomyState): number {
  const base =
    hawkingMpPerSecond(s.upgradeLevels, s.massMp) *
    prestigeModifiers(s.prestigePerkLevels).hawkingMul *
    mpUpgradeModifiers(s.mpUpgradeLevels).hawkingMul;
  return base * steadyMpMul(s);
}
