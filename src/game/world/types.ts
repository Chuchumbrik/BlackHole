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
};

export type StarSystem = {
  id: string;
  name: string;
  starClass: string;
  planets: Planet[];
};
