// Training Academy (spec §4): DOM-free idle research threads reusing the
// Lab time formula. Ticked in real time (main.ts interval + on load),
// 12h offline advance cap.
//
// Tower-style labs (tower-labs plan Task 1): the four legacy skills stay as
// research lines with identical effects (existing saves keep their levels);
// eight new lines in five categories join them. Tuning numbers live in
// src/sim/balance.ts (LAB_*); this file holds names/descs + mechanics.
//
// Task 2 slot mechanics: switching banks invested time (cores are sunk —
// resume costs cores again and re-checks affordability), auto-research
// chains the next level while affordable, celerity multiplies research
// speed, completions append to a capped history. Mid-run completions apply
// effects INCREMENTALLY (applyLineDelta): applyLineEffects is only valid
// immediately after applyWorkshop (see recomputeStats in workshop.ts), so
// progressTraining must never call it wholesale — that would compound
// gunnery/plating.
import { TRAIN_TIME_BASE_S, TRAIN_TIME_GROWTH, TRAIN_OFFLINE_CAP_HRS, GUNNERY_PCT, THREAD_2_CMD, THREAD_3_CMD, THREAD_4_CMD, SPEED2_LOG, SPEED4_LOG, SPEED8_LOG, LAB_MIN_SECS, LAB_LINE_MAX, LAB_LINE_TIME_MULT, LAB_LINE_GATE, LAB_LINE_CAT, LAB_DEADEYE_PCT, LAB_BARRAGE_EVERY, LAB_PLATING_PCT, LAB_NANITES_FLAT, LAB_SALVAGE_PCT, LAB_SIPHON_PCT, LAB_BROKER_PCT, LAB_CELERITY_PCT, type LabCat } from '../sim/balance.js';
import type { GameState } from '../game/state.js';
export type Skill = 'gunnery' | 'logistics' | 'engineering' | 'command';
export const TRAIN_SKILLS: Skill[] = ['gunnery', 'logistics', 'engineering', 'command'];
export const THREADS = ['t0', 't1', 't2', 't3'] as const;
// Active research: startedAt + durationMs in wall-clock ms. `doneAt` survives
// only as a legacy field — progressTraining migrates old doneAt threads
// one time (remaining time preserved), then deletes the field.
export type ThreadState = { skill: LineId; startedAt: number; durationMs: number; doneAt?: number };
export type BankedState = { line: LineId; investedMs: number };
export type LabHistoryEntry = { line: LineId; level: number; at: number };
type TrainStore = {
  levels: Partial<Record<LineId, number>>;
  threads: Record<string, ThreadState>;
  bank: Record<string, BankedState>;
  auto: Record<string, boolean>;
  history: LabHistoryEntry[];
};
export function researchTime(level: number): number { return Math.round(TRAIN_TIME_BASE_S * Math.pow(TRAIN_TIME_GROWTH, level)); }
function store(s: GameState): TrainStore {
  const t = (s as unknown as { training?: Partial<TrainStore> }).training ?? ((s as unknown as { training?: TrainStore }).training = { levels: {}, threads: {} as Record<string, ThreadState>, bank: {}, auto: {}, history: [] });
  t.bank ??= {};
  t.auto ??= {};
  t.history ??= [];
  return t as TrainStore;
}
function threadUnlocked(s: GameState, thread: string): boolean {
  if (thread === 't0') return true;
  const cmd = trainingLevel(s, 'command');
  const need = thread === 't1' ? THREAD_2_CMD : thread === 't2' ? THREAD_3_CMD : THREAD_4_CMD;
  return cmd >= need;
}
function isLine(line: string): line is LineId { return (RESEARCH_LINES as Record<string, LineDef>)[line] !== undefined; }
// Research costs cores upfront (sunk — switching never refunds). Resume of
// the same banked line costs cores again. Unaffordable/maxed/busy/locked
// threads refuse with false and leave state untouched.
export function startResearch(s: GameState, thread: string, line: LineId, nowMs = Date.now()): boolean {
  const t = store(s);
  if (!THREADS.includes(thread as never) || !isLine(line as string)) return false;
  if (t.threads[thread] || !threadUnlocked(s, thread)) return false;
  const lvl = lineLevel(s, line);
  if (lvl >= (RESEARCH_LINES[line]?.max ?? 0)) return false;
  const cost = researchCost(line, lvl);
  if ((s.cores ?? 0) < cost) return false;
  s.cores = (s.cores ?? 0) - cost;
  // Banked resume: same line on this thread continues from banked time.
  const resume = t.bank[thread];
  const invested = resume && resume.line === line ? Math.max(0, resume.investedMs) : 0;
  if (resume && resume.line === line) delete t.bank[thread];
  const mult = labSpeedMult(s);
  const durationMs = lineResearchTime(line, lvl) * 1000;
  t.threads[thread] = { skill: line, startedAt: nowMs - invested / mult, durationMs };
  return true;
}
// Switching banks the interrupted research's invested time (single slot per
// thread — a new switch overwrites any older banked line) and starts the
// new line. Cores for the interrupted research are NOT refunded; the new
// line deducts cores again. Pre-checks run BEFORE banking, so a refused
// switch leaves the running research untouched.
export function switchResearch(s: GameState, thread: string, newLine: LineId, nowMs = Date.now()): boolean {
  const t = store(s);
  if (!THREADS.includes(thread as never) || !isLine(newLine as string)) return false;
  const r = t.threads[thread];
  if (!r) return startResearch(s, thread, newLine, nowMs);
  if (r.skill === newLine) return false;
  const lvl = lineLevel(s, newLine);
  if (lvl >= (RESEARCH_LINES[newLine]?.max ?? 0)) return false;
  if ((s.cores ?? 0) < researchCost(newLine, lvl)) return false;
  const mult = labSpeedMult(s);
  const startedAt = typeof r.startedAt === 'number' ? r.startedAt : nowMs;
  const durationMs = typeof r.durationMs === 'number' ? r.durationMs : Math.max(0, (r.doneAt ?? nowMs) - nowMs);
  const invested = Math.min(Math.max(0, (nowMs - startedAt) * mult), Math.max(0, durationMs));
  t.bank[thread] = { line: r.skill, investedMs: invested };
  delete t.threads[thread];
  return startResearch(s, thread, newLine, nowMs);
}
export function setAuto(s: GameState, thread: string, on: boolean): void {
  const t = store(s);
  if (!THREADS.includes(thread as never)) return;
  if (on) t.auto[thread] = true;
  else delete t.auto[thread];
}
export function autoOn(s: GameState, thread: string): boolean { return store(s).auto[thread] ?? false; }
export function bankedMs(s: GameState, thread: string): number { return store(s).bank[thread]?.investedMs ?? 0; }
export function labHistory(s: GameState): LabHistoryEntry[] { return store(s).history; }
export function labSpeedMult(s: GameState): number { return 1 + LAB_CELERITY_PCT * lineLevel(s, 'celerity'); }
function completeThread(s: GameState, t: TrainStore, id: string, line: LineId, nowMs: number): void {
  const lvl = (t.levels[line] ?? 0) + 1;
  t.levels[line] = lvl;
  delete t.threads[id];
  t.history.unshift({ line, level: lvl, at: nowMs });
  if (t.history.length > 50) t.history.length = 50;
  // INCREMENTAL fold for the completed level only — never applyLineEffects
  // here (it multiplies the workshop base and would double-count).
  applyLineDelta(s, line, lvl);
  // Auto-research: chain level+1 of the same line while affordable, else idle.
  if (t.auto[id] && lvl < (RESEARCH_LINES[line]?.max ?? 0)) {
    const cost = researchCost(line, lvl);
    if ((s.cores ?? 0) >= cost) {
      s.cores = (s.cores ?? 0) - cost;
      t.threads[id] = { skill: line, startedAt: nowMs, durationMs: lineResearchTime(line, lvl) * 1000 };
    }
  }
}
export function progressTraining(s: GameState, nowMs = Date.now()): void {
  const t = store(s);
  const mult = labSpeedMult(s);
  for (const id of Object.keys(t.threads)) {
    const r = t.threads[id];
    if (!r) continue;
    // One-time migration: legacy {skill, doneAt} threads keep remaining time.
    if (typeof r.startedAt !== 'number' || typeof r.durationMs !== 'number') {
      const remaining = typeof r.doneAt === 'number' ? r.doneAt - nowMs : 0;
      if (remaining <= 0) { completeThread(s, t, id, isLine(r.skill as string) ? r.skill : 'gunnery', nowMs); continue; }
      r.startedAt = nowMs;
      r.durationMs = remaining;
      delete r.doneAt;
    }
    if ((nowMs - r.startedAt) * mult >= r.durationMs) completeThread(s, t, id, r.skill, nowMs);
  }
}
export function advanceOffline(s: GameState, elapsedMs: number): void {
  progressTraining(s, Date.now() - Math.max(0, elapsedMs - TRAIN_OFFLINE_CAP_HRS * 3600e3));
}
export function trainingLevel(s: GameState, skill: LineId): number { return store(s).levels[skill] ?? 0; }
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
// Delta fold for ONE completed level (newLevel = level after increment).
// Keeps mid-run completions live without a workshop recompute: multiplicative
// folds (gunnery/plating/siphon) scale by the new/old ratio, additive folds
// add one level's worth. All other lines apply at live read sites (speed
// gates, thread gates, auto-forge, offline, workshop costs) — no fold here.
export function applyLineDelta(s: GameState, line: LineId, newLevel: number): void {
  if (newLevel <= 0) return;
  const ax = s as unknown as { _fluxMult?: number; _essenceMult?: number };
  if (line === 'gunnery') {
    const prev = 1 + GUNNERY_PCT * (newLevel - 1);
    if (prev > 0) s.dmg = Math.round(s.dmg * (1 + GUNNERY_PCT * newLevel) / prev);
  } else if (line === 'deadeye') {
    s.critCh = (s.critCh ?? 0) + LAB_DEADEYE_PCT;
  } else if (line === 'barrage') {
    s.volley = (s.volley ?? 0) + (Math.floor(newLevel / LAB_BARRAGE_EVERY) - Math.floor((newLevel - 1) / LAB_BARRAGE_EVERY));
  } else if (line === 'plating') {
    const prev = 1 + LAB_PLATING_PCT * (newLevel - 1);
    if (prev > 0) s.maxHull = Math.round(s.maxHull * (1 + LAB_PLATING_PCT * newLevel) / prev);
    if (s.hull > s.maxHull) s.hull = s.maxHull;
  } else if (line === 'nanites') {
    s.regen = (s.regen ?? 0) + LAB_NANITES_FLAT;
  } else if (line === 'salvage') {
    ax._fluxMult = labFluxMult(s);
  } else if (line === 'siphon') {
    const prev = 1 + LAB_SIPHON_PCT * (newLevel - 1);
    if (prev > 0) ax._essenceMult = (ax._essenceMult ?? 1) * (1 + LAB_SIPHON_PCT * newLevel) / prev;
  }
}
// Fold line levels into combat fields. CALL ONLY immediately after
// applyWorkshop: gunnery/plating multiply the fresh workshop base, so a
// repeat call without applyWorkshop in between would compound. Prefer
// recomputeStats (workshop.ts) at stat-mutation sites, applyLineDelta for
// mid-run completions.
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
