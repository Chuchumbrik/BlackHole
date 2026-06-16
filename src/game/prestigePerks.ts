/**
 * Каталог перков престижа (data-driven). Покупаются за PP, действуют между
 * ранами. Тип B — постоянные модификаторы дохода (применяются в игровом цикле).
 * Тип A (старт рана: спавн/планеты/стартовая масса) — шаг R3.
 *
 * Добавить перк = дописать запись сюда (контент, не код).
 */
export type PrestigePerkChannel = "mpMul" | "hawkingMul";

export type PrestigePerkDef = {
  id: string;
  name: string;
  desc: string;
  baseCost: number; // в PP
  costMult: number; // рост цены за уровень
  maxLevel: number;
  channel: PrestigePerkChannel;
  /** Мультипликатор канала за уровень (мультипликативно). */
  perLevel: number;
};

export const PRESTIGE_PERKS: PrestigePerkDef[] = [
  {
    id: "compressed_singularity",
    name: "Сжатая сингулярность",
    desc: "+5 % к добыче MP за уровень",
    baseCost: 1,
    costMult: 1.9,
    maxLevel: 25,
    channel: "mpMul",
    perLevel: 1.05,
  },
  {
    id: "relic_boost",
    name: "Реликтовый разгон",
    desc: "+8 % к пассиву Хокинга за уровень",
    baseCost: 2,
    costMult: 1.9,
    maxLevel: 25,
    channel: "hawkingMul",
    perLevel: 1.08,
  },
];

/** Цена следующего уровня перка (PP). */
export function perkCost(def: PrestigePerkDef, level: number): number {
  return Math.ceil(def.baseCost * Math.pow(def.costMult, level));
}

export type PrestigeModifiers = { mpMul: number; hawkingMul: number };

/** Свернуть уровни перков в постоянные множители дохода. */
export function prestigeModifiers(
  perkLevels: Record<string, number>,
): PrestigeModifiers {
  const m: PrestigeModifiers = { mpMul: 1, hawkingMul: 1 };
  for (const def of PRESTIGE_PERKS) {
    const lvl = perkLevels[def.id] ?? 0;
    if (lvl <= 0) continue;
    m[def.channel] *= Math.pow(def.perLevel, lvl);
  }
  return m;
}
