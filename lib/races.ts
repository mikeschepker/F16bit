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
];
