// Maps OpenF1's circuit_short_name (stable across years, unique per venue —
// unlike its `location`/city field, which isn't: Monaco reports "Monte
// Carlo" in 2026 but "Monaco" in 2025) to the args ingest-race.ts needs and
// the slug key used for this site. Single source of truth for slugs, so
// manual and automated ingestion runs always agree on naming. Extend this as
// new circuits join the calendar; sync-new-races.ts skips (and logs) any
// circuit it doesn't recognize rather than guessing.

export interface CircuitEntry {
  key: string;
  country: string;
}

export const CIRCUITS: Record<string, CircuitEntry> = {
  Melbourne: { key: "australia", country: "Australia" },
  Shanghai: { key: "china", country: "China" },
  Suzuka: { key: "japan", country: "Japan" },
  Sakhir: { key: "bahrain", country: "Bahrain" },
  Jeddah: { key: "saudi-arabia", country: "Saudi Arabia" },
  Miami: { key: "miami", country: "United States" },
  Montreal: { key: "canada", country: "Canada" },
  "Monte Carlo": { key: "monaco", country: "Monaco" },
  Catalunya: { key: "spain", country: "Spain" },
  Spielberg: { key: "austria", country: "Austria" },
  Silverstone: { key: "britain", country: "United Kingdom" },
  "Spa-Francorchamps": { key: "belgium", country: "Belgium" },
  Hungaroring: { key: "hungary", country: "Hungary" },
  Zandvoort: { key: "netherlands", country: "Netherlands" },
  Monza: { key: "italy", country: "Italy" },
  Imola: { key: "imola", country: "Italy" },
  Madring: { key: "madrid", country: "Spain" },
  Baku: { key: "azerbaijan", country: "Azerbaijan" },
  "Kuala Lumpur": { key: "kualalumpur", country: "Bahrain" },
  Singapore: { key: "singapore", country: "Singapore" },
  Austin: { key: "austin", country: "United States" },
  "Mexico City": { key: "mexico", country: "Mexico" },
  Interlagos: { key: "brazil", country: "Brazil" },
  "Las Vegas": { key: "vegas", country: "United States" },
  Lusail: { key: "qatar", country: "Qatar" },
  "Yas Marina Circuit": { key: "abudhabi", country: "United Arab Emirates" },
};
