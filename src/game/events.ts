/**
 * Периодические события (data-driven). Планировщик в игровом цикле раз за
 * интервал запускает случайное событие на время; эффекты — множители спавна/
 * дохода (применяются в цикле) + стартовый всплеск. Тосты-баннеры в UI.
 *
 * Добавить событие = дописать запись.
 */
export type GameEventDef = {
  id: string;
  name: string;
  weight: number;
  durationSec: number;
  /** Всплеск обломков с границы при старте (шт). */
  spawnBurst: number;
  spawnMul: number;
  mpMul: number;
};

export const GAME_EVENTS: GameEventDef[] = [
  {
    id: "asteroid_rain",
    name: "Дождь астероидов",
    weight: 3,
    durationSec: 25,
    spawnBurst: 24,
    spawnMul: 2.4,
    mpMul: 1,
  },
  {
    id: "rich_vein",
    name: "Богатая жила",
    weight: 2,
    durationSec: 20,
    spawnBurst: 0,
    spawnMul: 1,
    mpMul: 1.8,
  },
  {
    id: "planet_parade",
    name: "Парад планет",
    weight: 1,
    durationSec: 30,
    spawnBurst: 0,
    spawnMul: 1.2,
    mpMul: 1.3,
  },
];

/** Первое событие — не раньше этого игрового времени; пауза между событиями. */
export const EVENT_FIRST_DELAY_SEC = 70;
export const EVENT_COOLDOWN_SEC = 90;

/**
 * «Парад планет» НЕ выбирается по таймеру — он срабатывает, когда планеты сами
 * естественно выстраиваются в ряд (см. `planetAlignment`). Порог выстроенности
 * и собственная пауза между парадами:
 */
export const PARADE_ALIGN_THRESHOLD = 0.9;
export const PARADE_COOLDOWN_SEC = 60;

/**
 * Выбрать случайное событие по весам (rand 0..1, для детерминизма извне).
 * `excludeIds` исключает события (например, парад — он триггерится выравниванием).
 */
export function pickEvent(rand: number, excludeIds: string[] = []): GameEventDef {
  const pool = GAME_EVENTS.filter((e) => !excludeIds.includes(e.id));
  const list = pool.length > 0 ? pool : GAME_EVENTS;
  const total = list.reduce((s, e) => s + e.weight, 0);
  let r = rand * total;
  for (const e of list) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return list[list.length - 1];
}

export function eventById(id: string | null): GameEventDef | null {
  if (!id) return null;
  return GAME_EVENTS.find((e) => e.id === id) ?? null;
}
