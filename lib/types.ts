export interface Driver {
  number: number;
  code: string;
  name: string;
  team: string;
  teamColor: string;
}

export interface Track {
  points: [number, number][];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export interface DriverPositions {
  t: number[];
  x: number[];
  y: number[];
}

export type PositionsData = Record<string, DriverPositions>;

export interface TimingEvent<V> {
  t: number;
  value: V;
}

export interface LapEvent {
  t: number;
  lapNumber: number;
  lapDuration: number | null;
}

export interface StintEvent {
  lapStart: number;
  lapEnd: number;
  compound: string;
}

export interface DriverTiming {
  position: TimingEvent<number>[];
  gap: TimingEvent<number | null>[];
  laps: LapEvent[];
  stints: StintEvent[];
}

export type TimingData = Record<string, DriverTiming>;

export interface SessionInfo {
  slug: string;
  meetingName: string;
  location: string;
  countryName: string;
  circuitShortName: string;
  year: number;
  raceStart: string;
  durationSeconds: number;
  totalLaps: number;
}

export interface PitStop {
  lapNumber: number;
  duration: number | null;
}

export interface ResultEntry {
  position: number | null;
  gridPosition: number | null;
  laps: number;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
  pitStops: PitStop[];
}

export type ResultsData = Record<string, ResultEntry>;

export interface RaceData {
  session: SessionInfo;
  drivers: Driver[];
  track: Track;
  positions: PositionsData;
  timing: TimingData;
  results: ResultsData;
}
