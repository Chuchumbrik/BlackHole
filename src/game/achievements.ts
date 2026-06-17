/**
 * Достижения (data-driven, многоуровневые). Открываются по достижению порога
 * показателя и дают постоянный БОНУС к доходу MP (Q-ACH1), как перки. Набор
 * открытых сохраняется и переживает сжатие.
 *
 * «Многоуровневость» = несколько записей одной темы с растущими порогами и
 * бонусом (tier 1..N). Бонусы намеренно небольшие: их произведение проходит
 * через `softCapIncomeMul`, поэтому не разносит баланс. Добавить достижение =
 * дописать порог в нужную тему.
 */
import { UPGRADE_BRANCHES, type UpgradeBranch, type UpgradeLevels } from "./upgrades";

export type AchievementCtx = {
  /** Текущая масса на руках. */
  massMp: number;
  /** Всего MP получено за всё время. */
  lifetimeMassMp: number;
  /** Всего MP потрачено за всё время. */
  massSpentTotal: number;
  /** Суммарно заработанные PP (lifetime). */
  prestigePoints: number;
  /** Число совершённых сжатий. */
  prestigeCount: number;
  /** Игровое время, сек. */
  gameTimeSec: number;
  /** Сумма уровней веток дыры. */
  upgradeSum: number;
  /** Уровни веток по отдельности. */
  upgradeLevels: UpgradeLevels;
  /** Сглаженный доход, MP/с. */
  incomeMpPerSec: number;
  /** Сколько планет с зародившейся жизнью (по всем системам). */
  planetsWithLife: number;
  /** Максимальный достигнутый тир цивилизации. */
  maxCivLevel: number;
};

export type AchievementDef = {
  id: string;
  /** Тема (для группировки в UI). */
  group: string;
  name: string;
  desc: string;
  /** Множитель дохода MP за это достижение (бонус). */
  bonusMpMul: number;
  check: (c: AchievementCtx) => boolean;
};

/** Один порог (тир) внутри темы. */
export type AchievementTier = {
  id: string;
  at: number;
  name: string;
  desc: string;
  mul: number;
};

/** Тема достижения = один показатель и его растущие пороги (тиры). */
export type AchievementTheme = {
  group: string;
  /** Текущее значение показателя из контекста. */
  pick: (c: AchievementCtx) => number;
  /** Форматирование значения для UI. */
  fmt: (n: number) => string;
  tiers: AchievementTier[];
};

const fmtInt = (n: number): string => Math.floor(n).toLocaleString("ru-RU");
function fmtTime(sec: number): string {
  const s = Math.floor(sec);
  if (s < 3600) return `${Math.floor(s / 60)} мин`;
  return `${Math.floor(s / 3600)} ч`;
}

function theme(
  group: string,
  idbase: string,
  pick: (c: AchievementCtx) => number,
  fmt: (n: number) => string,
  rows: { at: number; name: string; desc: string; mul: number }[],
): AchievementTheme {
  return {
    group,
    pick,
    fmt,
    tiers: rows.map((r, i) => ({
      id: `${idbase}_${i + 1}`,
      at: r.at,
      name: r.name,
      desc: r.desc,
      mul: r.mul,
    })),
  };
}

const BRANCH_LABELS: Record<UpgradeBranch, string> = {
  size: "Радиус Шварцшильда",
  gravity: "Радиус притяжения",
  disk: "Аккреционный диск",
  efficiency: "Эффективность",
  jets: "Джеты",
  lensing: "Линзирование",
  hawking: "Излучение Хокинга",
};

/** Темы по уровню каждой ветки: 10 / 25 / 50 (одна карточка-тема на ветку). */
function branchThemes(): AchievementTheme[] {
  const STEPS = [
    { at: 10, mul: 1.02 },
    { at: 25, mul: 1.03 },
    { at: 50, mul: 1.05 },
  ];
  return UPGRADE_BRANCHES.map((b) =>
    theme(
      BRANCH_LABELS[b],
      `branch_${b}`,
      (c) => c.upgradeLevels[b] ?? 0,
      fmtInt,
      STEPS.map((s) => ({
        at: s.at,
        name: `${BRANCH_LABELS[b]} — ур. ${s.at}`,
        desc: `Поднять ветку «${BRANCH_LABELS[b]}» до уровня ${s.at}`,
        mul: s.mul,
      })),
    ),
  );
}

/** Темы достижений (структурно): показатель + растущие пороги. */
export const ACHIEVEMENT_THEMES: AchievementTheme[] = [
  theme("Масса на руках", "mass", (c) => c.massMp, fmtInt, [
    { at: 1_000, name: "Первая тысяча", desc: "Накопить 1 000 MP", mul: 1.03 },
    { at: 10_000, name: "Десять тысяч", desc: "Накопить 10 000 MP", mul: 1.03 },
    { at: 100_000, name: "Сточная воронка", desc: "Накопить 100 000 MP", mul: 1.04 },
    { at: 1_000_000, name: "Миллион в горизонте", desc: "Накопить 1 000 000 MP", mul: 1.05 },
    { at: 10_000_000, name: "Десять миллионов", desc: "Накопить 10 000 000 MP", mul: 1.06 },
    { at: 100_000_000, name: "Сверхмассивная", desc: "Накопить 100 000 000 MP", mul: 1.08 },
    { at: 1_000_000_000, name: "Миллиард масс", desc: "Накопить 1 000 000 000 MP", mul: 1.1 },
  ]),
  theme("Поглощено всего", "life", (c) => c.lifetimeMassMp, fmtInt, [
    { at: 100_000, name: "Аппетит", desc: "Получить суммарно 100 000 MP", mul: 1.03 },
    { at: 1_000_000, name: "Аппетит растёт", desc: "Получить суммарно 1 000 000 MP", mul: 1.04 },
    { at: 10_000_000, name: "Прожорливость", desc: "Получить суммарно 10 000 000 MP", mul: 1.05 },
    { at: 100_000_000, name: "Ненасытность", desc: "Получить суммарно 100 000 000 MP", mul: 1.07 },
    { at: 1_000_000_000, name: "Бездна", desc: "Получить суммарно 1 000 000 000 MP", mul: 1.09 },
    { at: 10_000_000_000, name: "Пожиратель миров", desc: "Получить суммарно 10 000 000 000 MP", mul: 1.12 },
  ]),
  theme("Потрачено всего", "spent", (c) => c.massSpentTotal, fmtInt, [
    { at: 10_000, name: "Транжира", desc: "Потратить суммарно 10 000 MP", mul: 1.02 },
    { at: 100_000, name: "Инвестор", desc: "Потратить суммарно 100 000 MP", mul: 1.03 },
    { at: 1_000_000, name: "Меценат", desc: "Потратить суммарно 1 000 000 MP", mul: 1.05 },
    { at: 10_000_000, name: "Мот", desc: "Потратить суммарно 10 000 000 MP", mul: 1.07 },
    { at: 100_000_000, name: "Расточитель вселенных", desc: "Потратить суммарно 100 000 000 MP", mul: 1.09 },
  ]),
  theme("Сжатия (PP)", "pp", (c) => c.prestigePoints, fmtInt, [
    { at: 1, name: "Новая вселенная", desc: "Заработать первое PP", mul: 1.04 },
    { at: 10, name: "Циклы", desc: "Заработать 10 PP", mul: 1.05 },
    { at: 25, name: "Вечный цикл", desc: "Заработать 25 PP", mul: 1.06 },
    { at: 100, name: "Архитектор циклов", desc: "Заработать 100 PP", mul: 1.08 },
    { at: 250, name: "Мастер сжатия", desc: "Заработать 250 PP", mul: 1.1 },
    { at: 500, name: "Властелин энтропии", desc: "Заработать 500 PP", mul: 1.12 },
    { at: 1_000, name: "Бог циклов", desc: "Заработать 1 000 PP", mul: 1.15 },
  ]),
  theme("Число сжатий", "prestiges", (c) => c.prestigeCount, fmtInt, [
    { at: 1, name: "Первый коллапс", desc: "Совершить 1 сжатие", mul: 1.03 },
    { at: 5, name: "Рецидив", desc: "Совершить 5 сжатий", mul: 1.04 },
    { at: 10, name: "Серийный коллапс", desc: "Совершить 10 сжатий", mul: 1.05 },
    { at: 25, name: "Феникс", desc: "Совершить 25 сжатий", mul: 1.07 },
    { at: 50, name: "Сизиф", desc: "Совершить 50 сжатий", mul: 1.09 },
    { at: 100, name: "Колесо сансары", desc: "Совершить 100 сжатий", mul: 1.12 },
  ]),
  theme("Развитие дыры", "upg", (c) => c.upgradeSum, fmtInt, [
    { at: 10, name: "Начало пути", desc: "Сумма уровней веток ≥ 10", mul: 1.02 },
    { at: 25, name: "Глубокая сингулярность", desc: "Сумма уровней веток ≥ 25", mul: 1.04 },
    { at: 50, name: "Уплотнение", desc: "Сумма уровней веток ≥ 50", mul: 1.05 },
    { at: 100, name: "Доминион гравитации", desc: "Сумма уровней веток ≥ 100", mul: 1.07 },
    { at: 150, name: "Предел Шварцшильда", desc: "Сумма уровней веток ≥ 150", mul: 1.09 },
    { at: 250, name: "За горизонтом", desc: "Сумма уровней веток ≥ 250", mul: 1.12 },
  ]),
  theme("Доход (MP/с)", "income", (c) => c.incomeMpPerSec, fmtInt, [
    { at: 5, name: "Ручеёк", desc: "Доход ≥ 5 MP/с", mul: 1.02 },
    { at: 25, name: "Поток", desc: "Доход ≥ 25 MP/с", mul: 1.03 },
    { at: 100, name: "Река материи", desc: "Доход ≥ 100 MP/с", mul: 1.05 },
    { at: 500, name: "Лавина", desc: "Доход ≥ 500 MP/с", mul: 1.07 },
    { at: 2_000, name: "Цунами", desc: "Доход ≥ 2 000 MP/с", mul: 1.1 },
  ]),
  theme("Время поглощения", "time", (c) => c.gameTimeSec, fmtTime, [
    { at: 300, name: "Разогрев", desc: "5 минут игрового времени", mul: 1.02 },
    { at: 3_600, name: "Час поглощения", desc: "1 час игрового времени", mul: 1.03 },
    { at: 10_800, name: "Долгая вахта", desc: "3 часа игрового времени", mul: 1.04 },
    { at: 21_600, name: "Бессонница", desc: "6 часов игрового времени", mul: 1.05 },
    { at: 43_200, name: "Полусутки", desc: "12 часов игрового времени", mul: 1.07 },
    { at: 86_400, name: "Сутки сингулярности", desc: "24 часа игрового времени", mul: 1.09 },
    { at: 259_200, name: "Вне времени", desc: "72 часа игрового времени", mul: 1.12 },
  ]),
  theme("Жизнь", "bio", (c) => c.planetsWithLife, fmtInt, [
    { at: 1, name: "Колыбель", desc: "Зародить жизнь на планете", mul: 1.04 },
    { at: 3, name: "Оазисы", desc: "Жизнь на 3 планетах", mul: 1.06 },
    { at: 5, name: "Сеятель", desc: "Жизнь на 5 планетах", mul: 1.08 },
    { at: 10, name: "Садовник галактик", desc: "Жизнь на 10 планетах", mul: 1.1 },
    { at: 25, name: "Демиург", desc: "Жизнь на 25 планетах", mul: 1.13 },
  ]),
  theme("Цивилизации", "civ", (c) => c.maxCivLevel, fmtInt, [
    { at: 1, name: "Первый контакт", desc: "Цивилизация тира 1", mul: 1.04 },
    { at: 2, name: "Космическая эра", desc: "Цивилизация тира 2", mul: 1.06 },
    { at: 3, name: "Сфера Дайсона", desc: "Цивилизация тира 3", mul: 1.08 },
    { at: 4, name: "Галактическая дань", desc: "Цивилизация тира 4", mul: 1.12 },
  ]),
  ...branchThemes(),
];

export const ACHIEVEMENTS: AchievementDef[] = ACHIEVEMENT_THEMES.flatMap((t) =>
  t.tiers.map((tr) => ({
    id: tr.id,
    group: t.group,
    name: tr.name,
    desc: tr.desc,
    bonusMpMul: tr.mul,
    check: (c: AchievementCtx) => t.pick(c) >= tr.at,
  })),
);

/** Прогресс по теме: значение, пройдено тиров, следующий порог и доля до него. */
export type ThemeProgress = {
  value: number;
  done: number;
  total: number;
  /** Следующий порог (null — все пройдены). */
  nextAt: number | null;
  /** Предыдущий порог (0, если ни одного). */
  prevAt: number;
  /** Доля прогресса в текущем тире 0..1. */
  fraction: number;
};

export function themeProgress(
  t: AchievementTheme,
  c: AchievementCtx,
): ThemeProgress {
  const value = t.pick(c);
  let done = 0;
  for (const tier of t.tiers) if (value >= tier.at) done++;
  const total = t.tiers.length;
  const allDone = done >= total;
  const nextAt = allDone ? null : t.tiers[done].at;
  const prevAt = done > 0 ? t.tiers[done - 1].at : 0;
  const fraction =
    allDone || nextAt === null
      ? 1
      : Math.max(0, Math.min(1, (value - prevAt) / (nextAt - prevAt)));
  return { value, done, total, nextAt, prevAt, fraction };
}

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
