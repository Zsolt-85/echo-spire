// src/ui/tabs.ts — DOM-free store + catalog (guards for headless rendering live in hud.ts):
import type { Stat } from './panel.js';
export type TabCat = { id: string; label: string; stats: readonly string[] };
export const FORGE_CATS: TabCat[] = [
  { id: 'weapons', label: 'Weapons', stats: ['dmg', 'rate', 'crit', 'volley', 'bounce'] },
  { id: 'hull', label: 'Hull', stats: ['maxHull', 'regen'] },
  { id: 'systems', label: 'Systems', stats: ['range'] },
];
export const WS_CATS: TabCat[] = [
  { id: 'offense', label: 'Offense', stats: ['dmg', 'rate', 'crit', 'volley', 'bounce'] },
  { id: 'defense', label: 'Defense', stats: ['maxHull', 'bulkhead', 'regen'] },
  { id: 'systems', label: 'Systems', stats: ['range', 'scope', 'essence', 'startFlux'] },
];
let forgeTab = 'weapons', wsTab = 'offense';
const valid = (cats: TabCat[], id: string): boolean => cats.some(c => c.id === id);
export function getForgeTab(): string { return forgeTab; }
export function setForgeTab(id: string): void { if (valid(FORGE_CATS, id)) forgeTab = id; }
export function getWsTab(): string { return wsTab; }
export function setWsTab(id: string): void { if (valid(WS_CATS, id)) wsTab = id; }
