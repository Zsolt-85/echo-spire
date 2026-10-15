export type Phase = 'menu' | 'run' | 'over';
let phase: Phase = 'menu';
export function getPhase(): Phase { return phase; }
export function toMenu(): void { phase = 'menu'; render(); }
export function toRun(): void { phase = 'run'; render(); }
export function toOver(): void { phase = 'over'; render(); }
function el(id: string): HTMLElement | null { return typeof document === 'undefined' ? null : document.getElementById(id); }
function render(): void {
  const m = el('menu-overlay'), o = el('over-overlay'), g = el('layout');
  if (m) m.style.display = phase === 'menu' ? 'flex' : 'none';
  if (o) o.style.display = phase === 'over' ? 'flex' : 'none';
  if (g) g.style.visibility = 'visible';
  const hv = el('menu-view-home'), wv = el('menu-view-workshop'), av = el('menu-view-academy');
  const bt = el('tab-menu-home'), bw = el('tab-menu-workshop'), ba = el('tab-menu-academy');
  const bb = el('btn-back');
  if (hv) hv.style.display = _menuView === 'home' ? 'block' : 'none';
  if (wv) wv.style.display = _menuView === 'workshop' ? 'block' : 'none';
  if (av) av.style.display = _menuView === 'academy' ? 'block' : 'none';
  if (bt) bt.classList.toggle('on', _menuView === 'home');
  if (bw) bw.classList.toggle('on', _menuView === 'workshop');
  if (ba) ba.classList.toggle('on', _menuView === 'academy');
  if (bb) bb.style.display = _menuView !== 'home' ? 'inline-block' : 'none';
}
export type MenuView = 'home' | 'workshop' | 'academy';
let _menuView: MenuView = 'home';
export function menuView(): MenuView { return _menuView; }
export function setMenuView(v: MenuView): void {
  if (v === 'home' || v === 'workshop' || v === 'academy') _menuView = v;
}
export function showMenu(best: number): void {
  toMenu();
  const b = el('menu-best'); if (b) b.textContent = String(best);
  render();
}
export function showGameOver(sum: { wave:number; kills:number; fluxEarned:number; essenceEarned:number; timeS:number; coresGained:number }, best = 0): void {
  toOver();
  const set = (id: string, v: string | number) => { const n = el(id); if (n) n.textContent = String(v); };
  set('over-wave', sum.wave); set('over-kills', sum.kills); set('over-flux', sum.fluxEarned);
  set('over-essence', sum.essenceEarned); set('over-time', Math.round(sum.timeS) + 's'); set('over-cores', sum.coresGained);
  // Peak-wave callout (grind-economy plan Task 4): best is the pre-run record
  // passed in by the caller, so `>` fires exactly on a new record.
  const p = el('over-peak');
  if (p) p.textContent = sum.wave > best ? `Wave ${sum.wave} — NEW BEST` : `Wave ${sum.wave}`;
}
export function hideOverlays(): void { toRun(); }
