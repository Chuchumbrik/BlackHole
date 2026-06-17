/**
 * Космический Журнал — процедурная летопись существования дыры.
 *
 * Записи рождаются из значимых событий (сжатие, разрыв планеты по Рошу, сверхновая,
 * достижение и т.п.). Текст собирается процедурно из шаблонов ради разнообразия —
 * смесь «научного факта» и игровой истории (см. obsidian/16 §10.1). Категория задаёт
 * цветовую кодировку в UI. Чистый модуль (без стора/Pixi).
 */

export type JournalCategory = "discovery" | "risk" | "milestone" | "lore";

export type JournalEntry = {
  id: number;
  /** Игровое время записи (сек), для сортировки/отображения. */
  timeSec: number;
  category: JournalCategory;
  text: string;
};

/** Сколько записей хранить всего (последние N; в UI — свежие + архив). */
export const JOURNAL_MAX = 60;

/** Цвет категории (для UI). */
export const JOURNAL_CATEGORY_COLOR: Record<JournalCategory, string> = {
  discovery: "#7dd3fc", // голубой — открытие
  risk: "#fca5a5", // красный — риск/утрата
  milestone: "#fbbf24", // золотой — веха
  lore: "#c4b5fd", // лиловый — лор/факт
};

export const JOURNAL_CATEGORY_LABEL: Record<JournalCategory, string> = {
  discovery: "Открытие",
  risk: "Риск",
  milestone: "Веха",
  lore: "Хроника",
};

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)] ?? arr[0];
}

export type LoreLine = { category: JournalCategory; text: string };

export function loreIntro(): LoreLine {
  return {
    category: "lore",
    text: pick([
      "В тишине на отшибе системы возникло искривление пространства. Вы родились.",
      "Сингулярность вспыхнула там, где её не ждали. Отсчёт массы пошёл.",
      "Из коллапса — горизонт событий радиусом с песчинку. Голод уже есть.",
    ]),
  };
}

export function loreOnPrestige(count: number): LoreLine {
  return {
    category: "milestone",
    text: pick([
      `Вселенная схлопнулась и родилась заново (сжатие №${count}). Часть наследия уцелела.`,
      `Тепловая смерть отступила: цикл №${count} начат. Орбиты помнят прошлую жизнь.`,
      `Гравитационный коллапс перезапустил мироздание — сжатие №${count}.`,
    ]),
  };
}

export function loreOnRocheTear(planetName: string): LoreLine {
  return {
    category: "risk",
    text: pick([
      `${planetName} пересекла предел Роша: приливные силы растянули её в кольцо обломков.`,
      `Орбита ${planetName} деградировала фатально — планета разорвана в аккреционный поток.`,
      `Приливная деформация превысила прочность ${planetName}. Остался лишь сияющий диск осколков.`,
    ]),
  };
}

export function loreOnSupernova(): LoreLine {
  return {
    category: "discovery",
    text: pick([
      "Звезда вспыхнула сверхновой: ударная волна вышвырнула в систему лавину материи.",
      "Коллапс ядра звезды озарил систему. Поток вещества хлынул к горизонту.",
      "Сверхновая засеяла пространство тяжёлыми элементами — и небывалым изобилием добычи.",
    ]),
  };
}

export function loreOnLifeBorn(planetName: string): LoreLine {
  return {
    category: "discovery",
    text: pick([
      `На ${planetName} зародилась жизнь. Слепая к вашей тишине, она начала свой путь.`,
      `${planetName}: первые самовоспроизводящиеся молекулы. Биосфера сделала первый вдох.`,
      `Химия ${planetName} перешагнула порог живого. Где-то там — будущие цивилизации.`,
    ]),
  };
}

export function loreOnAchievement(name: string): LoreLine {
  return { category: "milestone", text: `Достижение: «${name}».` };
}
