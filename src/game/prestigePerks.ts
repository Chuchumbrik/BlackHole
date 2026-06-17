/**
 * Каталог перков престижа (data-driven). Покупаются за PP.
 *
 * Тип B (постоянные модификаторы дохода) — применяются в игровом цикле через
 * `prestigeModifiers`. Тип A (модификаторы старта рана: спавн/планеты/стартовая
 * масса) — через `prestigeRunStart`, читаются генерацией/спавном/коллапсом.
 *
 * Добавить перк = дописать запись сюда.
 */
export type PrestigePerkKind =
  | "mpMul" // B: ×MP-доход
  | "hawkingMul" // B: ×пассив хокинга
  | "spawnRateMul" // A: ×частота спавна
  | "extraPlanets" // A: +планет на систему
  | "startMass"; // A: +стартовая масса MP

export type PrestigePerkDef = {
  id: string;
  name: string;
  desc: string;
  baseCost: number; // PP
  costMult: number;
  maxLevel: number;
  kind: PrestigePerkKind;
  /** mul-виды: множитель за уровень; аддитивные (extraPlanets/startMass): прибавка за уровень. */
  perLevel: number;
};

/**
 * «Безлимитный» потолок: множительные/аддитивные перки уровней не ограничены —
 * экспоненциальный рост цены PP (×1.8–2.0/ур.) сам становится мягким пределом.
 * Исключение — `extraPlanets`: число планет жёстко влияет на генерацию мира и
 * производительность, поэтому у него остаётся разумный предел.
 */
const PERK_NO_CAP = 100000;

export const PRESTIGE_PERKS: PrestigePerkDef[] = [
  // — Тип B (постоянные) —
  {
    id: "compressed_singularity",
    name: "Сжатая сингулярность",
    desc: "+5 % к добыче MP за уровень",
    baseCost: 1,
    costMult: 1.9,
    maxLevel: PERK_NO_CAP,
    kind: "mpMul",
    perLevel: 1.05,
  },
  {
    id: "relic_boost",
    name: "Реликтовый разгон",
    desc: "+8 % к пассиву Хокинга за уровень",
    baseCost: 2,
    costMult: 1.9,
    maxLevel: PERK_NO_CAP,
    kind: "hawkingMul",
    perLevel: 1.08,
  },
  // — Тип A (старт рана) —
  {
    id: "field_density",
    name: "Плотность поля",
    desc: "+12 % к частоте спавна объектов за уровень",
    baseCost: 2,
    costMult: 2.0,
    maxLevel: PERK_NO_CAP,
    kind: "spawnRateMul",
    perLevel: 1.12,
  },
  {
    id: "planet_broods",
    name: "Звёздные выводки",
    desc: "+1 планета в системе за уровень (нового рана)",
    baseCost: 3,
    costMult: 2.4,
    maxLevel: 8, // жёсткий предел: планеты влияют на генерацию/производительность
    kind: "extraPlanets",
    perLevel: 1,
  },
  {
    id: "warm_start",
    name: "Тёплый старт",
    desc: "+60 MP стартовой массы нового рана за уровень",
    baseCost: 2,
    costMult: 1.8,
    maxLevel: PERK_NO_CAP,
    kind: "startMass",
    perLevel: 60,
  },
];

/** Цена следующего уровня перка (PP). */
export function perkCost(def: PrestigePerkDef, level: number): number {
  return Math.ceil(def.baseCost * Math.pow(def.costMult, level));
}

/**
 * План оптовой покупки перка: сколько уровней реально купится за `count`
 * (с учётом запаса PP и `maxLevel`) и их суммарная цена. Единый источник истины
 * для стора (списание) и панели (отображение цены/количества под множитель).
 */
export function planPerkPurchase(
  def: PrestigePerkDef,
  level: number,
  pp: number,
  count: number,
): { count: number; totalCost: number } {
  let lvl = level;
  let points = pp;
  let totalCost = 0;
  let bought = 0;
  for (let i = 0; i < count && lvl < def.maxLevel; i++) {
    const c = perkCost(def, lvl);
    if (points < c) break;
    points -= c;
    totalCost += c;
    lvl++;
    bought++;
  }
  return { count: bought, totalCost };
}

export type PrestigeModifiers = { mpMul: number; hawkingMul: number };

/** Тип B: постоянные множители дохода. */
export function prestigeModifiers(
  perkLevels: Record<string, number>,
): PrestigeModifiers {
  const m: PrestigeModifiers = { mpMul: 1, hawkingMul: 1 };
  for (const def of PRESTIGE_PERKS) {
    const lvl = perkLevels[def.id] ?? 0;
    if (lvl <= 0) continue;
    if (def.kind === "mpMul") m.mpMul *= Math.pow(def.perLevel, lvl);
    else if (def.kind === "hawkingMul") m.hawkingMul *= Math.pow(def.perLevel, lvl);
  }
  return m;
}

export type PrestigeRunStart = {
  spawnRateMul: number;
  extraPlanets: number;
  startMassMp: number;
};

/** Тип A: модификаторы старта рана. */
export function prestigeRunStart(
  perkLevels: Record<string, number>,
): PrestigeRunStart {
  const r: PrestigeRunStart = {
    spawnRateMul: 1,
    extraPlanets: 0,
    startMassMp: 0,
  };
  for (const def of PRESTIGE_PERKS) {
    const lvl = perkLevels[def.id] ?? 0;
    if (lvl <= 0) continue;
    if (def.kind === "spawnRateMul") r.spawnRateMul *= Math.pow(def.perLevel, lvl);
    else if (def.kind === "extraPlanets") r.extraPlanets += def.perLevel * lvl;
    else if (def.kind === "startMass") r.startMassMp += def.perLevel * lvl;
  }
  return r;
}
