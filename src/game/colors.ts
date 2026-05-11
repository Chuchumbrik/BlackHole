import type { ObjectKind } from "./balance";

/** Цвета по ТЗ: серый / коричневый / металл / яркий. */
export const KIND_COLORS: Record<ObjectKind, number> = {
  0: 0x9ca3af,
  1: 0x92400e,
  2: 0x64748b,
  3: 0xfbbf24,
  4: 0x22d3ee,
};

export const KIND_RADIUS: Record<ObjectKind, number> = {
  0: 5,
  1: 10,
  2: 7,
  3: 12,
  4: 9,
};
