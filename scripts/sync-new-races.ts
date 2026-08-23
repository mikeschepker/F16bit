// Checks OpenF1 for Race sessions that have finished since the last run and
// aren't ingested yet, and ingests them. Designed to run unattended on a
// schedule (see .github/workflows/sync-races.yml) — safe to run repeatedly:
// already-ingested races are skipped by checking for their data directory,
// and cancelled/not-yet-finished sessions are skipped too.
//
// Run with: npm run sync

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { CIRCUITS } from "./circuits";
import { fetchJSON } from "./fetchRetry";

const API = "https://api.openf1.org/v1";
// OpenF1's free tier serves a session as "historical" (fully available) from
// 30 min after it ends; wait a bit longer to be safe against late data.
const FINISHED_BUFFER_MS = 90 * 60 * 1000;

interface RawSession {
  circuit_short_name: string;
  country_name: string;
  date_end: string;
  is_cancelled: boolean;
}

async function checkYear(year: number): Promise<{ ingested: number; failed: number }> {
  console.log(`Checking ${year} season for newly-finished races...`);
  const sessions = await fetchJSON<RawSession[]>(`${API}/sessions?year=${year}&session_name=Race`);
  const now = Date.now();
  let ingested = 0;
  let failed = 0;

  for (const session of sessions) {
    if (session.is_cancelled) continue;
    if (new Date(session.date_end).getTime() + FINISHED_BUFFER_MS > now) continue; // not finished (long enough ago)

    const circuit = CIRCUITS[session.circuit_short_name];
    if (!circuit) {
      console.warn(
        `  Skipping unrecognized circuit "${session.circuit_short_name}" (${session.country_name}) — add it to scripts/circuits.ts`
      );
      continue;
    }

    const slug = `${year}-${circuit.key}`;
    const sessionFile = path.join(process.cwd(), "public", "data", "races", slug, "session.json");
    if (existsSync(sessionFile)) continue; // already ingested

    console.log(`  New race: ${slug} (${session.circuit_short_name}, ${session.country_name})`);
    try {
      execFileSync(
        "npm",
        [
          "run",
          "ingest",
          "--",
          "--year",
          String(year),
          "--country",
          circuit.country,
          "--circuit",
          session.circuit_short_name,
          "--slug",
          slug,
        ],
        { stdio: "inherit" }
      );
      ingested++;
    } catch (err) {
      // One bad session (a data quirk, a transient API error) shouldn't stop
      // every other race from being checked — especially in the scheduled
      // job, where leaving this un-caught would mean the exact same failure
      // blocks every subsequent race on every future run, forever.
      console.error(`  Failed to ingest ${slug}, skipping it for this run: ${err}`);
      failed++;
    }
  }

  return { ingested, failed };
}

async function main() {
  const currentYear = new Date().getUTCFullYear();
  // Also re-check last year in case a season finale just wrapped up around
  // the year boundary — cheap (one extra API call) and self-limiting, since
  // every race from a finished season will already be on disk.
  const previous = await checkYear(currentYear - 1);
  const current = await checkYear(currentYear);
  const ingested = previous.ingested + current.ingested;
  const failed = previous.failed + current.failed;

  console.log(ingested > 0 ? `\nIngested ${ingested} new race(s).` : "\nNo new races to ingest.");
  if (failed > 0) {
    console.log(`${failed} race(s) failed to ingest this run — see errors above; will retry next run.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
