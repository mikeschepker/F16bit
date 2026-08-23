import type { RaceListing } from "./races";

export interface RaceYearGroup {
  year: number;
  races: RaceListing[];
}

// Assumes `races` is already sorted so same-year entries are contiguous
// (lib/races.ts sorts newest-first, which satisfies this).
export function groupRacesByYear(races: RaceListing[]): RaceYearGroup[] {
  const groups: RaceYearGroup[] = [];
  for (const race of races) {
    const last = groups[groups.length - 1];
    if (last && last.year === race.year) {
      last.races.push(race);
    } else {
      groups.push({ year: race.year, races: [race] });
    }
  }
  return groups;
}
