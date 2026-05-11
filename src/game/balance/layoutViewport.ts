/**
 * Геометрия поля на экране и отъезд «камеры» при росте горизонта.
 * Базовые доли — ручки ранней щедрости (obsidian/13 §2).
 */

export const BASE_HORIZON_FRACTION = 0.085;
export const BASE_GRAVITY_FRACTION = 0.42;

/** Нижняя граница масштаба слоя дыры (не уводить в точку). */
export const CAMERA_SCALE_MIN = 0.22;

/** Доп. множитель масштаба в режиме «звёздная система». */
export const VIEW_TIER_SYSTEM_SCALE_MUL = 0.62;
