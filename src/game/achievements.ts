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

/** Многоуровневая тема из массива {порог, имя, бонус}. */
function tiers(
  group: string,
  idbase: string,
  pick: (c: AchievementCtx) => number,
  rows: { at: number; name: string; desc: string; mul: number }[],
): AchievementDef[] {
  return rows.map((r, i) => ({
    id: `${idbase}_${i + 1}`,
    group,
    name: r.name,
    desc: r.desc,
    bonusMpMul: r.mul,
    check: (c) => pick(c) >= r.at,
  }));
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

/** Достижения по уровню каждой ветки: 10 / 25 / 50. */
function branchTiers(): AchievementDef[] {
  const STEPS = [
    { at: 10, mul: 1.02 },
    { at: 25, mul: 1.03 },
    { at: 50, mul: 1.05 },
  ];
  const out: AchievementDef[] = [];
  for (const b of UPGRADE_BRANCHES) {
    STEPS.forEach((s, i) => {
      out.push({
        id: `branch_${b}_${i + 1}`,
        group: "Ветки улучшений",
        name: `${BRANCH_LABELS[b]} — ур. ${s.at}`,
        desc: `Поднять ветку «${BRANCH_LABELS[b]}» до уровня ${s.at}`,
        bonusMpMul: s.mul,
        check: (c) => (c.upgradeLevels[b] ?? 0) >= s.at,
      });
    });
  }
  return out;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  ...tiers("Масса на руках", "mass", (c) => c.massMp, [
    { at: 1_000, name: "Первая тысяча", desc: "Накопить 1 000 MP", mul: 1.03 },
    { at: 10_000, name: "Десять тысяч", desc: "Накопить 10 000 MP", mul: 1.03 },
    { at: 100_000, name: "Сточная воронка", desc: "Накопить 100 000 MP", mul: 1.04 },
    { at: 1_000_000, name: "Миллион в горизонте", desc: "Накопить 1 000 000 MP", mul: 1.05 },
    { at: 10_000_000, name: "Десять миллионов", desc: "Накопить 10 000 000 MP", mul: 1.06 },
    { at: 100_000_000, name: "Сверхмассивная", desc: "Накопить 100 000 000 MP", mul: 1.08 },
    { at: 1_000_000_000, name: "Миллиард масс", desc: "Накопить 1 000 000 000 MP", mul: 1.1 },
  ]),
  ...tiers("Поглощено всего", "life", (c) => c.lifetimeMassMp, [
    { at: 100_000, name: "Аппетит", desc: "Получить суммарно 100 000 MP", mul: 1.03 },
    { at: 1_000_000, name: "Аппетит растёт", desc: "Получить суммарно 1 000 000 MP", mul: 1.04 },
    { at: 10_000_000, name: "Прожорливость", desc: "Получить суммарно 10 000 000 MP", mul: 1.05 },
    { at: 100_000_000, name: "Ненасытность", desc: "Получить суммарно 100 000 000 MP", mul: 1.07 },
    { at: 1_000_000_000, name: "Бездна", desc: "Получить суммарно 1 000 000 000 MP", mul: 1.09 },
    { at: 10_000_000_000, name: "Пожиратель миров", desc: "Получить суммарно 10 000 000 000 MP", mul: 1.12 },
  ]),
  ...tiers("Потрачено всего", "spent", (c) => c.massSpentTotal, [
    { at: 10_000, name: "Транжира", desc: "Потратить суммарно 10 000 MP", mul: 1.02 },
    { at: 100_000, name: "Инвестор", desc: "Потратить суммарно 100 000 MP", mul: 1.03 },
    { at: 1_000_000, name: "Меценат", desc: "Потратить суммарно 1 000 000 MP", mul: 1.05 },
    { at: 10_000_000, name: "Мот", desc: "Потратить суммарно 10 000 000 MP", mul: 1.07 },
    { at: 100_000_000, name: "Расточитель вселенных", desc: "Потратить суммарно 100 000 000 MP", mul: 1.09 },
  ]),
  ...tiers("Сжатия (PP)", "pp", (c) => c.prestigePoints, [
    { at: 1, name: "Новая вселенная", desc: "Заработать первое PP", mul: 1.04 },
    { at: 10, name: "Циклы", desc: "Заработать 10 PP", mul: 1.05 },
    { at: 25, name: "Вечный цикл", desc: "Заработать 25 PP", mul: 1.06 },
    { at: 100, name: "Архитектор циклов", desc: "Заработать 100 PP", mul: 1.08 },
    { at: 250, name: "Мастер сжатия", desc: "Заработать 250 PP", mul: 1.1 },
    { at: 500, name: "Властелин энтропии", desc: "Заработать 500 PP", mul: 1.12 },
    { at: 1_000, name: "Бог циклов", desc: "Заработать 1 000 PP", mul: 1.15 },
  ]),
  ...tiers("Число сжатий", "prestiges", (c) => c.prestigeCount, [
    { at: 1, name: "Первый коллапс", desc: "Совершить 1 сжатие", mul: 1.03 },
    { at: 5, name: "Рецидив", desc: "Совершить 5 сжатий", mul: 1.04 },
    { at: 10, name: "Серийный коллапс", desc: "Совершить 10 сжатий", mul: 1.05 },
    { at: 25, name: "Феникс", desc: "Совершить 25 сжатий", mul: 1.07 },
    { at: 50, name: "Сизиф", desc: "Совершить 50 сжатий", mul: 1.09 },
    { at: 100, name: "Колесо сансары", desc: "Совершить 100 сжатий", mul: 1.12 },
  ]),
  ...tiers("Развитие дыры", "upg", (c) => c.upgradeSum, [
    { at: 10, name: "Начало пути", desc: "Сумма уровней веток ≥ 10", mul: 1.02 },
    { at: 25, name: "Глубокая сингулярность", desc: "Сумма уровней веток ≥ 25", mul: 1.04 },
    { at: 50, name: "Уплотнение", desc: "Сумма уровней веток ≥ 50", mul: 1.05 },
    { at: 100, name: "Доминион гравитации", desc: "Сумма уровней веток ≥ 100", mul: 1.07 },
    { at: 150, name: "Предел Шварцшильда", desc: "Сумма уровней веток ≥ 150", mul: 1.09 },
    { at: 250, name: "За горизонтом", desc: "Сумма уровней веток ≥ 250", mul: 1.12 },
  ]),
  ...tiers("Доход (MP/с)", "income", (c) => c.incomeMpPerSec, [
    { at: 5, name: "Ручеёк", desc: "Доход ≥ 5 MP/с", mul: 1.02 },
    { at: 25, name: "Поток", desc: "Доход ≥ 25 MP/с", mul: 1.03 },
    { at: 100, name: "Река материи", desc: "Доход ≥ 100 MP/с", mul: 1.05 },
    { at: 500, name: "Лавина", desc: "Доход ≥ 500 MP/с", mul: 1.07 },
    { at: 2_000, name: "Цунами", desc: "Доход ≥ 2 000 MP/с", mul: 1.1 },
  ]),
  ...tiers("Время поглощения", "time", (c) => c.gameTimeSec, [
    { at: 300, name: "Разогрев", desc: "5 минут игрового времени", mul: 1.02 },
    { at: 3_600, name: "Час поглощения", desc: "1 час игрового времени", mul: 1.03 },
    { at: 10_800, name: "Долгая вахта", desc: "3 часа игрового времени", mul: 1.04 },
    { at: 21_600, name: "Бессонница", desc: "6 часов игрового времени", mul: 1.05 },
    { at: 43_200, name: "Полусутки", desc: "12 часов игрового времени", mul: 1.07 },
    { at: 86_400, name: "Сутки сингулярности", desc: "24 часа игрового времени", mul: 1.09 },
    { at: 259_200, name: "Вне времени", desc: "72 часа игрового времени", mul: 1.12 },
  ]),
  ...tiers("Жизнь", "bio", (c) => c.planetsWithLife, [
    { at: 1, name: "Колыбель", desc: "Зародить жизнь на планете", mul: 1.04 },
    { at: 3, name: "Оазисы", desc: "Жизнь на 3 планетах", mul: 1.06 },
    { at: 5, name: "Сеятель", desc: "Жизнь на 5 планетах", mul: 1.08 },
    { at: 10, name: "Садовник галактик", desc: "Жизнь на 10 планетах", mul: 1.1 },
    { at: 25, name: "Демиург", desc: "Жизнь на 25 планетах", mul: 1.13 },
  ]),
  ...tiers("Цивилизации", "civ", (c) => c.maxCivLevel, [
    { at: 1, name: "Первый контакт", desc: "Цивилизация тира 1", mul: 1.04 },
    { at: 2, name: "Космическая эра", desc: "Цивилизация тира 2", mul: 1.06 },
    { at: 3, name: "Сфера Дайсона", desc: "Цивилизация тира 3", mul: 1.08 },
    { at: 4, name: "Галактическая дань", desc: "Цивилизация тира 4", mul: 1.12 },
  ]),
  ...branchTiers(),
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
