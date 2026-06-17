/**
 * Продвинутые ветки апгрейдов C/D/E (GDD §5.2) — закрывают «5 веток» дыры.
 * Data-driven (как окружение/MP-апгрейды): покупаются за MP, ран-скоуп (сброс при
 * сжатии). Открываются по числу сжатий (мета-прогрессия). Каналы:
 *   C — Время/Релятивизм:  mpMul, spawnRateMul
 *   D — Жизнь/Цивилизации: lifeSpeedMul (ускоряет развитие/жизнь планет), mpMul
 *   E — Экзотика:          mpMul, spawnRateMul (поздняя, мощная)
 */
export type AdvBranch = "time" | "life" | "exotic";
export type AdvChannel = "mpMul" | "spawnRateMul" | "lifeSpeedMul";

export type AdvUpgradeDef = {
  id: string;
  branch: AdvBranch;
  name: string;
  desc: string;
  baseCost: number;
  costMult: number;
  maxLevel: number;
  perLevel: Partial<Record<AdvChannel, number>>;
};

/** Порог числа сжатий, открывающий ветку. */
export const ADV_BRANCH_UNLOCK_PRESTIGE: Record<AdvBranch, number> = {
  time: 1,
  life: 2,
  exotic: 3,
};

export const ADV_BRANCH_LABEL: Record<AdvBranch, string> = {
  time: "Время / Релятивизм",
  life: "Жизнь и Цивилизации",
  exotic: "Экзотика",
};

export const ADV_UPGRADES: AdvUpgradeDef[] = [
  // — C: Время / Релятивизм —
  {
    id: "temporal_condenser",
    branch: "time",
    name: "Темпоральный конденсатор",
    desc: "+5 % к добыче MP за уровень",
    baseCost: 3000,
    costMult: 1.6,
    maxLevel: 60,
    perLevel: { mpMul: 1.05 },
  },
  {
    id: "doppler_boost",
    branch: "time",
    name: "Доплеровское усиление",
    desc: "+5 % к частоте спавна за уровень",
    baseCost: 3500,
    costMult: 1.6,
    maxLevel: 60,
    perLevel: { spawnRateMul: 1.05 },
  },
  // — D: Жизнь и Цивилизации —
  {
    id: "panspermia",
    branch: "life",
    name: "Панспермия",
    desc: "+12 % к скорости развития/жизни планет за уровень",
    baseCost: 6000,
    costMult: 1.65,
    maxLevel: 40,
    perLevel: { lifeSpeedMul: 1.12 },
  },
  {
    id: "tech_harvest",
    branch: "life",
    name: "Жатва технологий",
    desc: "+6 % к добыче MP за уровень (дань цивилизаций)",
    baseCost: 7000,
    costMult: 1.65,
    maxLevel: 40,
    perLevel: { mpMul: 1.06 },
  },
  // — E: Экзотика —
  {
    id: "kerr_spin",
    branch: "exotic",
    name: "Спин Керра",
    desc: "+8 % к добыче MP за уровень",
    baseCost: 20000,
    costMult: 1.7,
    maxLevel: 40,
    perLevel: { mpMul: 1.08 },
  },
  {
    id: "dark_matter",
    branch: "exotic",
    name: "Тёмная материя",
    desc: "+7 % к частоте спавна за уровень",
    baseCost: 24000,
    costMult: 1.7,
    maxLevel: 40,
    perLevel: { spawnRateMul: 1.07 },
  },
];

export function advancedUpgradeCost(def: AdvUpgradeDef, level: number): number {
  return Math.ceil(def.baseCost * Math.pow(def.costMult, level));
}

export function isAdvBranchUnlocked(
  branch: AdvBranch,
  prestigeCount: number,
): boolean {
  return prestigeCount >= ADV_BRANCH_UNLOCK_PRESTIGE[branch];
}

export function planAdvancedPurchase(
  def: AdvUpgradeDef,
  level: number,
  massMp: number,
  count: number,
  prestigeCount: number,
): { count: number; totalCost: number } {
  if (!isAdvBranchUnlocked(def.branch, prestigeCount)) {
    return { count: 0, totalCost: 0 };
  }
  let lvl = level;
  let mass = massMp;
  let totalCost = 0;
  let bought = 0;
  for (let i = 0; i < count && lvl < def.maxLevel; i++) {
    const c = advancedUpgradeCost(def, lvl);
    if (mass < c) break;
    mass -= c;
    totalCost += c;
    lvl++;
    bought++;
  }
  return { count: bought, totalCost };
}

export type AdvMods = {
  mpMul: number;
  spawnRateMul: number;
  lifeSpeedMul: number;
};

export function advancedModifiers(levels: Record<string, number>): AdvMods {
  const m: AdvMods = { mpMul: 1, spawnRateMul: 1, lifeSpeedMul: 1 };
  for (const def of ADV_UPGRADES) {
    const lvl = levels[def.id] ?? 0;
    if (lvl <= 0) continue;
    for (const [ch, per] of Object.entries(def.perLevel) as [
      AdvChannel,
      number,
    ][]) {
      m[ch] *= Math.pow(per, lvl);
    }
  }
  return m;
}
