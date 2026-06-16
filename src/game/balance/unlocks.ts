/**
 * Пороги Level of the Hole (сумма уровней четырёх веток).
 * Источник: obsidian/07 — «Разблокировки по сумме уровней веток»,
 * плюс блокировки веток «диск» / «эффективность» (02, 07).
 */

/**
 * Аккреционный диск — по ТЗ ветка A (1–3) доступна с начала (фаза 2).
 * Значение 0: без порога суммы уровней.
 */
export const SUM_FOR_DISK_UNLOCK = 0;

/** Эффективность — покупка первого уровня при сумме ≥ этого. */
export const SUM_FOR_EFFICIENCY_UNLOCK = 10;

/** Режим вида «звёздная система». */
export const VIEW_TIER_SYSTEM_MIN_SUM = 4;

/** Режим вида «галактика». */
export const VIEW_TIER_GALAXY_MIN_SUM = 14;

/** Корабли в потоке спавна. */
export const SHIPS_UNLOCK_MIN_SUM = 10;

/** Фаза 3 — ветка A (4–6): порог суммы уровней всех веток (включая уже открытые). */
export const SUM_FOR_JETS_UNLOCK = 16;
export const SUM_FOR_LENSING_UNLOCK = 22;
export const SUM_FOR_HAWKING_UNLOCK = 28;
