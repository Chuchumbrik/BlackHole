import { describe, it, expect } from "vitest";
import { useGameStore } from "./useGameStore";
import { nextUpgradeCostMp, ZERO_UPGRADE_LEVELS } from "../game/upgrades";
import { MP_UPGRADES, mpUpgradeCost } from "../game/mpUpgrades";
import { PRESTIGE_PERKS, perkCost } from "../game/prestigePerks";
import { PRESTIGE_SPENT_PER_PP } from "../game/prestige";
import {
  ENERGY_MAX,
  ENERGY_TAP_COST,
  MAX_TAPS_PER_MIN,
  SUPERNOVA_ENERGY_COST,
} from "../game/balance";
import { ENTROPY_THRESHOLD } from "../game/endgame";
import type { Planet, StarSystem } from "../game/world/types";

/** Потратить ровно 4×порог → 2 PP (floor(sqrt(4))), независимо от калибровки. */
const SPENT_FOR_2_PP = PRESTIGE_SPENT_PER_PP * 4;

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
    massSpentRun: 0,
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
  it("×N списывает СУММУ пересчитанных по уровням цен (не плоскую)", () => {
    const N = 5;
    let expected = 0;
    const tmp = { ...ZERO_UPGRADE_LEVELS };
    for (let i = 0; i < N; i++) {
      expected += nextUpgradeCostMp(tmp, "disk");
      tmp.disk += 1;
    }
    setup(1_000_000);
    const before = useGameStore.getState().massMp;
    useGameStore.getState().buyUpgrade("disk", N);
    expect(useGameStore.getState().upgradeLevels.disk).toBe(N);
    expect(before - useGameStore.getState().massMp).toBe(expected);
    // цена за следующий уровень действительно выросла (пересчёт работает):
    expect(nextUpgradeCostMp(useGameStore.getState().upgradeLevels, "disk")).toBeGreaterThan(
      nextUpgradeCostMp(ZERO_UPGRADE_LEVELS, "disk"),
    );
  });
  it("×N для MP-апгрейда: N уровней и сумма пересчитанных цен", () => {
    const def = MP_UPGRADES[0];
    const N = 4;
    let expected = 0;
    for (let i = 0; i < N; i++) expected += mpUpgradeCost(def, i);
    setup(1_000_000);
    const before = useGameStore.getState().massMp;
    useGameStore.getState().buyMpUpgrade(def.id, N);
    expect(useGameStore.getState().mpUpgradeLevels[def.id]).toBe(N);
    expect(before - useGameStore.getState().massMp).toBe(expected);
  });
  it("×N для перка престижа: N уровней и сумма PP-цен", () => {
    const def = PRESTIGE_PERKS[0];
    const N = 3;
    let expected = 0;
    for (let i = 0; i < N; i++) expected += perkCost(def, i);
    useGameStore.setState({ prestigePoints: 100000, prestigePerkLevels: {} });
    const before = useGameStore.getState().prestigePoints;
    useGameStore.getState().buyPrestigePerk(def.id, N);
    expect(useGameStore.getState().prestigePerkLevels[def.id]).toBe(N);
    expect(before - useGameStore.getState().prestigePoints).toBe(expected);
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

describe("store: prestige (по потраченной массе)", () => {
  it("сжатие начисляет PP по massSpentRun и сбрасывает счётчик трат", () => {
    setup(100);
    useGameStore.setState({ massSpentRun: SPENT_FOR_2_PP }); // 4×PER_PP → 2 PP
    useGameStore.getState().doPrestige();
    const s = useGameStore.getState();
    expect(s.prestigePoints).toBe(2);
    expect(s.upgradeLevels).toEqual(ZERO_UPGRADE_LEVELS);
    expect(s.massSpentRun).toBe(0);
  });
  it("оптовая покупка апгрейдов копит massSpentRun (база PP)", () => {
    setup(1_000_000);
    const before = useGameStore.getState().massSpentRun;
    useGameStore.getState().buyUpgrade("size", 5);
    expect(useGameStore.getState().massSpentRun).toBeGreaterThan(before);
  });
  it("сжатие добавляет запись в журнал (летопись переживает ран)", () => {
    setup(100);
    const before = useGameStore.getState().journalEntries.length;
    useGameStore.setState({ massSpentRun: SPENT_FOR_2_PP });
    useGameStore.getState().doPrestige();
    const entries = useGameStore.getState().journalEntries;
    // +1 (сжатие), иногда +2 если у новой системы выпала аномалия (RNG).
    expect(entries.length).toBeGreaterThanOrEqual(before + 1);
    expect(entries.some((e) => e.category === "milestone")).toBe(true);
  });
  it("lifetimePp накапливается и НЕ сбрасывается тратой PP (для достижений)", () => {
    setup(100);
    useGameStore.setState({ massSpentRun: SPENT_FOR_2_PP });
    useGameStore.getState().doPrestige(); // +2 PP, lifetime 2
    useGameStore.setState({ massSpentRun: SPENT_FOR_2_PP });
    useGameStore.getState().doPrestige(); // ещё +2, lifetime 4
    const s = useGameStore.getState();
    expect(s.lifetimePp).toBe(4);
    // трата PP не уменьшает lifetime
    useGameStore.getState().buyPrestigePerk("compressed_singularity", 1);
    expect(useGameStore.getState().lifetimePp).toBe(4);
  });
});

describe("store: Energy и волна притяжения", () => {
  it("regenEnergy копит до максимума и не превышает его", () => {
    useGameStore.setState({ energy: 10, tapTimestamps: [] });
    useGameStore.getState().regenEnergy(1000); // заведомо больше, чем нужно
    expect(useGameStore.getState().energy).toBe(ENERGY_MAX);
  });
  it("tryCastPullWave списывает Energy при достатке и возвращает true", () => {
    useGameStore.setState({ energy: ENERGY_MAX, tapTimestamps: [] });
    const ok = useGameStore.getState().tryCastPullWave();
    expect(ok).toBe(true);
    expect(useGameStore.getState().energy).toBe(ENERGY_MAX - ENERGY_TAP_COST);
  });
  it("не пускает волну при нехватке Energy", () => {
    useGameStore.setState({ energy: ENERGY_TAP_COST - 1, tapTimestamps: [] });
    expect(useGameStore.getState().tryCastPullWave()).toBe(false);
  });
  it("жёсткий лимит тапов/мин блокирует сверх MAX_TAPS_PER_MIN", () => {
    const now = Date.now();
    const full = Array.from({ length: MAX_TAPS_PER_MIN }, () => now);
    useGameStore.setState({ energy: ENERGY_MAX, tapTimestamps: full });
    expect(useGameStore.getState().tryCastPullWave()).toBe(false);
    // Energy не списана, т.к. упёрлись в лимит/мин:
    expect(useGameStore.getState().energy).toBe(ENERGY_MAX);
  });
});

describe("store: сверхновая (узел №11)", () => {
  const armSupernova = () =>
    useGameStore.setState({
      upgradeLevels: { ...ZERO_UPGRADE_LEVELS, size: 20 }, // сумма ≥ 18 → ветка B открыта
      prestigeCount: 1,
      energy: ENERGY_MAX,
      supernovaReadyAtMs: 0,
      supernovaBuffEndsAtSimSec: 0,
      pendingSupernovaBurst: 0,
      gameTimeSec: 0,
    });
  it("не запускается без разблокировки ветки B", () => {
    armSupernova();
    useGameStore.setState({ upgradeLevels: { ...ZERO_UPGRADE_LEVELS } }); // сумма 0
    expect(useGameStore.getState().triggerSupernova()).toBe(false);
  });
  it("не запускается без сжатия", () => {
    armSupernova();
    useGameStore.setState({ prestigeCount: 0 });
    expect(useGameStore.getState().triggerSupernova()).toBe(false);
  });
  it("запускается: списывает Energy, ставит бафф и всплеск, уходит в перезарядку", () => {
    armSupernova();
    expect(useGameStore.getState().triggerSupernova()).toBe(true);
    const s = useGameStore.getState();
    expect(s.energy).toBe(ENERGY_MAX - SUPERNOVA_ENERGY_COST);
    expect(s.supernovaBuffEndsAtSimSec).toBeGreaterThan(0);
    expect(s.pendingSupernovaBurst).toBeGreaterThan(0);
    expect(s.supernovaReadyAtMs).toBeGreaterThan(Date.now());
    // повторно сразу — нельзя (перезарядка)
    expect(useGameStore.getState().triggerSupernova()).toBe(false);
  });
  it("consumeSupernovaBurst отдаёт всплеск и обнуляет", () => {
    armSupernova();
    useGameStore.getState().triggerSupernova();
    const burst = useGameStore.getState().consumeSupernovaBurst();
    expect(burst).toBeGreaterThan(0);
    expect(useGameStore.getState().pendingSupernovaBurst).toBe(0);
    expect(useGameStore.getState().consumeSupernovaBurst()).toBe(0);
  });
});

describe("store: Уничтожение Вселенной (эндшпиль)", () => {
  it("ниже порога энтропии — не срабатывает", () => {
    setup(1000);
    useGameStore.setState({ universeEntropy: 1, ultimatePoints: 0, newGamePlusCount: 0 });
    useGameStore.getState().destroyUniverse();
    expect(useGameStore.getState().newGamePlusCount).toBe(0);
  });
  it("на пороге — даёт UP, NG+, сбрасывает PP/энтропию", () => {
    setup(1000);
    useGameStore.setState({
      universeEntropy: ENTROPY_THRESHOLD,
      ultimatePoints: 0,
      newGamePlusCount: 0,
      prestigePoints: 50,
      lifetimePp: 400,
    });
    useGameStore.getState().destroyUniverse();
    const s = useGameStore.getState();
    expect(s.ultimatePoints).toBeGreaterThanOrEqual(1);
    expect(s.newGamePlusCount).toBe(1);
    expect(s.universeEntropy).toBe(0);
    expect(s.prestigePoints).toBe(0);
    // NG+ стартует с бонус-массой от Ultimate Points (не с нуля).
    expect(s.massMp).toBeGreaterThan(0);
  });
});

describe("store: поглощение звезды", () => {
  it("даёт крупный куш MP, коллапсирует систему, считает звёзды, пишет в журнал", () => {
    setup(0);
    useGameStore.setState({ starsSwallowed: 0 });
    const jBefore = useGameStore.getState().journalEntries.length;
    useGameStore.getState().consumeStar("sys1");
    const s = useGameStore.getState();
    expect(s.massMp).toBeGreaterThan(100_000); // звезда ≫ планет/астероидов
    expect(s.systems[0].starConsumed).toBe(true);
    expect(s.starsSwallowed).toBe(1);
    expect(s.journalEntries.length).toBe(jBefore + 1);
  });
  it("повторно не срабатывает (звезда уже поглощена)", () => {
    setup(0);
    useGameStore.setState({ starsSwallowed: 0 });
    useGameStore.getState().consumeStar("sys1");
    const massAfterFirst = useGameStore.getState().massMp;
    useGameStore.getState().consumeStar("sys1");
    expect(useGameStore.getState().massMp).toBe(massAfterFirst);
    expect(useGameStore.getState().starsSwallowed).toBe(1);
  });
});

describe("store: развитие планеты", () => {
  it("терраформинг двигает инженерные параметры к 50 и списывает MP", () => {
    // атмосфера двигается терраформингом; температура теперь физико-зависима
    // (orbital), терраформингом НЕ меняется.
    setup(100_000, mkPlanet({ atmosphere: 20, hydrosphere: 80, surfaceTemperature: 90 }));
    const massBefore = useGameStore.getState().massMp;
    useGameStore.getState().terraformPlanet("sys1", "pl1");
    const p = planet0();
    expect(p.atmosphere).toBeGreaterThan(20);
    expect(p.hydrosphere).toBeLessThan(80);
    expect(p.surfaceTemperature).toBe(90); // температура не двигается терраформингом
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
  it("ускорение зрелой планеты двигает жизнь (стабильная экосистема, стадия ≥ 3)", () => {
    // все параметры 50 → экосистема стабильна; стадия 3 → планета зрелая для жизни
    setup(1_000_000, mkPlanet({ stage: 3 }));
    useGameStore.getState().acceleratePlanet("sys1", "pl1");
    expect(planet0().lifeEmergenceSec).toBeGreaterThan(0);
  });
});
