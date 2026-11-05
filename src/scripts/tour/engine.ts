/**
 * The tour renderer + walker.
 *
 * Rendering: static art lives in logical-resolution canvases (far, back, front). Each frame
 * they are blitted to the visible canvas at an INTEGER scale with smoothing off, offset by the
 * camera in whole DEVICE pixels. So pixels stay crisp, but the camera and the walker glide in
 * device-pixel steps instead of jumping a whole logical pixel at a time.
 *
 * Loop: requestAnimationFrame only while the map is on screen (or Arko is mid-walk) and the
 * tab is visible. Under reduced motion there is no loop: Arko jumps between stops and frames
 * are drawn on demand.
 */
import { PAL } from './palette';
import { canvas, rast, hash, disc } from './painter';
import { ARKO_FRONT, ARKO_SIDE, COSTUMES, COSTUMES_SIDE, BUBBLE, HUMMINGBIRD, BIRD } from './sprites';
import {
  skyTile, makeClouds, paintFar, paintBack, paintFront, makePlane, makeRickshaw, makeBike, makeBoats, makeTrain,
  FAR_PAR, FAR_PAD, FAR_W, POT, CHIMNEY,
} from './art';
import {
  WORLD_W, WORLD_H, FEET_Y, BASE_Y, RIVER_Y, TAKEOFF_X, LAND_X, DHAKA_END, BERLIN_START, STOPS, costAt, xAtCost, altitude, costumeAt,
} from './world';

export interface EngineHooks {
  onArrive?: (i: number) => void;
  onCamera?: (camCss: number) => void;
  onLayout?: (k: number, oyCss: number) => void;
}

const WALK_RATE = 38; // cost units per second at 1x
const ease = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t); // easeInOutSine

function flip(cv: HTMLCanvasElement) {
  return canvas(cv.width, cv.height, (c) => {
    c.translate(cv.width, 0);
    c.scale(-1, 1);
    c.drawImage(cv, 0, 0);
  });
}

export class Engine {
  private ctx: CanvasRenderingContext2D;
  private far!: HTMLCanvasElement;
  private back!: HTMLCanvasElement;
  private front!: HTMLCanvasElement;
  private sky!: HTMLCanvasElement[];
  private clouds!: HTMLCanvasElement[];
  private sun!: HTMLCanvasElement;
  private plane!: HTMLCanvasElement[];
  private rick!: HTMLCanvasElement[][];
  private bike!: HTMLCanvasElement[][];
  private boats!: HTMLCanvasElement[][];
  private train!: HTMLCanvasElement;

  // view
  s = 1;
  dpr = 1;
  devW = 1;
  devH = 1;
  oy = 0;
  vw = 1; // logical px across
  camX = 0;
  camT = 0;
  follow = true;
  insetCss = 0;
  private lastCamDev = NaN;

  // walker
  x: number;
  dir = 1;
  at = 0;
  private walk: { c0: number; c1: number; el: number; dur: number; to: number } | null = null;
  private stride = 0;
  paused = false;
  speed = 1;
  talking = false;

  // loop
  reduced: boolean;
  visible = true;
  private running = false;
  private raf = 0;
  private last = 0;
  t = 0; // ambient seconds
  private dirty = true;

  constructor(
    private el: HTMLCanvasElement,
    private stopX: number[],
    opts: { reduced: boolean },
    private hooks: EngineHooks = {},
  ) {
    this.ctx = el.getContext('2d')!;
    this.reduced = opts.reduced;
    this.x = stopX[0];
    this.prerender();
    this.layout();
    this.camX = this.camT = this.clampCam(this.x - this.focus());
    document.addEventListener('visibilitychange', () => this.sync());
  }

  /* ------------------------------------------------------------- prerender */
  private prerender() {
    this.far = canvas(FAR_W, WORLD_H, paintFar);
    this.back = canvas(WORLD_W, WORLD_H, paintBack);
    this.front = canvas(WORLD_W, WORLD_H, paintFront);
    this.sky = [skyTile('dhaka'), skyTile('berlin')];
    this.clouds = makeClouds();
    this.sun = canvas(25, 25, (c) => {
      disc(c, 12, 12, 9, '#FFE7A3');
      disc(c, 12, 12, 7, PAL.u);
      disc(c, 10, 10, 3, '#FFF1B8');
    });
    this.plane = makePlane();
    const r = makeRickshaw();
    this.rick = [r, r.map(flip)];
    const b = makeBike();
    this.bike = [b, b.map(flip)];
    const bo = makeBoats();
    this.boats = [bo, bo.map(flip)];
    this.train = makeTrain();
  }

  /* ------------------------------------------------------------- layout */
  layout() {
    const r = this.el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    this.dpr = window.devicePixelRatio || 1;
    this.devW = Math.round(r.width * this.dpr);
    this.devH = Math.round(r.height * this.dpr);
    this.s = Math.max(1, Math.round(this.devH / WORLD_H));
    this.oy = this.devH - WORLD_H * this.s; // bottom-aligned: extra height becomes sky, a short view crops sky
    this.vw = this.devW / this.s;
    this.el.width = this.devW;
    this.el.height = this.devH;
    this.ctx.imageSmoothingEnabled = false;
    this.camT = this.clampCam(this.follow ? this.x - this.focus() : this.camT);
    this.camX = this.clampCam(this.camX);
    this.lastCamDev = NaN;
    this.hooks.onLayout?.(this.s / this.dpr, this.oy / this.dpr);
    this.emitCamera();
    this.request();
  }

  get k() {
    return this.s / this.dpr;
  }
  /** Logical x (from the view's left) where the walker should stand. */
  private focus() {
    const cssW = this.devW / this.dpr;
    const inset = Math.min(this.insetCss, cssW * 0.6);
    return (inset + (cssW - inset) * (inset ? 0.5 : 0.5)) / this.k;
  }
  private clampCam(x: number) {
    const max = WORLD_W - this.vw;
    if (max <= 0) return max / 2;
    return Math.max(0, Math.min(max, x));
  }
  setInset(css: number) {
    if (Math.abs(css - this.insetCss) < 1) return;
    this.insetCss = css;
    if (this.follow) this.camT = this.clampCam(this.x - this.focus());
    if (this.reduced) this.camX = this.camT;
    this.request();
  }
  private emitCamera() {
    const d = Math.round(this.camX * this.s);
    if (d === this.lastCamDev) return;
    this.lastCamDev = d;
    this.hooks.onCamera?.(d / this.dpr);
  }
  /** CSS x of a world x inside the stage. */
  screenX(wx: number) {
    return (Math.round(wx * this.s) - Math.round(this.camX * this.s)) / this.dpr;
  }

  /* ------------------------------------------------------------- controls */
  walkTo(i: number) {
    i = Math.max(0, Math.min(this.stopX.length - 1, i));
    const tx = this.stopX[i];
    this.follow = true;
    if (this.reduced || Math.abs(tx - this.x) < 0.5) {
      this.walk = null;
      this.x = tx;
      this.at = i;
      this.camX = this.camT = this.clampCam(this.x - this.focus());
      this.emitCamera();
      this.request();
      queueMicrotask(() => this.hooks.onArrive?.(i));
      return;
    }
    const c0 = costAt(this.x);
    const c1 = costAt(tx);
    const cost = Math.abs(c1 - c0);
    const flies = (this.x - TAKEOFF_X) * (tx - TAKEOFF_X) < 0 || (this.x - LAND_X) * (tx - LAND_X) < 0 || (this.x > TAKEOFF_X && this.x < LAND_X);
    const dur = flies ? Math.min(8.5, Math.max(5, cost / WALK_RATE)) : Math.min(4, Math.max(2.5, cost / WALK_RATE));
    this.walk = { c0, c1, el: 0, dur, to: i };
    this.dir = tx > this.x ? 1 : -1;
    this.sync();
    this.request();
  }
  jumpTo(i: number) {
    this.walk = null;
    this.x = this.stopX[i];
    this.at = i;
    this.follow = true;
    this.camX = this.camT = this.clampCam(this.x - this.focus());
    this.emitCamera();
    this.request();
  }
  get walking() {
    return !!this.walk;
  }
  setPaused(p: boolean) {
    this.paused = p;
    this.request();
  }
  setTalking(t: boolean) {
    if (t === this.talking) return;
    this.talking = t;
    this.request();
  }
  setReduced(r: boolean) {
    this.reduced = r;
    if (r && this.walk) {
      const to = this.walk.to;
      this.walk = null;
      this.walkTo(to);
    }
    this.camX = this.camT;
    this.sync();
    this.request();
  }
  setVisible(v: boolean) {
    this.visible = v;
    this.sync();
  }
  panBy(dxCss: number) {
    this.follow = false;
    this.camX = this.camT = this.clampCam(this.camX - dxCss / this.k);
    this.emitCamera();
    this.request();
  }
  recenter() {
    this.follow = true;
    this.camT = this.clampCam(this.x - this.focus());
    if (this.reduced) this.camX = this.camT;
    this.sync();
    this.request();
  }

  /* ------------------------------------------------------------- loop */
  private sync() {
    const want = !document.hidden && !this.reduced && (this.visible || !!this.walk);
    if (want && !this.running) {
      this.running = true;
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    } else if (!want && this.running) {
      this.running = false;
      cancelAnimationFrame(this.raf);
    }
  }
  request() {
    this.dirty = true;
    if (!this.running) {
      cancelAnimationFrame(this.raf);
      this.raf = requestAnimationFrame(() => this.render());
    }
  }
  private loop = (now: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.max(0, Math.min(0.1, (now - this.last) / 1000));
    this.last = now;
    this.update(dt);
    this.render();
  };

  private update(dt: number) {
    this.t += dt;
    const w = this.walk;
    if (w && !this.paused) {
      w.el += dt * this.speed;
      const p = Math.min(1, w.el / w.dur);
      const nx = xAtCost(w.c0 + (w.c1 - w.c0) * ease(p));
      const onGround = nx <= TAKEOFF_X || nx >= LAND_X;
      if (onGround) this.stride += Math.abs(nx - this.x);
      this.x = nx;
      if (p >= 1) {
        this.walk = null;
        this.x = this.stopX[w.to];
        this.at = w.to;
        this.stride = 0;
        this.hooks.onArrive?.(w.to);
        this.sync();
      }
    }
    if (this.follow) this.camT = this.clampCam(this.x - this.focus());
    const d = this.camT - this.camX;
    if (Math.abs(d) < 0.02) this.camX = this.camT;
    else this.camX += d * (1 - Math.exp(-dt * 2.6));
    this.emitCamera();
  }

  /* ------------------------------------------------------------- drawing helpers */
  private camDev = 0;
  private X(wx: number) {
    return Math.round(wx * this.s) - this.camDev;
  }
  private Y(wy: number) {
    return this.oy + Math.round(wy * this.s);
  }
  private rect(wx: number, wy: number, w: number, h: number, k: string) {
    const c = this.ctx;
    c.fillStyle = PAL[k] || k;
    c.fillRect(this.X(wx), this.Y(wy), w * this.s, h * this.s);
  }
  private img(cv: HTMLCanvasElement, wx: number, wy: number) {
    const X = this.X(wx);
    if (X > this.devW || X + cv.width * this.s < 0) return;
    this.ctx.drawImage(cv, X, this.Y(wy), cv.width * this.s, cv.height * this.s);
  }
  /** Blit a logical-resolution layer whose x=srcX sits at the left edge of the view. */
  private layer(cv: HTMLCanvasElement, srcXDev: number) {
    const s = this.s;
    let sx = Math.floor(srcXDev / s);
    let dx = sx * s - srcXDev;
    let sw = Math.ceil(this.devW / s) + 2;
    if (sx < 0) {
      dx += -sx * s;
      sw += sx;
      sx = 0;
    }
    sw = Math.min(sw, cv.width - sx);
    if (sw <= 0) return;
    this.ctx.drawImage(cv, sx, 0, sw, cv.height, dx, this.oy, sw * s, cv.height * s);
  }
  private visibleRange(a: number, b: number) {
    return b > this.camX - 10 && a < this.camX + this.vw + 10;
  }

  /* ------------------------------------------------------------- render */
  render() {
    this.dirty = false;
    const c = this.ctx;
    const s = this.s;
    const t = this.reduced ? 0 : this.t;
    this.camDev = Math.round(this.camX * s);
    c.imageSmoothingEnabled = false;

    // sky: Dhaka warm fades to Berlin cool as the view crosses the clouds
    const mid = this.camX + this.vw / 2;
    const blend = Math.max(0, Math.min(1, (mid - 1180) / 380));
    const tw = 64 * s;
    for (const [i, a] of [[0, 1], [1, blend]] as [number, number][]) {
      if (a <= 0) continue;
      c.globalAlpha = a;
      for (let x = 0; x < this.devW; x += tw) {
        c.drawImage(this.sky[i], x, this.oy, tw, WORLD_H * s);
        if (this.oy > 0) c.drawImage(this.sky[i], 0, 0, 64, 1, x, 0, tw, this.oy);
      }
    }
    c.globalAlpha = 1;

    // sun (barely moves) and clouds (slow parallax + drift)
    const sunX = Math.round((this.vw * 0.8 - this.camX * 0.015) * s);
    c.drawImage(this.sun, sunX, this.oy + 18 * s, 25 * s, 25 * s);
    const span = this.vw + 160;
    for (let i = 0; i < 7; i++) {
      const cl = this.clouds[i % this.clouds.length];
      const base = (hash(i, 3) % 997) * 1.7 + i * 160;
      const xx = (((base - this.camX * 0.22 + t * (1.2 + (i % 3) * 0.5)) % span) + span) % span - 80;
      const yy = 10 + (hash(i, 8) % 56);
      c.drawImage(cl, Math.round(xx * s), this.oy + yy * s, cl.width * s, cl.height * s);
    }

    // far skyline at half parallax: aligned when the camera centres a spot
    const farSrc = (this.camX + this.vw / 2) * FAR_PAR + FAR_PAD - this.vw / 2;
    this.layer(this.far, Math.round(farSrc * s));
    // back layer: ground, river, viaduct
    this.layer(this.back, this.camDev);
    this.drawWater(t);
    this.drawTrain(t);
    this.layer(this.front, this.camDev);
    this.drawAmbient(t);
    this.drawBoats(t);
    this.drawWalker(t);
    this.drawLane(t);
    this.drawSkyLife(t);
  }

  private drawWater(t: number) {
    const step = Math.floor(t * 1.5);
    const x0 = Math.floor(this.camX / 13) * 13;
    for (let x = x0; x < this.camX + this.vw + 13; x += 13) {
      if (x > DHAKA_END && x < BERLIN_START) continue;
      const h = hash(x, step);
      if (h % 4 === 0) this.rect(x + (h % 7), RIVER_Y + 3 + ((h >>> 4) % 18), 2, 1, 'w');
    }
  }

  private drawTrain(t: number) {
    if (!this.visibleRange(1540, WORLD_W)) return;
    const period = 24;
    const ph = ((t + 6) % period) / 14; // 14 s to cross, then a pause
    if (ph > 1) return;
    const x = 1530 + ph * (WORLD_W - 1530 + 80) - 66;
    this.img(this.train, x, 93);
  }

  private drawAmbient(t: number) {
    const S = STOPS;
    const wave = Math.floor(t * 2.5) % 2;
    // flags (Bangladesh green with a red disc)
    for (const [fx, fy] of [[S.brac.x, BASE_Y - 66], [S.army.x - 37, BASE_Y - 50]]) {
      if (!this.visibleRange(fx, fx + 12)) continue;
      for (let col = 0; col < 10; col++) {
        const dy = wave ? (col > 5 ? 1 : 0) : col > 2 && col < 7 ? 1 : 0;
        this.rect(fx + 1 + col, fy + dy, 1, 6, 'h');
      }
      this.rect(fx + 4, fy + 1 + (wave ? 0 : 1), 3, 4, 'r');
      this.rect(fx + 3, fy + 2 + (wave ? 0 : 1), 5, 2, 'r');
    }
    // BS23 antenna light
    if (this.visibleRange(S.bs23.x - 2, S.bs23.x + 2) && Math.floor(t * 0.9) % 2 === 0) this.rect(S.bs23.x - 1, BASE_Y - 82, 3, 2, 'r');
    // Dreamerz: an AR cube floating over the phone
    if (this.visibleRange(S.dreamerz.x, S.dreamerz.x + 30)) {
      const cx = S.dreamerz.x + 14;
      const cy = BASE_Y - 62 + Math.round(Math.sin(t * 1.4) * 2);
      this.rect(cx, cy + 2, 6, 1, 'M');
      this.rect(cx, cy + 7, 6, 1, 'M');
      this.rect(cx, cy + 2, 1, 6, 'M');
      this.rect(cx + 5, cy + 2, 1, 6, 'M');
      this.rect(cx + 2, cy, 6, 1, 'H');
      this.rect(cx + 7, cy, 1, 6, 'H');
      this.rect(cx + 1, cy + 1, 1, 1, 'H');
      this.rect(cx + 6, cy + 1, 1, 1, 'H');
      this.rect(cx + 6, cy + 6, 1, 1, 'H');
    }
    // Kolibri: a hummingbird hovering at the shop sign
    if (this.visibleRange(S.kolibri.x - 30, S.kolibri.x)) {
      const hx = S.kolibri.x - 20 + Math.round(Math.sin(t * 0.7) * 4);
      const hy = BASE_Y - 28 + Math.round(Math.sin(t * 1.9) * 2);
      this.img(rast(HUMMINGBIRD[Math.floor(t * 12) % 2], Math.cos(t * 0.7) < 0), hx, hy);
    }
    // Bad Wifi: the wifi sign mostly shows one bar
    if (this.visibleRange(S.badwifi.x - 16, S.badwifi.x + 4)) {
      const bars = [1, 1, 0, 1, 2, 1, 1, 3, 1, 0][Math.floor(t * 0.8) % 10];
      const cx = S.badwifi.x - 7;
      const by = BASE_Y - 62;
      this.rect(cx, by, 2, 1, bars > 0 ? 'n' : 'O');
      const arc = (r: number, on: boolean) => {
        const k = on ? 'n' : 'O';
        this.rect(cx - r + 1, by - r, 2 * r, 1, k);
        this.rect(cx - r, by - r + 1, 1, 1, k);
        this.rect(cx + r + 1, by - r + 1, 1, 1, k);
      };
      arc(2, bars > 1);
      arc(4, bars > 2);
      arc(6, false);
    }
    // Dhaka Kacchi: steam from the dum pot and smoke from the chimney
    if (this.visibleRange(CHIMNEY.x - 10, POT.x + 10)) {
      for (let i = 0; i < 8; i++) {
        const ph = ((t * 0.3 + i / 8) % 1 + 1) % 1;
        const sx = POT.x - 1 + Math.round(Math.sin(ph * 5 + i * 1.7) * 3) + (i % 3) - 1;
        const sy = POT.y - ph * 26;
        const sz = ph < 0.35 ? 2 : ph < 0.7 ? 3 : 2;
        if (ph < 0.9) this.rect(sx, sy, sz, sz - 1 || 1, ph < 0.55 ? 'w' : 'W');
      }
      for (let i = 0; i < 4; i++) {
        const ph = ((t * 0.22 + i / 4) % 1 + 1) % 1;
        const r = 1 + Math.floor(ph * 3);
        this.rect(CHIMNEY.x - r + 1 + Math.round(ph * 6), CHIMNEY.y - ph * 26, r * 2, r, ph < 0.5 ? 'W' : '#E6EEF6');
      }
    }
  }

  private drawBoats(t: number) {
    const loop = (len: number, sp: number, off: number) => (((t * sp + off) % len) + len) % len;
    // Dhaka river: two noukas drifting, opposite ways
    const dLen = DHAKA_END - 40;
    const b1 = loop(dLen + 40, 4, 260) - 40;
    this.img(this.boats[0][0], b1, RIVER_Y + 1);
    const b2 = dLen - loop(dLen + 40, 3, 600);
    this.img(this.boats[1][0], b2, RIVER_Y + 8);
    // the Spree: a tour boat
    const bLen = WORLD_W - BERLIN_START;
    this.img(this.boats[1][1], WORLD_W - loop(bLen + 50, 5, 200), RIVER_Y + 4);
  }

  private drawLane(t: number) {
    const loop = (len: number, sp: number, off: number) => (((t * sp + off) % len) + len) % len;
    const dLen = DHAKA_END - 60;
    const f = Math.floor(t * 3) % 2;
    this.img(this.rick[0][f], loop(dLen, 7, 120) - 10, 148);
    this.img(this.rick[1][(f + 1) % 2], dLen - loop(dLen, 5.5, 700), 148);
    const bLen = WORLD_W - BERLIN_START - 20;
    this.img(this.bike[0][Math.floor(t * 4) % 2], BERLIN_START + loop(bLen, 11, 300), 152);
  }

  private drawSkyLife(t: number) {
    // a few birds gliding slowly east
    for (let i = 0; i < 3; i++) {
      const bx = ((t * 7 + i * 520) % (WORLD_W + 200)) - 100;
      const by = 34 + i * 11 + Math.round(Math.sin(t * 0.8 + i) * 2);
      this.img(rast(BIRD[(Math.floor(t * 2.5) + i) % 2]), bx, by);
    }
    // kites over Dhaka
    for (const [kx, kc] of [[360, 'r'], [640, 'y'], [990, 'M']] as [number, string][]) {
      if (!this.visibleRange(kx - 10, kx + 10)) continue;
      const ky = 46 + (hash(kx, 1) % 14) + Math.round(Math.sin(t * 0.9 + kx) * 2);
      const kxx = kx + Math.round(Math.sin(t * 0.6 + kx) * 3);
      this.rect(kxx + 2, ky, 1, 1, kc);
      this.rect(kxx + 1, ky + 1, 3, 1, kc);
      this.rect(kxx, ky + 2, 5, 1, kc);
      this.rect(kxx + 1, ky + 3, 3, 1, kc);
      this.rect(kxx + 2, ky + 4, 1, 1, kc);
      for (let i = 0; i < 4; i++) this.rect(kxx + 2 + (i % 2), ky + 5 + i * 2, 1, 1, 'K');
    }
  }

  private drawWalker(t: number) {
    const x = this.x;
    const inFlight = x > TAKEOFF_X && x < LAND_X;
    // the plane: parked at DAC, flying, or parked at BER
    const f = Math.max(0, Math.min(1, (x - TAKEOFF_X) / (LAND_X - TAKEOFF_X)));
    const pcx = x <= TAKEOFF_X ? TAKEOFF_X + 19 : x >= LAND_X ? LAND_X - 19 : x + 19 * (1 - 2 * f);
    const alt = inFlight ? altitude(f) : 0;
    const pdir = inFlight && this.dir < 0 ? 1 : 0;
    if (this.visibleRange(pcx - 60, pcx + 60)) {
      if (alt > 18) for (let d = 1; d <= 7; d++) this.rect(pcx - (pdir ? -1 : 1) * (18 + d * 6), FEET_Y - 6 - alt + (d % 2), 3, 1, d < 4 ? 'w' : 'W');
      this.img(this.plane[pdir], pcx - 19, FEET_Y - 14 - alt);
    }
    if (inFlight) return;
    const moving = !!this.walk && !this.paused;
    // soft shadow
    this.ctx.fillStyle = 'rgba(43,35,64,0.18)';
    this.ctx.fillRect(this.X(x - 5), this.Y(FEET_Y + 1), 10 * this.s, this.s);
    const costume = costumeAt(x);
    const left = Math.round(x) - 8;
    if (moving) {
      const fr = Math.floor(this.stride / 5) % 4;
      const bob = fr % 2 ? 1 : 0;
      const flipX = this.dir < 0;
      const top = FEET_Y - 15 - bob;
      this.img(rast(ARKO_SIDE[fr], flipX), x - 8, top);
      if (costume !== 'none') {
        const cs = COSTUMES_SIDE[costume];
        this.img(rast(cs, flipX), x - 8, top + (cs.oy || 0));
      }
    } else {
      const blink = !this.reduced && t % 4.2 < 0.14;
      const talk = this.talking && !this.reduced && Math.floor(t * 5.5) % 3 === 1;
      const spr = ARKO_FRONT[blink ? 1 : talk ? 2 : 0];
      this.img(rast(spr), left, FEET_Y - 15);
      if (costume !== 'none') {
        const cs = COSTUMES[costume];
        this.img(rast(cs), left, FEET_Y - 15 + (cs.oy || 0));
      }
      if (this.talking) {
        const fr = this.reduced ? 3 : Math.floor(t * 2.6) % 4;
        const lift = costume === 'chef' ? 6 : costume === 'beanie' ? 2 : 0;
        this.img(rast(BUBBLE[fr]), left + 11, FEET_Y - 25 - lift);
      }
    }
  }
}


