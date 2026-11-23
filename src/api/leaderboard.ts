// Offline-first leaderboard client (competitive layer). The local client is
// the source of truth when no backend is configured; the HTTP client is an
// optional enhancement that degrades to safe empty results when offline.
// entryHash deters casual tampering only — it is not security.
import type { GhostTrace } from '../game/ghost.js';
import { encodeTrace, decodeTrace } from '../game/ghost.js';

export type RunEntry = {
  id: string;
  playerId: string;
  playerName: string;
  best: number;
  kills: number;
  durationMs: number;
  seed: number;
  dailyDate?: string;
  submittedAt: number;
  hash: string;
  hasTrace: boolean;
};

export type LeaderboardClient = {
  submit(entry: RunEntry, trace: GhostTrace | null): Promise<{ ok: boolean; id: string }>;
  list(o: { period: 'daily' | 'all'; dailyDate?: string; limit?: number }): Promise<RunEntry[]>;
  trace(id: string): Promise<GhostTrace | null>;
};

const BOARD_KEY = 'echospire.board.v1';

// Memory fallback for non-browser environments (tests, SSR). A module-level
// map keeps the local board alive even when localStorage is unavailable.
const mem = new Map<string, string>();

function store(): Pick<Storage, 'getItem' | 'setItem'> {
  try {
    if (typeof localStorage !== 'undefined' && localStorage &&
        typeof localStorage.getItem === 'function') {
      return localStorage;
    }
  } catch { /* access to localStorage can throw in some sandboxes */ }
  return {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
  };
}

// Deterministic FNV-1a-style string hash over the entry's canonical JSON.
// The hash field is excluded so hashing is idempotent (hash-of-hashed entry
// equals hash-of-entry) and cannot influence its own value.
export function entryHash(e: Omit<RunEntry, 'hash'>): string {
  const { hash: _ignored, ...rest } = e as RunEntry;
  const s = JSON.stringify(rest);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

// Static demo rows so the board is never empty on first launch. These are
// sample display data (names pinned by spec), not gameplay tuning values.
function demoEntries(): RunEntry[] {
  const rows: Omit<RunEntry, 'hash'>[] = [
    { id: 'demo-vango', playerId: 'demo-vango', playerName: 'Vango',
      best: 60, kills: 1200, durationMs: 900000, seed: 101, submittedAt: 1, hasTrace: false },
    { id: 'demo-nyx', playerId: 'demo-nyx', playerName: 'Nyx-7',
      best: 52, kills: 980, durationMs: 780000, seed: 202, submittedAt: 2, hasTrace: false },
    { id: 'demo-wall', playerId: 'demo-wall', playerName: 'The Wall',
      best: 48, kills: 860, durationMs: 720000, seed: 303, submittedAt: 3, hasTrace: false },
  ];
  return rows.map(r => ({ ...r, hash: entryHash(r) }));
}

type Board = { entries: RunEntry[]; traces: Record<string, string> };

function readBoard(): Board {
  const s = store();
  try {
    const raw = s.getItem(BOARD_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Board> | null;
      if (parsed && Array.isArray(parsed.entries)) {
        const traces = parsed.traces && typeof parsed.traces === 'object' ? parsed.traces : {};
        return { entries: parsed.entries, traces };
      }
    }
  } catch { /* corrupt board — reseed below */ }
  const seeded: Board = { entries: demoEntries(), traces: {} };
  try { s.setItem(BOARD_KEY, JSON.stringify(seeded)); } catch { /* ignore quota errors */ }
  return seeded;
}

function writeBoard(b: Board): void {
  try { store().setItem(BOARD_KEY, JSON.stringify(b)); } catch { /* ignore quota errors */ }
}

export function localClient(): LeaderboardClient {
  return {
    async submit(entry, trace) {
      try {
        const b = readBoard();
        const stored: RunEntry = { ...entry, hash: entryHash(entry), hasTrace: trace !== null };
        const idx = b.entries.findIndex(r => r.id === entry.id);
        if (idx >= 0) b.entries[idx] = stored; else b.entries.push(stored);
        if (trace) b.traces[entry.id] = encodeTrace(trace);
        writeBoard(b);
        return { ok: true, id: entry.id };
      } catch {
        return { ok: false, id: entry.id };
      }
    },
    async list(o) {
      try {
        let rows = readBoard().entries.slice();
        if (o.period === 'daily') rows = rows.filter(r => r.dailyDate === o.dailyDate);
        rows.sort((a, b) => b.best - a.best || b.kills - a.kills || a.submittedAt - b.submittedAt);
        if (typeof o.limit === 'number' && Number.isFinite(o.limit) && o.limit >= 0) {
          rows = rows.slice(0, o.limit);
        }
        return rows;
      } catch {
        return [];
      }
    },
    async trace(id) {
      try {
        const raw = readBoard().traces[id];
        return raw ? decodeTrace(raw) : null;
      } catch {
        return null;
      }
    },
  };
}

export function httpClient(baseUrl: string): LeaderboardClient {
  const base = baseUrl.replace(/\/+$/, '');
  return {
    async submit(entry, trace) {
      try {
        const res = await fetch(`${base}/runs`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ entry, trace }),
        });
        return { ok: res.ok, id: entry.id };
      } catch {
        return { ok: false, id: entry.id };
      }
    },
    async list(o) {
      try {
        const q = new URLSearchParams({ period: o.period });
        if (o.dailyDate) q.set('dailyDate', o.dailyDate);
        if (o.limit != null) q.set('limit', String(o.limit));
        const res = await fetch(`${base}/runs?${q.toString()}`);
        if (!res.ok) return [];
        const data: unknown = await res.json();
        return Array.isArray(data) ? data as RunEntry[] : [];
      } catch {
        return [];
      }
    },
    async trace(id) {
      try {
        const res = await fetch(`${base}/runs/${encodeURIComponent(id)}/trace`);
        if (!res.ok) return null;
        return decodeTrace(await res.text());
      } catch {
        return null;
      }
    },
  };
}

export function clientFromEnv(): LeaderboardClient {
  let url: string | undefined;
  try {
    // Guard for non-Vite environments (plain Node tests) where import.meta.env
    // is absent; importing the property directly would throw there.
    const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    url = env?.VITE_LEADERBOARD_URL;
  } catch { /* no env object — fall back to the local board */ }
  return url ? httpClient(url) : localClient();
}
