// Shareable run card (competitive layer, Task 8). Canvas only, no image assets.
// Web Share with a PNG file first, then an <a download> fallback; never throws.
import type { RunSummary } from '../game/lifecycle.js';
import type { RunEntry } from '../api/leaderboard.js';

const W = 600;
const H = 320;

function headline(wave: number): string {
  return `I HELD THE LINE TO WAVE ${wave}`;
}
function fileName(wave: number): string {
  return `echo-spire-wave-${wave}.png`;
}
function clock(timeS: number): string {
  const t = Math.max(0, Math.floor(timeS || 0));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

/** Draw the card and return its PNG data URL ('' when no canvas DOM exists). */
export function runCardPng(summary: RunSummary, ghost?: RunEntry | null): string {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return '';
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0a0c14');
  bg.addColorStop(0.55, '#141026');
  bg.addColorStop(1, '#2a1738');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Violet / gold rings behind the headline — the game's ghost/neon palette.
  ctx.save();
  ctx.translate(W / 2, 132);
  for (const [r, color, width] of [
    [98, 'rgba(167,139,250,0.16)', 2],
    [76, 'rgba(251,191,36,0.28)', 2],
    [54, 'rgba(167,139,250,0.34)', 1.5],
  ] as const) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fbbf24';
  ctx.shadowColor = 'rgba(251,191,36,0.55)';
  ctx.shadowBlur = 18;
  ctx.font = '700 25px Orbitron, system-ui, sans-serif';
  ctx.fillText(headline(summary.wave), W / 2, 130);
  ctx.shadowBlur = 0;

  // Stats in the project's mono font, one line for the run and one for economy.
  ctx.font = '500 15px "JetBrains Mono", monospace';
  ctx.fillStyle = '#e7e5e4';
  ctx.fillText(`${summary.kills} kills  •  ${clock(summary.timeS)}  •  ${summary.coresGained} cores`, W / 2, 204);
  ctx.fillStyle = '#c4b5fd';
  ctx.fillText(`${summary.fluxEarned} flux  •  ${summary.essenceEarned} essence`, W / 2, 232);

  const name = ghost?.playerName?.trim();
  if (name) {
    ctx.fillStyle = '#fbbf24';
    ctx.fillText(`vs ${name}`, W / 2, 268);
  }
  ctx.font = '700 12px Orbitron, system-ui, sans-serif';
  ctx.fillStyle = '#a78bfa';
  ctx.fillText('ECHO SPIRE', W / 2, 296);

  return canvas.toDataURL('image/png');
}

function dataUrlToFile(dataUrl: string, name: string): File {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) throw new Error('run card is not a data URL');
  const binary = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name, { type: 'image/png' });
}

/**
 * Share the current run as a PNG. 'shared' = Web Share accepted;
 * 'downloaded' = anchor fallback used (also on user cancel / share errors);
 * 'unsupported' = no DOM at all. Never rejects.
 */
export async function shareRunCard(
  summary: RunSummary,
  ghost?: RunEntry | null,
): Promise<'shared' | 'downloaded' | 'unsupported'> {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') return 'unsupported';
  try {
    const dataUrl = runCardPng(summary, ghost);
    if (!dataUrl) return 'unsupported';

    try {
      const nav = typeof navigator === 'undefined' ? undefined : navigator;
      if (nav && typeof nav.share === 'function' && typeof nav.canShare === 'function') {
        const file = dataUrlToFile(dataUrl, fileName(summary.wave));
        const payload: ShareData = {
          files: [file],
          title: 'Echo Spire',
          text: headline(summary.wave),
        };
        if (nav.canShare(payload)) {
          await nav.share(payload);
          return 'shared';
        }
      }
    } catch {
      // Cancel, permission denial, or a browser that refuses PNG files —
      // fall through to the download path below.
    }

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName(summary.wave);
    const body = document.body;
    const attached = !!body && typeof body.appendChild === 'function';
    if (attached) body.appendChild(a);
    if (typeof a.click === 'function') a.click();
    if (attached && typeof body.removeChild === 'function') body.removeChild(a);
    return 'downloaded';
  } catch {
    return 'unsupported';
  }
}
