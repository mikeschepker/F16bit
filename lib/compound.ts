export const COMPOUND_STYLE: Record<string, { label: string; color: string }> = {
  SOFT: { label: "S", color: "#e8002d" },
  MEDIUM: { label: "M", color: "#ffd12e" },
  HARD: { label: "H", color: "#f0f0f0" },
  INTERMEDIATE: { label: "I", color: "#3aa832" },
  WET: { label: "W", color: "#3378d1" },
};

export function compoundStyle(compound: string | undefined) {
  return compound ? COMPOUND_STYLE[compound] ?? { label: "?", color: "#888" } : null;
}
