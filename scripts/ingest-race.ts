// Pulls one race session from the OpenF1 API (free/historical tier) and writes
// compact, normalized JSON into public/data/races/<slug>/ for the app to read
// statically at runtime. Run with: npm run ingest -- --year 2024 --country Brazil --slug 2024-brazil
//
// OpenF1 docs: https://openf1.org/docs/ (free tier = historical data only, 2023+)

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fetchJSON } from "./fetchRetry";

const API = "https://api.openf1.org/v1";

function arg(name: string, fallback?: string): string {
  const i = process.argv.indexOf(`--${name}`);
  const v = i !== -1 ? process.argv[i + 1] : undefined;
  if (!v) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required --${name} argument`);
  }
  return v;
}

function optionalArg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- OpenF1 raw shapes (only the fields we use) ---

interface RawSession {
  session_key: number;
  meeting_key: number;
  session_type: string;
  session_name: string;
  date_start: string;
  date_end: string;
  location: string;
  country_name: string;
  circuit_short_name: string;
  year: number;
}

interface RawDriver {
  driver_number: number;
  name_acronym: string;
  broadcast_name: string;
  team_name: string;
  team_colour: string;
}

interface RawLocation {
  date: string;
  driver_number: number;
  x: number;
  y: number;
  z: number;
}

interface RawPosition {
  date: string;
  driver_number: number;
  position: number;
}

interface RawInterval {
  date: string;
  driver_number: number;
  gap_to_leader: number | string | null;
  interval: number | string | null;
}

interface RawLap {
  driver_number: number;
  lap_number: number;
  date_start: string | null;
  lap_duration: number | null;
  is_pit_out_lap: boolean;
}

interface RawStint {
  driver_number: number;
  stint_number: number;
  lap_start: number;
  lap_end: number;
  compound: string;
}

interface RawMeeting {
  meeting_key: number;
  meeting_name: string;
}

interface RawSessionResult {
  driver_number: number;
  position: number | null;
  number_of_laps: number;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
}

// --- output shapes ---

interface OutDriver {
  number: number;
  code: string;
  name: string;
  team: string;
  teamColor: string;
}

interface OutTrack {
  points: [number, number][];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

interface OutPositions {
  [driverNumber: string]: { t: number[]; x: number[]; y: number[] };
}

interface OutTiming {
  [driverNumber: string]: {
    position: { t: number; value: number }[];
    gap: { t: number; value: number | null }[];
    laps: { t: number; lapNumber: number; lapDuration: number | null }[];
    stints: { lapStart: number; lapEnd: number; compound: string }[];
  };
}

interface OutSession {
  slug: string;
  meetingName: string;
  location: string;
  countryName: string;
  circuitShortName: string;
  year: number;
  raceStart: string; // ISO, t=0 reference
  durationSeconds: number;
  totalLaps: number;
}

interface OutResults {
  [driverNumber: string]: {
    position: number | null;
    laps: number;
    dnf: boolean;
    dns: boolean;
    dsq: boolean;
  };
}

function toSeconds(iso: string, refMs: number): number {
  return (new Date(iso).getTime() - refMs) / 1000;
}

// Simple decimation-based simplification: keep every Nth point so the track
// polyline is light to render but still traces the real circuit shape.
function decimate<T>(arr: T[], targetCount: number): T[] {
  if (arr.length <= targetCount) return arr;
  const step = arr.length / targetCount;
  const out: T[] = [];
  for (let i = 0; i < targetCount; i++) {
    out.push(arr[Math.floor(i * step)]);
  }
  return out;
}

async function main() {
  const year = arg("year", "2024");
  const country = arg("country", "Brazil");
  const slug = arg("slug", "2024-brazil");
  // Disambiguates countries that host more than one race in a season (e.g.
  // USA: Miami/Austin/Las Vegas; Spain: Catalunya/Madring). Matched against
  // circuit_short_name, NOT `location` — OpenF1's `location` (city) field
  // for the same circuit isn't stable across years (Monaco 2026 reports
  // "Monte Carlo", 2025 reports "Monaco"), but circuit_short_name is.
  const circuit = optionalArg("circuit");

  console.log(`Resolving Race session for ${country} ${year}${circuit ? ` (${circuit})` : ""}...`);
  const sessions = await fetchJSON<RawSession[]>(
    `${API}/sessions?year=${encodeURIComponent(year)}&country_name=${encodeURIComponent(
      country
    )}&session_type=Race`
  );
  // Sprint weekends also report session_type=Race for the sprint itself;
  // the main event is session_name === "Race".
  const session = sessions.find(
    (s) => s.session_name === "Race" && (!circuit || s.circuit_short_name === circuit)
  );
  if (!session) throw new Error(`No Race session found for ${country} ${year}${circuit ? ` / ${circuit}` : ""}`);
  console.log(
    `Found session_key=${session.session_key} (${session.circuit_short_name}, ${session.date_start})`
  );

  const sessionKey = session.session_key;

  const [meeting] = await fetchJSON<RawMeeting[]>(`${API}/meetings?meeting_key=${session.meeting_key}`);
  await sleep(2100); // free tier: 30 req/min average

  console.log("Fetching drivers, position, intervals, laps, stints, session_result...");
  const drivers = await fetchJSON<RawDriver[]>(`${API}/drivers?session_key=${sessionKey}`);
  await sleep(2100); // free tier: 30 req/min average
  const positions = await fetchJSON<RawPosition[]>(`${API}/position?session_key=${sessionKey}`);
  await sleep(2100); // free tier: 30 req/min average
  const intervals = await fetchJSON<RawInterval[]>(`${API}/intervals?session_key=${sessionKey}`);
  await sleep(2100); // free tier: 30 req/min average
  const laps = await fetchJSON<RawLap[]>(`${API}/laps?session_key=${sessionKey}`);
  await sleep(2100); // free tier: 30 req/min average
  const stints = await fetchJSON<RawStint[]>(`${API}/stints?session_key=${sessionKey}`);
  await sleep(2100); // free tier: 30 req/min average
  const results = await fetchJSON<RawSessionResult[]>(`${API}/session_result?session_key=${sessionKey}`);
  await sleep(2100); // free tier: 30 req/min average

  // Race start (t=0) = earliest lap_number=1 date_start across drivers (i.e. actual
  // lights-out), not the scheduled session date_start, which can be well before a
  // delayed start.
  const lap1Starts = laps
    .filter((l) => l.lap_number === 1 && l.date_start)
    .map((l) => new Date(l.date_start as string).getTime());
  const raceStartMs = lap1Starts.length ? Math.min(...lap1Starts) : new Date(session.date_start).getTime();

  console.log(
    `Fetching location data for ${drivers.length} drivers (one request each, paced for rate limits)...`
  );
  const positionsOut: OutPositions = {};

  for (const d of drivers) {
    const loc = await fetchJSON<RawLocation[]>(
      `${API}/location?session_key=${sessionKey}&driver_number=${d.driver_number}`
    );
    const t: number[] = [];
    const x: number[] = [];
    const y: number[] = [];
    for (const row of loc) {
      // OpenF1 emits (0,0,0) sentinel rows before a car's telemetry is live; drop them.
      if (row.x === 0 && row.y === 0 && row.z === 0) continue;
      // Some sessions have an x/y update rate much slower than the row/timestamp
      // rate (seen in 2026 Hungary: x,y held constant for up to ~4.6s across many
      // rows while only z/date changed, 73% of rows were exact x,y duplicates).
      // Collapsing those runs to one point at the run's start time keeps the
      // array free of redundant samples, and — more importantly — means every
      // pair of *consecutive* points always has a real position change, so the
      // heading calculated between them (atan2 of the delta) is never garbage
      // from a same-point (0,0) delta.
      const lastX = x[x.length - 1];
      const lastY = y[y.length - 1];
      if (row.x === lastX && row.y === lastY) continue;
      t.push(Math.round(toSeconds(row.date, raceStartMs) * 100) / 100);
      x.push(row.x);
      y.push(row.y);
    }
    positionsOut[d.driver_number] = { t, x, y };
    console.log(`  #${d.driver_number} ${d.name_acronym}: ${loc.length} raw -> ${t.length} valid points`);
    await sleep(2100); // free tier: 30 req/min average
  }

  // --- derive track outline from one clean racing lap ---
  // Try drivers in order of most location samples first (a driver who DNS'd or
  // crashed early, like `drivers[0]` isn't guaranteed to be, may have no laps
  // recorded at all), and pick the first one with a usable mid-race lap.
  const candidateOrder = [...drivers].sort(
    (a, b) => (positionsOut[b.driver_number]?.t.length ?? 0) - (positionsOut[a.driver_number]?.t.length ?? 0)
  );
  let track: OutTrack | null = null;
  outer: for (const candidate of candidateOrder) {
    const trackDriverNumber = candidate.driver_number;
    const driverLaps = laps
      .filter((l) => l.driver_number === trackDriverNumber && !l.is_pit_out_lap && l.date_start && l.lap_duration)
      .sort((a, b) => (a.lap_number ?? 0) - (b.lap_number ?? 0));
    if (!driverLaps.length) continue;

    // Try laps ordered by closeness to the middle of the race first (avoids
    // formation/safety-car laps), but fall back to any lap with enough location
    // coverage — some sessions only have telemetry for part of the race (e.g. a
    // gap in what OpenF1 archived), so a "middle" lap can fall in a dead zone
    // while an earlier/later lap is fine.
    const midIdx = Math.floor(driverLaps.length / 2);
    const byCloseness = [...driverLaps].sort(
      (a, b) => Math.abs(driverLaps.indexOf(a) - midIdx) - Math.abs(driverLaps.indexOf(b) - midIdx)
    );

    const candidatePoints = positionsOut[trackDriverNumber];
    const allPointsForDriver = candidatePoints.t.map((tt, i) => ({
      t: tt,
      x: candidatePoints.x[i],
      y: candidatePoints.y[i],
    }));

    for (const lap of byCloseness) {
      const lapStartMs = new Date(lap.date_start as string).getTime();
      const lapDurationMs = (lap.lap_duration as number) * 1000;

      // A single lap's worth of samples is sometimes too sparse to trace a
      // recognizable track shape — some sessions have an x/y update rate far
      // slower than usual (2026 Hungary: as little as ~20 distinct points for
      // an 85s lap). Widen the window by additional laps' worth of time until
      // there's enough, since consecutive laps retrace the same physical path.
      let lapEndMs = lapStartMs + lapDurationMs;
      let lapPoints: { t: number; x: number; y: number }[] = [];
      for (let extensions = 0; extensions <= 6; extensions++) {
        lapPoints = allPointsForDriver.filter((p) => {
          const ms = raceStartMs + p.t * 1000;
          return ms >= lapStartMs && ms <= lapEndMs;
        });
        if (lapPoints.length >= 150) break;
        lapEndMs += lapDurationMs;
      }
      if (lapPoints.length < 20) continue; // too sparse to trust as a track outline

      const trackPointsRaw: [number, number][] = decimate(lapPoints, 400).map((p) => [p.x, p.y]);
      const xs = trackPointsRaw.map((p) => p[0]);
      const ys = trackPointsRaw.map((p) => p[1]);
      track = {
        points: trackPointsRaw,
        bounds: { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) },
      };
      console.log(
        `Derived track outline from lap ${lap.lap_number} of driver #${trackDriverNumber}: ${track.points.length} points`
      );
      break outer;
    }
  }
  if (!track) {
    throw new Error("Could not find a clean lap to derive the track outline from (tried all drivers/laps)");
  }

  // --- timing (position / gap / laps / stints) ---
  const timingOut: OutTiming = {};
  for (const d of drivers) {
    const dn = d.driver_number;
    timingOut[dn] = {
      position: positions
        .filter((p) => p.driver_number === dn)
        .map((p) => ({ t: toSeconds(p.date, raceStartMs), value: p.position })),
      gap: intervals
        .filter((i) => i.driver_number === dn)
        .map((i) => ({
          t: toSeconds(i.date, raceStartMs),
          value: typeof i.gap_to_leader === "number" ? i.gap_to_leader : null,
        })),
      laps: laps
        .filter((l) => l.driver_number === dn && l.date_start)
        .map((l) => ({
          t: toSeconds(l.date_start as string, raceStartMs),
          lapNumber: l.lap_number,
          lapDuration: l.lap_duration,
        })),
      stints: stints
        .filter((s) => s.driver_number === dn)
        .map((s) => ({ lapStart: s.lap_start, lapEnd: s.lap_end, compound: s.compound })),
    };
  }

  // --- overall session duration (t range) ---
  let maxT = 0;
  for (const dn of Object.keys(positionsOut)) {
    const arr = positionsOut[dn].t;
    if (arr.length) maxT = Math.max(maxT, arr[arr.length - 1]);
  }

  const driversOut: OutDriver[] = drivers.map((d) => ({
    number: d.driver_number,
    code: d.name_acronym,
    name: d.broadcast_name,
    team: d.team_name,
    teamColor: `#${d.team_colour}`,
  }));

  const resultsOut: OutResults = {};
  for (const r of results) {
    resultsOut[r.driver_number] = {
      position: r.position,
      laps: r.number_of_laps,
      dnf: r.dnf,
      dns: r.dns,
      dsq: r.dsq,
    };
  }

  const sessionOut: OutSession = {
    slug,
    meetingName: meeting?.meeting_name ?? `${session.country_name} Grand Prix`,
    location: session.location,
    countryName: session.country_name,
    circuitShortName: session.circuit_short_name,
    year: session.year,
    raceStart: new Date(raceStartMs).toISOString(),
    durationSeconds: Math.ceil(maxT),
    totalLaps: Math.max(...laps.map((l) => l.lap_number)),
  };

  const outDir = path.join(process.cwd(), "public", "data", "races", slug);
  await mkdir(outDir, { recursive: true });
  await Promise.all([
    writeFile(path.join(outDir, "session.json"), JSON.stringify(sessionOut)),
    writeFile(path.join(outDir, "drivers.json"), JSON.stringify(driversOut)),
    writeFile(path.join(outDir, "track.json"), JSON.stringify(track)),
    writeFile(path.join(outDir, "positions.json"), JSON.stringify(positionsOut)),
    writeFile(path.join(outDir, "timing.json"), JSON.stringify(timingOut)),
    writeFile(path.join(outDir, "results.json"), JSON.stringify(resultsOut)),
  ]);

  console.log(`\nWrote race data to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
