// Lab infinite research (spec §3.3): fractional power gain per level,
// real-time cost t = 60 * 1.6^level seconds (continues offline, capped 12h).
export function labGain(level: number): number {
  return level * 0.08;
}
export function labTime(level: number): number {
  return Math.round(60 * Math.pow(1.6, level));
}
