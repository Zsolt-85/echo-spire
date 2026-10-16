import type {GameState} from '../game/state.js';
import {upgradeCost, type Stat} from './panel.js';
import {applyAugment} from '../game/rifts.js';
import {menuView} from '../ui/menu.js';
import {waveIntel} from '../game/spawning.js';
import {FORGE_CATS, WS_CATS, getForgeTab, getWsTab} from './tabs.js';
import {ULT_COST, ULT_CHARGE_MAX, fluxForKill, WAVESKIP_CMD, WS_BATCH_COST, type UltId} from '../sim/balance.js';
import {ULTS, canFire} from '../game/ultimates.js';
import {TRAIN_SKILLS, THREADS, RESEARCH_LINES, FAMILIES, lineLevel, researchCost, lineGate, familyProgress, wsBatchUnlocked, wsBatchOf, lifetimeCores, labWorkshopCostMult, labSpeedMult, trainingLevel, speedUnlocked, type LineId, type FamilyId} from '../state/training.js';
import {describeStat, describeWorkshop} from './cards.js';

function txt(id: string, v: string): void { const el = document.getElementById(id); if (el) el.textContent = v; }

const FORGE_STATS: Stat[] = ['dmg', 'rate', 'maxHull', 'range', 'regen', 'crit', 'volley', 'bounce'];

const ULT_META: Record<UltId, { name: string; desc: string }> = {
  nova: { name: 'Nova Burst', desc: '10x dmg to every ship on screen' },
  overdrive: { name: 'Overdrive', desc: 'Rate x3 for 8s' },
  aegis: { name: 'Aegis', desc: 'Invulnerable for 12s' },
};

function setAfford(cardId: string, btnId: string, afford: boolean): void {
  const card = document.getElementById(cardId);
  if (card) { card.classList.toggle('afford', afford); card.classList.toggle('dim', !afford); }
  const btn = document.getElementById(btnId) as HTMLButtonElement | null;
  if (btn) { btn.disabled = !afford; btn.classList.toggle('afford', afford); btn.classList.toggle('dim', !afford); }
}

export function renderHud(s: GameState): void {
  if (typeof document === 'undefined') return;
  const mv = menuView();
  const lv = (s as unknown as { levels?: Record<string, number> }).levels ?? {};
  txt('hud-wave', String(s.wave));
  txt('hud-hull', `${Math.max(0, Math.ceil(s.hull))}/${s.maxHull}`);
  txt('hud-flux', String(Math.floor(s.flux)));
  txt('hud-essence', String(s.essence ?? 0));
  txt('hud-cores', String(s.cores ?? 0));
  txt('hud-shards', String(s.shards ?? 0));
  txt('menu-cores', String(s.cores ?? 0));
  const perKill = fluxForKill(s.wave);
  const perMin = Math.round((s.fluxEarned ?? 0) / Math.max(1, s.timeS ?? 0) * 60);
  txt('hud-income', `+${perKill}/kill • ${perMin}/min`);
  const intel = waveIntel(s.wave);
  const hp = intel.hp >= 10000 ? (intel.hp / 1000).toFixed(1) + 'K' : String(intel.hp);
  txt('hud-intel', `${intel.count} ships • ${hp} HP • ${intel.dmg} dmg`);

  if (mv === 'workshop') {
    const w = (s as unknown as { workshop?: Record<string, number> }).workshop ?? {};
    const wmult = labWorkshopCostMult(s);
    const invested = lifetimeCores(s);
    txt('ws-invest-line', `Lifetime invested: ${invested} core-equivalent (workshop + research + ult shards)`);
    const wsgrid = document.getElementById('ws-grid-unlocked');
    if (wsgrid) {
      for (const st of WORKSHOP_STATS) {
        const d = describeWorkshop(st as WorkshopStat);
        const lvl = w[st] ?? 0;
        const batch = wsBatchOf(st);
        const open = wsBatchUnlocked(s, batch);
        const need = WS_BATCH_COST[batch - 1] ?? 0;
        const card = document.getElementById(`card-ws-${st}`);
        if (card) {
          card.style.display = open ? '' : 'none';
          if (open) {
            txt(`card-ws-name-${st}`, d.name);
            txt(`card-ws-desc-${st}`, d.desc);
            txt(`card-ws-cur-${st}`, d.cur(s));
            txt(`card-ws-next-${st}`, d.next(s));
            txt(`card-ws-blurb-${st}`, `Lv ${lvl} • ${workshopCost(st as WorkshopStat, lvl, wmult)} cores`);
            setAfford(`card-ws-${st}`, `btn-ws-${st}`, (s.cores ?? 0) >= workshopCost(st as WorkshopStat, lvl, wmult));
          } else {
            txt(`card-ws-blurb-${st}`, `Batch ${batch} — invest ${need} core-equiv (${invested}/${need})`);
            setAfford(`card-ws-${st}`, `btn-ws-${st}`, false);
          }
        }
      }
      const teaser = document.getElementById('ws-teaser');
      if (teaser) {
        const anyLocked = WORKSHOP_STATS.some(x => !wsBatchUnlocked(s, wsBatchOf(x)));
        teaser.style.display = anyLocked ? 'block' : 'none';
      }
    }
    const wsTabs = document.getElementById('ws-tabs');
    if (wsTabs) wsTabs.style.display = 'none';
    return;
  }

  if (mv === 'academy') {
    renderAcademy(s);
    const teaser = document.getElementById('academy-teaser');
    if (teaser) {
      const best = Math.max((s as unknown as { best?: number }).best ?? 0, s.wave ?? 0);
      const nextFam = FAMILIES.find(f => !familyProgress(s, f.id, best).unlocked);
      teaser.style.display = nextFam ? 'block' : 'none';
      if (nextFam) {
        const prog = familyProgress(s, nextFam.id, best);
        teaser.textContent = `Best ${prog.need} to reveal ${nextFam.id} — progress ${prog.have}/${prog.need}`;
      }
    }
    return;
  }

  const w = (s as unknown as { workshop?: Record<string, number> }).workshop ?? {};
  const wmult = labWorkshopCostMult(s);
  const invested = lifetimeCores(s);
  txt('ws-invest-line', `Lifetime invested: ${invested} core-equivalent (workshop + research + ult shards)`);
  for (const st of WORKSHOP_STATS) {
    const d = describeWorkshop(st as WorkshopStat);
    const lvl = w[st] ?? 0;
    const batch = wsBatchOf(st);
    const open = wsBatchUnlocked(s, batch);
    const need = WS_BATCH_COST[batch - 1] ?? 0;
    txt(`card-ws-name-${st}`, d.name);
    txt(`card-ws-desc-${st}`, d.desc);
    txt(`card-ws-cur-${st}`, d.cur(s));
    txt(`card-ws-next-${st}`, d.next(s));
    if (open) {
      txt(`card-ws-blurb-${st}`, `Lv ${lvl} • ${workshopCost(st as WorkshopStat, lvl, wmult)} cores`);
      setAfford(`card-ws-${st}`, `btn-ws-${st}`, (s.cores ?? 0) >= workshopCost(st as WorkshopStat, lvl, wmult));
    } else {
      txt(`card-ws-blurb-${st}`, `Batch ${batch} — invest ${need} core-equiv (${invested}/${need})`);
      setAfford(`card-ws-${st}`, `btn-ws-${st}`, false);
    }
    const card = document.getElementById(`card-ws-${st}`);
    if (card) card.setAttribute('aria-disabled', String(!open));
  }

  for (const st of FORGE_STATS) {
    const d = describeStat(st);
    const lvl = lv[st] ?? 0;
    const active = FORGE_CATS.find(c => c.id === getForgeTab()) ?? FORGE_CATS[0];
    const card = document.getElementById(`card-${st}`);
    if (card) card.style.display = (active.stats as readonly string[]).includes(st) ? '' : 'none';
    txt(`card-name-${st}`, d.name);
    txt(`card-desc-${st}`, d.desc);
    txt(`card-cur-${st}`, d.cur(s));
    txt(`card-next-${st}`, d.next(s));
    txt(`card-blurb-${st}`, upgradeBlurb(st, lvl));
    txt(`cost-${st}`, String(upgradeCost(st, lvl)));
    setAfford(`card-${st}`, `buy-${st}`, s.flux >= upgradeCost(st, lvl));
  }
  for (const c of FORGE_CATS) {
    const b = document.getElementById(`tab-forge-${c.id}`);
    if (b) b.classList.toggle('on', c.id === getForgeTab());
  }

  const wactive = WS_CATS.find(c => c.id === getWsTab()) ?? WS_CATS[0];
  for (const st of WORKSHOP_STATS) {
    const card = document.getElementById(`card-ws-${st}`);
    if (card) card.style.display = (wactive.stats as readonly string[]).includes(st as string) ? '' : 'none';
  }
  for (const c of WS_CATS) {
    const b = document.getElementById(`tab-ws-${c.id}`);
    if (b) {
      b.classList.toggle('on', c.id === getWsTab());
      const m = /^batch([123])$/.exec(c.id);
      if (m) {
        const batch = Number(m[1]);
        const need = WS_BATCH_COST[batch - 1] ?? 0;
        const open = wsBatchUnlocked(s, batch);
        b.textContent = open || need <= 0 ? c.label : `${c.label} (${invested}/${need})`;
        b.setAttribute('aria-disabled', String(!open));
      }
    }
  }
  const ultSec = document.getElementById('ws-ultimates');
  if (ultSec) ultSec.style.display = wactive.id === 'ultimates' ? '' : 'none';

  for (const id of ULTS) {
    const owned = !!s.ult?.[id];
    txt(`card-ult-name-${id}`, ULT_META[id].name);
    txt(`card-ult-desc-${id}`, ULT_META[id].desc);
    txt(`card-ult-blurb-${id}`, owned ? 'Owned' : `${ULT_COST[id]} shards`);
    setAfford(`card-ult-${id}`, `btn-ult-${id}`, !owned && (s.shards ?? 0) >= ULT_COST[id]);
  }
  const charge = Math.min(ULT_CHARGE_MAX, s.ultCharge ?? 0);
  const fill = document.getElementById('ult-charge-fill');
  if (fill) fill.style.width = `${Math.round(charge / ULT_CHARGE_MAX * 100)}%`;
  txt('ult-charge-label', `${Math.floor(charge)}/${ULT_CHARGE_MAX}`);
  for (const id of ULTS) {
    const btn = document.getElementById(`btn-fire-${id}`) as HTMLButtonElement | null;
    const ready = canFire(s, id);
    if (btn) { btn.disabled = !ready; btn.classList.toggle('on', ready); }
  }

  const sp = speedUnlocked(s);
  const b8 = document.getElementById('btn-speed-8');
  if (b8) b8.style.display = sp >= 8 ? '' : 'none';
  const skip = document.getElementById('btn-skip');
  if (skip) skip.style.display = trainingLevel(s, 'command') >= WAVESKIP_CMD ? '' : 'none';
  renderAugmentModal(s);
}

/** Augment picker (1-of-3 every 10 waves). Rebuilt only when the offer changes. */
function renderAugmentModal(s: GameState): void {
  const modal = document.getElementById('augment-modal');
  const box = document.getElementById('augment-opts');
  if (!modal || !box) return;
  const opts = s.pendingAugment;
  if (!opts || opts.length === 0) { modal.hidden = true; box.replaceChildren(); return; }
  modal.hidden = false;
  if (box.childElementCount === opts.length) return;
  box.replaceChildren();
  for (const o of opts) {
    const b = document.createElement('button');
    b.textContent = o;
    b.addEventListener('click', () => { applyAugment(s, o); renderAugmentModal(s); });
    box.appendChild(b);
  }
}

function renderAcademy(s: GameState): void {
  const host = document.getElementById('lab-lines-acc');
  if (!host) return;
  host.replaceChildren();
  const best = Math.max((s as unknown as { best?: number }).best ?? 0, s.wave ?? 0);
  for (const f of FAMILIES) {
    const prog = familyProgress(s, f.id, best);
    const lines = (RESEARCH_LINES as unknown as Record<string, { name: string; desc: string; fam: string }>);
    const famLines = Object.values(lines).filter(l => l.fam === f.id);
    const famDiv = document.createElement('div');
    famDiv.className = 'lab-fam';
    famDiv.textContent = prog.unlocked ? `${f.id} — ${famLines.length} lines — unlocked` : `${f.id} — ${famLines.length} lines — Best ${prog.need} to unlock`;
    host.appendChild(famDiv);
    if (!prog.unlocked) continue;
    for (const l of famLines) {
      const id = Object.keys(lines).find(k => lines[k] === l)!;
      const lvl = lineLevel(s, id as LineId);
      const gate = lineGate(id as LineId, best);
      const card = document.createElement('div');
      card.className = 'card' + (gate.unlocked ? '' : ' silhouette');
      const nm = document.createElement('div');
      nm.className = 'card-name';
      nm.textContent = l.name;
      const ds = document.createElement('div');
      ds.className = 'card-desc';
      ds.textContent = gate.unlocked ? l.desc : `Best ${gate.need} to unlock`;
      const row = document.createElement('div');
      row.className = 'lab-card-cur-next';
      row.textContent = `Lv ${lvl}/${(RESEARCH_LINES as unknown as Record<string, { max: number }>)[id]?.max ?? '?'}`;
      const buy = document.createElement('button');
      buy.className = 'lab-card-buy';
      buy.id = `btn-lab-${id}`;
      buy.textContent = gate.unlocked ? `Research — ${researchCost(id as LineId, lvl)} cores` : 'Locked';
      buy.disabled = !gate.unlocked;
      card.append(nm, ds, row, buy);
      host.appendChild(card);
    }
  }
}
