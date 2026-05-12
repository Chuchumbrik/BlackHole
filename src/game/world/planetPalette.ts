import type { Planet } from "./types";

export type Rgb = { r: number; g: number; b: number };

/** Целевой цвет поверхности планеты из шести параметров (без анимации — только цель для lerp). */
export function planetPaletteRgb(planet: Planet): Rgb {
  const t = planet.surfaceTemperature / 100;
  const h = planet.hydrosphere / 100;
  const a = planet.atmosphere / 100;
  const g = planet.geologicalActivity / 100;
  const grav = planet.gravityProxy / 100;
  const orb = planet.orbitalDistance / 100;

  // База: температура (холод — сине-серый, жар — янтарь/красный)
  let r = 0.35 + t * 0.55;
  let gb = 0.55 + (1 - t) * 0.35;
  let b = 0.45 + (1 - t) * 0.4;

  // Влага — к циану/изумруду
  r -= h * 0.18;
  gb += h * 0.22;
  b += h * 0.12;

  // Атмосфера — фиолетово-розовый сдвиг (рассеяние)
  r += a * 0.08;
  gb -= a * 0.05;
  b += a * 0.1;

  // Геология — тёплый рыжий
  r += g * 0.12;
  gb -= g * 0.06;
  b -= g * 0.08;

  // Масса/орбита — лёгкая десатурация дальних/тяжёлых
  const desat = grav * 0.04 + orb * 0.03;
  r = r * (1 - desat) + 0.5 * desat;
  gb = gb * (1 - desat) + 0.5 * desat;
  b = b * (1 - desat) + 0.5 * desat;

  r = Math.max(0, Math.min(1, r));
  gb = Math.max(0, Math.min(1, gb));
  b = Math.max(0, Math.min(1, b));

  return {
    r: Math.round(r * 255),
    g: Math.round(gb * 255),
    b: Math.round(b * 255),
  };
}

export function rgbToFill(rgb: Rgb): number {
  return (rgb.r << 16) | (rgb.g << 8) | rgb.b;
}

export function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  const u = Math.max(0, Math.min(1, t));
  return {
    r: Math.round(a.r + (b.r - a.r) * u),
    g: Math.round(a.g + (b.g - a.g) * u),
    b: Math.round(a.b + (b.b - a.b) * u),
  };
}
