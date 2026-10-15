// Training Academy (spec §4): DOM-free idle research threads reusing the
// Lab time formula. Ticked in real time (main.ts interval + on load),
// 12h offline advance cap.
//
// Tower-style labs (tower-labs plan Task 1): the four legacy skills stay as
// research lines with identical effects (existing saves keep their levels);
// eight new lines in five categories join them. Tuning numbers live in
// src/sim/balance.ts (LAB_*); this file holds names/descs + mechanics.
import { TRAIN_TIME_BASE_S, TRAIN_TIME_GROWTH, TRAIN_OFFLINE_CAP_HRS, GUNNERY_PCT, THREAD_2_CMD, THREAD_3_CMD, THREAD_4_CMD, SPEED2_LOG, SPEED4_LOG, SPEED8_LOG, LAB_MIN_SECS, LAB_LINE_MAX, LAB_LINE_TIME_MULT, LAB_LINE_GATE, LAB_LINE_CAT, LAB_DEADEYE_PCT, LAB_BARRAGE_EVERY, LAB_PLATING_PCT, LAB_NANITES_FLAT, LAB_SALVAGE_PCT, LAB_SIPHON_PCT, LAB_BROKER_PCT, type LabCat } from '../sim/balance.js';
import type { GameState } from '../game/state.js';
export type Skill = 'gunnery' | 'logistics' | 'engineering' | 'command';
export const TRAIN_SKILLS: Skill[] = ['gunnery', 'logistics', 'engineering', 'command'];
export const THREADS = ['t0', 't1', 't2', 't3'] as const;
export type ThreadState = { skill: Skill; doneAt: number };
export function researchTime(level: number): number { return Math.round(TRAIN_TIME_BASE_S * Math.pow(TRAIN_TIME_GROWTH, level)); }
function store(s: GameState): { levels: Partial<Record<LineId, number>>; threads: Record<string, ThreadState> } {
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
// --- Research catalog: 4 legacy lines (identical effects) + 8 new lines ---
export type LineId = Skill | 'deadeye' | 'barrage' | 'plating' | 'nanites' | 'salvage' | 'siphon' | 'broker' | 'celerity';
export type LineDef = { cat: LabCat; name: string; desc: string; max: number; timeMult: number };
const LINE_TEXT: Record<LineId, { name: string; desc: string }> = {
  gunnery: { name: 'Gunnery', desc: '+2% damage per level.' },
  deadeye: { name: 'Deadeye', desc: '+0.3% crit chance per level. Best 60 to unlock.' },
  barrage: { name: 'Barrage', desc: '+1 volley point per 5 levels. Best 100 to unlock.' },
  plating: { name: 'Plating', desc: '+3% max hull per level.' },
  nanites: { name: 'Nanites', desc: '+0.4 hull regen/s per level.' },
  engineering: { name: 'Engineering', desc: 'Offline gains and auto-forge.' },
  salvage: { name: 'Salvage', desc: '+3% flux income per level.' },
  siphon: { name: 'Siphon', desc: '+3% essence income per level. Best 60 to unlock.' },
  broker: { name: 'Broker', desc: '-1% workshop core costs per level. Best 100 to unlock.' },
  logistics: { name: 'Logistics', desc: 'Speed x2/x4/x8 at levels 1/4/8.' },
  command: { name: 'Command', desc: 'Extra research threads and wave skip.' },
  celerity: { name: 'Celerity', desc: '+4% research speed per level. Best 150 to unlock.' },
};
function def(id: LineId): LineDef {
  return { cat: LAB_LINE_CAT[id] ?? 'mastery', name: LINE_TEXT[id].name, desc: LINE_TEXT[id].desc, max: LAB_LINE_MAX[id] ?? 0, timeMult: LAB_LINE_TIME_MULT[id] ?? 1 };
}
export const RESEARCH_LINES: Record<LineId, LineDef> = {
  gunnery: def('gunnery'), deadeye: def('deadeye'), barrage: def('barrage'),
  plating: def('plating'), nanites: def('nanites'), engineering: def('engineering'),
  salvage: def('salvage'), siphon: def('siphon'), broker: def('broker'),
  logistics: def('logistics'), command: def('command'), celerity: def('celerity'),
};
export function lineLevel(s: GameState, line: LineId): number { return store(s).levels[line] ?? 0; }
// Uniform core cost: 1 + floor(level/3) (same for every line).
export function researchCost(line: LineId, level: number): number { void line; return 1 + Math.floor(level / 3); }
export function lineResearchTime(line: LineId, level: number): number {
  const mult = RESEARCH_LINES[line]?.timeMult ?? 1;
  return Math.max(LAB_MIN_SECS, Math.round(researchTime(level) * mult));
}
export function lineUnlocked(s: GameState, line: LineId, bestWave = 0): boolean {
  const b = bestWave > 0 ? bestWave : ((s as unknown as { best?: number }).best ?? 0);
  return b >= (LAB_LINE_GATE[line] ?? 0);
}
export function labFluxMult(s: GameState): number { return 1 + LAB_SALVAGE_PCT * lineLevel(s, 'salvage'); }
export function labWorkshopCostMult(s: GameState): number { return Math.max(0, 1 - LAB_BROKER_PCT * lineLevel(s, 'broker')); }
// Fold line levels into combat fields. CALL ONLY immediately after
// applyWorkshop: gunnery/plating multiply the fresh workshop base, so a
// repeat call without applyWorkshop in between would compound.
export function applyLineEffects(s: GameState): void {
  const lv = (l: LineId) => lineLevel(s, l);
  const gun = lv('gunnery');
  if (gun > 0) s.dmg = Math.round(s.dmg * (1 + GUNNERY_PCT * gun));
  const eye = lv('deadeye');
  if (eye > 0) s.critCh = (s.critCh ?? 0) + LAB_DEADEYE_PCT * eye;
  const bar = lv('barrage');
  if (bar > 0) s.volley = (s.volley ?? 0) + Math.floor(bar / LAB_BARRAGE_EVERY);
  const pla = lv('plating');
  if (pla > 0) { s.maxHull = Math.round(s.maxHull * (1 + LAB_PLATING_PCT * pla)); if (s.hull > s.maxHull) s.hull = s.maxHull; }
  const nan = lv('nanites');
  if (nan > 0) s.regen = (s.regen ?? 0) + LAB_NANITES_FLAT * nan;
  (s as unknown as { _fluxMult?: number })._fluxMult = labFluxMult(s);
  const em = (s as unknown as { _essenceMult?: number })._essenceMult ?? 1;
  (s as unknown as { _essenceMult?: number })._essenceMult = em * (1 + LAB_SIPHON_PCT * lv('siphon'));
  // logistics/command/engineering/celerity apply at live read sites
  // (speedUnlocked, thread gates, auto-forge, offline) — no fold.
}
