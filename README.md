# Echo Spire

An infinite browser strategy game: defend your lone **space mothership** against waves of spacecrafts pouring from void rifts. Upgrade mid-run, research forever in the Lab, collapse timelines for cores, and stack ghost Echoes of your past runs.

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
| `npm test` | Full suite (Vitest, 32 tests) |
| `node scripts/sim.mjs` | Headless balance check — asserts first-run wall lands waves 80–120 |

## How a run works

1. **Menu** — Launch Mothership, or spend cores in the Workshop first.
2. **Run** — Enemies trickle in from shifting rifts (every 3rd ship strafes instead of bee-lining). Your guns fire automatically; spend Flux on Forge upgrades mid-fight. Every 10 waves pick 1-of-3 Augments. Rift Surges spawn golden Cache Ships worth Void Essence.
3. **Death at hull 0** — Run summary (wave, kills, Flux, Essence, time, cores earned) → Relaunch fresh or back to Menu. Collapse at wave 50+ for bonus cores.
4. **Meta** — Cores buy permanent Workshop tracks; the Lab researches in real time (offline gains capped at 12h); Echo ghost replays your best run beside you.

## Controls

- **x1 / x2 / x4 + Pause** — game speed, top dock. Auto-pauses when the tab hides.
- **Forge cards (in run, Flux)** — Railguns, Targeting, Hull, Range, Regen, Crit, Volley, Bounce. Each card shows description + current → next values; glowing cards are affordable.
- **Workshop cards (menu, cores)** — 12 tracks: 8 stat foundries + Essence Focus, Seed Vault (starting Flux), Bulkhead (hull), Far Scopes (range), grouped by category.
- **Collapse** — prestige once past wave 50.

## Project layout

```
src/
  game/    loop, update (sim tick), render (canvas), spawning, rifts, lifecycle, ships, echo
  sim/     balance.ts — ALL tuning lives here (costs, scaling, workshop tables)
  state/   save (localStorage), prestige, lab, workshop
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
