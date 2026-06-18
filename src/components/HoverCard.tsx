import { useGameStore } from "../store/useGameStore";

/**
 * Мини-модалка при наведении на планету/звезду (item 6/7). Канвас кладёт в стор
 * `hoverInfo` (что и где), здесь — рисуем аккуратную карточку у курсора.
 * Первая строка текста — заголовок, остальные — характеристики/жизнь/развитие.
 */
export function HoverCard() {
  const info = useGameStore((s) => s.hoverInfo);
  if (!info) return null;

  const lines = info.text.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return null;
  const [title, ...rest] = lines;

  // Сдвигаем карточку от курсора и удерживаем в пределах окна.
  const margin = 16;
  const cardW = 260;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const left = Math.min(info.x + 18, vw - cardW - margin);
  const top = Math.max(margin, info.y - 12);

  return (
    <div
      className={`hover-card hover-card-${info.kind}`}
      style={{ left, top, width: cardW }}
      role="tooltip"
    >
      <div className="hover-card-title">
        <span className="hover-card-icon">
          {info.kind === "star" ? "★" : "🪐"}
        </span>
        {title}
      </div>
      {rest.length > 0 && (
        <ul className="hover-card-list">
          {rest.map((line, i) => (
            <li key={i} className="hover-card-line">
              {line}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
