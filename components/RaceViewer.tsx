"use client";

import { useEffect, useRef, useState } from "react";
import type { RaceData } from "@/lib/types";
import { BASE_PATH } from "@/lib/basePath";
import TrackCanvas from "./TrackCanvas";
import Leaderboard from "./Leaderboard";
import PlaybackControls from "./PlaybackControls";

export interface ClockRef {
  time: number;
  playing: boolean;
  speed: number;
}

export default function RaceViewer({ slug }: { slug: string }) {
  const [raceData, setRaceData] = useState<RaceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const clockRef = useRef<ClockRef>({ time: 0, playing: true, speed: 8 });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const base = `${BASE_PATH}/data/races/${slug}`;
        const get = (name: string) => fetch(`${base}/${name}`).then((r) => {
          if (!r.ok) throw new Error(`${name}: ${r.status}`);
          return r.json();
        });
        const [session, drivers, track, positions, timing, results] = await Promise.all([
          get("session.json"),
          get("drivers.json"),
          get("track.json"),
          get("positions.json"),
          get("timing.json"),
          get("results.json"),
        ]);
        if (cancelled) return;
        setRaceData({ session, drivers, track, positions, timing, results });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!raceData) return;
    let raf: number;
    let last = performance.now();
    function tick(now: number) {
      const dt = (now - last) / 1000;
      last = now;
      const clock = clockRef.current;
      if (clock.playing) {
        const duration = raceData!.session.durationSeconds;
        clock.time = Math.min(clock.time + dt * clock.speed, duration);
        if (clock.time >= duration) clock.playing = false;
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [raceData]);

  if (error) {
    return (
      <div className="p-8 font-mono text-red-400">
        Failed to load race data: {error}
      </div>
    );
  }
  if (!raceData) {
    return (
      <div className="p-8 font-mono text-[#8fa2c8] animate-pulse">
        Loading race data&hellip;
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4 max-w-[1600px] mx-auto w-full">
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <TrackCanvas
          raceData={raceData}
          clockRef={clockRef}
          selectedDriver={selectedDriver}
          onSelectDriver={setSelectedDriver}
        />
        <PlaybackControls raceData={raceData} clockRef={clockRef} />
      </div>
      <Leaderboard
        raceData={raceData}
        clockRef={clockRef}
        selectedDriver={selectedDriver}
        onSelectDriver={setSelectedDriver}
      />
    </div>
  );
}
