// Headless balance check (grind-economy Task 4, spec §6): simulate up to 1000
// waves in Node, assert the first-run wall lands at waves 40-60, and project
// the 30-day Training Academy schedule (x2 day<=1, x4 day<=3). Logs + verdict.
// Ultimates (reset/intel/tabs/ultimates Task 4) are excluded from this sim by
// design: no essence unlocks, no charge, no fire — wall policy unchanged.
//
// Fidelity contract: this file MIRRORS (not re-tunes) the shipped formulas:
// - enemyHp/enemyDmg/costFor/BASE/OFFLINE_*: verbatim copies of
//   src/sim/balance.ts (single tuning source, plan Global Constraint;
//   8-track forge + 12-track workshop BASE, Task 2 roster)
// - spawnWave: verbatim copy of src/game/spawning.ts
// - tickSim: verbatim copy of src/game/update.ts, INCLUDING the Task 2
//   firing fix (per-state _acc accumulator: shots = _acc + rate*dt)
//   AND the fix-wave contact-chip flux award (chip kills grant 6+wave,
//   same as ranged kills). Without the accumulator, ranged DPS is ~0 and
//   the wall reads artificially early — the accumulator MUST stay for an
//   honest measurement.
// - maybeSpawnSurge: verbatim copy of src/game/rifts.ts (cache ship hp
//   200+wave*20, essence 15, every 5th wave >= 10, once per wave, rift
//   round-robin floor(wave/15)%RIFT_POS.length)
// - augment auto-pick every 10th wave >= 10: 'Split rounds' dmg boost,
//   same effect as applyAugment() in src/game/rifts.ts
// - forge auto-buy: same costs/effects as buyUpgrade() in src/ui/panel.ts
//   (BASE imported from balance.ts: Task 1 grind retune — dmg 30/1.32,
//   rate 44/1.36, maxHull 40/1.34; dmg*1.12+2 rounded, rate+0.08,
//   maxHull*1.1+50 rounded with full heal on buy).
// Tuning history: committed 1.18/1.12 curves walled at wave 7; even flat
// exponentials walled at 12 (wave^2.1 + spawn-count growth outscale
// log-grown forge DPS), enemy-only retunes peaked ~59. Easing forge costs
// alongside the enemy nerf lands the wall mid-window (verified 83-104
// across 9 policy/augment variants, no stall trips).
// The only judgement call is the PLAYER POLICY (a first-run player who
// actively spends flux each wave clear): buy the cheapest affordable upgrade
// (tie-break dmg > rate > maxHull) until nothing is affordable.

const DT = 1 / 60;
const MAX_WAVE = 1000;
const WALL_LO = 40;
const WALL_HI = 60;
const TICKS_PER_WAVE_CAP = 60 * 600; // 10 sim-minutes/wave stall guard

// --- src/sim/balance.ts (verbatim) ---
function costFor(base, growth, level) { return Math.round(base * Math.pow(growth, level)); }
function fluxForKill(wave) { return 3 + Math.floor(wave / 2); }
function enemyHp(wave) { const base = 10 * Math.pow(1.05, wave); const tail = wave <= 40 ? Math.pow(wave, 1.25) : Math.pow(40, 1.25) + (Math.pow(wave, 1.35) - Math.pow(40, 1.35)); return Math.round(base + tail); }
function enemyDmg(wave) { return Math.round(2 * Math.pow(1.025, wave) * 10) / 10; }
const SHARD_W_BOSS = 1;
const BOSS_EVERY = 25; const BOSS_HP_MULT = 10; const BOSS_DMG_MULT = 3;
const ULT_COST = { nova: 2, overdrive: 3, aegis: 5 };

// --- src/game/state.ts freshState (verbatim values) ---
function freshState() {
  return { wave: 1, hull: 500, maxHull: 500, flux: 0, dmg: 12, rate: 1, range: 180,
    ships: [], nextId: 1, _acc: 0, essence: 0, shards: 0, levels: {}, pendingAugment: null, augments: [],
    regen: 0, critCh: 0, volley: 0, bounce: 0, timeS: 0, _queue: 0, _timer: 0,
    thorns: 0, shieldMax: 0, shield: 0, splashR: 0, critMult: 0, slowPct: 0,
    bossMult: 0, cacheLuck: 0, cacheQuality: 0, ultChargeMult: 0 };
}

// --- src/game/spawning.ts (verbatim) ---
function spawnWave(s) {
  const budget = 4 + Math.floor(s.wave * 0.7);
  const released = Math.min(2, budget);
  for (let k = 0; k < released; k++) {
    const id = s.nextId;
    const a = (k / budget) * Math.PI * 2;
    const kind = id % 7 === 6 ? 'hex' : id % 3 === 2 ? 'bomber' : 'dart';
    s.ships.push({ id: s.nextId++, kind,
      x: 280 + Math.cos(a) * 260, y: 280 + Math.sin(a) * 260,
      hp: enemyHp(s.wave), dmg: enemyDmg(s.wave), speed: 22 + s.wave * 0.4, essence: 0,
      behavior: id % 3 === 2 ? 'roamer' : 'seeker', wander: Math.random() * Math.PI * 2 });
  }
  s._queue = budget - released; s._timer = 0;
  if (s.wave % BOSS_EVERY === 0 && s.wave > 0) {
    s.ships.push({ id: s.nextId++, kind: 'hex',
      x: 280 + Math.cos(0) * 260, y: 280 + Math.sin(0) * 260,
      hp: enemyHp(s.wave) * BOSS_HP_MULT, dmg: enemyDmg(s.wave) * BOSS_DMG_MULT,
      speed: 10, essence: 0, boss: true, behavior: 'seeker', wander: 0 });
  }
}

// --- src/game/rifts.ts maybeSpawnSurge (verbatim logic) ---
const RIFT_POS = [[70, 70], [490, 120], [90, 470]];
function maybeSpawnSurge(s) {
  if (s.wave < 10 || s.wave % 5 !== 0) return false;
  if (s._surgeWave === s.wave) return false;
  s._surgeWave = s.wave;
  const rp = RIFT_POS[Math.floor(s.wave / 15) % RIFT_POS.length];
  s.ships.push({ id: s.nextId++, kind: 'hex', x: rp[0], y: rp[1],
    hp: 200 + s.wave * 20, dmg: 0, speed: 14, essence: 15, cache: true });
  return true;
}

// --- Task 2 mechanics mirror (zero in policy → wall unchanged; luck<=0
// short-circuits before Math.random so the RNG stream is untouched) ---
function bossMul(s, t) { return t.boss ? 1 + (s.bossMult ?? 0) : 1; }
function creditKill(s, t) {
  s.flux += fluxForKill(s.wave);
  if (t.cache) s.essence += Math.round(t.essence * (1 + (s.cacheQuality ?? 0))) * (s._essenceMult ?? 1);
  if (t.boss) s.shards = (s.shards ?? 0) + SHARD_W_BOSS;
}
function splashFrom(s, x, y) {
  const r = s.splashR ?? 0, dmg = (s.dmg ?? 0) * 0.3;
  if (!(r > 0) || !(dmg > 0)) return;
  const r2 = r * r, slain = [];
  for (const o of s.ships) {
    if (o.hp <= 0) continue;
    const dx = o.x - x, dy = o.y - y;
    if (dx * dx + dy * dy > r2) continue;
    o.hp -= dmg * bossMul(s, o);
    if (o.hp <= 0) slain.push(o);
  }
  for (const d of slain) creditKill(s, d);
  if (slain.length) s.ships = s.ships.filter(x => x.hp > 0);
}
function spawnBonusSurge(s) {
  const rp = RIFT_POS[(Math.floor(s.wave / 15) % RIFT_POS.length + 1) % RIFT_POS.length];
  s.ships.push({ id: s.nextId++, kind: 'hex', x: rp[0], y: rp[1],
    hp: 200 + s.wave * 20, dmg: 0, speed: 14, essence: 15, cache: true });
}

// --- src/game/update.ts tickSim (verbatim logic, incl. Task 2 _acc fix) ---
function tickSim(s, dt) {
  if ((s._queue ?? 0) > 0) {
    s._timer = (s._timer ?? 0) - dt;
    const gap = Math.max(0.15, 1.1 - s.wave * 0.008);
    while ((s._timer ?? 0) <= 0 && (s._queue ?? 0) > 0) {
      const id = s.nextId; const a = id * 2.399963229728653;
      const kind = id % 7 === 6 ? 'hex' : id % 3 === 2 ? 'bomber' : 'dart';
      s.ships.push({ id: s.nextId++, kind, x: 280 + Math.cos(a) * 260, y: 280 + Math.sin(a) * 260,
        hp: enemyHp(s.wave), dmg: enemyDmg(s.wave), speed: 22 + s.wave * 0.4, essence: 0,
        behavior: id % 3 === 2 ? 'roamer' : 'seeker', wander: Math.random() * Math.PI * 2 });
      s._queue = (s._queue ?? 1) - 1; s._timer = (s._timer ?? 0) + gap;
    }
  }
  if (s.ships.length === 0 && (s._queue ?? 0) <= 0) {
    spawnWave(s); maybeSpawnSurge(s);
    { const luck = s.cacheLuck ?? 0;
      if (s.wave >= 10 && luck > 0 && Math.random() < Math.min(1, luck)) spawnBonusSurge(s); }
    if (s.wave >= 10 && s.wave % 10 === 0 && s._augmentWave !== s.wave && !s.pendingAugment) {
      s.pendingAugment = ['Split rounds +1 bounce', 'Crit surge +10%', 'Halo thorns'];
      s._augmentWave = s.wave;
    }
  }
  s.ships.sort((a, b) => ((a.x - 280) ** 2 + (a.y - 280) ** 2) - ((b.x - 280) ** 2 + (b.y - 280) ** 2));
  const essenceMult = s._essenceMult ?? 1;
  const targets = 1 + Math.floor((s.volley ?? 0) / 3);
  let shots = (s._acc ?? 0) + s.rate * dt, guard = 20;
  while (shots >= 1 && guard-- > 0 && s.ships.length) {
    shots -= 1;
    let hits = 0;
    for (const t of s.ships) {
      if (hits >= targets) break;
      if (t.hp <= 0) continue;
      if ((t.x - 280) ** 2 + (t.y - 280) ** 2 > s.range ** 2) continue;
      let dmg = s.dmg;
      if (Math.random() < (s.critCh ?? 0)) dmg *= 2 + (s.critMult ?? 0);
      t.hp -= dmg * bossMul(s, t); hits++;
      if (t.hp <= 0) {
        creditKill(s, t); splashFrom(s, t.x, t.y);
        const chains = Math.floor((s.bounce ?? 0) / 2);
        for (let c = 0; c < chains; c++) {
          let best = null, bestD = Infinity;
          for (const o of s.ships) { if (o === t || o.hp <= 0) continue; const d2 = (o.x - 280) ** 2 + (o.y - 280) ** 2; if (d2 < bestD) { bestD = d2; best = o; } }
          if (!best) break;
          best.hp -= s.dmg * 0.5 * bossMul(s, best);
          if (best.hp <= 0) { creditKill(s, best); splashFrom(s, best.x, best.y); }
        }
      }
    }
    if (s.ships.some(x => x.hp <= 0)) s.ships = s.ships.filter(x => x.hp > 0);
  }
  s._acc = shots;
  const sF = 1 - Math.min(0.5, Math.max(0, s.slowPct ?? 0));
  const range2 = (s.range ?? 0) ** 2;
  for (const sh of s.ships) {
    const dx = 280 - sh.x, dy = 280 - sh.y, d = Math.hypot(dx, dy) || 1;
    const sp = sh.speed * ((dx * dx + dy * dy <= range2) ? sF : 1);
    if (sh.behavior === 'roamer') {
      const px = -dy / d, py = dx / d;
      const tt = (s.timeS ?? 0) + dt;
      const strafe = Math.sin((sh.wander ?? 0) + tt) * 40 * dt;
      sh.x += dx / d * sp * dt + px * strafe; sh.y += dy / d * sp * dt + py * strafe;
      sh.wander = (sh.wander ?? 0) + 1.5 * dt;
    } else {
      sh.x += dx / d * sp * dt; sh.y += dy / d * sp * dt;
    }
    if (d < 26) {
      const contact = sh.dmg * dt * 4;
      let rem = contact;
      const sh0 = s.shield ?? 0;
      if (sh0 > 0) { const abs = Math.min(sh0, rem); s.shield = sh0 - abs; rem -= abs; }
      if (rem > 0) s.hull -= rem;
      const th = s.thorns ?? 0;
      let thornKill = false;
      if (th > 0 && contact > 0) { sh.hp -= th * contact;
        if (sh.hp <= 0) { creditKill(s, sh); splashFrom(s, sh.x, sh.y); thornKill = true; } }
      const alive = !thornKill && sh.hp > 0; sh.hp -= s.dmg * dt * 0.5 * bossMul(s, sh);
      if (alive && sh.hp <= 0) { creditKill(s, sh); splashFrom(s, sh.x, sh.y); } }
  }
  s.ships = s.ships.filter(x => x.hp > 0);
  s.hull = Math.min(s.maxHull, s.hull + (s.regen ?? 0) * dt);
  s.hull = Math.max(0, s.hull); s.timeS = (s.timeS ?? 0) + dt;
  if (s.ships.length === 0 && (s._queue ?? 0) <= 0) { s.wave += 1; }
}

// --- src/ui/panel.ts costs/effects (verbatim values, BASE from balance.ts) ---
const BASE = { dmg: { base: 30, growth: 1.32 }, rate: { base: 44, growth: 1.36 }, maxHull: { base: 40, growth: 1.34 }, range: { base: 50, growth: 1.43 }, regen: { base: 60, growth: 1.48 }, crit: { base: 120, growth: 1.58 }, volley: { base: 300, growth: 1.68 }, bounce: { base: 300, growth: 1.68 } };
function upgradeCost(stat, lvl) { return costFor(BASE[stat].base, BASE[stat].growth, lvl); }
function buyUpgrade(s, stat) {
  const lvl = s.levels[stat] ?? 0; const c = upgradeCost(stat, lvl);
  if (s.flux < c) return false;
  s.flux -= c; s.levels[stat] = lvl + 1;
  if (stat === 'dmg') s.dmg = Math.round(s.dmg * 1.12 + 2);
  if (stat === 'rate') s.rate = Math.round((s.rate + 0.08) * 100) / 100;
  if (stat === 'maxHull') { s.maxHull = Math.round(s.maxHull * 1.1 + 50); s.hull = s.maxHull; }
  if (stat === 'range') s.range += 15;
  if (stat === 'regen') s.regen += 1.5;
  if (stat === 'crit') s.critCh += 0.02;
  if (stat === 'volley') s.volley += 1;
  if (stat === 'bounce') s.bounce += 1;
  return true;
}

// First-run player policy: spend flux on the cheapest affordable upgrade.
function spendFlux(s) {
  for (;;) {
    const order = ['dmg', 'rate', 'maxHull'];
    const afford = order.filter(st => s.flux >= upgradeCost(st, s.levels[st] ?? 0));
    if (!afford.length) return;
    afford.sort((a, b) => upgradeCost(a, s.levels[a] ?? 0) - upgradeCost(b, s.levels[b] ?? 0));
    if (!buyUpgrade(s, afford[0])) return;
  }
}

function run() {
  const s = freshState();
  let wall = -1, stalled = false, lastLoggedWave = 0;
  while (s.wave <= MAX_WAVE) {
    const waveStart = s.wave;
    let ticks = 0;
    while (s.wave === waveStart && s.hull > 0 && ticks < TICKS_PER_WAVE_CAP) {
      tickSim(s, DT);
      ticks++;
    }
    if (s.hull <= 0) { wall = waveStart; break; }
    if (ticks >= TICKS_PER_WAVE_CAP) { wall = waveStart; stalled = true; break; }
    // Wave cleared: auto-pick augment (Split rounds, mirrors applyAugment)
    if (s.pendingAugment) {
      s.augments.push(s.pendingAugment[0]);
      s.pendingAugment = null;
      s.dmg = Math.round(s.dmg * 1.1 + 1);
    }
    spendFlux(s);
    if (s.wave - lastLoggedWave >= 10 || s.wave <= 3) {
      console.log(`wave=${s.wave} hull=${Math.round(s.hull)}/${s.maxHull} dmg=${s.dmg} rate=${s.rate} ` +
        `dps~${Math.round(s.dmg * s.rate)} flux=${Math.round(s.flux)} levels=${JSON.stringify(s.levels)} essence=${s.essence}`);
      lastLoggedWave = s.wave;
    }
  }
  if (wall === -1) {
    console.log(`RESULT: no wall within ${MAX_WAVE} waves (hull=${Math.round(s.hull)}). Spec target: ${WALL_LO}-${WALL_HI}.`);
    console.log('VERDICT: FAIL (over-tuned: no wall in range)');
    process.exit(1);
  }
  const pass = wall >= WALL_LO && wall <= WALL_HI && !stalled;
  console.log(`RESULT: wall at wave ${wall}${stalled ? ' (STALL guard tripped)' : ''}. Spec target: ${WALL_LO}-${WALL_HI}.`);
  const academyOk = academyProjection();
  console.log(`VERDICT: ${pass && academyOk ? 'PASS' : 'FAIL'}`);
  process.exit(pass && academyOk ? 0 : 1);
}

// --- src/state/training.ts researchTime (verbatim formula: 60 x 1.6^level) ---
function researchTime(level) { return Math.round(60 * Math.pow(1.6, level)); }

// --- tower-labs Task 3: per-line research clock (mirrors lineResearchTime +
// labSpeedMult in src/state/training.ts with LAB_* values from
// src/sim/balance.ts: floor 30s, celerity timeMult 1.6, +4%/level speed) ---
const LAB_MIN_SECS = 30;
const LAB_CELERITY_TIME_MULT = 1.6;
const LAB_CELERITY_PCT = 0.04;
function lineTime(timeMult, level) { return Math.max(LAB_MIN_SECS, Math.round(researchTime(level) * timeMult)); }

// 30-day academy projection (Task 4): single thread t0 always busy,
// researching logistics 0->4 then engineering 0->4 back-to-back. Command-gated
// extra threads only speed this up, so this is the conservative schedule.
// Celerity (best-150 gate) cannot move the early x2/x4 dates — it is projected
// separately below as an effective-rate long-run segment (info only).
function academyProjection() {
  let t = 0; // seconds of single-thread research
  const toLevel = (from, target) => { for (let l = from; l < target; l++) t += researchTime(l); };
  toLevel(0, 1); const x2s = t; // logistics 1 -> x2 speed
  toLevel(1, 4); const x4s = t; // logistics 4 -> x4 speed
  toLevel(0, 4); const afs = t; // engineering 4 -> auto-forge
  const day = (s) => s / 86400;
  console.log(`ACADEMY: x2 at ${x2s}s (day ${day(x2s).toFixed(3)}), x4 at ${x4s}s (day ${day(x4s).toFixed(3)}), auto-forge at ${afs}s (day ${day(afs).toFixed(3)}).`);
  const ok = day(x2s) <= 1 && day(x4s) <= 3;
  console.log(`ACADEMY VERDICT: ${ok ? 'PASS' : 'FAIL'} (need x2 day<=1, x4 day<=3)`);
  // Long-run celerity segment: celerity 0->10 researched back-to-back once the
  // best-150 gate is met, each level's wall time discounted by the effective
  // rate earned so far (1 + 0.04 x completed celerity). Research is zero-meta
  // for the combat wall, so this never feeds the wall verdict.
  let ct = 0, cMult = 1;
  for (let l = 0; l < 10; l++) { ct += lineTime(LAB_CELERITY_TIME_MULT, l) / cMult; cMult = 1 + LAB_CELERITY_PCT * (l + 1); }
  console.log(`CELERITY: 0->10 in ${Math.round(ct)}s (day ${day(ct).toFixed(3)}) at compounding effective rate 1.00->${cMult.toFixed(2)}.`);
  return ok;
}

run();
