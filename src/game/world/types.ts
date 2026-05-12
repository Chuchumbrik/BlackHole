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
};

export type StarSystem = {
  id: string;
  name: string;
  starClass: string;
  planets: Planet[];
};
