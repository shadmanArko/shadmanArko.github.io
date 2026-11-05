/**
 * Tiny pixel-drawing helpers. All coordinates are whole logical pixels; colours are palette
 * keys (palette.ts) or raw hex. Everything here draws into a logical-resolution canvas that the
 * engine later blits at an integer scale with smoothing off.
 */
import { PAL } from './palette';

export type Ctx = CanvasRenderingContext2D;
export interface Sprite {
  w: number;
  h: number;
  rows: string[];
  oy?: number;
}

const col = (k: string) => PAL[k] || k;

export function R(c: Ctx, x: number, y: number, w: number, h: number, k: string) {
  if (w <= 0 || h <= 0) return;
  c.fillStyle = col(k);
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
export const px = (c: Ctx, x: number, y: number, k: string) => R(c, x, y, 1, 1, k);

/** Outlined box. */
export function box(c: Ctx, x: number, y: number, w: number, h: number, fill: string, line = 'k') {
  R(c, x, y, w, h, line);
  R(c, x + 1, y + 1, w - 2, h - 2, fill);
}
/** Filled disc. */
export function disc(c: Ctx, cx: number, cy: number, r: number, k: string) {
  for (let dy = -r; dy <= r; dy++) {
    const h = Math.floor(Math.sqrt(r * r - dy * dy) + 0.35);
    R(c, cx - h, cy + dy, h * 2 + 1, 1, k);
  }
}
/** Gable roof: apex (cx, top), `h` rows tall, `half` wide at the bottom. */
export function gable(c: Ctx, cx: number, top: number, half: number, h: number, fill: string, shade?: string) {
  for (let i = 0; i < h; i++) {
    const hw = Math.max(1, Math.round((half * (i + 1)) / h));
    R(c, cx - hw, top + i, hw * 2, 1, i === 0 ? 'k' : fill);
    if (shade && i > 0) R(c, cx, top + i, hw - 1, 1, shade);
    px(c, cx - hw, top + i, 'k');
    px(c, cx + hw - 1, top + i, 'k');
  }
  R(c, cx - half - 1, top + h, half * 2 + 2, 1, 'k');
}
/** Brick / stone speckle inside a rect. */
export function bricks(c: Ctx, x: number, y: number, w: number, h: number, k: string, step = 3) {
  for (let yy = 0; yy < h; yy += step) {
    const off = (yy / step) % 2 ? 2 : 0;
    for (let xx = off; xx < w; xx += 5) px(c, x + xx, y + yy, k);
  }
}
/** A window with a frame, glass, a highlight and an optional sill. */
export function win(c: Ctx, x: number, y: number, w: number, h: number, glass = 'S', sill = true) {
  box(c, x, y, w, h, glass);
  px(c, x + 1, y + 1, 'w');
  if (h > 5) R(c, x + 1, y + Math.floor(h / 2), w - 2, 1, 'k');
  if (sill) R(c, x - 1, y + h, w + 2, 1, 'e');
}

export function hash(x: number, y: number) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Paint a palette-indexed sprite ('.' is transparent). */
export function paintSprite(c: Ctx, s: Sprite, x: number, y: number, flip = false) {
  for (let r = 0; r < s.h; r++) {
    const row = flip ? s.rows[r].split('').reverse().join('') : s.rows[r];
    let i = 0;
    while (i < s.w) {
      const ch = row[i];
      if (ch === '.') {
        i++;
        continue;
      }
      let run = 1;
      while (i + run < s.w && row[i + run] === ch) run++;
      R(c, x + i, y + r + (s.oy || 0), run, 1, ch);
      i += run;
    }
  }
}

/** Make a small offscreen canvas and paint into it. */
export function canvas(w: number, h: number, paint: (c: Ctx) => void): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d')!;
  paint(c);
  return cv;
}

/** Rasterise a sprite to a cached canvas. */
const cache = new Map<Sprite, Map<boolean, HTMLCanvasElement>>();
export function rast(s: Sprite, flip = false): HTMLCanvasElement {
  let m = cache.get(s);
  if (!m) cache.set(s, (m = new Map()));
  let cv = m.get(flip);
  if (!cv) {
    cv = canvas(s.w, s.h, (c) => paintSprite(c, { ...s, oy: 0 }, 0, 0, flip));
    m.set(flip, cv);
  }
  return cv;
}
