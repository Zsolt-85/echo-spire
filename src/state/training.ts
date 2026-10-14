// Training Academy (spec §4): DOM-free idle research threads reusing the
// Lab time formula. Ticked in real time (main.ts interval + on load),
// 12h offline advance cap.
import { TRAIN_TIME_BASE_S, TRAIN_TIME_GROWTH, TRAIN_OFFLINE_CAP_HRS, GUNNERY_PCT, THREAD_2_CMD, THREAD_3_CMD, THREAD_4_CMD, SPEED2_LOG, SPEED4_LOG, SPEED8_LOG } from '../sim/balance.js';
import type { GameState } from '../game/state.js';
export type Skill = 'gunnery' | 'logistics' | 'engineering' | 'command';
export const TRAIN_SKILLS: Skill[] = ['gunnery', 'logistics', 'engineering', 'command'];
export const THREADS = ['t0', 't1', 't2', 't3'] as const;
export type ThreadState = { skill: Skill; doneAt: number };
export function researchTime(level: number): number { return Math.round(TRAIN_TIME_BASE_S * Math.pow(TRAIN_TIME_GROWTH, level)); }
function store(s: GameState): { levels: Partial<Record<Skill, number>>; threads: Record<string, ThreadState> } {
  const t = (s as any).training ?? ((s as any).training = { levels: {}, threads: {} });
  return t;
}
function threadUnlocked(s: GameState, thread: string): boolean {
  if (thread === 't0') return true;
  const cmd = trainingLevel(s, 'command');
  const need = thread === 't1' ? THREAD_2_CMD : thread === 't2' ? THREAD_3_CMD : THREAD_4_CMD;
  return cmd >= need;
}
export function startResearch(s: GameState, thread: string, skill: Skill, nowMs = Date.now()): boolean {
  const t = store(s);
  if (!THREADS.includes(thread as any) || !TRAIN_SKILLS.includes(skill)) return false;
  if (t.threads[thread] || !threadUnlocked(s, thread)) return false;
  t.threads[thread] = { skill, doneAt: nowMs + researchTime(trainingLevel(s, skill)) * 1000 };
  return true;
}
export function progressTraining(s: GameState, nowMs = Date.now()): void {
  const t = store(s);
  for (const id of Object.keys(t.threads)) {
    const r = t.threads[id];
    if (nowMs >= r.doneAt) { t.levels[r.skill] = (t.levels[r.skill] ?? 0) + 1; delete t.threads[id]; }
  }
}
export function advanceOffline(s: GameState, elapsedMs: number): void {
  progressTraining(s, Date.now() - Math.max(0, elapsedMs - TRAIN_OFFLINE_CAP_HRS * 3600e3));
}
export function trainingLevel(s: GameState, skill: Skill): number { return store(s).levels[skill] ?? 0; }
export function trainingMult(s: GameState): number { return 1 + GUNNERY_PCT * trainingLevel(s, 'gunnery'); }
export function speedUnlocked(s: GameState): 1 | 2 | 4 | 8 {
  const l = trainingLevel(s, 'logistics');
  return l >= SPEED8_LOG ? 8 : l >= SPEED4_LOG ? 4 : l >= SPEED2_LOG ? 2 : 1;
}
