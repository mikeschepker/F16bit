// Prints a suggested lib/races.ts entry for an already-ingested race, using
// the actual result (winner) rather than a guessed/fabricated storyline.
// Run with: npx tsx scripts/race-summary.ts <slug>

import { readFile } from "node:fs/promises";
import path from "node:path";

async function main() {
  const slug = process.argv[2];
  if (!slug) throw new Error("Usage: tsx scripts/race-summary.ts <slug>");

  const dir = path.join(process.cwd(), "public", "data", "races", slug);
  const [session, drivers, results] = await Promise.all([
    readFile(path.join(dir, "session.json"), "utf-8").then(JSON.parse),
    readFile(path.join(dir, "drivers.json"), "utf-8").then(JSON.parse),
    readFile(path.join(dir, "results.json"), "utf-8").then(JSON.parse),
  ]);

  const winnerEntry = Object.entries(results as Record<string, { position: number | null }>).find(
    ([, r]) => r.position === 1
  );
  const winnerNumber = winnerEntry?.[0];
  const winner = drivers.find((d: { number: number }) => String(d.number) === winnerNumber);

  const date = new Date(session.raceStart).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  console.log(`  {
    slug: "${slug}",
    name: "${session.meetingName}",
    subtitle: "${session.circuitShortName} — winner: ${winner ? winner.name : "unknown"}",
    year: ${session.year},
    round: "${date}",
  },`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
