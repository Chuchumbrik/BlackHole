import type { ObjectKind } from "./balance";

const GREEK = "αβγδεζηθικλμνξοπρστυφχψω";

const KIND_TITLE_RU: Record<ObjectKind, string> = {
  0: "Космический мусор",
  1: "Астероид",
  2: "Железный обломок",
  3: "Планетоид",
  4: "Космический корабль",
};

/** Короткий класс объекта для подписи на сцене (RU по умолчанию). */
export function objectKindTitleRu(kind: ObjectKind): string {
  return KIND_TITLE_RU[kind];
}

/** Детерминированный «позывной» из id (одинаковый для того же объекта в сессии). */
export function objectDesignation(id: number): string {
  const sector = 100 + ((id * 7919) % 900);
  const letter = GREEK[id % GREEK.length];
  const num = (id % 99) + 1;
  return `${sector}-${letter}${num}`;
}

/** Полная строка для HUD/canvas: тип · позывной. */
export function buildObjectDisplayName(kind: ObjectKind, id: number): string {
  return `${objectKindTitleRu(kind)} · ${objectDesignation(id)}`;
}
