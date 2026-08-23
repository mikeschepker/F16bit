import type { DriverPositions, TimingEvent, LapEvent } from "./types";

/** Index of the last element with arr[i] <= target (binary search over sorted t[]). */
function lastIndexAtOrBefore(t: number[], target: number): number {
  let lo = 0;
  let hi = t.length - 1;
  if (hi < 0 || target < t[0]) return -1;
  if (target >= t[hi]) return hi;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (t[mid] <= target) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export interface InterpolatedPosition {
  x: number;
  y: number;
  /** heading in radians, direction of travel */
  heading: number;
  /** true if we're extrapolating before the first sample or after the last */
  outOfRange: boolean;
}

/**
 * Linearly interpolate a driver's (x, y) at time `time` (seconds from race start)
 * from its sparse ~3.7Hz location samples, and derive a heading from the local
 * direction of travel so the car sprite can be rotated to face the way it's moving.
 */
export function interpolatePosition(
  pos: DriverPositions,
  time: number
): InterpolatedPosition | null {
  const { t, x, y } = pos;
  if (t.length === 0) return null;
  if (t.length === 1) {
    return { x: x[0], y: y[0], heading: 0, outOfRange: true };
  }

  const i = lastIndexAtOrBefore(t, time);

  if (i < 0) {
    const heading = Math.atan2(y[1] - y[0], x[1] - x[0]);
    return { x: x[0], y: y[0], heading, outOfRange: true };
  }
  if (i >= t.length - 1) {
    const last = t.length - 1;
    const heading = Math.atan2(y[last] - y[last - 1], x[last] - x[last - 1]);
    return { x: x[last], y: y[last], heading, outOfRange: true };
  }

  const t0 = t[i];
  const t1 = t[i + 1];
  const span = t1 - t0;
  const f = span > 0 ? (time - t0) / span : 0;
  const ix = x[i] + (x[i + 1] - x[i]) * f;
  const iy = y[i] + (y[i + 1] - y[i]) * f;
  const heading = Math.atan2(y[i + 1] - y[i], x[i + 1] - x[i]);
  return { x: ix, y: iy, heading, outOfRange: false };
}

/** Latest value at or before `time` from a sparse, time-ordered event list. */
export function stepLookup<V>(events: TimingEvent<V>[], time: number): V | null {
  if (events.length === 0) return null;
  const t = events.map((e) => e.t);
  const i = lastIndexAtOrBefore(t, time);
  return i < 0 ? null : events[i].value;
}

/** Latest lap event at or before `time`. */
export function currentLap(laps: LapEvent[], time: number): LapEvent | null {
  if (laps.length === 0) return null;
  const t = laps.map((l) => l.t);
  const i = lastIndexAtOrBefore(t, time);
  return i < 0 ? laps[0] : laps[i];
}
