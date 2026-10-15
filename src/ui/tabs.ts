// src/ui/tabs.ts — DOM-free store + catalog (guards for headless rendering live in hud.ts):
export type TabCat = { id: string; label: string; stats: readonly string[] };
export const FORGE_CATS: TabCat[] = [
  { id: 'weapons', label: 'Weapons', stats: ['dmg', 'rate', 'crit', 'volley', 'bounce'] },
  { id: 'hull', label: 'Hull', stats: ['maxHull', 'regen'] },
  { id: 'systems', label: 'Systems', stats: ['range'] },
];
export const WS_CATS: TabCat[] = [
  { id: 'batch1', label: 'Batch 1', stats: ['dmg', 'rate', 'maxHull', 'range'] },
  { id: 'batch2', label: 'Batch 2', stats: ['regen', 'crit', 'volley', 'bounce'] },
  { id: 'batch3', label: 'Batch 3', stats: ['essence', 'startFlux', 'bulkhead', 'scope'] },
  { id: 'ultimates', label: 'Ultimates', stats: [] },
];
let forgeTab = 'weapons', wsTab = 'batch1';
const valid = (cats: TabCat[], id: string): boolean => cats.some(c => c.id === id);
export function getForgeTab(): string { return forgeTab; }
export function setForgeTab(id: string): void { if (valid(FORGE_CATS, id)) forgeTab = id; }
export function getWsTab(): string { return wsTab; }
export function setWsTab(id: string): void { if (valid(WS_CATS, id)) wsTab = id; }
