import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PrestigePanel } from "./PrestigePanel";
import { AchievementsPanel } from "./AchievementsPanel";
import { UpgradesPanel } from "./UpgradesPanel";
import { PlanetPanel } from "./PlanetPanel";
import { useGameStore } from "../store/useGameStore";
import { ZERO_UPGRADE_LEVELS } from "../game/upgrades";
import type { Planet, StarSystem } from "../game/world/types";

const mkPlanet = (): Planet => ({
  id: "pl1",
  name: "Планета-1",
  orbitalDistance: 50,
  gravityProxy: 50,
  surfaceTemperature: 50,
  atmosphere: 50,
  hydrosphere: 50,
  geologicalActivity: 50,
  orbitPhaseRad: 0,
  orbitSpeed: 0.1,
  stage: 1,
  stageProgressSec: 0,
  lifeEmergenceSec: 0,
  lifeBorn: false,
  mpYieldMult: 1,
  civLevel: 0,
  civProgressSec: 0,
  shieldUntilSec: 0,
  radiusScale: 1,
});
const sys = (planets: Planet[]): StarSystem => ({
  id: "sys1",
  name: "Sys",
  starClass: "G",
  planets,
});

describe("PrestigePanel (UI)", () => {
  it("ниже порога — нет кнопки сжатия, есть подсказка", () => {
    useGameStore.setState({ massMp: 0, prestigePoints: 0, prestigePerkLevels: {} });
    render(<PrestigePanel />);
    expect(screen.queryByRole("button", { name: /Сжать вселенную/ })).toBeNull();
    expect(screen.getByText(/Нужно накопить/)).toBeInTheDocument();
  });
  it("выше порога — кнопка сжатия доступна", () => {
    useGameStore.setState({ massMp: 5000, prestigePoints: 3, prestigePerkLevels: {} });
    render(<PrestigePanel />);
    expect(screen.getByRole("button", { name: /Сжать вселенную/ })).toBeInTheDocument();
  });
});

describe("AchievementsPanel (UI)", () => {
  it("показывает счётчик открытых и статусы", () => {
    useGameStore.setState({ achievementsUnlocked: ["mp_1k"] });
    render(<AchievementsPanel />);
    expect(screen.getByText(/Открыто 1\//)).toBeInTheDocument();
    expect(screen.getAllByText("Открыто ✓").length).toBeGreaterThanOrEqual(1);
  });
});

describe("UpgradesPanel (UI)", () => {
  it("есть селектор оптовой покупки ×1/×2/×5/×10", () => {
    useGameStore.setState({ massMp: 0, upgradeLevels: { ...ZERO_UPGRADE_LEVELS }, buyMultiplier: 1 });
    render(<UpgradesPanel />);
    for (const m of ["×1", "×2", "×5", "×10"]) {
      expect(screen.getByRole("button", { name: m })).toBeInTheDocument();
    }
  });
});

describe("PlanetPanel (UI)", () => {
  it("без систем — пустое состояние", () => {
    useGameStore.setState({ systems: [], activeSystemId: "", activePlanetId: null });
    render(<PlanetPanel />);
    expect(screen.getByText(/Системы пока не сгенерированы/)).toBeInTheDocument();
  });
  it("с активной планетой — есть действия терраформинга и щита", () => {
    const p = mkPlanet();
    useGameStore.setState({
      systems: [sys([p])],
      activeSystemId: "sys1",
      activePlanetId: "pl1",
      massMp: 100000,
    });
    render(<PlanetPanel />);
    expect(screen.getByRole("button", { name: /Терраформинг/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Щит/ })).toBeInTheDocument();
  });
});
