"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { RaceData } from "@/lib/types";
import type { ClockRef } from "./RaceViewer";

const SPEEDS = [1, 4, 8, 16, 32, 64];

export default function PlaybackControls({
  raceData,
  clockRef,
}: {
  raceData: RaceData;
  clockRef: RefObject<ClockRef>;
}) {
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(8);
  const [time, setTime] = useState(0);
  const scrubbing = useRef(false);

  useEffect(() => {
    function sync() {
      if (!scrubbing.current) setTime(clockRef.current.time);
      setPlaying(clockRef.current.playing);
    }
    sync();
    const id = setInterval(sync, 200);
    return () => clearInterval(id);
  }, [clockRef]);

  const duration = raceData.session.durationSeconds;

  return (
    <div className="flex items-center gap-3 rounded-lg border-4 border-[#2a3554] bg-[#0c1220] px-4 py-3 font-mono text-xs text-[#dbe4ff] shadow-[0_0_0_2px_#000]">
      <button
        onClick={() => {
          clockRef.current.playing = !clockRef.current.playing;
          setPlaying(clockRef.current.playing);
        }}
        className="px-3 py-1.5 rounded bg-[#2a3554] hover:bg-[#374169] text-white shrink-0"
      >
        {playing ? "⏸" : "▶"}
      </button>

      <input
        type="range"
        min={0}
        max={duration}
        step={1}
        value={time}
        onChange={(e) => {
          scrubbing.current = true;
          const v = Number(e.target.value);
          setTime(v);
          clockRef.current.time = v;
        }}
        onMouseUp={() => (scrubbing.current = false)}
        onTouchEnd={() => (scrubbing.current = false)}
        className="flex-1 accent-[#4c6fff]"
      />

      <span className="w-24 text-right tabular-nums text-[#8fa2c8] shrink-0">
        {formatClock(time)} / {formatClock(duration)}
      </span>

      <div className="flex gap-1 shrink-0">
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => {
              clockRef.current.speed = s;
              setSpeed(s);
            }}
            className={`px-2 py-1.5 rounded ${
              speed === s ? "bg-[#4c6fff] text-white" : "bg-[#2a3554] hover:bg-[#374169] text-[#8fa2c8]"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${sec
    .toString()
    .padStart(2, "0")}`;
}
