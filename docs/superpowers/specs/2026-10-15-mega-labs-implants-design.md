# Mega-Labs + Implants Design (v3 Depth)

Date: 2026-10-15
Status: approved in chat (approach A, sections 1-3 + forks + Herald)
Project: C:\Projects\Browser game
Extends: `2026-10-14-economy-grind-design.md` (economy, Academy, shards — all stand). This spec adds the depth layer only.

## 1. Goal
Labs that change the game (100+ lines, 0.x each, invest-to-unlock ladders) + EVE-style ship implants (slots, blueprints, grades, upgrade forks, quality variance) + a rare Herald summon feeding a long-term grind. Mechanics inspired by genre conventions (Tower labs/modules, EVE implants); all names, numbers, text, and code original.

## 2. Lab ladder (invest-to-unlock)
- Ten families in fixed order: Gunnery → Hull → Sensors → Salvage → Command → Mastery → Riftcraft → Aegis → Echoes → Exotics. Data-driven catalog (one compact def per family generates its lines); ~100 lines at full count, 0.5-3% per level, caps 20-99.
- Workshop batches unlock by lifetime cores invested: Batch 1 open (dmg, rate, hull, range); Batch 2 at 100 (regen, crit, volley, bounce); Batch 3 at 500 (essence, startFlux, bulkhead, scope).
- Lab families unlock by best-wave progress: 30 → 60 → 100 → 150 → 250 → 400 across the ladder.
- Locked content renders as silhouettes with live progress ("68 / 100 cores", "Best 42 / 60").
- Existing 12 lines migrate into the first rungs with ids intact (saves keep levels).

## 3. New combat fields (engine work once, lines feed forever)
Thorns reflect %, shield absorb pool, kill splash radius, crit multiplier, slow field %, boss damage bonus, cache luck + quality, ult charge rate, dreadnought loot bonus, spawn trickle control. One stats pipeline (`recomputeStats`); no parallel math.

## 4. Implants
- 5 ship slots (Core/Weapon/Shield/Engine/Sensor), one implant each, free swapping, death-safe.
- Blueprints unlock via lab milestones; crafting costs cores + Stellar Shards.
- Grades Mk I-V (~x1.5 effect each), upgraded by paying the difference.
- Levels 1-20 (cores, Tower-style 0.x/level). Forks at 5/10/15/20: pick 1 of 3 permanent branches (new sub-effect, bigger numbers, or tradeoff). No respec by default; shard respec optional grind sink.
- Quality rolls on craft: Standard / Tuned (+10%) / Flawless (+25%).
- Example boosts: Nova Lattice (ult charge), Overload (+dmg/−range), Crit Coil (crit mult), Splinter (splash), Ablative (shield pool), Retribution (thorns), Slipstream (rate + slow), Bounty (boss dmg), Dowsing (cache essence/rate).

## 5. Herald summon + Relic Shards (rare event)
- Past wave 60, 12% per cycle for a Rift Anomaly (distinct rift, alert UI) summoning a Herald: huge HP, flees outward, race to kill.
- Kill drops Relic Shards — implant-only currency (forks, grades, quality rerolls, respec). Also trickles from high-wave milestones. Never purchasable, never offline.
- Currency separation: Flux (runs), Cores (workshop/labs), Essence (salvage), Stellar (ultimates), Relics (implants).

## 6. Integration + testing
- Implant effects fold through `recomputeStats`; Herald is a spawn type beside boss/cache (wave-clear untouched); fork/grade/quality persist in save with backup-slot treatment.
- Tests: sim wall + economy with zero implants (floor); fork accounting (no free levels, no double branches); Herald spawn/kill/drop rates over scripted waves.
- Non-goals: Echo fleet UI, leaderboard backend, sound, trading.

## 7. Build order
Plan 1: data-driven catalog + ladder + new combat fields. Plan 2: implants (slots/blueprints/grades/levels/forks/quality). Plan 3: Herald + Relics + integration tests.
