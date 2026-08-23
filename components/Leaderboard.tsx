"use client";

import { useEffect, useState, type RefObject } from "react";
import type { RaceData } from "@/lib/types";
import type { ClockRef } from "./RaceViewer";
import { stepLookup, currentLap } from "@/lib/interpolate";
import { compoundStyle } from "@/lib/compound";

interface Row {
  number: number;
  code: string;
  name: string;
  team: string;
  teamColor: string;
  position: number;
  gap: number | null;
  lapNumber: number | null;
  compound: string | undefined;
}

function buildRows(raceData: RaceData, time: number): Row[] {
  const rows: Row[] = [];
  for (const d of raceData.drivers) {
    const timing = raceData.timing[d.number];
    if (!timing) continue;
    const position = stepLookup(timing.position, time);
    if (position == null) continue;
    const gap = stepLookup(timing.gap, time);
    const lap = currentLap(timing.laps, time);
    const stint = timing.stints.find(
      (s) => lap && lap.lapNumber >= s.lapStart && lap.lapNumber <= s.lapEnd
    );
    rows.push({
      number: d.number,
      code: d.code,
      name: d.name,
      team: d.team,
      teamColor: d.teamColor,
      position,
      gap,
      lapNumber: lap?.lapNumber ?? null,
      compound: stint?.compound,
    });
  }
  rows.sort((a, b) => a.position - b.position);
  return rows;
}

function bestLapSoFar(laps: { t: number; lapDuration: number | null }[], time: number): number | null {
  let best: number | null = null;
  for (const l of laps) {
    if (l.t > time || l.lapDuration == null) continue;
    if (best == null || l.lapDuration < best) best = l.lapDuration;
  }
  return best;
}

function formatLapTime(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(3).padStart(6, "0");
  return `${m}:${s}`;
}

export default function Leaderboard({
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
  const [rows, setRows] = useState<Row[]>(() => buildRows(raceData, 0));
  const [time, setTime] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      const t = clockRef.current.time;
      setTime(t);
      setRows(buildRows(raceData, t));
    }, 250);
    return () => clearInterval(id);
  }, [raceData, clockRef]);

  const lapNow = rows.length ? Math.max(...rows.map((r) => r.lapNumber ?? 0)) : 0;

  return (
    <div className="w-full lg:w-80 shrink-0 rounded-lg border-4 border-[#2a3554] bg-[#0c1220] p-3 font-mono text-xs text-[#dbe4ff] shadow-[0_0_0_2px_#000]">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[#8fa2c8] uppercase tracking-wide">
          Lap {lapNow || 0}/{raceData.session.totalLaps}
        </span>
        <span className="text-[#8fa2c8]">{formatClock(time)}</span>
      </div>
      <div className="flex flex-col gap-1 max-h-[520px] overflow-y-auto pr-1">
        {rows.map((r) => {
          const cs = compoundStyle(r.compound);
          const isSelected = selectedDriver === r.number;
          const timing = raceData.timing[r.number];
          const best = timing ? bestLapSoFar(timing.laps, time) : null;
          const result = raceData.results[r.number];

          return (
            <div
              key={r.number}
              className="relative"
              onMouseEnter={() => setHovered(r.number)}
              onMouseLeave={() => setHovered((h) => (h === r.number ? null : h))}
            >
              <button
                onClick={() => onSelectDriver(isSelected ? null : r.number)}
                className={`w-full flex items-center gap-2 rounded px-2 py-1.5 text-left transition-colors ${
                  isSelected ? "bg-[#2a3554] ring-1 ring-[#4c6fff]" : "bg-[#141c33] hover:bg-[#1a2440]"
                }`}
              >
                <span className="w-5 text-right text-[#8fa2c8]">{r.position}</span>
                <span
                  className="w-2 h-4 rounded-sm shrink-0"
                  style={{ backgroundColor: r.teamColor }}
                />
                <span className="flex-1 text-white tracking-wide">{r.code}</span>
                {cs && (
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-black shrink-0"
                    style={{ backgroundColor: cs.color }}
                    title={r.compound}
                  >
                    {cs.label}
                  </span>
                )}
                <span className="w-14 text-right text-[#8fa2c8]">
                  {r.position === 1
                    ? "LEADER"
                    : r.gap != null
                    ? `+${r.gap.toFixed(1)}`
                    : "—"}
                </span>
              </button>

              {hovered === r.number && (
                <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded border-2 border-[#4c6fff] bg-[#0c1220] p-3 shadow-lg flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-4 rounded-sm shrink-0"
                      style={{ backgroundColor: r.teamColor }}
                    />
                    <div className="min-w-0">
                      <div className="text-white font-pixel-body text-sm truncate">{r.name}</div>
                      <div className="text-[#8fa2c8] truncate">{r.team}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[#8fa2c8]">
                    <span>Position</span>
                    <span className="text-white text-right">P{r.position}</span>
                    <span>Gap to leader</span>
                    <span className="text-white text-right">
                      {r.position === 1 ? "—" : r.gap != null ? `+${r.gap.toFixed(1)}s` : "—"}
                    </span>
                    <span>Best lap</span>
                    <span className="text-white text-right">{formatLapTime(best)}</span>
                    <span>Tyre</span>
                    <span className="text-white text-right">{r.compound ?? "—"}</span>
                    {result && (
                      <>
                        <span>Result</span>
                        <span className="text-white text-right">
                          {result.dns
                            ? "DNS"
                            : result.dsq
                            ? "DSQ"
                            : result.dnf
                            ? "DNF"
                            : result.position != null
                            ? `P${result.position}`
                            : "—"}
                        </span>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => onSelectDriver(r.number)}
                    className="mt-1 rounded bg-[#4c6fff] hover:bg-[#3a5ae8] text-white py-1.5 font-pixel-body text-xs"
                  >
                    ⛶ Show on map
                  </button>
                </div>
              )}
            </div>
          );
        })}
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
