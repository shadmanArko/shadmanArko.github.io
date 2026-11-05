/**
 * Static pixel art for the career tour, painted once into logical-resolution canvases:
 *  - sky tiles (Dhaka warm, Berlin cool), clouds
 *  - far layer (hazy skylines, drawn at half parallax)
 *  - back layer (ground, road, river, viaduct, trees behind the buildings)
 *  - front layer (the station buildings and street furniture)
 *  - props (plane, rickshaw, bicycle, boats, train)
 * Colours are palette keys from palette.ts.
 */
import { type Ctx, R, px, box, disc, gable, bricks, win, hash, canvas } from './painter';
import {
  WORLD_W, WORLD_H, HORIZON_Y, BASE_Y, RIVER_Y, DHAKA_END, BERLIN_START, TAKEOFF_X, LAND_X, STOPS,
} from './world';

/* =========================================================================== sky */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const SKY_STOPS: Record<'dhaka' | 'berlin', [number, string][]> = {
  dhaka: [[0, '#86CBF0'], [46, '#A9DBF5'], [84, '#CDEBF3'], [108, '#F1F1DD'], [124, '#FBE6BE']],
  berlin: [[0, '#7CC0EC'], [46, '#9FD4F4'], [84, '#C4E6F8'], [108, '#DDF0F8'], [124, '#EEF7F6']],
};
/** A 64 x WORLD_H tile of ordered-dithered sky (tiles horizontally). */
export function skyTile(kind: 'dhaka' | 'berlin') {
  const st = SKY_STOPS[kind];
  const rgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  return canvas(64, WORLD_H, (c) => {
    const img = c.createImageData(64, WORLD_H);
    for (let y = 0; y < WORLD_H; y++) {
      let i = 0;
      while (i < st.length - 2 && y >= st[i + 1][0]) i++;
      const [y0, c0] = st[i];
      const [y1, c1] = st[Math.min(i + 1, st.length - 1)];
      const f = y1 > y0 ? Math.max(0, Math.min(1, (y - y0) / (y1 - y0))) : 1;
      for (let x = 0; x < 64; x++) {
        const th = (BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16;
        const [r, g, b] = rgb(th < f ? c1 : c0);
        const o = (y * 64 + x) * 4;
        img.data[o] = r;
        img.data[o + 1] = g;
        img.data[o + 2] = b;
        img.data[o + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
  });
}

export function makeClouds(): HTMLCanvasElement[] {
  const shapes = [
    [[10, 12, 6], [20, 8, 8], [32, 10, 7], [42, 13, 5]],
    [[8, 10, 5], [17, 7, 7], [27, 10, 5]],
    [[10, 11, 7], [22, 6, 8], [35, 9, 7], [46, 12, 5], [54, 13, 3]],
    [[7, 8, 4], [14, 6, 5], [21, 8, 4]],
  ];
  return shapes.map((blobs) =>
    canvas(62, 22, (c) => {
      for (const [x, y, r] of blobs) disc(c, x, y + 2, r, 'W');
      for (const [x, y, r] of blobs) disc(c, x, y, r, 'w');
      for (const [x, y, r] of blobs) R(c, x - r + 2, y + r + 1, r * 2 - 3, 1, '#E3EEF8');
    }),
  );
}

/* =========================================================================== far layer */
export const FAR_PAR = 0.5;
export const FAR_PAD = 760;
export const FAR_W = Math.ceil(WORLD_W * FAR_PAR + FAR_PAD * 2);
/** World x → far-layer x (the far layer is aligned when the camera is centred on x). */
const fx = (wx: number) => Math.round(wx * FAR_PAR + FAR_PAD);

export function paintFar(c: Ctx) {
  const base = HORIZON_Y;
  const dEnd = fx(DHAKA_END - 30);
  const bStart = fx(BERLIN_START + 50);
  // Dhaka: hazy tree line, low terracotta city, a few domes and water tanks
  for (let x = 0; x < dEnd; x += 6) disc(c, x, base - 6 - (hash(x, 1) % 5), 5, '#B9DDB0');
  R(c, 0, base - 6, dEnd, 6, '#B9DDB0');
  let x = 4;
  while (x < dEnd - 10) {
    const w = 8 + (hash(x, 2) % 12);
    const h = 8 + (hash(x, 3) % 18);
    const colr = ['#EED3BC', '#F2DCC6', '#E8C9B5', '#F4E2CB'][hash(x, 4) % 4];
    R(c, x, base - h, w, h, colr);
    R(c, x, base - h, w, 1, '#DDB9A0');
    for (let wy = base - h + 3; wy < base - 2; wy += 4) for (let wx = x + 2; wx < x + w - 1; wx += 3) px(c, wx, wy, '#DDBBA4');
    if (hash(x, 5) % 5 === 0) {
      // rooftop water tank
      R(c, x + 2, base - h - 4, 4, 4, '#D9C2B0');
    }
    x += w + 2 + (hash(x, 6) % 10);
  }
  // a domed mosque silhouette and a few palms
  for (const mx of [fx(560), fx(1010)]) {
    R(c, mx - 10, base - 16, 20, 16, '#EBD2BD');
    disc(c, mx, base - 18, 7, '#E6CCB6');
    R(c, mx - 15, base - 30, 3, 30, '#E6CCB6');
    R(c, mx + 12, base - 30, 3, 30, '#E6CCB6');
    disc(c, mx - 14, base - 31, 2, '#E6CCB6');
    disc(c, mx + 13, base - 31, 2, '#E6CCB6');
  }
  for (const pxp of [fx(120), fx(380), fx(760), fx(900)]) {
    R(c, pxp, base - 22, 1, 16, '#A7CFA0');
    for (const [dx, dy] of [[-4, 0], [-2, -2], [2, -2], [4, 0]]) R(c, pxp + Math.min(0, dx), base - 22 + dy, Math.abs(dx) + 1, 1, '#A7CFA0');
  }
  // Berlin: pastel Altbau rows with chimneys, a dome, a crane and the TV tower
  x = bStart;
  while (x < FAR_W) {
    const w = 12 + (hash(x, 9) % 10);
    const h = 14 + (hash(x, 11) % 12);
    const colr = ['#DCE2EC', '#E6E0EA', '#E2E9E4', '#EDE4DA'][hash(x, 12) % 4];
    R(c, x, base - h, w, h, colr);
    R(c, x - 1, base - h - 2, w + 2, 2, '#C9CDDD');
    if (hash(x, 13) % 2) R(c, x + 3, base - h - 5, 2, 3, '#C9CDDD');
    for (let wy = base - h + 3; wy < base - 2; wy += 4) for (let wx = x + 2; wx < x + w - 1; wx += 3) R(c, wx, wy, 1, 2, '#C3CCDB');
    x += w + 1;
  }
  // dome
  const dx = fx(1940);
  R(c, dx - 12, base - 28, 24, 28, '#DCD6CE');
  disc(c, dx, base - 30, 9, '#BFD8CF');
  R(c, dx - 1, base - 44, 2, 6, '#BFD8CF');
  // crane
  const cx = fx(1820);
  R(c, cx, base - 52, 2, 52, '#E9C98B');
  R(c, cx - 14, base - 52, 34, 2, '#E9C98B');
  R(c, cx + 18, base - 50, 1, 10, '#D2D5DF');
  // the TV tower
  const tx = fx(1700);
  R(c, tx - 3, base - 12, 7, 12, '#CBD0DC');
  R(c, tx - 1, base - 80, 3, 70, '#CBD0DC');
  disc(c, tx, base - 84, 7, '#C1C7D5');
  disc(c, tx - 1, base - 85, 5, '#D3D8E2');
  for (let i = -6; i <= 6; i += 2) px(c, tx + i, base - 84, '#AEB5C6');
  R(c, tx, base - 106, 1, 16, '#C1C7D5');
}

/* =========================================================================== back layer */
const inDhaka = (x: number) => x < DHAKA_END;
const inBerlin = (x: number) => x >= BERLIN_START;

function cloudBank(c: Ctx, x0: number, x1: number, top: number) {
  for (let x = x0; x < x1; x += 7) disc(c, x, top + 6 + (hash(x, 31) % 4), 7, 'W');
  for (let x = x0; x < x1; x += 7) disc(c, x - 2, top + 4 + (hash(x, 31) % 4), 6, 'w');
  R(c, x0 - 6, top + 10, x1 - x0 + 12, WORLD_H - top - 10, 'w');
  for (let x = x0; x < x1; x += 11) R(c, x, top + 14 + (hash(x, 7) % 20), 6, 1, 'W');
}

function paintGround(c: Ctx) {
  for (let x = 0; x < WORLD_W; x += 4) {
    const w = 4;
    if (inDhaka(x)) {
      R(c, x, HORIZON_Y - 2, w, BASE_Y - HORIZON_Y + 2, 'g');
      R(c, x, BASE_Y, w, 13, 'd'); // walkway
      R(c, x, 159, w, 2, 'g');
      R(c, x, 161, w, 9, '#EBC488'); // lane
      R(c, x, 170, w, 6, 'g');
      R(c, x, 176, w, 1, 'D');
      R(c, x, RIVER_Y, w, WORLD_H - RIVER_Y, 'b');
    } else if (inBerlin(x)) {
      R(c, x, HORIZON_Y - 2, w, BASE_Y - HORIZON_Y + 2, 'j');
      R(c, x, BASE_Y, w, 13, 'o');
      R(c, x, 159, w, 2, 'O');
      R(c, x, 161, w, 9, '#9BA2B2'); // street
      R(c, x, 170, w, 3, 'j');
      R(c, x, 173, w, 4, 'o'); // embankment
      R(c, x, RIVER_Y, w, WORLD_H - RIVER_Y, 'b');
    }
  }
  // texture
  for (let x = 0; x < WORLD_W; x += 9) {
    const h = hash(x, 17);
    if (inDhaka(x)) {
      px(c, x + (h % 7), HORIZON_Y + 2 + (h % 20), 'l');
      px(c, x + (h % 5), HORIZON_Y + 8 + ((h >>> 5) % 14), 'G');
      R(c, x + (h % 6), BASE_Y + 3 + ((h >>> 3) % 8), 2, 1, 'D');
      R(c, x + ((h >>> 7) % 6), 163 + ((h >>> 9) % 5), 2, 1, '#D9AE70');
      px(c, x + (h % 8), 172 + ((h >>> 4) % 3), 'G');
    } else if (inBerlin(x)) {
      px(c, x + (h % 7), HORIZON_Y + 2 + (h % 20), '#9EDC8F');
      px(c, x + (h % 5), HORIZON_Y + 8 + ((h >>> 5) % 14), 'J');
    }
  }
  // walkway edges
  for (let x = 0; x < WORLD_W; x++) {
    if (inDhaka(x)) {
      px(c, x, BASE_Y, 'D');
      if (x % 3 === 0) px(c, x, 158, 'D');
    } else if (inBerlin(x)) {
      px(c, x, BASE_Y, 'O');
      if (x % 6 === 0) R(c, x, BASE_Y + 1, 1, 12, '#B8BDC9'); // paving joints
      if (x % 12 === 0) R(c, x, 152, 6, 1, '#B8BDC9');
      if (x % 14 < 7) px(c, x, 165, 'w'); // dashed centre line
      if (x % 4 === 0) px(c, x, 173, 'O');
    }
  }
  // river: bands and highlights
  for (let x = 0; x < WORLD_W; x++) {
    if (!inDhaka(x) && !inBerlin(x)) continue;
    px(c, x, RIVER_Y, x % 5 ? 'f' : 'b');
    const h = hash(x, 41);
    if (h % 9 === 0) R(c, x, RIVER_Y + 6 + (h % 16), 4, 1, 'B');
    if (h % 23 === 0) R(c, x, RIVER_Y + 4 + (h % 12), 3, 1, 'S');
  }
  // runways
  for (const [a, b] of [[TAKEOFF_X - 34, DHAKA_END], [BERLIN_START, LAND_X + 30]]) {
    R(c, a, BASE_Y, b - a, 13, '#7D8296');
    R(c, a, BASE_Y, b - a, 1, 'K');
    for (let x = a + 4; x < b - 4; x += 10) R(c, x, 152, 5, 1, 'w');
    for (let x = a; x < b; x += 3) px(c, x, 158, '#FFE08A');
  }
  // the cloud sea where the ground ends
  cloudBank(c, DHAKA_END - 18, BERLIN_START + 18, 140);
  // soft puffs where the land meets the clouds
  for (const [gx, dir] of [[DHAKA_END, 1], [BERLIN_START, -1]] as [number, number][]) {
    for (let i = 0; i < 4; i++) {
      disc(c, gx + dir * (1 + i * 4), 144 + i * 9, 7 - i, 'w');
    }
  }
}

function lily(c: Ctx, x: number, y: number) {
  R(c, x - 3, y, 7, 2, 'G');
  R(c, x - 2, y - 1, 5, 1, 'g');
  R(c, x, y - 2, 2, 2, 'M');
  px(c, x + 1, y - 3, 'w');
}

/* ----- background trees and houses (base on the back grass, behind the buildings) */
function palm(c: Ctx, x: number, by: number, h = 22) {
  for (let i = 0; i < h; i++) R(c, x + Math.round(Math.sin(i / 7) * 2), by - i, 2, 1, i % 3 ? 'X' : 'x');
  const tx = x + Math.round(Math.sin(h / 7) * 2);
  const ty = by - h;
  for (const [dx, dy] of [[-8, 3], [-6, -1], [-1, -3], [5, -1], [8, 3], [-3, 4], [3, 4]]) {
    R(c, tx + Math.min(0, dx), ty + dy, Math.abs(dx) + 2, 2, 'G');
    R(c, tx + Math.min(0, dx), ty + dy, Math.abs(dx) + 2, 1, 'h');
  }
  R(c, tx, ty + 1, 2, 2, 'X');
  px(c, tx - 1, ty + 3, 'y');
}
function mango(c: Ctx, x: number, by: number, s = 1) {
  R(c, x - 1, by - 10 * s, 3, 10 * s, 'X');
  disc(c, x, by - 17 * s, Math.round(9 * s), 'L');
  disc(c, x - 1, by - 18 * s, Math.round(8 * s), 'G');
  disc(c, x - 3, by - 21 * s, Math.round(4 * s), 'g');
  for (const [dx, dy] of [[-4, -14], [4, -16], [1, -12], [-6, -19]]) R(c, x + dx, by + dy * s, 2, 2, 'a');
}
function banana(c: Ctx, x: number, by: number) {
  R(c, x, by - 10, 2, 10, 'h');
  for (const [dx, dy, w] of [[-7, -12, 7], [2, -13, 7], [-5, -16, 5], [1, -17, 5]]) {
    R(c, x + dx, by + dy, w, 2, 'h');
    R(c, x + dx, by + dy, w, 1, 'l');
  }
}
function village(c: Ctx, x: number, by: number, roof: string) {
  box(c, x - 8, by - 10, 16, 10, 'P');
  R(c, x - 10, by - 13, 20, 3, roof);
  R(c, x - 10, by - 13, 20, 1, 'k');
  box(c, x - 2, by - 7, 4, 7, 'X');
  R(c, x + 3, by - 7, 3, 3, 'S');
}
function linden(c: Ctx, x: number, by: number, s = 1) {
  R(c, x - 1, by - 9 * s, 3, 9 * s, 'X');
  disc(c, x, by - 17 * s, Math.round(8 * s), 'J');
  disc(c, x - 1, by - 18 * s, Math.round(7 * s), 'j');
  disc(c, x - 3, by - 21 * s, Math.round(3 * s), '#A9E3A0');
}
function viaduct(c: Ctx, x0: number, x1: number, y: number) {
  // a light steel U-Bahn viaduct: thin deck, lattice girder, slim pillars
  R(c, x0, y, x1 - x0, 3, '#7E8A9C');
  R(c, x0, y, x1 - x0, 1, '#AAB3C2');
  R(c, x0, y + 7, x1 - x0, 1, '#7E8A9C');
  for (let x = x0; x < x1; x += 6) {
    for (let i = 0; i < 4; i++) px(c, x + i, y + 3 + i, '#97A1B1');
  }
  for (let x = x0 + 8; x < x1; x += 30) {
    R(c, x, y + 8, 2, HORIZON_Y - y - 6, '#7E8A9C');
    R(c, x - 2, y + 8, 6, 1, '#7E8A9C');
  }
  R(c, x0, y - 1, x1 - x0, 1, 'K');
}

function paintBackDecor(c: Ctx) {
  // Dhaka, before BRAC: rice paddies on the back grass, palms, a village
  for (let x = 8; x < 230; x += 22) {
    R(c, x, 128, 18, 14, '#8CD3A4');
    for (let r = 129; r < 142; r += 3) for (let k = (r % 2) * 2; k < 18; k += 4) R(c, x + k, r, 1, 2, 'g');
  }
  const bd: [string, number, number?][] = [
    ['palm', 20], ['mango', 70], ['village', 120], ['palm', 158], ['banana', 185], ['mango', 230, 0.8],
    ['palm', 368], ['banana', 388], ['mango', 492, 0.9], ['village', 506], ['palm', 618], ['mango', 742, 0.9],
    ['palm', 762], ['banana', 880], ['village', 896], ['palm', 1018], ['mango', 1150, 0.8], ['palm', 1225],
  ];
  for (const [t, x, s] of bd) {
    const by = 140;
    if (t === 'palm') palm(c, x, by, 22 + (hash(x, 2) % 6));
    if (t === 'mango') mango(c, x, by, s || 1);
    if (t === 'banana') banana(c, x, by);
    if (t === 'village') village(c, x, by - 2, hash(x, 3) % 2 ? 't' : 'q');
  }
  // Berlin: the U-Bahn viaduct, lindens behind it
  viaduct(c, 1560, WORLD_W, 104);
  for (const x of [1575, 1688, 1818, 1948, 2090, 2150, 2210]) linden(c, x, 140, 0.9 + (hash(x, 9) % 3) * 0.1);
  // lily pads on the Dhaka river, tied boats on the bank
  for (const x of [60, 210, 380, 640, 900, 1110]) lily(c, x, RIVER_Y + 14 + (hash(x, 4) % 6));
}

export function paintBack(c: Ctx) {
  paintGround(c);
  paintBackDecor(c);
}

/* =========================================================================== front layer */
function lamp(c: Ctx, x: number, berlin: boolean) {
  const by = BASE_Y + 1;
  R(c, x, by - 22, 1, 22, berlin ? 'K' : 'X');
  if (berlin) {
    R(c, x - 2, by - 25, 5, 3, 'K');
    R(c, x - 1, by - 22, 3, 1, 'y');
  } else {
    R(c, x, by - 22, 4, 1, 'X');
    R(c, x + 3, by - 21, 2, 2, 'y');
  }
}
function bench(c: Ctx, x: number) {
  const by = BASE_Y + 1;
  R(c, x - 6, by - 5, 12, 2, 'X');
  R(c, x - 6, by - 8, 12, 1, 'X');
  R(c, x - 5, by - 3, 1, 3, 'K');
  R(c, x + 4, by - 3, 1, 3, 'K');
}
function teaStall(c: Ctx, x: number) {
  const by = BASE_Y;
  box(c, x - 9, by - 11, 18, 11, 't');
  R(c, x - 8, by - 10, 16, 2, 'y');
  R(c, x - 11, by - 15, 22, 4, 'q');
  for (let i = 0; i < 22; i += 2) px(c, x - 11 + i, by - 11, 'q');
  box(c, x - 3, by - 8, 5, 4, 'x');
  px(c, x + 2, by - 7, 'x');
  R(c, x - 7, by - 4, 2, 2, 'c');
  R(c, x + 5, by - 4, 2, 2, 'c');
}
function spati(c: Ctx, x: number) {
  const by = BASE_Y;
  box(c, x - 10, by - 16, 20, 16, 'R');
  R(c, x - 9, by - 15, 18, 3, 'u');
  box(c, x - 8, by - 10, 7, 10, 'S');
  box(c, x + 1, by - 10, 7, 5, 'y');
  R(c, x + 2, by - 9, 2, 3, 'v');
  R(c, x + 4, by - 9, 2, 3, 'r');
}
function flowersBed(c: Ctx, x: number, y: number) {
  for (let i = 0; i < 6; i++) {
    const fx2 = x + ((i * 7) % 15) - 7;
    const fy = y - ((i * 5) % 4);
    px(c, fx2, fy + 1, 'G');
    R(c, fx2, fy, 2, 1, ['a', 'w', 'M', 'y', 'r', 'w'][i]);
  }
}

/* ----- stations (cx = centre, by = BASE_Y) */
function campus(c: Ctx, cx: number, by: number) {
  for (const wx of [cx - 35, cx + 13]) {
    box(c, wx, by - 30, 22, 30, 't');
    bricks(c, wx + 1, by - 29, 20, 28, 'T', 4);
    R(c, wx - 1, by - 33, 24, 3, 'T');
    R(c, wx - 1, by - 33, 24, 1, 'k');
    for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++) win(c, wx + 3 + k * 6, by - 25 + r * 11, 4, 7, 'S');
  }
  box(c, cx - 14, by - 42, 28, 42, 'i');
  R(c, cx - 15, by - 33, 30, 3, 'P');
  R(c, cx - 15, by - 33, 30, 1, 'k');
  for (let i = 0; i < 4; i++) {
    R(c, cx - 12 + i * 7, by - 30, 4, 27, 'c');
    R(c, cx - 9 + i * 7, by - 30, 1, 27, 'e');
  }
  box(c, cx - 4, by - 14, 8, 14, 'X');
  R(c, cx - 3, by - 13, 3, 13, 'x');
  win(c, cx - 3, by - 40, 6, 5, 'S', false);
  gable(c, cx, by - 52, 17, 10, 't', 'T');
  R(c, cx - 18, by - 3, 36, 3, 'o');
  R(c, cx - 20, by - 1, 40, 1, 'O');
  R(c, cx, by - 66, 1, 14, 'k'); // flagpole (the flag waves, drawn live)
  // planters
  for (const pxp of [cx - 30, cx + 26]) {
    box(c, pxp - 3, by - 5, 7, 5, 'T');
    disc(c, pxp, by - 7, 3, 'G');
    px(c, pxp - 1, by - 9, 'r');
  }
}

function lab(c: Ctx, cx: number, by: number) {
  box(c, cx - 23, by - 38, 46, 38, 'c');
  R(c, cx + 15, by - 37, 7, 36, 'W');
  R(c, cx - 24, by - 41, 48, 4, 'K');
  R(c, cx - 24, by - 41, 48, 1, 'k');
  // the big camera lens: computer vision
  disc(c, cx - 9, by - 22, 9, 'k');
  disc(c, cx - 9, by - 22, 8, 'O');
  disc(c, cx - 9, by - 22, 6, 'k');
  disc(c, cx - 9, by - 22, 5, 'B');
  disc(c, cx - 9, by - 22, 3, 'N');
  disc(c, cx - 9, by - 22, 1, 'k');
  R(c, cx - 12, by - 25, 2, 2, 'w');
  for (const wx of [cx + 4, cx + 13]) win(c, wx, by - 33, 6, 9, 'S');
  box(c, cx + 5, by - 14, 10, 14, 'n');
  R(c, cx + 10, by - 13, 1, 13, 'k');
  // rooftop VR headset sign
  box(c, cx - 18, by - 50, 18, 9, 'K');
  R(c, cx - 16, by - 48, 6, 4, 'n');
  R(c, cx - 8, by - 48, 6, 4, 'n');
  R(c, cx - 10, by - 47, 2, 2, 'k');
  R(c, cx - 19, by - 47, 1, 3, 'k');
  // antenna
  R(c, cx + 14, by - 54, 1, 13, 'O');
  R(c, cx + 10, by - 54, 9, 1, 'o');
  R(c, cx + 11, by - 53, 7, 1, 'O');
}

function office(c: Ctx, cx: number, by: number) {
  box(c, cx - 20, by - 46, 40, 46, 'q');
  R(c, cx + 12, by - 45, 7, 44, 'N');
  for (let r = 0; r < 5; r++)
    for (let k = 0; k < 5; k++) {
      if (r === 4 && (k === 1 || k === 2 || k === 3)) continue;
      box(c, cx - 18 + k * 7, by - 42 + r * 7, 6, 5, r % 2 ? 's' : 'S');
      px(c, cx - 17 + k * 7, by - 41 + r * 7, 'w');
    }
  R(c, cx - 9, by - 12, 18, 12, 'k');
  R(c, cx - 8, by - 11, 16, 11, 's');
  R(c, cx, by - 11, 1, 11, 'k');
  R(c, cx - 11, by - 14, 22, 2, 'o');
  R(c, cx - 15, by - 50, 30, 4, 'o');
  R(c, cx - 15, by - 50, 30, 1, 'k');
  // potted plants
  for (const pxp of [cx - 15, cx + 14]) {
    box(c, pxp - 2, by - 4, 5, 4, 'x');
    disc(c, pxp, by - 7, 3, 'g');
  }
}

function dreamerz(c: Ctx, cx: number, by: number) {
  // studio block
  box(c, cx - 28, by - 28, 32, 28, 'P');
  R(c, cx - 30, by - 32, 36, 4, 'M');
  R(c, cx - 30, by - 32, 36, 1, 'k');
  for (let i = 0; i < 36; i += 4) R(c, cx - 30 + i, by - 28, 2, 2, 'H');
  for (const wx of [cx - 25, cx - 15]) win(c, wx, by - 22, 7, 8, 'S');
  box(c, cx - 6, by - 13, 8, 13, 'X');
  px(c, cx, by - 7, 'y');
  // the phone tower (AR apps)
  box(c, cx + 6, by - 50, 22, 50, 'K');
  for (const [dx, dy] of [[6, -50], [27, -50], [6, -1], [27, -1]]) px(c, cx + dx, by + dy, 'g');
  R(c, cx + 8, by - 46, 18, 34, 'n');
  R(c, cx + 13, by - 48, 8, 1, 'O');
  const apps = ['y', 'M', 'v', 'r', 'u', 'w', 'a', 'q', 'M', 'y', 'v', 'r'];
  for (let i = 0; i < 12; i++) R(c, cx + 10 + (i % 3) * 5, by - 43 + Math.floor(i / 3) * 7, 3, 3, apps[i]);
  box(c, cx + 13, by - 9, 8, 9, 'X');
  px(c, cx + 18, by - 5, 'y');
}

function army(c: Ctx, cx: number, by: number) {
  // fence
  for (let x = cx - 40; x <= cx + 40; x += 4) R(c, x, by - 8, 1, 8, 'O');
  R(c, cx - 40, by - 7, 81, 1, 'O');
  R(c, cx - 40, by - 4, 81, 1, 'O');
  // barracks
  box(c, cx - 32, by - 26, 42, 26, 'E');
  for (let i = 0; i < 14; i++) {
    const h = hash(i, 55);
    R(c, cx - 30 + (h % 36), by - 24 + ((h >>> 5) % 20), 3, 2, 'F');
  }
  R(c, cx - 34, by - 30, 46, 4, 'F');
  R(c, cx - 34, by - 30, 46, 1, 'k');
  for (const wx of [cx - 28, cx - 18, cx + 1]) win(c, wx, by - 21, 6, 6, 'S');
  box(c, cx - 9, by - 14, 8, 14, 'X');
  // sandbags
  for (let i = 0; i < 6; i++) {
    box(c, cx - 31 + i * 7, by - 4, 7, 4, 'I');
    if (i < 5) box(c, cx - 28 + i * 7, by - 7, 7, 4, 'I');
  }
  // watchtower
  for (const lx of [cx + 15, cx + 27]) R(c, lx, by - 38, 2, 38, 'X');
  for (let i = 0; i < 3; i++) R(c, cx + 15, by - 30 + i * 10, 14, 1, 'x');
  box(c, cx + 12, by - 48, 20, 11, 'F');
  R(c, cx + 15, by - 45, 14, 4, 'K');
  gable(c, cx + 22, by - 55, 12, 7, 'E');
  // target boards
  for (const tx of [cx + 38]) {
    R(c, tx, by - 8, 1, 8, 'X');
    disc(c, tx, by - 13, 5, 'w');
    disc(c, tx, by - 13, 3, 'r');
    disc(c, tx, by - 13, 1, 'w');
  }
  // the VR training rig on a stand (SAFS)
  R(c, cx + 5, by - 14, 1, 14, 'K');
  box(c, cx + 1, by - 19, 10, 5, 'K');
  R(c, cx + 2, by - 18, 3, 3, 'n');
  R(c, cx + 7, by - 18, 3, 3, 'n');
  R(c, cx - 37, by - 50, 1, 50, 'k'); // flagpole (flag drawn live)
}

function tower(c: Ctx, cx: number, by: number) {
  // annexes
  box(c, cx - 28, by - 26, 15, 26, 'c');
  for (let r = 0; r < 3; r++) win(c, cx - 25, by - 22 + r * 7, 9, 4, 'S', false);
  box(c, cx + 13, by - 32, 15, 32, 'W');
  for (let r = 0; r < 4; r++) win(c, cx + 16, by - 28 + r * 7, 9, 4, 'S', false);
  // main tower
  box(c, cx - 15, by - 70, 30, 70, 'o');
  R(c, cx + 9, by - 69, 5, 68, 'O');
  for (let r = 0; r < 9; r++)
    for (let k = 0; k < 4; k++) {
      R(c, cx - 13 + k * 6, by - 64 + r * 6, 5, 4, r % 2 ? 'S' : 's');
      px(c, cx - 13 + k * 6, by - 64 + r * 6, 'w');
    }
  R(c, cx - 16, by - 72, 32, 3, 'K');
  R(c, cx - 16, by - 72, 32, 1, 'k');
  R(c, cx, by - 80, 1, 8, 'k'); // antenna (light blinks, drawn live)
  // entrance canopy
  R(c, cx - 10, by - 12, 20, 2, 'q');
  R(c, cx - 7, by - 10, 14, 10, 'k');
  R(c, cx - 6, by - 9, 12, 9, 's');
  R(c, cx, by - 9, 1, 9, 'k');
}

function castle(c: Ctx, cx: number, by: number) {
  const crenel = (x: number, y: number, w: number) => {
    for (let i = 0; i < w; i += 4) box(c, x + i, y - 3, 3, 4, 'o');
  };
  box(c, cx - 15, by - 34, 30, 34, 'o');
  bricks(c, cx - 14, by - 33, 28, 32, 'O', 4);
  crenel(cx - 15, by - 34, 30);
  for (const tx of [cx - 28, cx + 15]) {
    box(c, tx, by - 42, 13, 42, 'o');
    bricks(c, tx + 1, by - 41, 11, 40, 'O', 4);
    gable(c, tx + 6, by - 54, 9, 12, 'R', 'T');
    R(c, tx + 5, by - 32, 3, 5, 'k');
    R(c, tx + 5, by - 19, 3, 5, 'k');
  }
  R(c, cx - 6, by - 15, 12, 15, 'k');
  R(c, cx - 5, by - 16, 10, 1, 'k');
  R(c, cx - 5, by - 14, 10, 14, 'X');
  for (let i = 0; i < 4; i++) R(c, cx - 4 + i * 3, by - 14, 1, 14, 'T');
  // thorny rose vines
  for (let i = 0; i < 18; i++) {
    const vx = cx - 14 + ((i * 7) % 28);
    const vy = by - 3 - ((i * 11) % 28);
    px(c, vx, vy, 'h');
    px(c, vx + 1, vy - 1, 'h');
    if (i % 3 === 0) R(c, vx + 1, vy - 2, 2, 2, 'r');
  }
  // banner with a rose
  box(c, cx - 5, by - 30, 10, 11, 'r');
  R(c, cx - 4, by - 20, 2, 2, 'r');
  R(c, cx + 2, by - 20, 2, 2, 'r');
  disc(c, cx, by - 26, 2, 'w');
  px(c, cx, by - 26, 'r');
  R(c, cx, by - 23, 1, 2, 'h');
}

function kolibri(c: Ctx, cx: number, by: number) {
  // Berlin Altbau with a shop front
  box(c, cx - 28, by - 60, 56, 60, '8');
  R(c, cx + 20, by - 59, 7, 58, '#D9B46C');
  for (const y of [by - 44, by - 30, by - 17]) {
    R(c, cx - 29, y, 58, 2, '0');
    R(c, cx - 29, y + 2, 58, 1, '#D9B46C');
  }
  for (let fl = 0; fl < 3; fl++)
    for (let k = 0; k < 5; k++) {
      const wx = cx - 24 + k * 10;
      const wy = by - 56 + fl * 14;
      R(c, wx - 1, wy - 2, 8, 2, '0');
      win(c, wx, wy, 6, 9, 'S');
    }
  // balcony
  R(c, cx - 8, by - 33, 16, 1, 'k');
  for (let i = 0; i < 16; i += 2) R(c, cx - 8 + i, by - 36, 1, 3, 'k');
  // roof + dormers
  R(c, cx - 30, by - 64, 60, 4, 'R');
  R(c, cx - 30, by - 64, 60, 1, 'k');
  for (const dx of [-16, 10]) {
    box(c, cx + dx, by - 69, 7, 6, 'R');
    R(c, cx + dx + 2, by - 67, 3, 3, 'S');
  }
  // shop front
  box(c, cx - 26, by - 14, 22, 14, 'S');
  R(c, cx - 25, by - 13, 3, 12, 'w');
  box(c, cx + 2, by - 14, 22, 14, 'S');
  box(c, cx - 4, by - 15, 8, 15, 'n');
  R(c, cx - 28, by - 17, 56, 3, 'N');
  for (let i = 0; i < 56; i += 4) px(c, cx - 28 + i, by - 14, 'n');
  // mine cart with gold (Idle Miner Tycoon) on a bit of track
  R(c, cx + 18, by + 1, 22, 1, 'X');
  box(c, cx + 22, by - 8, 14, 7, 'O');
  R(c, cx + 23, by - 10, 12, 2, '*');
  px(c, cx + 25, by - 11, '*');
  px(c, cx + 30, by - 11, 'y');
  disc(c, cx + 25, by - 1, 2, 'k');
  disc(c, cx + 33, by - 1, 2, 'k');
}

function badwifi(c: Ctx, cx: number, by: number) {
  // a converted brick workshop with a sawtooth roof
  box(c, cx - 27, by - 40, 54, 40, 'T');
  bricks(c, cx - 26, by - 39, 52, 38, 'R', 3);
  for (let i = 0; i < 3; i++) {
    const sx = cx - 27 + i * 18;
    for (let r = 0; r < 8; r++) R(c, sx + 1, by - 41 - r, 17 - r * 2, 1, r === 7 ? 'k' : 'O');
    R(c, sx + 12, by - 48, 2, 7, 'S');
  }
  for (const wx of [cx - 22, cx - 8, cx + 8]) {
    box(c, wx, by - 32, 12, 18, 'S');
    R(c, wx + 6, by - 31, 1, 16, 'k');
    R(c, wx + 1, by - 24, 10, 1, 'k');
    R(c, wx + 1, by - 34, 10, 2, 'T');
  }
  box(c, cx + 13, by - 13, 9, 13, 'M');
  px(c, cx + 19, by - 7, 'y');
  // the sign board (its wifi arcs are drawn live)
  box(c, cx - 22, by - 12, 30, 10, 'k');
  R(c, cx - 21, by - 11, 28, 8, 'K');
  R(c, cx - 7, by - 64, 1, 14, 'K');
  box(c, cx - 15, by - 70, 18, 10, 'k');
}

function school(c: Ctx, cx: number, by: number) {
  box(c, cx - 26, by - 30, 52, 30, 'c');
  R(c, cx + 18, by - 29, 7, 28, 'e');
  gable(c, cx, by - 46, 28, 15, 'q', 'N');
  // bell tower
  box(c, cx - 4, by - 56, 9, 10, 'c');
  R(c, cx - 5, by - 58, 11, 2, 'q');
  R(c, cx - 1, by - 53, 3, 4, 'x');
  for (const wx of [cx - 22, cx - 12, cx + 6, cx + 16]) {
    box(c, wx, by - 24, 6, 9, 'S');
    R(c, wx + 3, by - 23, 1, 7, 'k');
  }
  box(c, cx - 4, by - 13, 8, 13, 'X');
  // the fish sign over the door
  const fy = by - 22;
  box(c, cx - 7, fy - 7, 14, 9, 'k');
  R(c, cx - 6, fy - 6, 12, 7, 'i');
  disc(c, cx - 1, fy - 3, 2, 'a');
  R(c, cx - 4, fy - 4, 6, 3, 'a');
  R(c, cx + 2, fy - 5, 1, 5, 'a');
  R(c, cx + 3, fy - 6, 1, 7, 'a');
  px(c, cx - 3, fy - 4, 'k');
  // flower boxes
  for (const pxp of [cx - 20, cx + 18]) flowersBed(c, pxp, by - 1);
}

function kitchen(c: Ctx, cx: number, by: number) {
  const x = cx - 30;
  box(c, x, by - 38, 60, 38, 'i');
  bricks(c, x + 1, by - 37, 58, 36, 'P', 4);
  R(c, x + 1, by - 4, 58, 3, 'T');
  bricks(c, x + 1, by - 4, 58, 3, 'R', 2);
  R(c, x - 1, by - 41, 62, 4, 'R');
  R(c, x - 1, by - 41, 62, 1, 'k');
  // brass dome and finial
  for (let dy = 0; dy < 11; dy++) {
    const hw = Math.round(Math.sqrt(121 - (11 - dy) ** 2) * 1.05);
    R(c, cx - hw, by - 52 + dy, hw * 2, 1, 'x');
    R(c, cx + Math.floor(hw / 2), by - 52 + dy, Math.ceil(hw / 2), 1, 'X');
    px(c, cx - hw, by - 52 + dy, 'k');
    px(c, cx + hw - 1, by - 52 + dy, 'k');
  }
  R(c, cx - 5, by - 50, 2, 3, 'y');
  R(c, cx, by - 58, 1, 6, 'X');
  R(c, cx - 1, by - 56, 3, 1, 'y');
  box(c, x + 50, by - 49, 6, 9, 'T'); // chimney (steam drawn live)
  // awning
  for (let i = 0; i < 60; i += 4) R(c, x + i, by - 25, 4, 6, (i / 4) % 2 ? 'i' : 'r');
  for (let i = 0; i < 60; i += 2) px(c, x + i, by - 19, (i / 2) % 4 < 2 ? 'r' : 'i');
  R(c, x, by - 26, 60, 1, 'k');
  // name board (blank; the HTML sign carries the name)
  box(c, cx - 22, by - 36, 44, 9, 'k');
  for (let i = 0; i < 40; i += 3) px(c, cx - 20 + i, by - 32, 'X');
  for (const wx of [x + 4, x + 44]) {
    box(c, wx, by - 16, 12, 11, 'y');
    R(c, wx + 1, by - 15, 10, 2, 'a');
    R(c, wx + 6, by - 15, 1, 9, 'X');
    R(c, wx + 1, by - 11, 10, 1, 'X');
    R(c, wx + 2, by - 8, 4, 1, 'w');
    R(c, wx + 3, by - 9, 2, 1, 'a');
  }
  R(c, cx - 6, by - 16, 12, 16, 'k');
  R(c, cx - 5, by - 17, 10, 1, 'k');
  R(c, cx - 5, by - 15, 10, 15, 'X');
  R(c, cx - 4, by - 14, 3, 14, 'x');
  px(c, cx + 3, by - 8, 'y');
  // the dum pot of kacchi biryani by the door, on a little stove
  const px0 = cx + 36;
  R(c, px0 - 9, by - 3, 18, 3, 'K');
  R(c, px0 - 6, by - 4, 3, 1, 'r');
  R(c, px0 + 2, by - 4, 3, 1, 'a');
  for (let dy = 0; dy < 12; dy++) {
    const hw = Math.round(8 * Math.sin(((dy + 2) / 14) * Math.PI));
    R(c, px0 - hw, by - 16 + dy, hw * 2 + 1, 1, dy < 2 ? 'k' : 'x');
    px(c, px0 - hw, by - 16 + dy, 'k');
    px(c, px0 + hw, by - 16 + dy, 'k');
    if (dy > 2) px(c, px0 + hw - 2, by - 16 + dy, 'X');
  }
  R(c, px0 - 6, by - 18, 13, 2, 'i'); // dough seal
  R(c, px0 - 5, by - 20, 11, 2, 'x'); // lid
  R(c, px0 - 5, by - 20, 11, 1, 'k');
  R(c, px0 - 1, by - 22, 3, 2, 'X');
  px(c, px0 - 5, by - 12, 'w');
}

export const LANDMARK: Record<string, (c: Ctx, cx: number, by: number) => void> = {
  campus, lab, office, dreamerz, army, tower, castle, kolibri, badwifi, school, kitchen,
};
/** Where the biryani pot steam rises (world coords). */
export const POT = { x: STOPS.dhakakacchi.x + 36, y: BASE_Y - 22 };
export const CHIMNEY = { x: STOPS.dhakakacchi.x + 23, y: BASE_Y - 50 };

function airport(c: Ctx, x: number, berlin: boolean) {
  const by = BASE_Y;
  // terminal
  box(c, x - 22, by - 14, 34, 14, berlin ? 'o' : 'c');
  R(c, x - 21, by - 11, 32, 5, 'S');
  for (let i = 0; i < 32; i += 4) px(c, x - 21 + i, by - 11, 'k');
  R(c, x - 23, by - 16, 36, 2, berlin ? 'K' : 'q');
  // control tower
  box(c, x + 14, by - 34, 6, 34, 'o');
  box(c, x + 10, by - 42, 14, 8, 'N');
  R(c, x + 11, by - 40, 12, 3, 'n');
  R(c, x + 9, by - 43, 16, 1, 'k');
  R(c, x + 17, by - 47, 1, 4, 'k');
  // wind sock
  R(c, x - 28, by - 18, 1, 18, 'K');
  R(c, x - 27, by - 18, 6, 3, 'a');
  R(c, x - 25, by - 18, 2, 3, 'w');
}

export function paintFront(c: Ctx) {
  // street furniture between stations
  for (const x of [250, 365, 493, 618, 748, 882, 1018, 1132]) lamp(c, x, false);
  for (const x of [1574, 1685, 1815, 1948, 2084, 2190]) lamp(c, x, true);
  teaStall(c, 120);
  teaStall(c, 900 - 18 + 2);
  bench(c, 618 + 12);
  bench(c, 2130);
  spati(c, 1690 - 4 + 0);
  flowersBed(c, 2160, BASE_Y - 1);
  flowersBed(c, 240, BASE_Y - 1);
  airport(c, TAKEOFF_X - 6, false);
  airport(c, LAND_X - 18, true);
  for (const [id, s] of Object.entries(STOPS)) {
    void id;
    LANDMARK[s.lm](c, s.x, BASE_Y);
  }
  // little front-row trees on the Berlin walkway edge after the last stop
  linden(c, 2110, BASE_Y, 0.8);
  linden(c, 2220, BASE_Y, 0.9);
  mango(c, 40, BASE_Y, 0.9);
}

/* =========================================================================== props */
/** The plane, facing right (index 0) and left (index 1). Arko sits in the first window. */
export function makePlane(): HTMLCanvasElement[] {
  const paint = (c: Ctx) => {
    // tail fin
    for (let r = 0; r < 7; r++) R(c, 2 + Math.floor(r / 2), r, 6 - Math.floor(r / 3), 1, r === 0 ? 'k' : 'q');
    px(c, 2, 1, 'k');
    // fuselage
    R(c, 3, 6, 32, 7, 'k');
    R(c, 4, 7, 31, 5, 'w');
    R(c, 35, 7, 2, 5, 'k');
    R(c, 35, 8, 2, 3, 'w');
    px(c, 37, 9, 'k');
    R(c, 4, 10, 31, 1, 'q');
    R(c, 4, 11, 31, 1, 'W');
    for (let i = 0; i < 7; i++) px(c, 12 + i * 3, 8, 'N');
    R(c, 32, 8, 3, 1, 'N');
    // Arko in a window near the front
    px(c, 30, 8, '1');
    px(c, 30, 7, '3');
    // wing + engine
    R(c, 14, 12, 13, 2, 'k');
    R(c, 15, 12, 11, 1, 'o');
    R(c, 12, 14, 10, 1, 'k');
    R(c, 18, 13, 6, 2, 'O');
    // landing gear
    px(c, 10, 13, 'k');
    px(c, 31, 13, 'k');
  };
  const right = canvas(39, 15, paint);
  const left = canvas(39, 15, (c) => {
    c.translate(39, 0);
    c.scale(-1, 1);
    c.drawImage(right, 0, 0);
  });
  return [right, left];
}

/** Cycle rickshaw facing right, two pedal frames. */
export function makeRickshaw(): HTMLCanvasElement[] {
  return [0, 1].map((f) =>
    canvas(30, 22, (c) => {
      // hood
      R(c, 2, 0, 11, 1, 'k');
      R(c, 1, 1, 13, 7, 'k');
      R(c, 2, 1, 11, 6, 'r');
      R(c, 2, 3, 11, 1, 'y');
      for (let i = 2; i < 13; i += 3) px(c, i, 5, 'w');
      R(c, 12, 7, 1, 5, 'k');
      // seat + passenger rail
      R(c, 2, 9, 11, 3, 'q');
      R(c, 2, 9, 11, 1, 'k');
      R(c, 1, 12, 13, 2, 'M');
      // back wheel
      disc(c, 7, 17, 4, 'k');
      disc(c, 7, 17, 3, 'o');
      px(c, 7, 17, 'k');
      if (f) {
        R(c, 5, 17, 5, 1, 'O');
      } else {
        R(c, 7, 15, 1, 5, 'O');
      }
      // frame to the front
      R(c, 10, 15, 13, 1, 'k');
      R(c, 21, 10, 1, 6, 'k');
      R(c, 19, 10, 4, 1, 'k');
      disc(c, 24, 18, 3, 'k');
      disc(c, 24, 18, 2, 'o');
      px(c, 24, 18, 'k');
      // the puller
      R(c, 16, 1, 3, 3, '1');
      R(c, 16, 0, 3, 1, '3');
      R(c, 15, 4, 5, 5, 'w');
      R(c, 18, 5, 3, 1, '1'); // arms to the handlebar
      R(c, 15, 9, 4, 3, 'q'); // lungi
      if (f) {
        R(c, 15, 12, 1, 3, '1');
        R(c, 18, 12, 1, 4, '1');
      } else {
        R(c, 16, 12, 1, 4, '1');
        R(c, 17, 12, 1, 3, '1');
      }
    }),
  );
}

/** A cyclist on a city bike, facing right, two frames. */
export function makeBike(): HTMLCanvasElement[] {
  return [0, 1].map((f) =>
    canvas(20, 18, (c) => {
      disc(c, 4, 14, 3, 'k');
      disc(c, 4, 14, 2, 'o');
      disc(c, 15, 14, 3, 'k');
      disc(c, 15, 14, 2, 'o');
      R(c, 4, 11, 10, 1, 'r');
      R(c, 8, 9, 1, 5, 'r');
      R(c, 13, 7, 1, 7, 'K');
      R(c, 12, 7, 3, 1, 'K');
      R(c, 16, 9, 3, 2, 'X'); // basket
      // rider
      R(c, 7, 0, 4, 2, 'v'); // helmet
      R(c, 8, 2, 3, 2, '1');
      R(c, 7, 4, 4, 5, 'M');
      R(c, 10, 5, 3, 1, '1');
      R(c, 7, 9, 3, 1, '7');
      if (f) R(c, 9, 10, 1, 3, '7');
      else R(c, 7, 10, 1, 4, '7');
    }),
  );
}

/** Wooden river boat (Dhaka) and a white tour boat (Berlin), facing right. */
export function makeBoats(): HTMLCanvasElement[] {
  const nouka = canvas(34, 14, (c) => {
    for (let i = 0; i < 6; i++) {
      const inset = Math.max(0, 4 - i) * 2;
      R(c, inset, 8 + i, 34 - inset * 2, 1, i === 0 ? 'k' : i < 3 ? 'x' : 'X');
    }
    R(c, 0, 6, 2, 3, 'X');
    R(c, 32, 6, 2, 3, 'X');
    // canopy
    R(c, 10, 2, 13, 1, 'k');
    R(c, 9, 3, 15, 5, 'y');
    R(c, 9, 5, 15, 1, 'a');
    R(c, 9, 3, 1, 5, 'k');
    R(c, 23, 3, 1, 5, 'k');
    // boatman with an oar
    R(c, 28, 1, 2, 2, '1');
    R(c, 27, 3, 4, 4, 'w');
    R(c, 27, 0, 4, 1, 'y');
    R(c, 31, 2, 1, 10, 'X');
  });
  const tour = canvas(44, 14, (c) => {
    R(c, 0, 8, 44, 4, 'k');
    R(c, 1, 8, 42, 3, 'w');
    R(c, 1, 10, 42, 1, 'B');
    R(c, 4, 12, 36, 1, 'k');
    box(c, 6, 3, 30, 6, 'c');
    for (let i = 0; i < 7; i++) R(c, 8 + i * 4, 4, 2, 3, 'S');
    R(c, 6, 2, 30, 1, 'k');
    for (const [x, k] of [[12, 'r'], [20, 'u'], [28, 'v']] as [number, string][]) {
      px(c, x, 0, '1');
      px(c, x, 1, k);
    }
  });
  return [nouka, tour];
}

/** Two-car yellow U-Bahn train, facing right. */
export function makeTrain(): HTMLCanvasElement {
  return canvas(66, 11, (c) => {
    for (const ox of [0, 33]) {
      box(c, ox, 1, 32, 9, 'u');
      R(c, ox + 1, 1, 30, 1, 'y');
      for (let i = 0; i < 5; i++) R(c, ox + 3 + i * 6, 3, 4, 3, 'S');
      R(c, ox + 1, 7, 30, 1, 'y');
      R(c, ox + 4, 10, 4, 1, 'k');
      R(c, ox + 24, 10, 4, 1, 'k');
    }
    R(c, 64, 3, 2, 3, 'S');
    px(c, 64, 7, 'w');
  });
}


