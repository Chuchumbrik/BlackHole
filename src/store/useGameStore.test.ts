import { describe, it, expect } from "vitest";
import { useGameStore } from "./useGameStore";
import { nextUpgradeCostMp, ZERO_UPGRADE_LEVELS } from "../game/upgrades";
import type { Planet, StarSystem } from "../game/world/types";

const mkPlanet = (over: Partial<Planet> = {}): Planet => ({
  id: "pl1",
  name: "P",
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
  ...over,
});

const sysWith = (p: Planet): StarSystem => ({
  id: "sys1",
  name: "Sys",
  starClass: "G",
  planets: [p],
});

const setup = (massMp: number, planet?: Planet) => {
  const p = planet ?? mkPlanet();
  useGameStore.setState({
    massMp,
    upgradeLevels: { ...ZERO_UPGRADE_LEVELS },
    systems: [sysWith(p)],
    activeSystemId: "sys1",
    activePlanetId: p.id,
    gameTimeSec: 0,
    prestigePoints: 0,
    lifetimePp: 0,
    prestigePerkLevels: {},
    mpUpgradeLevels: {},
  });
};

const planet0 = () => useGameStore.getState().systems[0].planets[0];

describe("store: оптовая покупка апгрейдов", () => {
  it("buyUpgrade(count) берёт ровно count при достатке массы", () => {
    setup(1_000_000);
    useGameStore.getState().buyUpgrade("size", 5);
    expect(useGameStore.getState().upgradeLevels.size).toBe(5);
  });
  it("берёт максимум по балансу и не уходит в минус", () => {
    const twoLevels =
      nextUpgradeCostMp(ZERO_UPGRADE_LEVELS, "size") +
      nextUpgradeCostMp({ ...ZERO_UPGRADE_LEVELS, size: 1 }, "size");
    setup(twoLevels); // хватает ровно на 2
    useGameStore.getState().buyUpgrade("size", 10);
    expect(useGameStore.getState().upgradeLevels.size).toBe(2);
    expect(useGameStore.getState().massMp).toBeGreaterThanOrEqual(0);
    expect(useGameStore.getState().massMp).toBeLessThan(
      nextUpgradeCostMp({ ...ZERO_UPGRADE_LEVELS, size: 2 }, "size"),
    );
  });
});

describe("store: prestige", () => {
  it("сжатие начисляет PP и сбрасывает ран", () => {
    setup(4000);
    useGameStore.getState().doPrestige();
    const s = useGameStore.getState();
    expect(s.prestigePoints).toBe(2);
    expect(s.upgradeLevels).toEqual(ZERO_UPGRADE_LEVELS);
    expect(s.massMp).toBeLessThan(4000);
  });
  it("lifetimePp накапливается и НЕ сбрасывается тратой PP (для достижений)", () => {
    setup(4000);
    useGameStore.getState().doPrestige(); // +2 PP, lifetime 2
    useGameStore.setState({ massMp: 4000 });
    useGameStore.getState().doPrestige(); // ещё +2, lifetime 4
    const s = useGameStore.getState();
    expect(s.lifetimePp).toBe(4);
    // трата PP не уменьшает lifetime
    useGameStore.getState().buyPrestigePerk("compressed_singularity", 1);
    expect(useGameStore.getState().lifetimePp).toBe(4);
  });
});

describe("store: развитие планеты", () => {
  it("терраформинг двигает параметры к 50 и списывает MP", () => {
    setup(100_000, mkPlanet({ atmosphere: 20, surfaceTemperature: 90 }));
    const massBefore = useGameStore.getState().massMp;
    useGameStore.getState().terraformPlanet("sys1", "pl1");
    const p = planet0();
    expect(p.atmosphere).toBeGreaterThan(20);
    expect(p.surfaceTemperature).toBeLessThan(90);
    expect(useGameStore.getState().massMp).toBeLessThan(massBefore);
  });
  it("щит защищает от отката при ударе", () => {
    setup(100_000);
    useGameStore.getState().shieldPlanet("sys1", "pl1");
    const before = planet0();
    useGameStore.setState((s) => ({
      systems: s.systems.map((sys) => ({
        ...sys,
        planets: sys.planets.map((p) => ({ ...p, stageProgressSec: 50 })),
      })),
    }));
    useGameStore.getState().damagePlanet("sys1", "pl1");
    expect(planet0().stageProgressSec).toBe(50); // щит поглотил удар
    expect(before.shieldUntilSec).toBeGreaterThan(0);
  });
  it("ускорение планеты двигает жизнь/цивилизацию (стабильная экосистема)", () => {
    setup(1_000_000, mkPlanet()); // все параметры 50 → экосистема стабильна
    useGameStore.getState().acceleratePlanet("sys1", "pl1");
    expect(planet0().lifeEmergenceSec).toBeGreaterThan(0);
  });
});
