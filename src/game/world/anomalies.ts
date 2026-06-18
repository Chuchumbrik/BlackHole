/**
 * Аномалии звёздных систем (procedural). Редкая система получает аномальный тип
 * с уникальным бонусом дохода и лором; очень редко — легендарная система с
 * крупным множителем. Частоты — стартовая калибровка (obsidian/16 §7.2–7.3).
 */

export type AnomalyKind =
  | "neutron_star"
  | "triple_star"
  | "hot_jupiter"
  | "rogue_planet"
  | "pulsar"
  | "protoplanetary"
  | "wandering_bh" // NG+: другая чёрная дыра как цель
  | "stellar_nursery"; // легендарная

export type AnomalyDef = {
  kind: AnomalyKind;
  name: string;
  desc: string;
  /** Множитель дохода MP, пока система активна. */
  mpMul: number;
  legendary?: boolean;
};

export const ANOMALY_DEFS: Record<AnomalyKind, AnomalyDef> = {
  neutron_star: {
    kind: "neutron_star",
    name: "Нейтронная звезда",
    desc: "Сверхплотный остаток — щедрый донор массы (×1.5 MP)",
    mpMul: 1.5,
  },
  triple_star: {
    kind: "triple_star",
    name: "Тройная звезда",
    desc: "Хаотичная гравитация выбрасывает больше материи (×1.4 MP)",
    mpMul: 1.4,
  },
  hot_jupiter: {
    kind: "hot_jupiter",
    name: "Горячий юпитер",
    desc: "Гигант у звезды раскручивает поток тел (×1.3 MP)",
    mpMul: 1.3,
  },
  rogue_planet: {
    kind: "rogue_planet",
    name: "Планета-изгой",
    desc: "Странник без звезды искажает орбиты (×1.25 MP)",
    mpMul: 1.25,
  },
  pulsar: {
    kind: "pulsar",
    name: "Пульсар",
    desc: "Маяк-вертушка гонит импульсы материи (×1.45 MP)",
    mpMul: 1.45,
  },
  protoplanetary: {
    kind: "protoplanetary",
    name: "Протопланетный диск",
    desc: "Молодая система полна строительного мусора (×1.35 MP)",
    mpMul: 1.35,
  },
  wandering_bh: {
    kind: "wandering_bh",
    name: "Блуждающая чёрная дыра",
    desc: "Другая ЧД неподалёку искажает пространство — лавина материи (×1.8 MP)",
    mpMul: 1.8,
  },
  stellar_nursery: {
    kind: "stellar_nursery",
    name: "Звёздная колыбель",
    desc: "ЛЕГЕНДА: область звездообразования — изобилие массы (×3 MP)",
    mpMul: 3,
    legendary: true,
  },
};

const COMMON: AnomalyKind[] = [
  "neutron_star",
  "triple_star",
  "hot_jupiter",
  "rogue_planet",
  "pulsar",
  "protoplanetary",
];

/** Базовая вероятность аномалии у системы (≈1 на 8) и легендарной (очень редко). */
export const ANOMALY_BASE_CHANCE = 0.12;
export const LEGENDARY_CHANCE = 1 / 300;

/**
 * Бросок аномалии для системы. `ngPlus` (число New Game+) делает вселенную
 * «древнее и экзотичнее»: выше шанс аномалий и появляется «Блуждающая чёрная
 * дыра» — другая ЧД как цель (контент-слой NG+). undefined — обычная система.
 */
export function rollAnomaly(ngPlus = 0): AnomalyKind | undefined {
  if (Math.random() < LEGENDARY_CHANCE) return "stellar_nursery";
  const chanceMul = 1 + Math.max(0, ngPlus) * 0.6;
  if (Math.random() < ANOMALY_BASE_CHANCE * chanceMul) {
    const pool =
      ngPlus > 0 ? [...COMMON, "wandering_bh" as AnomalyKind] : COMMON;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return undefined;
}

export function anomalyMpMul(kind: AnomalyKind | undefined): number {
  return kind ? ANOMALY_DEFS[kind].mpMul : 1;
}
