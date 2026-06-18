/**
 * Data-driven MP-апгрейды (волна 1). Покупаются за MP, действуют в пределах рана
 * (сбрасываются при сжатии, как ветки сингулярности). Эффект — множители каналов
 * дохода/спавна, применяются в игровом цикле.
 *
 * Добавить апгрейд = дописать запись. Апгрейды, меняющие геометрию поля
 * (тёмное гало, приливный разрыв и т.п.), — следующий слой (нужна правка layout).
 */
export type MpUpgradeKind =
  | "mpMul"
  | "spawnRateMul"
  | "hawkingMul"
  | "wavePullMul"
  | "energyMul";

export type MpUpgradeDef = {
  id: string;
  name: string;
  desc: string;
  baseCost: number; // MP
  costMult: number;
  maxLevel: number;
  kind: MpUpgradeKind;
  perLevel: number; // множитель канала за уровень
};

export const MP_UPGRADES: MpUpgradeDef[] = [
  {
    id: "spaghetti",
    name: "Спагеттификация",
    desc: "+6 % к добыче MP за уровень",
    baseCost: 40,
    costMult: 1.6,
    maxLevel: 50,
    kind: "mpMul",
    perLevel: 1.06,
  },
  {
    id: "magnetic_funnel",
    name: "Магнитная воронка",
    desc: "+8 % к частоте спавна материи за уровень",
    baseCost: 60,
    costMult: 1.7,
    maxLevel: 30,
    kind: "spawnRateMul",
    perLevel: 1.08,
  },
  {
    id: "quantum_evap",
    name: "Квантовое испарение",
    desc: "+10 % к пассиву Хокинга за уровень",
    baseCost: 80,
    costMult: 1.7,
    maxLevel: 30,
    kind: "hawkingMul",
    perLevel: 1.1,
  },
  {
    id: "grav_wave",
    name: "Гравитационная волна",
    desc: "+12 % к силе импульса волны притяжения (по тапу) за уровень",
    baseCost: 50,
    costMult: 1.65,
    maxLevel: 25,
    kind: "wavePullMul",
    perLevel: 1.12,
  },
  {
    id: "impulse_capacitor",
    name: "Импульсный накопитель",
    desc: "+10 % к запасу и восстановлению импульса за уровень",
    baseCost: 70,
    costMult: 1.7,
    maxLevel: 25,
    kind: "energyMul",
    perLevel: 1.1,
  },
];

export function mpUpgradeCost(def: MpUpgradeDef, level: number): number {
  return Math.ceil(def.baseCost * Math.pow(def.costMult, level));
}

/**
 * План оптовой покупки MP-апгрейда: сколько уровней купится за `count`
 * (с учётом баланса и `maxLevel`) и их суммарная цена.
 */
export function planMpUpgradePurchase(
  def: MpUpgradeDef,
  level: number,
  massMp: number,
  count: number,
): { count: number; totalCost: number } {
  let lvl = level;
  let mass = massMp;
  let totalCost = 0;
  let bought = 0;
  for (let i = 0; i < count && lvl < def.maxLevel; i++) {
    const c = mpUpgradeCost(def, lvl);
    if (mass < c) break;
    mass -= c;
    totalCost += c;
    lvl++;
    bought++;
  }
  return { count: bought, totalCost };
}

export type MpUpgradeMods = {
  mpMul: number;
  spawnRateMul: number;
  hawkingMul: number;
  wavePullMul: number;
  energyMul: number;
};

export function mpUpgradeModifiers(
  levels: Record<string, number>,
): MpUpgradeMods {
  const m: MpUpgradeMods = {
    mpMul: 1,
    spawnRateMul: 1,
    hawkingMul: 1,
    wavePullMul: 1,
    energyMul: 1,
  };
  for (const def of MP_UPGRADES) {
    const lvl = levels[def.id] ?? 0;
    if (lvl <= 0) continue;
    m[def.kind] *= Math.pow(def.perLevel, lvl);
  }
  return m;
}
