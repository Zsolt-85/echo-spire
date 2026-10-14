# Infinite-Grind Economy Design (v2 Economy)

Date: 2026-10-14
Status: approved in chat (approach A + sections 1-4)
Project: C:\Projects\Browser game
Supersedes (economy only): `2026-10-13-echo-spire-design.md` §§2-3 (loop numbers, Forge costs, Lab stub, ultimate costs). Fantasy, art direction, UI tokens, and architecture stand.

## 1. Problem
Live economy is loose: Lv31 Forge guns by wave 8, 499 essence with 0 cores, collapse unreachable-before-trivial. Lab + Echo exist as unwired math (no UI, tick, or save). Speeds x1-x4 are free from boot, so no progression hooks remain.

## 2. Goals
- Fresh runs stall at waves 25-35; first collapse lands waves 40-60.
- Dying is routine and legible; every cost reads as time.
- Training Academy (idle threads) is the slow parallel track; feature unlocks gate speed, auto-forge, wave-skip.
- Ultimates move to Stellar Shards (very rare); essence keeps salvage/engineering role.
- Shard sources stay tunable knobs; exact supply decided later.

## 3. Economy retune (Section 1)
- Forge: every BASE cost x2 base, growth +0.08. Flux per kill 6+wave → 3+floor(wave/2).
- Enemies: contact DPS x2; HP exponent 1.25 → 1.35 past wave 40 (piecewise, continuous at 40).
- Essence: cache-ship drops only; audit and remove the wave-8 flood source during implementation.
- Explicitness: topbar gains Flux/min + Flux-per-kill; intel strip stays; cards unchanged (cur → next already explicit).
- All numbers in `src/sim/balance.ts`. Sim wall target: first collapse at 40-60 with zero meta.

## 4. Training Academy (Section 2)
- New menu tab Academy; 4 threads reusing `labTime` (60 x 1.6^level s, offline 12h cap) and `labGain` shapes.
- Gunnery: +2% damage per thread level. Logistics: economy + speed gates (x2 @1, x4 @4, x8 @8). Engineering: regen, offline gains, auto-forge @4. Command: wave-skip @5, threads 2-4 unlocks.
- Thread 1 free; threads 2-4 via Command milestones. x1 always free. Speed mults are generic in `loop.setSpeed`, so x8 needs no engine change.
- Auto-forge (Engineering 4) = buys the cheapest affordable Forge track once per second while running. Wave-skip (Command 5) = runs may start at wave 10 with starting Flux only (no other meta mid-run change).
- Replaces the Lab concept: `lab.ts` math reused, dead code deleted, menu Lab references become Academy. Single source: `src/state/training.ts`, constants in balance.ts.

## 5. Stellar Shards (Section 3)
- New currency, topbar icon. Ultimate costs: Nova 2, Overdrive 3, Aegis 5 shards. Essence role unchanged otherwise.
- `shardIncome` from three weighted hooks (boss kills, collapse bonus, wave milestones), weights in balance.ts. Defaults: bosses every 25th wave = 1 shard; collapse = floor(sqrt(wave)/10); milestones = 0 (off).
- Rules: no normal-kill drops, no offline accrual, no refunds. Target: first Nova ≈ 1 week active play at defaults; calibrate in balance pass.
- Save: `shards` field with backup-slot treatment.

## 6. Death pacing, migration, testing (Section 4)
- Game-over gains peak-wave/new-best callout. Retreat unchanged (safe cash-out, cores only via coresFor as today).
- Clean break: saves version-stamped v2; v1 saves reset to fresh with an in-menu notice. No dual-economy code. ?fresh and wipe flows unchanged.
- Tests: sim first-collapse 40-60 zero-meta; 30-day idle Academy projection (schedule + unlocks); shard accounting (zero normal-kill drops); gate enforcement (x4 locked pre-Logistics-4); v1 → v2 reset.

## 7. Non-goals
- Echo fleet UI (still stub), leaderboard backend, new enemy factions, sound. Sim policy stays cheapest-affordable, ultimates excluded.
