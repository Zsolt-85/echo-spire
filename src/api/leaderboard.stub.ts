// Leaderboard stub (spec §4, §10): no backend in v1, upload interface only.
export type Entry = { playerId: string; best: number; hash: string };
export async function upload(e: Entry): Promise<{ ok: boolean }> {
  console.info('stub upload', e);
  return { ok: true };
}
