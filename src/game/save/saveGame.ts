/**
 * Локальное сохранение прогресса в localStorage.
 *
 * Сохраняем состояние стора (источник истины: MP, апгрейды, системы/планеты,
 * время). Позиции/скорости тел планет НЕ храним — `GameCanvas` пере-сеет их из
 * систем при загрузке (планеты продолжат с круговой орбиты; точные фазы между
 * сессиями не важны). Схема версионируется для будущих миграций.
 */
import type { UpgradeLevels } from "../upgrades";
import type { StarSystem } from "../world/types";
import type { ViewTierId, SimTimeScale } from "../../store/useGameStore";

export const SAVE_KEY = "cbh:save";
export const SAVE_SCHEMA_VERSION = 1;

export type SaveData = {
  schemaVersion: number;
  massMp: number;
  gameTimeSec: number;
  upgradeLevels: UpgradeLevels;
  systems: StarSystem[];
  activeSystemId: string;
  activePlanetId: string | null;
  viewTier: ViewTierId;
  simTimeScale: SimTimeScale;
  jetBuffEndsAtSimSec: number;
  /** Реальное время сохранения (мс, эпоха) — для оффлайн-начисления. */
  savedAtMs: number;
  /** Сглаженная ставка дохода MP/с — для оффлайн-начисления. */
  incomeEmaMpPerSec: number;
};

/** Прочитать сейв. null, если его нет, он битый или несовместимой версии. */
export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<SaveData> | null;
    if (!data || typeof data !== "object") return null;
    if (data.schemaVersion !== SAVE_SCHEMA_VERSION) {
      // Будущие миграции — здесь. Пока несовместимый сейв отбрасываем.
      return null;
    }
    if (!Array.isArray(data.systems) || !data.upgradeLevels) return null;
    return data as SaveData;
  } catch {
    return null;
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Переполнение/недоступность хранилища игнорируем (не роняем игру).
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* no-op */
  }
}
