import { useGameStore } from "../store/useGameStore";
import { levelSum } from "../game/upgrades";
import { PLANET_CIV_MAX_LEVEL } from "../game/balance";
import { ENTROPY_THRESHOLD, ultimateMpMul } from "../game/endgame";
import { ANOMALY_DEFS } from "../game/world/anomalies";

function fmt(n: number): string {
  return Math.floor(n).toLocaleString("ru-RU");
}

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h} ч ${m} мин`;
  if (m > 0) return `${m} мин ${s} с`;
  return `${s} с`;
}

/** Вкладка «Статистика» — все ключевые показатели игры (отдельно от достижений). */
export function StatsPanel() {
  const massMp = useGameStore((s) => s.massMp);
  const peakMassMp = useGameStore((s) => s.peakMassMp);
  const lifetimeMassMp = useGameStore((s) => s.lifetimeMassMp);
  const massSpentRun = useGameStore((s) => s.massSpentRun);
  const massSpentTotal = useGameStore((s) => s.massSpentTotal);
  const prestigePoints = useGameStore((s) => s.prestigePoints);
  const lifetimePp = useGameStore((s) => s.lifetimePp);
  const prestigeCount = useGameStore((s) => s.prestigeCount);
  const gameTimeSec = useGameStore((s) => s.gameTimeSec);
  const upgradeLevels = useGameStore((s) => s.upgradeLevels);
  const incomeEma = useGameStore((s) => s.incomeEmaMpPerSec);
  const systems = useGameStore((s) => s.systems);
  const activeSystemId = useGameStore((s) => s.activeSystemId);
  const achievementsUnlocked = useGameStore((s) => s.achievementsUnlocked);
  const starsSwallowed = useGameStore((s) => s.starsSwallowed);
  const universeEntropy = useGameStore((s) => s.universeEntropy);
  const ultimatePoints = useGameStore((s) => s.ultimatePoints);
  const newGamePlusCount = useGameStore((s) => s.newGamePlusCount);

  const planets = systems.flatMap((sys) => sys.planets);
  const planetsWithLife = planets.filter((p) => p.lifeBorn).length;
  const civPlanets = planets.filter((p) => p.civLevel > 0).length;
  const maxCiv = planets.reduce((m, p) => Math.max(m, p.civLevel), 0);
  const activeAnomaly = systems.find((s) => s.id === activeSystemId)?.anomaly;

  const groups: { title: string; rows: [string, string][] }[] = [
    {
      title: "Масса (MP)",
      rows: [
        ["Сейчас", `${fmt(massMp)} MP`],
        ["Пик массы", `${fmt(peakMassMp)} MP`],
        ["Всего получено", `${fmt(lifetimeMassMp)} MP`],
        ["Доход (сглажен.)", `${incomeEma.toFixed(1)} MP/с`],
      ],
    },
    {
      title: "Развитие дыры",
      rows: [
        ["Сумма уровней веток", fmt(levelSum(upgradeLevels))],
        ["Потрачено за ран", `${fmt(massSpentRun)} MP`],
        ["Потрачено всего", `${fmt(massSpentTotal)} MP`],
      ],
    },
    {
      title: "Престиж",
      rows: [
        ["Очки престижа (PP)", fmt(prestigePoints)],
        ["Заработано PP всего", fmt(lifetimePp)],
        ["Сжатий совершено", fmt(prestigeCount)],
      ],
    },
    {
      title: "Космос",
      rows: [
        ["Систем", fmt(systems.length)],
        ["Планет", fmt(planets.length)],
        ["Планет с жизнью", fmt(planetsWithLife)],
        ["С цивилизацией", `${fmt(civPlanets)} (макс. тир ${maxCiv}/${PLANET_CIV_MAX_LEVEL})`],
      ],
    },
    {
      title: "Эндшпиль и космос",
      rows: [
        ["Поглощено звёзд", fmt(starsSwallowed)],
        ["Энтропия вселенной", `${fmt(universeEntropy)}/${ENTROPY_THRESHOLD}`],
        [
          "Ultimate Points",
          ultimatePoints > 0
            ? `${fmt(ultimatePoints)} (доход ×${ultimateMpMul(ultimatePoints).toFixed(2)})`
            : "0",
        ],
        ["New Game+", fmt(newGamePlusCount)],
        [
          "Аномалия системы",
          activeAnomaly ? ANOMALY_DEFS[activeAnomaly].name : "—",
        ],
      ],
    },
    {
      title: "Прочее",
      rows: [
        ["Игровое время", fmtTime(gameTimeSec)],
        ["Достижений открыто", fmt(achievementsUnlocked.length)],
      ],
    },
  ];

  return (
    <div className="stats-panel">
      <h2 className="app-panel-title">Статистика</h2>
      <div className="stats-grid">
        {groups.map((g) => (
          <section key={g.title} className="stats-group">
            <h3 className="stats-group-title">{g.title}</h3>
            <ul className="stats-rows">
              {g.rows.map(([label, value]) => (
                <li key={label} className="stats-row">
                  <span className="stats-label">{label}</span>
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
