// Headless balance check (Task 6, spec §4): simulate up to 1000 waves in Node,
// assert the first-run wall lands at waves 80-120. Logs progress + verdict.
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
//   (BASE imported from balance.ts: dmg 15/1.24, rate 22/1.28,
//   maxHull 20/1.26; dmg*1.12+2 rounded, rate+0.08, maxHull*1.1+50
//   rounded with full heal on buy).
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
const WALL_LO = 80;
const WALL_HI = 120;
const TICKS_PER_WAVE_CAP = 60 * 600; // 10 sim-minutes/wave stall guard

// --- src/sim/balance.ts (verbatim) ---
function costFor(base, growth, level) { return Math.round(base * Math.pow(growth, level)); }
function enemyHp(wave) { return Math.round(10 * Math.pow(1.05, wave) + Math.pow(wave, 1.25)); }
function enemyDmg(wave) { return Math.round(2 * Math.pow(1.025, wave) * 10) / 10; }

// --- src/game/state.ts freshState (verbatim values) ---
function freshState() {
  return { wave: 1, hull: 500, maxHull: 500, flux: 0, dmg: 12, rate: 1, range: 180,
    ships: [], nextId: 1, _acc: 0, essence: 0, levels: {}, pendingAugment: null, augments: [],
    regen: 0, critCh: 0, volley: 0, bounce: 0, timeS: 0, _queue: 0, _timer: 0 };
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
      if (Math.random() < (s.critCh ?? 0)) dmg *= 2;
      t.hp -= dmg; hits++;
      if (t.hp <= 0) {
        s.flux += 6 + s.wave; if (t.cache) s.essence += t.essence * essenceMult;
        const chains = Math.floor((s.bounce ?? 0) / 2);
        for (let c = 0; c < chains; c++) {
          let best = null, bestD = Infinity;
          for (const o of s.ships) { if (o === t || o.hp <= 0) continue; const d2 = (o.x - 280) ** 2 + (o.y - 280) ** 2; if (d2 < bestD) { bestD = d2; best = o; } }
          if (!best) break;
          best.hp -= s.dmg * 0.5;
          if (best.hp <= 0) { s.flux += 6 + s.wave; if (best.cache) s.essence += best.essence * essenceMult; }
        }
      }
    }
    if (s.ships.some(x => x.hp <= 0)) s.ships = s.ships.filter(x => x.hp > 0);
  }
  s._acc = shots;
  for (const sh of s.ships) {
    const dx = 280 - sh.x, dy = 280 - sh.y, d = Math.hypot(dx, dy) || 1;
    if (sh.behavior === 'roamer') {
      const px = -dy / d, py = dx / d;
      const tt = (s.timeS ?? 0) + dt;
      const strafe = Math.sin((sh.wander ?? 0) + tt) * 40 * dt;
      sh.x += dx / d * sh.speed * dt + px * strafe; sh.y += dy / d * sh.speed * dt + py * strafe;
      sh.wander = (sh.wander ?? 0) + 1.5 * dt;
    } else {
      sh.x += dx / d * sh.speed * dt; sh.y += dy / d * sh.speed * dt;
    }
    if (d < 26) { s.hull -= sh.dmg * dt * 2; const alive = sh.hp > 0; sh.hp -= s.dmg * dt * 0.5;
      if (alive && sh.hp <= 0) { s.flux += 6 + s.wave; if (sh.cache) s.essence += sh.essence * essenceMult; } }
  }
  s.ships = s.ships.filter(x => x.hp > 0);
  s.hull = Math.min(s.maxHull, s.hull + (s.regen ?? 0) * dt);
  s.hull = Math.max(0, s.hull); s.timeS = (s.timeS ?? 0) + dt;
  if (s.ships.length === 0 && (s._queue ?? 0) <= 0) { s.wave += 1; }
}

// --- src/ui/panel.ts costs/effects (verbatim values, BASE from balance.ts) ---
const BASE = { dmg: { base: 15, growth: 1.24 }, rate: { base: 22, growth: 1.28 }, maxHull: { base: 20, growth: 1.26 }, range: { base: 25, growth: 1.35 }, regen: { base: 30, growth: 1.4 }, crit: { base: 60, growth: 1.5 }, volley: { base: 150, growth: 1.6 }, bounce: { base: 150, growth: 1.6 } };
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
  console.log(`VERDICT: ${pass ? 'PASS' : 'FAIL'}`);
  process.exit(pass ? 0 : 1);
}

run();
