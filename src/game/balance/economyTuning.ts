/**
 * Глобальные ручки темпа первого рана.
 * Источник: obsidian/13 — §2 «Базовые допущения и ручки тюнинга»;
 * целевой коридор MP/с — §2 (после 2–3 уровней веток, без планеты).
 *
 * Менять это значение предпочтительнее, чем таблицу типов, пока не сошлись плейтесты.
 */
export const FIELD_MP_GLOBAL_MULTIPLIER = 1;

/**
 * Порог, выше которого совокупный множитель дохода (произведение каналов:
 * апгрейды × перки × MP-апгрейды × достижения × событие) сжимается
 * логарифмически — против гиперинфляции на дистанции. До порога — без изменений.
 */
export const INCOME_SOFTCAP = 25;

/** Мягкое сжатие множителя дохода выше `INCOME_SOFTCAP` (diminishing returns). */
export function softCapIncomeMul(x: number): number {
  if (x <= INCOME_SOFTCAP) return x;
  return INCOME_SOFTCAP * (1 + Math.log1p((x - INCOME_SOFTCAP) / INCOME_SOFTCAP));
}
