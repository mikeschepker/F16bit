"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { RaceData } from "@/lib/types";
import type { ClockRef } from "./RaceViewer";
import { interpolatePosition, stepLookup } from "@/lib/interpolate";
import { fitCamera, project, approachCamera, type Camera } from "@/lib/projection";
import { buildCarSprite } from "@/lib/carSprite";

const INTERNAL_HEIGHT = 540; // low internal resolution, upscaled by CSS for the chunky pixel look
const PADDING = 36;
const FOLLOW_ZOOM = 5.5;
const CAMERA_EASE_RATE = 3.5;
const CLICK_RADIUS_PX = 26;

export default function TrackCanvas({
  raceData,
  clockRef,
  selectedDriver,
  onSelectDriver,
}: {
  raceData: RaceData;
  clockRef: RefObject<ClockRef>;
  selectedDriver: number | null;
  onSelectDriver: (n: number | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(selectedDriver);
  const onSelectRef = useRef(onSelectDriver);
  // Screen positions from the most recently drawn frame, for click hit-testing.
  const lastScreenPos = useRef<Map<number, [number, number]>>(new Map());

  useEffect(() => {
    selectedRef.current = selectedDriver;
  }, [selectedDriver]);
  useEffect(() => {
    onSelectRef.current = onSelectDriver;
  }, [onSelectDriver]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const sprites = new Map<number, HTMLCanvasElement>();
    for (const d of raceData.drivers) {
      sprites.set(d.number, buildCarSprite(d.teamColor));
    }

    let internalWidth = 960;
    let camera: Camera | null = null;

    function resize() {
      if (!wrap || !canvas) return;
      const rect = wrap.getBoundingClientRect();
      internalWidth = Math.max(320, Math.round((rect.width / rect.height || 16 / 9) * INTERNAL_HEIGHT));
      canvas.width = internalWidth;
      canvas.height = INTERNAL_HEIGHT;
      camera = null; // force camera reset to the new fit on next frame
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    function handleClick(e: MouseEvent) {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const my = ((e.clientY - rect.top) / rect.height) * canvas.height;
      let best: number | null = null;
      let bestDist = CLICK_RADIUS_PX;
      for (const [num, [px, py]] of lastScreenPos.current) {
        const d = Math.hypot(px - mx, py - my);
        if (d < bestDist) {
          bestDist = d;
          best = num;
        }
      }
      if (best != null) onSelectRef.current(best);
    }
    canvas.addEventListener("click", handleClick);

    let raf: number;
    let last = performance.now();

    function draw(now: number) {
      if (!canvas || !ctx) return;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const { width, height } = canvas;
      const fit = fitCamera(raceData.track, width, height, PADDING);
      if (!camera) camera = { ...fit };

      const time = clockRef.current.time;
      const sel = selectedRef.current;
      let target: Camera = fit;
      let selPos: { x: number; y: number; heading: number } | null = null;
      if (sel != null) {
        const pos = raceData.positions[sel];
        const p = pos ? interpolatePosition(pos, time) : null;
        if (p) {
          selPos = p;
          target = { cx: p.x, cy: p.y, scale: fit.scale * FOLLOW_ZOOM };
        }
      }
      approachCamera(camera, target, dt, CAMERA_EASE_RATE);

      ctx.fillStyle = "#0c1220";
      ctx.fillRect(0, 0, width, height);

      // track ribbon
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      const pts = raceData.track.points.map(([x, y]) => project(camera!, width, height, x, y));
      ctx.beginPath();
      pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
      ctx.closePath();
      ctx.strokeStyle = "#3a4a6b";
      ctx.lineWidth = Math.max(4, 14 * (camera.scale / fit.scale) ** 0.35);
      ctx.stroke();
      ctx.strokeStyle = "#161d33";
      ctx.lineWidth = Math.max(2, 9 * (camera.scale / fit.scale) ** 0.35);
      ctx.stroke();

      // start/finish line
      if (pts.length > 1) {
        const [sx, sy] = pts[0];
        const [nx, ny] = pts[1];
        const angle = Math.atan2(ny - sy, nx - sx) + Math.PI / 2;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(angle);
        ctx.fillStyle = "#e8e8e8";
        ctx.fillRect(-1, -8, 2, 16);
        ctx.restore();
      }

      lastScreenPos.current.clear();

      // draw the selected car's highlight ring beneath everything else
      if (selPos) {
        const [px, py] = project(camera, width, height, selPos.x, selPos.y);
        const r = 16 + Math.sin(now / 250) * 2;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.strokeStyle = "#ffd12e";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      const spriteScale = 1.15;
      for (const driver of raceData.drivers) {
        const pos = raceData.positions[driver.number];
        if (!pos) continue;
        const p = interpolatePosition(pos, time);
        if (!p) continue;
        const [px, py] = project(camera, width, height, p.x, p.y);
        lastScreenPos.current.set(driver.number, [px, py]);
        const sprite = sprites.get(driver.number);
        if (!sprite) continue;

        const posNow = stepLookup(raceData.timing[driver.number]?.position ?? [], time);
        const dimmed = sel != null && sel !== driver.number;

        ctx.save();
        ctx.globalAlpha = dimmed ? 0.45 : 1;
        ctx.translate(px, py);
        ctx.rotate(p.heading + Math.PI / 2);
        ctx.drawImage(
          sprite,
          (-sprite.width / 2) * spriteScale,
          (-sprite.height / 2) * spriteScale,
          sprite.width * spriteScale,
          sprite.height * spriteScale
        );
        ctx.restore();

        if (posNow != null) {
          ctx.font = "bold 9px monospace";
          ctx.fillStyle = dimmed ? "#8fa2c8" : "#fff";
          ctx.textAlign = "center";
          ctx.fillText(String(posNow), px, py - 16);
        }
      }

      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("click", handleClick);
    };
  }, [raceData, clockRef]);

  const selected = selectedDriver != null ? raceData.drivers.find((d) => d.number === selectedDriver) : null;

  return (
    <div
      ref={wrapRef}
      className="relative w-full aspect-video rounded-lg border-4 border-[#2a3554] bg-[#0c1220] overflow-hidden shadow-[0_0_0_2px_#000]"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        style={{ imageRendering: "pixelated" }}
      />
      {selected && (
        <div className="absolute top-3 left-3 flex items-center gap-2 rounded bg-[#0c1220]/90 border-2 border-[#2a3554] px-3 py-1.5 font-pixel-body text-sm text-white pointer-events-none">
          <span
            className="w-2.5 h-2.5 rounded-sm shrink-0"
            style={{ backgroundColor: selected.teamColor }}
          />
          <span>
            {selected.name} &middot; {selected.team}
          </span>
        </div>
      )}
      {selectedDriver != null && (
        <button
          onClick={() => onSelectDriver(null)}
          className="absolute top-3 right-3 rounded bg-[#2a3554] hover:bg-[#374169] border-2 border-[#4c6fff] px-3 py-1.5 font-pixel-body text-sm text-white"
        >
          ◀ FULL RACE
        </button>
      )}
    </div>
  );
}
