import type { Track } from "./types";

export interface Camera {
  cx: number;
  cy: number;
  scale: number;
}

/** Camera that fits the whole track bounding box into (width, height) with padding. */
export function fitCamera(track: Track, width: number, height: number, padding: number): Camera {
  const { minX, maxX, minY, maxY } = track.bounds;
  const w = Math.max(maxX - minX, 1);
  const h = Math.max(maxY - minY, 1);
  const availW = Math.max(width - padding * 2, 1);
  const availH = Math.max(height - padding * 2, 1);
  const scale = Math.min(availW / w, availH / h);
  return { cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, scale };
}

/** Project a world point to canvas pixels for a given camera. */
export function project(camera: Camera, width: number, height: number, x: number, y: number): [number, number] {
  return [width / 2 + (x - camera.cx) * camera.scale, height / 2 + (y - camera.cy) * camera.scale];
}

/** Exponential ease of `current` towards `target`, framerate-independent. */
export function approachCamera(current: Camera, target: Camera, dt: number, rate: number): void {
  const alpha = 1 - Math.exp(-dt * rate);
  current.cx += (target.cx - current.cx) * alpha;
  current.cy += (target.cy - current.cy) * alpha;
  current.scale += (target.scale - current.scale) * alpha;
}
