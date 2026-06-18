import { useGameStore } from "../store/useGameStore";
import {
  hawkingMpPerSecond,
  levelSum,
  upgradeBranchSnapshot,
} from "../game/upgrades";
import { massHorizonMul } from "../game/balance";
import { steadyMpMul } from "../game/economyView";
import { ultimateMpMul } from "../game/endgame";

function fmt(n: number): string {
  return Math.floor(n).toLocaleString("ru-RU");
}

/** Вкладка «Дыра» — характеристики чёрной дыры в реальном времени (GDD §5.1). */
export function BlackHolePanel() {
  const massMp = useGameStore((s) => s.massMp);
  const peakMassMp = useGameStore((s) => s.peakMassMp);
  const upgradeLevels = useGameStore((s) => s.upgradeLevels);
  const incomeEma = useGameStore((s) => s.incomeEmaMpPerSec);
  const prestigePerkLevels = useGameStore((s) => s.prestigePerkLevels);
  const mpUpgradeLevels = useGameStore((s) => s.mpUpgradeLevels);
  const environmentLevels = useGameStore((s) => s.environmentLevels);
  const achievementsUnlocked = useGameStore((s) => s.achievementsUnlocked);
  const ultimatePoints = useGameStore((s) => s.ultimatePoints);

  const snap = upgradeBranchSnapshot(upgradeLevels, massMp);
  // Относительный радиус горизонта (≈ R_s): ветка size × мягкий лог от массы.
  const horizonRel = snap.horizonMul * massHorizonMul(massMp);
  const gravityRel = snap.gravityMul;
  const hawking = hawkingMpPerSecond(upgradeLevels, massMp);
  const mpMul =
    steadyMpMul({
      upgradeLevels,
      prestigePerkLevels,
      mpUpgradeLevels,
      environmentLevels,
      achievementsUnlocked,
      massMp,
    }) * ultimateMpMul(ultimatePoints);
  // Температура Хокинга ∝ 1/M (стилизация): убывает с массой — образовательно.
  const hawkingTempRel = 1 / (1 + Math.log1p(Math.max(0, massMp) / 1000));

  const groups: { title: string; rows: [string, string, string?][] }[] = [
    {
      title: "Масса и горизонт",
      rows: [
        ["Масса дыры", `${fmt(massMp)} MP`, "Масса-энергия, упавшая за горизонт"],
        ["Пиковая масса", `${fmt(peakMassMp)} MP`],
        [
          "Радиус Шварцшильда (отн.)",
          `×${horizonRel.toFixed(2)}`,
          "R_s = 2GM/c² (игровая нормировка): растёт от массы и ветки «Радиус Шварцшильда»",
        ],
        [
          "Зона притяжения (отн.)",
          `×${gravityRel.toFixed(2)}`,
          "Ветка «Радиус притяжения»",
        ],
      ],
    },
    {
      title: "Аккреция и доход",
      rows: [
        [
          "Темп аккреции",
          `${incomeEma.toFixed(1)} MP/с`,
          "Сглаженная скорость поглощения материи (Ṁ)",
        ],
        [
          "Светимость диска (отн.)",
          `×${snap.diskIncomeMul.toFixed(2)}`,
          "∝ темпу аккреции; ветка «Аккреционный диск»",
        ],
        [
          "Множитель добычи",
          `×${mpMul.toFixed(2)}`,
          "Произведение всех источников (ветки/перки/окружение/достижения/UP)",
        ],
      ],
    },
    {
      title: "Излучение Хокинга",
      rows: [
        [
          "Пассив Хокинга",
          `${hawking.toFixed(2)} MP/с`,
          "Игровая стилизация: растёт с массой (не астрономическая мощность)",
        ],
        [
          "Темп. Хокинга (отн.)",
          `×${hawkingTempRel.toFixed(3)}`,
          "T_H ∝ 1/M (реальная физика): падает с массой — образовательно",
        ],
      ],
    },
    {
      title: "Развитие",
      rows: [
        ["Сумма уровней веток", fmt(levelSum(upgradeLevels))],
        ["Уровень джетов", fmt(snap.jetsLevel)],
      ],
    },
  ];

  return (
    <div className="stats-panel">
      <h2 className="app-panel-title">Чёрная дыра — характеристики</h2>
      <p className="ach-summary">
        Параметры дыры в реальном времени. «Отн.» — относительно базы (×1 на
        старте). Формулы — в подсказках (наведите на строку).
      </p>
      <div className="stats-grid">
        {groups.map((g) => (
          <section key={g.title} className="stats-group">
            <h3 className="stats-group-title">{g.title}</h3>
            <ul className="stats-rows">
              {g.rows.map(([label, value, hint]) => (
                <li key={label} className="stats-row" title={hint}>
                  <span className="stats-label">
                    {label}
                    {hint ? <span className="stats-info"> ⓘ</span> : null}
                  </span>
                  <span className="stats-value">{value}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
