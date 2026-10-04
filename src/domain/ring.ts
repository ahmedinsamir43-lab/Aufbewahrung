export interface RingState {
  /** Sichtbare Füllung des Rings, begrenzt auf 0–1. */
  fill: number;
  /** Erreichter Anteil am Soll in Prozent (gerundet, kann > 100 sein). */
  percent: number;
  /** Soll überschritten → Farbwechsel. */
  over: boolean;
  /** Verbleibende Menge (≥ 0). */
  remaining: number;
}

/** Toleranz, ab der eine Überschreitung als solche gilt (Rundungsrauschen vermeiden). */
export const OVER_TOLERANCE = 0.005;

export function ringState(consumed: number, target: number): RingState {
  if (target <= 0) {
    return { fill: consumed > 0 ? 1 : 0, percent: 0, over: consumed > 0, remaining: 0 };
  }
  const ratio = Math.max(0, consumed) / target;
  return {
    fill: Math.min(1, ratio),
    percent: Math.round(ratio * 100),
    over: ratio > 1 + OVER_TOLERANCE,
    remaining: Math.max(0, Math.round(target - consumed)),
  };
}
