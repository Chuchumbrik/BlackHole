import { useState } from "react";

const SEEN_KEY = "cbh:legendSeen";

/**
 * Компактная легенда игрового поля: объясняет, почему материя летит к дыре
 * (гравитация → поглощение за горизонтом → MP). Сворачивается в значок «?»;
 * состояние запоминается в localStorage, чтобы не мешать.
 */
export function FieldLegend() {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(SEEN_KEY) !== "1";
    } catch {
      return true;
    }
  });

  const collapse = () => {
    setOpen(false);
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        className="field-legend-toggle"
        title="Как это работает?"
        onClick={() => setOpen(true)}
      >
        ?
      </button>
    );
  }

  return (
    <div className="field-legend" role="note">
      <div className="field-legend-head">
        <span className="field-legend-title">Как это работает</span>
        <button
          type="button"
          className="field-legend-close"
          aria-label="Свернуть"
          onClick={collapse}
        >
          ×
        </button>
      </div>
      <ul className="field-legend-list">
        <li>
          <b>⚫ Чёрная дыра</b> искривляет пространство и притягивает всю материю
          системы — поэтому объекты летят к ней.
        </li>
        <li>
          Пересекая <b>горизонт событий</b>, материя поглощается и даёт{" "}
          <b>MP</b> (масса‑энергия) — вашу валюту.
        </li>
        <li>
          Чем больше дыра (масса и ветка «Радиус»), тем сильнее и дальше
          притяжение — и тем заметнее она возмущает орбиты планет.
        </li>
        <li>
          Планеты вращаются вокруг звезды; корабли цивилизаций тоже затягивает —
          это пассивный доход.
        </li>
        <li>
          Качайте дыру во вкладке <b>«Улучшения»</b>: шире радиус притяжения —
          больше материи в зоне захвата, выше доход MP.
        </li>
      </ul>
    </div>
  );
}
