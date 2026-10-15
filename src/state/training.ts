// Training Academy (spec §4): DOM-free idle research threads reusing the
// Lab time formula. Ticked in real time (main.ts interval + on load),
// 12h offline advance cap.
//
// Mega-labs catalog (plan 1): RESEARCH_LINES is generated from the FAMILIES +
// LINE_SPECS tables in balance.ts (single tuning source). The 12 legacy ids
// keep their exact effects and levels (existing saves carry over); every line
// carries fam/cat/max/timeMult/costDiv/minBest metadata. Effects flow through
// the recomputeStats/applyLineDelta discipline: applyLineEffects runs only
// immediately after applyWorkshop (see recomputeStats in workshop.ts), while
// mid-run completions fold INCREMENTALLY via applyLineDelta — progressTraining
// must never call applyLineEffects wholesale (that would compound gunnery and
// the other multiplicative lines).
//
// Task 2 slot mechanics: switching banks invested time (cores are sunk —
// resume costs cores again and re-checks affordability), auto-research
// chains the next level while affordable, celerity multiplies research
// speed, completions append to a capped history.
import { TRAIN_TIME_BASE_S, TRAIN_TIME_GROWTH, TRAIN_OFFLINE_CAP_HRS, GUNNERY_PCT, ENG_OFFLINE_PCT, THREAD_2_CMD, THREAD_3_CMD, THREAD_4_CMD, SPEED2_LOG, SPEED4_LOG, SPEED8_LOG, LAB_MIN_SECS, LAB_CELERITY_PCT, LAB_BROKER_PCT, FAMILIES as FAMS, LINE_SPECS, WS_BATCH_COST as WS_COST, type FamilyId as FamId, type LabCat, type LineEffectKind, type LineSpec } from '../sim/balance.js';
import type { GameState } from '../game/state.js';
export type Skill = 'gunnery' | 'logistics' | 'engineering' | 'command';
export type LineId = string;
export type FamilyId = FamId;
export { FAMS as FAMILIES, WS_COST as WS_BATCH_COST };
export type { LabCat, LineEffectKind, LineSpec };
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
// Lifetime invest counter: every core-equivalent spend (workshop cores,
// research cores, ult shard costs) accumulates here and gates workshop batch
// tabs via wsBatchUnlocked. Persisted through the save spread; hydrated in
// main.ts.
export function lifetimeCores(s: GameState): number {
  const v = (s as unknown as { lifetimeCoresSpent?: unknown }).lifetimeCoresSpent;
  return typeof v === 'number' && v > 0 ? Math.floor(v) : 0;
}
export function noteCoresSpent(s: GameState, n: number): void {
  if (!(n > 0)) return;
  const cur = (s as unknown as { lifetimeCoresSpent?: unknown }).lifetimeCoresSpent;
  (s as unknown as { lifetimeCoresSpent?: number }).lifetimeCoresSpent = (typeof cur === 'number' ? cur : 0) + n;
}
// Research costs cores upfront (sunk — switching never refunds). Resume of
// the same banked line costs cores again. Unaffordable/maxed/busy/locked
// threads refuse with false and leave state untouched. Gated lines refuse
// unless the gate is met: pass the caller's current best wave explicitly, or
// omit it to fall back to s.best (old calls for ungated lines behave exactly
// as before).
export function startResearch(s: GameState, thread: string, line: LineId, nowMs = Date.now(), bestWave?: number): boolean {
  const t = store(s);
  if (!THREADS.includes(thread as never) || !isLine(line as string)) return false;
  if (t.threads[thread] || !threadUnlocked(s, thread)) return false;
  if (!lineUnlocked(s, line, bestWave ?? 0)) return false;
  const lvl = lineLevel(s, line);
  if (lvl >= (RESEARCH_LINES[line]?.max ?? 0)) return false;
  const cost = researchCost(line, lvl, s);
  if ((s.cores ?? 0) < cost) return false;
  s.cores = (s.cores ?? 0) - cost;
  noteCoresSpent(s, cost);
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
export function switchResearch(s: GameState, thread: string, newLine: LineId, nowMs = Date.now(), bestWave?: number): boolean {
  const t = store(s);
  if (!THREADS.includes(thread as never) || !isLine(newLine as string)) return false;
  const r = t.threads[thread];
  if (!r) return startResearch(s, thread, newLine, nowMs, bestWave);
  if (r.skill === newLine) return false;
  if (!lineUnlocked(s, newLine, bestWave ?? 0)) return false;
  const lvl = lineLevel(s, newLine);
  if (lvl >= (RESEARCH_LINES[newLine]?.max ?? 0)) return false;
  if ((s.cores ?? 0) < researchCost(newLine, lvl, s)) return false;
  const mult = labSpeedMult(s);
  const startedAt = typeof r.startedAt === 'number' ? r.startedAt : nowMs;
  const durationMs = typeof r.durationMs === 'number' ? r.durationMs : Math.max(0, (r.doneAt ?? nowMs) - nowMs);
  const invested = Math.min(Math.max(0, (nowMs - startedAt) * mult), Math.max(0, durationMs));
  t.bank[thread] = { line: r.skill, investedMs: invested };
  delete t.threads[thread];
  return startResearch(s, thread, newLine, nowMs, bestWave);
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
    const cost = researchCost(line, lvl, s);
    if ((s.cores ?? 0) >= cost) {
      s.cores = (s.cores ?? 0) - cost;
      noteCoresSpent(s, cost);
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
// --- Generated catalog: every line carries fam/cat/max/timeMult/costDiv/minBest ---
export type LineDef = { fam: FamId; cat: LabCat; name: string; desc: string; max: number; timeMult: number; costDiv: number; minBest: number };
const SPEC_BY_ID: Record<string, LineSpec> = {};
for (const sp of LINE_SPECS) SPEC_BY_ID[sp.id] = sp;
export function specOf(line: LineId): LineSpec | undefined { return SPEC_BY_ID[line]; }
export const RESEARCH_LINES: Record<string, LineDef> = {};
for (const sp of LINE_SPECS) {
  RESEARCH_LINES[sp.id] = {
    fam: sp.fam,
    cat: (FAMS.find(f => f.id === sp.fam)?.cat ?? 'mastery') as LabCat,
    name: sp.name, desc: sp.desc, max: sp.max,
    timeMult: sp.timeMult, costDiv: sp.costDiv, minBest: sp.minBest,
  };
}
export function lineLevel(s: GameState, line: LineId): number { return store(s).levels[line] ?? 0; }
// --- Ladders: family gates on best wave, workshop batches on lifetime spend ---
export function lineFamily(line: LineId): FamId | undefined { return SPEC_BY_ID[line]?.fam; }
function effBest(s: GameState, bestWave: number): number {
  if (bestWave > 0) return bestWave;
  const b = (s as unknown as { best?: unknown }).best;
  return typeof b === 'number' && b > 0 ? Math.floor(b) : 0;
}
export function familyUnlocked(s: GameState, fam: FamId, bestWave = 0): boolean {
  const f = FAMS.find(x => x.id === fam);
  if (!f) return false;
  return effBest(s, bestWave) >= f.best;
}
export function lineUnlocked(s: GameState, line: LineId, bestWave = 0): boolean {
  const sp = SPEC_BY_ID[line];
  if (!sp) return false;
  const famBest = FAMS.find(x => x.id === sp.fam)?.best ?? 0;
  return effBest(s, bestWave) >= Math.max(famBest, sp.minBest);
}
export function wsBatchUnlocked(s: GameState, batch: number): boolean {
  if (batch <= 1) return true;
  const need = WS_COST[batch - 1] ?? Infinity;
  return lifetimeCores(s) >= need;
}
// Uniform core cost scaled per line: (1 + floor(level/3)) * costDiv,
// discounted by thrift (-2%/level) when state is passed. Two-arg calls
// (UI labels, old tests) skip the discount exactly as before.
export function researchCost(line: LineId, level: number, s?: GameState): number {
  const div = SPEC_BY_ID[line]?.costDiv ?? 1;
  const base = (1 + Math.floor(level / 3)) * div;
  if (!s) return base;
  const thrift = lineLevel(s, 'thrift');
  if (thrift <= 0) return base;
  return Math.max(1, Math.floor(base * Math.max(0, 1 - 0.02 * thrift)));
}
export function lineResearchTime(line: LineId, level: number): number {
  const mult = RESEARCH_LINES[line]?.timeMult ?? 1;
  return Math.max(LAB_MIN_SECS, Math.round(researchTime(level) * mult));
}
// Live read-site mults (no stat fold — safe to call anywhere).
export function labFluxMult(s: GameState): number { return 1 + sumKind(s, 'fluxPct'); }
export function labWorkshopCostMult(s: GameState): number { return Math.max(0, 1 - LAB_BROKER_PCT * lineLevel(s, 'broker')); }
export function labOfflineMult(s: GameState): number {
  return 1 + ENG_OFFLINE_PCT * lineLevel(s, 'engineering') + sumKind(s, 'offlinePct');
}
// --- Generic fold helpers over the spec table ---
function sumKind(s: GameState, kind: LineEffectKind): number {
  let acc = 0;
  const lv = store(s).levels;
  for (const sp of LINE_SPECS) {
    if (sp.effect !== kind) continue;
    const n = lv[sp.id] ?? 0;
    if (n > 0) acc += sp.per * n;
  }
  return acc;
}
function prodKind(s: GameState, kind: LineEffectKind): number {
  let acc = 1;
  const lv = store(s).levels;
  for (const sp of LINE_SPECS) {
    if (sp.effect !== kind) continue;
    const n = lv[sp.id] ?? 0;
    if (n > 0) acc *= 1 + sp.per * n;
  }
  return acc;
}
function stepKind(s: GameState, kind: LineEffectKind): number {
  let acc = 0;
  const lv = store(s).levels;
  for (const sp of LINE_SPECS) {
    if (sp.effect !== kind) continue;
    const n = lv[sp.id] ?? 0;
    if (n > 0) acc += Math.floor(n / (sp.every ?? 1)) * sp.per;
  }
  return acc;
}
function recomputeShield(s: GameState): void {
  s.shieldMax = Math.round(sumKind(s, 'shieldFlat') * prodKind(s, 'shieldPct'));
}
// Delta fold for ONE completed level (newLevel = level after increment).
// Multiplicative workshop-base lines (dmg/maxHull/rate/regen/essence) scale by
// the new/old ratio for that line's own factor (order-independent, exact);
// additive lines add one level's worth (step lines credit threshold crossings
// only); shield/flux recompute by assignment (idempotent); live-site and
// later-plan kinds need no fold here.
export function applyLineDelta(s: GameState, line: LineId, newLevel: number): void {
  if (newLevel <= 0) return;
  const sp = SPEC_BY_ID[line];
  if (!sp) return;
  const ax = s as unknown as { _fluxMult?: number; _essenceMult?: number };
  const ratio = (1 + sp.per * newLevel) / (1 + sp.per * (newLevel - 1));
  const stepDiff = Math.floor(newLevel / (sp.every ?? 1)) - Math.floor((newLevel - 1) / (sp.every ?? 1));
  switch (sp.effect) {
    case 'dmgPct': s.dmg = Math.round(s.dmg * ratio); break;
    case 'maxHullPct': {
      s.maxHull = Math.round(s.maxHull * ratio);
      if (s.hull > s.maxHull) s.hull = s.maxHull;
      break;
    }
    case 'ratePct': s.rate = Math.round(s.rate * ratio * 100) / 100; break;
    case 'regenPct': s.regen = (s.regen ?? 0) * ratio; break;
    case 'essencePct': ax._essenceMult = (ax._essenceMult ?? 1) * ratio; break;
    case 'critAdd': s.critCh = (s.critCh ?? 0) + sp.per; break;
    case 'thorns': s.thorns = (s.thorns ?? 0) + sp.per; break;
    case 'bossMult': s.bossMult = (s.bossMult ?? 0) + sp.per; break;
    case 'cacheLuck': s.cacheLuck = (s.cacheLuck ?? 0) + sp.per; break;
    case 'cacheQuality': s.cacheQuality = (s.cacheQuality ?? 0) + sp.per; break;
    case 'ultCharge': s.ultChargeMult = (s.ultChargeMult ?? 0) + sp.per; break;
    case 'critMult': s.critMult = (s.critMult ?? 0) + sp.per; break;
    case 'splash': s.splashR = (s.splashR ?? 0) + sp.per; break;
    case 'rangeFlat': s.range = (s.range ?? 0) + sp.per; break;
    case 'regenFlat': s.regen = (s.regen ?? 0) + sp.per; break;
    case 'volleyEvery': s.volley = (s.volley ?? 0) + stepDiff * sp.per; break;
    case 'bounceEvery': s.bounce = (s.bounce ?? 0) + stepDiff * sp.per; break;
    case 'rateStep': s.rate = Math.round(((s.rate ?? 0) + stepDiff * sp.per) * 100) / 100; break;
    case 'fluxPct': ax._fluxMult = labFluxMult(s); break;
    case 'shieldFlat':
    case 'shieldPct': recomputeShield(s); break;
    default: break; // live read sites + later-plan kinds: no fold
  }
}
// Fold line levels into combat fields. CALL ONLY immediately after
// applyWorkshop: multiplicative lines scale the fresh workshop base, so a
// repeat call without applyWorkshop in between would compound. Lab-only
// fields (thorns/shield/splash/...) assign from levels (applyWorkshop never
// touches them). Prefer recomputeStats (workshop.ts) at stat-mutation sites,
// applyLineDelta for mid-run completions.
export function applyLineEffects(s: GameState): void {
  s.dmg = Math.round(s.dmg * prodKind(s, 'dmgPct'));
  s.maxHull = Math.round(s.maxHull * prodKind(s, 'maxHullPct'));
  if (s.hull > s.maxHull) s.hull = s.maxHull;
  s.critCh = (s.critCh ?? 0) + sumKind(s, 'critAdd');
  s.volley = (s.volley ?? 0) + stepKind(s, 'volleyEvery');
  s.bounce = (s.bounce ?? 0) + stepKind(s, 'bounceEvery');
  s.rate = Math.round(((s.rate ?? 0) + stepKind(s, 'rateStep')) * prodKind(s, 'ratePct') * 100) / 100;
  s.regen = ((s.regen ?? 0) + sumKind(s, 'regenFlat')) * prodKind(s, 'regenPct');
  s.range = (s.range ?? 0) + sumKind(s, 'rangeFlat');
  recomputeShield(s);
  s.thorns = sumKind(s, 'thorns');
  s.splashR = sumKind(s, 'splash');
  s.critMult = sumKind(s, 'critMult');
  s.slowPct = 0; // no source lines yet (later plan)
  s.bossMult = sumKind(s, 'bossMult');
  s.cacheLuck = sumKind(s, 'cacheLuck');
  s.cacheQuality = sumKind(s, 'cacheQuality');
  s.ultChargeMult = sumKind(s, 'ultCharge');
  if (s.flux === 0) s.flux += Math.round(sumKind(s, 'startFlux'));
  (s as unknown as { _fluxMult?: number })._fluxMult = labFluxMult(s);
  const em = (s as unknown as { _essenceMult?: number })._essenceMult ?? 1;
  (s as unknown as { _essenceMult?: number })._essenceMult = em * prodKind(s, 'essencePct');
  // logistics/command/engineering/celerity/thrift/broker/offline lines apply
  // at live read sites (speedUnlocked, thread gates, auto-forge, offline,
  // research costs, workshop costs) — no fold. spawnGap/surgeLuck/
  // heraldLuck/echoDps feed later plans — no fold yet.
}
