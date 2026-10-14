# Echo Spire — Design Doc (v1 minimal, expandable to complex)

Date: 2026-10-13
Status: approved v4 mothership direction
Project: C:\Projects\Browser game
Mockups: `mockup-ui-v3.html` (familiar layout, unique skin), `mockup-ui-v4.html` (APPROVED: mothership + spacecrafts + rift loot)

## 1. Vision
Browser-first infinite strategy idle game. Own IP, minimalistic but nice vector spacecraft art, clearly differentiated from The Tower.
- Name: **Echo Spire**
- Fantasy: lone **space mothership** (shield rings + engine glow) vs swarms of minimal enemy spacecrafts (darts, bombers, tanks). Spawns from 2-3 void rifts.
- Unique pillars: (1) Mothership + orbit drones, (2) Rifts that pop special events / Cache Ships dropping Void Essence + elements, (3) Echo ghost ship of past run, (4) Lab infinite research, (5) speed x1/x2/x4 + pause.
- Art rule: minimal geometric ships (SVG/Canvas paths, 3-5 shapes per ship), glow + particles for juice. Nice but cheap to render. Expand complexity later (factions, rift storms, talents) without rework.
- Phasing: v1 minimal (3 enemy types, 1 mothership, 1 echo, 1 special currency). Architecture reserves slots for complex systems.

Originality rule: no copied assets, names, text, or numbers. All art procedural (Canvas/SVG), all formulas original.

## 2. Core Loop
One cycle = infinite waves until hull 0. Death = cash out to meta, restart stronger.
1. Enemy spacecrafts spawn at Rifts A/B/C (positions rotate every 15 waves), fly toward mothership.
2. Mothership auto-fires railguns at nearest in range. Orbit drone adds focused DPS, focus hottest rift (auto default, manual later).
3. Kills grant Flux (in-cycle currency). Spend Flux on Forge upgrades mid-cycle.
4. Every 10 waves: pick 1-of-3 Augments (e.g. Split rounds bounce +1, Halo thorns, Crit surge).
5. Boss freighter every 10 waves with modifier (swift, shielded, splitting).
6. Rift events: every ~25 waves Rift Surge spawns golden Cache Ship (12s to kill) + loot pings. Drops Void Essence + elements (Alloy/Plasma stub v1, full use v2).
7. Collapse (prestige) at cycle 50+ for Cores → permanent power + echo slots.

Target run length: 10-20 min early game, hours late with offline gains.

## 3. Systems
### 3.1 Forge (in-cycle, Flux) — keep Tower-like mechanics, own names
Stats: Railguns (dmg), Targeting Core (atk speed), Sensor Range, Hull Plating (max HP), Nanobots (regen), Lucky Shot (crit), Volley (multishot), Split Rounds (bounce).
Cost: `cost = base * growth^level`, e.g. dmg base 20, growth 1.32. All in `balance.ts`.

### 3.2 Hangar / Foundry (permanent, between cycles)
Same stats + drone slots. Linear power, exponential cost. Never resets.

### 3.3 Laboratory (real-time, infinite) — unchanged mechanics
4 threads. Examples: Quantum Focus (+flux%/h), Lattice Study (+dmg%/h), Vitalism (+regen/h), Kismet (+crit/h).
Continues in real time + offline capped 12h v1. Cost = time, level time `t = 60 * 1.6^level` seconds.

### 3.4 Rifts + Loot (differentiator, expandable)
- 2-3 rifts on arena edge v1. Active weights shift 50/30/20 rotating.
- Rift Surge event table v1: 70% Cache Ship (Essence), 20% Element cache (Alloy/Plasma → Flux boost), 10% Elite pack. v2: rift storms, modifiers, choices.
- Special currency: Void Essence (echo slots + ultimates), elements reserved for Hangar crafting v2. Save fields now.
- v1: 1-2 drones, 3rd unlockable via Essence.

### 3.5 Echoes (ghost mothership)
- Save records best-cycle snapshot `{stats, augments, dpsCurve}`.
- v1: 1 echo ghost (translucent mothership) dealing 15% recorded DPS. Minimal art, same hull path dashed.
- v2+: stack 3, echo talents, echo vs echo leaderboard.

### 3.6 Speed / Pause
Fixed sim tick 60Hz decoupled from render. Speed multiplies ticks per frame (x1/x2/x4). Auto-pause on hidden tab. Deterministic.

## 4. Architecture
Stack: Vite + TypeScript + Canvas 2D sim + DOM UI (React-less v1, plain TS to keep minimal; migrate later if needed).

```
src/
  game/ loop.ts update.ts render.ts spawning.ts augments.ts
  sim/ balance.ts formulas.ts
  state/ save.ts prestige.ts echoes.ts
  ui/ hud.ts forgePanel.ts labPanel.ts
  api/ leaderboard.stub.ts
```

- `balance.ts` single source for all scaling. No magic numbers elsewhere.
- Enemy scaling v1: `hp = 12 * 1.18^cycle + cycle^2.1`, `dmg = 3 * 1.12^cycle`. Tuned so wall ~cycle 80-120 first runs. Verified by headless sim.
- Save: versioned JSON in localStorage key `echospire.save.v1`. Migration function per version. Offline gains on load.
- Leaderboard stub: `api/leaderboard.stub.ts` with `{playerId, bestCycle, buildHash}` upload interface, no backend v1.

## 5. UI
Layout per `mockup-ui-v4.html` (APPROVED): top stats (Cycle, Hull, Flux, Void Essence), center space arena (mothership + shield rings + rifts + minimal spacecrafts + loot pings), right cards (Battle/Hangar/Lab), bottom dock (pause, speed, collapse).
Style: deep space `#05070f`, starfield, glass cards, accent teal→blue→violet→pink. Ships = minimal SVG paths (mothership detailed, enemies 1-2 shapes each). No Tower-like flat circles.
Art pipeline: Canvas draws same SVG paths at runtime (single `ships.ts` path lib) so mockup = game. Pooling for 300 ships.
Mobile: arena top, cards bottom sheet. Canvas scales by devicePixelRatio.

## 6. Data Flow
`rift spawn → fly → hit hull → death → flux/essence → forge → render + HUD`. Sim emits events, UI subscribes. Rift event table rolls loot. No direct DOM writes from sim.

## 7. Error Handling / Fail-safes
- Save corrupt → backup slot + fresh start, toast.
- dt clamp 100ms, pause on hidden.
- Softlock detector: if 60s no kill + no Flux spend, hint toast.
- Version migration: unknown version → preserve + migrate, never wipe without backup.

## 8. Testing
- Unit: cost curves, enemy scaling, prestige formula.
- Headless: simulate 1000 cycles in Node, assert wall window + fps budget.
- Perf: 300 enemies @60fps on mid laptop, Canvas pooling, no per-frame alloc.
- Manual: pause/speed, offline 12h cap, collapse flow.

## 9. Scope / Non-goals v1 (minimal, expandable)
IN: single-player, local save, mothership + 3 enemy spacecraft types + Cache Ship, 2 rifts (+3rd at wave 60), 1 drone (+2nd unlock), 8 forge stats, 4 lab threads, Void Essence + 1 echo, stub leaderboard.
OUT (reserved for v2 complexity): factions, Hangar crafting with Alloy/Plasma, rift storms/choices, 3-stack echoes + talents, accounts/server leaderboard, multiplayer, sound (tiny WebAudio bleeps if time), IAP.

## 10. Future (complexity expansion)
Echo fleet (3 ghosts), rift storm modifiers, ship factions (Swarm/Cruiser/Dread), element crafting, seasons, real leaderboard.

## Approval
User approved v4 mothership + spacecrafts + rift-loot + essence on 2026-10-13. Mechanics locked Tower-like, visuals unique minimal. Next: implementation plan via writing-plans.
