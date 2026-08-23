"use client";

import { useState } from "react";
import Link from "next/link";
import type { RaceListing } from "@/lib/races";
import { groupRacesByYear } from "@/lib/groupRaces";

export default function RaceCalendar({ races }: { races: RaceListing[] }) {
  const groups = groupRacesByYear(races);
  const [expanded, setExpanded] = useState<Set<number>>(
    () => new Set(groups.length ? [groups[0].year] : [])
  );

  function toggle(year: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }

  return (
    <div className="w-full max-w-2xl flex flex-col gap-6">
      {groups.map(({ year, races: yearRaces }) => {
        const isOpen = expanded.has(year);
        return (
          <div key={year}>
            <button
              onClick={() => toggle(year)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between rounded-lg border-4 border-[#2a3554] bg-[#0c1220] px-5 py-4 shadow-[0_0_0_2px_#000] hover:border-[#4c6fff] transition-colors"
            >
              <span className="font-pixel-heading text-lg text-white">{year}</span>
              <span className="flex items-center gap-3">
                <span className="text-[#8fa2c8] text-base">
                  {yearRaces.length} race{yearRaces.length !== 1 ? "s" : ""}
                </span>
                <span className="font-pixel-heading text-xs text-[#4c6fff]">
                  {isOpen ? "▾" : "▸"}
                </span>
              </span>
            </button>

            {isOpen && (
              <div className="flex flex-col gap-4 mt-4">
                {yearRaces.map((race) => (
                  <Link
                    key={race.slug}
                    href={`/race/${race.slug}`}
                    className="group block rounded-lg border-4 border-[#2a3554] bg-[#0c1220] p-5 shadow-[0_0_0_2px_#000] hover:border-[#4c6fff] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex flex-col gap-1 min-w-0">
                        <span className="text-[10px] uppercase tracking-widest text-[#4c6fff]">
                          {race.round} &middot; {race.year}
                        </span>
                        <span className="font-pixel-heading text-sm text-white leading-relaxed">
                          {race.name}
                        </span>
                        <span className="text-[#8fa2c8] text-base truncate">
                          {race.subtitle}
                        </span>
                      </div>
                      <span className="shrink-0 font-pixel-heading text-[10px] text-[#4c6fff] group-hover:translate-x-1 transition-transform">
                        WATCH ▶
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
