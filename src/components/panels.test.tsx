import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PrestigePanel } from "./PrestigePanel";
import { AchievementsPanel } from "./AchievementsPanel";
import { UpgradesPanel } from "./UpgradesPanel";
import { PlanetPanel } from "./PlanetPanel";
import { SettingsPanel } from "./SettingsPanel";
import { useGameStore } from "../store/useGameStore";
import { ZERO_UPGRADE_LEVELS, nextUpgradeCostMp } from "../game/upgrades";
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
  it("цена пересчитывается под множитель: ×10 показывает суммарную цену и метку ×10", () => {
    useGameStore.setState({
      massMp: 1e9,
      upgradeLevels: { ...ZERO_UPGRADE_LEVELS },
      buyMultiplier: 1,
    });
    const { unmount } = render(<UpgradesPanel />);
    // ×1 — одиночная цена «Следующий уровень»
    expect(screen.getAllByText(/Следующий уровень:/).length).toBeGreaterThan(0);
    unmount();
    useGameStore.setState({ buyMultiplier: 10 });
    render(<UpgradesPanel />);
    // ×10 — кнопки помечены ×10 и появляется суммарная строка «10 ур.: … MP»
    expect(
      screen.getAllByRole("button", { name: /Купить ×10/ }).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/10 ур\.:/).length).toBeGreaterThan(0);
  });
  it("при ×10 и нехватке массы кнопка НЕ блокируется, показывает максимум доступного", () => {
    // масса ровно на 3 уровня size — при выбранном ×10 должно купиться 3 (макс.)
    const levels = { ...ZERO_UPGRADE_LEVELS };
    let mass = 0;
    const tmp = { ...ZERO_UPGRADE_LEVELS };
    for (let i = 0; i < 3; i++) {
      mass += nextUpgradeCostMp(tmp, "size");
      tmp.size += 1;
    }
    useGameStore.setState({ massMp: mass, upgradeLevels: levels, buyMultiplier: 10 });
    render(<UpgradesPanel />);
    // кнопка «Купить ×3 (макс.)» есть и активна
    const btn = screen.getAllByRole("button", { name: /Купить ×3 \(макс\.\)/ })[0];
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
    // строка цены отражает максимум ×3
    expect(screen.getAllByText(/Хватает на ×3 \(макс\.\):/).length).toBeGreaterThan(0);
  });
});

describe("SettingsPanel (UI)", () => {
  it("сброс прогресса — за подтверждением, обнуляет массу и уровни", () => {
    useGameStore.setState({
      massMp: 99999,
      upgradeLevels: { ...ZERO_UPGRADE_LEVELS, size: 7 },
      prestigePoints: 12,
    });
    render(<SettingsPanel />);
    // первый клик — только подтверждение, прогресс ещё на месте
    fireEvent.click(screen.getByRole("button", { name: /Сбросить весь прогресс/ }));
    expect(useGameStore.getState().massMp).toBe(99999);
    expect(screen.getByText(/Точно сбросить весь прогресс/)).toBeInTheDocument();
    // подтверждаем
    fireEvent.click(screen.getByRole("button", { name: /Да, сбросить всё/ }));
    const s = useGameStore.getState();
    expect(s.massMp).toBe(0);
    expect(s.upgradeLevels.size).toBe(0);
    expect(s.prestigePoints).toBe(0);
    expect(s.activeTab).toBe("game");
  });
  it("отмена подтверждения не сбрасывает", () => {
    useGameStore.setState({ massMp: 555 });
    render(<SettingsPanel />);
    fireEvent.click(screen.getByRole("button", { name: /Сбросить весь прогресс/ }));
    fireEvent.click(screen.getByRole("button", { name: /Отмена/ }));
    expect(useGameStore.getState().massMp).toBe(555);
  });
});

describe("PlanetPanel (UI)", () => {
  it("без систем — пустое состояние", () => {
    useGameStore.setState({ systems: [], activeSystemId: "", activePlanetId: null });
    render(<PlanetPanel />);
    expect(screen.getByText(/Системы пока не сгенерированы/)).toBeInTheDocument();
  });
  it("с активной планетой (неидеальные параметры) — есть терраформинг и щит", () => {
    const p = { ...mkPlanet(), atmosphere: 15, surfaceTemperature: 85 };
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
  it("идеальные параметры → терраформинг отключён с понятной подписью", () => {
    const p = mkPlanet(); // все параметры 50 = золотая середина
    useGameStore.setState({
      systems: [sys([p])],
      activeSystemId: "sys1",
      activePlanetId: "pl1",
      massMp: 100000,
    });
    render(<PlanetPanel />);
    const btn = screen.getByRole("button", { name: /Параметры идеальны/ });
    expect(btn).toBeDisabled();
  });
  it("активный щит → кнопка отключена и показывает остаток времени", () => {
    const p = { ...mkPlanet(), shieldUntilSec: 100 };
    useGameStore.setState({
      systems: [sys([p])],
      activeSystemId: "sys1",
      activePlanetId: "pl1",
      massMp: 100000,
      gameTimeSec: 40,
    });
    render(<PlanetPanel />);
    const btn = screen.getByRole("button", { name: /Щит активен/ });
    expect(btn).toBeDisabled();
  });
  it("полностью развитая планета → ускорение отключено («Развитие завершено»)", () => {
    const p = {
      ...mkPlanet(),
      stage: 4,
      lifeBorn: true,
      civLevel: 4,
      atmosphere: 15,
    };
    useGameStore.setState({
      systems: [sys([p])],
      activeSystemId: "sys1",
      activePlanetId: "pl1",
      massMp: 1_000_000,
    });
    render(<PlanetPanel />);
    const btn = screen.getByRole("button", { name: /Развитие завершено/ });
    expect(btn).toBeDisabled();
  });
});
