/**
 * Достижения (data-driven). Открываются по достижению порога состояния и дают
 * постоянный БОНУС (Q-ACH1) — множитель дохода, применяется в игровом цикле,
 * как перки. Набор открытых сохраняется.
 *
 * Добавить достижение = дописать запись.
 */
export type AchievementCtx = {
  massMp: number;
  prestigePoints: number;
  gameTimeSec: number;
  upgradeSum: number;
};

export type AchievementDef = {
  id: string;
  name: string;
  desc: string;
  /** Множитель дохода MP за это достижение (бонус). */
  bonusMpMul: number;
  check: (c: AchievementCtx) => boolean;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "mp_1k",
    name: "Первая тысяча",
    desc: "Накопить 1 000 MP",
    bonusMpMul: 1.03,
    check: (c) => c.massMp >= 1_000,
  },
  {
    id: "mp_100k",
    name: "Сточная воронка",
    desc: "Накопить 100 000 MP",
    bonusMpMul: 1.05,
    check: (c) => c.massMp >= 100_000,
  },
  {
    id: "mp_1m",
    name: "Миллион в горизонте",
    desc: "Накопить 1 000 000 MP",
    bonusMpMul: 1.08,
    check: (c) => c.massMp >= 1_000_000,
  },
  {
    id: "first_prestige",
    name: "Новая вселенная",
    desc: "Совершить первое сжатие (PP ≥ 1)",
    bonusMpMul: 1.05,
    check: (c) => c.prestigePoints >= 1,
  },
  {
    id: "prestige_25",
    name: "Вечный цикл",
    desc: "Накопить 25 PP",
    bonusMpMul: 1.1,
    check: (c) => c.prestigePoints >= 25,
  },
  {
    id: "upgrades_25",
    name: "Глубокая сингулярность",
    desc: "Суммарный уровень веток ≥ 25",
    bonusMpMul: 1.05,
    check: (c) => c.upgradeSum >= 25,
  },
  {
    id: "hour_in",
    name: "Час поглощения",
    desc: "Сыграть 1 час игрового времени",
    bonusMpMul: 1.03,
    check: (c) => c.gameTimeSec >= 3600,
  },
];

/** Множитель дохода от всех открытых достижений. */
export function achievementMpMul(unlocked: string[]): number {
  let m = 1;
  const set = new Set(unlocked);
  for (const a of ACHIEVEMENTS) if (set.has(a.id)) m *= a.bonusMpMul;
  return m;
}

/** Список достижений, условие которых выполнено, но которых ещё нет в `unlocked`. */
export function newlyUnlocked(
  ctx: AchievementCtx,
  unlocked: string[],
): AchievementDef[] {
  const set = new Set(unlocked);
  return ACHIEVEMENTS.filter((a) => !set.has(a.id) && a.check(ctx));
}
