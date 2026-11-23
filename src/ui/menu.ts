export type Phase = 'menu' | 'run' | 'over';
let phase: Phase = 'menu';
export function getPhase(): Phase { return phase; }
export function toMenu(): void { phase = 'menu'; render(); }
export function toRun(): void { phase = 'run'; render(); }
export function toOver(): void { phase = 'over'; render(); }
function el(id: string): HTMLElement | null { return typeof document === 'undefined' ? null : document.getElementById(id); }
function show(id: string, on: boolean): void { const n = el(id); if (n) n.hidden = !on; }
function render(): void {
  show('menu-overlay', phase === 'menu');
  show('over-overlay', phase === 'over');
  const g = el('layout');
  if (g) g.style.visibility = phase === 'menu' ? 'hidden' : 'visible';
  const tb = el('topbar');
  if (tb) tb.style.visibility = phase === 'menu' ? 'hidden' : 'visible';
  show('menu-view-home', _menuView === 'home');
  show('menu-view-workshop', _menuView === 'workshop');
  show('menu-view-academy', _menuView === 'academy');
  show('menu-view-board', _menuView === 'board');
  show('btn-back', _menuView !== 'home');
  for (const [id, on] of [['tab-menu-home', _menuView === 'home'], ['tab-menu-workshop', _menuView === 'workshop'], ['tab-menu-academy', _menuView === 'academy'], ['tab-menu-board', _menuView === 'board']] as const) {
    const b = el(id); if (b) b.classList.toggle('on', on);
  }
}
export type MenuView = 'home' | 'workshop' | 'academy' | 'board';
let _menuView: MenuView = 'home';
export function menuView(): MenuView { return _menuView; }
export function setMenuView(v: MenuView): void {
  if (v === 'home' || v === 'workshop' || v === 'academy' || v === 'board') { _menuView = v; render(); }
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
