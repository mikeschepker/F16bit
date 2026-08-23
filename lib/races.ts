import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { SessionInfo, Driver, ResultsData } from "./types";

export interface RaceListing {
  slug: string;
  name: string;
  subtitle: string;
  year: number;
  round: string;
}

const RACES_DIR = path.join(process.cwd(), "public", "data", "races");

// A race needs at least this much car-position telemetry to be worth
// watching. OpenF1 occasionally has a gap in a session's location data (e.g.
// 2026 Monaco only has ~6.5 min of it for a 2-hour race) — rather than
// maintain a manual exclusion list, any race that thin is just left off the
// list automatically. The data still lives on disk in case OpenF1 backfills
// it later; re-running the app picks it up with no code change needed.
const MIN_DURATION_SECONDS = 30 * 60;

// Hand-curated subtitles for races worth a better line than the generic
// "circuit — winner: X" (keyed by slug). Everything else falls back to the
// generic form, generated straight from the ingested data.
const SUBTITLE_OVERRIDES: Record<string, string> = {
  "2024-brazil": "Interlagos — Verstappen's rain-soaked drive from P17 to P1",
};

function loadRace(slug: string): RaceListing | null {
  const dir = path.join(RACES_DIR, slug);
  const sessionFile = path.join(dir, "session.json");
  if (!existsSync(sessionFile)) return null;

  const session: SessionInfo = JSON.parse(readFileSync(sessionFile, "utf-8"));
  if (session.durationSeconds < MIN_DURATION_SECONDS) return null;

  const drivers: Driver[] = JSON.parse(readFileSync(path.join(dir, "drivers.json"), "utf-8"));
  const results: ResultsData = JSON.parse(readFileSync(path.join(dir, "results.json"), "utf-8"));

  const winnerNumber = Object.entries(results).find(([, r]) => r.position === 1)?.[0];
  const winner = winnerNumber ? drivers.find((d) => String(d.number) === winnerNumber) : undefined;

  return {
    slug,
    name: session.meetingName,
    subtitle:
      SUBTITLE_OVERRIDES[slug] ??
      `${session.circuitShortName} — winner: ${winner ? winner.name : "unknown"}`,
    year: session.year,
    round: new Date(session.raceStart).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
  };
}

function loadRaces(): RaceListing[] {
  if (!existsSync(RACES_DIR)) return [];

  const withDates = readdirSync(RACES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .map((slug) => {
      const race = loadRace(slug);
      if (!race) return null;
      const sessionFile = path.join(RACES_DIR, slug, "session.json");
      const session: SessionInfo = JSON.parse(readFileSync(sessionFile, "utf-8"));
      return { race, raceStart: session.raceStart };
    })
    .filter((r): r is { race: RaceListing; raceStart: string } => r !== null);

  withDates.sort((a, b) => new Date(b.raceStart).getTime() - new Date(a.raceStart).getTime());
  return withDates.map((r) => r.race);
}

export const RACES: RaceListing[] = loadRaces();
