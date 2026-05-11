import type { ObjectKind } from "./balance";

/** Цвета по ТЗ: серый / коричневый / металл / яркий. */
export const KIND_COLORS: Record<ObjectKind, number> = {
  0: 0x9ca3af,
  1: 0x92400e,
  2: 0x64748b,
  3: 0xfbbf24,
};

export const KIND_RADIUS: Record<ObjectKind, number> = {
  0: 4,
  1: 8,
  2: 6,
  3: 10,
};
