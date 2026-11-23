// Seeded RNG primitive for reproducible runs (competitive layer, Task 1).
// nextRandom advances a caller-owned state object by one mulberry32 step;
// seedFromString maps a string (e.g. a daily seed key) to an unsigned int32.

export function nextRandom(s: { rngState?: number }): number {
  const a = ((s.rngState ?? 0) + 0x6D2B79F5) >>> 0;
  s.rngState = a;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
