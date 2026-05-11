/**
 * Геометрия поля на экране и отъезд «камеры» при росте горизонта.
 * Базовые доли — ручки ранней щедрости (obsidian/13 §2).
 */

export const BASE_HORIZON_FRACTION = 0.085;
export const BASE_GRAVITY_FRACTION = 0.42;

/**
 * Геометрия v1.5: звезда в центре вида, дыра на орбите этой доли min(width,height).
 */
export const BH_ORBIT_RADIUS_FRACTION = 0.3;

/** Фиксированный азимут дыры на периферии (рад), стабилен на сессию. */
export const BH_SCREEN_ANGLE_RAD = 2.35;

/**
 * Внешний радиус звёздной системы (спавн на границе, побег за неё) как доля minD.
 */
export const SYSTEM_OUTER_RADIUS_FRACTION = 0.46;

/** Нижняя граница масштаба слоя дыры (не уводить в точку). */
export const CAMERA_SCALE_MIN = 0.22;

/** Доп. множитель масштаба в режиме «звёздная система». */
export const VIEW_TIER_SYSTEM_SCALE_MUL = 0.62;
