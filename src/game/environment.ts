/**
 * Ветка B — «Окружение» (апгрейды 7–11 из ТЗ, obsidian/02 и 07).
 *
 * Data-driven набор апгрейдов на окружение АКТИВНОЙ системы. Покупаются за MP,
 * действуют в пределах рана (сбрасываются при сжатии, как ветки сингулярности и
 * MP-апгрейды). В отличие от ветки A это слой РИСК/НАГРАДА: часть узлов помимо
 * дохода/спавна повышают `orbitPerturbMul` — множитель возмущающего влияния дыры
 * на орбиты планет (канал переиспользует уже откалиброванную орбитальную физику,
 * НЕ вводит новых интеграторов): орбиты деградируют быстрее, планеты раньше падают
 * в дыру (MP сейчас) ценой потерянной дани цивилизаций (упущенная выгода). Жадность
 * наказуема — см. принцип проекта (реальная астрофизика с игровыми допущениями).
 *
 * Разблокировка ветки — по суммарному уровню ветки A (как пороги джетов/линз/хокинга),
 * каждый узел открывается на своём пороге `unlockSum`.
 *
 * Добавить узел = дописать запись. Узел №11 «Сверхновая» — активируемая способность
 * (всплеск + временный ×3 + мини-дыра), реализуется в слое активных способностей
 * (вместе с Energy), не в этом пассивном наборе.
 */

/** Каналы влияния окружения. Нейтральное значение каждого — 1. */
export type EnvChannel = "mpMul" | "spawnRateMul" | "orbitPerturbMul";

export type EnvironmentUpgradeDef = {
  id: string;
  name: string;
  desc: string;
  /** Короткий текст риска для UI (если узел повышает нестабильность орбит). */
  risk?: string;
  baseCost: number; // MP
  costMult: number;
  maxLevel: number;
  /** Порог суммарного уровня ВЕТКИ A для разблокировки узла. */
  unlockSum: number;
  /** Множитель канала за уровень (несколько каналов на узел). */
  perLevel: Partial<Record<EnvChannel, number>>;
};

/** Минимальный порог суммарного уровня ветки A, открывающий саму вкладку «Окружение». */
export const ENVIRONMENT_BRANCH_UNLOCK_SUM = 18;

export const ENVIRONMENT_UPGRADES: EnvironmentUpgradeDef[] = [
  {
    id: "env_star_gravity",
    name: "Гравитация главной звезды",
    desc: "+6 % к частоте спавна комет и астероидов за уровень",
    risk: "Усиливает перетягивание орбит дырой — планеты дестабилизируются быстрее",
    baseCost: 500,
    costMult: 1.6,
    maxLevel: 40,
    unlockSum: 18,
    perLevel: { spawnRateMul: 1.06, orbitPerturbMul: 1.05 },
  },
  {
    id: "env_nebula",
    name: "Туманность системы",
    desc: "+5 % к частоте спавна материи за уровень (больше мелких тел)",
    baseCost: 700,
    costMult: 1.6,
    maxLevel: 40,
    unlockSum: 22,
    perLevel: { spawnRateMul: 1.05 },
  },
  {
    id: "env_tidal",
    name: "Приливные силы планет",
    desc: "+7 % к добыче MP за уровень",
    risk: "Приливная деградация орбит — выше риск падения/разрушения планеты",
    baseCost: 1200,
    costMult: 1.62,
    maxLevel: 40,
    unlockSum: 26,
    perLevel: { mpMul: 1.07, orbitPerturbMul: 1.06 },
  },
  {
    id: "env_neighbor_galaxy",
    name: "Приближение соседней галактики",
    desc: "+4 % к добыче MP и +4 % к частоте спавна за уровень",
    baseCost: 2000,
    costMult: 1.62,
    maxLevel: 40,
    unlockSum: 30,
    perLevel: { mpMul: 1.04, spawnRateMul: 1.04 },
  },
];

export function environmentUpgradeCost(
  def: EnvironmentUpgradeDef,
  level: number,
): number {
  return Math.ceil(def.baseCost * Math.pow(def.costMult, level));
}

/** Открыт ли узел (по суммарному уровню ветки A). */
export function isEnvironmentUpgradeUnlocked(
  def: EnvironmentUpgradeDef,
  branchASum: number,
): boolean {
  return branchASum >= def.unlockSum;
}

/** Открыта ли вкладка «Окружение» (хотя бы один узел доступен). */
export function isEnvironmentBranchUnlocked(branchASum: number): boolean {
  return branchASum >= ENVIRONMENT_BRANCH_UNLOCK_SUM;
}

/**
 * План оптовой покупки узла окружения: сколько уровней купится за `count`
 * (с учётом баланса, `maxLevel` и разблокировки) и их суммарная цена.
 */
export function planEnvironmentPurchase(
  def: EnvironmentUpgradeDef,
  level: number,
  massMp: number,
  count: number,
  branchASum: number,
): { count: number; totalCost: number } {
  if (!isEnvironmentUpgradeUnlocked(def, branchASum)) {
    return { count: 0, totalCost: 0 };
  }
  let lvl = level;
  let mass = massMp;
  let totalCost = 0;
  let bought = 0;
  for (let i = 0; i < count && lvl < def.maxLevel; i++) {
    const c = environmentUpgradeCost(def, lvl);
    if (mass < c) break;
    mass -= c;
    totalCost += c;
    lvl++;
    bought++;
  }
  return { count: bought, totalCost };
}

export type EnvironmentMods = {
  mpMul: number;
  spawnRateMul: number;
  /** Множитель возмущающего влияния дыры на орбиты планет (риск). */
  orbitPerturbMul: number;
};

export function neutralEnvironmentMods(): EnvironmentMods {
  return { mpMul: 1, spawnRateMul: 1, orbitPerturbMul: 1 };
}

/** Свернуть уровни узлов в множители каналов. */
export function environmentModifiers(
  levels: Record<string, number>,
): EnvironmentMods {
  const m = neutralEnvironmentMods();
  for (const def of ENVIRONMENT_UPGRADES) {
    const lvl = levels[def.id] ?? 0;
    if (lvl <= 0) continue;
    for (const [ch, perLevel] of Object.entries(def.perLevel) as [
      EnvChannel,
      number,
    ][]) {
      m[ch] *= Math.pow(perLevel, lvl);
    }
  }
  return m;
}
