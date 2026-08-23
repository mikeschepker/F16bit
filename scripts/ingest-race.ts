// Pulls one race session from the OpenF1 API (free/historical tier) and writes
// compact, normalized JSON into public/data/races/<slug>/ for the app to read
// statically at runtime. Run with: npm run ingest -- --year 2024 --country Brazil --slug 2024-brazil
//
// OpenF1 docs: https://openf1.org/docs/ (free tier = historical data only, 2023+)

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJSON<T>(url: string, retries = 5): Promise<T> {
  const res = await fetch(url);
  if (res.status === 429 && retries > 0) {
    const waitMs = 5000;
    console.log(`  rate limited, waiting ${waitMs}ms...`);
    await sleep(waitMs);
    return fetchJSON<T>(url, retries - 1);
  }
  if (!res.ok) {
    throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
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

  console.log(`Resolving Race session for ${country} ${year}...`);
  const sessions = await fetchJSON<RawSession[]>(
    `${API}/sessions?year=${encodeURIComponent(year)}&country_name=${encodeURIComponent(
      country
    )}&session_type=Race`
  );
  // Sprint weekends also report session_type=Race for the sprint itself;
  // the main event is session_name === "Race".
  const session = sessions.find((s) => s.session_name === "Race");
  if (!session) throw new Error(`No Race session found for ${country} ${year}`);
  console.log(
    `Found session_key=${session.session_key} (${session.circuit_short_name}, ${session.date_start})`
  );

  const sessionKey = session.session_key;

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
  let allTrackCandidatePoints: { t: number; x: number; y: number }[] | null = null;
  const trackDriverNumber = drivers[0]?.driver_number;

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
      t.push(Math.round(toSeconds(row.date, raceStartMs) * 100) / 100);
      x.push(row.x);
      y.push(row.y);
    }
    positionsOut[d.driver_number] = { t, x, y };
    if (d.driver_number === trackDriverNumber) {
      allTrackCandidatePoints = t.map((tt, i) => ({ t: tt, x: x[i], y: y[i] }));
    }
    console.log(`  #${d.driver_number} ${d.name_acronym}: ${loc.length} raw -> ${t.length} valid points`);
    await sleep(2100); // free tier: 30 req/min average
  }

  // --- derive track outline from one clean racing lap ---
  const driverLaps = laps
    .filter((l) => l.driver_number === trackDriverNumber && !l.is_pit_out_lap && l.date_start && l.lap_duration)
    .sort((a, b) => (a.lap_number ?? 0) - (b.lap_number ?? 0));
  // Prefer a lap somewhere in the middle of the race (avoids formation/safety-car laps).
  const midLap = driverLaps[Math.floor(driverLaps.length / 2)] ?? driverLaps[0];
  if (!midLap || !allTrackCandidatePoints) {
    throw new Error("Could not find a clean lap to derive the track outline from");
  }
  const lapStartMs = new Date(midLap.date_start as string).getTime();
  const lapEndMs = lapStartMs + (midLap.lap_duration as number) * 1000;
  const lapPoints = allTrackCandidatePoints.filter((p) => {
    const ms = raceStartMs + p.t * 1000;
    return ms >= lapStartMs && ms <= lapEndMs;
  });
  const trackPointsRaw: [number, number][] = decimate(lapPoints, 400).map((p) => [p.x, p.y]);
  const xs = trackPointsRaw.map((p) => p[0]);
  const ys = trackPointsRaw.map((p) => p[1]);
  const track: OutTrack = {
    points: trackPointsRaw,
    bounds: { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) },
  };
  console.log(`Derived track outline from lap ${midLap.lap_number} of driver #${trackDriverNumber}: ${track.points.length} points`);

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
    meetingName: `${session.country_name} Grand Prix`,
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
