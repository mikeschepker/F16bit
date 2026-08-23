export interface RaceListing {
  slug: string;
  name: string;
  subtitle: string;
  year: number;
  round: string;
}

// Add more races here after running `npm run ingest -- --year Y --country C --slug S`.
export const RACES: RaceListing[] = [
  {
    slug: "2024-brazil",
    name: "Brazilian Grand Prix",
    subtitle: "Interlagos — Verstappen's rain-soaked drive from P17 to P1",
    year: 2024,
    round: "Round 21",
  },
  {
    slug: "2026-australia",
    name: "Australian Grand Prix",
    subtitle: "Melbourne — winner: G RUSSELL",
    year: 2026,
    round: "Mar 8",
  },
  {
    slug: "2026-china",
    name: "Chinese Grand Prix",
    subtitle: "Shanghai — winner: K ANTONELLI",
    year: 2026,
    round: "Mar 15",
  },
  {
    slug: "2026-japan",
    name: "Japanese Grand Prix",
    subtitle: "Suzuka — winner: K ANTONELLI",
    year: 2026,
    round: "Mar 29",
  },
  {
    slug: "2026-miami",
    name: "Miami Grand Prix",
    subtitle: "Miami — winner: K ANTONELLI",
    year: 2026,
    round: "May 3",
  },
  {
    slug: "2026-canada",
    name: "Canadian Grand Prix",
    subtitle: "Montreal — winner: K ANTONELLI",
    year: 2026,
    round: "May 24",
  },
  {
    slug: "2026-spain",
    name: "Barcelona Grand Prix",
    subtitle: "Catalunya — winner: L HAMILTON",
    year: 2026,
    round: "Jun 14",
  },
  {
    slug: "2026-austria",
    name: "Austrian Grand Prix",
    subtitle: "Spielberg — winner: G RUSSELL",
    year: 2026,
    round: "Jun 28",
  },
  {
    slug: "2026-britain",
    name: "British Grand Prix",
    subtitle: "Silverstone — winner: C LECLERC",
    year: 2026,
    round: "Jul 5",
  },
  {
    slug: "2026-belgium",
    name: "Belgian Grand Prix",
    subtitle: "Spa-Francorchamps — winner: K ANTONELLI",
    year: 2026,
    round: "Jul 19",
  },
  {
    slug: "2026-hungary",
    name: "Hungarian Grand Prix",
    subtitle: "Hungaroring — winner: L NORRIS",
    year: 2026,
    round: "Jul 26",
  },
];

// 2026-monaco was ingested but is intentionally left out of the list above:
// OpenF1's location telemetry for that session only covers ~6.5 minutes of
// the race (an upstream data gap), which isn't enough for a real replay.
