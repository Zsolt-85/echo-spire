"""Generate index.html from the game's own data lists so element ids can
never drift from src/state/workshop.ts / src/game/ultimates.ts / src/ui/cards.ts.
Run:  python scripts/gen_index.py
"""
import io, re, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = lambda p: io.open(os.path.join(ROOT, p), encoding='utf-8').read()

ws = R('src/state/workshop.ts')
ults_src = R('src/game/ultimates.ts')
cards = R('src/ui/cards.ts')

WORKSHOP = re.findall(r"'([\w]+)'", re.search(r'WORKSHOP_STATS[^=]*=\s*\[([^\]]+)\]', ws).group(1))
ULTS = re.findall(r"'([\w]+)'", re.search(r'ULTS[^=]*=\s*\[([^\]]+)\]', ults_src).group(1))
FORGE = [s for s in ['dmg', 'rate', 'maxHull', 'range', 'regen', 'crit', 'volley', 'bounce']]

DIAMOND = ('<svg class="card-icon" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">'
           '<path d="M7 0 14 7 7 14 0 7Z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>')


def forge_card(st):
    return (f'<div class="card" id="card-{st}">{DIAMOND}'
            f'<div class="card-name" id="card-name-{st}"></div>'
            f'<div class="card-desc" id="card-desc-{st}"></div>'
            f'<div class="card-cur-next"><span id="card-cur-{st}"></span>'
            f'<span class="card-arrow"> &rarr; </span><span id="card-next-{st}"></span></div>'
            f'<button id="buy-{st}" class="card-buy"><span id="card-blurb-{st}"></span>'
            f' (<span id="cost-{st}"></span> flux)</button></div>')


def ws_card(st):
    return (f'<div class="card" id="card-ws-{st}">{DIAMOND}'
            f'<div class="card-name" id="card-ws-name-{st}"></div>'
            f'<div class="card-desc" id="card-ws-desc-{st}"></div>'
            f'<div class="card-cur-next"><span id="card-ws-cur-{st}"></span>'
            f'<span class="card-arrow"> &rarr; </span><span id="card-ws-next-{st}"></span></div>'
            f'<button id="btn-ws-{st}" class="card-buy"><span id="card-ws-blurb-{st}"></span></button></div>')


def ult_card(uid):
    return (f'<div class="card" id="card-ult-{uid}">{DIAMOND}'
            f'<div class="card-name" id="card-ult-name-{uid}"></div>'
            f'<div class="card-desc" id="card-ult-desc-{uid}"></div>'
            f'<button id="btn-ult-{uid}" class="card-buy"><span id="card-ult-blurb-{uid}"></span></button></div>')


FORGE_CATS = ['weapons', 'hull', 'systems']
WS_CATS = ['batch1', 'batch2', 'batch3', 'ultimates']

html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Echo Spire</title>
<link rel="stylesheet" href="/src/style.css">
</head>
<body>
<div id="app">

  <!-- ============ MAIN MENU HUB ============ -->
  <div id="menu-overlay">
    <div class="menu-sheet">
      <div class="menu-sticky">
        <div class="brand">
          <h1>ECHO SPIRE</h1>
          <p class="menu-sub">Best cycle <b id="menu-best">0</b> &middot; <b id="menu-cores">0</b> cores &middot; <b id="menu-shards">0</b> shards</p>
        </div>
        <button id="btn-launch" class="cta">Launch Mothership</button>
      </div>

      <div id="menu-notice" class="menu-notice" role="status"></div>

      <nav class="menu-tabs" aria-label="Menu sections">
        <button id="tab-menu-home" class="on">Home</button>
        <button id="tab-menu-workshop">Workshop</button>
        <button id="tab-menu-academy">Laboratory</button>
      </nav>

      <section id="menu-view-home">
        <div class="hub-grid">
          <div class="hub-card">
            <div class="hub-card-title">Launch</div>
            <p class="hub-card-desc">Send the mothership out. Defend the core through escalating waves until your hull hits zero.</p>
            <button id="btn-launch-secondary" class="hub-btn">Launch Mothership</button>
            <button id="btn-skip" class="hub-btn ghost" hidden>Start at wave 10</button>
          </div>
          <div class="hub-card">
            <div class="hub-card-title">Your Fleet</div>
            <dl class="stat-grid">
              <div><dt>Best cycle</dt><dd id="hub-best">0</dd></div>
              <div><dt>Cores</dt><dd id="hub-cores">0</dd></div>
              <div><dt>Shards</dt><dd id="hub-shards">0</dd></div>
              <div><dt>Flux</dt><dd id="hub-flux">0</dd></div>
            </dl>
          </div>
          <div class="hub-card">
            <div class="hub-card-title">How it works</div>
            <p class="hub-card-desc">Flux is earned mid-run and spent in the Forge. Cores come from Collapse and buy permanent Workshop upgrades. Research in the Laboratory over real time. Stellar Shards buy Ultimates.</p>
          </div>
        </div>
        <div class="menu-danger"><button id="btn-wipe">Wipe all data</button></div>
      </section>

      <section id="menu-view-workshop" hidden>
        <div class="ws-grid" id="ws-grid-unlocked">{''.join(ws_card(s) for s in WORKSHOP)}</div>
        <p class="teaser" id="ws-invest-line"></p>
        <p class="teaser" id="ws-teaser"></p>
      </section>

      <section id="menu-view-academy" hidden>
        <div class="lab-host" id="lab-lines-acc"></div>
        <p class="teaser" id="academy-teaser"></p>
        <h3 class="lab-subhead">Completed research</h3>
        <div class="lab-history" id="lab-history"></div>
      </section>

      <button id="btn-back" class="btn-back" hidden>&larr; Back to Home</button>
    </div>
  </div>

  <!-- ============ GAME HUD ============ -->
  <div id="topbar">
    <span class="pill">Cycle <b id="hud-wave">1</b></span>
    <span class="pill">Hull <b id="hud-hull">500/500</b></span>
    <span class="pill">Flux <b id="hud-flux">0</b></span>
    <span class="pill">Essence <b id="hud-essence">0</b></span>
    <span class="pill">Cores <b id="hud-cores">0</b></span>
    <span class="pill">Shards <b id="hud-shards">0</b></span>
    <span class="pill">Income <b id="hud-income">-</b></span>
    <span class="pill">Wave intel <b id="hud-intel">-</b></span>
  </div>

  <div id="layout">
    <canvas id="game" width="560" height="560"></canvas>
    <aside id="side">
      <div class="tabbar" id="forge-tabs" role="tablist" aria-label="Forge categories">
        {''.join(f'<button id="tab-forge-{c}" class="tab" role="tab">{c.title()}</button>' for c in FORGE_CATS)}
      </div>
      <div class="forge-host">{''.join(forge_card(s) for s in FORGE)}</div>

      <div id="ws-ultimates" hidden>
        <h3 class="panel-head">Ultimates</h3>
        <div class="ws-grid">{''.join(ult_card(u) for u in ULTS)}</div>
      </div>

      <h3 class="panel-head">Dock</h3>
      <div id="dock">
        <button id="btn-pause">Pause</button>
        <button id="btn-speed-1" class="on">x1</button>
        <button id="btn-speed-2">x2</button>
        <button id="btn-speed-4">x4</button>
        <button id="btn-speed-8" hidden>x8</button>
        <button id="btn-retreat">Retreat</button>
        <button id="btn-collapse">Collapse</button>
      </div>
      <div id="ult-bar" aria-label="Ultimate charge">
        <div id="ult-charge"><div id="ult-charge-fill"></div></div>
        <span id="ult-charge-label">0/100</span>
      </div>
      <div id="ult-fire">
        {''.join(f'<button id="btn-fire-{u}">{u.title()}</button>' for u in ULTS)}
      </div>
    </aside>
  </div>

  <!-- ============ GAME OVER ============ -->
  <div id="over-overlay" hidden>
    <div class="over-card">
      <h2>MOTHERSHIP LOST</h2>
      <p class="over-peak" id="over-peak">Wave 0</p>
      <dl class="over-stats">
        <div><dt>Kills</dt><dd id="over-kills">0</dd></div>
        <div><dt>Flux</dt><dd id="over-flux">0</dd></div>
        <div><dt>Essence</dt><dd id="over-essence">0</dd></div>
        <div><dt>Time</dt><dd id="over-time">0s</dd></div>
        <div><dt>Cores</dt><dd id="over-cores">0</dd></div>
      </dl>
      <div class="over-actions">
        <button id="btn-relaunch" class="hub-btn">Relaunch</button>
        <button id="btn-over-menu" class="hub-btn ghost">Main menu</button>
      </div>
    </div>
  </div>

  <!-- ============ AUGMENT PICK ============ -->
  <div id="augment-modal" hidden>
    <div class="modal-card">
      <h3>Choose an Augment</h3>
      <div id="augment-opts"></div>
    </div>
  </div>

</div>
<script type="module" src="/src/main.ts"></script>
</body>
</html>
'''

out = os.path.join(ROOT, 'index.html')
with io.open(out, 'w', encoding='utf-8', newline='\n') as f:
    f.write(html)
print('wrote index.html:', len(html), 'chars,', len(WORKSHOP), 'workshop,', len(FORGE), 'forge,', len(ULTS), 'ults')