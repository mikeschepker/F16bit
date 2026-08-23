// Procedural 16-bit-style top-down F1 car sprite, drawn as layered rectangles
// (wings peeking out past a narrower hull, wheels at the corners, a helmet
// bump for the cockpit) onto an offscreen canvas per team color. No external
// art assets — avoids any licensing question.

const PIXEL = 3; // device px per sprite grid cell, before the extra draw-time scale

// Sprite-space grid: col 0..12 (width 13), row 0 = nose tip .. row 19 = tail.
const GRID_W = 13;
const GRID_H = 20;

export function buildCarSprite(bodyColor: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = GRID_W * PIXEL;
  canvas.height = GRID_H * PIXEL;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  const dark = shade(bodyColor, -0.55);
  const light = shade(bodyColor, 0.45);
  const black = "#141414";
  const wing = "#d8dce6";

  const rect = (col: number, row: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(col * PIXEL, row * PIXEL, w * PIXEL, h * PIXEL);
  };

  // Wings first (wider than the hull, so their tips peek out once the hull is
  // drawn on top of the middle portion).
  rect(1, 5, 11, 1, wing); // front wing
  rect(1, 17, 11, 1, wing); // rear wing

  // Wheels, at all four corners, straddling the wing bars.
  rect(0, 5, 2, 3, black); // front-left
  rect(11, 5, 2, 3, black); // front-right
  rect(0, 14, 2, 3, black); // rear-left
  rect(11, 14, 2, 3, black); // rear-right

  // Hull: nose taper, then the main body, drawn with a 1px dark outline by
  // laying a slightly larger dark rect behind each color rect.
  rect(6, 0, 1, 1, dark);
  rect(5, 1, 3, 2, dark);
  rect(4, 3, 5, 2, dark);
  rect(3, 5, 7, 12, dark);

  rect(6, 0, 1, 1, bodyColor);
  rect(5, 1, 3, 1, bodyColor);
  rect(5, 2, 3, 1, bodyColor);
  rect(4, 3, 5, 1, bodyColor);
  rect(4, 4, 5, 1, bodyColor);
  rect(4, 6, 5, 10, bodyColor);

  // Center sheen down the hull.
  rect(6, 6, 1, 10, light);

  // Cockpit / helmet.
  rect(5, 9, 3, 3, black);
  rect(6, 10, 1, 1, "#3a4a6b"); // visor glint

  // Diffuser / tail.
  rect(5, 18, 3, 2, dark);

  return canvas;
}

function shade(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  const num = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  const mix = (v: number) => (amt >= 0 ? v + (255 - v) * amt : v + v * amt);
  r = Math.max(0, Math.min(255, Math.round(mix(r))));
  g = Math.max(0, Math.min(255, Math.round(mix(g))));
  b = Math.max(0, Math.min(255, Math.round(mix(b))));
  return `rgb(${r},${g},${b})`;
}
