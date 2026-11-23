// Leaderboard board UI (competitive layer, Task 7). Pure DOM rendering: the
// caller owns the client, ghost selection, and run lifecycle.
import type { RunEntry } from '../api/leaderboard.js';

/** One button per entry; picking rows is how a player arms a ghost to race. */
export function renderBoard(host: HTMLElement, entries: RunEntry[], onPick: (id: string) => void): void {
  if (typeof document === 'undefined') return;
  host.replaceChildren();
  for (const e of entries) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'board-row';
    row.textContent = `${e.playerName} — Wave ${e.best}`;
    row.addEventListener('click', () => onPick(e.id));
    host.appendChild(row);
  }
}

/** Daily card readout: the shared UTC date plus this player's local best. */
export function renderDailyCard(host: HTMLElement, date: string, best: number): void {
  host.textContent = `Daily ${date} — your best: Wave ${best}`;
}
