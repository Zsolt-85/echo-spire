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
}
export function showMenu(best: number): void {
  toMenu();
  const b = el('menu-best'); if (b) b.textContent = String(best);
}
export function showGameOver(sum: { wave:number; kills:number; fluxEarned:number; essenceEarned:number; timeS:number; coresGained:number }): void {
  toOver();
  const set = (id: string, v: string | number) => { const n = el(id); if (n) n.textContent = String(v); };
  set('over-wave', sum.wave); set('over-kills', sum.kills); set('over-flux', sum.fluxEarned);
  set('over-essence', sum.essenceEarned); set('over-time', Math.round(sum.timeS) + 's'); set('over-cores', sum.coresGained);
}
export function hideOverlays(): void { toRun(); }
