/**
 * Единая точка констант баланса фаз 1–2 (поле, спавн, улучшения дыры).
 * Источник истины по формулам: obsidian/07; темп и ручки — obsidian/13.
 */

export {
  BASE_SPAWN_PER_SECOND,
  MAX_OBJECTS_ON_FIELD,
  SHIP_SPAWN_FRACTION,
  SPAWN_WEIGHTS,
} from "./spawn";

export type { ObjectKind } from "./objectKinds";
export { MP_RANGE, OBJECT_MASS } from "./objectKinds";

export {
  SHIPS_UNLOCK_MIN_SUM,
  SUM_FOR_DISK_UNLOCK,
  SUM_FOR_EFFICIENCY_UNLOCK,
  VIEW_TIER_GALAXY_MIN_SUM,
  VIEW_TIER_SYSTEM_MIN_SUM,
} from "./unlocks";

export {
  SHIP_THRUST_DISK_FACTOR_PER_LEVEL,
  SHIP_THRUST_EFFICIENCY_FACTOR_PER_LEVEL,
  UPGRADE_COST_MULTIPLIER_PER_LEVEL,
  UPGRADE_FIRST_LEVEL_COST_MP,
  UPGRADE_PER_LEVEL_FACTOR,
} from "./upgradeEconomy";

export {
  BASE_GRAVITY_FRACTION,
  BASE_HORIZON_FRACTION,
  CAMERA_SCALE_MIN,
  VIEW_TIER_SYSTEM_SCALE_MUL,
} from "./layoutViewport";

export {
  BASE_GRAVITY_ACCEL,
  BASE_BH_MASS,
  BASE_STAR_MASS,
  ESCAPE_MP_BASE,
  GRAVITY_CONST,
  GRAVITY_SOFTENING,
  OUTSIDE_GRAVITY_RATIO,
  SHIP_THRUST_BASE,
  VELOCITY_DAMPING,
} from "./simulationPhysics";

export { FIELD_MP_GLOBAL_MULTIPLIER } from "./economyTuning";
