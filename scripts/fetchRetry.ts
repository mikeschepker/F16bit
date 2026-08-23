// Shared fetch-with-retry for OpenF1 API calls. Retries both rate limiting
// (429) and transient network failures (timeouts, resets, DNS blips) — a
// long ingestion run makes hundreds of requests, and both kinds of failure
// show up often enough over that many calls to be worth handling rather than
// letting one blip kill an otherwise-successful run.
export async function fetchJSON<T>(url: string, retries = 5, backoffMs = 5000): Promise<T> {
  try {
    const res = await fetch(url);
    if (res.status === 429) throw new Error("rate limited (429)");
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
    return (await res.json()) as T;
  } catch (err) {
    if (retries <= 0) throw err;
    const message = err instanceof Error ? err.message : String(err);
    console.log(`  ${message} — retrying in ${backoffMs}ms (${retries} left)...`);
    await new Promise((resolve) => setTimeout(resolve, backoffMs));
    return fetchJSON<T>(url, retries - 1, backoffMs);
  }
}
