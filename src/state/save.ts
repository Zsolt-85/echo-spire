export const SAVE_KEY = 'echospire.save.v1';
export const SAVE_VERSION = 1;
export const OFFLINE_CAP_HRS = 12;
export const OFFLINE_FLUX_PER_HR = 120;

export interface SaveData {
  v: number;
  wave: number;
  flux: number;
  essence: number;
  cores?: number;
  hull?: number;
  maxHull?: number;
  dmg?: number;
  rate?: number;
  range?: number;
  levels?: Record<string, number>;
  augments?: string[];
  ts: number;
  offlineFlux?: number;
}

const mem = new Map<string, string>();

function store(): { getItem(k: string): string | null; setItem(k: string, v: string): void } {
  try {
    const ls = (globalThis as any).localStorage;
    if (ls && typeof ls.getItem === 'function' && typeof ls.setItem === 'function') return ls;
  } catch {
    /* fall through to memory */
  }
  return {
    getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k: string, v: string) => void mem.set(k, v),
  };
}

function withOffline(d: any): any {
  const now = Date.now();
  const ts = typeof d.ts === 'number' ? d.ts : now;
  const elapsedHrs = Math.max(0, (now - ts) / 3600e3);
  const hrs = Math.min(OFFLINE_CAP_HRS, elapsedHrs);
  return { ...d, offlineFlux: Math.round(hrs * OFFLINE_FLUX_PER_HR) };
}

export function saveGame(s: any): void {
  try {
    const st = store();
    const snap = JSON.stringify({ ...s, ts: Date.now(), v: SAVE_VERSION });
    st.setItem(SAVE_KEY, snap);
    // Backup slot: never wipe without backup (§4 fail-safe).
    try {
      st.setItem(SAVE_KEY + '.bak', snap);
    } catch {
      /* primary saved; backup best-effort */
    }
  } catch {
    /* storage unavailable (private mode etc): never throw from save */
  }
}

export function loadGame(): any {
  const st = store();
  const read = (key: string): any | null => {
    let raw: string | null = null;
    try {
      raw = st.getItem(key);
    } catch {
      return null;
    }
    if (!raw) return null;
    try {
      const d = JSON.parse(raw);
      if (d === null || typeof d !== 'object') return null;
      return withOffline(d);
    } catch {
      return null;
    }
  };
  // Corrupt primary → fall back to backup slot, never wipe.
  return read(SAVE_KEY) ?? read(SAVE_KEY + '.bak') ?? null;
}
