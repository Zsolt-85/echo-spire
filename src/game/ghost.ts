// Ghost trace recorder and playback (competitive layer). Traces are sampled on
// SIM time (s.timeS * 1000), never wall clock, so x1/x2/x4 playback stays
// aligned. Types are owned by state.js and re-exported here for consumers.
import type { GameState, GhostTrace, TraceSample } from './state.js';
import { GHOST_SAMPLE_MS, GHOST_MAX_BYTES } from '../sim/balance.js';

export type { TraceSample, GhostTrace } from './state.js';

// Canonical rounding for a stored sample: times/damage are integral, hull
// fraction keeps 3 decimals, wave/kills pass through (already integral).
function roundSample(s: TraceSample): TraceSample {
  return [Math.round(s[0]), s[1], +s[2].toFixed(3), Math.round(s[3]), s[4]];
}

export function startTrace(runId: string, seed: number): GhostTrace {
  return { v: 1, runId, seed, samples: [], finalWave: 0, finalKills: 0, durationMs: 0 };
}

export function sampleTrace(trace: GhostTrace, s: GameState, force = false): void {
  const tMs = (s.timeS ?? 0) * 1000;
  const ss = trace.samples;
  const lastMs = ss.length ? ss[ss.length - 1][0] : -Infinity;
  if (!force && tMs - lastMs < GHOST_SAMPLE_MS) return;
  const hullFrac = s.maxHull > 0 ? s.hull / s.maxHull : 0;
  ss.push([Math.round(tMs), s.wave, +hullFrac.toFixed(3), Math.round(s.dmg), s.kills ?? 0]);
  // Keep the run's terminal fields current so a forced final sample completes
  // the record for later rendering/upload tasks.
  trace.finalWave = s.wave;
  trace.finalKills = s.kills ?? 0;
  trace.durationMs = Math.round(tMs);
}

export function ghostAt(
  trace: GhostTrace,
  tMs: number,
): { wave: number; hullFrac: number; dmg: number; kills: number } | null {
  const ss = trace.samples;
  if (!ss.length) return null;
  const first = ss[0];
  const last = ss[ss.length - 1];
  if (tMs < first[0] || tMs > last[0]) return null;
  let a = first;
  let b = last;
  for (let i = 1; i < ss.length; i++) {
    if (ss[i][0] >= tMs) { a = ss[i - 1]; b = ss[i]; break; }
  }
  const u = b[0] === a[0] ? 0 : (tMs - a[0]) / (b[0] - a[0]);
  const lerp = (x: number, y: number): number => +(x + (y - x) * u).toFixed(2);
  return { wave: lerp(a[1], b[1]), hullFrac: lerp(a[2], b[2]), dmg: lerp(a[3], b[3]), kills: lerp(a[4], b[4]) };
}

export function encodeTrace(trace: GhostTrace): string {
  return JSON.stringify({
    v: 1,
    runId: trace.runId,
    seed: trace.seed,
    samples: trace.samples.map(roundSample),
    finalWave: trace.finalWave,
    finalKills: trace.finalKills,
    durationMs: trace.durationMs,
  });
}

export function decodeTrace(raw: string): GhostTrace | null {
  try {
    if (typeof raw !== 'string' || raw.length > GHOST_MAX_BYTES) return null;
    const obj = JSON.parse(raw) as Partial<GhostTrace> | null;
    if (!obj || obj.v !== 1 || !Array.isArray(obj.samples)) return null;
    const samples: TraceSample[] = [];
    for (const smp of obj.samples) {
      if (!Array.isArray(smp) || smp.length !== 5 ||
          smp.some(n => typeof n !== 'number' || !Number.isFinite(n))) return null;
      samples.push(roundSample(smp as TraceSample));
    }
    return {
      v: 1,
      runId: typeof obj.runId === 'string' ? obj.runId : '',
      seed: typeof obj.seed === 'number' ? obj.seed : 0,
      samples,
      finalWave: typeof obj.finalWave === 'number' ? obj.finalWave : 0,
      finalKills: typeof obj.finalKills === 'number' ? obj.finalKills : 0,
      durationMs: typeof obj.durationMs === 'number' ? obj.durationMs : 0,
    };
  } catch {
    return null;
  }
}
