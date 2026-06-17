export type PlanetStage = 1 | 2 | 3 | 4;

export type Planet = {
  id: string;
  name: string;
  orbitalDistance: number;
  gravityProxy: number;
  surfaceTemperature: number;
  atmosphere: number;
  hydrosphere: number;
  geologicalActivity: number;
  orbitPhaseRad: number;
  orbitSpeed: number;
  stage: PlanetStage;
  stageProgressSec: number;
  /** Накопление до «зарождения жизни»; копится только при стабильной экосистеме. */
  lifeEmergenceSec: number;
  /** После заполнения жизнь «рождена» — включается истощение `mpYieldMult`. */
  lifeBorn: boolean;
  /** Множитель базовых MP за поглощение планеты; падает при истощении биосферы. */
  mpYieldMult: number;
  /** Уровень цивилизации 0..4 (растёт после зарождения жизни). */
  civLevel: number;
  /** Накопление игрового времени цивилизации (для роста тиров). */
  civProgressSec: number;
  /** Игровое время, до которого планета защищена щитом от ударов; 0 — нет. */
  shieldUntilSec: number;
  /**
   * Относительный размер тела (~0.42–1.38): диск на карте, SOI, стоимость ускорения стадии.
   * Задаётся при генерации; меняется только при событиях окружения (позже в геймплее).
   */
  radiusScale: number;
};

export type StarSystem = {
  id: string;
  name: string;
  starClass: string;
  planets: Planet[];
};
