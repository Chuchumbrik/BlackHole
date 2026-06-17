/**
 * Локальное сохранение прогресса в localStorage.
 *
 * Сохраняем состояние стора (источник истины: MP, апгрейды, системы/планеты,
 * время). Позиции/скорости тел планет НЕ храним — `GameCanvas` пере-сеет их из
 * систем при загрузке (планеты продолжат с круговой орбиты; точные фазы между
 * сессиями не важны). Схема версионируется для будущих миграций.
 */
import { ZERO_UPGRADE_LEVELS, type UpgradeLevels } from "../upgrades";
import type { StarSystem } from "../world/types";
import type { ViewTierId, SimTimeScale } from "../../store/useGameStore";

export const SAVE_KEY = "cbh:save";
/** Бэкап несовместимого сейва перед миграцией (чтобы прогресс никогда не терялся молча). */
export const SAVE_BACKUP_KEY = "cbh:save:bak";
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
  /** Накопленные очки престижа (опционально — старые сейвы без поля). */
  prestigePoints?: number;
  /** Суммарно заработанные PP за всё время (для достижений; не тратится). */
  lifetimePp?: number;
  /** Уровни перков престижа по id (опционально). */
  prestigePerkLevels?: Record<string, number>;
  /** Уровни data-driven MP-апгрейдов по id (опционально; сбрасываются при сжатии). */
  mpUpgradeLevels?: Record<string, number>;
  /** Открытые достижения (опционально; постоянные, переживают сжатие). */
  achievementsUnlocked?: string[];
};

/**
 * Спасение постоянной меты из несовместимого сейва: ран начинаем заново
 * (systems пуст → стор регенерирует), но PP/перки/достижения переносим.
 */
function migrateSalvage(old: Partial<SaveData>): SaveData {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    massMp: 0,
    gameTimeSec: 0,
    upgradeLevels: { ...ZERO_UPGRADE_LEVELS },
    systems: [],
    activeSystemId: "",
    activePlanetId: null,
    viewTier: 0,
    simTimeScale: 1,
    jetBuffEndsAtSimSec: 0,
    savedAtMs: Date.now(),
    incomeEmaMpPerSec: 0,
    prestigePoints: typeof old.prestigePoints === "number" ? old.prestigePoints : 0,
    lifetimePp:
      typeof old.lifetimePp === "number"
        ? old.lifetimePp
        : typeof old.prestigePoints === "number"
          ? old.prestigePoints
          : 0,
    prestigePerkLevels:
      old.prestigePerkLevels && typeof old.prestigePerkLevels === "object"
        ? old.prestigePerkLevels
        : {},
    mpUpgradeLevels: {},
    achievementsUnlocked: Array.isArray(old.achievementsUnlocked)
      ? old.achievementsUnlocked
      : [],
  };
}

/** Прочитать сейв. null, если его нет или он битый. Несовместимую версию мигрируем. */
export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<SaveData> | null;
    if (!data || typeof data !== "object") return null;
    if (data.schemaVersion !== SAVE_SCHEMA_VERSION) {
      // Несовместимая версия: НЕ стираем молча. Бэкапим сырой сейв и спасаем
      // постоянную мету (PP/перки/достижения), ран начинаем заново.
      try {
        localStorage.setItem(SAVE_BACKUP_KEY, raw);
      } catch {
        /* no-op */
      }
      return migrateSalvage(data);
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
