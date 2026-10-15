# Echo Spire

An infinite browser strategy game: defend your lone **space mothership** against waves of spacecrafts pouring from void rifts. Upgrade mid-run, research forever in the Training Academy, collapse timelines for cores and Stellar Shards, and stack ghost Echoes of your past runs.

## Run it

```powershell
cd "C:\Projects\Browser game"
npm install
npm run dev
```

Open the printed URL (usually http://localhost:5173). Keep that terminal open while playing.

| Script | What |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Static build into `dist/` |
| `npm test` | Full suite (Vitest, 91 tests) |
| `node scripts/sim.mjs` | Headless balance check — asserts first-run wall lands waves 40–60 + Academy projection |

## How a run works

1. **Menu** — Launch Mothership, or spend cores in the Workshop first.
2. **Run** — Enemies trickle in from shifting rifts (every 3rd ship strafes instead of bee-lining). Your guns fire automatically; spend Flux on Forge upgrades mid-fight. Every 10 waves pick 1-of-3 Augments. Rift Surges spawn golden Cache Ships worth Void Essence.
3. **Death at hull 0** — Run summary (wave, kills, Flux, Essence, time, cores earned) → Relaunch fresh or back to Menu. Collapse at wave 50+ for bonus cores.
4. **Meta** — Cores buy permanent Workshop tracks; the Training Academy researches in real time (offline gains capped at 12h); Echo ghost replays your best run beside you.

## Controls

- **x1 / x2 / x4 + Pause** — game speed, top dock. Auto-pauses when the tab hides.
- **Forge cards (in run, Flux)** — Railguns, Targeting, Hull, Range, Regen, Crit, Volley, Bounce. Each card shows description + current → next values; glowing cards are affordable.
- **Workshop cards (menu, cores)** — 12 tracks in 3 invest batches (Batch 1 open: dmg/rate/maxHull/range; Batch 2 at 100 lifetime core-equivalent: regen/crit/volley/bounce; Batch 3 at 500: essence/startFlux/bulkhead/scope). Locked batches show live invest progress; lifetime spend counts workshop + research + ult shards. Menu scrolls with a sticky Launch bar; the arena stays visible behind it.
- **Collapse** — prestige once past wave 50.
- **Retreat** — end the current run any time from the dock; same summary screen as death.
- **Fresh start** — open the game with `?fresh=1` once (e.g. http://localhost:5173/?fresh=1) to wipe the save and boot clean, or use Wipe all data in the menu.
- **Ultimates** — kills charge the dock meter 0–100 (+2 per kill, +10 per Cache kill). Unlock each ultimate once in the Workshop Ultimates tab for Stellar Shards (Nova 2, Overdrive 3, Aegis 5). Fire buttons in the dock enable only at full charge + unlocked: Nova Burst deals 10x dmg to every ship on screen, Overdrive triples rate for 8s, Aegis blocks all hull damage for 12s. Charge resets each run; unlocks persist.

## Economy (slow infinite grind)

- **Forge costs** (mid-run, Flux) — base costs roughly tripled vs launch: dmg 30/1.32, rate 44/1.36, maxHull 40/1.34, range 50/1.43, regen 60/1.48, crit 120/1.58, volley/bounce 300/1.68.
- **Kill income** — explicit `3 + floor(wave / 2)` Flux per kill; HUD shows per-kill + Flux/min.
- **Enemy curve** — HP bends up past wave 40 (continuous at 40), contact DPS quadrupled. Expect a stall ~wave 30, first collapse window 40–60.
- **Essence audit** — only golden Cache-ship kills grant essence; no other source.

## Laboratory (102-line research ladder)

- 102 research lines in 10 families, weakest first: **Gunnery** 10, **Hull** 11, **Sensors** 11, **Salvage** 11, **Command** 10, **Mastery** 10, **Riftcraft** 9, **Aegis** 10, **Echoes** 10, **Exotics** 10.
- Families unlock by best wave (Gunnery/Hull open, Sensors 30, Salvage/Command 60, Mastery 100, Riftcraft 150, Aegis/Echoes 250, Exotics 400); lines inside an unlocked family may need a higher personal best (gate shown on the card). Locked families render as sealed silhouette cards with live progress ("Best 42 / 60"); locked lines render dimmed + disabled and refuse to start.
- Cost per level: `(1 + floor(level / 3))` cores upfront, discounted by Thrift (−2%/level, shown thrift-correct on every card); time is `max(30s, 60 × 1.6^level × lineMult)` seconds of real time (offline progress capped at 12h). Up to 4 research threads; threads 1–3 unlock at Command 2 / 4 / 6. One active research per thread.
- **Switching** banks the interrupted research's invested time (cores are sunk — resume costs cores again; one bank slot per thread, a new switch discards the older bank). **Auto** toggle chains level+1 of the same line while cores afford, else the thread idles. **History** lists the last 50 completions.
- **Grandfathering** — old saves keep every level (Engineering moved under Mastery: its levels still apply, only new Engineering research needs Best 100). Locked-but-leveled lines show "Lv N kept".
- New mechanics fed by the ladder: thorns reflect, shield absorb pool (refills on launch), kill splash, crit multiplier, slow fields (capped 50%), boss damage bonus, cache luck + quality, ult charge rate. Echo-damage, spawn-gap, surge/herald-luck lines are researched now and take effect in later updates.

## Stellar Shards (ultimate currency)

- **Sources** — Dreadnought bosses (every 25th wave, 10x HP / 3x dmg, count outside the wave budget) drop exactly 1 shard; collapsing past wave 50 grants `floor(sqrt(wave) / 10)` bonus shards. Normal kills drop 0.
- **Costs** — Nova 2, Overdrive 3, Aegis 5 shards. Unlocks persist; charge still resets each run.

> **Save v2 reset note** — the grind-economy rebalance moved saves to version 2. Version-1 payloads refuse to load; the menu shows an "Economy rebalanced — fresh start" notice and the stale bytes are wiped (backup follows on next persist).

```
src/
  game/    loop, update (sim tick), render (canvas), spawning, rifts, lifecycle, ships, echo
  sim/     balance.ts — ALL tuning lives here (costs, scaling, workshop tables)
  state/   save (localStorage), prestige, training, workshop
  ui/      hud, panel, cards (descriptions), menu (phases + overlays)
  api/     leaderboard stub (offline-first, backend later)
scripts/   sim.mjs — headless 1000-wave balance check
tests/     Vitest suites mirroring every system
docs/      specs + implementation plans per feature
design-system/  persisted UI direction (cyan→violet neon, glassmorphism, Orbitron/JetBrains Mono)
mockup-ui*.html  UI concept iterations (v4 = mothership direction)
```

## Docs (kept current)

- Spec: `docs/superpowers/specs/2026-10-13-echo-spire-design.md`
- Plans: `docs/superpowers/plans/` — one file per feature wave, each ending in reviewed, tested commits.

> This README is maintained with every change — new systems, controls, and scripts land here when they land in the game.
