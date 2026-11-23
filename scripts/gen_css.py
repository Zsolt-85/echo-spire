"""Append menu-hub / overlay / lab styles + restore reduced-motion block.
Safe to run repeatedly (idempotent marker checks, one marker per feature block)."""
import io, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(ROOT, 'src/style.css')
d = io.open(p, encoding='utf-8').read()

MARK = '/* ===== MENU HUB ===== */'
if MARK in d:
    print('menu hub styles already present; skipping base block')
else:
    CSS = '''
/* ===== MENU HUB ===== */
.brand{min-width:0;}
.menu-tabs{display:flex;gap:8px;margin:18px 0 0;}
.menu-tabs button{flex:1;min-height:46px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#cbd5e1;font-family:Orbitron,system-ui,sans-serif;font-size:13px;letter-spacing:1px;cursor:pointer;transition:background 200ms ease,border-color 200ms ease,color 200ms ease,box-shadow 200ms ease;}
.menu-tabs button:hover{border-color:var(--neon);color:#fff;}
.menu-tabs button.on{background:linear-gradient(90deg,#5eead4,#a78bfa);color:#04211d;font-weight:700;border-color:transparent;box-shadow:0 0 16px rgba(94,234,212,.4);}
.menu-tabs button:focus-visible,.cta:focus-visible,.hub-btn:focus-visible,.btn-back:focus-visible,.tabbar button:focus-visible,.card-buy:focus-visible,#dock button:focus-visible,#ult-fire button:focus-visible{outline:2px solid var(--neon);outline-offset:2px;}
.hub-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-top:16px;}
.hub-card{background:rgba(255,255,255,.04);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.10);border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:10px;}
.hub-card-title{font-family:Orbitron,system-ui,sans-serif;font-weight:700;font-size:14px;letter-spacing:1px;color:#fff;}
.hub-card-desc{margin:0;font-size:13px;line-height:1.55;color:#94a3b8;}
.hub-btn{min-height:48px;padding:12px 22px;font-family:Orbitron,system-ui,sans-serif;font-weight:700;font-size:14px;letter-spacing:1px;color:#04211d;background:linear-gradient(90deg,#5eead4,#38bdf8);border:none;border-radius:12px;cursor:pointer;box-shadow:0 0 14px rgba(94,234,212,.4);transition:transform 200ms ease,box-shadow 200ms ease;}
.hub-btn:hover{transform:translateY(-1px);box-shadow:0 0 22px rgba(94,234,212,.6);}
.hub-btn.ghost{background:rgba(255,255,255,.06);color:#e2e8f0;border:1px solid rgba(255,255,255,.14);box-shadow:none;}
.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0;}
.stat-grid div{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:8px 10px;}
.stat-grid dt{font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#64748b;}
.stat-grid dd{margin:2px 0 0;font-family:'JetBrains Mono',monospace;font-size:16px;color:var(--neon);}
.teaser{margin:12px 0 0;font-size:12.5px;color:#94a3b8;font-family:'JetBrains Mono',monospace;}
.btn-back{min-height:44px;margin-top:18px;padding:10px 20px;background:rgba(255,255,255,.05);color:#e2e8f0;border:1px solid rgba(255,255,255,.14);border-radius:10px;cursor:pointer;font-size:13px;transition:border-color 200ms ease;}
.btn-back:hover{border-color:var(--neon);}

/* ===== LAB / ACADEMY ===== */
.lab-host{display:flex;flex-direction:column;gap:8px;margin-top:16px;}
.lab-subhead{font-size:12px;letter-spacing:2px;color:#64748b;margin:20px 0 8px;}
.lab-card-cur-next{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--neon);}
.lab-host .card.silhouette{border-style:dashed;opacity:.7;}
.lab-host .card-buy{width:100%;}

/* ===== PANELS ===== */
.forge-host{display:flex;flex-direction:column;gap:8px;}
.panel-head{font-size:11px;letter-spacing:2px;color:#64748b;margin:14px 0 8px;}
.tab{min-height:44px;}
#ult-fire{display:flex;gap:6px;}
#ult-fire button{flex:1;min-height:44px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:#e2e8f0;font-family:'JetBrains Mono',monospace;font-size:12px;cursor:pointer;transition:background 200ms ease,border-color 200ms ease;}
#ult-fire button:hover:not(:disabled){border-color:var(--neon);}
#ult-fire button:disabled{opacity:.4;cursor:not-allowed;}
#ult-fire button.on{background:linear-gradient(90deg,#5eead4,#a78bfa);color:#04211d;font-weight:700;border-color:transparent;}

/* ===== OVERLAYS ===== */
#over-overlay{position:fixed;inset:0;background:rgba(3,6,12,.92);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:30;padding:20px;}
.over-card{background:rgba(11,18,32,.96);border:1px solid var(--neon);border-radius:18px;padding:28px;min-width:320px;max-width:440px;text-align:center;box-shadow:0 0 40px rgba(94,234,212,.18);}
.over-card h2{margin:0 0 6px;font-size:20px;letter-spacing:3px;color:#fff;}
.over-peak{margin:0 0 18px;font-family:'JetBrains Mono',monospace;font-size:15px;color:var(--neon);}
.over-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:10px;margin:0 0 20px;}
.over-stats div{background:rgba(255,255,255,.04);border-radius:10px;padding:10px 6px;}
.over-stats dt{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#64748b;}
.over-stats dd{margin:4px 0 0;font-family:'JetBrains Mono',monospace;font-size:17px;color:#fff;}
.over-actions{display:flex;gap:10px;justify-content:center;}
.over-actions .hub-btn{flex:1;}
#augment-modal{position:fixed;inset:0;background:rgba(2,4,8,.78);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:40;padding:20px;}
.modal-card{background:rgba(11,18,32,.97);border:1px solid var(--neon);border-radius:16px;padding:22px;min-width:300px;max-width:420px;}
.modal-card h3{margin:0 0 14px;font-size:15px;letter-spacing:2px;}
#augment-opts{display:flex;flex-direction:column;gap:8px;}
#augment-opts button{min-height:46px;padding:12px 14px;text-align:left;background:rgba(255,255,255,.05);color:#e2e8f0;border:1px solid rgba(255,255,255,.14);border-radius:10px;cursor:pointer;font-size:13px;transition:background 200ms ease,border-color 200ms ease;}
#augment-opts button:hover{border-color:var(--neon);background:rgba(94,234,212,.08);}

/* ===== REDUCED MOTION (accessibility) ===== */
@media (prefers-reduced-motion:reduce){
  .cta::after{animation:none;}
  .card,.card-buy,.hub-btn,.menu-tabs button,.tabbar button,#dock button,#ult-fire button,#augment-opts button,.btn-back,.lab-progress-fill,.ult-charge-fill{transition:none;}
  .hub-btn:hover{transform:none;}
}
'''
    d = d.rstrip('\n') + '\n' + CSS
    print('appended', len(CSS), 'chars of CSS')

# Competitive layer: echo HUD pill + share button. Kept in its own marker block
# so later tasks can extend this generator without dropping these rules.
GHOST_MARK = '/* ===== GHOST / SHARE ===== */'
if GHOST_MARK in d:
    print('ghost/share styles already present; nothing to do')
else:
    GHOST_CSS = '''
/* ===== GHOST / SHARE ===== */
#hud-ghost{color:#c4b5fd;font-weight:700;}
#btn-share{background:linear-gradient(90deg,#8b5cf6,#a78bfa);border-color:transparent;color:#fff;box-shadow:0 0 14px rgba(167,139,250,.4);}
#btn-share:hover{box-shadow:0 0 22px rgba(167,139,250,.6);}
#btn-share:focus-visible{outline:2px solid #c4b5fd;outline-offset:2px;}
'''
    d = d.rstrip('\n') + '\n' + GHOST_CSS
    print('appended', len(GHOST_CSS), 'chars of ghost/share CSS')

# Competitive layer Task 7: daily card + leaderboard board rows. Separate marker
# block so earlier generated rules (including ghost/share) are never dropped.
BOARD_MARK = '/* ===== DAILY / BOARD ===== */'
if BOARD_MARK in d:
    print('daily/board styles already present; nothing to do')
else:
    BOARD_CSS = '''
/* ===== DAILY / BOARD ===== */
.daily-meta{font-family:'JetBrains Mono',monospace;font-size:12px;color:#c4b5fd;min-height:16px;}
.board-head{font-size:12px;letter-spacing:2px;color:#94a3b8;margin:18px 0 0;}
.board-host{display:flex;flex-direction:column;gap:8px;margin-top:12px;}
.board-row{min-height:46px;padding:10px 14px;text-align:left;background:rgba(255,255,255,.05);color:#e2e8f0;border:1px solid rgba(255,255,255,.14);border-radius:10px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:13px;transition:background 200ms ease,border-color 200ms ease;}
.board-row:hover{border-color:#c4b5fd;background:rgba(167,139,250,.10);}
.board-row:focus-visible{outline:2px solid #c4b5fd;outline-offset:2px;}
#board-status{min-height:18px;}
'''
    d = d.rstrip('\n') + '\n' + BOARD_CSS
    print('appended', len(BOARD_CSS), 'chars of daily/board CSS')

with io.open(p, 'w', encoding='utf-8', newline='\n') as f:
    f.write(d)
