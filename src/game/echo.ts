// Echo ghost mothership (spec §3.5 v1): single translucent echo dealing
// 15% of the recorded best-cycle DPS.
export function echoDps(recorded: number): number {
  return Math.round(recorded * 0.15);
}
